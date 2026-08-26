// WebMCP tools, loaded only when a browser exposes the API. Everything is read
// from the cards already in the page, so the agent surface ships no data of its
// own. Spec: https://github.com/webmachinelearning/webmcp
const api = document.modelContext ?? navigator.modelContext;
const page = window.cssFeatures;

const ok = (value) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
});

const TIERS = ['widely', 'newly', 'limited'];

const tierEnum = {
  type: 'string',
  enum: TIERS,
  description: 'widely = Baseline widely available, newly = Baseline newly available, limited = not yet Baseline',
};

const tools = [
  {
    name: 'search_css_features',
    description:
      'Search the CSS features on this page by name, syntax or description. Returns each match with its Baseline tier and whether it is safe to use. Use this to find features when you do not already know their id.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to match, such as "grid", ":has(" or "oklch"' },
        tier: tierEnum,
        category: { type: 'string', description: 'Restrict to one category, such as "layout" or "color"' },
        limit: { type: 'integer', description: 'Maximum matches to return (default 20)' },
      },
    },
    async execute({ query = '', tier, category, limit = 20 } = {}) {
      const matches = page.search({ query, tier, category });
      return ok({
        matched: matches.length,
        returned: Math.min(matches.length, limit),
        features: matches.slice(0, limit).map((id) => page.read(id, { brief: true })),
      });
    },
  },
  {
    name: 'get_css_feature',
    description:
      'Get the full support record for one CSS feature: its Baseline tier, the recommendation, the first supporting version in each browser, usage share and reference links.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'The web-features id, such as "has" or "subgrid"' } },
      required: ['id'],
    },
    async execute({ id }) {
      const feature = page.read(id);
      if (!feature) return ok(`No CSS feature has the id "${id}". Use search_css_features to find it.`);
      return ok(feature);
    },
  },
  {
    name: 'check_css_baseline',
    description:
      'Check a list of CSS features against Baseline in one call and get a per-feature verdict on whether it is safe to use today. Use this when deciding what to put in a stylesheet.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'web-features ids to check, such as ["has", "subgrid", "anchor-positioning"]',
        },
      },
      required: ['ids'],
    },
    async execute({ ids = [] }) {
      return ok(
        ids.map((id) => {
          const feature = page.read(id, { brief: true });
          return feature ?? { id, error: 'unknown feature id' };
        }),
      );
    },
  },
  {
    name: 'filter_features',
    description:
      "Apply filters to the page the user is looking at, so the cards on screen narrow to the features described. Changes what the user sees. Call with no arguments to clear the filters.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search text to put in the page search box' },
        tier: tierEnum,
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Category ids to show; omit or pass an empty array for all',
        },
        sort: { type: 'string', enum: ['date', 'name'], description: 'date = newest first, name = A to Z' },
      },
    },
    async execute(args = {}) {
      const { visible, total } = page.filter(args);
      return ok(`Showing ${visible} of ${total} features. The page now reflects these filters.`);
    },
  },
];

const controller = new AbortController();
for (const tool of tools) {
  api.registerTool(tool, { signal: controller.signal });
}
