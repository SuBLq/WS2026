(function () {
  'use strict';
  const fold = value => String(value || '').toLocaleLowerCase('ru').replace(/ё/g, 'е');
  const words = value => fold(value).match(/[a-zа-я0-9]+/g) || [];
  function stem(value) {
    if (!/^[а-я]{4,}$/.test(value)) return value;
    return value.replace(/(иями|ами|ями|ого|его|ому|ему|ыми|ими|иях|ах|ях|ия|ие|ий|ый|ой|ая|яя|ое|ее|ую|юю|ов|ев|ей|ом|ем|ам|ям|ь|а|я|ы|и|у|ю|е|о)$/u, '');
  }
  const aliases = {
    'bear-hunt': 'медведь медведя медвед bear охота ловушка',
    'crazy-joe': 'джо джой joe', 'first-svs': 'свс svs подготовка',
    'furnace': 'топка печь furnace', 'construction': 'стройка строительство здания калькулятор',
    'research': 'исследования исследование технологии научный центр калькулятор',
    'hero-gear': 'экипировка снаряжение шмот герои', 'ice-mine': 'рудник шахта орихалк'
  };
  function prepare(entry) {
    const path = entry.url.endsWith('/index.html') ? entry.url.split('/').at(-2) : entry.url.split('/').at(-1).replace('.html', '');
    return { entry, title: words(entry.title).map(stem), subtitle: words(entry.subtitle).map(stem), extra: words(aliases[path] || '').map(stem), body: words(entry.text).map(stem) };
  }
  const contains = (tokens, term) => tokens.some(token => token === term || term.length >= 3 && token.startsWith(term));
  function rank(entries, query) {
    const terms = [...new Set(words(query).map(stem))]; if (!terms.length) return [];
    return entries.map(value => {
      const item = value.entry ? value : prepare(value);
      if (!terms.every(term => contains([...item.title, ...item.subtitle, ...item.extra, ...item.body], term))) return null;
      const score = (fold(item.entry.title) === fold(query.trim()) ? 100 : 0) + terms.reduce((sum, term) => sum + (contains(item.title, term) ? 20 : contains(item.extra, term) ? 15 : contains(item.subtitle, term) ? 8 : 1), 0);
      return { entry: item.entry, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'ru')).slice(0, 20).map(item => item.entry);
  }
  window.WOS = window.WOS || {}; window.WOS.search = { rank, stem, prepare };
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('searchModal'); if (!modal) return;
  const input = document.getElementById('searchInput'), results = document.getElementById('searchResults'), status = document.getElementById('searchStatus');
  let loading, index, previousFocus, previousOverflow, inertElements = [];
  function load() {
    if (index) return Promise.resolve(index);
    if (!loading) loading = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = document.body.dataset.searchIndex;
      script.onload = () => { index = (window.WOS_SEARCH_INDEX || []).map(prepare); resolve(index); };
      script.onerror = () => { script.remove(); loading = null; reject(new Error('index')); }; document.head.append(script);
    }); return loading;
  }
  function render() {
    results.replaceChildren(); const query = input.value.trim();
    if (query.length < 2) { status.textContent = 'Введите название, героя или событие — минимум 2 символа.'; return; }
    const matches = rank(index || [], query);
    status.textContent = matches.length ? 'Найдено материалов: ' + matches.length : 'Ничего не найдено. Попробуйте другое название или откройте каталог гайдов.';
    for (const item of matches) {
      const link = document.createElement('a'); link.className = 'search-item'; link.href = document.body.dataset.root + item.url;
      const title = document.createElement('strong'); title.textContent = item.title;
      const category = document.createElement('small'); category.textContent = item.category;
      const description = document.createElement('p'); description.textContent = item.subtitle; link.append(title, category, description); results.append(link);
    }
    if (!matches.length) { const catalog = document.createElement('a'); catalog.className = 'action-link'; catalog.href = document.body.dataset.root + 'index.html#guides'; catalog.textContent = 'Открыть все гайды'; results.append(catalog); }
  }
  async function open() {
    if (!modal.hidden || document.querySelector('.help-backdrop.open,.drawer-backdrop.open')) return;
    previousFocus = document.activeElement; previousOverflow = document.body.style.overflow;
    modal.hidden = false; modal.classList.add('open'); document.body.style.overflow = 'hidden';
    inertElements = [...document.body.children].filter(node => node !== modal && !['SCRIPT', 'STYLE'].includes(node.tagName)).map(node => [node, node.inert]);
    inertElements.forEach(([node]) => { node.inert = true; }); input.focus(); status.textContent = index ? '' : 'Загружаем поиск…';
    try { await load(); if (!modal.hidden) render(); }
    catch (_) {
      status.textContent = 'Поиск пока недоступен. Подключитесь к сети и повторите попытку.';
      const button = document.createElement('button'); button.className = 'action-link'; button.type = 'button'; button.textContent = 'Повторить';
      button.onclick = async () => { results.replaceChildren(); status.textContent = 'Загружаем поиск…'; try { await load(); render(); } catch (_) { status.textContent = 'Нет соединения. Попробуйте открыть сохранённый материал.'; } }; results.replaceChildren(button);
    }
  }
  function close() {
    if (modal.hidden) return; modal.hidden = true; modal.classList.remove('open'); document.body.style.overflow = previousOverflow;
    inertElements.forEach(([node, value]) => { node.inert = value; }); inertElements = []; previousFocus?.focus();
  }
  document.querySelectorAll('[data-search-open]').forEach(button => button.addEventListener('click', open));
  document.querySelectorAll('[data-search-close]').forEach(button => button.addEventListener('click', close));
  input.addEventListener('input', () => { if (index) render(); }); modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); open(); }
    if (modal.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') {
      const focusable = [...modal.querySelectorAll('button, input, a[href]')].filter(node => !node.disabled), first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
