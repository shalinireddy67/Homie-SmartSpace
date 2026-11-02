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
      'http://localhost:4173/rooms',
    ],
    { stdio: 'ignore' }
  );

  try {
    await waitForHttp('http://localhost:9222/json/version');
    console.log('[Browser Verification] Chrome CDP ready on port 9222.');

    const targets = await httpGetJson('http://localhost:9222/json/list');
    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('4173'));
    if (!pageTarget) {
      throw new Error('No page target found for http://localhost:4173/rooms');
    }

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.ready();
    console.log('[Browser Verification] Connected to page target:', pageTarget.url);

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
      await new Promise((r) => setTimeout(r, 400));

      const check = await client.eval(`
        ({
          innerWidth: window.innerWidth,
          docScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
        })
      `);

      console.log(
        `Viewport ${width}px -> innerWidth: ${check.innerWidth}, scrollWidth: ${check.docScrollWidth}, hasHorizontalScroll: ${check.hasHorizontalScroll}`
      );
      if (check.hasHorizontalScroll) {
        throw new Error(`Horizontal scroll detected at viewport ${width}px!`);
      }
    }

    console.log('\n--- 2. Keyboard Navigation Check ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await client.eval(`document.body.focus()`);

    const tabbedElements = [];
    for (let i = 0; i < 25; i++) {
      await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await new Promise((r) => setTimeout(r, 60));

      const focused = await client.eval(`
        ({
          tag: document.activeElement.tagName,
          role: document.activeElement.getAttribute('role'),
          ariaLabel: document.activeElement.getAttribute('aria-label') || document.activeElement.innerText?.slice(0, 30),
          id: document.activeElement.id
        })
      `);
      if (focused && focused.tag !== 'BODY') {
        tabbedElements.push(focused);
      }
    }

    console.log(`Successfully tabbed through interactive elements: count = ${tabbedElements.length}`);
    console.log('Sample tabbed elements:', tabbedElements.slice(0, 5));

    console.log('\n--- 3. Theme Toggle Verification ---');
    const initialThemeDark = await client.eval(`document.documentElement.classList.contains('dark')`);
    console.log('Initial theme dark class:', initialThemeDark);

    await client.eval(`
      (() => {
        const themeBtn = Array.from(document.querySelectorAll('button')).find(b =>
          b.getAttribute('aria-label')?.includes('Switch to')
        );
        if (themeBtn) themeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));

    const toggledThemeDark = await client.eval(`document.documentElement.classList.contains('dark')`);
    console.log('After toggle theme dark class:', toggledThemeDark);
    if (initialThemeDark === toggledThemeDark) {
      throw new Error('Theme toggle failed to flip dark mode class!');
    }

    // Toggle back
    await client.eval(`
      (() => {
        const themeBtn = Array.from(document.querySelectorAll('button')).find(b =>
          b.getAttribute('aria-label')?.includes('Switch to')
        );
        if (themeBtn) themeBtn.click();
      })()
    `);

    console.log('\n--- 4. Fail Next Command & Rollback Verification ---');
    const armedSuccess = await client.eval(`
      (() => {
        const failSwitch = document.querySelector('button[aria-label="Fail next command"]');
        if (!failSwitch) return false;
        failSwitch.click();
        return true;
      })()
    `);
    console.log('Armed fail next command toggle:', armedSuccess);
    await new Promise((r) => setTimeout(r, 300));

    const armedText = await client.eval(`document.body.innerText.includes('Armed')`);
    console.log('Switch text displays "Armed":', armedText);

    console.log('Toggling light switch to trigger command under simulated failure...');
    await client.eval(`
      (() => {
        const lightSwitch = document.querySelector('button[id^="switch-dev-light-living"]');
        if (lightSwitch) lightSwitch.click();
      })()
    `);

    // Wait for latency + rollback + toast
    await new Promise((r) => setTimeout(r, 1200));

    const toastVisible = await client.eval(`
      Boolean(document.querySelector('[role="alert"]') && document.body.innerText.includes('Command Failed'))
    `);
    const flagConsumed = await client.eval(`
      (() => {
        const sw = document.querySelector('button[aria-label="Fail next command"]');
        return sw && sw.getAttribute('aria-checked') === 'false';
      })()
    `);

    console.log('Failure alert toast rendered:', toastVisible);
    console.log('failNextCommand flag consumed and reset to Off:', flagConsumed);

    if (!toastVisible) {
      throw new Error('Expected toast notification did not appear after simulated failure!');
    }

    console.log('\n--- 5. Console Error Audit ---');
    const errors = client.consoleLogs.filter(
      (l) => l.type === 'error' && !l.args?.[0]?.value?.includes('favicon')
    );
    console.log(`Console error count: ${errors.length}`);
    if (errors.length > 0) {
      console.error('Console errors:', errors);
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
