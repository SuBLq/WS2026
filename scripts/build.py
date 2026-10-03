"""Generate GitHub Pages HTML, catalogue and search from content + templates.

Run: python scripts/build.py. No packages or frontend toolchain required.
Existing public URLs are deliberately preserved.
"""
from pathlib import Path
from string import Template
from html import escape
from urllib.parse import urlsplit, unquote
import hashlib, json, re
from html_fragment import Node, Parser

ROOT=Path(__file__).resolve().parents[1]
PAGES=json.loads((ROOT/'content/pages.json').read_text(encoding='utf-8'))
CATALOG=json.loads((ROOT/'content/catalog.json').read_text(encoding='utf-8'))
ICONS={
    'pvp-objects':'fort','war-rules':'rally','combat-system':'arena','heroes':'heroes','hero-gear':'hero-gear',
    'hero-generations':'heroes','experts':'research','expert-generations':'research','arena-exploration':'arena',
    'lucky-wheel':'lucky-wheel','account-development':'furnace','shops-currencies':'shop','alliance-mobilization':'alliance',
    'bear-hunt':'bear-hunt','foundry':'fort','canyon-clash':'fort','crazy-joe':'mad-joe','ice-mine':'ice-mine',
    'snowbusters':'snowbusters','winter-siege':'fort','penguin-party':'ticket','wandering-theater':'ticket',
    'first-svs':'svs','furnace':'furnace','buildings':'construction','construction':'construction','research':'research'}

def write(path,text):
    p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text,encoding='utf-8')
