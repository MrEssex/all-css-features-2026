export const CATEGORIES = [
  {
    id: 'layout',
    title: 'Layout',
    intro: 'Grid, flexbox, positioning, containment and the box model — how boxes find their place on the page.',
  },
  {
    id: 'selectors',
    title: 'Selectors & Matching',
    intro: 'Everything that decides which elements a rule applies to, from :has() to structural and state pseudo-classes.',
  },
  {
    id: 'color',
    title: 'Color',
    intro: 'Wide-gamut color spaces, mixing, contrast, and colors that respond to the user’s scheme and preferences.',
  },
  {
    id: 'typography',
    title: 'Typography & Text',
    intro: 'Fonts, font features, text layout, wrapping, decoration, lists and counters.',
  },
  {
    id: 'motion',
    title: 'Animation & Motion',
    intro: 'Transitions, keyframe animations, easing, motion paths and view transitions.',
  },
  {
    id: 'responsive',
    title: 'Responsive & Queries',
    intro: 'Media queries, container queries and feature detection — styling that adapts to its context.',
  },
  {
    id: 'graphics',
    title: 'Effects & Graphics',
    intro: 'Backgrounds, borders, filters, blending, clipping, masking, shapes and SVG.',
  },
  {
    id: 'values',
    title: 'Values & Units',
    intro: 'Length units, math functions and the calculation machinery behind every value.',
  },
  {
    id: 'cascade',
    title: 'Cascade & Architecture',
    intro: 'Layers, scoping, nesting, custom properties and the keywords that control inheritance.',
  },
  {
    id: 'scrolling',
    title: 'Scrolling',
    intro: 'Scroll behaviour, snapping, scrollbar styling and touch interaction.',
  },
  {
    id: 'forms',
    title: 'Forms & UI',
    intro: 'Form controls, popovers, dialogs, shadow DOM and the built-in interface primitives.',
  },
  {
    id: 'platform',
    title: 'Platform & Interop',
    intro: 'Printing, MathML, WebVTT, text fragments and the edges where CSS meets the rest of the platform.',
  },
];

const GROUP_TO_CATEGORY = {
  layout: 'layout',
  positioning: 'layout',
  grid: 'layout',
  flexbox: 'layout',
  'multi-column': 'layout',
  containment: 'layout',

  selectors: 'selectors',

  'color-types': 'color',

  text: 'typography',
  'text-wrap': 'typography',
  fonts: 'typography',
  'font-features': 'typography',
  'font-synthesis': 'typography',
  'white-space': 'typography',
  ruby: 'typography',
  lists: 'typography',
  counters: 'typography',

  transforms: 'motion',
  animation: 'motion',
  transitions: 'motion',
  'view-transitions': 'motion',

  'media-queries': 'responsive',
  'container-queries': 'responsive',

  background: 'graphics',
  'borders-outlines': 'graphics',
  'clipping-shapes-masking': 'graphics',
  gradients: 'graphics',
  'blend-mode': 'graphics',
  svg: 'graphics',
  images: 'graphics',
  'image-scaling': 'graphics',

  units: 'values',
  'environment-variables': 'values',

  'explicit-defaults': 'cascade',

  scrolling: 'scrolling',

  forms: 'forms',
  'html-elements': 'forms',
  'custom-elements': 'forms',
  html: 'forms',

  'scroll-markers': 'scrolling',
  'media-elements': 'platform',
  speech: 'platform',
  worklets: 'platform',
  webxr: 'platform',
  'progressive-web-app': 'platform',
  'reading-order': 'layout',
  mathml: 'platform',
  print: 'platform',
  'text-fragments': 'platform',
};

