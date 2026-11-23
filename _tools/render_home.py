#!/usr/bin/env python3
"""Rebuilds the "Our Listings" cards and listing JSON-LD on the main website
(_website/index.html) from listings.json, so www.jleadersrealty.org always
matches homes.jleadersrealty.org. Runs in the "Deploy main website" action.

listings.json entry fields used: slug, status (active|pending|sold), address, city,
price, beds, baths, sqft, meta, tagline, photo, and an optional "home" block:
  home.pill   category badge (New Construction, Commercial...) shown while active
  home.status_pill  badge while pending/sold (default "Under Contract" / "Sold")
  home.img    image path/URL, or a list of them (slideshow on the big card)
  home.alt    alt text (list allowed, same order as img)
  home.hook   card headline (default: the tagline in quotes)
  home.specs  spec line (default: meta, or beds · baths · sq ft)
  home.vt     true = show the "Virtual twilight" tag on the photo
  home.hide   true = keep it off the homepage
Card layout: first card big, next two normal, the rest wide. Sold listings go last.
"""
import json, re, html, sys

SITE = "https://homes.jleadersrealty.org/"
HOME = "_website/index.html"
START, END = "<!--LISTINGS:START-->", "<!--LISTINGS:END-->"

def esc(s): return html.escape(str(s or ""), quote=True)

def num_price(p):
    d = re.sub(r"[^\d]", "", str(p or ""))
    return int(d) if d else None

def img_url(p):
    p = str(p or "")
    if p.startswith("http") or p.startswith("/"): return p
    return SITE + p.lstrip("./")

def card(x, size):
    h = x.get("home") or {}
    st = (x.get("status") or "active").lower()
    if st in ("pending", "sold"):  # status badge beats the category badge
        pill = h.get("status_pill") or {"pending": "Under Contract", "sold": "Sold"}[st]
    elif x.get("back_on_market"):
        pill = "Back on the Market"
    else:
        pill = h.get("pill") or ""
    imgs = h.get("img") or img_url(x.get("photo"))
    alts = h.get("alt") or f"Front of {x.get('address','')}, {x.get('city','')}"
    if not isinstance(imgs, list): imgs = [imgs]
    if not isinstance(alts, list): alts = [alts] * len(imgs)
    alts += [alts[-1]] * (len(imgs) - len(alts))
    tags = [f'<img src="{esc(img_url(u))}" alt="{esc(a)}" loading="lazy">' for u, a in zip(imgs, alts)]
    pics = f'<div class="slides">{"".join(tags)}</div>' if len(tags) > 1 else tags[0]
    hook = h.get("hook") or (f"“{x['tagline']}”" if x.get("tagline") else "")
    specs = h.get("specs") or x.get("meta") or " · ".join(
        s for s in [f"{x['beds']} beds" if x.get("beds") not in ("", None) else "",
                    f"{x['baths']} baths" if x.get("baths") not in ("", None) else "",
                    f"{x['sqft']} sq ft" if x.get("sqft") else ""] if s)
    name = x.get("address", "")
    cls = {"big": "lcard big rv", "wide": "lcard wide rv"}.get(size, "lcard rv")
    return f'''<article class="{cls}">
        <a class="lmain" href="{SITE}{esc(x['slug'])}/" target="_blank" rel="noopener">
        <div class="ph-img">
          {f'<span class="{"pill uc" if st in ("pending","sold") else "pill"}">{esc(pill)}</span>' if pill else ''}
          {pics}{'<span class="vt">Virtual twilight</span>' if h.get('vt') else ''}
        </div>
        <div class="hook">{esc(hook)}</div>
        <div class="meta"><span class="addr">{esc(name)} · {esc(x.get('city',''))}</span><span class="price">{esc(x.get('price',''))}</span></div>
        <div class="specs">{esc(specs)}</div>
        <span class="go">View the property site <span>→</span></span>
      </a>
        <div class="lacts"><button type="button" class="lact" data-modal="alert" data-home="{esc(name)}">Price drop alerts</button><button type="button" class="lact" data-modal="ask" data-home="{esc(name)}">Ask about this home</button></div>
      </article>'''

def ld(x):
    o = {"@type": "RealEstateListing", "name": f"{x.get('address','')}, {x.get('city','')}",
         "url": f"{SITE}{x['slug']}/"}
    p = num_price(x.get("price"))
    if p:
        o["offers"] = {"@type": "Offer", "price": p, "priceCurrency": "USD",
                       "seller": {"@id": "https://www.jleadersrealty.org/#org"}}
    return json.dumps(o, ensure_ascii=False)

def main():
    L = json.load(open("listings.json", encoding="utf-8"))
    L = [x for x in L if x.get("slug") and not (x.get("home") or {}).get("hide")]
    L.sort(key=lambda x: (x.get("status") == "sold",))  # stable: sold last, else listings.json order
    sizes = ["big", "", ""] + ["wide"] * max(0, len(L) - 3)
    cards = "\n      ".join(card(x, s) for x, s in zip(L, sizes))
    doc = open(HOME, encoding="utf-8").read()
    if START not in doc:  # first run: wrap the hand-placed cards in markers
        m = re.search(r'(<div class="listings">)(.*?)(\n  </div>\n</section>)', doc, re.S)
        if not m: sys.exit("Could not find the listings block on the homepage")
        doc = doc[:m.start(2)] + "\n      " + START + m.group(2) + "\n      " + END + doc[m.end(2):]
    doc = re.sub(re.escape(START) + r".*?" + re.escape(END),
                 lambda _: START + "\n      " + cards + "\n      " + END, doc, count=1, flags=re.S)
    pat = (r'\{"@type": "RealEstateListing", "name": "[^"]*", "url": "https://homes\.jleadersrealty\.org/[^"]*/"'
           r'(?:, "offers": \{"@type": "Offer", "price": \d+, "priceCurrency": "USD", "seller": \{"@id": "[^"]*"\}\})?\}')
    ms = list(re.finditer(pat, doc))
    block = ", ".join(ld(x) for x in L if x.get("status") != "sold")
    if ms and block:
        doc = doc[:ms[0].start()] + block + doc[ms[-1].end():]
    open(HOME, "w", encoding="utf-8").write(doc)
    print(f"Homepage listings rendered: {len(L)} cards")

if __name__ == "__main__":
    main()
