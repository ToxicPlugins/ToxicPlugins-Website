(() => {
  const nav = document.querySelector('#site-nav');
  const toggle = document.querySelector('.menu-toggle');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));
  document.querySelector('#year').textContent = String(new Date().getFullYear());
  const key = 'toxicplugins_saved_preview_v2';
  window.ToxicWishlist = {
    get() { try { const data = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(data) ? data.filter(v => ['diamond','skull'].includes(v)) : []; } catch { return []; } },
    toggle(id) { const list = this.get(); const next = list.includes(id) ? list.filter(v => v !== id) : [...list,id]; try { localStorage.setItem(key, JSON.stringify(next)); } catch {} return next.includes(id); }
  };
})();
