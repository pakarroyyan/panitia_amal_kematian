/* ============ PENGATURAN ============
   Data resmi dibaca dari file data.json di repositori (sama untuk semua pengunjung).
   Perubahan admin disimpan sementara sebagai draft di browser admin,
   lalu dipublikasikan dengan mengunggah data.json baru ke GitHub.
   CATATAN: login ini hanya pembatas tampilan, bukan keamanan sebenarnya. */
const ADMIN_HASH = "1b070181587a4384d75f01867dad72810729bb899f7dda399886c84ad316118d";
const SALT = "pak2026gh|";
const DRAFT_KEY = "pak2026_draft";
const CACHE_KEY = "pak2026_cache";
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BLN3 = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

let base = null, D = null, isAdmin = false, charts = {};
let curId = '', curHash = '';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n);
const clone = o => JSON.parse(JSON.stringify(o));
const today = () => { const n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); };
const fTgl = s => s.split('-').reverse().join('/');
const getDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch(e){ return null; } };

async function sha(s){ const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }

async function loadData(){
  const isData = j => j && Array.isArray(j.warga) && Array.isArray(j.kas);
  const cands = [];
  /* 1) data.json di server/repositori */
  try{
    const r = await fetch('data.json?t=' + Date.now(), {cache:'no-store'});
    if(!r.ok) throw new Error(r.status);
    const j = await r.json(); if(isData(j)) cands.push(sanitizeData(j));
  }catch(e){}
  /* 2) data.js (script biasa, tetap terbaca saat index.html dibuka langsung dari komputer) */
  try{ if(isData(window.PAK_DATA)) cands.push(sanitizeData(window.PAK_DATA)); }catch(e){}
  /* 3) data yang ditanam di dalam index.html */
  try{ const el=document.getElementById('embeddedData'); const j=el?JSON.parse(el.textContent):null; if(isData(j)) cands.push(sanitizeData(j)); }catch(e){}
  let pick = null;
  cands.forEach(c => { if(!pick || String(c.updated||'') > String(pick.updated||'')) pick = c; });
  const err = $('loadErr');
  if(pick){
    base = pick; try{ localStorage.setItem(CACHE_KEY, JSON.stringify(pick)); }catch(e){}
    err.classList.add('hidden');
  } else {
    /* 4) salinan terakhir yang pernah berhasil dimuat di perangkat ini */
    let cached = null; try{ cached = JSON.parse(localStorage.getItem(CACHE_KEY)); }catch(e){}
    if(isData(cached)){
      base = sanitizeData(cached);
      err.textContent = 'Data terbaru belum bisa dimuat. Menampilkan salinan terakhir yang tersimpan di perangkat ini' + (cached.updated ? ' (diperbarui ' + cached.updated + ')' : '') + '.';
      err.classList.remove('hidden');
    } else {
      base = {updated:today(), mulai:6, iuran:10000, warga:[], kas:[], santunan:[], pengurus:[], pembayaran:{rekening:[],catatan:''}, ttd:{bendahara:'',ketua:''}};
      err.textContent = 'Data belum ditemukan. Letakkan file data.json (atau data.js) di folder/repositori yang sama dengan index.html, buka halaman lewat alamat web, lalu muat ulang. Admin dapat mengunduh file data dari banner kuning setelah login.';
      err.classList.remove('hidden');
    }
  }
  D = clone(base);
  renderAll();
}

/* ---- perhitungan ---- */
const mulai = () => D.mulai || 0;
const tagihan = () => (12 - mulai()) * D.iuran;
const dibayar = w => w.iuran.reduce((a,v,i)=> a + (i>=mulai() && v===1 ? D.iuran : 0), 0);

