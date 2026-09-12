(function(){
  const root=(document.body.dataset.root||'./');
  const ICON_DIR=root+'assets/icons/game/';
  const asset=name=>ICON_DIR+name;

  // One semantic pictogram per guide/tool. The icon layer is deliberately sparse:
  // homepage cards, guide title banners and cross-guide navigation only.
  const hrefRules=[
    [/arena-exploration\.html$/,'arena.png'],
    [/lucky-wheel\.html$/,'lucky-wheel.png'],
    [/pvp-objects\.html$/,'fort.png'],
    [/combat-system\.html$/,'arena.png'],
    [/hero-gear\.html$/,'hero-gear.png'],
    [/hero-generations\.html$/,'heroes.png'],
    [/heroes-gear\.html$/,'heroes.png'],
    [/\/heroes\.html$/,'heroes.png'],
    [/account-development\.html$/,'furnace.png'],
    [/shops-currencies\.html$/,'shop.png'],
    [/first-svs\.html$/,'svs.png'],
    [/crazy-joe\.html$/,'mad-joe.png'],
    [/ice-mine\.html$/,'ice-mine.png'],
    [/snowbusters\.html$/,'coal.png'],
    [/foundry\.html$/,'fort.png'],
    [/alliance-mobilization\.html$/,'alliance.png'],
    [/bear-hunt\.html$/,'rally.png'],
    [/wandering-theater\.html$/,'ticket.png'],
    [/furnace\.html$/,'furnace.png'],
    [/buildings\.html$/,'construction.png'],
    [/tools\/construction\/?(?:index\.html)?$/,'construction.png'],
    [/tools\/research\/?(?:index\.html)?$/,'research.png']
  ];

  function pathForHref(href){
    try{return new URL(href,location.href).pathname.toLowerCase()}catch(e){return (href||'').toLowerCase()}
  }
  function iconForHref(href){
    const p=pathForHref(href);
    for(const [re,icon] of hrefRules)if(re.test(p))return icon;
    return null;
  }

  function img(icon,cls){
    const el=document.createElement('img');
    el.src=asset(icon);el.alt='';el.setAttribute('aria-hidden','true');
    if(cls)el.className=cls;
    return el;
  }
  function shell(cls,icon){
    const el=document.createElement('span');
    el.className='game-icon-shell '+cls;
    el.setAttribute('aria-hidden','true');
    el.appendChild(img(icon));
    return el;
  }

  function stripLeadingEmoji(el){
    if(!el)return;
    try{el.textContent=el.textContent.replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u,'').trim()}catch(e){}
  }
  function stripLeadingEmojiDeep(el){
    if(!el)return;
    for(const node of el.childNodes){
      if(node.nodeType===Node.TEXT_NODE && node.textContent.trim()){
        try{node.textContent=node.textContent.replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u,'').replace(/^\s+/,'')}catch(e){}
        return;
      }
      if(node.nodeType===Node.ELEMENT_NODE && /^(B|STRONG|H3|SPAN)$/i.test(node.tagName)){
        stripLeadingEmoji(node);return;
      }
    }
  }

  // Homepage guide/tool cards.
  function decorateCards(scope=document){
    scope.querySelectorAll('a.guide-card[href]:not([data-game-icon-ready])').forEach(card=>{
      const icon=iconForHref(card.getAttribute('href'));
      card.dataset.gameIconReady='1';
      if(!icon)return;
      const num=card.querySelector('.num');
      const kicker=document.createElement('div');
      kicker.className='guide-card-kicker';
      kicker.appendChild(shell('guide-card-icon',icon));
      if(num){stripLeadingEmoji(num);num.parentNode.insertBefore(kicker,num);kicker.appendChild(num)}
      else card.insertBefore(kicker,card.firstChild);
      card.classList.add('has-game-icon');
    });
  }

  // One large pictogram in the guide title banner. No pictograms are injected into article body.
  function decorateHero(){
    const hero=document.querySelector('.guide-hero');
    if(!hero||hero.dataset.gameIconReady)return;
    hero.dataset.gameIconReady='1';
    const icon=iconForHref(location.pathname);
    if(!icon)return;
    hero.insertBefore(shell('guide-hero-icon',icon),hero.firstChild);
    hero.classList.add('has-game-icon');
  }

  // Cross-guide navigation cards/links only. Inline links inside prose are intentionally untouched.
  function decorateCrossGuideLinks(scope=document){
    const selector=[
      '.related a[href]',
      '.inline-links a[href]',
      'a.link-card[href]',
      'a.split-card[href]'
    ].join(',');
    scope.querySelectorAll(selector).forEach(a=>{
      if(a.dataset.gameIconReady)return;
      a.dataset.gameIconReady='1';
      const icon=iconForHref(a.getAttribute('href'));
      if(!icon)return;
      stripLeadingEmojiDeep(a);
      a.insertBefore(shell('cross-guide-game-icon',icon),a.firstChild);
      a.classList.add('has-game-icon','cross-guide-link');
    });
  }

  // Category emblems are part of the homepage navigation, not article text.
  function decorateCategories(){
    document.querySelectorAll('.category-head').forEach(head=>{
      const title=((head.querySelector('h2')||{}).textContent||'').toLowerCase();
      const box=head.querySelector('.category-icon');
      if(!box||box.dataset.gameIconReady)return;
      let icon=null;
      if(/основы игры/.test(title))icon='arena.png';
      else if(/события и режимы/.test(title))icon='ticket.png';
      else if(/строител/.test(title))icon='construction.png';
      else if(/развитие аккаунта/.test(title))icon='furnace.png';
      else if(/^свс$|мощь/.test(title))icon='svs.png';
      if(!icon)return;
      box.dataset.gameIconReady='1';box.textContent='';box.appendChild(img(icon));box.classList.add('game-category-icon');
    });
  }

  function loadCss(){
    if(document.querySelector('link[data-game-icons-css]'))return;
    const l=document.createElement('link');
    l.rel='stylesheet';l.href=root+'assets/css/game-icons.css?v=3';l.dataset.gameIconsCss='1';
    document.head.appendChild(l);
  }

  function init(){
    loadCss();
    decorateCards();
    decorateHero();
    decorateCrossGuideLinks();
    decorateCategories();
  }
  init();
})();
