(() => {
  const dialog = document.querySelector('.canyon-zoom');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const image = dialog.querySelector('img');
  const original = dialog.querySelector('.canyon-original');
  let trigger;
  document.querySelectorAll('[data-canyon-zoom]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      image.src = link.href;
      image.alt = link.querySelector('img').alt;
      original.href = link.href;
      dialog.showModal();
      dialog.scrollTop = 0;
    });
  });
  dialog.querySelector('.canyon-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { if (trigger) trigger.focus(); });
})();
