/* =====================================================================
   LAPISAN ANIMASI PREMIUM (tambahan) — membungkus fungsi asli tanpa mengubah logikanya
   ===================================================================== */
(function(){
'use strict';
var T0=performance.now();
var RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
var g=function(id){return document.getElementById(id);};
var READY=false, cur='dashboard';
var nav=document.querySelector('body > nav');
var navBox=nav&&nav.firstElementChild;

/* ---------- Toast ---------- */
var host=document.createElement('div'); host.id='toastHost'; host.setAttribute('aria-live','polite'); document.body.appendChild(host);
function toast(msg,type,title){
  type=type||'success';
  var t=document.createElement('div'); t.className='toast '+type; t.setAttribute('role',type==='error'?'alert':'status');
  var ic=type==='success'?'fa-check':'fa-triangle-exclamation';
  t.innerHTML='<div class="ti"><i class="fa-solid '+ic+'"></i></div><div><b>'+(title||(type==='success'?'Berhasil':'Gagal'))+'</b><span class="tm"></span></div><div class="tbar"></div>';
  t.querySelector('.tm').textContent=msg; host.appendChild(t);
  while(host.children.length>3) host.removeChild(host.firstChild);
  var close=function(){ if(!t.parentNode) return; t.classList.add('out'); setTimeout(function(){ t.remove(); },360); };
  t.addEventListener('click',close); setTimeout(close,3400);
}
window.uiToast=toast;

/* ---------- Angka count-up + indikator perubahan ---------- */
var COUNT_IDS=['statTotalMasuk','statTotalKeluar','statSaldoAkhir','statTotalWarga','statLunasCount','statIuranTerkumpul','statTunggakan','statIuranBulan','kasRptMasuk','kasRptKeluar','kasRptAkhir'];
var DASH_IDS=COUNT_IDS.slice(0,8);
var nf=new Intl.NumberFormat('id-ID');
function parseNum(t){ var m=String(t).match(/\d[\d.]*/); if(!m) return null; return {pre:t.slice(0,m.index),post:t.slice(m.index+m[0].length),n:parseInt(m[0].replace(/\./g,''),10),full:t}; }
function easeOut(t){ return t>=1?1:1-Math.pow(2,-10*t); }
function put(el,s){ el._shown=s; el.textContent=s; if(el._obs) el._obs.takeRecords(); }
function flash(el,dir){ el.classList.remove('val-up','val-down'); void el.offsetWidth; el.classList.add(dir==='up'?'val-up':'val-down'); }
function run(el,p,from,dur){
  cancelAnimationFrame(el._raf);
  if(RM||!el.offsetParent||dur<=0||from===p.n){ put(el,p.full); el._cur=p.n; return; }
  var t0=performance.now();
  (function step(now){
    var k=Math.min(1,(now-t0)/dur), v=Math.round(from+(p.n-from)*easeOut(k));
    put(el,k>=1?p.full:p.pre+nf.format(v)+p.post); el._cur=v;
    if(k<1) el._raf=requestAnimationFrame(step);
  })(t0);
}
function onChange(el){
  var txt=el.textContent; if(txt===el._shown) return;
  var p=parseNum(txt); if(!p) return;
  var prev=el._target;
  if(prev===p.n){ el._fin=p; return; }
  el._target=p.n; el._fin=p;
  if(!READY){ el._cur=p.n; el._shown=txt; return; }
  if(prev!==undefined) flash(el,p.n>prev?'up':'down');
  run(el,p,el._cur!=null?el._cur:0,prev===undefined?1100:800);
}
COUNT_IDS.forEach(function(id){
  var el=g(id); if(!el) return;
  var o=new MutationObserver(function(){ onChange(el); });
  o.observe(el,{childList:true,characterData:true,subtree:true}); el._obs=o;
  el.addEventListener('animationend',function(){ el.classList.remove('val-up','val-down'); });
});
function countAll(ids,dur){ (ids||COUNT_IDS).forEach(function(id){ var el=g(id); if(el&&el._fin) run(el,el._fin,0,dur||1600); }); }
function finishAll(){ COUNT_IDS.forEach(function(id){ var el=g(id); if(el&&el._fin){ cancelAnimationFrame(el._raf); put(el,el._fin.full); el._cur=el._fin.n; } }); }
window.addEventListener('beforeprint',finishAll);

/* ---------- Grafik: animasi bertahap ---------- */
(function(){
  if(!window.Chart) return;
  try{
    var CD=Chart.defaults;
    CD.font.family="'Noto Sans','Inter',system-ui,sans-serif"; CD.font.size=12; CD.color='#5b6b62'; CD.borderColor='rgba(11,61,46,.07)';
    var L=CD.plugins.legend.labels; L.usePointStyle=true; L.pointStyle='circle'; L.boxWidth=8; L.boxHeight=8; L.padding=18;
    var TT=CD.plugins.tooltip; TT.backgroundColor='rgba(4,59,46,.96)'; TT.titleColor='#fde68a'; TT.bodyColor='#ffffff'; TT.footerColor='#e0c27a';
    TT.borderColor='rgba(245,185,66,.7)'; TT.borderWidth=1; TT.cornerRadius=12; TT.padding=12; TT.boxPadding=6;
    TT.titleFont={weight:'600'}; TT.footerFont={weight:'600'};
    CD.elements.point.hoverRadius=6; CD.elements.point.backgroundColor='#ffffff'; CD.elements.point.borderWidth=2;
  }catch(e){}
  try{
    if(RM){ Chart.defaults.animation=false; return; }
    var A=Chart.defaults.animation||{};
    A.duration=1800; A.easing='easeOutQuart';
    A.delay=function(c){ return (c.type==='data'&&c.mode==='default')?c.dataIndex*110+c.datasetIndex*200:0; };
  }catch(e){}
})();

/* ---------- Muncul bertahap (fade-in + slide-up) ---------- */
var io=null, tok=0;
function mkIO(){
  if(io||!('IntersectionObserver' in window)) return;
  io=new IntersectionObserver(function(es){
    es.forEach(function(en){
      if(!en.isIntersecting) return;
      var el=en.target; io.unobserve(el); el.classList.add('rv-in');
      var d=parseInt(el.style.getPropertyValue('--rvd'))||0, my=el._rt;
      setTimeout(function(){ if(el._rt!==my) return; el.classList.remove('rv','rv-in'); el.style.removeProperty('--rvd'); },d+1000);
    });
  },{threshold:0,rootMargin:'0px 0px -6% 0px'});
}
function targets(sec){
  var out=[]; Array.prototype.forEach.call(sec.children,function(c){
    if(c.classList.contains('grid')) Array.prototype.push.apply(out,c.children); else out.push(c);
  }); return out;
}
function prep(sec){
  if(RM||!sec) return; mkIO(); if(!io) return;
  var n=0, list=targets(sec).filter(function(el){ return !el.classList.contains('hidden'); });
  list.forEach(function(el){ el._rt=++tok; el.classList.remove('rv-in'); el.classList.add('rv'); el.style.setProperty('--rvd',Math.min(n++,8)*70+'ms'); });
  void sec.offsetHeight;
  list.forEach(function(el){ io.observe(el); });
}

/* ---------- Navigasi: indikator hijau, sticky, drawer HP ---------- */
var ind=null;
if(navBox){ ind=document.createElement('span'); ind.id='navInd'; navBox.appendChild(ind); }
var first=true;
function moveInd(){
  if(!ind||!navBox||!navBox.offsetWidth) return;
  var b=g('tab-'+cur); if(!b) return;
  if(first){ ind.style.transition='none'; }
  ind.style.width=b.offsetWidth+'px';
  ind.style.transform='translate('+b.offsetLeft+'px,'+(b.offsetTop+b.offsetHeight-2)+'px)';
  if(first){ void ind.offsetWidth; ind.style.transition=''; first=false; }
  if(navBox.scrollWidth>navBox.clientWidth){ try{ navBox.scrollTo({left:b.offsetLeft-(navBox.clientWidth-b.offsetWidth)/2,behavior:RM?'auto':'smooth'}); }catch(e){} }
}
if(window.ResizeObserver&&navBox){ var ro=new ResizeObserver(function(){ moveInd(); }); ro.observe(navBox); Array.prototype.forEach.call(navBox.querySelectorAll('.tab-btn'),function(b){ ro.observe(b); }); }
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ first=true; moveInd(); });
window.addEventListener('resize',moveInd);

