(() => {
  const tabs = [...document.querySelectorAll('[data-guide]')];
  const panels = [...document.querySelectorAll('[data-guide-panel]')];
  function show(id, focus=false) {
    if (!['diamond','skull'].includes(id)) return;
    tabs.forEach(t => {
      const active = t.dataset.guide === id;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
      if (active && focus) t.focus();
    });
    panels.forEach(p => {p.hidden = p.dataset.guidePanel !== id;});
  }
  tabs.forEach((tab,i) => {
    tab.addEventListener('click', () => {show(tab.dataset.guide); history.replaceState(null,'','#' + tab.dataset.guide);});
    tab.addEventListener('keydown', e => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length-1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click(); tabs[next].focus();
    });
  });
  const hash = location.hash.replace('#','');
  if (['diamond','skull'].includes(hash)) show(hash);
  addEventListener('hashchange', () => {const id=location.hash.replace('#','');if(['diamond','skull'].includes(id)) show(id);});
})();
