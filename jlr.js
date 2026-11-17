/* J. Leaders Realty listing sites: shared tracking + lead forms.
   Every listing page loads this one file, so IDs only ever change here. */
(function () {
  var CFG = window.JLR_CONFIG = {
    ga4: 'G-0Q0RWN3NFC',             // Google Analytics 4 measurement ID, e.g. G-XXXXXXX
    metaPixel: '',         // Meta Pixel ID (numbers only)
    fubPixel: '',          // Follow Up Boss Pixel script URL (from FUB Admin → Pixel)
    leadsEndpoint: '',     // Cloudflare Worker URL that sends form leads to FUB
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
  if (CFG.fubPixel) load(CFG.fubPixel);

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

  /* ---------- Lead forms ---------- */
  function utm() {
    var q = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (q.get(k)) o[k] = q.get(k); });
    try { if (Object.keys(o).length) sessionStorage.setItem('jlr_utm', JSON.stringify(o)); else o = JSON.parse(sessionStorage.getItem('jlr_utm') || '{}'); } catch (e) {}
    return o;
  }
  utm();

  function initForms() {
    var box = document.getElementById('jlr-leads'); if (!box) return;
    if (!CFG.leadsEndpoint) { box.hidden = true; return; }   // forms stay hidden until the endpoint is live
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
      if (CFG.turnstileSiteKey) {
        var w = document.createElement('div'); w.className = 'cf-turnstile';
        w.setAttribute('data-sitekey', CFG.turnstileSiteKey); w.setAttribute('data-size', 'flexible');
        f.querySelector('.jlr-submit').before(w);
      }
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = f.querySelector('button[type=submit]'), msg = f.querySelector('.jlr-msg');
        var data = Object.fromEntries(new FormData(f).entries());
        if (data.website) return;                            // honeypot
        data.form = f.getAttribute('data-form');
        data.listing = box.dataset;                           // slug, address, city, state, zip, mls, price
        data.page = location.href; data.utm = utm();
        btn.disabled = true; btn.textContent = 'Sending…';
        fetch(CFG.leadsEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw j; return j; }); })
          .then(function () {
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
