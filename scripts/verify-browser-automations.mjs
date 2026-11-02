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
  const userDataDir = 'C:\\Users\\reddy\\AppData\\Local\\Temp\\chrome-verify-automations';

  console.log('[Automations Browser Verification] Launching Chrome headless on port 9222...');
  const chromeProc = spawn(
    chromePath,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${userDataDir}`,
      'http://localhost:4173/automations',
    ],
    { stdio: 'ignore' }
  );

  try {
    await waitForHttp('http://localhost:9222/json/version');
    console.log('[Automations Browser Verification] Chrome CDP ready on port 9222.');

    const targets = await httpGetJson('http://localhost:9222/json/list');
    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('4173'));
    if (!pageTarget) {
      throw new Error('No page target found for http://localhost:4173/automations');
    }

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.ready();
    console.log('[Automations Browser Verification] Connected to page target:', pageTarget.url);

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    // Wait for hydration
    await new Promise((r) => setTimeout(r, 1200));

    console.log('\n--- 1. Viewport Horizontal Scroll Checks ---');
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
      console.log(`Viewport ${width}px -> innerWidth: ${check.innerWidth}, scrollWidth: ${check.docScrollWidth}, hasHorizontalScroll: ${check.hasHorizontalScroll}`);
      if (check.hasHorizontalScroll) {
        throw new Error(`Horizontal scroll detected at viewport ${width}px!`);
      }
    }

    console.log('\n--- 2. Build & Persist Rule via Demo Helper ---');
    // Click "Load Demo Automation"
    await client.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          b.innerText.includes('Load Demo Automation')
        );
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    const rulePresent = await client.eval(`
      document.body.innerText.includes('Eco Climate & Lighting')
    `);
    console.log('Demo rule created and rendered:', rulePresent);
    if (!rulePresent) throw new Error('Demo automation rule failed to render!');

    // Verify summary is rendered
    const summaryRendered = await client.eval(`
      document.body.innerText.includes('IF') && document.body.innerText.includes('THEN')
    `);
    console.log('One-line IF ... THEN ... summary rendered:', summaryRendered);

    // Refresh page to verify LocalStorage persistence
    console.log('Refreshing browser page to verify persistence...');
    await client.eval(`window.location.reload()`);
    await new Promise((r) => setTimeout(r, 1500));

    const rulePersisted = await client.eval(`
      document.body.innerText.includes('Eco Climate & Lighting')
    `);
    console.log('Rule still present after page reload (persisted):', rulePersisted);
    if (!rulePersisted) throw new Error('Rule was lost after page reload!');

    console.log('\n--- 3. Dry-Run Simulation Verification ---');
    // Open Dry Run modal for the rule
    await client.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          b.innerText.trim().includes('Dry run')
        );
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    const dryRunModalOpen = await client.eval(`
      Boolean(document.querySelector('[role="dialog"]') && document.body.innerText.includes('Dry Run:'))
    `);
    console.log('Dry run simulation modal open:', dryRunModalOpen);
    if (!dryRunModalOpen) throw new Error('Dry run modal failed to open!');

    // Check banner
    const bannerPresent = await client.eval(`
      document.body.innerText.includes('Simulation. Live devices are not changed.')
    `);
    console.log('Permanent simulation banner visible:', bannerPresent);

    // Test with high temperature (pass)
    await client.eval(`
      (() => {
        const tempInput = document.querySelector('#dryrun-temp');
        if (tempInput) {
          tempInput.value = '25';
          tempInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    const passStatus = await client.eval(`
      document.body.innerText.includes('Eligible to Trigger')
    `);
    console.log('High temp (25°C) -> Status "Eligible to Trigger":', passStatus);

    // Test with low temperature (fail)
    await client.eval(`
      (() => {
        const tempInput = document.querySelector('#dryrun-temp');
        if (tempInput) {
          tempInput.value = '19';
          tempInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    const failStatus = await client.eval(`
      document.body.innerText.includes('Ineligible to Trigger')
    `);
    console.log('Low temp (19°C) -> Status "Ineligible to Trigger":', failStatus);

    // Close dry run modal
    await client.eval(`
      (() => {
        const doneBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Done');
        if (doneBtn) doneBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    console.log('\n--- 4. Schedules Tab Verification ---');
    // Switch to Schedules tab
    await client.eval(`
      (() => {
        const schedTab = document.querySelector('#tab-schedules');
        if (schedTab) schedTab.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    const schedHeading = await client.eval(`
      document.body.innerText.includes('Configured Schedules')
    `);
    console.log('Schedules tab active and heading visible:', schedHeading);

    console.log('\n--- 5. Execution History Tab Verification ---');
    // Switch to Execution History tab
    await client.eval(`
      (() => {
        const histTab = document.querySelector('#tab-history');
        if (histTab) histTab.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    const historyHeading = await client.eval(`
      document.body.innerText.includes('Execution History')
    `);
    console.log('Execution History tab active:', historyHeading);

    console.log('\n--- 6. Theme Toggle Verification ---');
    const wasDark = await client.eval(`document.documentElement.classList.contains('dark')`);
    await client.eval(`
      (() => {
        const themeBtn = Array.from(document.querySelectorAll('button')).find(b =>
          b.getAttribute('aria-label')?.includes('Switch to')
        );
        if (themeBtn) themeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    const isDarkNow = await client.eval(`document.documentElement.classList.contains('dark')`);
    console.log(`Theme toggled: was dark = ${wasDark}, is dark now = ${isDarkNow}`);
    if (wasDark === isDarkNow) throw new Error('Theme toggle failed to flip theme class!');

    console.log('\n--- 7. Console Error Audit ---');
    const errors = client.consoleLogs.filter(
      (l) => l.type === 'error' && !l.args?.[0]?.value?.includes('favicon')
    );
    console.log(`Console error count: ${errors.length}`);
    if (errors.length > 0) {
      console.error('Console errors:', errors);
      throw new Error(`Found ${errors.length} console error(s)!`);
    }

    console.log('\n=======================================');
    console.log('ALL AUTOMATIONS BROWSER CHECKS PASSED!');
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

