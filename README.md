# Keuangan PAK Ar-Royyan 2026 — versi multi-file

## Struktur
```
index.html            kerangka halaman (±41 KB, sebelumnya 746 KB)
css/01..10-*.css      gaya, urutan muat SAMA seperti file asli (jangan diubah urutannya)
js/aman.js            lapisan keamanan: pengganti onclick inline + pembersih data (dimuat pertama)
js/app.js             logika aplikasi (login, iuran, kas, santunan, pengurus, draft)
js/animasi.js, efek.js  animasi (isi tidak diubah)
js/tailwind-config.js, logo-loader.js
assets/               logo (dulu base64 di dalam HTML)
data.contoh.json      contoh bentuk data — JANGAN diunggah sebagai data.json
.nojekyll             agar GitHub Pages tidak memproses ulang file
```
`data.json` / `data.js` tidak ikut di sini (tidak ada di file yang Anda unggah).
Tetap letakkan keduanya di folder yang sama dengan `index.html`, seperti sebelumnya.

## Cara pasang di GitHub Pages
1. Unggah SEMUA isi folder ini (termasuk folder `css`, `js`, `assets`) ke root repositori, branch `main`.
2. Unggah `data.json` Anda yang lama ke root yang sama.
3. Tunggu 1–2 menit, buka alamat Pages. Tekan Ctrl+Shift+R sekali agar cache lama hilang.

## Yang diubah untuk keamanan
- Semua `onclick/onchange/onsubmit/oninput` dipindah ke `data-on-*` dan dijalankan `aman.js`
  hanya untuk fungsi pada daftar putih. Dengan begitu CSP bisa melarang script inline.
- CSP (meta di `index.html`): script hanya dari situs sendiri + 3 CDN yang dipakai; tidak ada
  `eval`, tidak ada script inline, form tidak bisa mengirim ke luar, koneksi hanya ke situs sendiri.
- `data.json` / `data.js` / cache dibersihkan oleh `sanitizeData()` (tipe, panjang, format tanggal
  dan hash) sebelum dipakai.
- Versi library dikunci (Tailwind 3.4.17, Chart.js 4.4.1) agar tidak berubah tiba-tiba.
- Sandi admin baru minimal 12 karakter (sebelumnya 6).

## Batas yang perlu Anda tahu (jujur)
- **Login admin bukan keamanan sungguhan.** Situs ini statis: hash sandi ada di `app.js`
  dan di `data.json` (kalau pernah ganti sandi), jadi siapa pun bisa mengunduhnya dan mencoba
  menebak sandi di komputernya sendiri. Karena itu pakai **frasa sandi panjang (≥ 12 karakter,
  acak)** lewat tab Pengaturan, lalu publikasikan `data.json` baru.
- Yang benar-benar melindungi data adalah **akun GitHub Anda**: aktifkan 2FA, jangan bagikan
  akses repositori, dan batasi kolaborator. Perubahan admin di browser hanya draft; warga baru
  melihatnya setelah `data.json` di-commit.
- Semua isi `data.json` (nama peserta, nomor telepon pengurus, nomor rekening) bisa dilihat siapa saja
  yang membuka situs. Pastikan memang itu yang ingin dipublikasikan.
- GitHub Pages tidak bisa mengirim header HTTP, jadi perlindungan clickjacking (`frame-ancestors`)
  tidak aktif. Kalau suatu saat butuh keamanan penuh, pindahkan login/penyimpanan ke server
  (mis. Cloudflare Worker) — itu langkah berikutnya yang paling berarti.
- Tailwind dan Font Awesome masih dimuat dari CDN tanpa SRI (hash integritas) karena tidak bisa
  saya hitung dari sini tanpa internet. Untuk lebih aman, unduh dan simpan file-nya di `assets/`.

## Jika halaman tampil polos / tidak berfungsi
Buka Console browser (F12). Kalau ada pesan "Refused to ... Content Security Policy",
hapus baris `<meta http-equiv="Content-Security-Policy" ...>` di `index.html`, lalu kirim pesan error-nya.
