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
  var CONSENT = 'I agree to be contacted by J. Leaders Realty LLC via call, email, and text for real estate services. ' +
    'To opt out, you can reply \'stop\' at any time or reply \'help\' for assistance. You can also click the unsubscribe link in the emails. ' +
    'Message and data rates may apply. Message frequency may vary. <a href="/privacy/">Privacy Policy &amp; SMS Terms</a>';
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

  function initForms() {
    var box = document.getElementById('jlr-leads'); if (!box) return;
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
      var ph = f.querySelector('[name=phone]'), em = f.querySelector('[name=email]');
      if (ph) ph.closest('label').firstChild.textContent = 'Phone';
      if (em) em.closest('label').firstChild.textContent = 'Email';
      var c = f.querySelector('.consent'); if (c) c.innerHTML = CONSENT;
      else { c = document.createElement('p'); c.className = 'consent'; c.innerHTML = CONSENT; f.querySelector('.jlr-submit').before(c); }
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
          hm.value = label + ' from the ' + D.address + ', ' + D.city + ' listing site' +
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
        btn.disabled = true; btn.textContent = 'Sending…';
        var send = pixelMode
          ? new Promise(function (ok) { setTimeout(function () { ok({ ok: true }); }, 1500); })   // give the Pixel time to send
          : fetch(CFG.leadsEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
            .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw j; return j; }); });
        send.then(function () {
            f.innerHTML = '<p class="jlr-done">Got it, thank you. We\'ll be in touch shortly. Need us sooner? Call or text <a href="tel:+14027738511">402.773.8511</a>.</p>';
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
