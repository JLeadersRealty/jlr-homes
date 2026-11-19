/* J. Leaders Realty main website: sends every form to Follow Up Boss through the same
   jlr-leads Cloudflare Worker the listing sites use. Loaded on every page. */
(function () {
  var ENDPOINT = 'https://jlr-leads.jamieleare.workers.dev/';
  var PAGE = (document.body.getAttribute('data-page') || location.pathname.replace(/\//g, ' ').trim() || 'home');

  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function validPhone(s) { var d = digits(s); return d.length === 10 || (d.length === 11 && d[0] === '1'); }
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }
  function money(n) { return '$' + Number(n).toLocaleString('en-US'); }
  function utm() {
    var q = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (q.get(k)) o[k] = q.get(k); });
    try { if (Object.keys(o).length) sessionStorage.setItem('jlr_utm', JSON.stringify(o)); else o = JSON.parse(sessionStorage.getItem('jlr_utm') || '{}'); } catch (e) {}
    return o;
  }
  utm();
  function track(name, params) {
    try { if (window.gtag) gtag('event', name, params || {}); } catch (e) {}
    try { if (window.fbq) fbq('track', 'Lead', params || {}); } catch (e) {}
  }

  // One way in for every form on the site
  function send(form, data) {
    data.form = form;
    var B = document.body; // agent pages route leads straight to that agent
    data.listing = { slug: 'website-' + PAGE, source: 'JLR Website', address: '', city: '', state: 'IA', agent: B.getAttribute('data-agent') || 'Jamie Leaders', agentId: B.getAttribute('data-agent-id') || '1' };
    data.page = location.href; data.utm = utm();
    data.message = (data.message || '') + (data.message ? ' · ' : '') + 'From the JLR website (' + PAGE + '). ' + location.href;
    return fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw j; track('generate_lead', { form: form, page: PAGE }); return j; }); });
  }
  var FAIL = 'That didn\'t go through. Please call or text <a href="tel:+14027738511">402.773.8511</a> and we\'ll take care of you.';

  // Split "123 Main St, Minden, IA 51553" into parts the estimate lookup needs
  function splitAddr(s) {
    var p = String(s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean), o = { property_address: p[0] || '' };
    if (p[1]) o.property_city = p[1];
    var tail = (p[2] || '') + ' ' + (p[3] || ''), st = tail.match(/\b(IA|NE|Iowa|Nebraska)\b/i), z = tail.match(/\b\d{5}\b/);
    o.property_state = st ? (/^ne/i.test(st[1]) ? 'NE' : 'IA') : 'IA';
    if (z) o.property_zip = z[0];
    return o;
  }

  // Home value: same rules as the listing sites. No instant number for acreages, rural or hard-to-match homes.
  function trustEstimate(est, data) {
    var h = est.home || {};
    if (!h.sqft && !h.beds) return false;
    var lot = Number(h.lotSize || h.lotSqft || h.lot || 0);
    if (lot > 43560) return false;
    var addr = String(data.property_address || h.address || '').trim(), ia = String(data.property_state || 'IA').toUpperCase() === 'IA';
    if (ia && /^\d{5,}\b/.test(addr)) return false;
    var road = addr.match(/\b(\d{3,})(st|nd|rd|th)\b/i);
    if (ia && road && Number(road[1]) >= 100) return false;
    return true;
  }
  function valueHtml(data, est) {
    var first = esc(String(data.name || '').trim().split(/\s+/)[0]), how = data.email ? 'email' : 'text';
    if (est && !trustEstimate(est, data)) est = null;
    if (!est) return '<b>Thanks' + (first ? ', ' + first : '') + '. We\'ll build this one by hand.</b>' +
      'Online estimates work best where lots of similar homes have sold recently. Acreages, rural homes and one-of-a-kind houses usually don\'t have enough true matches, so instead of a number that could be way off, Jamie will put together your value range by hand and ' + how + ' it to you within 1 business day.';
    return '<b>Estimated value: ' + money(est.price) + '</b>Likely range ' + money(est.low) + ' to ' + money(est.high) + '. ' +
      'This is an automated estimate, not an appraisal, and it can miss updates, condition and land. Jamie will ' + how + ' you within 1 business day with a closer look based on recent local sales.';
  }

  function addField(form, before, html) { var d = document.createElement('div'); d.innerHTML = html; while (d.firstChild) form.insertBefore(d.firstChild, before); }

  // The FUB Pixel adds its own "Questions? Call or text" box. We already have chat + call/text buttons, so hide it (same as the listing sites).
  function hideFubBar() {
    var st = document.createElement('style'); st.textContent = 'body>iframe:not([src]){display:none!important}'; document.head.appendChild(st);
    new MutationObserver(function () { document.querySelectorAll('body>iframe:not([src])').forEach(function (f) { f.style.setProperty('display', 'none', 'important'); }); })
      .observe(document.body, { childList: true });
  }
  function setup() {
    hideFubBar();
    /* ---- Home value form ---- */
    var vf = $('valForm');
    if (vf) {
      var btn = vf.querySelector('button[type=submit]');
      if (!$('vname')) addField(vf, btn, '<div class="row2"><div class="field"><label for="vname">Your name</label><input id="vname" autocomplete="name"></div><div class="field"><label for="vemail">Email</label><input id="vemail" type="email" autocomplete="email"></div></div>');
      if (!$('vphone')) addField(vf, btn, '<div class="field"><label for="vphone">Phone (optional)</label><input id="vphone" type="tel" autocomplete="tel"></div>');
      vf.addEventListener('submit', function (e) {
        e.preventDefault(); e.stopImmediatePropagation();
        var out = $('valOut'), a = $('addr').value.trim(), d = { name: $('vname').value.trim(), email: $('vemail').value.trim(), phone: $('vphone').value.trim() };
        out.hidden = false;
        if (!a) { out.innerHTML = '<b>Add your address</b>Type the property address so we can look it up.'; return; }
        if (!validEmail(d.email) && !validPhone(d.phone)) { out.innerHTML = '<b>Almost there</b>Add your email or phone so we can send your number.'; return; }
        Object.assign(d, splitAddr(a)); d.message = 'Home value request for ' + a;
        btn.disabled = true; btn.textContent = 'Looking up your home…';
        send('home_value', d).then(function (res) { out.innerHTML = valueHtml(d, res && res.estimate); btn.hidden = true; })
          .catch(function () { btn.disabled = false; btn.textContent = 'Try again'; out.innerHTML = FAIL; });
      }, true);
    }

    /* ---- Email list (acreages / private list) ---- */
    var af = $('acreForm');
    if (af) {
      if (!$('acreName')) { var n = document.createElement('input'); n.id = 'acreName'; n.placeholder = 'First name'; n.autocomplete = 'given-name'; n.style.maxWidth = '34%'; af.insertBefore(n, af.firstChild.nextSibling); }
      af.addEventListener('submit', function (e) {
        e.preventDefault(); e.stopImmediatePropagation();
        var msg = $('acreMsg'), em = $('acreEmail').value.trim(), nm = $('acreName').value.trim();
        if (!validEmail(em)) { msg.textContent = 'Add a good email address to get on the list.'; return; }
        var list = (document.querySelector('#private .label, .acreband .label') || {}).textContent || 'Email list';
        send('alerts', { name: nm || em.split('@')[0], email: em, message: 'Joined: ' + list.trim() })
          .then(function () { msg.textContent = 'You\'re on the list. Watch your inbox.'; af.hidden = true; })
          .catch(function () { msg.innerHTML = FAIL; });
      }, true);
    }

    /* ---- Pop-up (price alerts / ask a question / net sheet / search requests) ---- */
    var mf = $('mForm');
    if (mf) {
      var ok = $('mOk');
      if (ok && ok.parentNode) ok.parentNode.lastChild.textContent = ' Text me too (optional). I agree to receive texts from J. Leaders Realty LLC about my request. Msg & data rates may apply. Reply STOP to opt out. Consent isn\'t required to work with us.';
      if (!$('mEmail')) addField(mf, $('mMsgWrap'), '<div class="field"><label for="mEmail">Email (optional)</label><input id="mEmail" type="email" autocomplete="email"></div>');
      mf.addEventListener('submit', function (e) {
        e.preventDefault(); e.stopImmediatePropagation();
        var done = $('mDone'), ph = $('mPhone').value.trim(), em = $('mEmail').value.trim(), mode = $('mEyebrow').textContent;
        if (!validPhone(ph) && !validEmail(em)) { done.hidden = false; done.innerHTML = '<b>Almost there</b>Add a phone number or email so we can get back to you.'; return; }
        var data = { name: $('mName').value.trim(), phone: ph, email: em, sms_consent: ok && ok.checked ? 'yes' : '',
          message: $('mTitle').textContent + ($('mMsg').value ? ': ' + $('mMsg').value : '') };
        var b = $('mBtn'); b.disabled = true; b.textContent = 'Sending…';
        send(/alert/i.test(mode) ? 'alerts' : 'question', data).then(function () {
          mf.hidden = true; done.hidden = false;
          done.innerHTML = '<b>Got it, thank you.</b>We\'ll be in touch shortly. Need us sooner? Call or text <a href="tel:+14027738511">402.773.8511</a>.';
        }).catch(function () { b.disabled = false; b.textContent = 'Try again'; done.hidden = false; done.innerHTML = FAIL; });
      }, true);
    }

    /* ---- Home search (Phase 1: full MLS search launches with IDX) ---- */
    var sf = $('sForm');
    if (sf) {
      sf.addEventListener('submit', function (e) {
        e.preventDefault(); e.stopImmediatePropagation();
        var v = function (id) { var x = $(id); return x ? x.value : ''; };
        var want = [v('sLoc'), v('sMin') + ' to ' + v('sMax'), v('sBeds') + ' beds', v('sType')].join(' · ');
        var out = $('sOut'); out.hidden = false;
        out.innerHTML = '<b>Our full MLS search is almost here.</b>Until it launches, tell us what you\'re looking for and we\'ll send you every match, including homes before they hit the big websites. <button type="button" class="btn" id="sAsk" style="margin-top:12px">Send me matches</button>';
        $('sAsk').onclick = function () { openModal('Home Search', 'Send me homes that match', 'We\'ll set up a search for: ' + want + '. You\'ll get new matches as soon as they list.', want, 'Send me matches'); };
      }, true);
    }

    /* ---- Chat: when they leave a number or email, it goes to FUB with the conversation ---- */
    var cf = $('chatForm');
    if (cf) cf.addEventListener('submit', function () {
      var t = ($('chatTxt').value || '').trim();
      if (validPhone(t) || validEmail(t)) {
        var log = [].map.call(document.querySelectorAll('#chatLog .msg.me'), function (m) { return m.textContent; }).join(' / ');
        send('question', { name: 'Website chat', phone: validPhone(t) ? t : '', email: validEmail(t) ? t : '', sms_consent: validPhone(t) ? 'yes' : '', message: 'Chat: ' + log }).catch(function () {});
      }
    }, true);

    /* consent + privacy wording in the chat */
    var cl = $('chatLog');
    if (cl) new MutationObserver(function () {
      [].forEach.call(cl.querySelectorAll('.msg.bot'), function (m) {
        if (/By sharing your number/.test(m.textContent)) m.textContent = 'We\'ll text you back about your question. Msg & data rates may apply. Reply STOP anytime. Privacy: jleadersrealty.org/privacy';
        if (/On the live site/.test(m.textContent)) m.textContent = m.textContent.replace(/\s*\(On the live site[^)]*\)/, '');
      });
    }).observe(cl, { childList: true });
  }

  function openModal(eyebrow, title, desc, msg, btnText) {
    var m = $('modal'); if (!m) return;
    $('mForm').hidden = false; $('mDone').hidden = true; $('mForm').reset();
    $('mEyebrow').textContent = eyebrow; $('mTitle').textContent = title; $('mDesc').textContent = desc;
    $('mMsgWrap').hidden = false; $('mMsg').value = msg || ''; $('mBtn').textContent = btnText || 'Send';
    m.hidden = false; setTimeout(function () { $('mName').focus(); }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
