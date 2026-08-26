import { CATEGORIES } from './categories.mjs';

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

// Baseline tier is a fact; this is the advice that follows from it.
const RECOMMENDATION = {
  widely: { level: 'yes', label: 'Recommended', detail: 'Supported everywhere for long enough to rely on.' },
  newly: { level: 'soon', label: 'Recommended with a fallback', detail: 'In every engine, but recently — older devices in the wild may not have it yet.' },
  limited: { level: 'no', label: 'Not recommended yet', detail: 'At least one major engine has no support. Use only behind a feature query.' },
};

const TIER_LABEL = {
  widely: 'Widely available',
  newly: 'Newly available',
  limited: 'Limited availability',
};

const formatDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : null;

// @keyframes, @property and @font-face cannot live inside @scope, so they are
// lifted out before the rest of a demo's CSS is scoped to its stage.
const HOISTED_AT_RULES = /@(?:keyframes|property|font-face|counter-style)\b/y;

function hoistGlobalAtRules(css) {
  let global = '';
  let scoped = '';
  let index = 0;

  while (index < css.length) {
    HOISTED_AT_RULES.lastIndex = index;
    if (css[index] !== '@' || !HOISTED_AT_RULES.test(css)) {
      scoped += css[index++];
      continue;
    }
    const open = css.indexOf('{', index);
    if (open === -1) {
      scoped += css.slice(index);
      break;
    }
    let depth = 0;
    let end = open;
    for (; end < css.length; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}' && --depth === 0) break;
    }
    global += `${css.slice(index, end + 1)}\n`;
    index = end + 1;
  }

  return { global, scoped };
}

// Demo ids share one document with 400+ feature cards, so they are namespaced;
// otherwise a demo's id="all" would shadow the `all` feature's deep link.
function namespaceIds(id, markup, scripts) {
  const declared = [...markup.matchAll(/\sid="([^"]+)"/g)].map(([, value]) => value);
  let html = markup;
  let js = scripts;

  for (const name of declared) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixed = `${id}--${name}`;
    html = html
      .replace(new RegExp(`(\\s(?:id|for|popovertarget|aria-controls)=")${escaped}(")`, 'g'), `$1${prefixed}$2`)
      .replace(new RegExp(`(\\shref="#)${escaped}(")`, 'g'), `$1${prefixed}$2`);
    // A selector string can hold more than one id ('#a, #b'), so the id is
    // matched anywhere inside the quotes and ended by what cannot continue an
    // identifier rather than by the closing quote.
    js = js.replace(new RegExp(`(['"\`][^'"\`]*#)${escaped}(?![\\w-])`, 'g'), `$1${prefixed}`);
  }

  return { html, js };
}

// Demo source is indented to sit inside its HTML file; the snippet should not
// inherit that.
function dedent(code) {
  const lines = code.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length),
  );
  return lines.map((line) => line.slice(indent)).join('\n');
}

export function prepareDemo(id, source) {
  const styles = [];
  const scripts = [];

  const authored = source
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
      styles.push(css);
      return '';
    })
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_, js) => {
      scripts.push(js);
      return '';
    })
    .trim();

  const { html: markup, js: scriptSource } = namespaceIds(id, authored, scripts.join('\n'));

  const { global, scoped } = hoistGlobalAtRules(styles.join('\n'));
  const css = `${global}@scope ([data-demo="${id}"]) {\n${scoped}\n}`;

  // Demos are instantiated from a template when their modal opens, so a demo's
  // script is a function the page calls with that instance's stage.
  const js = scripts.length ? `(root) => {\n${scriptSource}\n}` : '';

  // The snippet shows what the author wrote, not the namespaced build output.
  return { markup, css, js, sourceCss: dedent(styles.join('\n')), sourceHtml: dedent(authored) };
}

function renderUsage(feature) {
  const { full, partial } = feature.usage;
  if (full === null) return '';

  const title = partial
    ? `${full}% of users are on a browser with full support, a further ${partial}% have partial support`
    : `${full}% of users are on a browser that supports this`;

  return `<div class="usage" title="${escapeHtml(title)}">
<div class="usage__bar" role="img" aria-label="${escapeHtml(title)}">
<span class="usage__full" style="inline-size: ${full}%"></span>
<span class="usage__partial" style="inline-size: ${partial}%"></span>
</div>
<p class="usage__value"><strong>${full}%</strong>${
    partial ? `<span class="usage__extra">+${partial}% partial</span>` : ''
  }</p>
</div>`;
}

