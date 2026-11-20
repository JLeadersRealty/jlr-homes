// J. Leaders Realty site worker: old-URL forwards + scheduled blog posts (go live at midnight Central on their date)
const SCHED = {"/council-bluffs-or-omaha-which-side-of-the-river-should-you-buy-on/": "2026-12-02", "/should-you-sell-your-house-this-winter-in-council-bluffs-or-omaha/": "2026-11-30", "/iowa-vs-nebraska-closing-costs-whats-different-across-the-river/": "2026-11-27", "/sell-before-buying-in-the-council-bluffs-metro/": "2026-11-25", "/take-a-contingent-offer-in-the-omaha-council-bluffs-market/": "2026-11-23", "/council-bluffs-home-values-and-the-hollywood-casino-hotel/": "2026-11-20", "/data-centers-in-omaha-and-what-they-mean-for-investors/": "2026-11-20"};
const REDIRECTS = [["/home-value", "/#value", 301], ["/home-value/", "/#value", 301], ["/ready-to-sell", "/#quiz", 301], ["/ready-to-sell/", "/#quiz", 301], ["/search", "/#search", 302], ["/search/", "/#search", 302], ["/about", "/#about", 301], ["/about/", "/#about", 301], ["/contact", "/#talk", 301], ["/contact/", "/#talk", 301], ["/harlan", "/communities/harlan/?utm_source=postcard&utm_medium=mail&utm_campaign=harlan-second-opinion#value", 302], ["/harlan/", "/communities/harlan/?utm_source=postcard&utm_medium=mail&utm_campaign=harlan-second-opinion#value", 302], ["/2026/12/02/council-bluffs-or-omaha-which-side-of-the-river-should-you-buy-on/", "/council-bluffs-or-omaha-which-side-of-the-river-should-you-buy-on/", 301], ["/2026/11/30/should-you-sell-your-house-this-winter-in-council-bluffs-or-omaha/", "/should-you-sell-your-house-this-winter-in-council-bluffs-or-omaha/", 301], ["/2026/11/27/iowa-vs-nebraska-closing-costs-whats-different-across-the-river/", "/iowa-vs-nebraska-closing-costs-whats-different-across-the-river/", 301], ["/2026/11/25/sell-before-buying-in-the-council-bluffs-metro/", "/sell-before-buying-in-the-council-bluffs-metro/", 301], ["/2026/11/23/take-a-contingent-offer-in-the-omaha-council-bluffs-market/", "/take-a-contingent-offer-in-the-omaha-council-bluffs-market/", 301], ["/2026/11/20/council-bluffs-home-values-and-the-hollywood-casino-hotel/", "/council-bluffs-home-values-and-the-hollywood-casino-hotel/", 301], ["/2026/11/20/data-centers-in-omaha-and-what-they-mean-for-investors/", "/data-centers-in-omaha-and-what-they-mean-for-investors/", 301], ["/2026/11/18/council-bluffs-home-underwater-can-you-still-sell-it/", "/council-bluffs-home-underwater-can-you-still-sell-it/", 301], ["/2026/11/16/what-iowa-sellers-must-disclose-about-a-home/", "/what-iowa-sellers-must-disclose-about-a-home/", 301], ["/2026/11/14/offer-on-an-iowa-home-accepted-what-happens-next/", "/offer-on-an-iowa-home-accepted-what-happens-next/", 301], ["/2026/11/14/acreage-around-council-bluffs-checklist-before-you-buy/", "/acreage-around-council-bluffs-checklist-before-you-buy/", 301], ["/2026/11/14/iowa-offer-falls-through-on-financing-seller-next-steps/", "/iowa-offer-falls-through-on-financing-seller-next-steps/", 301], ["/2026/11/06/selling-a-house-during-a-divorce-in-council-bluffs-or-omaha/", "/selling-a-house-during-a-divorce-in-council-bluffs-or-omaha/", 301], ["/2026/11/04/what-happens-if-your-home-appraisal-comes-in-low-in-council-bluffs/", "/what-happens-if-your-home-appraisal-comes-in-low-in-council-bluffs/", 301], ["/2026/10/13/sell-rental-tenants-council-bluffs/", "/sell-rental-tenants-council-bluffs/", 301], ["/2026/10/02/well-septic-inspections-for-iowa-nebraska-acreage-buyers-rural-acreage-buyers/", "/well-septic-inspections-for-iowa-nebraska-acreage-buyers-rural-acreage-buyers/", 301], ["/2026/10/02/1031-exchange-basics-for-iowa-and-nebraska-investors-investors/", "/1031-exchange-basics-for-iowa-and-nebraska-investors-investors/", 301], ["/2026/10/02/selling-an-inherited-house-in-iowa-or-nebraska-sellers-estate/", "/selling-an-inherited-house-in-iowa-or-nebraska-sellers-estate/", 301], ["/2026/09/25/why-carter-lake-iowa-nebraska-side-river/", "/why-carter-lake-iowa-nebraska-side-river/", 301], ["/iowa-2026-property-tax-reform-homeowners/", "/2026/09/23/iowa-2026-property-tax-reform-homeowners/", 301], ["/2026/09/23/repair-or-sell-as-is-council-bluffs/", "/repair-or-sell-as-is-council-bluffs/", 301], ["/2026/09/23/build-new-vs-buy-existing-council-bluffs/", "/build-new-vs-buy-existing-council-bluffs/", 301], ["/2026/09/18/sell-before-buy-council-bluffs/", "/sell-before-buy-council-bluffs/", 301], ["/2026/09/18/rental-property-investment-council-bluffs/", "/rental-property-investment-council-bluffs/", 301], ["/new-blog-post-mtuyv1zl/", "/why-mortgage-rates-just-jumped-omaha-council-bluffs/", 301], ["/2026/09/10/new-blog-post-mtuyv1zl/", "/why-mortgage-rates-just-jumped-omaha-council-bluffs/", 301], ["/2026/09/10/why-mortgage-rates-just-jumped-omaha-council-bluffs/", "/why-mortgage-rates-just-jumped-omaha-council-bluffs/", 301], ["/2026/09/10/down-payment-assistance-first-time-buyers/", "/down-payment-assistance-first-time-buyers/", 301], ["/hoo-doo-days-neola-iowa-2026/", "/2026/09/02/hoo-doo-days-neola-iowa-2026/", 301], ["/sell-home-days-market-council-bluffs/", "/2026/09/02/sell-home-days-market-council-bluffs/", 301], ["/wait-lower-mortgage-rates-buy-omaha/", "/2026/09/02/wait-lower-mortgage-rates-buy-omaha/", 301], ["/2026/08/29/buying-acreage-iowa-what-to-know/", "/buying-acreage-iowa-what-to-know/", 301], ["/2026/08/25/how-much-will-you-net-selling-your-home-in-iowa/", "/how-much-will-you-net-selling-your-home-in-iowa/", 301], ["/2026/08/19/could-you-take-your-mortgage-rate-with-you-what-the-new-portable-mortgage-bill-means-for-iowa-homeowners-2/", "/could-you-take-your-mortgage-rate-with-you-what-the-new-portable-mortgage-bill-means-for-iowa-homeowners-2/", 301], ["/homestead-tax-credit-exemption/", "/2024/06/25/homestead-tax-credit-exemption/", 301], ["/what-your-agent-should-do-for-you-2/", "/2024/06/20/what-your-agent-should-do-for-you-2/", 301], ["/5-common-mistakes-first-time-homebuyers-make-2/", "/2024/06/20/5-common-mistakes-first-time-homebuyers-make-2/", 301], ["/10-ways-to-make-your-home-energy-efficient-2/", "/2024/06/20/10-ways-to-make-your-home-energy-efficient-2/", 301], ["/no-title/", "/our-blog/", 301], ["/blog/", "/our-blog/", 301], ["/our-blog/page/*", "/our-blog/", 301], ["/category/*", "/our-blog/", 301], ["/author/*", "/our-blog/", 301], ["/home-valuation/", "/#value", 301], ["/area/home-valuation/", "/#value", 301], ["/privacy-policy/", "/privacy/", 301], ["/terms-and-conditions/", "/privacy/#sms", 301], ["/accessibility/", "/privacy/", 301], ["/dmca-compliance/", "/privacy/", 301], ["/responsible-business/", "/", 301], ["/about-us/", "/#about", 301], ["/sellers/", "/#sell", 301], ["/buyers/", "/#search", 301], ["/featured-listings/", "https://homes.jleadersrealty.org/", 301], ["/default/", "/", 301], ["/homepage-2/", "/", 301], ["/where-would-you-like-to-live/", "/#towns", 301], ["/recommended-lenders/", "/#faq", 301], ["/how-to-find-the-right-mortgage-lender/", "/#faq", 301], ["/testimonial/*", "/#about", 301], ["/feed/", "/our-blog/feed.xml", 301]];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
const MARK = /\s*<!--pub:(\d{4}-\d\d-\d\d)-->/;


