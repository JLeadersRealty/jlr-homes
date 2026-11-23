#!/usr/bin/env python3
"""Applies agent listing-site updates from the "JLR Listing Site Updates" sheet.
Runs hourly in the "Listing site updates" action. Only these types, and only rows
whose Status is "Auto-OK" (checked against FlexMLS by the agent's Claude) or "Approved" (Jamie):
  price        new list price, e.g. 249900 or $249,900
  status       active | pending | sold | back-on-market
  open_house   short text, e.g. "Sat 11/29 · 1–3 PM", or "clear"
  video        a YouTube link, or "clear"
Everything else (new wording, photos, disclosures) is applied by Claude after Jamie approves.
The agent on the row must be the listing agent in listings.json (Jamie can update any listing).
Results are logged to _tools/site-updates-log.json so a row is never applied twice.
"""
import csv, io, json, os, re, hashlib, html, urllib.request, datetime

SHEET_CSV = os.environ.get("SHEET_CSV", "")
LOG = "_tools/site-updates-log.json"
SAFE = {"price", "status", "open_house", "video"}
BROKER = "jamie leaders"

def now(): return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def load_rows():
    if os.path.exists("_tools/sheet.csv"):  # local testing
        text = open("_tools/sheet.csv", encoding="utf-8").read()
    else:
        try:
            with urllib.request.urlopen(SHEET_CSV, timeout=30) as r: text = r.read().decode("utf-8")
        except Exception as e:
            print("Couldn't read the updates sheet (it must be shared 'Anyone with the link: Viewer'):", e)
            return []
        if text.lstrip().startswith("<"):
            print("The updates sheet isn't shared 'Anyone with the link: Viewer' yet; nothing to apply.")
            return []
    return list(csv.DictReader(io.StringIO(text)))

def rid(r):
    k = "|".join((r.get(c) or "").strip() for c in ("Timestamp", "Slug", "Type", "New value"))
    return hashlib.sha1(k.encode()).hexdigest()[:12]

def banner_html(x):
    tags = []
    if x.get("status") == "pending": tags.append("Under Contract")
    elif x.get("status") == "sold": tags.append("Sold")
    elif x.get("back_on_market"): tags.append("Back on the Market")
    if x.get("open_house") and x.get("status") not in ("pending", "sold"): tags.append("Open House · " + x["open_house"])
    if not tags: return ""
    st = ("display:inline-block;background:#D4A017;color:#0B1B2B;font:600 12px/1 Inter,system-ui,sans-serif;"
          "letter-spacing:.1em;text-transform:uppercase;padding:9px 12px;border-radius:3px;margin:0 8px 14px 0")
    return "".join(f'<span style="{st}">{html.escape(t)}</span>' for t in tags) + "<br>"

def video_html(url):
    m = re.search(r"(?:youtu\.be/|v=|/shorts/|/embed/)([A-Za-z0-9_-]{11})", url or "")
    if not m: return ""
    vid, short = m.group(1), "/shorts/" in url
    box = "aspect-ratio:9/16;max-width:360px;margin:0 auto" if short else "aspect-ratio:16/9;max-width:960px;margin:0 auto"
    return ('<section class="wrap" style="padding-top:20px"><span class="eyebrow">The Tour</span><h2>See it moving.</h2>'
            f'<div style="{box};position:relative;border-radius:6px;overflow:hidden">'
            f'<iframe src="https://www.youtube-nocookie.com/embed/{vid}" title="Video tour" loading="lazy" '
            'style="position:absolute;inset:0;width:100%;height:100%;border:0" '
            'allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></section>')

def put_block(doc, name, content, before_patterns):
    a, b = f"<!--JLR-{name}-->", f"<!--/JLR-{name}-->"
    block = a + content + b
    if a in doc:
        return re.sub(re.escape(a) + ".*?" + re.escape(b), lambda _: block, doc, count=1, flags=re.S)
    if not content: return doc
    for p in before_patterns:
        i = doc.find(p)
        if i > -1: return doc[:i] + block + "\n  " + doc[i:]
    raise ValueError(f"no place for {name} block")

