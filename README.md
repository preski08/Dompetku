# Dompetku v3.1

Web3-style local wallet + Go Work + **Chat World** + **Marketplace** — matte black UI.

## Fitur v3.1

### Bahasa di login (disederhanakan)
- Hanya **ikon dunia** (seperti di header)
- Klik → dropdown pilihan bahasa (ID, EN, 中文, 한국어, ไทย, العربية, हिन्दी)

### Chat World
- Tombol **World** di header
- Chat **bebas** dengan orang dalam **radius GPS** — **tanpa harus tahu ID**
- Tombol **Add Teman** → tersimpan di daftar teman
- Chat langsung gratis (tidak potong saldo koneksi)

### Marketplace (ala Facebook)
- Tombol **Market** di header
- **Jual**: judul, harga, deskripsi, kondisi (baru/bekas), kategori, **foto**, alamat + GPS
- **Beli / Cari**: keyword (contoh motor beat), radius, peta OpenStreetMap
- Hasil **terdekat dulu** + gambar + tombol **Google Maps** + **Chat Penjual**
- Tab **Listing Saya** untuk hapus iklan sendiri

### Fitur lama (tetap)
- Multi-bahasa & multi-mata uang
- Portfolio chart + laporan bulanan
- Top Up QRIS / VA (iPaymu sandbox)
- Go Work (pekerja GPS + portofolio + fee koneksi per kategori)
- Chat WA-style (gambar, file, voice, lokasi)
- Transfer antar Wallet ID + QR

## Cara pakai

1. Buka `index.html` di browser (Chrome/Edge, izinkan kamera + lokasi).
2. Login / buat wallet.
3. **World** = Chat World radius.
4. **Market** = Marketplace jual/beli.
5. **Work** (hijau) = Go Work.
6. **Lang** = bahasa & mata uang.

## Catatan

- Semua data di **localStorage** (demo lokal).
- iPaymu credentials masih sandbox.
- Demo listing marketplace & presence Chat World tersedia agar UI tidak kosong.

## File

- index.html, style.css, app.js, i18n.js
- gowork.js, chat_v2.js
- chatworld.js (baru), marketplace.js (baru)
- logo.png, gowork-data.json
