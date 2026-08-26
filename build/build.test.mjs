import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { selectFeatures } from './features.mjs';
import { prepareDemo } from './render.mjs';
import { build } from './build.mjs';
import { CATEGORIES } from './categories.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const features = selectFeatures();

test('selects the whole CSS surface, Baseline or not', () => {
  assert.ok(features.length >= 430, `expected 430+ features, got ${features.length}`);
  assert.ok(features.every((f) => ['widely', 'newly', 'limited'].includes(f.tier)));
  assert.ok(features.some((f) => f.id === 'has' && f.tier === 'widely'));
  assert.ok(features.some((f) => f.id === 'anchor-positioning' && f.tier === 'limited'));
});

test('sorts newest first and dates every shipped feature', () => {
  const dated = features.filter((f) => f.releaseDate);
  assert.ok(dated.length / features.length > 0.9, 'most features should carry a date');
  const dates = dated.map((f) => f.releaseDate);
  assert.deepEqual(dates, [...dates].sort().reverse(), 'not in newest-first order');
  assert.ok(features.at(-1).releaseDate === null || features.at(0).releaseDate >= features.at(-1).releaseDate);
});

test('every feature lands in a known category', () => {
  const known = new Set(CATEGORIES.map((c) => c.id));
  const stray = features.filter((f) => !known.has(f.category));
  assert.deepEqual(stray, []);
});

test('every demo file names a real feature', async () => {
  const files = (await readdir(join(root, 'demos'))).filter((f) => f.endsWith('.html'));
  const ids = new Set(features.map((f) => f.id));
  const orphans = files.map((f) => basename(f, '.html')).filter((id) => !ids.has(id));
  assert.deepEqual(orphans, []);
});

test('demo CSS is scoped and global at-rules are hoisted out of @scope', () => {
  const { css } = prepareDemo('x', '<style>@keyframes k { to { opacity: 1 } } .a { color: red }</style><p>hi</p>');
  assert.match(css, /^@keyframes k \{[\s\S]*\}\n@scope \(\[data-demo="x"\]\)/);
  assert.ok(!/@scope[\s\S]*@keyframes/.test(css), '@keyframes must not sit inside @scope');
});

test('a demo script becomes a function of its stage, not a load-time IIFE', () => {
  const { js } = prepareDemo('x', '<style>.a{color:red}</style><p id="p">hi</p><script>root.querySelector("#p")</script>');
  assert.match(js, /^\(root\) => \{/);
  assert.ok(js.includes('#x--p'), 'script selectors should be namespaced with the rest of the demo');
  const pair = prepareDemo('x', '<p id="a"></p><p id="ab"></p><script>root.querySelectorAll("#a, #ab")</script>');
  assert.ok(pair.js.includes('"#x--a, #x--ab"'), 'every id in one selector string should be namespaced');
  assert.equal(prepareDemo('y', '<p>no script</p>').js, '');
});

test('the built page renders one card per feature', async () => {
  const { html, demos } = await build();
  const cards = html.match(/<article class="card"/g) ?? [];
  assert.equal(cards.length, features.length);
  for (const id of ['has', 'subgrid', 'oklab']) {
    assert.ok(html.includes(`id="${id}"`), `missing card for ${id}`);
    assert.ok(demos.has(id), `missing demo for ${id}`);
  }
});

test('every element id in the built page is unique', async () => {
  const { html } = await build();
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, value]) => value);
  const seen = new Set();
  const duplicates = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
  assert.deepEqual([...new Set(duplicates)], []);
});

test('every demo waits in a template that carries its CSS', async () => {
  const { html, demos } = await build();
  for (const id of demos.keys()) {
    assert.ok(html.includes(`data-demo-open="${id}"`), `${id} has no opener`);
    assert.ok(html.includes(`<template data-demo-src="${id}">`), `${id} has no template`);
  }
  assert.ok(demos.get('has').sourceCss.includes(':has('), 'snippet should show authored CSS');
});

// Demo CSS outside a template applies to the whole page, and demo markup
// outside one is laid out and painted whether or not anyone opens the modal.
test('no demo CSS, markup or listing renders before its modal opens', async () => {
  const { html } = await build();
  const live = html.replace(/<template data-demo-src="[^"]*">[\s\S]*?<\/template>/g, '');
  assert.equal((live.match(/<style/g) ?? []).length, 1, 'demo CSS must stay inside its template');
  assert.equal(live.match(/class="demo__stage"/g), null, 'demo markup must stay inside its template');
  assert.equal(live.match(/class="source"/g), null, 'code listings must stay inside their template');
  assert.equal((live.match(/<dialog/g) ?? []).length, 1, 'one modal is shared by every demo');
});

test('minified CSS keeps the colour functions the page is documenting', async () => {
  const { html } = await build();
  assert.ok(html.includes('oklch('), 'oklch() must survive minification');
  assert.ok(!/<style>\s*\n/.test(html), 'stylesheets should be minified');
  assert.ok(!/\n\s{2,}(const|function) /.test(html), 'scripts should be minified');
});

