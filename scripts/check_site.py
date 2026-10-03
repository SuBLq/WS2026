"""Check generated pages before publication: links, fragments, images and versions."""
from pathlib import Path
from urllib.parse import urlsplit,unquote
from html.parser import HTMLParser
from collections import Counter
import re,json,sys
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self,path):
        super().__init__();self.refs=[];self.ids=[];self.images=[];self.styles=[];self.h1=0;self.mains=0;self.inline=0;self.feed(path.read_text(encoding='utf-8'))
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.append(a['id'])
        if tag=='h1':self.h1+=1
        if tag=='main':self.mains+=1
        if tag=='style':self.inline+=1
        for key in ['src','href']:
            if a.get(key):self.refs.append(a[key])
        if a.get('srcset'):self.refs.extend(part.strip().split()[0] for part in a['srcset'].split(','))
        if tag=='img' and a.get('src'):self.images.append(a)
        if tag=='link' and a.get('rel')=='stylesheet':self.styles.append(a['href'])
paths=[ROOT/'index.html',*ROOT.glob('guides/**/*.html'),*ROOT.glob('tools/**/index.html')]
pages={p.resolve():Page(p) for p in paths};errors=[]
for path,page in pages.items():
    name=path.relative_to(ROOT).as_posix()
    if page.h1!=1 or page.mains!=1:errors.append(f'{name}: expected one h1 and main')
    if page.inline:errors.append(f'{name}: inline stylesheet')
    if len(page.styles)!=len(set(urlsplit(s).path for s in page.styles)):errors.append(f'{name}: duplicate stylesheet')
    for id,n in Counter(page.ids).items():
        if n>1:errors.append(f'{name}: duplicate id {id}')
    for ref in page.refs:
        u=urlsplit(ref)
        if u.scheme or u.netloc:continue
        target=(ROOT/unquote(u.path.lstrip('/')) if u.path.startswith('/') else path.parent/unquote(u.path)).resolve() if u.path else path
        if target.is_dir():target/= 'index.html'
        if not target.is_file():errors.append(f'{name}: missing {ref}')
        elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:errors.append(f'{name}: missing anchor {ref}')
        if u.query.startswith('v=') and target.is_file():
            import hashlib
            if u.query!='v='+hashlib.sha256(target.read_bytes()).hexdigest()[:10]:errors.append(f'{name}: stale asset version {ref}')
    for image in page.images:
        if not image.get('width') or not image.get('height'):errors.append(f'{name}: dimensions missing {image["src"]}')
        if 'alt' not in image:errors.append(f'{name}: image alt missing')
index=json.loads((ROOT/'assets/js/search-index.js').read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
for url in ['tools/construction/index.html','tools/research/index.html']:
    if not any(item['url']==url for item in index):errors.append('Search missing '+url)
sw=(ROOT/'sw.js').read_text(encoding='utf-8');shell=json.loads(re.search(r'const SHELL = (.*);',sw).group(1))
shell_bytes=0
for ref in shell:
    target=ROOT/urlsplit(ref).path
    if target.is_dir():target/='index.html'
    if not target.is_file():errors.append('Precache missing '+ref)
    else:shell_bytes+=target.stat().st_size
print(f'Checked {len(pages)} pages; {len(index)} search entries; shell: {len(shell)} addresses, {shell_bytes/1024:.1f} KiB.')
if errors:
    print('\n'.join(errors));sys.exit(1)
print('PASS: local links, anchors, image dimensions, shared styles and resource versions.')