/* bar HP + drawer */
var tabs=[].slice.call(document.querySelectorAll('.tab-btn')).map(function(b){
  return {id:b.id.replace('tab-',''),label:b.textContent.replace(/\s+/g,' ').trim(),icon:b.querySelector('i')?b.querySelector('i').className:'fa-solid fa-circle'};
});
var logoSrc=(g('hdrLogo')||g('logoPak')||{}).src||'';
var mBar=document.createElement('div'); mBar.id='mBar';
mBar.innerHTML='<button type="button" id="mBurger" data-ripple="dark" aria-label="Buka menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button><div class="mb-title"><i></i><span></span></div>';
if(nav) nav.parentNode.insertBefore(mBar,nav);
var overlay=document.createElement('div'); overlay.id='drawerOverlay';
var drawer=document.createElement('aside'); drawer.id='drawer'; drawer.setAttribute('aria-label','Menu navigasi');
drawer.innerHTML='<div class="dr-head">'+(logoSrc?'<img alt="" src="">':'<div class="dr-ico"><i class="fa-solid fa-mosque"></i></div>')+'<div><p>PAK Ar-Royyan</p><p>Laporan Keuangan 2026</p></div></div><div class="dr-list"></div><div class="dr-foot">&copy; 2026 Panitia Amal Kematian</div>';
var list=drawer.querySelector('.dr-list');
tabs.forEach(function(t,i){
  var b=document.createElement('button'); b.type='button'; b.className='dr-item'; b.dataset.tab=t.id; b.dataset.ripple='light'; b.style.setProperty('--i',i);
  b.innerHTML='<i class="'+t.icon+'"></i><span></span>'; b.lastChild.textContent=t.label; list.appendChild(b);
  b.addEventListener('click',function(){ closeDrawer(); setTimeout(function(){ if(typeof window.switchTab==='function') window.switchTab(t.id); },160); });
});
document.body.appendChild(overlay); document.body.appendChild(drawer);
var di=drawer.querySelector('.dr-head img'); if(di) di.src=logoSrc;
var burger=g('mBurger');
function openDrawer(){ drawer.classList.add('open'); overlay.classList.add('open'); burger.classList.add('open'); burger.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; }
function closeDrawer(){ drawer.classList.remove('open'); overlay.classList.remove('open'); burger.classList.remove('open'); burger.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }
burger.addEventListener('click',function(){ drawer.classList.contains('open')?closeDrawer():openDrawer(); });
overlay.addEventListener('click',closeDrawer);
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeDrawer(); });
window.addEventListener('resize',function(){ if(window.innerWidth>=768) closeDrawer(); });
function syncMobile(){
  var t=tabs.filter(function(x){ return x.id===cur; })[0]; if(!t) return;
  var bt=mBar.querySelector('.mb-title'); bt.querySelector('i').className=t.icon; bt.querySelector('span').textContent=t.label;
  bt.classList.remove('swap'); void bt.offsetWidth; bt.classList.add('swap');
  [].forEach.call(list.children,function(b){ b.classList.toggle('active',b.dataset.tab===cur); });
}
syncMobile();

