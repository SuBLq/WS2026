(function () {
  'use strict';
  const WOS = window.WOS;
  WOS.theme.apply(WOS.theme.current());
  document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => WOS.theme.apply(WOS.theme.current() === 'dark' ? 'light' : 'dark', true)));
  let toastTimer;
  WOS.notify = message => {
    let toast = document.getElementById('siteToast');
    if (!toast) { toast = document.createElement('div'); toast.id = 'siteToast'; toast.className = 'site-toast'; toast.setAttribute('role', 'status'); document.body.append(toast); }
    toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
  };
  const expand = document.querySelector('[data-expand-catalog]');
  function updateExpand() {
    if (!expand) return; const allOpen = [...document.querySelectorAll('.catalog-group')].every(group => group.open);
    expand.textContent = allOpen ? 'Свернуть все' : 'Развернуть все'; expand.setAttribute('aria-expanded', String(allOpen));
  }
  expand?.addEventListener('click', () => { const open = expand.getAttribute('aria-expanded') !== 'true'; document.querySelectorAll('.catalog-group').forEach(group => { group.open = open; }); updateExpand(); });
  document.querySelectorAll('.catalog-group').forEach(group => group.addEventListener('toggle', updateExpand));
  function updateNav() {
    if (document.body.dataset.pageKind !== 'home') return;
    const hash = location.hash, section = ['#guides', '#tools', '#library'].includes(hash) ? hash : '';
    document.querySelectorAll('.bottom-nav a').forEach(link => { if (new URL(link.href).hash === section) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    if (hash.startsWith('#category-')) { const group = document.getElementById(hash.slice(1)); if (group) group.open = true; }
  }
  updateNav(); addEventListener('hashchange', updateNav);
  function revealHash() {
    let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; } if (!id) return;
    const target = document.getElementById(id); if (!target) return; let parent = target.parentElement;
    while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  revealHash(); addEventListener('hashchange', revealHash);
  const top = document.getElementById('backTop');
  if (top) { const showTop = () => top.classList.toggle('show', scrollY > 700); addEventListener('scroll', showTop, { passive: true }); showTop(); }
  document.querySelectorAll('[data-copy-summary]').forEach(button => button.addEventListener('click', async () => {
    const summary = button.closest('.guide-summary'), text = [...summary.children].filter(node => node !== button).map(node => node.textContent.trim()).join('\n');
    try { await navigator.clipboard.writeText(text + '\n' + location.href.split('#')[0]); WOS.notify('Совет скопирован'); }
    catch (_) { WOS.notify('Копирование недоступно. Можно выделить текст совета вручную.'); }
  }));
  const result = document.getElementById('calculationResult'), total = document.getElementById('totalReal') || document.getElementById('totalTime');
  if (result && total) {
    const dock = document.createElement('button'); dock.type = 'button'; dock.className = 'calc-dock';
    const value = document.createElement('strong'), label = document.createElement('span'); label.textContent = 'К результату ↓'; dock.append(value, label); document.body.append(dock);
    let visible = false;
    const update = () => { value.textContent = 'Итого: ' + total.textContent; dock.hidden = visible || ['—', '0 мин'].includes(total.textContent.trim()); };
    new MutationObserver(update).observe(total, { childList: true, characterData: true, subtree: true });
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }, { threshold: 0.2 }).observe(result);
    dock.addEventListener('click', () => { result.scrollIntoView({ block: 'start' }); result.tabIndex = -1; result.focus({ preventScroll: true }); }); update();
  }
  // Research dialogs share the keyboard behavior of the search dialog.
  for (const backdrop of document.querySelectorAll('.help-backdrop,.drawer-backdrop')) {
    let previous, siblings = [], opened = false;
    const dialog = backdrop.querySelector('[role="dialog"]'); if (!dialog) continue;
    const focusable = () => [...dialog.querySelectorAll('button,input,select,a[href]')].filter(node => !node.disabled && node.getClientRects().length);
    new MutationObserver(() => {
      const active = backdrop.classList.contains('open'); if (active === opened) return; opened = active;
      if (active) {
        previous = document.activeElement;
        siblings = [...document.body.children].filter(node => node !== backdrop && !['SCRIPT','STYLE'].includes(node.tagName)).map(node => [node,node.inert]);
        siblings.forEach(([node]) => { node.inert = true; }); (focusable()[0] || dialog).focus();
      } else { siblings.forEach(([node,state]) => { node.inert = state; }); previous?.focus(); }
    }).observe(backdrop, { attributes: true, attributeFilter: ['class'] });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return; const nodes = focusable(), first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  }
})();
