import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const targetDir = process.argv[2] || 'baseline';
const outDir = path.join('docs', 'reports', targetDir);

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log(`Starting preview server for Lighthouse (${targetDir})...`);
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '5198', '--strictPort'], {
    shell: true,
    stdio: 'ignore',
  });

  await new Promise((r) => setTimeout(r, 2500));

  const routes = [
    { path: '/', slug: 'overview' },
    { path: '/energy', slug: 'energy' },
    { path: '/history', slug: 'history' },
  ];

  const summary = {};

  try {
    for (const r of routes) {
      for (const form of ['mobile', 'desktop']) {
        const outBase = path.join(outDir, `${r.slug}-${form}`);
        const url = `http://localhost:5198${r.path}`;
        console.log(`Auditing ${url} (${form})...`);

        const desktopFlags = form === 'desktop' ? '--preset=desktop' : '';
        const cmd = `npx lighthouse "${url}" --output=json --output-path="${outBase}.json" --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo ${desktopFlags} --quiet`;
        
        execSync(cmd, { stdio: 'inherit' });

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
    }
  } finally {
    preview.kill();
  }

  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('Lighthouse summary:', JSON.stringify(summary, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