/* sticky shadow + progres gulir */
var bar=document.createElement('div'); bar.id='scrollBar'; document.body.appendChild(bar);
var ticking=false;
function onScroll(){
  if(ticking) return; ticking=true;
  requestAnimationFrame(function(){
    var y=window.pageYOffset, h=document.documentElement.scrollHeight-window.innerHeight;
    bar.style.transform='scaleX('+(h>0?Math.min(1,y/h):0)+')';
    var hd=document.querySelector('header'), lim=hd?hd.offsetHeight:60;
    if(nav) nav.classList.toggle('is-stuck',y>lim); mBar.classList.toggle('is-stuck',y>lim);
    ticking=false;
  });
}
window.addEventListener('scroll',onScroll,{passive:true}); onScroll();

/* ---------- Bungkus switchTab ---------- */
var _sw=window.switchTab;
if(typeof _sw==='function'){
  window.switchTab=function(t){
    var r=_sw.apply(this,arguments);
    try{
      cur=t; moveInd(); syncMobile();
      var sec=g('content-'+t); prep(sec);
      if(t==='dashboard') setTimeout(function(){ countAll(DASH_IDS,1500); },120);
      var bh=(nav&&nav.offsetParent?nav.offsetHeight:mBar.offsetHeight)||0;
      var top=document.querySelector('main').getBoundingClientRect().top+window.pageYOffset-bh-8;
      if(window.pageYOffset>top) window.scrollTo({top:Math.max(0,top),behavior:RM?'auto':'smooth'});
    }catch(e){}
    return r;
  };
}

