const pluginData = {
  diamond: {
    title: 'ToxicDiamondFarm',
    version: 'V 2.0.0',
    description: 'A craftable, upgradeable diamond generator for Minecraft survival. Build it, improve it and unlock automated diamond production without losing the survival progression.',
    features: [
      'Four upgrade levels with persistent progress',
      'Level 4 produces one diamond every five minutes',
      'Attach a chest or barrel for generated diamonds',
      'Owner protection and saved levels across restarts',
      'Crafting recipe available to regular players'
    ]
  },
  skull: {
    title: 'ToxicSkullFactory',
    version: 'V 1.0.0',
    description: 'A Nether-inspired altar system with Soul Trap gameplay, mob handling and a way to collect drops and experience. Built and tested on a live survival server.',
    features: [
      'Nether-themed altar gameplay',
      'Soul Trap and mob system',
      'Loot and experience collection',
      'Eight-mob limit and block protection',
      'Tested with multiple players and server restarts'
    ]
  }
};
const nav = document.querySelector('#site-nav');
const menuToggle = document.querySelector('.menu-toggle');
menuToggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
}));
const dialog = document.querySelector('#plugin-dialog');
const closeDialog = () => dialog?.close();
document.querySelectorAll('[data-plugin]').forEach(button => {
  button.addEventListener('click', () => {
    const details = pluginData[button.dataset.plugin];
    if (!details || !dialog) return;
    document.querySelector('#dialog-title').textContent = details.title;
    document.querySelector('#dialog-description').textContent = details.description;
    document.querySelector('#dialog-version').textContent = details.version;
    const list = document.querySelector('#dialog-features');
    list.replaceChildren(...details.features.map(feature => {
      const li = document.createElement('li');
      li.textContent = feature;
      return li;
    }));
    dialog.showModal();
  });
});
document.querySelector('.dialog-close')?.addEventListener('click', closeDialog);
document.querySelector('.dialog-action')?.addEventListener('click', closeDialog);
dialog?.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
document.querySelector('#year').textContent = String(new Date().getFullYear());
