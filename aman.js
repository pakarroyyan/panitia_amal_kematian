/* =====================================================================
   aman.js — lapisan keamanan (dimuat PERTAMA, sebelum data.js dan app.js)

   1) Delegasi event: menggantikan atribut onclick/onchange/onsubmit/oninput
      di HTML. Atribut itu sekarang ditulis data-on-click, dst. Dengan begitu
      kebijakan CSP tidak perlu mengizinkan 'unsafe-inline' untuk script.
      Hanya fungsi pada daftar putih (ALLOWED) yang boleh dipanggil, dan
      argumen hanya boleh angka, teks berkutip, this, event, true/false/null.

   2) sanitizeData(): memeriksa/membersihkan data.json / data.js sebelum
      dipakai (tipe, panjang, format tanggal, format hash).
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Delegasi event ---------- */
  var ALLOWED = {};
  ('toggleAuthModal closeModal saveWarga saveTgl saveSantunan saveRek savePengurus saveKas saveCatatan ' +
   'saveAuth handleLogin renderIuranTable ttdPickDate switchTab printIuran openRekModal openPengurusModal ' +
   'openEditWarga openCatatanModal openAddWargaModal openAddSantunanModal openAddKasModal exportTableToCSV ' +
   'downloadJSON downloadDataJS discardDraft deleteWarga deleteSantunan deleteRek deletePengurus deleteKas ' +
   'copyRek cancelTgl ttdSetTempat ttdSetTanggal toggleIuran bulanChanged window.print')
    .split(' ').forEach(function (n) { ALLOWED[n] = true; });

  function splitArgs(str) {
    var out = [], cur = '', q = null;
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      if (q) { cur += c; if (c === q) q = null; }
      else if (c === '"' || c === "'") { q = c; cur += c; }
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    if (cur.trim() !== '' || out.length) out.push(cur);
    return out;
  }

  var NOPE = {};
  function parseArg(a, el, ev) {
    a = a.trim();
    var m;
    if (a === 'this') return el;
    if (a === 'event') return ev;
    if (a === 'true') return true;
    if (a === 'false') return false;
    if (a === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(a)) return Number(a);
    if ((m = /^'([^'\\]*)'$/.exec(a)) || (m = /^"([^"\\]*)"$/.exec(a))) return m[1];
    return NOPE;
  }

  function run(attr, el, ev) {
    var m = /^\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(([\s\S]*)\)\s*;?\s*$/.exec(attr);
    if (!m || !ALLOWED[m[1]]) return;
    var parts = m[1].split('.');
    if (parts[0] === 'window') parts.shift();
    var ctx = window, fn = window;
    for (var i = 0; i < parts.length; i++) { ctx = fn; fn = fn[parts[i]]; }
    if (typeof fn !== 'function') return;
    var raw = m[2].trim() === '' ? [] : splitArgs(m[2]), args = [];
    for (var j = 0; j < raw.length; j++) {
      var v = parseArg(raw[j], el, ev);
      if (v === NOPE) return;
      args.push(v);
    }
    fn.apply(ctx, args);
  }

  ['click', 'change', 'submit', 'input'].forEach(function (type) {
    var attr = 'data-on-' + type;
    document.addEventListener(type, function (ev) {
      var el = ev.target;
      while (el && el.nodeType === 1) {
        if (el.hasAttribute(attr)) {
          run(el.getAttribute(attr), el, ev);
          if (ev.cancelBubble) break;
        }
        el = el.parentElement;
      }
    });
  });

  /* ---------- 2. Sanitasi data ---------- */
  var DATE = /^\d{4}-\d{2}-\d{2}$/;
  var HASH = /^[0-9a-f]{64}$/;
  function str(v, max) { return String(v == null ? '' : v).slice(0, max || 300); }
  function num(v) { v = Math.round(Number(v)); return (isFinite(v) && v >= 0 && v < 1e12) ? v : 0; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function validDate(v) {
    if (typeof v !== 'string' || !DATE.test(v)) return false;
    var p = v.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.getFullYear() === +p[0] && d.getMonth() === +p[1] - 1 && d.getDate() === +p[2];
  }
  function todayStr() {
    var n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
  }

  window.sanitizeData = function (j) {
    var dropped = 0;
    var out = {
      updated: validDate(j.updated) ? j.updated : todayStr(),
      mulai: Math.min(11, num(j.mulai)),
      iuran: num(j.iuran),
      warga: [], kas: [], santunan: [], pengurus: [],
      pembayaran: { rekening: [], catatan: '' },
      ttd: { bendahara: '', ketua: '' }
    };

    arr(j.warga).forEach(function (w) {
      if (!w || typeof w !== 'object') { dropped++; return; }
      var iu = [], tgl = {};
      for (var m = 0; m < 12; m++) {
        iu.push(arr(w.iuran)[m] === 1 ? 1 : 0);
        var t = w.tgl && w.tgl[m];
        if (iu[m] === 1 && validDate(t)) tgl[m] = t;
      }
      out.warga.push({ nama: str(w.nama, 120), blok: str(w.blok, 40), iuran: iu, tgl: tgl });
    });

    arr(j.kas).forEach(function (k) {
      if (!k || !validDate(k.tanggal)) { dropped++; return; }
      out.kas.push({ tanggal: k.tanggal, uraian: str(k.uraian, 300), kategori: str(k.kategori, 80),
                     masuk: num(k.masuk), keluar: num(k.keluar) });
    });

    arr(j.santunan).forEach(function (s) {
      if (!s || !validDate(s.tanggal)) { dropped++; return; }
      out.santunan.push({ tanggal: s.tanggal, almarhum: str(s.almarhum, 120), blok: str(s.blok, 40),
                          nominal: num(s.nominal), ket: str(s.ket, 300) });
    });

    arr(j.pengurus).forEach(function (p) {
      if (!p) { dropped++; return; }
      out.pengurus.push({ jabatan: str(p.jabatan, 80), nama: str(p.nama, 120), telp: str(p.telp, 30) });
    });

    if (j.pembayaran && typeof j.pembayaran === 'object') {
      arr(j.pembayaran.rekening).forEach(function (r) {
        if (!r) { dropped++; return; }
        out.pembayaran.rekening.push({ bank: str(r.bank, 80), nomor: str(r.nomor, 40), nama: str(r.nama, 120) });
      });
      out.pembayaran.catatan = str(j.pembayaran.catatan, 2000);
    }

    if (j.ttd && typeof j.ttd === 'object') {
      out.ttd.bendahara = str(j.ttd.bendahara, 120);
      out.ttd.ketua = str(j.ttd.ketua, 120);
      if (validDate(j.ttd.tanggal)) out.ttd.tanggal = j.ttd.tanggal;
      if (j.ttd.tempat) out.ttd.tempat = str(j.ttd.tempat, 80);
    }

    if (j.auth && typeof j.auth.hash === 'string' && HASH.test(j.auth.hash)) out.auth = { hash: j.auth.hash };

    if (dropped && window.console) console.warn('[aman.js] ' + dropped + ' entri data tidak valid dibuang.');
    return out;
  };
})();