function renderSupport(feature) {
  const chips = feature.support
    .map(({ label, version, partial }) => {
      const supported = Boolean(version);
      const classes = ['chip', supported ? '' : 'chip--unknown', partial ? 'chip--partial' : ''].filter(Boolean);
      return `<li class="${classes.join(' ')}"${
        partial ? ' title="Partial support — some parts of this feature are missing"' : ''
      }><span class="chip__browser">${escapeHtml(label)}</span><span class="chip__version">${escapeHtml(
        version ?? '—',
      )}${partial ? '<sup>~</sup>' : ''}</span></li>`;
    })
    .join('');
  return `<ul class="support" aria-label="Browser support for ${escapeHtml(feature.name)}">${chips}</ul>`;
}

function renderLinks(feature) {
  const links = [];
  if (feature.mdnUrl) links.push(`<a href="${escapeHtml(feature.mdnUrl)}" rel="noopener">MDN</a>`);
  if (feature.specUrls[0]) links.push(`<a href="${escapeHtml(feature.specUrls[0])}" rel="noopener">Spec</a>`);
  if (feature.caniuse)
    links.push(`<a href="https://caniuse.com/${escapeHtml(feature.caniuse)}" rel="noopener">Can I Use</a>`);
  return links.length ? `<nav class="card__links" aria-label="Reference links for ${escapeHtml(feature.name)}">${links.join('')}</nav>` : '';
}

// A demo's markup, CSS and code listing stay inside a template until the modal
// opens: 436 of them rendered inline would be most of the DOM, and every demo's
// @scope block would be matched against it on every style recalculation.
function renderDemo(feature, demo) {
  const source = (label, code, open) =>
    code
      ? `<details class="source"${open ? ' open' : ''}><summary>${label}</summary><pre><code>${escapeHtml(
          code,
        )}</code></pre></details>`
      : '';

  return `<button type="button" class="demo-open" data-demo-open="${escapeHtml(
    feature.id,
  )}" aria-haspopup="dialog"><span class="demo-open__icon" aria-hidden="true">▶</span> Live demo<span class="visually-hidden"> for ${escapeHtml(
    feature.name,
  )}</span></button>
<template data-demo-src="${escapeHtml(feature.id)}"><style>${demo.css}</style>
<div class="demo__stage" data-demo="${escapeHtml(feature.id)}">${demo.markup}</div>
${source('CSS', demo.sourceCss, true)}
${source('HTML', demo.sourceHtml, false)}
</template>`;
}

function renderCard(feature, demo) {
  const date = formatDate(feature.releaseDate);
  const syntax = feature.syntax
    .map((token) => `<li><code>${escapeHtml(token)}</code></li>`)
    .join('');

  const demoBlock = demo ? renderDemo(feature, demo) : '';
  const advice = RECOMMENDATION[feature.tier];

  const haystack = `${feature.name} ${feature.id} ${feature.syntax.join(' ')} ${feature.descriptionHtml.replace(/<[^>]+>/g, '')}`;

  return `<article class="card" id="${escapeHtml(feature.id)}" data-tier="${feature.tier}" data-category="${escapeHtml(
    feature.category,
  )}"${demo ? ' data-has-demo' : ''} data-date="${escapeHtml(feature.releaseDate ?? '')}" data-name="${escapeHtml(
    feature.name.toLowerCase(),
  )}" data-search="${escapeHtml(haystack.toLowerCase())}">
<header class="card__head">
<h3 class="card__title"><a href="#${escapeHtml(feature.id)}">${escapeHtml(feature.name)}</a></h3>
<span class="badge badge--${feature.tier}" title="${
    feature.tier === 'limited'
      ? `Not Baseline${date ? ` — latest engine shipped ${date}` : ''}`
      : `Baseline ${TIER_LABEL[feature.tier]}${date ? ` since ${date}` : ''}`
  }"><span class="badge__dot" aria-hidden="true"></span>${TIER_LABEL[feature.tier]}${
    date ? ` <span class="badge__date">${escapeHtml(date)}</span>` : ''
  }</span>
</header>
<div class="card__desc">${feature.descriptionHtml}</div>
<ul class="syntax" aria-label="Syntax">${syntax}</ul>
<p class="advice" title="${escapeHtml(advice.detail)}"><span class="advice__label">Should I use:</span><span class="advice__chip advice__chip--${
    advice.level
  }"><span class="advice__icon" aria-hidden="true"></span>${escapeHtml(advice.label)}</span></p>
${renderUsage(feature)}
${demoBlock}
${renderSupport(feature)}
${renderLinks(feature)}
</article>`;
}

