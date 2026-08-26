(() => {
  const cards = [...document.querySelectorAll('.cards > .card')];
  const search = document.querySelector('#search');
  const empty = document.querySelector('.empty');
  const count = document.querySelector('.result-count');
  const tierButtons = [...document.querySelectorAll('[data-filter-tier]')];
  const categoryChips = [...document.querySelectorAll('[data-filter-category]')];
  const sortButtons = [...document.querySelectorAll('[data-sort]')];

  const state = { query: '', tier: 'all', sort: 'date', categories: new Set() };

  const setPressed = (buttons, isActive) => {
    for (const button of buttons) {
      const active = isActive(button);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  };

  const matches = (card) => {
    if (state.tier !== 'all' && card.dataset.tier !== state.tier) return false;
    if (state.categories.size && !state.categories.has(card.dataset.category)) return false;
    return !state.query || card.dataset.search.includes(state.query);
  };

  function apply() {
    let visible = 0;
    for (const card of cards) {
      const show = matches(card);
      card.hidden = !show;
      if (show) visible += 1;
    }
    // Sections collapse via :has() in CSS; the count and empty state need JS.
    empty.hidden = visible > 0;
    count.textContent =
      visible === cards.length ? `${cards.length} features` : `${visible} of ${cards.length} features`;

    const params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.tier !== 'all') params.set('tier', state.tier);
    if (state.sort !== 'date') params.set('sort', state.sort);
    if (state.categories.size) params.set('cat', [...state.categories].join(','));
    const query = params.toString();
    history.replaceState(null, '', query ? `?${query}${location.hash}` : location.pathname + location.hash);
  }

  search.addEventListener('input', () => {
    state.query = search.value.trim().toLowerCase();
    apply();
  });

  for (const button of tierButtons) {
    button.addEventListener('click', () => {
      state.tier = button.dataset.filterTier;
      setPressed(tierButtons, (other) => other === button);
      apply();
    });
  }

  const SORTERS = {
    date: (a, b) => (b.dataset.date || '').localeCompare(a.dataset.date || '') ||
      a.dataset.name.localeCompare(b.dataset.name),
    name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
  };

  function sortCards() {
    for (const grid of document.querySelectorAll('.cards')) {
      const sorted = [...grid.children].sort(SORTERS[state.sort]);
      grid.append(...sorted);
    }
  }

  for (const button of sortButtons) {
    button.addEventListener('click', () => {
      state.sort = button.dataset.sort;
      setPressed(sortButtons, (other) => other === button);
      sortCards();
      apply();
    });
  }

  // Not [data-theme]: the bootstrap script puts that on <html>, which would
  // then be handed the .is-active class and an aria-pressed it cannot carry.
  const themeButtons = [...document.querySelectorAll('[data-set-theme]')];
  for (const button of themeButtons) {
    button.addEventListener('click', () => {
      const choice = button.dataset.setTheme;
      if (choice === 'system') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = choice;
      try {
        if (choice === 'system') localStorage.removeItem('theme');
        else localStorage.setItem('theme', choice);
      } catch {}
      setPressed(themeButtons, (other) => other === button);
    });
  }
  {
    const current = document.documentElement.dataset.theme || 'system';
    setPressed(themeButtons, (button) => button.dataset.setTheme === current);
  }

  // Demos live in a modal so a card stays scannable and the demo gets real room.
  // One modal is filled from the demo's template on open: its stylesheet only
  // reaches the document while it is the demo on screen.
  const dialog = document.querySelector('#demo-dialog');
  const dialogTitle = document.querySelector('#demo-dialog-title');
  const dialogBody = document.querySelector('.demo-dialog__body');
  const demoInit = window.demoInit ?? {};

  for (const opener of document.querySelectorAll('[data-demo-open]')) {
    opener.addEventListener('click', () => {
      const id = opener.dataset.demoOpen;
      const template = document.querySelector(`template[data-demo-src="${CSS.escape(id)}"]`);
      if (!template) return;
      dialogTitle.textContent = opener.closest('.card').querySelector('.card__title').textContent;
      dialogBody.replaceChildren(template.content.cloneNode(true));
      dialog.showModal();
      demoInit[id]?.(dialogBody.querySelector('.demo__stage'));
    });
  }

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  for (const chip of categoryChips) {
    chip.addEventListener('click', () => {
      const id = chip.dataset.filterCategory;
      if (state.categories.has(id)) state.categories.delete(id);
      else state.categories.add(id);
      setPressed([chip], () => state.categories.has(id));
      apply();
    });
  }

  function reset() {
    state.query = '';
    state.tier = 'all';
    state.categories.clear();
    search.value = '';
    setPressed(tierButtons, (button) => button.dataset.filterTier === 'all');
    setPressed(categoryChips, () => false);
    apply();
  }

  // A filtered-out target would otherwise scroll to nothing.
  addEventListener('hashchange', () => {
    const target = location.hash && document.querySelector(location.hash);
    if (target?.classList.contains('card') && target.hidden) {
      reset();
      target.scrollIntoView();
    }
  });

  const params = new URLSearchParams(location.search);
  if (params.has('q')) search.value = state.query = params.get('q').toLowerCase();
  if (params.has('tier')) {
    state.tier = params.get('tier');
    setPressed(tierButtons, (button) => button.dataset.filterTier === state.tier);
  }
  if (params.get('sort') === 'name') {
    state.sort = 'name';
    setPressed(sortButtons, (button) => button.dataset.sort === 'name');
    sortCards();
  }
  for (const id of (params.get('cat') ?? '').split(',').filter(Boolean)) {
    state.categories.add(id);
    setPressed(categoryChips, (chip) => state.categories.has(chip.dataset.filterCategory));
  }

  apply();

  // The only surface the agent tools touch. Reading from the cards keeps the
  // feature data in one place; filtering goes through apply() so the page the
  // user is looking at, and the URL, change with it.
  const readCard = (card, brief) => {
    const advice = card.querySelector('.advice__chip');
    const record = {
      id: card.id,
      name: card.querySelector('.card__title').textContent,
      tier: card.dataset.tier,
      recommendation: advice ? advice.textContent.trim() : null,
      since: card.dataset.date || null,
    };
    if (brief) return record;
    return {
      ...record,
      category: card.dataset.category,
      description: card.querySelector('.card__desc').textContent.trim(),
      syntax: [...card.querySelectorAll('.syntax code')].map((code) => code.textContent),
      support: Object.fromEntries(
        [...card.querySelectorAll('.support .chip')].map((chip) => [
          chip.querySelector('.chip__browser').textContent.toLowerCase(),
          chip.querySelector('.chip__version').textContent.replace('—', 'no'),
        ]),
      ),
      usage: card.querySelector('.usage__value strong')?.textContent ?? null,
      links: Object.fromEntries(
        [...card.querySelectorAll('.card__links a')].map((a) => [a.textContent, a.href]),
      ),
      demo: card.querySelector('[data-demo-open]') ? `${location.pathname}#${card.id}` : null,
    };
  };

  const byId = new Map(cards.map((card) => [card.id, card]));

  window.cssFeatures = {
    read: (id, { brief = false } = {}) => (byId.has(id) ? readCard(byId.get(id), brief) : null),
    search: ({ query = '', tier, category } = {}) => {
      const needle = query.trim().toLowerCase();
      return cards
        .filter(
          (card) =>
            (!tier || card.dataset.tier === tier) &&
            (!category || card.dataset.category === category) &&
            (!needle || card.dataset.search.includes(needle)),
        )
        .map((card) => card.id);
    },
    filter: ({ query, tier, categories, sort } = {}) => {
      state.query = (query ?? '').trim().toLowerCase();
      search.value = query ?? '';
      state.tier = tier ?? 'all';
      state.categories = new Set(categories ?? []);
      setPressed(tierButtons, (button) => button.dataset.filterTier === state.tier);
      setPressed(categoryChips, (chip) => state.categories.has(chip.dataset.filterCategory));
      if (sort && sort !== state.sort) {
        state.sort = sort;
        setPressed(sortButtons, (button) => button.dataset.sort === sort);
        sortCards();
      }
      apply();
      return { visible: cards.filter((card) => !card.hidden).length, total: cards.length };
    },
  };

  // Only browsers with the API pay for the tool definitions.
  if (document.modelContext ?? navigator.modelContext) import('./webmcp.js').catch(() => {});
})();
