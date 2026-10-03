(function () {
  'use strict';
  const key = 'wos-theme', media = matchMedia('(prefers-color-scheme: dark)');
  let explicit = false;
  function apply(theme, persist = false) {
    theme = theme === 'dark' ? 'dark' : 'light'; document.documentElement.dataset.theme = theme;
    if (persist) { explicit = true; try { localStorage.setItem(key, theme); } catch (_) {} }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#102331' : '#126d91';
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const label = theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему';
      button.setAttribute('aria-label', label); button.title = label;
      const icon = button.querySelector('.theme-icon'); if (icon) icon.textContent = theme === 'dark' ? '☀' : '◐';
    });
  }
  try {
    const query = new URLSearchParams(location.search).get('theme'), saved = localStorage.getItem(key);
    explicit = ['light', 'dark'].includes(query) || ['light', 'dark'].includes(saved);
    apply(['light', 'dark'].includes(query) ? query : ['light', 'dark'].includes(saved) ? saved : media.matches ? 'dark' : 'light');
  } catch (_) { apply(media.matches ? 'dark' : 'light'); }
  window.WOS = window.WOS || {}; window.WOS.theme = { apply, current: () => document.documentElement.dataset.theme };
  media.addEventListener('change', () => { if (!explicit) apply(media.matches ? 'dark' : 'light'); });
  addEventListener('storage', event => { if (event.key === key) { explicit = ['dark', 'light'].includes(event.newValue); apply(explicit ? event.newValue : media.matches ? 'dark' : 'light'); } });
})();