function renderSection(category, features, demos) {
  const cards = features.map((f) => renderCard(f, demos.get(f.id))).join('\n');
  return `<section class="section" id="section-${category.id}" data-category="${category.id}" aria-labelledby="section-heading-${category.id}">
<div class="section__head">
<h2 class="section__title" id="section-heading-${category.id}">${escapeHtml(category.title)}</h2>
<p class="section__intro">${escapeHtml(category.intro)}</p>
<p class="section__count">${features.length} features</p>
</div>
<div class="cards">
${cards}
</div>
</section>`;
}

export function renderPage({ features, demos, styles, script, site, meta }) {
  const widely = features.filter((f) => f.tier === 'widely').length;
  const newly = features.filter((f) => f.tier === 'newly').length;
  const limited = features.filter((f) => f.tier === 'limited').length;

  const sections = CATEGORIES.map((category) => {
    const inCategory = features.filter((f) => f.category === category.id);
    return inCategory.length ? renderSection(category, inCategory, demos) : '';
  })
    .filter(Boolean)
    .join('\n');

  const chips = CATEGORIES.map((category) => {
    const count = features.filter((f) => f.category === category.id).length;
    return count
      ? `<button type="button" class="filter-chip" data-filter-category="${category.id}" aria-pressed="false">${escapeHtml(
          category.title,
        )} <span class="filter-chip__count">${count}</span></button>`
      : '';
  })
    .filter(Boolean)
    .join('');

  const canonical = site.url.replace(/\/?$/, '/');

  // A feature list is exactly what ItemList describes; the FAQ answers the
  // questions this page actually gets searched for.
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${canonical}#website`,
        url: canonical,
        name: site.title,
        description: site.description,
        inLanguage: 'en',
      },
      {
        '@type': 'TechArticle',
        '@id': `${canonical}#article`,
        headline: site.title,
        description: site.description,
        url: canonical,
        inLanguage: 'en',
        datePublished: meta.builtOn,
        dateModified: meta.builtOn,
        author: { '@type': 'Person', name: site.author },
        isPartOf: { '@id': `${canonical}#website` },
        about: { '@type': 'Thing', name: 'Cascading Style Sheets' },
      },
      {
        '@type': 'ItemList',
        name: 'CSS features by Baseline status',
        numberOfItems: features.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: features.slice(0, 100).map((feature, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: feature.name,
          url: `${canonical}#${feature.id}`,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How many CSS features can I use today?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Of the ${features.length} CSS features tracked by web-features, ${widely} are Baseline widely available and ${newly} are newly available — ${widely + newly} in total that work in Chrome, Edge, Firefox and Safari. The remaining ${limited} are not yet Baseline.`,
            },
          },
          {
            '@type': 'Question',
            name: 'What does Baseline mean in CSS?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Baseline newly available means a feature works in the current version of every major browser engine. Baseline widely available means it has done so for at least 30 months, so it is safe to rely on without a fallback.',
            },
          },
        ],
      },
    ],
  });

  // Auto ads need only the script; an explicit unit also needs a slot id, so
  // one is rendered only when the config supplies it.
  const adUnit = (slot, label) =>
    site.adsense?.client && site.adsense?.slots?.[slot]
      ? `<aside class="ad" aria-label="${escapeHtml(label)}">
<ins class="adsbygoogle" style="display:block" data-ad-client="${escapeHtml(
          site.adsense.client,
        )}" data-ad-slot="${escapeHtml(site.adsense.slots[slot])}" data-ad-format="auto" data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</aside>`
      : '';

  const adsense = site.adsense?.client
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeHtml(
        site.adsense.client,
      )}" crossorigin="anonymous"></script>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(site.title)}: ${escapeHtml(site.tagline)}</title>
<meta name="description" content="${escapeHtml(site.description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="author" content="${escapeHtml(site.author)}">
<meta name="theme-color" content="#f7f8fb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111318" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(site.title)}">
<meta property="og:title" content="${escapeHtml(site.title)} — ${escapeHtml(site.tagline)}">
<meta property="og:description" content="${escapeHtml(site.description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:locale" content="${escapeHtml(site.locale)}">
<meta property="og:image" content="${escapeHtml(canonical)}og.svg">
<meta property="og:image:alt" content="Every CSS feature, newest first — ${features.length} features with live demos">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(site.title)}">
<meta name="twitter:description" content="${escapeHtml(site.description)}">
<meta name="twitter:image" content="${escapeHtml(canonical)}og.svg">

<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%235b53d6'/%3E%3Ctext x='16' y='23' font-family='system-ui,sans-serif' font-size='18' font-weight='700' fill='white' text-anchor='middle'%3E%23%3C/text%3E%3C/svg%3E">
<link rel="sitemap" href="sitemap.xml">
<script type="application/ld+json">${structuredData}</script>
${adsense}
<script>try{const t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}</script>
<style>${styles}</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to features</a>