def version(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()[:10]
def asset(path,root='.') :return root+'/'+path+'?v='+version(path)
def template(name,**kw):return Template((ROOT/'templates'/name).read_text(encoding='utf-8')).substitute(**kw)
def text(value):return escape(str(value),quote=True)
def pretty(name):
    name=name.capitalize().replace('Pvp','PvP').replace('Pve','PvE')
    name=re.sub(r'\bсвс\b','СвС',name,flags=re.I)
    name=re.sub(r'\bджо\b','Джо',name,flags=re.I).replace('Колесо фортуны','Колесо Фортуны')
    return name
def icon_for(page):
    key=Path(page['url']).stem
    if key=='index':key=Path(page['url']).parent.name
    if key=='experts' or key=='expert-generations':return 'assets/icons/experts-badge.webp'
    if key in {'winter-siege','penguin-party'}:return 'assets/icons/'+key+'-icon.webp'
    return 'assets/icons/game/'+ICONS.get(key,'heroes')+'.png'
def card(page,compact=False):
    return '<a class="guide-card" href="'+text(page['url'])+'"><img src="'+icon_for(page)+'" width="48" height="48" loading="lazy" alt=""><span><h3>'+text(pretty(page['name']))+'</h3><p>'+text(page['description'])+'</p></span><span class="card-arrow" aria-hidden="true">›</span></a>'

def prepare(page):
    tree=Parser((ROOT/'content'/page['url']).read_text(encoding='utf-8')).root
    main=next(tree.all('main'),None)
    if main:main.attrs['id']='mainContent'
    for n in tree.all():
        if n.tag=='img':
            src=n.attrs.get('src','');p=(ROOT/page['url']).parent/urlsplit(src).path
            if p.is_file():
                original=p.resolve().relative_to(ROOT).as_posix();variant=IMAGE_VARIANTS.get(original)
                if variant:
                    n.attrs['src']='../../'+variant['display'];p=ROOT/variant['display']
                    if variant.get('mobile'):
                        small=IMAGE_SIZES[variant['mobile']][0];large=IMAGE_SIZES[variant['display']][0]
                        n.attrs['srcset']='../../'+variant['mobile']+' '+str(small)+'w, ../../'+variant['display']+' '+str(large)+'w'
                        n.attrs['sizes']='(max-width: 620px) calc(100vw - 64px), 800px'
                # Dimensions read from the optimized asset metadata, no Pillow needed to build.
                metadata=IMAGE_SIZES.get(p.resolve().relative_to(ROOT).as_posix())
                if metadata:
                    n.attrs['width'],n.attrs['height']=map(str,metadata)
            n.attrs.setdefault('loading','lazy');n.attrs.setdefault('decoding','async')
        if n.tag in {'input','select'} and n.attrs.get('type')=='number':
            n.attrs.setdefault('inputmode','decimal' if n.attrs.get('step','1') not in {'1',''} else 'numeric')
        if n.has_class('field'):
            label=next((c for c in n.children if isinstance(c,Node) and c.has_class('label')),None)
            if label:
                for control in [*n.all('input'),*n.all('select')]:control.attrs.setdefault('aria-label',label.text().strip())
        if n.has_class('control'):
            label=next(n.all('b'),None)
            if label:
                for control in n.all('input'):control.attrs.setdefault('aria-label',label.text().strip())
        if n.has_class('result') or n.has_class('totals-card'):n.attrs['id']='calculationResult'
        if n.tag=='button':n.attrs.setdefault('type','button')
        if n.has_class('guide-toolbar'):n.children=[]
    if page['url']=='tools/construction/index.html':
        first=next((n for n in tree.all('section') if n.has_class('card')),None)
        if first:
            heading=next(first.all('h2'),None)
            if heading:heading.children=['1. Мои бонусы']
            grid=next((n for n in first.all() if n.has_class('grid2')),None)
            if grid:
                hyena=next((n for n in grid.children if isinstance(n,Node) and any(c.attrs.get('id')=='hyena' for c in n.all())),None)
                if hyena:grid.children.remove(hyena)
                tail=first.children[first.children.index(grid)+1:]
                first.children=first.children[:first.children.index(grid)+1]+[Node('details',{'class':'extra-bonuses'},[Node('summary',children=['Дополнительные бонусы']),Node('div',{'class':'extra-bonuses-body'},([hyena] if hyena else [])+tail)])]
        for n in tree.all():
            if n.has_class('version'):n.children=['Профиль сохраняется на устройстве']
    elif page['url']=='tools/research/index.html':
        profile=next((n for n in tree.all() if n.has_class('profile-card')),None)
        if profile:profile.children.append(Node('p',{'class':'autosave-note'},['Изменения профиля и плана сохраняются на устройстве автоматически.']))
        for n in tree.all('input'):
            if n.attrs.get('id')=='goalLevel':n.attrs['aria-label']='Целевой уровень технологии'
    if page['kind'] in {'guide','redirect'}:
        hero=next((n for n in tree.all() if n.has_class('guide-hero')),None)
        if hero:
            h1=next(hero.all('h1'),None)
            if h1 and page['kind']=='guide':h1.children=[text(pretty(page['name']))]
            hero.add_class('has-game-icon')
            hero.children.insert(0,Node('img',{'class':'guide-title-icon','src':'../../'+icon_for(page),'alt':'','width':'48','height':'48'}))
        article=next(tree.all('article'),None)
        if article:
            callout=next((n for n in article.all() if n.has_class('callout')),None)
            if callout:
                callout.add_class('guide-summary')
                callout.children.append(Node('button',{'type':'button','class':'text-button','data-copy-summary':None},['Скопировать совет']))
            headings=list(article.all('h2'))
            for i,h in enumerate(headings):h.attrs.setdefault('id','section-'+str(i+1))
            if not any(n.has_class('toc') for n in tree.all()) and headings:
                toc=Node('details',{'class':'toc'},[Node('summary',children=['Содержание']),Node('div',{'class':'toc-list'},[Node('a',{'href':'#'+h.attrs['id']},[text(h.text().strip())]) for h in headings])])
                if main:main.children.insert(main.children.index(article),toc)
        actions=Parser('<div class="guide-actions"><a class="action-link" href="../../index.html#guides">← Все гайды</a><button class="action-link" data-favorite type="button" aria-pressed="false">☆ В избранное</button><button class="action-link" data-offline-save type="button" aria-label="Сохранить гайд офлайн">↓ Офлайн</button></div>').root.children
        if main and hero in main.children:main.children[main.children.index(hero)+1:main.children.index(hero)+1]=actions
        if article and main:
            first=next((n for n in article.children if isinstance(n,Node)),None)
            if first and first.has_class('guide-summary'):
                article.children.remove(first);main.children.insert(main.children.index(hero)+2,first)
        tree.children.append(Node('a',{'class':'back-top','href':'#mainContent','id':'backTop','aria-label':'К началу статьи'},['↑']))
    return tree.html()

def homepage():
    by_url={p['url']:p for p in PAGES};ordered=[by_url[c['url']] for c in CATALOG]
    categories=[('Бой и герои','⚔','combat'),('Развитие','↗','development'),('События','◷','events'),('СвС','⚑','svs'),('Строительство','⌂','buildings')]
    tools=[p for p in ordered if p['kind']=='tool']
    blocks=[]
    for category,mark,key in categories:
        items=[p for p in ordered if p['category']==category]
        count=len(items);noun='материал' if count%10==1 and count%100!=11 else 'материала' if count%10 in {2,3,4} and count%100 not in {12,13,14} else 'материалов'
        blocks.append('<details class="catalog-group" id="category-'+key+'"><summary><span class="category-mark" aria-hidden="true">'+mark+'</span><span>'+category+'<small>'+str(count)+' '+noun+'</small></span><span class="group-arrow" aria-hidden="true">⌄</span></summary><div class="card-grid">'+''.join(card(p) for p in items)+'</div></details>')
    tool_cards=[]
    for p,label,subtitle in zip(tools,['Строительство','Технологии'],['Время, ресурсы и бонусы','Путь исследований до цели']):
        tool_cards.append('<a class="quick-tool" href="'+p['url']+'"><img src="'+icon_for(p)+'" width="46" height="46" alt=""><strong>'+label+'</strong><span>'+subtitle+'</span><b aria-hidden="true">↗</b></a>')
    return '''<main class="page home-page" id="mainContent">
<section class="home-hero"><div class="eyebrow">WHITEOUT SURVIVAL · SuBL</div><h1>Нужный гайд.<br><span>В нужный момент.</span></h1><p>Тактика, развитие и расчёты — под рукой.</p></section>
<button class="home-search" data-search-open type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 5 5"></path></svg><span>Что хотите найти?</span><small>Поиск по гайдам</small></button>
<section class="home-tools" id="tools"><div class="section-heading"><h2>Посчитать перед улучшением</h2><span>2 инструмента</span></div><div class="quick-tools">'''+''.join(tool_cards)+'''</div></section>
<section class="home-catalog" id="guides"><div class="section-heading"><h2>Гайды по игре</h2><button class="text-button" data-expand-catalog type="button" aria-expanded="false">Развернуть все</button></div>'''+''.join(blocks)+'''</section>
<section class="library" id="library"><div class="section-heading"><h2>Ваши материалы</h2></div><div class="library-tabs" role="group" aria-label="Материалы"><button type="button" data-library-tab="favorites" aria-pressed="true">Избранное</button><button type="button" data-library-tab="recent" aria-pressed="false">Недавние</button></div><div id="libraryList"><p class="library-empty">Сохраняйте гайды кнопкой «В избранное» в статье. Они появятся здесь.</p></div><noscript><p>Избранное и поиск работают при включённом JavaScript.</p></noscript></section>
<footer class="home-footer"><span>Справочник SuBL</span><p>Независимые руководства по Whiteout Survival</p></footer></main>'''

def page_html(page,content):
    root='../'*len(Path(page['url']).parent.parts);root=root.rstrip('/') or '.'
    css=['assets/css/shell.css','assets/css/content.css',*page.get('css',[]),'assets/css/interface.css']
    head='<script src="'+asset('assets/js/theme.js',root)+'"></script>\n'+'\n'.join('<link rel="stylesheet" href="'+asset(p,root)+'">' for p in css)
    scripts=['assets/js/search.js','assets/js/library.js','assets/js/tables.js','assets/js/offline.js','assets/js/app.js',*(['assets/js/calculator-math.js'] if page['kind']=='tool' else []),*page.get('js',[])]
    scripts='\n'.join('<script defer src="'+asset(p,root)+'"></script>' for p in scripts)
    extra=''
    if page['url']=='tools/research/index.html':extra='<button class="site-icon-btn" id="openHelp" type="button" aria-label="Открыть памятку">?</button><button class="site-icon-btn" id="saveProfile" type="button" aria-label="Сохранить профиль">✓</button>'
    attrs={**page.get('bodyAttrs',{}),'data-root':root+'/','data-page-kind':page['kind'],'data-page-url':page['url'],'data-search-index':asset('assets/js/search-index.js',root),'data-catalog':asset('assets/js/catalog-data.js',root)}
    nav={k:'' for k in ['home','guides','tools','library']};nav['home' if page['kind']=='home' else 'tools' if page['kind']=='tool' else 'guides']='aria-current="page"'
    return template('page.html',title=text(page['title']),description=text(page['description']),root=root,head=head,
        attrs=' '.join(k+'="'+text(v)+'"' for k,v in attrs.items()),header=template('header.html',root=root,extra=extra),content=content,
        navigation=template('navigation.html',root=root,**nav),search=template('search.html'),scripts=scripts)

if __name__=='__main__':
    IMAGE_SIZES=json.loads((ROOT/'content/image-sizes.json').read_text(encoding='utf-8')) if (ROOT/'content/image-sizes.json').exists() else {}
    IMAGE_VARIANTS=json.loads((ROOT/'content/image-variants.json').read_text(encoding='utf-8')) if (ROOT/'content/image-variants.json').exists() else {}
    search=[]
    for page in PAGES:
        tree=Parser((ROOT/'content'/page['url']).read_text(encoding='utf-8')).root
        if page['kind']!='redirect':search.append({'title':pretty(page['name']),'subtitle':page['description'],'category':page['category'],'url':page['url'],'icon':page['icon'],'text':re.sub(r'\s+',' ',tree.text()).strip()})
    write('assets/js/search-index.js','window.WOS_SEARCH_INDEX='+json.dumps(search,ensure_ascii=False,separators=(',',':'))+';\n')
    write('assets/js/catalog-data.js','window.WOS_CATALOG='+json.dumps([{'url':p['url'],'title':pretty(p['name']),'subtitle':p['description'],'icon':icon_for(p)} for p in PAGES if p['kind']!='redirect'],ensure_ascii=False,separators=(',',':'))+';\n')
    for page in PAGES:write(page['url'],page_html(page,prepare(page)))
    home={'url':'index.html','kind':'home','title':'Whiteout Survival · справочник SuBL','description':'Гайды по событиям, героям и развитию Whiteout Survival. Калькуляторы строительства и технологий, избранное и офлайн-материалы.'}
    write('index.html',page_html(home,homepage()))
    # Cache version follows actual generated files, so changes cannot keep a stale cache name.
    public=[ROOT/'index.html',*ROOT.glob('guides/**/*.html'),*ROOT.glob('tools/**/*.html'),*ROOT.glob('assets/**/*.js'),*ROOT.glob('assets/**/*.css'),*ROOT.glob('tools/**/*.js'),*ROOT.glob('tools/**/*.css')]
    digest=hashlib.sha256(b''.join(p.read_bytes() for p in sorted(public))).hexdigest()[:12]
    shell=['./','./index.html','./manifest.webmanifest','./assets/icons/favicon.svg','./assets/icons/icon-192.png','./assets/icons/icon-512.png']
    shell += ['./'+p.as_posix()+'?v='+version(p.as_posix()) for p in [Path('assets/css/shell.css'),Path('assets/css/content.css'),Path('assets/css/interface.css'),*[Path('assets/js')/n for n in ['theme.js','search.js','library.js','tables.js','offline.js','app.js','catalog-data.js']]]]
    worker=(ROOT/'templates/sw.js').read_text(encoding='utf-8').replace('__VERSION__',digest).replace('__SHELL__',json.dumps(shell))
    write('sw.js',worker)
    print('Built',len(PAGES)+1,'pages; indexed',len(search),'materials; cache',digest)
