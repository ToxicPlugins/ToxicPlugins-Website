(() => {
  const btn = document.querySelector('[data-watch]');
  if (btn && window.ToxicWishlist) {
    const update = () => {
      const saved = window.ToxicWishlist.get().includes(btn.dataset.watch);
      btn.setAttribute('aria-pressed', String(saved));
      btn.textContent = saved ? '★ SAVED TO WATCHLIST' : '☆ SAVE TO WATCHLIST';
    };
    btn.addEventListener('click', () => { window.ToxicWishlist.toggle(btn.dataset.watch); update(); });
    update();
  }

  const gallery = document.querySelector('[data-product-gallery]');
  if (!gallery) return;
  const items = Array.from(gallery.querySelectorAll('[data-gallery-item]'));
  const image = gallery.querySelector('[data-gallery-main]');
  const frame = gallery.querySelector('.gallery-image-frame');
  const count = gallery.querySelector('[data-gallery-count]');
  const number = gallery.querySelector('[data-gallery-placeholder-index]');
  const placeholderTitle = gallery.querySelector('[data-gallery-placeholder-title]');
  const caption = gallery.querySelector('[data-gallery-caption]');
  const description = gallery.querySelector('[data-gallery-description]');
  const enlarge = gallery.querySelector('[data-gallery-enlarge]');
  const dialog = gallery.querySelector('[data-gallery-dialog]');
  const dialogImage = gallery.querySelector('[data-gallery-dialog-image]');
  const dialogCaption = gallery.querySelector('[data-gallery-dialog-caption]');
  let selection = 0;
  let requestId = 0;

  function choose(index) {
    selection = (index + items.length) % items.length;
    const item = items[selection];
    const label = item.dataset.title;
    const src = item.dataset.src;
    const id = ++requestId;
    items.forEach((button, i) => {
      const active = i === selection;
      button.classList.toggle('is-current', active);
      button.setAttribute('aria-pressed', String(active));
    });
    count.textContent = `${String(selection + 1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;
    number.textContent = String(selection + 1).padStart(2,'0');
    caption.textContent = label;
    placeholderTitle.textContent = label;
    description.textContent = item.dataset.description;
    frame.classList.remove('has-image');
    enlarge.hidden = true;
    image.removeAttribute('src');
    image.alt = `${gallery.dataset.productName}: ${label}`;
    const preloader = new Image();
    preloader.onload = () => {
      if (id !== requestId) return;
      image.src = src;
      frame.classList.add('has-image');
      enlarge.hidden = false;
    };
    preloader.onerror = () => {
      if (id !== requestId) return;
      frame.classList.remove('has-image');
      enlarge.hidden = true;
    };
    preloader.src = src;
  }
  items.forEach((button, i) => button.addEventListener('click', () => choose(i)));
  enlarge.addEventListener('click', () => {
    if (!frame.classList.contains('has-image')) return;
    dialogImage.src = image.src;
    dialogImage.alt = image.alt;
    dialogCaption.textContent = caption.textContent;
    if (typeof dialog.showModal === 'function') dialog.showModal();
  });
  gallery.querySelector('[data-gallery-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  choose(0);
})();