// The `css` group is a 61-feature catch-all and 19 features carry no group at
// all, so both are resolved here by hand.
const FEATURE_OVERRIDES = {
  // Layout
  'aspect-ratio': 'layout',
  display: 'layout',
  'display-flow-root': 'layout',
  'display-list-item': 'layout',
  'display-table': 'layout',
  'two-value-display': 'layout',
  'float-clear': 'layout',
  'overflow-clip': 'layout',
  'overflow-shorthand': 'layout',
  'z-index': 'layout',
  visibility: 'layout',
  'logical-properties': 'layout',
  'physical-properties': 'layout',
  'writing-mode': 'layout',
  'layout-direction-override': 'layout',
  'vertical-align': 'layout',
  'content-visibility': 'layout',
  'will-change': 'layout',
  'min-max-width-height': 'layout',
  'object-fit': 'layout',
  'object-position': 'layout',
  'transform-box': 'layout',
  zoom: 'layout',

  // Color
  color: 'color',
  'color-mix': 'color',
  'color-scheme': 'color',
  'light-dark': 'color',
  'relative-color': 'color',
  opacity: 'color',
  'forced-colors': 'color',
  'caret-color': 'color',

  // Typography & Text
  hyphens: 'typography',
  quotes: 'typography',
  'text-indent': 'typography',
  'text-overflow': 'typography',
  'text-stroke-fill': 'typography',
  content: 'typography',
  'alt-text-generated-content': 'typography',
  'before-after': 'typography',
  'font-family-system': 'typography',
  'font-family-math': 'typography',
  'text-decoration': 'typography',
  'text-decoration-skip-ink': 'typography',
  'text-decoration-skip-ink-all': 'typography',
  'text-decoration-spelling-grammar': 'typography',
  'text-emphasis': 'typography',
  highlight: 'typography',

  // Animation & Motion
  'linear-easing': 'motion',
  'motion-path': 'motion',
  'starting-style': 'motion',

  // Responsive & Queries
  supports: 'responsive',

  // Effects & Graphics
  'backdrop-filter': 'graphics',
  filter: 'graphics',
  'image-set': 'graphics',
  'paint-order': 'graphics',
  outline: 'graphics',
  outlines: 'graphics',

  // Values & Units
  calc: 'values',
  'calc-constants': 'values',
  'abs-sign': 'values',
  'exp-functions': 'values',
  'trig-functions': 'values',
  'round-mod-rem': 'values',
  'min-max-clamp': 'values',
  'sibling-count': 'values',
  'attr-contents': 'values',
  'viewport-unit-variants': 'values',

  // Cascade & Architecture
  'cascade-layers': 'cascade',
  nesting: 'cascade',
  scope: 'cascade',
  'custom-properties': 'cascade',
  'registered-custom-properties': 'cascade',
  import: 'cascade',
  charset: 'cascade',
  namespace: 'cascade',

  // Scrolling
  'touch-action': 'scrolling',

  // Forms & UI
  appearance: 'forms',
  'field-sizing': 'forms',
  'vertical-form-controls': 'forms',
  'pointer-events': 'forms',

  // Not yet Baseline — same mapping rules apply.
  'anchor-positioning': 'layout',
  'anchor-positioning-transforms': 'layout',
  'anchor-positioning-position-visibility-plurals': 'layout',
  'container-anchor-position-queries': 'responsive',
  'display-contents': 'layout',
  'display-animation': 'motion',
  'margin-trim': 'layout',
  'object-view-box': 'layout',
  'overflow-clip-margin': 'layout',
  'overflow-overlay': 'layout',
  overlay: 'motion',
  interactivity: 'layout',
  'reading-flow': 'layout',
  resize: 'layout',
  'viewport-segments': 'responsive',
  'device-posture': 'responsive',
  'window-controls-overlay': 'platform',
  'webxr-dom-overlays': 'platform',
  'picture-in-picture': 'platform',
  fullscreen: 'platform',
  'media-pseudos': 'platform',
  'url-cross-origin': 'platform',
  'url-integrity': 'platform',
  'url-referrer-policy': 'platform',
  speak: 'platform',
  'speak-as': 'typography',
  'accent-color': 'forms',
  'caret-shape': 'forms',
  cursor: 'forms',
  'user-select': 'forms',
  'ime-mode': 'forms',
  'scroll-markers': 'scrolling',
  'scroll-marker-targets': 'scrolling',
  'scroll-target-group': 'scrolling',
  'border-shape': 'graphics',
  'corner-shape': 'graphics',
  'path-shape': 'graphics',
  'box-decoration-break': 'graphics',
  'filter-function': 'graphics',
  'dynamic-range-limit': 'graphics',
  'light-dark-image': 'graphics',
  element: 'graphics',
  paint: 'graphics',
  attr: 'values',
  'calc-size': 'values',
  'color-mix-variadic': 'color',
  function: 'values',
  if: 'values',
  'progress-function': 'values',
  'random-function': 'values',
  'supports-at-rule': 'responsive',
  'baseline-source': 'typography',
  'custom-ellipses': 'typography',
  'hanging-punctuation': 'typography',
  'initial-letter': 'typography',
  'line-clamp': 'typography',
  'text-autospace': 'typography',
  'text-fit': 'typography',
  'text-size-adjust': 'typography',
  'text-spacing-trim': 'typography',
  'word-break-break-word': 'typography',
  'glyph-orientation-vertical': 'typography',
  'writing-mode-svg-values': 'layout',

  // Platform & Interop
  'page-breaks': 'platform',
  'page-setup': 'platform',
  webvtt: 'platform',
};

const KNOWN = new Set(CATEGORIES.map((c) => c.id));

export function categoryFor(id, groups) {
  const override = FEATURE_OVERRIDES[id];
  if (override) return override;
  for (const group of groups) {
    const mapped = GROUP_TO_CATEGORY[group];
    if (mapped) return mapped;
  }
  return null;
}

export function assertCategoriesValid() {
  for (const [id, cat] of Object.entries(FEATURE_OVERRIDES)) {
    if (!KNOWN.has(cat)) throw new Error(`Override "${id}" targets unknown category "${cat}"`);
  }
  for (const [group, cat] of Object.entries(GROUP_TO_CATEGORY)) {
    if (!KNOWN.has(cat)) throw new Error(`Group "${group}" targets unknown category "${cat}"`);
  }
}