/* ---------- Ripple ---------- */
document.addEventListener('pointerdown',function(e){
  var b=e.target.closest&&e.target.closest('button'); if(!b||b.disabled||b.classList.contains('is-loading')) return;
  var cs=getComputedStyle(b); if(cs.position==='static') b.style.position='relative';
  b.classList.add('rpl-host');
  var r=b.getBoundingClientRect(), s=Math.max(r.width,r.height)*2.2, c=b.dataset.ripple, col;
  if(c==='light') col='rgba(255,255,255,.35)';
  else if(c==='dark') col='rgba(22,163,74,.28)';
  else{ var m=cs.backgroundColor.match(/[\d.]+/g)||[0,0,0,0]; var a=m.length>3?+m[3]:1;
    col=(a<.15||(+m[0]*.299+ +m[1]*.587+ +m[2]*.114)>170)?'rgba(22,163,74,.25)':'rgba(255,255,255,.35)'; }
  var sp=document.createElement('span'); sp.className='rpl';
  sp.style.cssText='width:'+s+'px;height:'+s+'px;left:'+(e.clientX-r.left-s/2)+'px;top:'+(e.clientY-r.top-s/2)+'px;background:'+col;
  b.appendChild(sp); setTimeout(function(){ sp.remove(); },700);
},{passive:true});

/* ---------- Loading tombol + feedback sukses/gagal ---------- */
function setLoading(btn,on,txt){
  if(!btn) return;
  if(on){ btn._h=btn.innerHTML; btn._busy=true; btn.classList.add('is-loading'); btn.disabled=true; btn.innerHTML='<span class="btn-spin"></span>'+(txt||'Menyimpan…'); }
  else{ btn.innerHTML=btn._h!=null?btn._h:btn.innerHTML; btn._busy=false; btn.classList.remove('is-loading'); btn.disabled=false; }
}
function wrapSave(name,modalId,okMsg,errMsg,loadTxt,okCheck){
  var orig=window[name]; if(typeof orig!=='function') return;
  window[name]=function(e){
    if(!e||typeof e.preventDefault!=='function') return orig.apply(this,arguments);
    e.preventDefault();
    var form=e.target, btn=form&&form.querySelector?form.querySelector('button[type="submit"]'):null;
    if(btn&&btn._busy) return;
    setLoading(btn,true,loadTxt);
    setTimeout(function(){
      var ok=false;
      Promise.resolve().then(function(){ return orig.call(window,e); }).then(function(){
        ok=okCheck?okCheck():g(modalId).classList.contains('hidden');
      }).catch(function(err){ ok=false; if(window.console) console.error(err); }).then(function(){
        setLoading(btn,false);
        if(ok) toast(okMsg,'success'); else toast(errMsg,'error');
      });
    },520);
  };
}
wrapSave('saveWarga','wargaModal','Data peserta berhasil disimpan.','Data peserta belum dapat disimpan. Periksa isian Anda.');
wrapSave('saveKas','kasModal','Transaksi kas berhasil dicatat.','Transaksi belum dapat disimpan.');
wrapSave('saveSantunan','santunanModal','Santunan berhasil dicatat dan masuk ke Buku Kas.','Santunan belum dapat disimpan.');
wrapSave('savePengurus','pengurusModal','Data pengurus berhasil disimpan.','Data pengurus belum dapat disimpan.');
wrapSave('saveRek','rekModal','Rekening berhasil ditambahkan.','Rekening belum dapat disimpan.');
wrapSave('saveCatatan','catatanModal','Catatan pembayaran berhasil disimpan.','Catatan belum dapat disimpan.');
wrapSave('saveTgl','tglModal','Pembayaran iuran berhasil dicatat.','Tanggal tidak valid. Gunakan format dd/mm/yyyy.');
wrapSave('handleLogin','authModal','Login berhasil. Mode Admin aktif.','ID atau password salah.','Memeriksa…',function(){ return typeof isAdmin!=='undefined'&&isAdmin; });

