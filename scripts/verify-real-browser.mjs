import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';

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

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleErrors.push(msg.params);
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

async function verifyRealBrowser() {
  console.log('--- STARTING REAL BROWSER VERIFICATION (NO DEVICE EMULATION) ---');

  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '5196', '--strictPort'], {
    shell: true,
    stdio: 'ignore',
  });

  await new Promise((r) => setTimeout(r, 2000));

  // Launch Chrome as standard desktop window, no emulation overrides
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9246',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,800',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  const json = await httpGetJson('http://127.0.0.1:9246/json');
  const target = json.find((t) => t.type === 'page');
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.ready();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const verificationResults = [];

  const pages = ['/', '/rooms', '/automations', '/energy', '/history', '/notifications', '/settings'];

  for (const p of pages) {
    await client.send('Page.navigate', { url: `http://localhost:5196${p}` });
    await new Promise((res) => setTimeout(res, 600));

    const check = await client.eval(`
      (() => {
        return {
          title: document.title,
          readyState: document.readyState,
          hasHeading: !!document.querySelector('h1, h2, h3'),
          hasSidebar: !!document.querySelector('nav, aside, [role="navigation"]'),
          bodyWidth: document.body.clientWidth,
          bodyHeight: document.body.clientHeight,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()
    `);

    verificationResults.push({
      route: p,
      check,
      consoleErrors: client.consoleErrors.length,
    });

    console.log(`Verified ${p}: title="${check.title}", overflow=${check.hasHorizontalOverflow}, consoleErrors=${client.consoleErrors.length}`);
  }

  client.close();
  chrome.kill();
  preview.kill();

  fs.writeFileSync('docs/reports/after/real-browser.json', JSON.stringify(verificationResults, null, 2));
  console.log('Real browser verification complete without device emulation!');
}

verifyRealBrowser().catch((err) => {
  console.error(err);
  process.exit(1);
});
