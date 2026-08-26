import { BROWSERS } from './features.mjs';

// The tier is the fact and the advice follows from it, so each is stated once
// per section rather than repeated across 436 rows.
const TIERS = [
  {
    id: 'widely',
    title: 'Baseline widely available',
    advice:
      'Supported by every major engine for at least 30 months. Safe to use without a fallback.',
  },
  {
    id: 'newly',
    title: 'Baseline newly available',
    advice:
      'Supported by every major engine, but recently. Use it, and provide a fallback for older devices still in the wild.',
  },
  {
    id: 'limited',
    title: 'Not yet Baseline',
    advice:
      'At least one major engine has no support. Use only behind an @supports query, with a fallback.',
  },
];

const escapeCell = (value) => String(value).replace(/\|/g, '\\|');

function tableFor(features) {
  const head = `| id | name | since | ${BROWSERS.map((b) => b.label.toLowerCase()).join(' | ')} | usage |`;
  const rule = `| --- | --- | --- | ${BROWSERS.map(() => '---').join(' | ')} | --- |`;

  const rows = features.map((feature) => {
    // `~` marks partial support, the same mark the page puts on the chip.
    const versions = feature.support.map(({ version, partial }) =>
      version ? `${version}${partial ? '~' : ''}` : 'no',
    );
    const usage = feature.usage.full === null ? '?' : `${feature.usage.full}%`;
    return `| ${escapeCell(feature.id)} | ${escapeCell(feature.name)} | ${
      feature.releaseDate ?? 'unshipped'
    } | ${versions.join(' | ')} | ${usage} |`;
  });

  return [head, rule, ...rows].join('\n');
}

export function renderLlmsFull({ features, site, meta }) {
  const sections = TIERS.map(({ id, title, advice }) => {
    const inTier = features.filter((f) => f.tier === id);
    if (!inTier.length) return '';
    return `## ${title} (${inTier.length})

${advice}

${tableFor(inTier)}`;
  }).filter(Boolean);

  return `# Every CSS Feature

> Every CSS feature tracked by web-features, with its Baseline status, the
> browser versions that support it and its usage share. Generated from
> web-features@${meta.webFeaturesVersion} on ${meta.builtOn}, not written by hand.

Versions are the first release with support; \`~\` means partial support and
\`no\` means the browser has not shipped it. Usage share is the proportion of
users on a version that fully supports the feature, across the six browsers
web-features tracks — about 93% of global usage. \`since\` is the date the
feature reached Baseline, or for those that have not, the day the most recent
engine to support it shipped.

Source: ${site.url}

${sections.join('\n\n')}
`;
}

export function renderLlmsIndex({ features, site, meta }) {
  const count = (tier) => features.filter((f) => f.tier === tier).length;
  const canonical = site.url.replace(/\/?$/, '/');

  return `# ${site.title}

> All ${features.length} CSS features tracked by web-features, each with its Baseline
> status, a recommendation that follows from it, per-browser versions, usage
> share and a live demo. Generated from web-features@${meta.webFeaturesVersion} on
> ${meta.builtOn}, so the support data is checkable rather than remembered.

Of the ${features.length} features, ${count('widely')} are Baseline widely available, ${count(
    'newly',
  )} are newly
available, and ${count('limited')} are not yet Baseline.

## Feature data

- [Full feature table](${canonical}llms-full.txt): every feature with its Baseline tier, the recommendation that follows, first supporting version in each of the six browsers web-features tracks, usage share and date
- [The page itself](${canonical}): the same data as cards, each with a live demo, the CSS behind it and links to MDN, the spec and caniuse

## Optional

- [web-features](https://github.com/web-platform-dx/web-features): the dataset this is generated from, and the definition of Baseline
- [Baseline](https://web.dev/baseline): what widely available and newly available mean
`;
}
