#!/usr/bin/env python3
"""Publishes blog posts from the "JLR Blog Queue" Google Sheet onto www.jleadersrealty.org.

Replaces AiM Blog Engine and Placester. Claude's weekly blog writer adds one row per post;
this runs every hour in the "Blog queue" GitHub Action and builds any row whose Status is
"Ready" that hasn't been published yet.

Sheet columns (row 1 headers, exact names):
  Status        Ready | Draft | Skip     (only Ready rows publish)
  Publish date  YYYY-MM-DD  (future dates are built now but stay hidden until midnight Central that day)
  Slug          url-words-only   -> https://www.jleadersrealty.org/<slug>/
  Title         post headline
  Meta description  ~150 characters
  Topic         Selling | Buying | Acreage | Investing | Local
  Image URL     public https image (Google Drive share links work if shared "Anyone with the link")
  Image alt     short description of the photo
  Body          the post in Markdown (## headings, lists, tables, links; an "## FAQ" section of ### questions)

Each post gets: its own page, a blog index card, RSS item, sitemap entry, llms.txt line,
BlogPosting + FAQPage + Breadcrumb schema, and a scheduled-date entry in the site worker.
Results are logged to _tools/blog-queue-log.json so a row is never published twice.
"""
import csv, io, json, os, re, html, hashlib, datetime, urllib.request, subprocess
from zoneinfo import ZoneInfo

ROOT = "_website"
SITE = "https://www.jleadersrealty.org"
SHEET_CSV = os.environ.get("BLOG_SHEET_CSV", "")
LOG = "_tools/blog-queue-log.json"
TEMPLATE = "_tools/blog-post-template.html"
TOPICS = {"Selling", "Buying", "Acreage", "Investing", "Local"}
UA = {"User-Agent": "Mozilla/5.0 (jlr-blog-queue)"}

def today(): return datetime.datetime.now(ZoneInfo("America/Chicago")).date().isoformat()
def now(): return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
def esc(x): return html.escape(x or "", quote=True)
def long_date(d): return datetime.date.fromisoformat(d).strftime("%B %-d, %Y")

def load_rows():
    if os.path.exists("_tools/blog-sheet.csv"):  # local testing
        text = open("_tools/blog-sheet.csv", encoding="utf-8").read()
    else:
        if not SHEET_CSV: print("BLOG_SHEET_CSV not set"); return []
        try:
            with urllib.request.urlopen(urllib.request.Request(SHEET_CSV, headers=UA), timeout=60) as r:
                text = r.read().decode("utf-8")
        except Exception as e:
            print("Couldn't read the blog queue sheet (share it 'Anyone with the link: Viewer'):", e); return []
        if text.lstrip().startswith("<"):
            print("The blog queue sheet isn't shared 'Anyone with the link: Viewer' yet."); return []
    return [{(k or "").strip(): (v or "").strip() for k, v in r.items()} for r in csv.DictReader(io.StringIO(text))]

# ---------- Markdown ----------
def slugify(t): return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", t.lower())).strip("-")[:48].strip("-")

def md_to_html(md):
    import markdown
    if md.lstrip().startswith("<"):  # already HTML (e.g. imported from the old AiM feed)
        out = re.sub(r"</?(article|main|body|html)[^>]*>", "", md, flags=re.I)
        out = re.sub(r"<h1[^>]*>.*?</h1>", "", out, count=1, flags=re.S)
        out = re.sub(r"<(script|iframe|style)[^>]*>.*?</\1>", "", out, flags=re.S | re.I)
        out = re.sub(r"<h2[^>]*>", "<h2>", out); out = re.sub(r"<h3[^>]*>", "<h3>", out)
        return _finish(out)
    md = re.sub(r"^\s*#\s+.+\n", "", md.strip() + "\n", count=1)  # drop a leading H1 (the page has its own)
    return _finish(markdown.markdown(md, extensions=["tables", "sane_lists"]))

