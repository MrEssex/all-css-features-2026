import { features } from 'web-features';
import bcd from '@mdn/browser-compat-data' with { type: 'json' };
import { agents } from 'caniuse-lite';
import { categoryFor, assertCategoriesValid } from './categories.mjs';

export const BROWSERS = [
  { id: 'chrome', label: 'Chrome' },
  { id: 'edge', label: 'Edge' },
  { id: 'firefox', label: 'Firefox' },
  { id: 'safari', label: 'Safari' },
  { id: 'chrome_android', label: 'Android' },
  { id: 'safari_ios', label: 'iOS' },
];

const isCssKey = (key) => key.startsWith('css.');

// web-features tracks these six; together they are ~93% of caniuse's global
// usage, so the share below is normalised against them rather than against all
// browsers. Chromium forks such as Samsung Internet and Opera are not counted.
const USAGE_AGENTS = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  safari: 'safari',
  chrome_android: 'and_chr',
  safari_ios: 'ios_saf',
};

const parseVersion = (value) =>
  String(value).split('-')[0].replace(/[^\d.]/g, '').split('.').filter(Boolean).map(Number);

function compareVersions(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

const cleanDate = (value) => (typeof value === 'string' ? value.replace(/[^\d-]/g, '') : null) || null;

// web-features gives a Baseline date only once every engine has shipped. For
// features that have not got there, the closest equivalent is the date the most
// recent engine that does support it shipped.
function firstShippedDate(support) {
  let latest = null;
  for (const [browser, version] of Object.entries(support)) {
    const releases = bcd.browsers[browser]?.releases ?? {};
    const date = releases[String(version).replace(/^[^\d]*/, '')]?.release_date;
    if (date && (!latest || date > latest)) latest = date;
  }
  return latest;
}

function lookupBcd(key) {
  return key.split('.').reduce((node, part) => (node ? node[part] : undefined), bcd);
}

function mdnUrlFor(compatKeys) {
  for (const key of compatKeys) {
    const url = lookupBcd(key)?.__compat?.mdn_url;
    if (url) return url;
  }
  return null;
}

// Turns BCD compat keys into the tokens an author would actually type.
function syntaxFor(compatKeys, name) {
  const tokens = new Set();
  for (const key of compatKeys) {
    const parts = key.split('.');
    const [, kind, first, second] = parts;
    if (kind === 'properties') {
      tokens.add(second && parts.length === 4 ? `${first}: ${second}` : first);
    } else if (kind === 'at-rules') {
      tokens.add(second ? `@${first} { ${second} }` : `@${first}`);
    } else if (kind === 'types') {
      const last = parts.at(-1);
      if (last && last !== 'types') tokens.add(`${last}()`);
    }
  }
  const list = [...tokens]
    .filter((token) => token && !token.includes('_')) // BCD sub-keys like mixed_type_parameters
    .sort((a, b) => Number(a.includes(':')) - Number(b.includes(':')) || a.length - b.length)
    .slice(0, 5);
  return list.length ? list : [name];
}

// A browser version supports a feature fully when it supports every compat key,
// and partially when it supports some. web-features only fills status.support
// for the full case, which leaves half-shipped features like anchor positioning
// looking like nothing supports them at all.
function keySupports(status) {
  const keys = Object.values(status?.by_compat_key ?? {});
  if (keys.length) return keys.map((key) => key.support ?? {});
  return [status?.support ?? {}];
}

// Earliest version each browser shipped any part of the feature.
function mergedSupport(supports) {
  const merged = {};
  for (const support of supports) {
    for (const [browser, version] of Object.entries(support)) {
      const current = merged[browser];
      if (!current || compareVersions(parseVersion(version), parseVersion(current)) < 0) {
        merged[browser] = version;
      }
    }
  }
  return merged;
}

const upperBound = (sorted, value) => {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (compareVersions(sorted[mid], value) <= 0) low = mid + 1;
    else high = mid;
  }
  return low;
};

function usageShare(supports) {
  const total = supports.length;
  let full = 0;
  let partial = 0;
  let tracked = 0;

  for (const [browser, agentId] of Object.entries(USAGE_AGENTS)) {
    const agent = agents[agentId];
    if (!agent) continue;

    const mins = supports
      .map((support) => (support[browser] ? parseVersion(support[browser]) : null))
      .filter((version) => version && version.length)
      .sort(compareVersions);

    for (const version of agent.versions) {
      if (!version) continue;
      const share = agent.usage_global[version] ?? 0;
      tracked += share;
      if (!mins.length) continue;

      const supported = upperBound(mins, parseVersion(version));
      if (supported === total) full += share;
      else if (supported > 0) partial += share;
    }
  }

  if (!tracked) return { full: null, partial: null };
  const round = (value) => Math.round((value / tracked) * 1000) / 10;
  return { full: round(full), partial: round(partial) };
}

// Newest first; anything with no shipping date at all sorts to the end.
export const byReleaseDate = (a, b) =>
  (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') || a.name.localeCompare(b.name, 'en');

export const byName = (a, b) => a.name.localeCompare(b.name, 'en');

export function selectFeatures() {
  assertCategoriesValid();

  const selected = [];
  const uncategorised = [];

  for (const [id, feature] of Object.entries(features)) {
    const compatKeys = feature.compat_features ?? [];
    if (!compatKeys.some(isCssKey)) continue;

    const groups = (Array.isArray(feature.group) ? feature.group : [feature.group]).filter(Boolean);
    const category = categoryFor(id, groups);
    if (!category) {
      uncategorised.push(`${id} (groups: ${groups.join(', ') || 'none'})`);
      continue;
    }

    const cssKeys = compatKeys.filter(isCssKey);
    const fullSupport = feature.status?.support ?? {};
    const supports = keySupports(feature.status);
    const merged = mergedSupport(supports);
    const usage = usageShare(supports);
    const baseline = feature.status?.baseline;
    const baselineDate = cleanDate(feature.status?.baseline_low_date);

    selected.push({
      id,
      name: feature.name,
      descriptionHtml: feature.description_html ?? feature.description ?? '',
      tier: baseline === 'high' ? 'widely' : baseline === 'low' ? 'newly' : 'limited',
      baselineDate,
      releaseDate: baselineDate ?? firstShippedDate(merged),
      engines: Object.keys(fullSupport).length,
      usage,
      widelyDate: cleanDate(feature.status?.baseline_high_date),
      support: BROWSERS.map(({ id: browser, label }) => ({
        id: browser,
        label,
        version: fullSupport[browser] ?? merged[browser] ?? null,
        partial: !fullSupport[browser] && Boolean(merged[browser]),
      })),
      syntax: syntaxFor(cssKeys, feature.name),
      specUrls: (Array.isArray(feature.spec) ? feature.spec : [feature.spec]).filter(Boolean),
      mdnUrl: mdnUrlFor(cssKeys),
      caniuse: (feature.caniuse ?? [])[0] ?? null,
      category,
    });
  }

  if (uncategorised.length) {
    throw new Error(
      `${uncategorised.length} Baseline CSS feature(s) map to no category. ` +
        `Add them to build/categories.mjs:\n  ${uncategorised.join('\n  ')}`,
    );
  }

  selected.sort(byReleaseDate);
  return selected;
}