function rangeBulan(ms){
  const out=[]; let i=0;
  while(i<ms.length){ let j=i; while(j+1<ms.length && ms[j+1]===ms[j]+1) j++;
    out.push(j>i ? BULAN[ms[i]]+' s.d '+BULAN[ms[j]] : BULAN[ms[i]]); i=j+1; }
  return out.join(', ');
}
const eom = m => '2026-'+String(m+1).padStart(2,'0')+'-'+String(new Date(2026,m+1,0).getDate()).padStart(2,'0');
const tglBayar=(w,m)=>(w.tgl&&w.tgl[m])||null;
const shortTgl=(w,m)=>tglBayar(w,m)?fTgl(tglBayar(w,m)).slice(0,5):'';
function lastTgl(w){
  const ds=[]; let paid=false;
  for(let m=mulai();m<12;m++) if(w.iuran[m]===1){ paid=true; const t=tglBayar(w,m); if(t) ds.push(t); }
  if(!paid) return '<span class="text-slate-300">-</span>';
  if(!ds.length) return '<span class="text-slate-400 italic text-xs">belum dicatat</span>';
  return fTgl(ds.sort().pop());
}
function iuranPerNama(){
  const rows=[];
  D.warga.forEach((w,i)=>{
    const g={};
    for(let m=mulai();m<12;m++) if(w.iuran[m]===1){ const t=tglBayar(w,m)||('legacy'); (g[t]=g[t]||[]).push(m); }
    Object.keys(g).forEach(t=>{
      const ms=g[t];
      rows.push({tanggal:t==='legacy'?eom(ms[0]):t, uraian:'Iuran PAK: '+w.nama+(w.blok?' ('+w.blok+')':'')+' \u2013 '+rangeBulan(ms)+' ('+ms.length+' bulan)', kategori:'Iuran Peserta', masuk:ms.length*D.iuran, keluar:0, src:'iur', i});
    });
  });
  return rows;
}
function iuranPerBulan(){
  const rows=[];
  for(let m=mulai();m<12;m++){ const n=D.warga.filter(w=>w.iuran[m]===1).length;
    if(n>0) rows.push({tanggal:eom(m), masuk:n*D.iuran, keluar:0, src:'iur'}); }
  return rows;
}
function santunanRows(){
  return D.santunan.map((s,i)=>({tanggal:s.tanggal, uraian:'Santunan Duka: '+s.almarhum+(s.blok?' ('+s.blok+')':''), kategori:'Santunan', masuk:0, keluar:s.nominal, src:'san', i}));
}
/* Buku Kas: iuran ditampilkan per nama peserta */
function unifiedKas(){
  const list=[...D.kas.map((k,i)=>({...k,src:'kas',i})), ...iuranPerNama(), ...santunanRows()];
  list.sort((a,b)=> a.tanggal.localeCompare(b.tanggal));
  return list;
}
/* Grafik memakai tanggal bayar sebenarnya */
function chartKas(){ return unifiedKas(); }