def _finish(out):
    out = out.replace('href="https://www.jleadersrealty.org/', 'href="/').replace('href="http://www.jleadersrealty.org/', 'href="/')
    out = re.sub(r'<a href="(https?://)', r'<a rel="noopener" target="_blank" href="\1', out)
    out = re.sub(r"<table>", '<div class="tbl"><table>', out).replace("</table>", "</table></div>")
    heads = []
    def h2(m):
        text = re.sub("<[^>]+>", "", m.group(1)); i = slugify(text)
        base, n = i, 2
        while i in [h[0] for h in heads]: i, n = f"{base}-{n}", n + 1
        heads.append((i, html.unescape(text))); return f'<h2 id="{i}">{m.group(1)}</h2>'
    out = re.sub(r"<h2>(.*?)</h2>", h2, out)
    return out, heads

def faqs(body_html):
    m = re.search(r'<h2 id="[^"]*">(?:FAQ|FAQs|Frequently Asked Questions)[^<]*</h2>(.*?)(?=<h2 |$)', body_html, re.S | re.I)
    if not m: return []
    qa = []
    for q, a in re.findall(r"<h3>(.*?)</h3>(.*?)(?=<h3>|$)", m.group(1), re.S):
        a = html.unescape(re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", a))).strip()
        if a: qa.append({"@type": "Question", "name": html.unescape(re.sub("<[^>]+>", "", q)).strip(),
                         "acceptedAnswer": {"@type": "Answer", "text": a}})
    return qa

# ---------- image ----------
def drive_direct(u):
    m = re.search(r"drive\.google\.com/(?:file/d/|open\?id=|uc\?id=)([A-Za-z0-9_-]{20,})", u)
    return f"https://drive.usercontent.google.com/download?id={m.group(1)}&export=download&confirm=t" if m else u

def fetch_image(url, slug):
    from PIL import Image
    name = hashlib.sha1(slug.encode()).hexdigest()[:16] + ".jpg"
    path = f"{ROOT}/img/blog/{name}"
    if os.path.exists(path): return f"/img/blog/{name}"
    with urllib.request.urlopen(urllib.request.Request(drive_direct(url), headers=UA), timeout=60) as r: data = r.read()
    im = Image.open(io.BytesIO(data)).convert("RGB")
    if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)))
    os.makedirs(os.path.dirname(path), exist_ok=True); im.save(path, "JPEG", quality=82, optimize=True, progressive=True)
    return f"/img/blog/{name}"

# ---------- page ----------
def card(slug, topic, pub, img, title, desc, scheduled, cls="pcard rv"):
    dp = f' data-pub="{pub}"' if scheduled else ""
    return (f'<a class="{cls}" href="/{slug}/" data-topic="{topic}"{dp}>\n'
            f'  <div class="pimg"><img src="{img}" alt="" loading="lazy"></div>\n'
            f'  <div class="pbody"><div class="pmeta"><span class="t">{topic}</span><span class="sep"></span><span>{long_date(pub)}</span></div>\n'
            f'  <h3>{esc(title)}</h3>\n  <p>{esc(desc)}</p>\n  <span class="go">Read it <span>→</span></span></div>\n</a>')

def related_cards(slug):
    s = open(f"{ROOT}/our-blog/index.html", encoding="utf-8").read()
    cards = re.findall(r'<a class="pcard rv" href="/([^"]+)/"[^>]*>.*?</a>', s, re.S)
    whole = re.findall(r'(<a class="pcard rv" href="/[^"]+/"[^>]*>.*?</a>)', s, re.S)
    picks = [re.sub(r' data-pub="[^"]*"', "", c) for sl, c in zip(cards, whole) if sl != slug and "data-pub" not in c][:3]
    return "".join(picks)

