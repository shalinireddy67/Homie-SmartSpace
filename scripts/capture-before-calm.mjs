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

async function main() {
  const outDir = path.resolve('docs', 'screenshots', 'before-calm');
  fs.mkdirSync(outDir, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9446;
  const vitePort = 5177;

  console.log(`Starting Vite preview server on port ${vitePort}...`);
  const viteProc = spawn('npx.cmd', ['vite', 'preview', '--port', String(vitePort), '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  });

  await waitForServer(`http://localhost:${vitePort}`);

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

    const pages = [
      { id: 'landing', path: '/', isApp: false },
      { id: 'login', path: '/login', isApp: false },
      { id: 'overview', path: '/app', isApp: true },
      { id: 'rooms', path: '/app/rooms', isApp: true },
      { id: 'automations', path: '/app/automations', isApp: true },
      { id: 'energy', path: '/app/energy', isApp: true },
      { id: 'events', path: '/app/events', isApp: true },
      { id: 'notifications', path: '/app/notifications', isApp: true },
      { id: 'settings', path: '/app/settings', isApp: true },
    ];

    const viewports = [
      { width: 375, height: 667, name: '375' },
      { width: 1440, height: 900, name: '1440' },
    ];

    const themes = ['light', 'dark'];

    for (const page of pages) {
      console.log(`\nNavigating to ${page.id} (${page.path})...`);
      // Initial navigate
      await cdp.send('Page.navigate', { url: `http://localhost:${vitePort}${page.path}` });
      await new Promise((r) => setTimeout(r, 800));

      // Configure session
      if (page.isApp) {
        await cdp.eval(`(() => {
          localStorage.setItem('HOMIE_SMARTSPACE_SESSION', JSON.stringify({ mode: 'demo', startedAt: Date.now() }));
        })()`);
        await cdp.send('Page.navigate', { url: `http://localhost:${vitePort}${page.path}` });
      } else {
        await cdp.eval(`(() => {
          localStorage.removeItem('HOMIE_SMARTSPACE_SESSION');
        })()`);
      }
      await new Promise((r) => setTimeout(r, 800));

      // Wait for content
      for (let w = 0; w < 30; w++) {
        const ready = await cdp.eval(`Boolean(document.querySelector('h1'))`);
        if (ready) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      await new Promise((r) => setTimeout(r, 500));

      for (const theme of themes) {
        await cdp.eval(`(() => {
          if ('${theme}' === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('HOMIE_SMARTSPACE_THEME', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('HOMIE_SMARTSPACE_THEME', 'light');
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
          await cdp.eval(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);

          const shotResult = await cdp.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
          });

          const filename = `${page.id}-${vp.name}-${theme}.png`;
          const filePath = path.join(outDir, filename);
          fs.writeFileSync(filePath, Buffer.from(shotResult.data, 'base64'));
          console.log(`  Saved screenshot: ${filename}`);
        }
      }
    }

    console.log(`\nAll 'before-calm' screenshots successfully captured into docs/screenshots/before-calm/`);
  } finally {
    if (cdp) cdp.close();
    try { chromeProc.kill('SIGKILL'); } catch {}
    try {
      if (process.platform === 'win32' && viteProc.pid) {
        spawn('taskkill', ['/pid', String(viteProc.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        viteProc.kill('SIGKILL');
      }
    } catch {}
  }
}

main().catch((err) => {
  console.error('Before-calm screenshot capture failed:', err);
  process.exit(1);
});
