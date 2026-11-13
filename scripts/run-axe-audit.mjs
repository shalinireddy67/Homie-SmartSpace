import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import axe from 'axe-core';

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

async function runAxe() {
  console.log('--- STARTING AXE AUDIT ACROSS ALL 8 PAGES (LIGHT & DARK) ---');

  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '5197', '--strictPort'], {
    shell: true,
    stdio: 'ignore',
  });

  await new Promise((r) => setTimeout(r, 2000));

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9245',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  const json = await httpGetJson('http://127.0.0.1:9245/json');
  const target = json.find((t) => t.type === 'page');
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.ready();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const axeResults = [];
  let totalSeriousCritical = 0;

  try {
    for (const r of ROUTES) {
      for (const theme of ['light', 'dark']) {
        await client.send('Page.navigate', { url: `http://localhost:5197${r.path}` });
        await new Promise((res) => setTimeout(res, 600));

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
        await new Promise((res) => setTimeout(res, 200));

        // Inject axe-core
        await client.eval(axe.source);

        // Run axe
        const res = await client.eval(`
          new Promise((resolve) => {
            axe.run({
              runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
              }
            }).then(results => {
              const violations = results.violations.map(v => ({
                id: v.id,
                impact: v.impact,
                description: v.description,
                nodesCount: v.nodes.length,
                help: v.help
              }));
              resolve({
                violations,
                passes: results.passes.length
              });
            });
          })
        `);

        const seriousCritical = (res?.violations || []).filter(
          (v) => v.impact === 'serious' || v.impact === 'critical'
        );
        totalSeriousCritical += seriousCritical.length;

        axeResults.push({
          route: r.path,
          name: r.name,
          theme,
          seriousCriticalCount: seriousCritical.length,
          seriousCriticalViolations: seriousCritical,
          allViolationsCount: (res?.violations || []).length,
          passesCount: res?.passes || 0,
        });

        console.log(
          `Page: ${r.name} (${theme}) | Passes: ${res?.passes || 0} | Serious/Critical Violations: ${seriousCritical.length}`
        );
      }
    }
  } finally {
    client.close();
    chrome.kill();
    preview.kill();
  }

  const outDir = 'docs/reports/after';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync('docs/reports/after/axe.json', JSON.stringify(axeResults, null, 2));

  console.log(`\nAXE AUDIT COMPLETE! Total Serious/Critical Violations: ${totalSeriousCritical}`);
  if (totalSeriousCritical > 0) {
    process.exit(1);
  }
}

runAxe().catch((err) => {
  console.error(err);
  process.exit(1);
});