SEED = "council-bluffs-or-omaha-which-side-of-the-river-should-you-buy-on"
def make_template():
    """Builds the page template once from an existing post, so new posts match the site exactly."""
    s = open(f"{ROOT}/{SEED}/index.html", encoding="utf-8").read()
    T = "Council Bluffs or Omaha: Which Side of the River Should You Buy On?"
    D = "Council Bluffs usually costs less to buy into, but Iowa vs Nebraska taxes depend on where you work. Here&#x27;s how to compare both sides of the metro honestly."
    def cut(s, a_tag, b_tag, token):
        a = s.find(a_tag) + len(a_tag); b = s.find(b_tag, a); return s[:a] + token + s[b:]
    s = cut(s, '<script type="application/ld+json">', "</script>", "{{SCHEMA}}")
    s = cut(s, '<article class="prose">', "</article>", "\n{{BODY}}\n  ")
    s = cut(s, '<ul class="toc">', "</ul>", "{{TOC}}")
    s = cut(s, '<div class="pgrid rel">', "</div></div></section>", "{{RELATED}}")
    s = s.replace(f"{SITE}/img/blog/9b2e5788fac2af9c.jpg", "{{IMG_ABS}}")
    s = s.replace(f'<img src="/img/blog/9b2e5788fac2af9c.jpg" alt="{T}">', '<img src="{{IMG}}" alt="{{ALT}}">')
    s = s.replace(f"{SITE}/{SEED}/", "{{URL}}").replace(D, "{{DESC}}")
    s = s.replace('data-home="Question about: Council Bluffs or Omaha: Which Side of the River Should You "', 'data-home="{{ASK}}"')
    s = s.replace("Council Bluffs or Omaha: Which Side of the River Should You …", "{{CRUMB}}").replace(T, "{{TITLE}}")
    s = s.replace('<span class="dot"></span>Buying · J. Leaders Realty Blog', '<span class="dot"></span>{{TOPIC}} · J. Leaders Realty Blog')
    s = s.replace('<time datetime="2026-12-02">December 2, 2026</time><span class="sep"></span><span>6 min read</span>',
                  '<time datetime="{{DATE}}">{{LONGDATE}}</time><span class="sep"></span><span>{{MINS}} min read</span>')
    need = ["{{SCHEMA}}", "{{BODY}}", "{{TOC}}", "{{RELATED}}", "{{IMG}}", "{{URL}}", "{{DESC}}", "{{TITLE}}", "{{TOPIC}}", "{{DATE}}"]
    missing = [k for k in need if k not in s]
    if missing or "Which Side of the River" in s: raise SystemExit(f"Template build failed: {missing}")
    open(TEMPLATE, "w", encoding="utf-8").write(s)

def build_page(r, body_html, heads, img):
    slug, title, desc, topic, pub = r["Slug"], r["Title"], r["Meta description"], r["Topic"], r["Publish date"]
    url = f"{SITE}/{slug}/"
    words = len(re.sub("<[^>]+>", " ", body_html).split())
    mins = max(2, round(words / 230))
    graph = [
        {"@type": ["RealEstateAgent", "LocalBusiness"], "@id": f"{SITE}/#org", "name": "J. Leaders Realty", "url": f"{SITE}/", "telephone": "+1-402-773-8511", "slogan": "Lead Different."},
        {"@type": "Person", "@id": f"{SITE}/#jamie", "name": "Jamie Leaders", "jobTitle": "Broker/Owner", "telephone": "+1-402-773-8511", "worksFor": {"@id": f"{SITE}/#org"}, "url": f"{SITE}/#team"},
        {"@type": "BlogPosting", "@id": url + "#post", "headline": title, "description": desc, "url": url, "mainEntityOfPage": url,
         "datePublished": pub, "dateModified": pub, "author": {"@id": f"{SITE}/#jamie"}, "publisher": {"@id": f"{SITE}/#org"},
         "articleSection": topic, "wordCount": words, "isPartOf": {"@type": "Blog", "@id": f"{SITE}/our-blog/#blog", "name": "J. Leaders Realty Blog"},
         "inLanguage": "en-US", "image": SITE + img},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Blog", "item": f"{SITE}/our-blog/"},
            {"@type": "ListItem", "position": 3, "name": title, "item": url}]}]
    qa = faqs(body_html)
    if qa: graph.append({"@type": "FAQPage", "@id": url + "#faq", "mainEntity": qa})
    short = title if len(title) <= 44 else title[:43].rstrip() + " …"
    toc = "".join(f'<li><a href="#{i}">{esc(t)}</a></li>' for i, t in heads)
    alt = r.get("Image alt") or title
    if not os.path.exists(TEMPLATE): make_template()
    t = open(TEMPLATE, encoding="utf-8").read()
    rep = {"{{TITLE}}": esc(title), "{{DESC}}": esc(desc), "{{URL}}": url, "{{IMG_ABS}}": SITE + img, "{{IMG}}": img,
           "{{ALT}}": esc(alt), "{{SCHEMA}}": json.dumps({"@context": "https://schema.org", "@graph": graph}).replace("</", "<\\/"),
           "{{CRUMB}}": esc(short), "{{TOPIC}}": esc(topic), "{{DATE}}": pub, "{{LONGDATE}}": long_date(pub),
           "{{MINS}}": str(mins), "{{BODY}}": body_html, "{{TOC}}": toc, "{{ASK}}": esc(("Question about: " + title)[:75]),
           "{{RELATED}}": related_cards(slug)}
    for k, v in rep.items(): t = t.replace(k, v)
    os.makedirs(f"{ROOT}/{slug}", exist_ok=True)
    open(f"{ROOT}/{slug}/index.html", "w", encoding="utf-8").write(t)

