/* JLR app shell: bottom tab bar, add-to-home-screen prompt, service worker */
(function(){
  var d=document, w=window, standalone=w.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  if(standalone) d.documentElement.classList.add('is-app');
  if('serviceWorker' in navigator) w.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});
  /* tab bar */
  var p=location.pathname, h=location.hash;
  var tabs=[
    ['home','/','Home','<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'],
    ['search','/search/','Search','<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'],
    ['value','/#value','Home Value','<path d="M4 20V10l8-6 8 6v10"/><path d="M14.5 15.5c0-1.2-1.1-2-2.5-2s-2.5.8-2.5 2 1.1 1.6 2.5 1.9 2.5.8 2.5 2-1.1 2-2.5 2-2.5-.8-2.5-2M12 12v1.5m0 7.5v1.5"/>'],
    ['towns','/#explore','Communities','<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>'],
    ['portal','/portal/','My Portal','<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>']];
  var on=p.indexOf('/portal')===0?'portal':p.indexOf('/search')===0?'search':(p.indexOf('/communities/')===0||h==='#explore'||h==='#towns')?'towns':h==='#value'?'value':(p==='/'?'home':'');
  var nav=d.createElement('nav');nav.className='jlr-tabs';nav.setAttribute('aria-label','App navigation');
  nav.innerHTML=tabs.map(function(t){return '<a href="'+t[1]+'"'+(t[0]===on?' aria-current="page"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+t[3]+'</svg><span>'+t[2]+'</span></a>';}).join('');
  d.body.appendChild(nav);
  nav.addEventListener('click',function(e){var a=e.target.closest('a');if(!a)return;[].forEach.call(nav.querySelectorAll('a'),function(x){x.removeAttribute('aria-current');});if(a.getAttribute('href').indexOf('tel:')!==0)a.setAttribute('aria-current','page');});
  /* client login link: desktop header nav + footer on every page */
  try{
    var nv=d.querySelector('header .nav, header nav');
    if(nv&&!nv.querySelector('a[href="/portal/"]')){var cl=d.createElement('a');cl.href='/portal/';cl.className='jlr-login';cl.textContent='Client Login';var cs=d.createElement('style');cs.textContent='@media(min-width:1200px){header .nav{gap:20px}header .nav a{white-space:nowrap}}@media(min-width:761px) and (max-width:1199px){header .nav a.jlr-login{display:none}}';d.head.appendChild(cs);if(p.indexOf('/portal')===0)cl.setAttribute('aria-current','page');nv.appendChild(cl);}
    var ft=d.querySelector('footer');
    var ex=ft&&[].filter.call(ft.querySelectorAll('b'),function(b){return /explore/i.test(b.textContent)})[0];
    if(ex&&ex.parentNode&&!ft.querySelector('a[href="/portal/"]')){ex.parentNode.insertAdjacentHTML('beforeend','<br><a href="/portal/">Client Login</a>');}
    if(ft&&!ft.querySelector('a[href="/portal/"]')){var fp=d.createElement('p');fp.style.cssText='margin:12px 0 0';fp.innerHTML='<a href="/portal/" style="color:inherit;text-decoration:underline;font-weight:600">Client Login</a> &middot; Buying or selling with us? See where things stand on your file.';ft.appendChild(fp);}
  }catch(e){}
  /* add to home screen prompt */
  var KEY='jlr-a2hs-dismissed', seen=false; try{seen=!!localStorage.getItem(KEY);}catch(e){}
  var ua=navigator.userAgent, ios=/iPhone|iPad|iPod/.test(ua)&&!w.MSStream, safari=ios&&/Safari/.test(ua)&&!/CriOS|FxiOS|EdgiOS/.test(ua), android=/Android/.test(ua), deferred=null;
  function close(){var b=d.getElementById('jlrA2hs');if(b)b.remove();try{localStorage.setItem(KEY,Date.now());}catch(e){}}
  function bar(html){if(standalone||seen||d.getElementById('jlrA2hs')||p.indexOf('/app')===0)return;var b=d.createElement('div');b.id='jlrA2hs';b.className='jlr-a2hs';b.setAttribute('role','dialog');b.setAttribute('aria-label','Add J. Leaders Realty to your home screen');
    b.innerHTML='<img src="/img/app/icon-192.png" alt="" width="44" height="44"><div class="t"><b>Add JLR to your home screen</b>'+html+'</div><button type="button" class="x" aria-label="Not now">×</button>';
    d.body.appendChild(b);b.querySelector('.x').addEventListener('click',close);var i=b.querySelector('.go');if(i)i.addEventListener('click',install);}
  function install(){if(!deferred){location.href='/app/';return;}deferred.prompt();deferred.userChoice.then(function(){deferred=null;close();});}
  w.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;w.jlrInstall=install;if(w.innerWidth<=760)setTimeout(function(){bar('<span>Homes, home values and local guides, one tap away.</span><button type="button" class="go">Install</button>');},4000);
    var ib=d.getElementById('appInstall');if(ib){ib.hidden=false;ib.addEventListener('click',install);}});
  w.addEventListener('appinstalled',close);
  if(safari&&!standalone) setTimeout(function(){bar('<span>Tap <svg class="sh" viewBox="0 0 24 24" aria-label="Share"><path d="M12 15V3m0 0L8 7m4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg> then <b>Add to Home Screen</b>.</span>');},4000);
  else if(ios&&!standalone) setTimeout(function(){bar('<span>Open this page in <b>Safari</b>, tap Share, then <b>Add to Home Screen</b>.</span>');},4000);
})();
/* site search + communities menu (2026-11-24) */
(function(){
  var d=document,w=window;
  var TOWNS=[['council-bluffs','Council Bluffs'],['omaha-metro','Omaha Metro'],['carter-lake','Carter Lake'],['crescent','Crescent'],['treynor','Treynor'],['glenwood','Glenwood'],['malvern','Malvern'],['underwood','Underwood'],['neola','Neola'],['minden','Minden'],['avoca','Avoca'],['walnut','Walnut'],['shelby','Shelby'],['persia','Persia'],['logan','Logan'],['missouri-valley','Missouri Valley'],['harlan','Harlan'],['/acreages/','Acreages']];
  var st=d.createElement('style');
  st.textContent='.jlr-cm{position:relative;display:inline-block}'+
  '.jlr-cm-menu{position:absolute;top:calc(100% + 12px);left:50%;transform:translateX(-50%);z-index:1000;background:#F5F3EE;border:1px solid rgba(11,27,43,.12);border-radius:12px;box-shadow:0 18px 40px rgba(11,27,43,.18);padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;min-width:340px}'+
  '.jlr-cm-menu[hidden]{display:none}'+
  '.jlr-cm-menu a{display:block!important;margin:0!important;padding:8px 10px!important;border-radius:8px;color:#0B1B2B!important;font:500 14px/1.3 Inter,system-ui,sans-serif!important;letter-spacing:0!important;text-transform:none!important;text-decoration:none!important;opacity:1!important;white-space:nowrap}'+
  '.jlr-cm-menu a:hover,.jlr-cm-menu a:focus-visible{background:rgba(212,160,23,.16)}'+
  '.jlr-cm-menu a.all{grid-column:1/-1;border-top:1px solid rgba(11,27,43,.1);border-radius:0;margin-top:4px!important;color:#376FA3!important;font-weight:600!important}'+
  '.jlr-cm-menu.inline{position:static;transform:none;box-shadow:none;border:0;background:transparent;min-width:0;padding:4px 0 8px 12px}'+
  '.jlr-cm-menu.inline a{color:inherit!important;padding:7px 8px!important}'+
  '.jlr-sx-btn{background:none;border:0;padding:8px;margin:0 6px;cursor:pointer;color:inherit;display:inline-flex;align-items:center;border-radius:50%}'+
  '.jlr-sx-btn svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}'+
  '.jlr-sx-btn:hover{background:rgba(212,160,23,.18)}'+
  '.jlr-sx-tab header .menu-btn{margin-left:6px!important}.jlr-sx-in header .nav{gap:16px}.jlr-sx-in header .nav .jlr-sx-btn{margin:0 0 0 -6px;padding:6px}'+
  '.jlr-sx{position:fixed;inset:0;z-index:10000;background:rgba(11,27,43,.55);display:flex;justify-content:center;align-items:flex-start;padding:max(12px,6vh) 12px 12px}'+
  '.jlr-sx[hidden]{display:none}'+
  '.jlr-sx-box{background:#F5F3EE;width:100%;max-width:640px;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.3);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 24px)}'+
  '.jlr-sx form{display:flex;align-items:center;gap:8px;padding:14px 14px 14px 18px;border-bottom:1px solid rgba(11,27,43,.1)}'+
  '.jlr-sx input{flex:1;border:0;background:transparent;font:500 18px/1.3 Inter,system-ui,sans-serif;color:#0B1B2B;outline:none;min-width:0}'+
  '.jlr-sx .x{background:none;border:0;font-size:28px;line-height:1;color:#2B2D31;cursor:pointer;padding:2px 8px}'+
  '.jlr-sx-res{overflow-y:auto;padding:8px}'+
  '.jlr-sx-res a{display:block;padding:10px 12px;border-radius:10px;color:#0B1B2B;text-decoration:none;font:400 14px/1.4 Inter,system-ui,sans-serif}'+
  '.jlr-sx-res a:hover,.jlr-sx-res a:focus-visible,.jlr-sx-res a.on{background:rgba(212,160,23,.16);outline:none}'+
  '.jlr-sx-res b{display:block;font:600 15px/1.35 Montserrat,Inter,sans-serif;margin-bottom:2px}'+
  '.jlr-sx-res small{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#376FA3;margin-bottom:2px}'+
  '.jlr-sx-res span{color:#2B2D31;opacity:.8}'+
  '.jlr-sx-res a.homes{background:#0B1B2B;color:#F5F3EE;margin-bottom:6px}.jlr-sx-res a.homes small{color:#D4A017}.jlr-sx-res a.homes span{color:#F5F3EE}'+
  '.jlr-sx-res p{padding:10px 12px;margin:0;color:#2B2D31;font:400 14px/1.4 Inter,system-ui,sans-serif}';
  d.head.appendChild(st);

  var menuBtn=d.getElementById('menuBtn')||d.querySelector('header .menu-btn');
  function mobile(){return menuBtn&&getComputedStyle(menuBtn).display!=='none';}

  /* Communities dropdown (replaces the old #towns link) */
  try{
    [].forEach.call(d.querySelectorAll('header a'),function(a){
      if(!/^communities$/i.test(a.textContent.trim()))return;
      a.setAttribute('href','/#explore');a.setAttribute('aria-haspopup','true');a.setAttribute('aria-expanded','false');
      var wrap=d.createElement('span');wrap.className='jlr-cm';
      a.parentNode.insertBefore(wrap,a);wrap.appendChild(a);
      var m=d.createElement('div');m.className='jlr-cm-menu';m.hidden=true;
      m.innerHTML=TOWNS.map(function(t){return '<a href="'+(t[0].charAt(0)==='/'?t[0]:'/communities/'+t[0]+'/')+'">'+t[1]+'</a>';}).join('')+'<a class="all" href="/#explore">See the area map &rarr;</a>';
      wrap.appendChild(m);
      a.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var open=m.hidden;m.classList.toggle('inline',mobile());m.hidden=!open;a.setAttribute('aria-expanded',String(open));});
    });
    d.addEventListener('click',function(e){[].forEach.call(d.querySelectorAll('.jlr-cm'),function(c){if(!c.contains(e.target)){c.querySelector('.jlr-cm-menu').hidden=true;c.firstChild.setAttribute('aria-expanded','false');}});});
  }catch(e){}

  /* Site search */
  var data=null,box,input,res,sel=-1;
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function load(){if(data)return Promise.resolve(data);return fetch('/search-index.json').then(function(r){return r.json();}).then(function(j){data=j;return j;}).catch(function(){data=[];return data;});}
  function build(){
    box=d.createElement('div');box.className='jlr-sx';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Search jleadersrealty.org');
    box.innerHTML='<div class="jlr-sx-box"><form role="search" action="/" onsubmit="return false"><input type="search" placeholder="Search towns, guides, blog posts..." aria-label="Search the site" autocomplete="off" enterkeyhint="search"><button type="button" class="x" aria-label="Close search">&times;</button></form><div class="jlr-sx-res" aria-live="polite"></div></div>';
    d.body.appendChild(box);input=box.querySelector('input');res=box.querySelector('.jlr-sx-res');
    box.addEventListener('click',function(e){if(e.target===box)close();});
    box.querySelector('.x').addEventListener('click',close);
    input.addEventListener('input',render);
    input.addEventListener('keydown',function(e){var as=res.querySelectorAll('a');if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,Math.min(as.length-1,sel+(e.key==='ArrowDown'?1:-1)));[].forEach.call(as,function(x,i){x.classList.toggle('on',i===sel);});if(as[sel])as[sel].scrollIntoView({block:'nearest'});}else if(e.key==='Enter'){var t=as[sel>=0?sel:(as.length>1?1:0)];if(t)location.href=t.href;}});
  }
  function render(){
    sel=-1;var q=input.value.trim().toLowerCase();
    var homes='<a class="homes" href="/#search"><small>Homes for sale</small><b>Search every home for sale in Iowa &amp; Nebraska &rarr;</b><span>Map search, saved searches and new-listing alerts.</span></a>';
    if(!q){res.innerHTML=homes+'<a href="/#explore"><small>Communities</small><b>Town guides and area map</b></a><a href="/our-blog/"><small>Blog</small><b>Straight answers for buyers and sellers</b></a><a href="/#value"><small>Selling</small><b>What\'s my home worth?</b></a>';return;}
    var toks=q.split(/\s+/).filter(Boolean).map(function(x){return new RegExp('(^|[^a-z0-9])'+x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));});
    var today='';try{today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});}catch(e){}
    var hits=(data||[]).map(function(p){if(p.p&&today&&p.p>today)return null;var t=(p.t||'').toLowerCase(),k=(p.k||'').toLowerCase(),ds=(p.d||'').toLowerCase(),u=p.u.toLowerCase().replace(/[-\/]/g,' ');var s=0;for(var i=0;i<toks.length;i++){var x=toks[i],m=0;if(x.test(t))m=4;else if(x.test(k))m=3;else if(x.test(u))m=2;else if(x.test(ds))m=1;if(!m)return null;s+=m;}if(t.indexOf(q)===0)s+=5;if(p.c==='Community guide'&&p.u.split('/').length===4)s+=2;return {p:p,s:s};}).filter(Boolean).sort(function(a,b){return b.s-a.s;}).slice(0,12);
    res.innerHTML=homes+(hits.length?hits.map(function(h){return '<a href="'+esc(h.p.u)+'"><small>'+esc(h.p.c)+'</small><b>'+esc(h.p.t)+'</b>'+(h.p.d?'<span>'+esc(h.p.d)+'</span>':'')+'</a>';}).join(''):'<p>No pages match "'+esc(input.value.trim())+'". Try a town name, or call or text the office at <a href="tel:+14027738511" style="display:inline;padding:0">402.773.8511</a>.</p>');
  }
  function open(q){if(!box)build();box.hidden=false;d.documentElement.style.overflow='hidden';if(q)input.value=q;render();load().then(render);setTimeout(function(){input.focus();},30);}
  function close(){if(!box)return;box.hidden=true;d.documentElement.style.overflow='';}
  w.jlrSearch=open;
  try{
    var hw=d.querySelector('header .wrap')||d.querySelector('header'),nv=d.querySelector('header .nav');
    if(hw){var b=d.createElement('button');b.type='button';b.className='jlr-sx-btn';b.setAttribute('aria-label','Search the site');b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
      b.addEventListener('click',function(){open();});
      var sync=function(){var t=d.querySelector('.jlr-tabs'),tabs=t&&getComputedStyle(t).display!=='none';b.style.display=tabs?'none':'';
        if(nv&&!mobile()){if(b.parentNode!==nv)nv.appendChild(b);d.documentElement.classList.add('jlr-sx-in');}
        else{d.documentElement.classList.remove('jlr-sx-in');var c=hw.querySelector('.cta'),ref=(c&&getComputedStyle(c).display!=='none')?c:menuBtn;b.style.marginLeft=ref===menuBtn?'auto':'';d.documentElement.classList.toggle('jlr-sx-tab',ref===menuBtn);if(ref&&ref.parentNode===hw)hw.insertBefore(b,ref);else hw.appendChild(b);}};
      sync();w.addEventListener('resize',sync);}
  }catch(e){}
  d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.jlr-tabs a[href="/search/"]');if(a){e.preventDefault();open();}});
  d.addEventListener('keydown',function(e){if(e.key==='Escape')close();else if(e.key==='/'&&!/input|textarea|select/i.test((e.target.tagName||''))&&!e.target.isContentEditable){e.preventDefault();open();}});
  try{var sq=new URLSearchParams(location.search).get('q');if(sq)open(sq);}catch(e){}
})();
