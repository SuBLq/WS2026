(function(){
  const root=(document.body.dataset.root||'./');
  const ICON_DIR=root+'assets/icons/game/';
  const norm=s=>(s||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
  const asset=name=>ICON_DIR+name;

  const hrefRules=[
    [/arena-exploration\.html$/,'arena.png'],
    [/lucky-wheel\.html$/,'lucky-wheel.png'],
    [/pvp-objects\.html$/,'fort.png'],
    [/combat-system\.html$/,'rally.png'],
    [/hero-gear\.html$/,'hero-gear.png'],
    [/hero-generations\.html$/,'heroes.png'],
    [/\/heroes\.html$/,'heroes.png'],
    [/account-development\.html$/,'furnace.png'],
    [/shops-currencies\.html$/,'shop.png'],
    [/first-svs\.html$/,'svs.png'],
    [/crazy-joe\.html$/,'mad-joe.png'],
    [/ice-mine\.html$/,'ice-mine.png'],
    [/foundry\.html$/,'fort.png'],
    [/alliance-mobilization\.html$/,'alliance.png'],
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

  function iconForText(raw){
    const t=norm(raw);
    const page=location.pathname.toLowerCase();
    if(!t)return null;

    // Highly specific equipment and hero systems first.
    if(/снаряжени[ея] губернатор|экипировк[аи] губернатор/.test(t))return 'governor-gear.png';
    if(/снаряжени[ея] геро|экипировк[аи] геро/.test(t))return 'hero-gear.png';
    if(/мифическ.*руководств.*освоен|книг.*освоен|навык.*освоен/.test(t))return 'mastery-book.png';
    if(/мифическ.*инструктаж.*экспедиц|книг.*экспедиц|навык.*экспедиц/.test(t))return 'expedition-book.png';
    if(/универсальн.*фрагмент|мифическ.*фрагмент/.test(t))return 'universal-fragment.png';
    if(/фрагмент.*геро/.test(t))return 'hero-fragment.png';
    if(/талисман/.test(t))return 'talisman.png';
    if(/мифрил/.test(t))return 'mithril.png';

    // Troop stats.
    if(/смертонос/.test(t))return 'lethality.png';
    if(/здоров.*войск|здоровье/.test(t))return 'health.png';
    if(/защит.*войск/.test(t))return 'defense.png';
    if(/атак.*войск/.test(t))return 'attack.png';

    // Events and combat mechanics.
    if(/мощь государств|\bсвс\b|svs/.test(t))return 'svs.png';
    if(/президент|мобилизац.*скорост|навык.*президент/.test(t))return 'president.png';
    if(/безумн.*джо|\bджо\b/.test(t))return 'mad-joe.png';
    if(/арен/.test(t))return 'arena.png';
    if(/освоени/.test(t)&&page.includes('arena-exploration'))return 'arena.png';
    if(/ралли|совместн.*атак|сбор.*атак/.test(t))return 'rally.png';
    if(/развед/.test(t))return 'scout.png';
    if(/форт|крепост|объект/.test(t))return 'fort.png';
    if(/альянс/.test(t)&&!/магазин/.test(t))return 'alliance.png';
    if(/гарнизон/.test(t))return 'fort.png';
    if(/бесконечн.*испыт/.test(t))return 'endless-trial.png';

    // Economy and development.
    if(/колес.*фортун/.test(t))return 'lucky-wheel.png';
    if(/магазин|валют|покупк|донат/.test(t))return 'shop.png';
    if(/огненн.*кристал/.test(t))return 'fire-crystal.png';
    if(/питомц/.test(t)){
      if(/книг|навык/.test(t))return 'pet-book.png';
      if(/зель|сыворот|раствор/.test(t))return 'pet-potion.png';
      if(/шприц|инъекц/.test(t))return 'pet-syringe.png';
      return 'pet-chest.png';
    }
    if(/топк|печь/.test(t))return 'furnace.png';
    if(/исследован|технолог/.test(t))return 'research.png';
    if(/строител|здани/.test(t))return 'construction.png';
    if(/трениров|найм.*войск/.test(t))return 'training.png';
    if(/лечен|госпитал/.test(t))return 'healing.png';
    if(/перенос|миграц/.test(t))return 'transfer-pass.png';
    if(/случайн.*телепорт/.test(t))return 'teleport-random.png';
    if(/альянс.*телепорт/.test(t))return 'teleport-alliance.png';
    if(/телепорт/.test(t))return 'teleport-advanced.png';
    if(/щит/.test(t))return 'peace-shield.png';
    if(/ори?халк|рудник|прорыв жил|вулкан/.test(t))return 'ice-mine.png';
    if(/ресурс/.test(t))return 'resource-chest.png';
    if(/еда|мяс/.test(t))return 'food.png';
    if(/дерев|бревн/.test(t))return 'wood.png';
    if(/угол|уголь/.test(t))return 'coal.png';
    if(/желез/.test(t))return 'iron.png';
    if(/вынослив/.test(t))return 'energy.png';
    if(/геро/.test(t))return 'heroes.png';
    return null;
  }

  function img(icon,cls){
    const el=document.createElement('img');
    el.src=asset(icon);el.alt='';el.setAttribute('aria-hidden','true');
    if(cls)el.className=cls;
    return el;
  }
  function shell(cls,icon){
    const el=document.createElement('span');el.className='game-icon-shell '+cls;el.setAttribute('aria-hidden','true');el.appendChild(img(icon));return el;
  }
  function stripLeadingEmoji(el){
    if(!el)return;
    try{el.textContent=el.textContent.replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u,'').trim()}catch(e){}
  }

  function decorateCards(scope=document){
    scope.querySelectorAll('a.guide-card[href]:not([data-game-icon-ready])').forEach(card=>{
      const icon=iconForHref(card.getAttribute('href'));
      card.dataset.gameIconReady='1';
      if(!icon)return;
      const num=card.querySelector('.num');
      const kicker=document.createElement('div');kicker.className='guide-card-kicker';
      kicker.appendChild(shell('guide-card-icon',icon));
      if(num){stripLeadingEmoji(num);num.parentNode.insertBefore(kicker,num);kicker.appendChild(num)}
      else card.insertBefore(kicker,card.firstChild);
      card.classList.add('has-game-icon');
    });
  }

  function decorateHero(){
    const hero=document.querySelector('.guide-hero');if(!hero||hero.dataset.gameIconReady)return;
    hero.dataset.gameIconReady='1';
    const icon=iconForHref(location.pathname);
    if(!icon)return;
    hero.appendChild(shell('guide-hero-icon',icon));hero.classList.add('has-game-icon');
  }

  function decorateHeadings(){
    document.querySelectorAll('.article h2:not([data-game-icon-ready])').forEach(h=>{
      h.dataset.gameIconReady='1';const icon=iconForText(h.textContent);if(!icon)return;
      h.insertBefore(shell('game-heading-icon',icon),h.firstChild);h.classList.add('game-heading');
    });
  }

  function decorateLabels(){
    const selectors=[
      '.callout > strong','.mine-note > strong','.account-note > strong',
      '.resource-head > h3','.svs-side-card > b','.result-card > strong',
      '.money-card > b','.balance-card > b','.teleport-card > strong',
      '.mine-card > strong','.wave-series > strong','.mine-whale-card > h3'
    ].join(',');
    document.querySelectorAll(selectors).forEach(el=>{
      if(el.dataset.gameIconReady)return;el.dataset.gameIconReady='1';
      const icon=iconForText(el.textContent);if(!icon)return;
      const mark=document.createElement('span');mark.className='game-label-icon';mark.setAttribute('aria-hidden','true');mark.appendChild(img(icon));
      el.insertBefore(mark,el.firstChild);el.classList.add('has-game-label');
    });
  }

  function decorateRelated(scope=document){
    scope.querySelectorAll('.related a[href]:not([data-game-icon-ready])').forEach(a=>{
      a.dataset.gameIconReady='1';const icon=iconForHref(a.getAttribute('href'));if(!icon)return;
      stripLeadingEmoji(a);a.insertBefore(shell('related-game-icon',icon),a.firstChild);a.classList.add('has-game-icon');
    });
  }

  function decorateSearch(){
    const box=document.getElementById('searchResults');if(!box)return;
    box.querySelectorAll('a.search-item[href]:not([data-game-icon-ready])').forEach(a=>{
      a.dataset.gameIconReady='1';const icon=iconForHref(a.getAttribute('href'));if(!icon)return;
      const strong=a.querySelector('strong');stripLeadingEmoji(strong);
      a.insertBefore(img(icon,'search-result-game-icon'),a.firstChild);a.classList.add('has-game-icon');
    });
  }

  function decorateCategories(){
    document.querySelectorAll('.category-head').forEach(head=>{
      const title=norm((head.querySelector('h2')||{}).textContent||'');
      const box=head.querySelector('.category-icon');if(!box||box.dataset.gameIconReady)return;
      let icon=null;
      if(/развитие аккаунта/.test(title))icon='furnace.png';
      else if(/^свс$|мощь/.test(title))icon='svs.png';
      else if(/строитель/.test(title))icon='construction.png';
      else if(/бой и герои/.test(title))icon='heroes.png';
      if(!icon)return;
      box.dataset.gameIconReady='1';box.textContent='';box.appendChild(img(icon));box.classList.add('game-category-icon');
    });
  }

  function loadCss(){
    if(document.querySelector('link[data-game-icons-css]'))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href=root+'assets/css/game-icons.css?v=1';l.dataset.gameIconsCss='1';document.head.appendChild(l);
  }

  function init(){
    loadCss();decorateCards();decorateHero();decorateHeadings();decorateLabels();decorateRelated();decorateCategories();decorateSearch();
    const search=document.getElementById('searchResults');
    if(search)new MutationObserver(()=>decorateSearch()).observe(search,{childList:true,subtree:true});
  }
  init();
})();