function wrapDel(name,len,msg){
  var orig=window[name]; if(typeof orig!=='function') return;
  window[name]=function(){ var b=len(), r=orig.apply(this,arguments); try{ if(len()<b) toast(msg,'success','Dihapus'); }catch(e){} return r; };
}
wrapDel('deleteWarga',function(){ return D.warga.length; },'Peserta berhasil dihapus.');
wrapDel('deleteKas',function(){ return D.kas.length; },'Transaksi berhasil dihapus.');
wrapDel('deleteSantunan',function(){ return D.santunan.length; },'Data santunan dan pengeluaran terkait dihapus.');
wrapDel('deletePengurus',function(){ return D.pengurus.length; },'Pengurus berhasil dihapus.');
wrapDel('deleteRek',function(){ return D.pembayaran.rekening.length; },'Rekening berhasil dihapus.');

(function(){
  var o=window.toggleAuthModal; if(typeof o!=='function') return;
  window.toggleAuthModal=function(){ var was=isAdmin, r=o.apply(this,arguments); if(was&&!isAdmin) toast('Anda telah keluar dari mode Admin.','success','Keluar'); return r; };
  var d=window.discardDraft; if(typeof d==='function') window.discardDraft=function(){ var had=!!getDraft(), r=d.apply(this,arguments); if(had&&!getDraft()) toast('Perubahan yang belum dipublikasikan dibuang.','success'); return r; };
  var x=window.exportTableToCSV; if(typeof x==='function') window.exportTableToCSV=function(){ var r=x.apply(this,arguments); toast('File CSV berhasil diunduh.','success'); return r; };
  var p=window.printIuran; if(typeof p==='function') window.printIuran=function(){ finishAll(); return p.apply(this,arguments); };
  var c=window.copyRek; if(typeof c==='function') window.copyRek=function(){ var r=c.apply(this,arguments); return r; };
})();

/* ---------- Loader logo & mulai ---------- */
var loader=g('appLoader');
if(loader){
  var li=loader.querySelector('.ld-logo');
  if(li&&logoSrc){ li.innerHTML='<img alt="" src="">'; li.firstChild.src=logoSrc; }
}
function ready(){
  if(READY) return; READY=true;
  document.body.classList.add('is-ready');
  if(loader){ loader.classList.add('done'); setTimeout(function(){ if(loader.parentNode) loader.remove(); },900); }
  prep(g('content-dashboard'));
  countAll();
  setTimeout(function(){ try{ if(typeof window.renderDashboard==='function') window.renderDashboard(); }catch(e){} },250);
  first=true; moveInd();
}
var _ld=window.loadData;
if(typeof _ld==='function'){
  window.loadData=function(){
    var done=function(){ setTimeout(ready,Math.max(0,1000-(performance.now()-T0))); };
    var r; try{ r=_ld.apply(this,arguments); }catch(e){ done(); throw e; }
    return Promise.resolve(r).then(done,done);
  };
}
setTimeout(ready,7000);
window.addEventListener('load',function(){ first=true; moveInd(); });
})();
