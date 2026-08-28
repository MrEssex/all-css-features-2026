# Every CSS Feature

A single static page listing **every CSS feature** tracked by
[`web-features`](https://github.com/web-platform-dx/web-features) — 436 of them —
each with a live interactive demo, the CSS that produces it, Baseline status,
per-browser support and global usage share.

The feature list is generated from real data at build time, never written by hand,
so the coverage claim is verifiable and regenerating it picks up new features
automatically.

## What is on each card

- **Baseline tier** — widely available, newly available, or not yet Baseline
- **A recommendation** that follows from the tier: recommended, recommended with a
  fallback, or not recommended yet
- **Usage share** — the proportion of users on a browser version that supports it,
  split into full and partial support
- **Browser versions**, with `~` marking partial support
- **A live demo** in a modal, alongside its CSS and markup
- Links to MDN, the spec and caniuse

## Running it

```sh
npm install
npm run build     # writes dist/
npm run serve     # http://localhost:8080
npm test          # data-integrity and cascade checks
```

`dist/index.html` is entirely self-contained — one file, every demo included,
no runtime dependencies and no requests. That costs about two Lighthouse
performance points over serving the demos separately, and it is a deliberate
trade: the page is worth more as a single file you can save and open than as a
100. Beside it the build writes two files that only machines fetch:

- `llms.txt` and `llms-full.txt` — the feature table as markdown, for models
  that would otherwise answer CSS support questions from memory
- `webmcp.js` — the agent tools, fetched only by a browser that has the API

CSS and JS are minified on the way in; the CSS pass is whitespace-only, because
a syntax pass rewrites in-gamut `oklch()` and `lab()` to hex and this page is
partly about those functions.

`npm run serve` gzips and sends real content types, which the deployed site also
does — without that a local Lighthouse run reports a transfer size and a
`robots.txt` that production never serves.

## For machines

Two audiences read this site without looking at it.

**`llms.txt`** follows the [llms.txt](https://llmstxt.org) format and points at
**`llms-full.txt`**, which is every feature as a markdown table — id, name,
Baseline date, the first supporting version in each of the six browsers, and
usage share — grouped by tier, with the recommendation stated once per group
rather than repeated on 436 rows. About 40 kB, small enough to load whole. The
spec wants these at the origin root; on a GitHub Pages project site they land
under the project path, which the spec permits, and every link inside them is
absolute so it resolves either way.

**`webmcp.js`** registers four [WebMCP](https://github.com/webmachinelearning/webmcp)
tools with `document.modelContext`, so an agentic browser can query the page
rather than scrape it:

| tool | does |
| --- | --- |
| `search_css_features` | find features by name, syntax or description |
| `get_css_feature` | one feature's full support record |
| `check_css_baseline` | batch verdict on a list of ids |
| `filter_features` | applies the page's own filters, so the user sees the result |

It reads the cards already in the page, so it ships no data of its own, and
`app.js` only fetches it when `document.modelContext` exists — nobody else pays
for it. WebMCP is an origin trial in Chrome and preview in Edge, and the draft
still moves (`provideContext()` was removed in March 2026), which is why it is
isolated in one lazily-loaded file.

## Adding a demo

Drop a file at `demos/<feature-id>.html` where the basename is exactly the
`web-features` id. It is a fragment: a `<style>` block, markup, and optionally a
few lines of script.

```html
<style>
  .box { display: grid; place-items: center; }
</style>
<div class="box">Hello</div>
```

The build handles the rest:

- CSS is confined with `@scope` so demos cannot leak into each other or the page
- `@keyframes`, `@property` and `@font-face` are hoisted out, since they cannot
  live inside `@scope` — prefix keyframe names with the feature id
- Element ids are namespaced to `<feature-id>--<id>`, rewriting `for`,
  `popovertarget`, `href="#…"` and script selectors to match
- Your markup, CSS and code listing go into a `<template>` on the card. Opening
  the modal clones it into the one shared dialog, so a demo's stylesheet and DOM
  only exist while it is on screen — 436 of them rendered inline would be most
  of the page's DOM and style work
- Your script becomes a function called with `root` bound to that instance's
  stage, once per opening. It has to work on a fresh clone every time: guard
  anything that can only happen once, such as `customElements.define`
- The snippet shown in the modal is your source, not the transformed output

The build **fails** on a demo whose filename matches no feature, and the test
suite fails if a demo reuses a page chrome class name such as `card` or `badge` —
that would get it styled by the page and counted by the filters.

## Configuration

`site.config.json` holds the canonical URL, metadata and AdSense settings.
Set `adsense.client` to your `ca-pub-…` id to enable the AdSense script and
generate `ads.txt`; leave it `null` and neither is emitted.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and
publishes `dist/` to GitHub Pages. `configure-pages` runs with
`enablement: true`, so it switches Pages on itself and a fork deploys without a
visit to the settings page. Set `url` in `site.config.json` to the published
address so the canonical link, sitemap and Open Graph tags are right.

Pull requests run `.github/workflows/ci.yml` — the same test and build, without
the deploy.

## Structure

```
build/     build.mjs  features.mjs  categories.mjs  render.mjs  build.test.mjs
demos/     <feature-id>.html   (436)
src/       styles.css  app.js
dist/      generated: index.html, og.svg, sitemap.xml, robots.txt, .nojekyll
```

## Data sources

- `web-features` (Apache-2.0) — the feature list and Baseline status
- `@mdn/browser-compat-data` (CC0-1.0) — MDN links, per-key support, browser
  release dates
- `caniuse-lite` (CC-BY-4.0) — per-browser-version usage share

All three are build-time only; no package ships to the browser, though the
numbers they produce are baked into the page.

## Licence

[MIT](LICENSE).
