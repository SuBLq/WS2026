(function () {
  'use strict';
  window.WOS = window.WOS || {};
  const FAVORITES = 'wos-favorites-v1', RECENT = 'wos-recent-v1';
  function read(key) { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter(x => typeof x === 'string') : []; } catch (_) { return []; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  const url = document.body.dataset.pageUrl, favorite = document.querySelector('[data-favorite]');
  function updateFavorite() {
    if (!favorite) return; const active = read(FAVORITES).includes(url);
    favorite.setAttribute('aria-pressed', String(active)); favorite.textContent = active ? '★ В избранном' : '☆ В избранное';
  }
  if (favorite) { updateFavorite(); favorite.addEventListener('click', () => {
    const items = read(FAVORITES), active = items.includes(url);
    if (save(FAVORITES, active ? items.filter(item => item !== url) : [url, ...items])) updateFavorite();
    else window.WOS.notify?.('Не удалось сохранить избранное на этом устройстве.');
  }); }
  if (['guide', 'tool'].includes(document.body.dataset.pageKind)) save(RECENT, [url, ...read(RECENT).filter(item => item !== url)].slice(0, 12));
  const list = document.getElementById('libraryList'); let tab = 'favorites', loading;
  function load() {
    if (window.WOS_CATALOG) return Promise.resolve();
    if (!loading) loading = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = document.body.dataset.catalog;
      script.onload = resolve; script.onerror = () => { script.remove(); loading = null; reject(new Error('catalog')); }; document.head.append(script);
    }); return loading;
  }
  async function render() {
    if (!list) return; const urls = read(tab === 'favorites' ? FAVORITES : RECENT); list.replaceChildren();
    function empty(message) { const p = document.createElement('p'); p.className = 'library-empty'; p.textContent = message; list.replaceChildren(p); }
    if (!urls.length) { empty(tab === 'favorites' ? 'Сохраняйте гайды кнопкой «В избранное» в статье. Они появятся здесь.' : 'Здесь появятся гайды и расчёты, которые вы открывали.'); return; }
    try { await load(); } catch (_) { empty('Список материалов не загрузился. Повторите при подключении к сети.'); return; }
    const fragment = document.createDocumentFragment();
    for (const path of urls) {
      const item = window.WOS_CATALOG.find(value => value.url === path); if (!item) continue;
      const link = document.createElement('a'); link.className = 'library-item'; link.href = document.body.dataset.root + item.url;
      const image = document.createElement('img'); image.src = document.body.dataset.root + item.icon; image.alt = ''; image.width = image.height = 36; image.loading = 'lazy';
      const title = document.createElement('span'); title.textContent = item.title; link.append(image, title); fragment.append(link);
    }
    list.replaceChildren(fragment); if (!list.children.length) empty('Откройте гайд, чтобы добавить его в свой список.');
  }
  document.querySelectorAll('[data-library-tab]').forEach(button => button.addEventListener('click', () => {
    tab = button.dataset.libraryTab; document.querySelectorAll('[data-library-tab]').forEach(node => node.setAttribute('aria-pressed', String(node === button))); render();
  }));
  if (list) render(); addEventListener('storage', event => { if ([FAVORITES, RECENT].includes(event.key)) { updateFavorite(); render(); } });
})();