/* ---- draft ---- */
function dirty(){
  if(!isAdmin) return;
  D.updated = today();
  try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(D)); }catch(e){}
  renderAll();
}
function downloadJSON(){
  const blob = new Blob([JSON.stringify(D,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'data.json'; a.click();
  alert('File data.json terunduh.\n\nLangkah selanjutnya:\n1. Buka repositori di GitHub.\n2. Klik Add file > Upload files, pilih data.json ini (ganti yang lama).\n3. Klik Commit changes.\n4. Tunggu 1-2 menit, warga akan melihat data terbaru.');
}
function downloadDataJS(){
  if(!isAdmin) return;
  const blob = new Blob(['window.PAK_DATA = ' + JSON.stringify(D,null,2) + ';\n'],{type:'text/javascript'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'data.js'; a.click();
  alert('File data.js terunduh.\n\nLetakkan data.js di folder/repositori yang sama dengan index.html (ganti yang lama). Cara ini juga berfungsi saat index.html dibuka langsung dari komputer.');
}
function discardDraft(){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;} 
  if(!confirm('Buang semua perubahan yang belum dipublikasikan?')) return;
  try{ localStorage.removeItem(DRAFT_KEY); }catch(e){}
  D = clone(base); renderAll();
}

/* ---- tab & modal ---- */
function switchTab(t){
  document.querySelectorAll('.tab-content').forEach(e=>e.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(e=>{e.classList.remove('border-brand-600','text-brand-700');e.classList.add('border-transparent','text-slate-600')});
  $('content-'+t).classList.remove('hidden');
  $('tab-'+t).classList.remove('border-transparent','text-slate-600');
  $('tab-'+t).classList.add('border-brand-600','text-brand-700');
  if(t==='dashboard') renderDashboard();
}
function openModal(id){ if(!isAdmin) return; $(id).classList.remove('hidden'); }
function closeModal(id){ $(id).classList.add('hidden'); }

function toggleAuthModal(){
  if(isAdmin){
    if(confirm('Keluar dari mode Admin?')){ isAdmin=false; D=clone(base); updateUI(); renderAll(); }
  } else { $('loginErr').textContent=''; $('authModal').classList.toggle('hidden'); }
}
/* Hash login yang sah: yang sudah dipublikasikan (data.json -> auth.hash, bila ada; jika tidak, bawaan)
   ditambah yang baru diubah dan masih berupa draft di perangkat ini. */
function validHashes(){
  const out = [(base && base.auth && base.auth.hash) || ADMIN_HASH];
  const d = getDraft(); if(d && d.auth && d.auth.hash) out.push(d.auth.hash);
  return out;
}
async function saveAuth(e){
  e.preventDefault(); if(!isAdmin) return;
  const msg = $('authSetMsg'); msg.className = 'text-sm text-rose-600'; msg.textContent = '';
  const id = $('authNewId').value.trim().toLowerCase(), p1 = $('authNewPass').value, p2 = $('authNewPass2').value, old = $('authOldPass').value;
  if(id.length < 3 || /\s/.test(id)){ msg.textContent = 'ID minimal 3 karakter dan tidak boleh mengandung spasi.'; return; }
  if(p1.length < 12){ msg.textContent = 'Sandi baru minimal 12 karakter (disarankan frasa panjang).'; return; }
  if(p1 !== p2){ msg.textContent = 'Ulangi sandi baru tidak sama.'; return; }
  try{
    if(await sha(SALT + curId + '|' + old) !== curHash){ msg.textContent = 'Sandi saat ini salah.'; return; }
    const nh = await sha(SALT + id + '|' + p1);
    D.auth = {hash: nh}; curId = id; curHash = nh;
  }catch(x){ msg.textContent = 'Browser tidak mendukung fitur ini. Buka lewat alamat https.'; return; }
  $('authSetForm').reset();
  msg.className = 'text-sm text-emerald-700';
  msg.textContent = 'ID dan sandi berhasil diubah. Unduh data.json / data.js dari banner kuning lalu unggah agar berlaku untuk semua perangkat.';
  try{ if(window.uiToast) window.uiToast('ID dan sandi admin berhasil diubah.','success'); }catch(_){}
  dirty();
}
async function handleLogin(e){
  e.preventDefault();
  try{
    const idv = $('loginId').value.trim().toLowerCase();
    const h = await sha(SALT + idv + '|' + $('loginPass').value);
    if(!validHashes().includes(h)){ $('loginErr').textContent='ID atau password salah.'; return; }
    curId = idv; curHash = h;
  }catch(x){ $('loginErr').textContent='Browser tidak mendukung login. Buka lewat alamat https.'; return; }
  isAdmin = true;
  const d = getDraft();
  D = d ? d : clone(base);
  $('loginForm').reset(); closeModal('authModal');
  updateUI(); renderAll();
}
function updateUI(){
  document.querySelectorAll('.admin-col').forEach(e=>e.classList.toggle('hidden',!isAdmin));
  ['btnAddWarga','btnAddKas','btnAddSantunan','btnAddPengurus','btnAddRek','btnEditCatatan'].forEach(id=>$(id).classList.toggle('hidden',!isAdmin));
  $('adminBadge').classList.toggle('hidden',!isAdmin);
  $('viewerBadge').classList.toggle('hidden',isAdmin);
  $('authBtnText').innerText = isAdmin ? 'Keluar Admin' : 'Login Admin';
  $('authBtnIcon').className = isAdmin ? 'fa-solid fa-lock-open text-amber-600' : 'fa-solid fa-lock';
  $('draftBar').classList.toggle('hidden', !(isAdmin && getDraft()));
  const tp = $('tab-pengaturan'); if(tp) tp.classList.toggle('hidden', !isAdmin);
  document.querySelectorAll('.dr-item[data-tab="pengaturan"]').forEach(e=>e.classList.toggle('hidden', !isAdmin));
  const sp = $('content-pengaturan'); if(!isAdmin && sp && !sp.classList.contains('hidden')) switchTab('dashboard');
}

/* ---- render ---- */
function renderAll(){
  const tgl = new Date(D.updated+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  $('updateDateText').textContent = 'Data per ' + tgl + '. Iuran peserta otomatis masuk ke Buku Kas dan Saldo.';
  D.pengurus=D.pengurus||[]; D.pembayaran=D.pembayaran||{}; D.pembayaran.rekening=D.pembayaran.rekening||[]; D.pembayaran.catatan=D.pembayaran.catatan||''; D.ttd=D.ttd||{bendahara:'',ketua:''};
  updateUI(); renderIuranTable(); renderKasTable(); renderSantunanTable(); renderPengurus(); renderPembayaran(); renderTtd(); renderDashboard();
}

function blokOrder(){
  const c=new Intl.Collator('id',{numeric:true,sensitivity:'base'}), B=i=>(D.warga[i].blok||'').trim();
  return D.warga.map((w,i)=>i).sort((a,b)=>{ const x=B(a), y=B(b); if(!x!==!y) return x?-1:1; return c.compare(x,y)||c.compare(D.warga[a].nama,D.warga[b].nama); });
}
function renderIuranTable(){
  const q = $('searchIuran').value.toLowerCase(), tb = $('iuranTableBody'); tb.innerHTML='';
  let no=0;
  blokOrder().forEach(idx=>{ const w=D.warga[idx];
    if(!(w.nama.toLowerCase().includes(q) || (w.blok||'').toLowerCase().includes(q))) return;
    const bayar = dibayar(w), tg = tagihan()-bayar, lunas = tg<=0;
    const n = w.iuran.filter((v,i)=>i>=mulai()&&v===1).length;
    let h = `<td class="p-3 text-slate-500">${++no}</td><td class="p-3 text-slate-600 whitespace-nowrap">${lastTgl(w)}</td><td class="p-3 font-bold">${esc(w.nama)}</td><td class="p-3">${w.blok?`<span class="bg-slate-100 px-2 py-0.5 rounded font-semibold text-xs">${esc(w.blok)}</span>`:'<span class="text-slate-300">-</span>'}</td>`;
    for(let m=0;m<12;m++){
      if(m<mulai()) h += '<td class="p-3 text-center text-slate-200">·</td>';
      else if(isAdmin) h += `<td class="p-3 text-center" title="${tglBayar(w,m)?'Dibayar '+fTgl(tglBayar(w,m)):''}"><input type="checkbox" ${w.iuran[m]===1?'checked':''} data-on-change="toggleIuran(${idx},${m})" class="w-4 h-4 cursor-pointer">${w.iuran[m]===1?'<div class="text-[10px] text-slate-400 leading-tight">'+shortTgl(w,m)+'</div>':''}</td>`;
      else h += `<td class="p-3 text-center" title="${w.iuran[m]===1&&tglBayar(w,m)?'Dibayar '+fTgl(tglBayar(w,m)):''}">${w.iuran[m]===1?'<i class="fa-solid fa-check text-emerald-600"></i><div class="text-[10px] text-slate-400 leading-tight">'+shortTgl(w,m)+'</div>':'<span class="text-slate-300">-</span>'}</td>`;
    }
    h += `<td class="p-3 text-center font-bold text-brand-700">${rp(bayar)}</td><td class="p-3 text-center font-semibold ${tg>0?'text-amber-700':'text-slate-400'}">${rp(Math.max(tg,0))}</td>
      <td class="p-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-bold ${lunas?'bg-emerald-100 text-emerald-800':(n>0?'bg-amber-100 text-amber-800':'bg-rose-100 text-rose-800')}">${lunas?'LUNAS':(n>0?'SEBAGIAN':'BELUM BAYAR')}</span></td>`;
    if(isAdmin) h += `<td class="p-3 text-center whitespace-nowrap"><button data-on-click="openEditWarga(${idx})" class="text-blue-600 p-1" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button><button data-on-click="deleteWarga(${idx})" class="text-rose-600 p-1" title="Hapus"><i class="fa-solid fa-trash"></i></button></td>`;
    const tr = document.createElement('tr'); tr.className='hover:bg-slate-50'; tr.innerHTML=h; tb.appendChild(tr);
  });
  const lunasCount = D.warga.filter(w=>tagihan()-dibayar(w)<=0).length;
  const kumpul = D.warga.reduce((a,w)=>a+dibayar(w),0);
  $('statTotalWarga').innerText = D.warga.length+' KK';
  $('statLunasCount').innerText = lunasCount;
  $('statIuranTerkumpul').innerText = rp(kumpul);
  $('statTunggakan').innerText = rp(D.warga.length*tagihan()-kumpul);
  $('statIuranBulan').innerText = rp(D.iuran);
}

function renderKasTable(){
  const tb = $('kasTableBody'); tb.innerHTML='';
  let saldo=0, tm=0, tk=0, no=0;
  unifiedKas().forEach(k=>{
    saldo += k.masuk-k.keluar; tm+=k.masuk; tk+=k.keluar;
    let h = `<td class="p-3 text-slate-500">${++no}</td><td class="p-3 text-slate-600 whitespace-nowrap">${fTgl(k.tanggal)}</td><td class="p-3 font-semibold">${esc(k.uraian)}${k.src!=='kas'?' <span class="ml-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-1.5 py-0.5 rounded"><i class="fa-solid fa-bolt"></i> Otomatis</span>':''}</td>
      <td class="p-3"><span class="bg-slate-100 px-2 py-0.5 rounded text-xs">${esc(k.kategori)}</span></td>
      <td class="p-3 text-right font-medium text-emerald-600">${k.masuk>0?rp(k.masuk):'-'}</td><td class="p-3 text-right font-medium text-rose-600">${k.keluar>0?rp(k.keluar):'-'}</td>
      <td class="p-3 text-right font-bold bg-slate-50">${rp(saldo)}</td>`;
    if(isAdmin) h += `<td class="p-3 text-center">${k.src!=='kas'?'<span class="text-slate-400 text-xs italic">Sinkron</span>':`<button data-on-click="deleteKas(${k.i})" class="text-rose-600 p-1"><i class="fa-solid fa-trash"></i></button>`}</td>`;
    const tr=document.createElement('tr'); tr.className='hover:bg-slate-50'; tr.innerHTML=h; tb.appendChild(tr);
  });
  $('statTotalMasuk').innerText=rp(tm); $('kasRptAwal').textContent=rp(0); $('kasRptMasuk').textContent=rp(tm); $('kasRptKeluar').textContent=rp(tk); $('kasRptAkhir').textContent=rp(saldo); $('statTotalKeluar').innerText=rp(tk); $('statSaldoAkhir').innerText=rp(saldo);
}

function renderSantunanTable(){
  const tb=$('santunanTableBody'); tb.innerHTML='';
  D.santunan.forEach((s,i)=>{
    let h=`<td class="p-3 text-slate-500">${i+1}</td><td class="p-3 text-slate-600 whitespace-nowrap">${fTgl(s.tanggal)}</td><td class="p-3 font-bold">${esc(s.almarhum)}</td><td class="p-3">${esc(s.blok)}</td><td class="p-3 text-right font-bold text-rose-600">${rp(s.nominal)}</td><td class="p-3 text-slate-600">${esc(s.ket)}</td>`;
    if(isAdmin) h+=`<td class="p-3 text-center"><button data-on-click="deleteSantunan(${i})" class="text-rose-600 p-1"><i class="fa-solid fa-trash"></i></button></td>`;
    const tr=document.createElement('tr'); tr.className='hover:bg-slate-50'; tr.innerHTML=h; tb.appendChild(tr);
  });
  $('santunanEmpty').classList.toggle('hidden', D.santunan.length>0);
}

function renderDashboard(){
  if(!window.Chart) return;
  const all = chartKas();
  const mi = k => +k.tanggal.slice(5,7)-1;
  const umum = new Array(12).fill(0), iur = new Array(12).fill(0), has = new Array(12).fill(false);
  all.forEach(k=>{ const m=mi(k); if(m<0||m>11) return; has[m]=true; if(k.src==='iur') iur[m]+=k.masuk; else umum[m]+=k.masuk-k.keluar; });
  let first = has.indexOf(true); if(first<0) first=0;
  let last = has.lastIndexOf(true); if(last<0) last=0;
  const nw = new Date(); if(nw.getFullYear()===2026) last = Math.max(last, nw.getMonth());
  last = Math.max(last, first);
  const labels=[], dU=[], dI=[]; let cu=0, ci=0;
  for(let m=0;m<=last;m++){ cu+=umum[m]; ci+=iur[m]; if(m>=first){ labels.push(BLN3[m]); dU.push(cu); dI.push(ci); } }
  if(charts.g) charts.g.destroy();
  charts.g = new Chart($('growthChart').getContext('2d'),{type:'line',
    data:{labels,datasets:[
      {label:'Kas umum',data:dU,borderColor:'#059669',backgroundColor:'rgba(16,185,129,.30)',fill:'origin',tension:.3,pointRadius:4,borderWidth:2},
      {label:'Iuran peserta',data:dI,borderColor:'#f59e0b',backgroundColor:'rgba(245,185,66,.36)',fill:'-1',tension:.3,pointRadius:4,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>' '+c.dataset.label+': '+rp(c.parsed.y),footer:items=>'Total saldo: '+rp(items.reduce((a,i)=>a+i.parsed.y,0))}}},
      scales:{y:{stacked:true,beginAtZero:true,ticks:{callback:v=>v>=1e6?(v/1e6)+' jt':(v/1e3)+' rb'}}}}});

  let lunas=0, sebagian=0, belum=0;
  D.warga.forEach(w=>{ const b=dibayar(w); if(tagihan()-b<=0) lunas++; else if(b>0) sebagian++; else belum++; });
  const centerText = {id:'ct',afterDraw(c){ const {ctx,chartArea:a}=c; ctx.save(); ctx.textAlign='center'; ctx.fillStyle='#064e3b';
    const x=(a.left+a.right)/2, y=(a.top+a.bottom)/2; ctx.font="700 28px 'Noto Sans',Inter,sans-serif"; ctx.fillText(D.warga.length,x,y+5); ctx.font="600 11px 'Noto Sans',Inter,sans-serif"; ctx.fillStyle='#6a7a71'; ctx.fillText('PESERTA',x,y+25); ctx.restore(); }};
  if(charts.s) charts.s.destroy();
  charts.s = new Chart($('statusChart').getContext('2d'),{type:'doughnut',
    data:{labels:['Lunas ('+lunas+')','Sebagian ('+sebagian+')','Belum bayar ('+belum+')'],datasets:[{data:[lunas,sebagian,belum],backgroundColor:['#10b981','#fbbf24','#f43f5e'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom'}}},plugins:[centerText]});

  const ml=[], paid=[], unpaid=[];
  for(let m=mulai();m<12;m++){ const n=D.warga.filter(w=>w.iuran[m]===1).length; ml.push(BULAN[m]); paid.push(n); unpaid.push(D.warga.length-n); }
  if(charts.i) charts.i.destroy();
  charts.i = new Chart($('iuranChart').getContext('2d'),{type:'bar',
    data:{labels:ml,datasets:[{label:'Sudah bayar',data:paid,backgroundColor:'#10b981',borderRadius:4},{label:'Belum bayar',data:unpaid,backgroundColor:'#fda4af',borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,ticks:{precision:0},title:{display:true,text:'Jumlah KK'}}}}});
}

/* ---- aksi admin ---- */
let pendTgl=null;
function parseTgl(v){ const m=String(v).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); if(!m) return null; const d=+m[1],mo=+m[2],y=+m[3], dt=new Date(y,mo-1,d); if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d) return null; return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
function toggleIuran(i,m){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;} 
  const w=D.warga[i]; w.tgl=w.tgl||{};
  if(w.iuran[m]===1){ w.iuran[m]=0; delete w.tgl[m]; dirty(); return; }
  pendTgl={i,m}; $('tglInfo').textContent=w.nama+' \u2013 '+BULAN[m]; $('tglInput').value=fTgl(today()); $('tglErr').textContent='';
  openModal('tglModal'); setTimeout(()=>$('tglInput').select(),50);
}
function saveTgl(e){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;} 
  e.preventDefault(); const t=parseTgl($('tglInput').value);
  if(!t){ $('tglErr').textContent='Tulis tanggal dengan format dd/mm/yyyy, contoh 15/07/2026.'; return; }
  const {i,m}=pendTgl, w=D.warga[i]; w.iuran[m]=1; w.tgl[m]=t; pendTgl=null; closeModal('tglModal'); dirty();
}
function cancelTgl(){ pendTgl=null; closeModal('tglModal'); renderIuranTable(); }

function buildBulanBox(w){
  $('bulanBox').className='grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200';
  $('bulanBox').innerHTML = BULAN.map((b,i)=>{
    const off=i<mulai(), on=w.iuran[i]===1, t=(w.tgl&&w.tgl[i])||'';
    return `<div class="flex items-center gap-2 ${off?'opacity-40':''}"><label class="flex items-center gap-2 text-xs font-medium w-28 shrink-0"><input type="checkbox" name="bulan" value="${i}" ${on?'checked':''} ${off?'disabled':''} data-on-change="bulanChanged(this)"> ${b}</label><input type="text" inputmode="numeric" maxlength="10" placeholder="dd/mm/yyyy" name="tgl" data-m="${i}" value="${t?fTgl(t):''}" ${(!on||off)?'disabled':''} class="flex-1 px-2 py-1 border border-slate-300 rounded-lg text-xs" title="Tanggal bayar"></div>`;
  }).join('');
}
function bulanChanged(cb){
  const d=document.querySelector('input[name="tgl"][data-m="'+cb.value+'"]');
  d.disabled=!cb.checked; d.value=cb.checked?(d.value||fTgl(today())):'';
}
function openAddWargaModal(){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  $('wargaModalTitle').innerText='Tambah Peserta Baru'; $('wargaIndex').value=''; $('wargaNama').value=''; $('wargaBlok').value=''; buildBulanBox({iuran:new Array(12).fill(0),tgl:{}}); openModal('wargaModal'); }
function openEditWarga(i){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  const w=D.warga[i]; $('wargaModalTitle').innerText='Edit: '+w.nama; $('wargaIndex').value=i; $('wargaNama').value=w.nama; $('wargaBlok').value=w.blok||''; buildBulanBox(w); openModal('wargaModal'); }
function saveWarga(e){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;} 
  e.preventDefault();
  const idx=$('wargaIndex').value, nama=$('wargaNama').value.trim(), blok=$('wargaBlok').value.trim();
  if(!nama) return;
  const arr=[...document.querySelectorAll('input[name="bulan"]')].map(c=>c.checked?1:0);
  const tgl={};
  let bad=false;
  document.querySelectorAll('input[name="tgl"]').forEach(d=>{ const m=+d.dataset.m; if(arr[m]===1 && d.value.trim()){ const t=parseTgl(d.value); if(t) tgl[m]=t; else bad=true; } });
  if(bad){ alert('Tanggal harus ditulis dengan format dd/mm/yyyy.'); return; }
  const obj={nama,blok,iuran:arr,tgl};
  if(idx==='') D.warga.push(obj); else D.warga[idx]=obj;
  closeModal('wargaModal'); dirty();
}
function deleteWarga(i){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  if(confirm('Hapus peserta ini?')){ D.warga.splice(i,1); dirty(); } }

function openAddKasModal(){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  $('kasForm').reset(); $('kasTanggal').value = today().startsWith('2026')?today():'2026-12-31'; openModal('kasModal'); }
function saveKas(e){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;} 
  e.preventDefault();
  const n=Math.round(+$('kasNominal').value); if(!(n>0)) return;
  const j=$('kasJenis').value;
  D.kas.push({tanggal:$('kasTanggal').value,uraian:$('kasUraian').value.trim(),kategori:$('kasKategori').value.trim(),masuk:j==='masuk'?n:0,keluar:j==='keluar'?n:0});
  closeModal('kasModal'); dirty();
}
function deleteKas(i){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  if(confirm('Hapus transaksi ini?')){ D.kas.splice(i,1); dirty(); } }

function openAddSantunanModal(){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  $('santunanForm').reset(); $('santunanTanggal').value = today().startsWith('2026')?today():'2026-12-31'; openModal('santunanModal'); }
function saveSantunan(e){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;} 
  e.preventDefault();
  const n=Math.round(+$('santunanNominal').value); if(!(n>0)) return;
  D.santunan.push({tanggal:$('santunanTanggal').value,almarhum:$('santunanAlmarhum').value.trim(),blok:$('santunanBlok').value.trim(),nominal:n,ket:$('santunanKet').value.trim()});
  closeModal('santunanModal'); dirty();
}
function deleteSantunan(i){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  if(confirm('Hapus data santunan ini? Pengeluaran di Buku Kas ikut terhapus.')){ D.santunan.splice(i,1); dirty(); } }

/* ---- pengurus & info pembayaran ---- */
function waLink(t){ let d=String(t||'').replace(/\D/g,''); if(!d) return ''; if(d.startsWith('0')) d='62'+d.slice(1); return 'https://wa.me/'+d; }
function renderPengurus(){
  const b=$('pengurusBody');
  if(!D.pengurus.length){ b.innerHTML='<div class="p-8 text-center text-slate-500 text-sm border border-dashed border-slate-300 rounded-xl">Data pengurus belum diisi.</div>'; return; }
  b.innerHTML='<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">'+D.pengurus.map((x,i)=>{
    const w=waLink(x.telp);
    return `<div class="border border-slate-200 rounded-2xl p-4 flex gap-3 items-start"><div class="w-12 h-12 shrink-0 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl"><i class="fa-solid fa-user-tie"></i></div><div class="flex-1 min-w-0"><p class="text-[11px] font-bold uppercase tracking-wider text-brand-700">${esc(x.jabatan)}</p><p class="font-bold text-slate-900 break-words">${esc(x.nama)}</p>${w?`<a href="${w}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-700 hover:underline"><i class="fa-brands fa-whatsapp"></i> ${esc(x.telp)}</a>`:''}</div>${isAdmin?`<div class="flex flex-col"><button data-on-click="openPengurusModal(${i})" class="text-blue-600 p-1" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button><button data-on-click="deletePengurus(${i})" class="text-rose-600 p-1" title="Hapus"><i class="fa-solid fa-trash"></i></button></div>`:''}</div>`;
  }).join('')+'</div>';
}
function openPengurusModal(i){
  const x=i===undefined?{jabatan:'',nama:'',telp:''}:D.pengurus[i];
  $('pengurusModalTitle').innerText=i===undefined?'Tambah Pengurus':'Edit Pengurus';
  $('pengurusIndex').value=i===undefined?'':i; $('pengurusJabatan').value=x.jabatan; $('pengurusNama').value=x.nama; $('pengurusTelp').value=x.telp||'';
  openModal('pengurusModal');
}
function savePengurus(e){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;} 
  e.preventDefault();
  const o={jabatan:$('pengurusJabatan').value.trim(),nama:$('pengurusNama').value.trim(),telp:$('pengurusTelp').value.trim()};
  if(!o.jabatan||!o.nama) return;
  const i=$('pengurusIndex').value; if(i==='') D.pengurus.push(o); else D.pengurus[i]=o;
  closeModal('pengurusModal'); dirty();
}
function deletePengurus(i){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  if(confirm('Hapus pengurus ini?')){ D.pengurus.splice(i,1); dirty(); } }

function renderPembayaran(){
  $('payIuran').textContent=rp(D.iuran)+' / bulan';
  $('payMulai').textContent='Dibayar mulai '+BULAN[mulai()]+' 2026 sampai Desember 2026 (total '+rp(tagihan())+' per KK).';
  const r=D.pembayaran.rekening, b=$('rekBody');
  b.innerHTML=r.length?'<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'+r.map((x,i)=>`<div class="border border-slate-200 rounded-2xl p-4"><div class="flex justify-between items-start"><p class="text-xs font-bold uppercase tracking-wider text-brand-700"><i class="fa-solid fa-building-columns"></i> ${esc(x.bank)}</p>${isAdmin?`<button data-on-click="deleteRek(${i})" class="text-rose-600 p-1" title="Hapus"><i class="fa-solid fa-trash"></i></button>`:''}</div><p class="text-xl font-bold font-mono tracking-wide mt-1 break-all">${esc(x.nomor)}</p><p class="text-sm text-slate-600">a.n. ${esc(x.nama)}</p><button data-on-click="copyRek(${i},this)" class="mt-3 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold"><i class="fa-regular fa-copy"></i> Salin nomor</button></div>`).join('')+'</div>'
    :'<div class="p-6 text-center text-slate-500 text-sm border border-dashed border-slate-300 rounded-xl">Belum ada rekening.</div>';
  const c=D.pembayaran.catatan;
  $('payCatatan').innerHTML=c?esc(c):'<span class="text-slate-400">Belum ada catatan pembayaran.</span>';
}
function copyRek(i,btn){
  const n=D.pembayaran.rekening[i].nomor, ok=()=>{ const h=btn.innerHTML; btn.innerHTML='<i class="fa-solid fa-check"></i> Tersalin'; setTimeout(()=>btn.innerHTML=h,1500); };
  const fb=()=>{ const t=document.createElement('textarea'); t.value=n; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); ok(); }catch(x){ prompt('Salin nomor ini:',n); } t.remove(); };
  if(navigator.clipboard&&window.isSecureContext) navigator.clipboard.writeText(n).then(ok,fb); else fb();
}
function openRekModal(){ $('rekForm').reset(); openModal('rekModal'); }
function saveRek(e){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;} 
  e.preventDefault();
  D.pembayaran.rekening.push({bank:$('rekBank').value.trim(),nomor:$('rekNomor').value.trim(),nama:$('rekNama').value.trim()});
  closeModal('rekModal'); dirty();
}
function deleteRek(i){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  if(confirm('Hapus rekening ini?')){ D.pembayaran.rekening.splice(i,1); dirty(); } }
function openCatatanModal(){ $('catatanText').value=D.pembayaran.catatan||''; openModal('catatanModal'); }
function saveCatatan(e){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  e.preventDefault(); D.pembayaran.catatan=$('catatanText').value.trim(); closeModal('catatanModal'); dirty(); }

/* ---- penandatangan laporan ---- */
const TTD_DOTS='........................................';
function renderTtd(){
  const nm=re=>{ const x=D.pengurus.find(p=>re.test(p.jabatan||'')&&!/wakil|wkl/i.test(p.jabatan||'')&&(p.nama||'').trim()); return x?x.nama.trim():''; };
  $('ttdBendahara').textContent=nm(/bendahara/i)||TTD_DOTS;
  $('ttdSekretaris').textContent=nm(/sek(re|er)taris/i)||TTD_DOTS;
  $('ttdKetua').textContent=nm(/ketua/i)||TTD_DOTS;
  const tg=D.ttd.tanggal||today(), tempat=D.ttd.tempat||'Banyuasin';
  const tx=new Date(tg+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  $('kasRptTeks').textContent=tempat+', '+tx;
  $('ttdTempatInline').value=tempat; $('ttdTanggalInline').value=tg; $('ttdTglBtn').textContent=tx;
  $('kasRptTeks').classList.toggle('hidden',isAdmin); $('kasRptEdit').classList.toggle('hidden',!isAdmin);
}
function ttdSetTempat(){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  D.ttd=D.ttd||{}; D.ttd.tempat=$('ttdTempatInline').value.trim()||'Banyuasin'; dirty(); }
function ttdSetTanggal(){ if(!isAdmin){try{var _a=arguments[0];if(_a&&_a.preventDefault)_a.preventDefault();}catch(_e){}return;}  const v=$('ttdTanggalInline').value; if(!v) return; D.ttd=D.ttd||{}; D.ttd.tanggal=v; dirty(); }
function ttdPickDate(){ const i=$('ttdTanggalInline'); try{ i.showPicker(); }catch(e){ i.focus(); i.click(); } }

function exportTableToCSV(id,filename){
  const t=$(id), rows=[];
  for(const r of t.rows){ const c=[]; for(const x of r.querySelectorAll('td,th')) if(!x.classList.contains('admin-col')) c.push('"'+x.innerText.replace(/\s+/g,' ').trim().replace(/"/g,'""')+'"'); rows.push(c.join(',')); }
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.join('\n')],{type:'text/csv;charset=utf-8;'})); a.download=filename; a.click();
}

function tickClock(){
  const d=new Date();
  const t=d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' \u2022 '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).replace(/\./g,':');
  const el=$('iuranClock'); if(el) el.textContent=t;
}
function printIuran(){
  $('logoIuran').src=$('logoPak').src;
  $('iuranPrintTgl').textContent=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  $('iuranPrintSum').textContent=$('statTotalWarga').innerText+' \u2022 Lunas: '+$('statLunasCount').innerText+' KK \u2022 Terkumpul: '+$('statIuranTerkumpul').innerText+' \u2022 Tunggakan: '+$('statTunggakan').innerText;
  const st=document.createElement('style'); st.id='pgLand'; st.textContent='@page{size:A4 landscape;margin:10mm}'; document.head.appendChild(st);
  window.print();
}
window.addEventListener('afterprint',()=>{ const st=$('pgLand'); if(st) st.remove(); });
window.onload = function(){ tickClock(); setInterval(tickClock,1000); loadData(); };
