(function () {
  'use strict';
  const mobile = matchMedia('(max-width: 620px)');
  function field(label, cell) {
    const item = document.createElement('div'); item.className = 'mobile-field';
    const name = document.createElement('span'); name.className = 'mobile-field-label'; name.textContent = label;
    const value = document.createElement('div'); value.className = 'mobile-field-value';
    if (cell) [...cell.childNodes].forEach(node => value.append(node.cloneNode(true))); else value.textContent = '—';
    item.append(name, value); return item;
  }
  function makeCard(headers, row) {
    const cells = [...row.cells], card = document.createElement('div'); card.className = 'mobile-data-card';
    const title = document.createElement('strong'); title.className = 'mobile-card-title'; title.textContent = cells[0]?.textContent.trim() || 'Данные'; card.append(title);
    const fields = document.createElement('div'); fields.className = 'mobile-card-fields';
    headers.slice(1).forEach((label, index) => fields.append(field(label, cells[index + 1]))); card.append(fields); return card;
  }
  function prepare(wrap) {
    if (wrap.dataset.tableReady) return;
    const table = wrap.querySelector('table'); if (!table || table.rows.length < 2) return;
    const headers = [...table.rows[0].cells].map(cell => cell.textContent.trim()), rows = [...table.rows].slice(1);
    wrap.dataset.tableReady = 'true'; wrap.tabIndex = 0; wrap.setAttribute('aria-label', 'Данные. Таблицу можно прокручивать по горизонтали.');
    const controls = document.createElement('div'); controls.className = 'table-controls';
    const mode = document.createElement('button'); mode.type = 'button'; mode.className = 'text-button'; mode.textContent = 'Карточками'; mode.setAttribute('aria-pressed', 'false');
    const output = document.createElement('div'); output.className = 'mobile-table-cards'; output.hidden = true;
    let rendered = false;
    if (document.body.dataset.guideKind === 'buildings' && rows.every(row => row.cells.length === headers.length)) {
      const label = document.createElement('label'); label.textContent = 'Уровень';
      const select = document.createElement('select'); select.setAttribute('aria-label', 'Уровень здания');
      rows.forEach((row, index) => { const option = document.createElement('option'); option.value = index; option.textContent = row.cells[0].textContent.trim(); select.append(option); });
      function renderLevel() { output.replaceChildren(makeCard(headers, rows[Number(select.value)])); }
      select.addEventListener('change', renderLevel); label.append(select); controls.append(label);
      wrap.classList.add('level-table', 'cards-mode'); output.hidden = false; renderLevel(); rendered = true;
      mode.textContent = 'Сравнить таблицей'; mode.setAttribute('aria-pressed', 'true');
    } else {
      const hint = document.createElement('span'); hint.className = 'table-hint'; hint.textContent = '↔ Сравните строки в таблице'; controls.append(hint);
    }
    mode.addEventListener('click', () => {
      const cards = !wrap.classList.contains('cards-mode');
      if (cards && !rendered) {
        rows.forEach(row => {
          if (row.cells.length === headers.length) output.append(makeCard(headers, row));
          else { const group = document.createElement('h3'); group.textContent = row.textContent.trim(); output.append(group); }
        }); rendered = true;
      }
      wrap.classList.toggle('cards-mode', cards); output.hidden = !cards;
      mode.textContent = cards ? 'Сравнить таблицей' : 'Карточками'; mode.setAttribute('aria-pressed', String(cards));
    });
    controls.append(mode); wrap.prepend(controls); wrap.append(output);
  }
  const wraps = [...document.querySelectorAll('.table-scroll')];
  function initialize() {
    if (!mobile.matches) return;
    for (const wrap of wraps) {
      const details = wrap.closest('details');
      if (details && !details.open) continue; prepare(wrap);
    }
  }
  document.querySelectorAll('details').forEach(details => details.addEventListener('toggle', () => { if (mobile.matches && details.open) details.querySelectorAll('.table-scroll').forEach(prepare); }));
  mobile.addEventListener('change', initialize); initialize();
})();
