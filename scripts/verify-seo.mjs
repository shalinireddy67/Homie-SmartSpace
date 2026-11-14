import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    }).on('error', reject);
  });
}

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

async function verifySeo() {
  console.log('--- 1. STARTING PREVIEW SERVER FOR SEO VERIFICATION ---');
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '5195', '--strictPort'], {
    shell: true,
    stdio: 'ignore',
  });

  await new Promise((r) => setTimeout(r, 2000));

  try {
    // 1. Fetch Production HTML & Head Tags
    console.log('\n--- 2. FETCH PRODUCTION HTML & HEAD TAGS ---');
    const htmlRes = await httpGet('http://localhost:5195/');
    console.log(`HTTP Status: ${htmlRes.statusCode}`);
    
    // Extract Head
    const headMatch = htmlRes.body.match(/<head>([\s\S]*?)<\/head>/);
    if (!headMatch) throw new Error('Head tag not found in production HTML');
    const headContent = headMatch[1];
    
    // Extract individual key tags
    const titleMatch = headContent.match(/<title>(.*?)<\/title>/);
    console.log('Title Tag:', titleMatch ? titleMatch[1] : 'MISSING');

    const metaTags = [];
    const metaRegex = /<meta\s+([^>]+)>/g;
    let m;
    while ((m = metaRegex.exec(headContent)) !== null) {
      metaTags.push(m[0]);
    }
    console.log('\nMeta Tags Found:');
    metaTags.forEach((t) => console.log('  ', t));

    const linkTags = [];
    const linkRegex = /<link\s+([^>]+)>/g;
    while ((m = linkRegex.exec(headContent)) !== null) {
      linkTags.push(m[0]);
    }
    console.log('\nLink Tags Found:');
    linkTags.forEach((t) => console.log('  ', t));

    // 2. Validate JSON-LD
    console.log('\n--- 3. VALIDATE JSON-LD ---');
    const jsonLdMatch = headContent.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!jsonLdMatch) throw new Error('JSON-LD script tag not found');
    const jsonLdData = JSON.parse(jsonLdMatch[1]);
    console.log('JSON-LD Parsed Successfully:');
    console.log(JSON.stringify(jsonLdData, null, 2));

    if (jsonLdData['@type'] !== 'WebApplication') throw new Error('Invalid @type in JSON-LD');
    if (jsonLdData.applicationCategory !== 'HomeAutomation') throw new Error('Invalid category in JSON-LD');
    if (jsonLdData.offers?.price !== '0') throw new Error('Invalid offers price in JSON-LD');

    // 3. Robots.txt and Sitemap.xml
    console.log('\n--- 4. CHECK ROBOTS.TXT AND SITEMAP.XML ---');
    const robotsRes = await httpGet('http://localhost:5195/robots.txt');
    console.log(`robots.txt Status: ${robotsRes.statusCode}`);
    console.log(`robots.txt Content:\n${robotsRes.body.trim()}`);

    const sitemapRes = await httpGet('http://localhost:5195/sitemap.xml');
    console.log(`sitemap.xml Status: ${sitemapRes.statusCode}`);
    const sitemapUrls = [];
    const locRegex = /<loc>(.*?)<\/loc>/g;
    while ((m = locRegex.exec(sitemapRes.body)) !== null) {
      sitemapUrls.push(m[1]);
    }
    console.log('Sitemap URLs Count:', sitemapUrls.length);
    console.log('Sitemap URLs:\n', sitemapUrls.join('\n '));

    // 4. Chrome CDP Deep Link Verification (/energy, /history, /random-unknown)
    console.log('\n--- 5. DIRECT BROWSER DEEP LINK VERIFICATION ---');
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const chrome = spawn(chromePath, [
      '--headless=new',
      '--remote-debugging-port=9248',
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=1280,800',
    ]);
    await new Promise((r) => setTimeout(r, 2000));

    const json = await httpGetJson('http://127.0.0.1:9248/json');
    const target = json.find((t) => t.type === 'page');
    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    // Test /energy
    await client.send('Page.navigate', { url: 'http://localhost:5195/energy' });
    await new Promise((r) => setTimeout(r, 800));
    const energyData = await client.eval(`
      (() => ({
        title: document.title,
        readyState: document.readyState,
        heading: document.querySelector('h1')?.innerText,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
        robots: document.querySelector('meta[name="robots"]')?.getAttribute('content')
      }))()
    `);
    console.log('Direct Deep Link /energy:');
    console.log(JSON.stringify(energyData, null, 2));

    // Test /history
    await client.send('Page.navigate', { url: 'http://localhost:5195/history' });
    await new Promise((r) => setTimeout(r, 800));
    const historyData = await client.eval(`
      (() => ({
        title: document.title,
        readyState: document.readyState,
        heading: document.querySelector('h1')?.innerText,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
        robots: document.querySelector('meta[name="robots"]')?.getAttribute('content')
      }))()
    `);
    console.log('\nDirect Deep Link /history:');
    console.log(JSON.stringify(historyData, null, 2));

    // Test /unknown-404-check
    await client.send('Page.navigate', { url: 'http://localhost:5195/unknown-404-check' });
    await new Promise((r) => setTimeout(r, 800));
    const notFoundData = await client.eval(`
      (() => ({
        title: document.title,
        readyState: document.readyState,
        heading: document.querySelector('h1')?.innerText,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        robots: document.querySelector('meta[name="robots"]')?.getAttribute('content')
      }))()
    `);
    console.log('\nUnknown Route /unknown-404-check:');
    console.log(JSON.stringify(notFoundData, null, 2));

    client.close();
    chrome.kill();
  } finally {
    preview.kill();
  }

  console.log('\n--- SEO VERIFICATION COMPLETE! ---');
}

verifySeo().catch((err) => {
  console.error(err);
  process.exit(1);
});
