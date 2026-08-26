
(function(){
  const modal=document.getElementById('searchModal');
  const input=document.getElementById('searchInput');
  const results=document.getElementById('searchResults');
  const root=(document.body.dataset.root||'./');
  const THEME_KEY='wos-theme';
  function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
  function applyTheme(theme,persist=true){
    theme=theme==='dark'?'dark':'light';
    document.documentElement.dataset.theme=theme;
    if(persist){try{localStorage.setItem(THEME_KEY,theme)}catch(e){}}
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme==='dark'?'#06192b':'#0f5f8f');
    document.querySelectorAll('[data-theme-toggle]').forEach(btn=>{
      const icon=btn.querySelector('.theme-icon');if(icon)icon.textContent=theme==='dark'?'☀️':'🌙';
      const label=btn.querySelector('.theme-label');if(label)label.textContent=theme==='dark'?'Светлая':'Тёмная';
      btn.setAttribute('aria-label',theme==='dark'?'Включить светлую тему':'Включить тёмную тему');
      btn.title=theme==='dark'?'Светлая тема':'Тёмная тема';
    });
  }
  function installThemeToggle(){
    const actions=document.querySelector('.site-top-actions');if(!actions)return;
    if(!actions.querySelector('[data-theme-toggle]')){
      const btn=document.createElement('button');btn.type='button';btn.className='site-icon-btn theme-toggle';btn.dataset.themeToggle='';
      btn.innerHTML='<span class="theme-icon">🌙</span><span class="theme-label">Тёмная</span>';
      actions.prepend(btn);
    }
    actions.querySelectorAll('[data-theme-toggle]').forEach(btn=>btn.addEventListener('click',()=>applyTheme(currentTheme()==='dark'?'light':'dark')));
    applyTheme(currentTheme(),false);
  }
  installThemeToggle();
  function norm(s){return (s||'').toLowerCase().replace(/ё/g,'е')}
  function snippet(text,term){
    const t=norm(text),q=norm(term);let i=t.indexOf(q); if(i<0)i=0;
    let a=Math.max(0,i-80),b=Math.min(text.length,i+180);
    return (a?'…':'')+text.slice(a,b)+(b<text.length?'…':'');
  }
  function render(q){
    if(!results)return; q=q.trim();
    if(q.length<2){results.innerHTML='<div class="search-empty">Введите минимум 2 символа.</div>';return}
    const terms=norm(q).split(/\s+/).filter(Boolean);
    const data=(window.WOS_SEARCH_INDEX||[]).filter(x=>{const h=norm(x.title+' '+x.subtitle+' '+x.text);return terms.every(t=>h.includes(t))}).slice(0,20);
    if(!data.length){results.innerHTML='<div class="search-empty">Ничего не найдено.</div>';return}
    results.innerHTML=data.map(x=>`<a class="search-item" href="${root}${x.url}"><strong>${x.icon||'📄'} ${x.title}</strong><small>${x.category}</small><p>${snippet(x.text,q).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</p></a>`).join('');
  }
  function openSearch(q=''){
    if(!modal)return;modal.classList.add('open');document.body.style.overflow='hidden';
    setTimeout(()=>{input.focus(); if(q){input.value=q;render(q)}},40);
  }
  function closeSearch(){if(!modal)return;modal.classList.remove('open');document.body.style.overflow='';}
  document.querySelectorAll('[data-search-open]').forEach(b=>b.addEventListener('click',()=>openSearch()));
  document.querySelectorAll('[data-search-close]').forEach(b=>b.addEventListener('click',closeSearch));
  if(input)input.addEventListener('input',()=>render(input.value));
  if(modal)modal.addEventListener('click',e=>{if(e.target===modal)closeSearch()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch(); if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}});
  const homeInput=document.getElementById('homeSearch');
  if(homeInput){homeInput.addEventListener('focus',()=>{openSearch(homeInput.value);homeInput.blur()});homeInput.addEventListener('click',()=>openSearch())}
  const top=document.getElementById('backTop');
  if(top){window.addEventListener('scroll',()=>top.classList.toggle('show',window.scrollY>700));}


  function prepareResponsiveTables(){
    const buildingGuide=document.body.dataset.guideKind==='buildings';
    document.querySelectorAll('.table-scroll').forEach(wrap=>{
      const table=wrap.querySelector('table'); if(!table)return;
      const rows=Array.from(table.querySelectorAll('tr')); if(rows.length<2)return;
      const headers=Array.from(rows[0].querySelectorAll('th,td')).map(c=>c.textContent.trim());
      if(headers.length<=3)return; // narrow tables stay real tables
      const isFurnaceGuide=/топка/i.test((document.querySelector('.guide-hero h1')||{}).textContent||'');
      const bodyRows=rows.slice(1).filter(r=>r.querySelectorAll('td,th').length);
      if(!bodyRows.length)return;
      wrap.classList.add('mobile-cardized');
      const container=document.createElement('div');
      container.className=buildingGuide?'mobile-building-cards':'mobile-table-cards';
      bodyRows.forEach((row,idx)=>{
        const cells=Array.from(row.querySelectorAll('td,th')).map(c=>c.textContent.trim());
        if(buildingGuide){
          const details=document.createElement('details');details.className='mobile-building-card';
          const summary=document.createElement('summary');
          const level=document.createElement('span');level.className='level';
          const firstHeader=(headers[0]||'').toLowerCase();
          const prefix=firstHeader.includes('ур.')?'Уровень ':(firstHeader.includes('цель')?(isFurnaceGuide?'Топка ':'Цель '):'');
          level.textContent=prefix+(cells[0]||('Строка '+(idx+1)));
          const timeIndex=headers.findIndex(h=>/время|таймер/i.test(h));
          const qt=document.createElement('span');qt.className='quick-time';qt.textContent=timeIndex>=0?(cells[timeIndex]||''):'';
          summary.append(level,qt);details.appendChild(summary);
          details.appendChild(makeFields(headers,cells,[0]));
          container.appendChild(details);
        }else{
          const card=document.createElement('div');card.className='mobile-data-card';
          const title=document.createElement('div');title.className='mobile-card-title';
          const heroIdx=headers.findIndex(h=>/герой/i.test(h));
          const nameIdx=heroIdx>=0?heroIdx:0;
          title.textContent=cells[nameIdx]||cells[0]||('Строка '+(idx+1));card.appendChild(title);
          if(heroIdx>0&&cells[0]){const sub=document.createElement('div');sub.className='mobile-card-subtitle';sub.textContent=cells[0];card.appendChild(sub)}
          card.appendChild(makeFields(headers,cells,[nameIdx,...(heroIdx>0?[0]:[])]));
          container.appendChild(card);
        }
      });
      wrap.appendChild(container);
    });
  }
  function makeFields(headers,cells,skip){
    const box=document.createElement('div');box.className='mobile-card-fields';
    headers.forEach((h,i)=>{
      if(skip.includes(i))return;
      const row=document.createElement('div');row.className='mobile-field';
      const l=document.createElement('div');l.className='mobile-field-label';l.textContent=h||('Поле '+(i+1));
      const v=document.createElement('div');v.className='mobile-field-value';v.textContent=cells[i]||'—';
      row.append(l,v);box.appendChild(row);
    });
    return box;
  }
  prepareResponsiveTables();

})();