# ---------- index / feed / sitemap / llms / worker ----------
def add_everywhere(r, img, scheduled):
    slug, title, desc, topic, pub = r["Slug"], r["Title"], r["Meta description"], r["Topic"], r["Publish date"]
    url = f"{SITE}/{slug}/"; mark = f"<!--pub:{pub}-->" if scheduled else ""
    # blog index: insert by date (newest first)
    p = f"{ROOT}/our-blog/index.html"; s = open(p, encoding="utf-8").read()
    new = card(slug, topic, pub, img, title, desc, scheduled)
    start = s.find('<div class="pgrid idx">') + len('<div class="pgrid idx">')
    pos = start
    for m in re.finditer(r'<a class="pcard rv" href="/[^"]+/"[^>]*>.*?<span>([A-Z][a-z]+ \d{1,2}, \d{4})</span>.*?</a>', s[start:], re.S):
        if datetime.datetime.strptime(m.group(1), "%B %d, %Y").date().isoformat() <= pub: pos = start + m.start(); break
        pos = start + m.end()
    s = s[:pos] + new + s[pos:]
    open(p, "w", encoding="utf-8").write(s)
    # RSS
    p = f"{ROOT}/our-blog/feed.xml"; s = open(p, encoding="utf-8").read()
    rfc = datetime.datetime.fromisoformat(pub + "T12:00:00").strftime("%a, %d %b %Y 12:00:00 -0600")
    item = f"<item><title>{esc(title)}</title><link>{url}</link><guid>{url}</guid><pubDate>{rfc}</pubDate><description>{esc(desc)}</description></item>{mark}\n"
    i = s.find("<item>"); s = s[:i] + item + s[i:] if i > 0 else s.replace("</channel>", item + "</channel>")
    open(p, "w", encoding="utf-8").write(s)
    # sitemap
    p = f"{ROOT}/sitemap.xml"; s = open(p, encoding="utf-8").read()
    s = s.replace("</urlset>", f"  <url><loc>{url}</loc><lastmod>{pub}</lastmod></url>{mark}\n</urlset>")
    open(p, "w", encoding="utf-8").write(s)
    # llms.txt: right before the first existing blog line
    p = f"{ROOT}/llms.txt"; s = open(p, encoding="utf-8").read()
    line = f"- [{title}]({url}){(' ' + mark) if mark else ''}\n"
    m = re.search(r"^- \[[^\]]+\]\(https://www\.jleadersrealty\.org/[^)]+\)(?: <!--pub:[^>]+-->)?\n", s, re.M)
    s = s[:m.start()] + line + s[m.start():] if m else s + line
    open(p, "w", encoding="utf-8").write(s)
    # worker schedule
    if scheduled:
        p = f"{ROOT}/_worker.js"; s = open(p, encoding="utf-8").read()
        m = re.search(r"const SCHED = (\{.*?\});", s)
        d = json.loads(m.group(1)); d[f"/{slug}/"] = pub
        s = s[:m.start(1)] + json.dumps(d) + s[m.end(1):]
        open(p, "w", encoding="utf-8").write(s)

def check(r):
    for k in ("Publish date", "Slug", "Title", "Meta description", "Topic", "Image URL", "Body"):
        if not r.get(k): return f"missing {k}"
    if not re.fullmatch(r"\d{4}-\d\d-\d\d", r["Publish date"]): return "Publish date must be YYYY-MM-DD"
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", r["Slug"]): return "Slug must be lowercase words joined by dashes"
    if r["Topic"] not in TOPICS: return "Topic must be one of " + ", ".join(sorted(TOPICS))
    if os.path.exists(f"{ROOT}/{r['Slug']}/index.html"): return "a page with this slug already exists"
    if re.search(r"<script|<iframe|javascript:", r["Body"], re.I): return "Body has script/iframe code"
    if "402.773.8511" not in r["Body"]: return "Body must include the JLR office number 402.773.8511"
    return ""