// Agent pages: reviews, local picks and social links pulled live from the "JLR Agent Pages — Updates" sheet (published CSV)
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwpLyFx2e0y_A_ehhLxfEvdbhbRFoo699hb0VMVrr08b9eBf_eQgmtA5dsQMqHvMG-U8I_V4D9NB1u/pub?gid=0&single=true&output=csv";
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
async function liveRows() {
  if (!SHEET_CSV) return [];
  try {
    const r = await fetch(SHEET_CSV, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!r.ok) return [];
    return parseCSV(await r.text()).slice(1).filter(x => x.length >= 9 && x[1]);
  } catch (e) { return []; }
}
const SOC = /^https:\/\/(www\.)?(instagram\.com|facebook\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|zillow\.com|realtor\.com|share\.google|g\.page|x\.com|twitter\.com|pinterest\.com)\//i;
function agentLive(rows, name) {
  const mine = rows.filter(x => x[1].trim().toLowerCase() === name.trim().toLowerCase() && !/needs jamie|skipped/i.test(x[8] || ''));
  const of = t => mine.filter(x => (x[2] || '').trim().toLowerCase() === t);
  const reviews = of('review').filter(x => /^y/i.test((x[7] || '').trim()) && x[3]).slice(-3).reverse().map(x =>
    `<figure><div class="st" aria-label="5 stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><blockquote>${esc(x[3])}</blockquote><figcaption>${esc(x[4])}${x[5] ? ' · ' + esc(x[5]) : ''}${x[6] ? ' · ' + esc(x[6]) : ''}</figcaption></figure>`).join('');
  const picks = of('local pick').filter(x => x[4]).slice(-6).map(x =>
    `<div><div class="k">${esc(x[6] || 'Local pick')}${x[5] ? ' · ' + esc(x[5]) : ''}</div><h3>${esc(x[4])}</h3><p>${esc(x[3])}</p></div>`).join('');
  const seen = {}; const socials = of('social link').filter(x => SOC.test((x[3] || '').trim())).reverse()
    .filter(x => { const k = (x[4] || x[3]).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).reverse()
    .map(x => `<a href="${esc(x[3].trim())}" target="_blank" rel="noopener">${esc(x[4] || 'Social')}</a>`).join('');
  const vids = of('video').map(x => { const m = (x[3] || '').match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/); return m ? [m[1], x[4] || ''] : null; }).filter(Boolean).slice(-6).reverse();
  const videos = vids.map(([id, title]) => `<div><button type="button" class="yt" data-yt="${id}" aria-label="Play: ${esc(title || 'video')}" style="background-image:url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)"></button>${title ? `<h3>${esc(title)}</h3>` : ''}</div>`).join('');
  return { reviews, picks, socials, videos, vidIds: vids.map(v => v[0]) };
}

