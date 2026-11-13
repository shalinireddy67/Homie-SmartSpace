import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

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
    this.consoleErrors = [];
    this.pageErrors = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
          this.consoleErrors.push(msg.params);
        }
        if (msg.method === 'Runtime.exceptionThrown') {
          this.pageErrors.push(msg.params);
        }
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
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result ? res.result.value : undefined;
  }

  close() {
    this.ws.close();
  }
}

const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568, isTouch: true, mobile: true },
  { name: '375x667', width: 375, height: 667, isTouch: true, mobile: true },
  { name: '390x844', width: 390, height: 844, isTouch: true, mobile: true },
  { name: '412x915', width: 412, height: 915, isTouch: true, mobile: true },
  { name: '667x375', width: 667, height: 375, isTouch: true, mobile: true },
  { name: '768x1024', width: 768, height: 1024, isTouch: true, mobile: true },
  { name: '820x1180', width: 820, height: 1180, isTouch: true, mobile: true },
  { name: '1024x768', width: 1024, height: 768, isTouch: true, mobile: false },
  { name: '1280x800', width: 1280, height: 800, isTouch: false, mobile: false },
  { name: '1440x900', width: 1440, height: 900, isTouch: false, mobile: false },
  { name: '1920x1080', width: 1920, height: 1080, isTouch: false, mobile: false },
];

const ROUTES = [
  { path: '/', name: 'Overview' },
  { path: '/rooms', name: 'Rooms & Devices' },
  { path: '/automations', name: 'Automations' },
  { path: '/energy', name: 'Energy Analytics' },
  { path: '/history', name: 'Event History' },
  { path: '/notifications', name: 'Notifications' },
  { path: '/settings', name: 'Settings' },
  { path: '/404', name: 'Not Found' },
];

async function measure() {
  console.log('--- STARTING BASELINE MEASUREMENT ---');

  // Start preview server on port 5199
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '5199', '--strictPort'], {
    shell: true,
    stdio: 'ignore',
  });

  await new Promise((r) => setTimeout(r, 2000));

  // Launch headless chrome
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9244',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1920,1080',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  const json = await httpGetJson('http://127.0.0.1:9244/json');
  const target = json.find((t) => t.type === 'page');
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.ready();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const baselineResults = [];

  for (const vp of VIEWPORTS) {
    console.log(`Evaluating viewport: ${vp.name}...`);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile,
    });

    for (const route of ROUTES) {
      for (const theme of ['light', 'dark']) {
        client.consoleErrors = [];
        client.pageErrors = [];

        await client.send('Page.navigate', { url: `http://localhost:5199${route.path}` });
        await new Promise((r) => setTimeout(r, 400));

        // Set theme
        await client.eval(`
          (() => {
            if ('${theme}' === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          })()
        `);
        await new Promise((r) => setTimeout(r, 150));

        // Evaluate metrics
        const metrics = await client.eval(`
          (() => {
            const hasHOverflow = document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth;
            
            // Check small touch controls (<44px width or height on interactive elements)
            const isTouchW = ${vp.isTouch};
            let smallControlsCount = 0;
            const smallControls = [];
            if (isTouchW) {
              const interactives = document.querySelectorAll('button, a, input, select, [role="button"], [role="radio"], [role="switch"]');
              for (const el of interactives) {
                // Must be visible
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && (rect.top + rect.height > 0) && rect.top < window.innerHeight) {
                  if (rect.width < 44 || rect.height < 44) {
                    smallControlsCount++;
                    if (smallControls.length < 5) {
                      smallControls.push({
                        tag: el.tagName,
                        cls: (el.className || '').toString().slice(0, 30),
                        text: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 20),
                        w: Math.round(rect.width),
                        h: Math.round(rect.height)
                      });
                    }
                  }
                }
              }
            }

            return {
              hasHOverflow,
              scrollW: document.documentElement.scrollWidth,
              innerW: window.innerWidth,
              smallControlsCount,
              smallControls
            };
          })()
        `);

        baselineResults.push({
          viewport: vp.name,
          route: route.path,
          name: route.name,
          theme,
          horizontalOverflow: metrics ? metrics.hasHOverflow : false,
          scrollW: metrics ? metrics.scrollW : 0,
          innerW: metrics ? metrics.innerW : vp.width,
          smallControlsCount: metrics ? metrics.smallControlsCount : 0,
          smallControls: metrics ? metrics.smallControls : [],
          consoleErrorsCount: client.consoleErrors.length + client.pageErrors.length,
        });
      }
    }
  }

  // 4x CPU Throttle & Slow 4G Profile
  console.log('Testing 4x CPU throttle + Slow 4G on /, /energy, /history...');
  await client.send('Network.enable');
  // Slow 4G profile: 500kbps down, 500kbps up, 400ms RTT
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (500 * 1024) / 8,
  });
  // 4x CPU throttle
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const throttleResults = {};
  for (const r of ['/', '/energy', '/history']) {
    const start = Date.now();
    await client.send('Page.navigate', { url: `http://localhost:5199${r}` });
    await new Promise((res) => setTimeout(res, 1500));
    const isInteractive = await client.eval(`document.readyState === 'complete'`);
    const duration = Date.now() - start;
    throttleResults[r] = {
      durationMs: duration,
      isInteractive,
      freeze: duration > 4000,
    };
  }

  const targetDir = process.argv[2] || 'baseline';
  const outDir = path.join('docs', 'reports', targetDir);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Clean up
  client.close();
  chrome.kill();
  preview.kill();

  fs.writeFileSync(path.join(outDir, 'matrix.json'), JSON.stringify(baselineResults, null, 2));
  fs.writeFileSync(path.join(outDir, 'throttle.json'), JSON.stringify(throttleResults, null, 2));
  console.log(`${targetDir} matrix & throttling tests complete!`);
}

measure().catch((err) => {
  console.error(err);
  process.exit(1);
});
