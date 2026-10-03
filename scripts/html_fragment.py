"""Small HTML fragment tree, using only Python's standard library."""
from html.parser import HTMLParser
from html import escape, unescape

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Node:
    def __init__(self, tag='', attrs=(), children=None):
        self.tag, self.attrs, self.children = tag, dict(attrs), children or []
    def html(self):
        content=''.join(c.html() if isinstance(c,Node) else c for c in self.children)
        if not self.tag:return content
        attrs=''.join(' '+k+('="'+escape(str(v),quote=True)+'"' if v is not None else '') for k,v in self.attrs.items())
        return '<'+self.tag+attrs+'>'+('' if self.tag in VOID else content+'</'+self.tag+'>')
    def all(self, tag=None):
        for c in self.children:
            if isinstance(c,Node):
                if tag is None or c.tag==tag:yield c
                yield from c.all(tag)
    def text(self):
        return unescape(' '.join(c.text() if isinstance(c,Node) else c for c in self.children))
    def has_class(self, name):return name in self.attrs.get('class','').split()
    def add_class(self, name):
        self.attrs['class']=' '.join(dict.fromkeys(self.attrs.get('class','').split()+[name]))

class Parser(HTMLParser):
    def __init__(self,text):
        super().__init__(convert_charrefs=False);self.root=Node();self.stack=[self.root];self.feed(text)
    def handle_starttag(self,t,a):
        n=Node(t,a);self.stack[-1].children.append(n)
        if t not in VOID:self.stack.append(n)
    def handle_startendtag(self,t,a):self.handle_starttag(t,a)
    def handle_endtag(self,t):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==t:self.stack=self.stack[:i];break
    def handle_data(self,d):self.stack[-1].children.append(d)
    def handle_entityref(self,n):self.handle_data('&'+n+';')
    def handle_charref(self,n):self.handle_data('&#'+n+';')
    def handle_comment(self,d):self.handle_data('<!--'+d+'-->')