def aim_rows(feed_url, slugs):
    """One-time import of chosen posts from the old AiM Blog Engine RSS feed."""
    import xml.etree.ElementTree as ET
    from email.utils import parsedate_to_datetime
    with urllib.request.urlopen(urllib.request.Request(feed_url, headers=UA), timeout=60) as r: root = ET.fromstring(r.read())
    ns = {"content": "http://purl.org/rss/1.0/modules/content/", "media": "http://search.yahoo.com/mrss/"}
    want = {x.strip() for x in slugs.split(",") if x.strip()}
    rows = []
    for it in root.iter("item"):
        link = it.findtext("link") or ""; slug = link.rstrip("/").split("/")[-1]
        if want and slug not in want: continue
        body = it.findtext("content:encoded", "", ns)
        desc_html = it.findtext("description") or ""
        img = ""
        m = it.find("media:content", ns)
        if m is not None: img = m.get("url", "")
        if not img:
            mm = re.search(r'<img[^>]+src="([^"]+)"', desc_html + body); img = html.unescape(mm.group(1)) if mm else ""
        body = re.sub(r'^\s*(?:<p>\s*)?<img[^>]*>(?:\s*</p>)?', "", body, count=1)
        desc = html.unescape(re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", desc_html))).strip()[:300]
        body = body.replace("sms:+14023066255", "sms:+14027738511").replace("tel:+14023066255", "tel:+14027738511").replace("402.306.6255", "402.773.8511")
        low = (it.findtext("title") or "").lower() + " " + slug
        topic = ("Acreage" if re.search(r"acreage|land|rural", low) else "Investing" if re.search(r"rental|invest|data-center", low)
                 else "Selling" if re.search(r"sell|pric|offer|apprais|disclos|underwater", low) else "Buying")
        rows.append({"Status": "Ready", "Publish date": parsedate_to_datetime(it.findtext("pubDate")).astimezone(ZoneInfo("America/Chicago")).date().isoformat(),
                     "Slug": slug, "Title": html.unescape(it.findtext("title") or ""), "Meta description": desc, "Topic": topic,
                     "Image URL": img, "Image alt": html.unescape(it.findtext("title") or ""), "Body": body})
    print(f"AiM feed: {len(rows)} posts selected")
    return rows

def rid(r): return hashlib.sha1((r.get("Slug", "") + "|" + r.get("Publish date", "")).encode()).hexdigest()[:12]

def main():
    log = json.load(open(LOG, encoding="utf-8")) if os.path.exists(LOG) else []
    done = {e["id"] for e in log if e["result"] == "published"}
    seen = {(e["id"], e.get("reason")) for e in log}
    n = 0
    rows = aim_rows(os.environ["AIM_FEED"], os.environ.get("AIM_SLUGS", "")) if os.environ.get("AIM_FEED") else load_rows()
    for r in rows:
        if (r.get("Status") or "").lower() != "ready": continue
        i = rid(r)
        if i in done: continue
        why = check(r)
        if why and (i, why) in seen: continue
        try:
            if not why:
                img = fetch_image(r["Image URL"], r["Slug"])
                body, heads = md_to_html(r["Body"])
                build_page(r, body, heads, img)
                add_everywhere(r, img, r["Publish date"] > today())
        except Exception as e: why = f"error: {str(e)[:200]}"
        res = "published" if not why else "rejected"
        log.append({"id": i, "at": now(), "slug": r.get("Slug"), "date": r.get("Publish date"), "result": res, "reason": why})
        print(f"{res}: {r.get('Slug')} ({r.get('Publish date')}) {why}")
        n += res == "published"
    # tidy: older imported pages may carry a second <article> wrapper from the AiM feed
    for e in log:
        f = f"{ROOT}/{e.get('slug')}/index.html"
        if e["result"] == "published" and os.path.exists(f):
            s = open(f, encoding="utf-8").read()
            t = re.sub(r'(<article class="prose">\s*)<article>', r"\1", s)
            if t != s:
                t = re.sub(r"</article>(\s*</article>)", r"\1", t, count=1)
                open(f, "w", encoding="utf-8").write(t); print("tidied", e["slug"])
    json.dump(log[-1000:], open(LOG, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"Done. {n} published.")

if __name__ == "__main__":
    main()
