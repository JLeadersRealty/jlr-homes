/* J. Leaders Realty listing sites: shared tracking + lead forms.
   Every listing page loads this one file, so IDs only ever change here. */
(function () {
  var CFG = window.JLR_CONFIG = {
    ga4: 'G-0Q0RWN3NFC',             // Google Analytics 4 measurement ID, e.g. G-XXXXXXX
    metaPixel: '2822795091494139', // Meta Pixel ("JLR Listing Websites" dataset)
    fubPixel: 'WT-OIINTZCR', // Follow Up Boss Pixel ID (FUB Admin → Integrations → Pixel). Its form capture turns form fills into FUB leads.
    leadsEndpoint: 'https://jlr-leads.jamieleare.workers.dev/',     // Cloudflare Worker URL that sends form leads to FUB
    turnstileSiteKey: ''   // Cloudflare Turnstile site key (spam check)
  };

  function load(src, attrs) {
    var s = document.createElement('script'); s.async = true; s.src = src;
    for (var k in (attrs || {})) s.setAttribute(k, attrs[k]);
    document.head.appendChild(s); return s;
  }

  /* ---------- Google Analytics 4 ---------- */
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };
  if (CFG.ga4) {
    load('https://www.googletagmanager.com/gtag/js?id=' + CFG.ga4);
    gtag('js', new Date()); gtag('config', CFG.ga4);
  }

  /* ---------- Meta Pixel ---------- */
  if (CFG.metaPixel) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', CFG.metaPixel); fbq('track', 'PageView');
  }

  /* ---------- Follow Up Boss Pixel ---------- */
  if (CFG.fubPixel) {
    (function (w, i, d, g, e, t) { w['WidgetTrackerObject'] = g; (w[g] = w[g] || function () { (w[g].q = w[g].q || []).push(arguments); }), (w[g].ds = 1 * new Date());
      (e = 'script'), (t = d.createElement(e)), (e = d.getElementsByTagName(e)[0]); t.async = 1; t.src = i; e.parentNode.insertBefore(t, e); })(window, 'https://widgetbe.com/agent', document, 'widgetTracker');
    window.widgetTracker('create', CFG.fubPixel); window.widgetTracker('send', 'pageview');
  }

  function track(name, params) {
    try { gtag('event', name, params || {}); } catch (e) {}
    try { if (window.fbq) fbq('trackCustom', name, params || {}); } catch (e) {}
  }
  window.JLR_track = track;

  /* ---------- Click tracking: call / text / email / scroll depth ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href');
    if (h.indexOf('tel:') === 0) { track('click_call', { link: h }); if (window.fbq) fbq('track', 'Contact'); }
    else if (h.indexOf('sms:') === 0) { track('click_text', { link: h }); if (window.fbq) fbq('track', 'Contact'); }
    else if (h.indexOf('mailto:') === 0) track('click_email', { link: h });
  });
  var marks = [25, 50, 75, 100], hit = {};
  window.addEventListener('scroll', function () {
    var d = document.documentElement, p = Math.round((d.scrollTop + innerHeight) / d.scrollHeight * 100);
    marks.forEach(function (m) { if (p >= m && !hit[m]) { hit[m] = 1; track('scroll_depth', { percent: m }); } });
  }, { passive: true });

  /* ---------- Listing-agent contact bar (replaces FUB's bar, which shows whoever a contact is assigned to) ---------- */
  function agentBar() {
    var box = document.getElementById('jlr-leads'); if (!box || !box.dataset.agent) return;
    var D = box.dataset, css = document.createElement('style');
    css.textContent =
      'body>iframe:not([src]){display:none!important}' +
      '.jlr-bar{position:fixed;left:12px;right:12px;bottom:12px;z-index:50;background:#0B1B2B;color:#fff;border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:500 14px/1.3 Inter,Helvetica,Arial,sans-serif;transform:translateY(140%);transition:transform .3s}' +
      '.jlr-bar.on{transform:none}.jlr-bar .who{flex:1;min-width:0}.jlr-bar .who b{display:block;font-weight:600}.jlr-bar .who span{opacity:.75;font-size:12px}' +
      '.jlr-bar a{color:#0B1B2B;background:#fff;text-decoration:none;font-weight:600;padding:9px 12px;border-radius:8px;white-space:nowrap}' +
      '.jlr-bar a.alt{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5)}' +
      '@media(min-width:900px){.jlr-bar{left:auto;right:20px;bottom:20px;max-width:460px}}';
    document.head.appendChild(css);
    var bar = document.createElement('div'); bar.className = 'jlr-bar';
    bar.innerHTML = '<div class="who"><b>' + D.agent + '</b><span>Listing agent · ' + (D.agentPhone || '') + '</span></div>' +
      '<a href="tel:+14027738511">Call</a><a class="alt" href="sms:+14027738511">Text</a>';
    document.body.appendChild(bar);
    var show = function () { bar.classList.toggle('on', scrollY > innerHeight * 0.8); };
    addEventListener('scroll', show, { passive: true }); show();
    // keep FUB's injected bar hidden even if it is added later
    new MutationObserver(function () {
      document.querySelectorAll('body>iframe:not([src])').forEach(function (f) { f.style.setProperty('display', 'none', 'important'); });
    }).observe(document.body, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', agentBar); else agentBar();

  /* ---------- Hero video: iPhones only draw frames after one play() ---------- */
  function primeHero() {
    var v = document.getElementById('jlrlHeroVid'); if (!v) return;
    v.muted = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    var prime = function () {
      var p = v.play(); if (p && p.then) p.then(function () { v.pause(); }).catch(function () {});
    };
    if (v.readyState >= 1) prime(); else v.addEventListener('loadedmetadata', prime, { once: true });
    // first touch anywhere also unlocks it on stricter phones
    window.addEventListener('touchstart', prime, { once: true, passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', primeHero); else primeHero();

  /* ---------- Lead forms ---------- */
  // Calls/emails about their request come with submitting. Texting is a separate, optional, unchecked box (carrier best practice).
  var CONSENT = 'By sending this, you agree J. Leaders Realty LLC may contact you by phone and email about your request. ' +
    'You can unsubscribe from emails anytime. <a href="/privacy/">Privacy Policy &amp; SMS Terms</a>';
  var SMS = '<label class="jlr-sms" style="display:flex!important;gap:10px;align-items:flex-start;margin-top:10px;cursor:pointer;font-weight:400">' +
    '<input type="checkbox" name="sms_consent" value="yes" style="width:18px!important;height:18px;padding:0!important;margin:1px 0 0!important;flex:none;accent-color:#0B1B2B">' +
    '<span style="display:block;font-size:12px;line-height:1.45"><b>Text me too (optional).</b> I agree to receive text messages from J. Leaders Realty LLC at the number above about my request, ' +
    'property searches, listings, showings, appointments and market updates. Message frequency varies. Message and data rates may apply. ' +
    'Reply STOP to opt out or HELP for help. Consent is not a condition of any purchase or service.</span></label>';
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function validPhone(s) { var d = digits(s); return d.length === 10 || (d.length === 11 && d[0] === '1'); }
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }
  function utm() {
    var q = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (q.get(k)) o[k] = q.get(k); });
    try { if (Object.keys(o).length) sessionStorage.setItem('jlr_utm', JSON.stringify(o)); else o = JSON.parse(sessionStorage.getItem('jlr_utm') || '{}'); } catch (e) {}
    return o;
  }
  utm();

  // Home-value form: Zillow-style instant estimate (from the jlr-leads Worker) + what happens next.
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function money(n) { return '$' + Number(n).toLocaleString('en-US'); }
  function facts(h) { return [h.beds && h.beds + ' bd', h.baths && h.baths + ' ba', h.sqft && Number(h.sqft).toLocaleString('en-US') + ' sq ft'].filter(Boolean).join(' · '); }
  var FINE = '<p class="jlr-fine">This is an automated estimate, not an appraisal or a market analysis by a licensed agent. It\'s based on public records and nearby listings, ' +
    'can miss updates, condition and land, and isn\'t a guarantee of what your home will sell for. The most accurate number comes from someone seeing the home in person. ' +
    'Questions? Call or text <a href="tel:+14027738511">402.773.8511</a>.</p>';
  // Automated estimates miss badly on acreages and rural homes (tested 11/18: an $800K Persia acreage showed $422K).
  // Never show a number when: the home isn't found in records, the lot is over ~1 acre, or it's an Iowa rural address
  // (5-digit house number or a 100th+ numbered road). Those go to a hand-built range from a local agent.
  function trustEstimate(est, data) {
    var h = est.home || {};
    if (!h.sqft && !h.beds) return false;
    var lot = Number(h.lotSize || h.lotSqft || h.lot || 0);
    if (lot > 43560) return false;
    var addr = String(data.property_address || h.address || '').trim();
    var ia = String(data.property_state || h.state || 'IA').toUpperCase() === 'IA';
    if (ia && /^\d{5,}\b/.test(addr)) return false;
    var road = addr.match(/\b(\d{3,})(st|nd|rd|th)\b/i);
    if (ia && road && Number(road[1]) >= 100) return false;
    return true;
  }
  function valueResult(D, data, est) {
    var first = esc(String(data.name || '').trim().split(/\s+/)[0]);
    var who = D.agent ? esc(String(D.agent).split(' ')[0]) : 'Jamie';
    var how = data.email ? 'email' : 'text';
    var full = esc([data.property_address, data.property_city, data.property_state].filter(Boolean).join(', '));
    if (est && !trustEstimate(est, data)) est = null;   // acreage / rural / home not found: hand-built range instead
    if (!est) {
      return '<div class="jlr-value"><p class="jlr-done">Thanks' + (first ? ', ' + first : '') + '. We looked up <b>' + full + '</b>, but we\'re not showing an instant number for this one.</p>' +
        '<p class="jlr-next"><b>Why no number?</b> Online estimates work best where lots of similar homes have sold recently. Acreages, rural homes, small towns and one-of-a-kind houses usually don\'t have enough true matches nearby, so the computer\'s range comes back too wide to trust. ' +
        'Rather than show you a number that could be way off, ' + who + ' will put together your estimated value range by hand and ' + how + ' it to you within 1 business day.</p>' +
        '<p class="jlr-fine">Questions sooner? Call or text <a href="tel:+14027738511">402.773.8511</a>.</p></div>';
    }
    var h = est.home || {}, comps = (est.comps || []).map(function (c) {
      var st = /active/i.test(c.status) && !/inactive/i.test(c.status) ? 'For sale' : 'Recently listed';
      return '<li><div><b>' + money(c.price) + '</b><span>' + esc(c.address) + '</span><span>' + esc(facts(c)) + '</span></div><em>' + st +
        (c.miles != null ? '<br>' + Number(c.miles).toFixed(1) + ' mi' : '') + '</em></li>';
    }).join('');
    return '<div class="jlr-value"><p class="jlr-est-l">Estimated value' + (first ? ' for ' + first : '') + '</p>' +
      '<p class="jlr-est">' + money(est.price) + '</p>' +
      '<div class="jlr-rng"><span>' + money(est.low) + '</span><i></i><span>' + money(est.high) + '</span></div>' +
      '<p class="jlr-home"><b>' + esc(h.address || full) + '</b><br>' + esc(facts(h)) + (h.year ? ' · Built ' + esc(h.year) : '') +
      '<br><small>Details wrong or recently updated? ' + who + ' will factor that in.</small></p>' +
      (comps ? '<p class="jlr-snap-h">Nearby homes used for this estimate</p><ul class="jlr-comps">' + comps + '</ul>' : '') +
      '<p class="jlr-next"><b>What\'s next:</b> ' + who + ' will ' + how + ' you within 1 business day with a closer look based on recent local sales. No pressure, no obligation.</p>' +
      FINE + '</div>';
  }
  function snapCss() {
    var st = document.createElement('style');
    st.textContent = '.jlr-est-l{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6e73;margin:0}' +
      '.jlr-est{font-family:"DM Serif Display",Georgia,serif;font-size:clamp(40px,8vw,56px);line-height:1.05;color:#0B1B2B;margin:4px 0 12px}' +
      '.jlr-rng{display:flex;align-items:center;gap:10px;font-size:14px;color:#2B2D31;margin-bottom:16px}.jlr-rng i{flex:1;height:6px;border-radius:3px;background:linear-gradient(90deg,#d6d3cd,#0B1B2B 50%,#d6d3cd)}' +
      '.jlr-home{font-size:15px;line-height:1.5;margin:0 0 6px}.jlr-home small{color:#6b6e73;font-size:12px}' +
      '.jlr-snap-h{font-weight:600;margin:20px 0 8px}.jlr-comps{list-style:none;margin:0;padding:0;border-top:1px solid #e7e5e1}' +
      '.jlr-comps li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #e7e5e1;font-size:14px}' +
      '.jlr-comps b{display:block;font-size:16px}.jlr-comps span{display:block;color:#6b6e73;font-size:13px}.jlr-comps em{font-style:normal;font-size:12px;color:#6b6e73;text-align:right;white-space:nowrap}' +
      '.jlr-next{margin:18px 0 0;font-size:15px}.jlr-fine{font-size:12px;color:#6b6e73;margin:14px 0 0;line-height:1.5}' +
      '.jlr-addr2{display:grid;gap:12px;grid-template-columns:2fr 1fr 1fr}@media(max-width:559px){.jlr-addr2{grid-template-columns:1fr 1fr}.jlr-addr2 label:first-child{grid-column:1/-1}}' +
      '.jlr-addr2 select{font:inherit;font-size:16px;padding:12px 10px;border:1px solid #d6d3cd;border-radius:6px;background:#fff;width:100%}';
    document.head.appendChild(st);
  }
  // Older pages only have a street field: add City / State / ZIP so the estimate can find the home.
  function addrFields(f) {
    var pa = f.querySelector('[name=property_address]'); if (!pa || f.querySelector('[name=property_city]')) return;
    pa.closest('label').firstChild.textContent = 'Street address';
    var row = document.createElement('div'); row.className = 'jlr-addr2';
    row.innerHTML = '<label>City<input name="property_city" autocomplete="address-level2" required></label>' +
      '<label>State<select name="property_state" autocomplete="address-level1"><option>IA</option><option>NE</option></select></label>' +
      '<label>ZIP<input name="property_zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" required></label>';
    pa.closest('label').after(row);
  }

  function initForms() {
    var box = document.getElementById('jlr-leads'); if (!box) return; snapCss();
    if (CFG.leadsEndpoint) {   // Worker mode: our script sends the lead, so stop the Pixel from capturing it twice
      addEventListener('submit', function (e) { if (box.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); e.target.dispatchEvent(new CustomEvent('jlr-submit')); } }, true);
    }
    var pixelMode = !CFG.leadsEndpoint && !!CFG.fubPixel;     // no Worker yet: the FUB Pixel captures the form fill
    if (!CFG.leadsEndpoint && !pixelMode) { box.hidden = true; return; }
    box.hidden = false;
    if (CFG.turnstileSiteKey) load('https://challenges.cloudflare.com/turnstile/v0/api.js');

    var tabs = box.querySelectorAll('[data-tab]'), panes = box.querySelectorAll('.wrap > form[data-form]');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.setAttribute('aria-selected', x === t); });
        panes.forEach(function (f) { f.hidden = f.getAttribute('data-form') !== t.getAttribute('data-tab'); });
      });
    });

    box.querySelectorAll('form[data-form]').forEach(function (f) {
      // Phone and email are each optional, but we need at least one real way to reach them
      f.querySelectorAll('[name=phone],[name=email]').forEach(function (i) { i.required = false; });
      addrFields(f);
      var ph = f.querySelector('[name=phone]'), em = f.querySelector('[name=email]');
      if (ph) ph.closest('label').firstChild.textContent = 'Phone';
      if (em) em.closest('label').firstChild.textContent = 'Email';
      var c = f.querySelector('.consent'); if (c) c.innerHTML = CONSENT + SMS;
      else { c = document.createElement('p'); c.className = 'consent'; c.innerHTML = CONSENT + SMS; f.querySelector('.jlr-submit').before(c); }
      if (CFG.turnstileSiteKey) {
        var w = document.createElement('div'); w.className = 'cf-turnstile';
        w.setAttribute('data-sitekey', CFG.turnstileSiteKey); w.setAttribute('data-size', 'flexible');
        f.querySelector('.jlr-submit').before(w);
      }
      // Summary line the FUB Pixel can pick up as the lead's message (says which home and what they want)
      if (!f.querySelector('[name=message]')) {
        var hm = document.createElement('input'); hm.type = 'hidden'; hm.name = 'message'; f.appendChild(hm);
        var label = { showing: 'Showing request', alerts: 'Price/status alerts', home_value: 'Home value request' }[f.getAttribute('data-form')] || 'Inquiry';
        var sync = function () {
          var D = box.dataset, w = f.querySelector('[name=when]'), pa = f.querySelector('[name=property_address]');
          hm.value = label + (D.address ? ' from the ' + D.address + ', ' + D.city + ' listing site' : ' from the JLR website') +
            (w && w.value ? '. Best time: ' + w.value : '') + (pa && pa.value ? '. Their home: ' + pa.value : '') + '. ' + location.href;
        };
        f.addEventListener('input', sync); sync();
      }
      f.addEventListener(CFG.leadsEndpoint ? 'jlr-submit' : 'submit', function (e) {
        if (e.preventDefault) e.preventDefault();
        var btn = f.querySelector('button[type=submit]'), msg = f.querySelector('.jlr-msg');
        var data = Object.fromEntries(new FormData(f).entries());
        if (data.website) return;                            // honeypot
        msg.textContent = '';
        var okPhone = validPhone(data.phone), okEmail = validEmail(data.email);
        if (data.phone && !okPhone) { msg.textContent = 'That phone number doesn\'t look right. Please use a 10-digit number.'; ph && ph.focus(); return; }
        if (data.email && !okEmail) { msg.textContent = 'That email doesn\'t look right. Please double-check it.'; em && em.focus(); return; }
        if (!okPhone && !okEmail) { msg.textContent = 'Please give us a phone number or email so we can get back to you.'; (ph || em).focus(); return; }
        data.form = f.getAttribute('data-form');
        data.listing = Object.assign({}, box.dataset);                           // slug, address, city, state, zip, mls, price
        data.page = location.href; data.utm = utm();
        btn.disabled = true; btn.textContent = data.form === 'home_value' ? 'Looking up your home…' : 'Sending…';
        var send = pixelMode
          ? new Promise(function (ok) { setTimeout(function () { ok({ ok: true }); }, 1500); })   // give the Pixel time to send
          : fetch(CFG.leadsEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
            .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw j; return j; }); });
        send.then(function (res) {
            f.innerHTML = data.form === 'home_value' ? valueResult(box.dataset, data, res && res.estimate)
              : '<p class="jlr-done">Got it, thank you. We\'ll be in touch shortly. Need us sooner? Call or text <a href="tel:+14027738511">402.773.8511</a>.</p>';
            track('generate_lead', { form: data.form, listing: data.listing.slug });
            if (window.fbq) fbq('track', 'Lead', { content_name: data.listing.slug });
          })
          .catch(function () {
            btn.disabled = false; btn.textContent = 'Try again';
            msg.textContent = 'That didn\'t go through. Please call or text 402.773.8511 and we\'ll get you taken care of.';
          });
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initForms); else initForms();
})();