<header class="masthead">
<h1 class="masthead__title">Every CSS feature,<br>newest first</h1>
<p class="masthead__lead">All <strong>${features.length}</strong> CSS features tracked by <a href="https://web-platform-dx.github.io/web-features/">web-features</a>, each tagged with its <a href="https://web.dev/baseline">Baseline</a> status — from shipped-everywhere to still-landing. Generated from <code>web-features@${escapeHtml(
    meta.webFeaturesVersion,
  )}</code>, not from memory.</p>
<dl class="stats">
<div class="stat"><dt>Total</dt><dd>${features.length}</dd></div>
<div class="stat stat--widely"><dt>Widely available</dt><dd>${widely}</dd></div>
<div class="stat stat--newly"><dt>Newly available</dt><dd>${newly}</dd></div>
<div class="stat stat--limited"><dt>Not yet Baseline</dt><dd>${limited}</dd></div>
</dl>
</header>

<nav class="controls" id="controls" aria-label="Filter and sort features">
<div class="controls__inner">
<div class="controls__top">
<div class="search">
<label class="search__label" for="search">Search</label>
<input type="search" id="search" class="search__input" placeholder="grid, :has(), oklch…" autocomplete="off" spellcheck="false">
</div>
<div class="tiers theme" role="group" aria-label="Colour theme">
<button type="button" class="tier-btn" data-set-theme="light" aria-pressed="false">Light</button>
<button type="button" class="tier-btn" data-set-theme="dark" aria-pressed="false">Dark</button>
<button type="button" class="tier-btn is-active" data-set-theme="system" aria-pressed="true">System</button>
</div>
</div>
<div class="controls__row">
<div class="tiers" role="group" aria-label="Baseline tier">
<button type="button" class="tier-btn is-active" data-filter-tier="all" aria-pressed="true">All</button>
<button type="button" class="tier-btn" data-filter-tier="widely" aria-pressed="false">Widely</button>
<button type="button" class="tier-btn" data-filter-tier="newly" aria-pressed="false">Newly</button>
<button type="button" class="tier-btn" data-filter-tier="limited" aria-pressed="false">Not Baseline</button>
</div>
<div class="tiers" role="group" aria-label="Sort order">
<button type="button" class="tier-btn is-active" data-sort="date" aria-pressed="true">Newest</button>
<button type="button" class="tier-btn" data-sort="name" aria-pressed="false">A–Z</button>
</div>
</div>
<div class="filter-chips" role="group" aria-label="Category">${chips}</div>
<p class="result-count" role="status" aria-live="polite"></p>
</div>
</nav>

<main id="main" tabindex="-1">
${adUnit('top', 'Advertisement')}
${sections}
${adUnit('bottom', 'Advertisement')}
<p class="empty" hidden>No features match those filters.</p>
</main>

<footer class="colophon">
<p>Feature data from <a href="https://github.com/web-platform-dx/web-features"><code>web-features</code></a> ${escapeHtml(
    meta.webFeaturesVersion,
  )}; documentation links from <a href="https://github.com/mdn/browser-compat-data"><code>@mdn/browser-compat-data</code></a> ${escapeHtml(
    meta.bcdVersion,
  )}; usage share from <a href="https://caniuse.com"><code>caniuse-lite</code></a> ${escapeHtml(
    meta.caniuseVersion,
  )}. Built ${escapeHtml(meta.builtOn)}.</p>
<p>Usage share is the proportion of users on a browser version that supports the feature, across the six browsers web-features tracks — about 93% of global usage, so Chromium forks such as Samsung Internet and Opera are not counted. <em>Partial</em> means the browser supports some but not all of a feature's sub-features. Note that caniuse models Chrome for Android as a single current version carrying its whole 46% share, so a feature Chrome has just shipped gains that entire block at once; treat freshly-shipped percentages as optimistic.</p>
<p>Every CSS-scoped feature in the dataset is listed, whatever its Baseline status. Dates are the day the feature reached Baseline; for features that have not, the day the most recent engine to support it shipped. Features no engine has shipped carry no date and sort last.</p>
</footer>

<dialog class="demo-dialog" id="demo-dialog" aria-labelledby="demo-dialog-title">
<header class="demo-dialog__head">
<h4 id="demo-dialog-title"></h4>
<form method="dialog"><button class="demo-dialog__close" aria-label="Close demo">&#215;</button></form>
</header>
<div class="demo-dialog__body"></div>
</dialog>

<script>${script}</script>
</body>
</html>
`;
}
