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
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function generateAssets() {
  console.log('--- GENERATING ICONS AND OG-IMAGE ---');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9247',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1600,1200',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  const json = await httpGetJson('http://127.0.0.1:9247/json');
  const target = json.find((t) => t.type === 'page');
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.ready();
  await client.send('Page.enable');

  // Read base screenshot
  const screenshotPath = path.resolve('docs/screenshots/after-v2/overview-1440-dark.png');
  const screenshotBase64 = fs.readFileSync(screenshotPath).toString('base64');

  const svgContent = fs.readFileSync('public/favicon.svg', 'utf8');

  // 1. Generate Favicon 32x32
  const html32 = `<!DOCTYPE html>
  <html>
  <head><style>html, body { margin:0; padding:0; background: transparent; overflow: hidden; }</style></head>
  <body>
    <div style="width: 32px; height: 32px;">${svgContent}</div>
  </body>
  </html>`;
  await client.send('Page.setDocumentContent', { frameId: (await client.send('Page.getFrameTree')).frameTree.frame.id, html: html32 });
  await new Promise((r) => setTimeout(r, 200));
  let shot = await client.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 32, height: 32, scale: 1 },
    fromSurface: true,
  });
  fs.writeFileSync('public/favicon-32.png', Buffer.from(shot.data, 'base64'));
  console.log('Generated public/favicon-32.png');

  // 2. Generate Apple Touch Icon 180x180
  const html180 = `<!DOCTYPE html>
  <html>
  <head><style>html, body { margin:0; padding:0; background: #6366F1; overflow: hidden; display:flex; align-items:center; justify-content:center; }</style></head>
  <body>
    <div style="width: 140px; height: 140px; display:flex; align-items:center; justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" style="width:100%; height:100%;">
        <path d="M16 6L6 14.5V25C6 25.5523 6.44772 26 7 26H12V19C12 18.4477 12.4477 18 13 18H19C19.5523 18 20 18.4477 20 19V26H25C25.5523 26 26 25.5523 26 25V14.5L16 6Z" fill="white"/>
        <circle cx="16" cy="13" r="2" fill="#6366F1"/>
      </svg>
    </div>
  </body>
  </html>`;
  await client.send('Page.setDocumentContent', { frameId: (await client.send('Page.getFrameTree')).frameTree.frame.id, html: html180 });
  await new Promise((r) => setTimeout(r, 200));
  shot = await client.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 180, height: 180, scale: 1 },
    fromSurface: true,
  });
  fs.writeFileSync('public/apple-touch-icon.png', Buffer.from(shot.data, 'base64'));
  console.log('Generated public/apple-touch-icon.png');

  // 3. Generate icon-192.png
  const html192 = `<!DOCTYPE html>
  <html>
  <head><style>html, body { margin:0; padding:0; background: #0f172a; overflow: hidden; display:flex; align-items:center; justify-content:center; }</style></head>
  <body>
    <div style="width: 192px; height: 192px; display:flex; align-items:center; justify-content:center;">
      <div style="width: 140px; height: 140px;">${svgContent}</div>
    </div>
  </body>
  </html>`;
  await client.send('Page.setDocumentContent', { frameId: (await client.send('Page.getFrameTree')).frameTree.frame.id, html: html192 });
  await new Promise((r) => setTimeout(r, 200));
  shot = await client.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 192, height: 192, scale: 1 },
    fromSurface: true,
  });
  fs.writeFileSync('public/icon-192.png', Buffer.from(shot.data, 'base64'));
  console.log('Generated public/icon-192.png');

  // 4. Generate icon-512.png
  const html512 = `<!DOCTYPE html>
  <html>
  <head><style>html, body { margin:0; padding:0; background: #0f172a; overflow: hidden; display:flex; align-items:center; justify-content:center; }</style></head>
  <body>
    <div style="width: 512px; height: 512px; display:flex; align-items:center; justify-content:center;">
      <div style="width: 380px; height: 380px;">${svgContent}</div>
    </div>
  </body>
  </html>`;
  await client.send('Page.setDocumentContent', { frameId: (await client.send('Page.getFrameTree')).frameTree.frame.id, html: html512 });
  await new Promise((r) => setTimeout(r, 200));
  shot = await client.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 512, height: 512, scale: 1 },
    fromSurface: true,
  });
  fs.writeFileSync('public/icon-512.png', Buffer.from(shot.data, 'base64'));
  console.log('Generated public/icon-512.png');

  // 5. Generate og-image.png at 1200x630 (< 300KB)
  const htmlOg = `<!DOCTYPE html>
  <html>
  <head>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 630px;
        background: linear-gradient(135deg, #0b0f19 0%, #1e1b4b 60%, #0f172a 100%);
        font-family: system-ui, -apple-system, sans-serif;
        color: #f8fafc;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
        padding: 40px 60px;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .logo-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: #6366F1;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      }
      .title-group h1 {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #ffffff;
      }
      .title-group p {
        font-size: 15px;
        color: #94a3b8;
        font-weight: 500;
      }
      .badge {
        background: rgba(99, 102, 241, 0.15);
        border: 1px solid rgba(99, 102, 241, 0.35);
        color: #a5b4fc;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .preview-frame {
        flex: 1;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        position: relative;
        background: #111827;
      }
      .preview-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top center;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand">
        <div class="logo-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" style="width: 32px; height: 32px;">
            <path d="M16 7L8 13.5V23C8 23.5523 8.44772 24 9 24H13V18C13 17.4477 13.4477 17 14 17H18C18.5523 17 19 17.4477 19 18V24H23C23.5523 24 24 23.5523 24 23V13.5L16 7Z" fill="white"/>
            <circle cx="16" cy="12" r="1.5" fill="#6366F1"/>
          </svg>
        </div>
        <div class="title-group">
          <h1>Homie SmartSpace</h1>
          <p>Smart Home &amp; IoT Control Dashboard</p>
        </div>
      </div>
      <div class="badge">Live Dashboard Preview</div>
    </div>
    <div class="preview-frame">
      <img src="data:image/png;base64,${screenshotBase64}" alt="Homie SmartSpace Dashboard" />
    </div>
  </body>
  </html>`;

  await client.send('Page.setDocumentContent', { frameId: (await client.send('Page.getFrameTree')).frameTree.frame.id, html: htmlOg });
  await new Promise((r) => setTimeout(r, 600));

  shot = await client.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 },
    fromSurface: true,
  });

  const ogBuffer = Buffer.from(shot.data, 'base64');
  fs.writeFileSync('public/og-image.png', ogBuffer);
  const ogSizeKb = Math.round(ogBuffer.length / 1024);
  console.log(`Generated public/og-image.png (1200x630, ${ogSizeKb} KB)`);

  client.close();
  chrome.kill();
}

generateAssets().catch((err) => {
  console.error(err);
  process.exit(1);
});
