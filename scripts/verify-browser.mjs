import http from 'http';
import { spawn } from 'child_process';

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();
    this.events = [];
    this.consoleLogs = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        if (msg.method === 'Runtime.consoleAPICalled') {
          this.consoleLogs.push(msg.params);
        }
        this.events.push(msg);
      }
    };
  }

  ready() {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) resolve();
      else {
        this.ws.onopen = () => resolve();
        this.ws.onerror = (e) => reject(e);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }
}

async function waitForHttp(url, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await httpGetJson(url);
      return res;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function runVerification() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\reddy\\AppData\\Local\\Temp\\chrome-verify-profile';

  console.log('[Browser Verification] Launching Chrome headless on port 9222...');
  const chromeProc = spawn(
    chromePath,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${userDataDir}`,
      'http://localhost:4173/',
    ],
    { stdio: 'ignore' }
  );

  try {
    await waitForHttp('http://localhost:9222/json/version');
    console.log('[Browser Verification] Chrome CDP ready on port 9222.');

    const targets = await httpGetJson('http://localhost:9222/json/list');
    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('4173'));
    if (!pageTarget) {
      throw new Error('No page target found for http://localhost:4173/');
    }

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.ready();
    console.log('[Browser Verification] Connected to page target:', pageTarget.url);

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    // Wait for hydration
    await new Promise((r) => setTimeout(r, 1200));

    console.log('\n--- 1. Overview Page Checks (/) ---');
    // Check viewports
    for (const width of [375, 768, 1440]) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 768,
      });
      await new Promise((r) => setTimeout(r, 300));

      const check = await client.eval(`
        ({
          innerWidth: window.innerWidth,
          docScrollWidth: document.documentElement.scrollWidth,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
        })
      `);
      console.log(`[Overview] Viewport ${width}px -> scrollWidth: ${check.docScrollWidth}, hasHorizontalScroll: ${check.hasHorizontalScroll}`);
      if (check.hasHorizontalScroll) {
        throw new Error(`Overview horizontal scroll at ${width}px!`);
      }
    }

    const overviewMetrics = await client.eval(`
      ({
        totalDevices: document.body.innerText.includes('Total Devices'),
        currentPower: document.body.innerText.includes('Current Power'),
        todayEnergy: document.body.innerText.includes("Today's Energy"),
        indoorTemp: document.body.innerText.includes('Indoor Temp'),
        liveChartVisible: Boolean(document.querySelector('.recharts-responsive-container')),
        eventsPanel: document.body.innerText.includes('Recent Events')
      })
    `);
    console.log('[Overview] Key panels & charts present:', overviewMetrics);

    console.log('\n--- 2. Energy Analytics Page Checks (/energy) ---');
    await client.eval(`window.location.href = 'http://localhost:4173/energy'`);
    await new Promise((r) => setTimeout(r, 1500));

    for (const width of [375, 768, 1440]) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 768,
      });
      await new Promise((r) => setTimeout(r, 300));

      const check = await client.eval(`
        ({
          innerWidth: window.innerWidth,
          docScrollWidth: document.documentElement.scrollWidth,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
        })
      `);
      console.log(`[Energy] Viewport ${width}px -> scrollWidth: ${check.docScrollWidth}, hasHorizontalScroll: ${check.hasHorizontalScroll}`);
      if (check.hasHorizontalScroll) {
        throw new Error(`Energy page horizontal scroll at ${width}px!`);
      }
    }

    // Check range options switching
    for (const r of ['1h', '24h', '7d', '30d']) {
      await client.eval(`
        (() => {
          const btn = Array.from(document.querySelectorAll('[role="radio"]')).find(b => b.innerText.trim() === '${r}');
          if (btn) btn.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 300));
      const rangeBucketText = await client.eval(`document.body.innerText.match(/[0-9]+ Buckets/)?.[0] || 'none'`);
      console.log(`[Energy] Switched to ${r} -> Bucket counter: ${rangeBucketText}`);
    }

    // Verify anomaly section
    const anomalyPresent = await client.eval(`
      Boolean(document.body.innerText.includes('Statistical Anomalies Detected in Range'))
    `);
    console.log('[Energy] Anomaly section rendered:', anomalyPresent);

    // Verify theme toggle flips dark/light class
    console.log('\n--- 3. Theme Toggle on Charts ---');
    const isDark = await client.eval(`document.documentElement.classList.contains('dark')`);
    await client.eval(`
      (() => {
        const themeBtn = Array.from(document.querySelectorAll('button')).find(b =>
          b.getAttribute('aria-label')?.includes('Switch to')
        );
        if (themeBtn) themeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    const toggledDark = await client.eval(`document.documentElement.classList.contains('dark')`);
    console.log(`[Theme] Was dark: ${isDark}, now dark: ${toggledDark}`);
    if (isDark === toggledDark) {
      throw new Error('Theme toggle failed to flip dark class!');
    }

    console.log('\n--- 4. Console Error Audit ---');
    const errors = client.consoleLogs.filter(
      (l) => l.type === 'error' && !l.args?.[0]?.value?.includes('favicon')
    );
    console.log(`Console error count: ${errors.length}`);
    if (errors.length > 0) {
      console.error('Console errors:', errors);
      throw new Error(`Found ${errors.length} console error(s)!`);
    }

    console.log('\n=======================================');
    console.log('ALL BROWSER VERIFICATION CHECKS PASSED!');
    console.log('=======================================');

    client.ws.close();
  } finally {
    chromeProc.kill();
  }
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
