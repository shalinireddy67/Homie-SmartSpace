import http from 'http';
import { spawn, execSync } from 'child_process';
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
  const screenshotDir = path.resolve('docs', 'screenshots', 'landing');
  const reportsDir = path.resolve('docs', 'reports', 'landing');
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9445;
  const vitePort = 5176;

  console.log(`Starting Vite preview server on port ${vitePort}...`);
  // First ensure build exists
  execSync('npm run build', { stdio: 'inherit' });

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
      { id: 'landing', path: '/' },
      { id: 'login', path: '/login' },
    ];

    const viewports = [
      { width: 375, height: 667, name: '375' },
      { width: 768, height: 1024, name: '768' },
      { width: 1440, height: 900, name: '1440' },
    ];

    const themes = ['light', 'dark'];

    for (const page of pages) {
      console.log(`Navigating to ${page.id} (${page.path})...`);
      await cdp.send('Page.navigate', { url: `http://localhost:${vitePort}${page.path}` });
      await new Promise((r) => setTimeout(r, 1000));

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
          const filePath = path.join(screenshotDir, filename);
          fs.writeFileSync(filePath, Buffer.from(shotResult.data, 'base64'));
          console.log(`  Saved screenshot: ${filename}`);
        }
      }
    }

    console.log(`\nScreenshots complete. Running Lighthouse audits for / and /login...`);
    const routesToAudit = [
      { path: '/', slug: 'landing' },
      { path: '/login', slug: 'login' },
    ];

    const summary = {};

    for (const r of routesToAudit) {
      for (const form of ['mobile', 'desktop']) {
        const outBase = path.join(reportsDir, `${r.slug}-${form}`);
        const url = `http://localhost:${vitePort}${r.path}`;
        console.log(`Auditing ${url} (${form})...`);

        const desktopFlags = form === 'desktop' ? '--preset=desktop' : '';
        const cmd = `npx lighthouse "${url}" --output=json --output-path="${outBase}.json" --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo ${desktopFlags} --quiet`;

        try {
          execSync(cmd, { stdio: 'inherit' });
          if (fs.existsSync(`${outBase}.json`)) {
            const raw = JSON.parse(fs.readFileSync(`${outBase}.json`, 'utf8'));
            const cats = raw.categories;
            const key = `${r.slug}_${form}`;
            summary[key] = {
              route: r.path,
              form,
              performance: Math.round((cats.performance?.score || 0) * 100),
              accessibility: Math.round((cats.accessibility?.score || 0) * 100),
              bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
              seo: Math.round((cats.seo?.score || 0) * 100),
            };
          }
        } catch (auditErr) {
          console.warn(`Lighthouse warning for ${url}:`, auditErr.message);
        }
      }
    }

    fs.writeFileSync(path.join(reportsDir, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log('\nLighthouse summary:', JSON.stringify(summary, null, 2));

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
  console.error('Landing verification failed:', err);
  process.exit(1);
});
