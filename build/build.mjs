import { readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, extname } from 'node:path';
import { transform } from 'esbuild';
import { selectFeatures } from './features.mjs';
import { prepareDemo, renderPage } from './render.mjs';
import { renderLlmsIndex, renderLlmsFull } from './llms.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readText = (...parts) => readFile(join(root, ...parts), 'utf8');

// Whitespace only: esbuild's syntax pass rewrites in-gamut oklch() and lab() to
// hex, which on a page whose subject is those colour functions would ship a
// listing that contradicts the demo beside it.
const minifyCss = async (css) =>
  (await transform(css, { loader: 'css', minifyWhitespace: true })).code;

const minifyJs = async (js) =>
  (await transform(js, { loader: 'js', minify: true, target: 'es2022' })).code;

async function loadDemos(featureIds) {
  const dir = join(root, 'demos');
  let entries = [];
  try {
    entries = await readdir(dir);
  } catch {
    return new Map();
  }

  const demos = new Map();
  const orphans = [];

  for (const entry of entries.sort()) {
    if (extname(entry) !== '.html') continue;
    const id = basename(entry, '.html');
    if (!featureIds.has(id)) {
      orphans.push(entry);
      continue;
    }
    demos.set(id, prepareDemo(id, await readFile(join(dir, entry), 'utf8')));
  }

  if (orphans.length) {
    throw new Error(
      `${orphans.length} demo file(s) match no Baseline CSS feature id:\n  ${orphans.join('\n  ')}`,
    );
  }

  return demos;
}

export async function build() {
  const features = selectFeatures();
  const demos = await loadDemos(new Set(features.map((f) => f.id)));

  const [rawStyles, appScript, agentScript, webFeaturesPkg, bcdPkg, caniusePkg, siteConfig] = await Promise.all([
    readText('src', 'styles.css'),
    readText('src', 'app.js'),
    readText('src', 'webmcp.js'),
    readText('node_modules', 'web-features', 'package.json'),
    readText('node_modules', '@mdn', 'browser-compat-data', 'package.json'),
    readText('node_modules', 'caniuse-lite', 'package.json'),
    readText('site.config.json'),
  ]);

  const site = JSON.parse(siteConfig);

  await Promise.all(
    [...demos.values()].map(async (demo) => {
      demo.css = await minifyCss(demo.css);
    }),
  );

  // Demo scripts run against a stage that only exists once its modal opens, so
  // they are registered by feature id rather than executed on load.
  const registry = [...demos]
    .filter(([, demo]) => demo.js)
    .map(([id, demo]) => `${JSON.stringify(id)}:${demo.js}`)
    .join(',');

  const [styles, script, agentTools] = await Promise.all([
    minifyCss(rawStyles),
    minifyJs(`window.demoInit={${registry}};\n${appScript}`),
    minifyJs(agentScript),
  ]);

  const meta = {
    webFeaturesVersion: JSON.parse(webFeaturesPkg).version,
    bcdVersion: JSON.parse(bcdPkg).version,
    caniuseVersion: JSON.parse(caniusePkg).version,
    builtOn: new Date().toISOString().slice(0, 10),
  };

  const html = renderPage({ features, demos, styles, script, site, meta });
  const llmsIndex = renderLlmsIndex({ features, site, meta });
  const llmsFull = renderLlmsFull({ features, site, meta });

  const out = join(root, 'dist');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'index.html'), html);
  await writeFile(join(out, 'webmcp.js'), agentTools);
  await writeFile(join(out, 'llms.txt'), llmsIndex);
  await writeFile(join(out, 'llms-full.txt'), llmsFull);

  const canonical = site.url.replace(/\/?$/, '/');
  const today = new Date().toISOString().slice(0, 10);

  await writeFile(
    join(out, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${canonical}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`,
  );

  await writeFile(
    join(out, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${canonical}sitemap.xml\n`,
  );

  const widely = features.filter((f) => f.tier === 'widely').length;
  const newly = features.filter((f) => f.tier === 'newly').length;
  await writeFile(
    join(out, 'og.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#12141a"/><stop offset="1" stop-color="#1d1b3a"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#g)"/>
<text x="80" y="220" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="86" font-weight="700" fill="#f2f3f7">Every CSS feature,</text>
<text x="80" y="320" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="86" font-weight="700" fill="#9d97f5">newest first</text>
<text x="80" y="400" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="34" fill="#a8adbd">${features.length} features · ${
      features.length
    } live demos · Baseline status · usage share</text>
<g font-family="ui-monospace,Menlo,monospace" font-size="28">
<rect x="80" y="452" width="250" height="76" rx="14" fill="#1b2a20" stroke="#3f7f5c"/>
<text x="104" y="486" fill="#7fd6a4">${widely} widely</text><text x="104" y="516" fill="#5f9b7c" font-size="22">available</text>
<rect x="352" y="452" width="250" height="76" rx="14" fill="#2a2418" stroke="#8a7040"/>
<text x="376" y="486" fill="#e3b466">${newly} newly</text><text x="376" y="516" fill="#a98a52" font-size="22">available</text>
<rect x="624" y="452" width="290" height="76" rx="14" fill="#2a1a1c" stroke="#8a4a52"/>
<text x="648" y="486" fill="#e88b95">${features.length - widely - newly} not Baseline</text><text x="648" y="516" fill="#a86870" font-size="22">demonstrated anyway</text>
</g></svg>\n`,
  );

  // GitHub Pages runs Jekyll unless told not to, which strips files it dislikes.
  await writeFile(join(out, '.nojekyll'), '');

  if (site.adsense?.client) {
    await writeFile(
      join(out, 'ads.txt'),
      `google.com, ${site.adsense.client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`,
    );
  }

  return { features, demos, html, agentTools, llmsIndex, llmsFull, site };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { features, demos, html } = await build();
  const withDemo = features.filter((f) => demos.has(f.id)).length;
  console.log(
    `dist/index.html — ${features.length} features, ${withDemo} live demos, ${(html.length / 1024).toFixed(0)} kB`,
  );
}