def rebuild_page(slug, x, old_price=None):
    p = f"{slug}/index.html"; doc = open(p, encoding="utf-8").read()
    if old_price and x.get("price") and old_price != x["price"]:
        o, n = int(re.sub(r"\D", "", old_price)), int(re.sub(r"\D", "", x["price"]))
        doc = doc.replace(f"${o:,}", f"${n:,}")
        doc = re.sub(rf'("price"\s*:\s*){o}\b', rf"\g<1>{n}", doc)
        doc = doc.replace(f'data-price="{o}"', f'data-price="{n}"')
    avail = {"pending": "LimitedAvailability", "sold": "SoldOut"}.get(x.get("status"), "InStock")
    doc = re.sub(r'"availability":\s*"https://schema\.org/\w+"', f'"availability":"https://schema.org/{avail}"', doc)
    doc = put_block(doc, "STATUS", banner_html(x), ["<h1>"])
    doc = put_block(doc, "VIDEO", video_html(x.get("video", "")), ["<!-- LOCATION -->", "<!-- CTA -->"])
    open(p, "w", encoding="utf-8").write(doc)

def apply(r, L):
    slug = (r.get("Slug") or "").strip().lower()
    typ = (r.get("Type") or "").strip().lower().replace(" ", "_")
    val = (r.get("New value") or "").strip()
    agent = (r.get("Agent") or "").strip().lower()
    x = next((i for i in L if i.get("slug") == slug), None)
    if not x: return "rejected", "no live site with that slug"
    if typ not in SAFE: return "skipped", "needs Claude + Jamie (not an automatic type)"
    if agent not in (BROKER, (x.get("agent") or "").lower()): return "rejected", "not the listing agent"
    old_price = x.get("price")
    if typ == "price":
        n = re.sub(r"[^\d]", "", val)
        if not n: return "rejected", "price isn't a number"
        n, o = int(n), int(re.sub(r"\D", "", old_price or "0") or 0)
        if o and not (0.6 * o <= n <= 1.25 * o): return "rejected", f"price change too big ({o} -> {n}); Jamie must apply"
        x["price"] = f"${n:,}"
    elif typ == "status":
        v = val.lower().replace(" ", "-")
        if v not in ("active", "pending", "sold", "back-on-market"): return "rejected", "status must be active, pending, sold or back-on-market"
        x["status"] = "active" if v == "back-on-market" else v
        x["back_on_market"] = v == "back-on-market"
        if v in ("pending", "sold"): x.pop("open_house", None)
    elif typ == "open_house":
        if val.lower() == "clear": x.pop("open_house", None)
        else:
            if len(val) > 60 or re.search(r"[<>{}]|https?:", val): return "rejected", "open house text too long or has odd characters"
            x["open_house"] = val
    elif typ == "video":
        if val.lower() == "clear": x.pop("video", None)
        elif not video_html(val): return "rejected", "not a YouTube link"
        else: x["video"] = val
    rebuild_page(slug, x, old_price)
    return "applied", ""

def main():
    L = json.load(open("listings.json", encoding="utf-8"))
    log = json.load(open(LOG, encoding="utf-8")) if os.path.exists(LOG) else []
    done = {e["id"] for e in log}
    changed = []
    for r in load_rows():
        if (r.get("Status") or "").strip().lower() not in ("auto-ok", "approved"): continue
        i = rid(r)
        if i in done: continue
        try: res, why = apply(r, L)
        except Exception as e: res, why = "error", str(e)[:200]
        if res == "skipped": continue
        log.append({"id": i, "at": now(), "slug": r.get("Slug"), "type": r.get("Type"), "value": r.get("New value"),
                    "agent": r.get("Agent"), "result": res, "reason": why})
        print(f"{res}: {r.get('Slug')} {r.get('Type')} = {r.get('New value')} {why}")
        if res == "applied": changed.append(r.get("Slug"))
    json.dump(L, open("listings.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    open("listings.json", "a").write("\n")
    json.dump(log[-500:], open(LOG, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"Done. {len(changed)} applied.")

if __name__ == "__main__":
    main()
