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

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
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
    return res.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`Server at ${url} failed to start within ${timeoutMs}ms`);
}

async function captureAll(targetFolder = 'before') {
  const outDir = path.resolve('docs', 'screenshots', targetFolder);
  fs.mkdirSync(outDir, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9444;
  const vitePort = 5175;

  console.log(`Starting Vite dev server on port ${vitePort}...`);
  const viteProc = spawn('npx.cmd', ['vite', '--port', String(vitePort), '--no-clearScreen'], {
    stdio: 'pipe',
    shell: true,
  });

  console.log(`Launching Headless Chrome on CDP port ${cdpPort}...`);
  const chromeProc = spawn(
    chromePath,
    [
      `--remote-debugging-port=${cdpPort}`,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-extensions',
      '--hide-scrollbars',
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let cdp;
  try {
    await waitForServer(`http://localhost:${vitePort}`);
    let targets;
    for (let i = 0; i < 20; i++) {
      try {
        targets = await httpGetJson(`http://localhost:${cdpPort}/json`);
        if (targets && targets.length > 0) break;
      } catch {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    const target = targets.find((t) => t.type === 'page') || targets[0];
    cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.ready();
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    const filterPage = process.argv[3];
    let pages = [
      { id: 'overview', path: '/' },
      { id: 'rooms', path: '/rooms' },
      { id: 'automations', path: '/automations' },
      { id: 'energy', path: '/energy' },
      { id: 'history', path: '/history' },
      { id: 'notifications', path: '/notifications' },
      { id: 'settings', path: '/settings' },
    ];
    if (filterPage) {
      pages = pages.filter((p) => p.id === filterPage);
    }

    const viewports = [
      { width: 375, height: 667, name: '375' },
      { width: 768, height: 1024, name: '768' },
      { width: 1440, height: 900, name: '1440' },
    ];

    const themes = ['light', 'dark'];

    for (const page of pages) {
      console.log(`Navigating to ${page.id} (${page.path})...`);
      await cdp.send('Page.navigate', { url: `http://localhost:${vitePort}${page.path}` });
      await new Promise((r) => setTimeout(r, 1200));

      for (const theme of themes) {
        // Toggle theme in DOM & localStorage
        await cdp.eval(`(() => {
          if ('${theme}' === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('nestora_theme', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('nestora_theme', 'light');
          }
        })()`);
        await new Promise((r) => setTimeout(r, 300));

        for (const vp of viewports) {
          await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: vp.width,
            height: vp.height,
            deviceScaleFactor: 1,
            mobile: vp.width < 1000,
          });
          await new Promise((r) => setTimeout(r, 400));

          const shotResult = await cdp.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
          });

          const filename = `${page.id}-${vp.name}-${theme}.png`;
          const filePath = path.join(outDir, filename);
          fs.writeFileSync(filePath, Buffer.from(shotResult.data, 'base64'));
          console.log(`  Saved: ${filename}`);
        }
      }
    }

    console.log(`\nSuccessfully captured all 42 screenshots into docs/screenshots/${targetFolder}/`);
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill('SIGKILL');
    viteProc.kill('SIGKILL');
  }
}

const target = process.argv[2] || 'before';
captureAll(target).catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