// YouTube channel feeds (public RSS, no key): agents' newest uploads + town guides
const CHANNELS = {"Jamie Leaders": "UCU0lVY1ylYaoj6XO1aNbakQ"};
const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const cleanTitle = s => decode(s).replace(/(^|\s)#[\w-]+/g, '').replace(/\s{2,}/g, ' ').trim();
async function channelVideos(id) {
  if (!/^UC[\w-]{22}$/.test(id || '')) return [];
  try {
    const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + id, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!r.ok) return [];
    const x = await r.text();
    return (x.match(/<entry>[\s\S]*?<\/entry>/g) || []).map(e => [(e.match(/<yt:videoId>([\w-]{11})</) || [])[1], cleanTitle((e.match(/<media:title>([\s\S]*?)<\/media:title>/) || [])[1])]).filter(v => v[0]);
  } catch (e) { return []; }
}
const vidCard = ([id, title]) => `<div><button type="button" class="yt" data-yt="${id}" aria-label="Play: ${esc(title || 'video')}" style="background-image:url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)"></button>${title ? `<h3>${esc(title)}</h3>` : ''}</div>`;
const TOWN_VIDS = {
  '/communities/council-bluffs/': ['Council Bluffs'], '/communities/minden/': ['Minden'], '/communities/neola/': ['Neola'],
  '/communities/avoca/': ['Avoca'], '/communities/underwood/': ['Underwood'], '/communities/shelby/': ['Shelby'], '/communities/persia/': ['Persia'], '/communities/harlan/': ['Harlan'], '/communities/walnut/': ['Walnut'], '/communities/treynor/': ['Treynor'], '/communities/missouri-valley/': ['Missouri Valley'], '/communities/glenwood/': ['Glenwood'], '/communities/omaha-metro/': ['Omaha', 'Elkhorn', 'Papillion', 'La Vista', 'Gretna', 'Bellevue'], '/acreages/': ['acre']
};
const YT_CSS = '<style>.ytg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(18px,2.6vw,30px);margin-top:30px}.ytg .yt{position:relative;aspect-ratio:16/9;background:#0B1B2B center/cover no-repeat;border:0;padding:0;cursor:pointer;display:block;width:100%}.ytg .yt::after{content:"";position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(11,27,43,.78) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath fill=%27%23fff%27 d=%27M8 5v14l11-7z%27/%3E%3C/svg%3E") center/28px no-repeat}.ytg iframe{width:100%;aspect-ratio:16/9;border:0;display:block}.ytg h3{font-size:19px;line-height:1.25;margin-top:12px}@media(max-width:860px){.ytg{grid-template-columns:1fr}}</style>';
const YT_JS = "<script>document.addEventListener('click',function(e){var y=e.target.closest&&e.target.closest('.yt[data-yt]');if(!y||y.dataset.done)return;y.dataset.done=1;var f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+y.getAttribute('data-yt')+'?autoplay=1&rel=0';f.allow='accelerometer; autoplay; encrypted-media; picture-in-picture';f.allowFullscreen=true;y.replaceWith(f);});</script>";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname, slash = p.endsWith('/') ? p : p + '/', t = today();
    for (const [src, dst, code] of REDIRECTS) {
      const hit = src.endsWith('*') ? p.startsWith(src.slice(0, -1)) : (p === src || slash === src);
      if (hit) return Response.redirect(new URL(dst, url).toString(), code);
    }
    if (SCHED[slash] && SCHED[slash] > t) {
      const nf = await env.ASSETS.fetch(new Request(new URL('/__not-found__/', url), request));
      return new Response(nf.body, { status: 404, headers: nf.headers });
    }
    const res = await env.ASSETS.fetch(request);
    const type = res.headers.get('content-type') || '';
    if (type.includes('text/html')) {
      let rw = new HTMLRewriter().on('[data-pub]', { element(el) { if (el.getAttribute('data-pub') > t) el.remove(); } });
      const towns = TOWN_VIDS[slash];
      if (towns) {
        const all = (await Promise.all(Object.values(CHANNELS).map(channelVideos))).flat();
        const seen = {}; const hits = all.filter(v => !seen[v[0]] && (seen[v[0]] = 1) && towns.some(t => v[1].toLowerCase().includes(t.toLowerCase()))).slice(0, 6);
        if (hits.length) {
          const place = towns[0] === 'acre' ? 'acreage' : towns[0];
          const sec = YT_CSS + `<section class="band" id="videos"><div class="wrap"><div class="label"><span class="dot"></span>Watch</div><h2 style="margin-top:14px">${esc(place === 'acreage' ? 'Acreage' : place)} home tours from our team</h2><div class="ytg">${hits.map(vidCard).join('')}</div></div></section>` + YT_JS;
          rw = rw.on('footer', { element(el) { el.before(sec, { html: true }); } });
        }
        return rw.transform(res);
      }
      if (p.startsWith('/agents/')) {
        const rows = await liveRows(); const cache = {};
        const ch = {}; for (const [name, id] of Object.entries(CHANNELS)) if (p.startsWith('/agents/' + name.toLowerCase().replace(/[^a-z]+/g, '-'))) ch[name] = await channelVideos(id);
        const get = n => {
          if (cache[n]) return cache[n];
          const live = agentLive(rows, n), pinned = live.vidIds || [], feed = (ch[n] || []).filter(v => !pinned.includes(v[0]));
          const extra = feed.slice(0, Math.max(0, 6 - pinned.length)).map(vidCard).join('');
          live.videos = (live.videos || '') + extra; return (cache[n] = live);
        };
        rw = rw.on('[data-live]', { element(el) { const v = get(el.getAttribute('data-agent') || '')[el.getAttribute('data-live')]; if (v) el.setInnerContent(v, { html: true }); } })
               .on('[data-live-sec]', { element(el) { if (get(el.getAttribute('data-agent') || '')[el.getAttribute('data-live-sec')]) el.removeAttribute('hidden'); } });
        const out = rw.transform(res); const h = new Headers(out.headers); h.set('cache-control', 'public, max-age=60');
        return new Response(out.body, { status: out.status, headers: h });
      }
      return rw.transform(res);
    }
    if (/(\/sitemap\.xml|\/llms\.txt|\/feed\.xml)$/.test(p) && res.ok) {
      const body = (await res.text()).split('\n').map(line => {
        const m = line.match(MARK);
        if (!m) return line;
        return m[1] > t ? null : line.replace(MARK, '');
      }).filter(l => l !== null).join('\n');
      const h = new Headers(res.headers); h.delete('content-length');
      return new Response(body, { status: res.status, headers: h });
    }
    return res;
  }
};