// The bootstrap script marks the chosen theme on <html data-theme>. A control
// selector of [data-theme] therefore collects <html> as a theme button and
// hands it aria-pressed, which the document role does not allow.
test('the theme buttons cannot collect <html> along with themselves', async () => {
  const { html } = await build();
  const app = await readFile(join(root, 'src', 'app.js'), 'utf8');

  assert.ok(html.includes('documentElement.dataset.theme=t'), 'the theme still lands on <html>');
  assert.equal(html.match(/\sdata-theme=/g), null, 'no control may share that attribute');
  assert.equal((html.match(/\sdata-set-theme=/g) ?? []).length, 3, 'three theme buttons');
  assert.ok(app.includes("querySelectorAll('[data-set-theme]')"), 'buttons are collected by their own attribute');
});

// llms.txt is read by machines that will not run the page's JavaScript, so the
// numbers in it have to come from the same data the cards do.
test('llms.txt follows the format and llms-full.txt matches the page', async () => {
  const { features, llmsIndex, llmsFull } = await build();
  const lines = llmsIndex.split('\n');

  assert.match(lines[0], /^# \S/, 'an H1 is the only required section');
  assert.match(lines[2], /^> /, 'the summary is a blockquote');
  for (const item of llmsIndex.matchAll(/^- (.+)$/gm)) {
    assert.match(item[1], /^\[[^\]]+\]\(https?:\/\/[^)]+\)(: .+)?$/, `malformed list item: ${item[1]}`);
  }
  assert.ok(llmsIndex.includes('## Optional'), 'secondary links go under Optional by convention');
  assert.ok(llmsIndex.includes(String(features.length)), 'the index states the feature count');

  const rows = /^\| ([a-z0-9-]+) \| .+ \| (?:\d{4}-\d{2}-\d{2}|unshipped) \|/gm;
  const ids = [...llmsFull.matchAll(rows)].map(([, id]) => id);
  const known = new Set(features.map((f) => f.id));
  assert.equal(ids.length, features.length, 'one row per feature');
  assert.deepEqual(ids.filter((id) => !known.has(id)), [], 'every row names a real feature');
  for (const tier of ['widely', 'newly', 'limited']) {
    const count = features.filter((f) => f.tier === tier).length;
    assert.ok(llmsFull.includes(`(${count})`), `the ${tier} section states its count`);
  }
});

// The tool definitions exist for agents; every other visitor would pay for
// bytes they cannot use, and the page is only at 100 because it stopped doing
// that with the demos.
test('the WebMCP tools load only where the API exists', async () => {
  const { html, agentTools } = await build();

  assert.ok(!html.includes('registerTool'), 'tool definitions stay out of the page');
  assert.match(html, /modelContext[\s\S]{0,80}import\(["']\.\/webmcp\.js["']\)/, 'the import is behind a feature check');
  assert.ok(html.includes('window.cssFeatures='), 'the page exposes the surface the tools read');

  for (const name of ['search_css_features', 'get_css_feature', 'check_css_baseline', 'filter_features'])
    assert.ok(agentTools.includes(name), `${name} is not registered`);
  assert.ok(agentTools.includes('signal'), 'tools are registered with an AbortSignal so they can be withdrawn');
});

// A demo that reuses a chrome class name gets styled by the page and, worse,
// counted as a feature card by the filters.
test('no demo reuses a page chrome class name', async () => {
  const reserved = [
    'card', 'cards', 'section', 'badge', 'chip', 'demo', 'syntax', 'support',
    'empty', 'controls', 'stat', 'stats', 'masthead', 'colophon', 'search',
  ];
  const dir = join(root, 'demos');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.html'));
  const clashes = [];

  for (const file of files) {
    const source = await readFile(join(dir, file), 'utf8');
    for (const [, value] of source.matchAll(/class="([^"]+)"/g)) {
      for (const name of value.split(/\s+/)) {
        if (reserved.includes(name)) clashes.push(`${file}: .${name}`);
      }
    }
  }

  assert.deepEqual(clashes, []);
});

// An unclosed @layer silently nests everything after it, which is how the
// unlayered [hidden] rule the filters depend on ended up losing to .card.
test('stylesheet braces balance and [hidden] stays unlayered', async () => {
  const css = await readFile(join(root, 'src', 'styles.css'), 'utf8');

  let depth = 0;
  let hiddenDepth = null;
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') depth -= 1;
    else if (depth === 0 && css.startsWith('[hidden]', i)) hiddenDepth = depth;
    assert.ok(depth >= 0, `unbalanced closing brace at offset ${i}`);
  }

  assert.equal(depth, 0, 'a block is left unclosed');
  assert.equal(hiddenDepth, 0, '[hidden] must sit outside every @layer to outrank them');
});
