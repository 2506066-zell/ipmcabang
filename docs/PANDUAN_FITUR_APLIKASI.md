# Panduan Fitur Aplikasi Organisasi IPM Panawuan

Dokumen ini menjelaskan fitur aplikasi dari sisi pengguna umum (anggota, kader, pengunjung) dan admin/pengurus.

Update terakhir: 21 Februari 2026

## 1. Tujuan Aplikasi
Aplikasi ini dibuat untuk memudahkan pengguna dalam:
- Mengakses informasi organisasi.
- Membaca artikel dan berita kader.
- Mengikuti kuis edukatif.
- Melihat papan peringkat.
- Mengakses materi dan e-book.

## 2. Halaman Utama dan Fungsinya
### Beranda (`/`)
Fungsi utama:
- Menampilkan identitas organisasi.
- Menampilkan agenda utama dan countdown program kerja.
- Menampilkan artikel terbaru.

Yang bisa dilakukan pengguna:
1. Buka tombol `Tentang Kami` untuk masuk ke struktur organisasi.
2. Buka tombol `Kader Pintar` untuk masuk ke kuis.
3. Buka `Lihat Semua Artikel` untuk masuk ke daftar artikel.

### Struktur Organisasi (`/struktur-organisasi.html`)
Fungsi utama:
- Menampilkan bidang organisasi.
- Menampilkan anggota per bidang.
- Menampilkan program kerja per bidang.
- Data ditarik dinamis dari server (`/api/organization`) sehingga selalu mengikuti update admin.

Yang bisa dilakukan pengguna:
1. Pilih salah satu bidang.
2. Klik `Anggota` untuk melihat daftar anggota.
3. Klik `Program` untuk melihat program kerja bidang.
4. Klik anggota untuk melihat detail profil anggota.
5. Jika data bidang belum diisi, halaman menampilkan empty state yang informatif.

### Artikel (`/articles`)
Fungsi utama:
- Menampilkan daftar artikel organisasi.
- Menyediakan mode baca detail artikel dengan URL yang rapi.

Yang bisa dilakukan pengguna:
1. Cari artikel lewat kolom pencarian.
2. Filter artikel berdasarkan urutan dan kategori.
3. Buka artikel untuk membaca detail.
4. Bagikan artikel melalui tombol share (WhatsApp, X, salin tautan).

Catatan URL:
- Daftar artikel: `/articles`
- Detail artikel: `/articles/{slug}`

### Materi dan E-Book (`/materi.html`)
Fungsi utama:
- Menyediakan materi belajar dan dokumen organisasi.

Yang bisa dilakukan pengguna:
1. Cari materi lewat kolom pencarian.
2. Filter materi berdasarkan kategori.
3. Buka atau unduh materi dari kartu materi.

### Quiz (`/quiz.html` dan `/quiz-gamified.html`)
Fungsi utama:
- Menguji pengetahuan pengguna tentang materi organisasi.

Yang bisa dilakukan pengguna:
1. Login terlebih dahulu.
2. Pilih set kuis yang tersedia.
3. Jawab seluruh soal sampai selesai.
4. Lihat skor akhir.
5. Lanjut ke halaman peringkat.

Catatan penting:
- Secara default, pengguna diarahkan ke kuis gamified (`/quiz-gamified.html`).
- Kuis lama hanya dibuka jika parameter legacy dipakai (`/quiz.html?legacy=1`).
- Set kuis umumnya hanya bisa dikerjakan satu kali sampai direset admin.

### Peringkat (`/ranking.html`)
Fungsi utama:
- Menampilkan ranking peserta kuis.

Yang bisa dilakukan pengguna:
1. Lihat podium Top 1-3.
2. Gunakan filter ranking: `Semua`, `Mingguan`, `Harian`.
3. Cari nama peserta lewat kolom pencarian.
4. Cek catatan periode ranking dan pembaruan data.

### Bantuan (`/help.html`)
Fungsi utama:
- Menyediakan panduan cepat untuk fitur inti aplikasi.

Yang bisa dilakukan pengguna:
1. Pelajari langkah penggunaan akun, kuis, artikel, materi, dan notifikasi.
2. Gunakan bagian FAQ untuk kendala umum.
3. Gunakan kontak yang tersedia jika membutuhkan bantuan lanjutan.

## 3. Fitur Akun Pengguna
### Daftar akun (`/register.html`)
Data yang diisi:
1. Nama panjang.
2. Asal pimpinan.
3. Username.
4. Password.

### Login (`/login.html`)
Fitur:
- Login dengan username dan password.
- Opsi `ingat saya`.
- Tautan cepat ke halaman daftar jika belum punya akun.

## 4. Fitur Pendukung Pengalaman Pengguna
### Notifikasi
Tersedia di header (ikon lonceng pada halaman yang mendukung).

Fungsi:
- Melihat notifikasi terbaru.
- Menandai notifikasi sebagai dibaca.

### PWA (Install aplikasi)
Fungsi:
- Aplikasi bisa dipasang ke home screen.
- Memberikan pengalaman seperti aplikasi mobile.

Saran penggunaan:
1. Izinkan notifikasi saat diminta browser.
2. Install aplikasi dari prompt yang muncul agar akses lebih cepat.

