(() => {
  const search = document.querySelector('#plugin-search');
  const filters = [...document.querySelectorAll('[data-filter]')];
  let cards = [...document.querySelectorAll('[data-product-card]')];
  const empty = document.querySelector('#catalog-empty');
  const emptyTitle = document.querySelector('#empty-title');
  const emptyDescription = document.querySelector('#empty-description');
  const count = document.querySelector('#catalog-count');
  let mode = 'all';
  const refreshSaved = () => {
    document.querySelectorAll('[data-save]').forEach(btn => {
      const saved = window.ToxicWishlist.get().includes(btn.dataset.save);
      btn.setAttribute('aria-pressed', String(saved));
      btn.textContent = saved ? '★ SAVED' : '☆ SAVE';
    });
  };
  const update = () => {
    const needle = search.value.trim().toLowerCase();
    let total = 0;
    const saved = window.ToxicWishlist.get();
    cards = [...document.querySelectorAll('[data-product-card]')];
    cards.forEach(card => {
      const matchSearch = !needle || `${card.dataset.title} ${card.dataset.keywords}`.includes(needle);
      const matchTier = mode === 'all' || (mode === 'saved' ? saved.includes(card.querySelector('[data-save]').dataset.save) : card.dataset.tier === mode);
      const visible = matchSearch && matchTier && card.dataset.hiddenByAdmin !== '1';
      card.hidden = !visible;
      if (visible) total++;
    });
    count.textContent = `${String(total).padStart(2,'0')} ${total === 1 ? 'PROJECT' : 'PROJECTS'}`;
    empty.hidden = total > 0;
    if (!total) {
      emptyTitle.textContent = needle ? 'NO MATCHING PLUGINS.' : mode === 'saved' ? 'YOUR WATCHLIST IS EMPTY.' : mode === 'free' ? 'NO FREE PLUGINS MATCH.' : mode === 'premium' ? 'NO PREMIUM PLUGINS MATCH.' : 'NOTHING HERE YET.';
      emptyDescription.textContent = needle ? 'Try a different plugin name or feature.' : mode === 'saved' ? 'Save a plugin to keep it here in this browser.' : mode === 'free' || mode === 'premium' ? 'No plugins in this category match the current filters.' : 'New builds will be listed here.';
    }
  };
  search?.addEventListener('input', update);
  filters.forEach(btn => btn.addEventListener('click', () => {
    mode = btn.dataset.filter;
    filters.forEach(b => { const on = b === btn; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); });
    update();
  }));
  document.querySelectorAll('[data-save]').forEach(btn => btn.addEventListener('click', () => {window.ToxicWishlist.toggle(btn.dataset.save); refreshSaved(); update();}));
  document.querySelector('#reset-filters')?.addEventListener('click', () => {
    search.value = '';
    filters[0].click();
  });
  window.addEventListener('toxic:catalog-updated',()=>{refreshSaved();update()});
  refreshSaved();update();
})();
