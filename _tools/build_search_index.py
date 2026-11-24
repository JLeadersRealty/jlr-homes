# Builds _website/search-index.json for the site search box (runs on every deploy).
import os,re,json,html
root='_website';out=[]
skip=re.compile(r'^(app|offline|portal|idx-wrapper|search)(/|$)')
def clean(s): return html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',s))).strip()
for dp,dn,fn in os.walk(root):
  dn[:]=[x for x in dn if not x.startswith(('_','.'))]
  if 'index.html' not in fn: continue
  rel=os.path.relpath(dp,root).replace(os.sep,'/'); rel='' if rel=='.' else rel
  if skip.match(rel): continue
  t=open(os.path.join(dp,'index.html'),encoding='utf-8',errors='ignore').read()
  meta={}
  for m in re.finditer(r'<meta\b[^>]*>',t,re.I):
    a=dict((k.lower(),v) for k,v in re.findall(r'([\w:-]+)\s*=\s*["\']([^"\']*)["\']',m.group(0)))
    key=a.get('name') or a.get('property')
    if key and 'content' in a: meta.setdefault(key.lower(),a['content'])
  if 'noindex' in meta.get('robots','').lower(): continue
  tm=re.search(r'<title[^>]*>(.*?)</title>',t,re.I|re.S); hm=re.search(r'<h1[^>]*>(.*?)</h1>',t,re.I|re.S)
  ti=clean(meta.get('og:title') or (tm.group(1) if tm else ''))
  ti=re.sub(r'\s*[|\u2013\u2014-]\s*J\. Leaders Realty.*$','',ti,flags=re.I).strip()
  h1=clean(hm.group(1)) if hm else ''
  u='/'+rel+('/' if rel else '')
  if u=='/': c='Page'; ti='J. Leaders Realty home'
  elif u.startswith('/communities/'): c='Community guide'
  elif u.startswith('/agents/'): c='Agent'
  elif re.match(r'^/(privacy|terms|our-blog|acreages|text-updates)/',u): c='Page'
  else: c='Blog'
  out.append({'u':u,'t':ti or h1,'d':clean(meta.get('description',''))[:170],'k':h1 if h1 and h1!=ti else '','c':c})
out.sort(key=lambda x:x['u'])
json.dump(out,open(os.path.join(root,'search-index.json'),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print(len(out),'pages in site search index')