### Navigasi mobile
Fitur:
- Hamburger menu.
- Bottom navigation.
- Akses cepat ke halaman utama dari layar kecil.

## 5. Alur Pengguna yang Direkomendasikan
Untuk pengguna baru:
1. Daftar akun.
2. Login.
3. Baca artikel terbaru di `/articles`.
4. Pelajari materi di `/materi.html`.
5. Ikuti kuis.
6. Pantau posisi di halaman ranking.

Untuk pengguna rutin:
1. Cek beranda untuk update program.
2. Cek notifikasi.
3. Lanjutkan baca artikel dan materi terbaru.
4. Ikuti kuis terjadwal.
5. Pantau ranking berkala.

## 6. Troubleshooting Singkat
### Data tidak muncul
Solusi:
1. Refresh halaman.
2. Pastikan koneksi internet stabil.
3. Coba buka ulang aplikasi.

### Tidak bisa mengerjakan kuis
Kemungkinan:
- Belum login.
- Set kuis sudah pernah dikerjakan.
- Set kuis belum masuk jadwal aktif.

### Notifikasi tidak tampil
Solusi:
1. Cek izin notifikasi di browser.
2. Pastikan notifikasi perangkat tidak dimatikan.
3. Reload halaman lalu cek ikon lonceng.

### Preview share artikel tidak sesuai
Solusi:
1. Pastikan bagikan URL detail artikel berbasis slug (`/articles/{slug}`).
2. Tunggu cache pratinjau platform pesan diperbarui.

## 7. Batasan dan Catatan
- Tampilan dan fitur dapat berbeda sedikit antara desktop dan mobile.
- Beberapa data (ranking, notifikasi, artikel) bergantung pada update server.
- Reset kuis ditentukan oleh kebijakan admin.

## 8. Fitur Admin (Khusus Pengurus)
### Akses admin
URL utama:
- Portal admin: `/admin/admin.html`
- Editor artikel: `/admin/editor.html`

Halaman pendukung:
- Setup admin pertama: `/admin/setup.html`
- Import soal CSV: `/admin/import.html`
- Monitor sistem: `/admin/monitor.html`
- Halaman offline admin: `/admin/offline.html`

### Struktur menu admin dan fungsinya
### Overview: Dashboard Operasional
Fungsi:
- Ringkasan statistik utama.
- Aktivitas terbaru admin.
- Titik pantau kondisi sistem harian.

### Assessment Ops: Bank Soal
Fungsi:
- Tambah, edit, hapus soal.
- Filter soal berdasarkan set kuis dan kategori.
- Menjaga kualitas bank soal.

### Assessment Ops: Hasil Assessment
Fungsi:
- Review hasil pengerjaan kuis pengguna.
- Monitoring performa peserta.

### Content Ops: Manajemen Artikel
Fungsi:
- Kelola daftar artikel.
- Buka editor artikel dan publikasi konten.
- Cari artikel berdasarkan keyword.

### Content Ops: Manajemen Materi
Fungsi:
- Kelola materi/e-book publik.
- Tambah, edit, dan atur status materi.

### Content Ops: Struktur Organisasi
Fungsi:
- Mengelola anggota per bidang (tambah, edit, hapus).
- Mengelola program kerja per bidang (tambah, edit, hapus).
- Mendukung foto anggota dari URL atau upload langsung.
- Menjaga urutan tampil anggota/program dengan field `sort_order`.

### User & Comms
Fungsi:
- Manajemen user (tambah/edit/status).
- Broadcast notifikasi ke pengguna.
- Menjalankan notifikasi terjadwal.

### System: Konfigurasi Sistem
Fungsi:
- Kelola jadwal kuis.
- Pengaturan gamifikasi.
- Pengaturan opsi asal pimpinan.
- `Danger Zone` untuk reset set kuis (aksi berisiko tinggi).

### System: Audit Log
Fungsi:
- Melihat jejak aktivitas admin untuk audit internal.

### Workflow admin yang direkomendasikan
Untuk operasional harian:
1. Buka Dashboard Operasional untuk cek status umum.
2. Cek `Jadwal Kuis` di Konfigurasi Sistem.
3. Cek `User & Comms` untuk notifikasi penting.
4. Cek `Manajemen Artikel` dan `Manajemen Materi` untuk update konten.
5. Cek `Audit Log` untuk memastikan tidak ada anomali.

Untuk publikasi artikel:
1. Buka `Manajemen Artikel`.
2. Masuk ke editor.
3. Tulis konten dan cek preview.
4. Pastikan kualitas konten valid.
5. Publikasikan.

### Catatan keamanan admin
- Gunakan akun admin hanya untuk pengurus resmi.
- Hindari berbagi kredensial.
- Lakukan logout setelah selesai, terutama di perangkat bersama.
- Gunakan `Danger Zone` hanya saat benar-benar diperlukan.

## 9. Dokumen Terkait
- Panduan admin: `docs/ADMIN_GUIDE.md`
- Panduan editor artikel: `docs/EDITOR_ARTICLE_GUIDE.md`
- Dokumentasi API: `docs/API_DOCS.md`
