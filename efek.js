/* Animasi tambahan: sorot kursor pada kartu + percikan emas saat sukses. Tidak mengubah data/fungsi. */
(function(){
  'use strict';
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(RM) return;
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* Sorot emas mengikuti kursor (hanya perangkat dengan mouse) */
  if(fine){
    var SEL = '#content-dashboard .bg-white.rounded-2xl,#pengurusBody .rounded-2xl,#rekBody .rounded-2xl', raf = 0;
    document.addEventListener('pointermove', function(e){
      var t = e.target; if(!t || !t.closest) return;
      var c = t.closest(SEL); if(!c) return;
      var x = e.clientX, y = e.clientY;
      if(raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function(){
        raf = 0; var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (x - r.left) + 'px'); c.style.setProperty('--my', (y - r.top) + 'px');
      });
    }, {passive:true});
  }

  /* Percikan emas singkat di ikon toast sukses */
  function burst(toast){
    try{
      var ic = toast.querySelector('.ti') || toast, r = ic.getBoundingClientRect();
      var cx = r.left + r.width/2, cy = r.top + r.height/2;
      for(var i=0;i<16;i++){
        (function(i){
          var a = (Math.PI*2*i/16) + Math.random()*.4, d = 36 + Math.random()*54, sz = 6 + Math.random()*6, s = document.createElement('span');
          s.className = 'spk';
          s.style.cssText = 'left:'+cx+'px;top:'+cy+'px;width:'+sz+'px;height:'+sz+'px;--dx:'+(Math.cos(a)*d)+'px;--dy:'+(Math.sin(a)*d)+'px;--rot:'+(Math.random()*180-90)+'deg';
          document.body.appendChild(s);
          setTimeout(function(){ if(s.parentNode) s.parentNode.removeChild(s); }, 1050);
        })(i);
      }
    }catch(e){}
  }
  var host = document.getElementById('toastHost');
  if(host && window.MutationObserver){
    new MutationObserver(function(list){
      list.forEach(function(m){
        for(var k=0;k<m.addedNodes.length;k++){
          var n = m.addedNodes[k];
          if(n.nodeType===1 && n.classList && n.classList.contains('success')) setTimeout(function(n){ return function(){ burst(n); }; }(n), 200);
        }
      });
    }).observe(host, {childList:true});
  }
})();
