#!/usr/bin/env python3
"""Rebuilds the blog parts of llms.txt, the RSS feed and the sitemap from every published post.

The post pages themselves are the source of truth: any _website/**/index.html with BlogPosting
schema counts as a post (hand-built, AiM-imported or published from the JLR Blog Queue sheet).
Runs at the end of every "Blog queue" Action run, so these files can't fall behind again.

Every post line carries a <!--pub:YYYY-MM-DD--> marker. The site worker (_worker.js) hides
lines dated in the future and strips the marker from the rest, so scheduled posts stay hidden
until midnight Central on their date and visitors never see the marker.
"""
import datetime, glob, html, json, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "_website"
SITE = "https://www.jleadersrealty.org"
SKIP = {"our-blog", "portal", "idx-wrapper", "search", "offline"}


def esc(x): return html.escape(x or "", quote=True)
def mark(d): return f"<!--pub:{d}-->"


def posts():
    out, seen = [], set()
    for f in glob.glob(f"{ROOT}/**/index.html", recursive=True):
        rel = os.path.relpath(f, ROOT)
        if rel.split(os.sep)[0] in SKIP: continue
        s = open(f, encoding="utf-8").read()
        if "BlogPosting" not in s: continue
        for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
            try: d = json.loads(block)
            except ValueError: continue
            items = d.get("@graph", [d]) if isinstance(d, dict) else d
            for it in items:
                t = it.get("@type"); t = t if isinstance(t, list) else [t]
                if "BlogPosting" not in t: continue
                url = SITE + "/" + os.path.dirname(rel).replace(os.sep, "/") + "/"
                pub = (it.get("datePublished") or "")[:10]
                if url in seen or not re.fullmatch(r"\d{4}-\d\d-\d\d", pub): continue
                seen.add(url)
                out.append({"url": url, "title": html.unescape(it.get("headline") or "").strip(),
                            "desc": html.unescape(re.sub(r"\s+", " ", it.get("description") or "")).strip(),
                            "pub": pub, "mod": max(pub, (it.get("dateModified") or pub)[:10])})
    out.sort(key=lambda p: (p["pub"], p["url"]), reverse=True)  # newest first
    return out


def summary(desc):
    """One line for llms.txt: the meta description, or just its first sentence if it runs long."""
    if len(desc) <= 180: return desc
    m = re.match(r"(.{40,200}?[.?!])\s", desc + " ")
    return m.group(1) if m else desc[:177].rstrip() + "..."


def build_llms(ps):
    p = f"{ROOT}/llms.txt"; s = open(p, encoding="utf-8").read()
    urls = {x["url"] for x in ps}
    link = re.compile(r"^- \[[^\]]*\]\((https?://[^)]+)\)")
    lines = s.split("\n")
    # pull post lines out of every section (older runs dropped some under "More community guides")
    kept, section, carry = [], "", []
    for ln in lines:
        if ln.startswith("## "): section = ln[3:].strip()
        m = link.match(ln)
        if m and m.group(1) in urls: continue
        if section == "Blog" and m and not m.group(1).rstrip("/").endswith("/our-blog"):
            carry.append(re.sub(r"\s*<!--pub:[^>]*-->", "", ln)); continue  # non-post pages move to Key pages
        kept.append(ln)
    s = "\n".join(kept)
    if carry:
        km = re.search(r"^## Key pages\n(?:- .*\n)*", s, re.M)
        add = "".join(c + "\n" for c in carry if c not in s)
        s = s[:km.end()] + add + s[km.end():] if km else s
    blog = ["## Blog", f"- [All articles]({SITE}/our-blog/): every post, newest first",
            *(f"- [{x['title']}]({x['url']}) ({x['pub']}): {summary(x['desc'])} {mark(x['pub'])}" for x in ps)]
    sec = re.search(r"^## Blog\n.*?(?=^## |\Z)", s, re.M | re.S)
    body = "\n".join(blog) + "\n"
    s = (s[:sec.start()] + body + ("\n" if sec.end() < len(s) else "") + s[sec.end():]) if sec else s.rstrip("\n") + "\n\n" + body
    s = re.sub(r"\n{3,}", "\n\n", s).rstrip("\n") + "\n"
    open(p, "w", encoding="utf-8").write(s)


def build_feed(ps):
    p = f"{ROOT}/our-blog/feed.xml"; s = open(p, encoding="utf-8").read()
    i = s.find("<item>"); head = s[:i] if i > 0 else s[:s.find("</channel>")]
    head = re.sub(r"<lastBuildDate>.*?</lastBuildDate>", "", head).rstrip() + "\n"
    items = []
    for x in ps:
        rfc = datetime.date.fromisoformat(x["pub"]).strftime("%a, %d %b %Y 12:00:00 -0600")
        items.append(f"<item><title>{esc(x['title'])}</title><link>{x['url']}</link><guid>{x['url']}</guid>"
                     f"<pubDate>{rfc}</pubDate><description>{esc(x['desc'])}</description></item>{mark(x['pub'])}")
    open(p, "w", encoding="utf-8").write(head + "\n".join(items) + "\n</channel></rss>\n")


def build_sitemap(ps):
    p = f"{ROOT}/sitemap.xml"; s = open(p, encoding="utf-8").read()
    urls = {x["url"] for x in ps}
    lines = [ln for ln in s.split("\n")
             if not ((m := re.search(r"<loc>([^<]+)</loc>", ln)) and m.group(1) in urls)]
    s = "\n".join(lines)
    # posts go right after the blog index entry, newest first
    block = "".join(f"\n  <url><loc>{x['url']}</loc><lastmod>{x['mod']}</lastmod></url>{mark(x['pub'])}" for x in ps)
    anchor = re.search(r"^.*<loc>" + re.escape(SITE) + r"/our-blog/</loc>.*$", s, re.M)
    pos = anchor.end() if anchor else s.rfind("\n</urlset>")
    s = s[:pos] + block + s[pos:]
    open(p, "w", encoding="utf-8").write(s.rstrip("\n") + "\n")


def main():
    ps = posts()
    if not ps: print("build_feeds: no posts found, leaving files alone"); return
    build_llms(ps); build_feed(ps); build_sitemap(ps)
    print(f"build_feeds: llms.txt, feed.xml and sitemap.xml now list {len(ps)} posts (newest {ps[0]['pub']})")


if __name__ == "__main__":
    main()
