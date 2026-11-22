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
