# Dokumentasi Aplikasi Web IPM Panawuan
## Fokus Fitur User dan Publik

## 1. Tujuan, Audiens, dan Cakupan
Dokumen ini dibuat untuk menjelaskan fitur aplikasi web IPM Panawuan dari sisi pengguna umum dan user terdaftar.

Dokumen ini ditujukan untuk:
- Pengurus organisasi yang ingin memahami alur aplikasi.
- Stakeholder non-teknis yang butuh gambaran fitur secara jelas.
- Tim operasional yang membantu sosialisasi penggunaan aplikasi.

Cakupan dokumen:
- Halaman publik dan fitur user.
- Alur penggunaan utama dari awal sampai fitur lanjutan.
- Aturan penggunaan dan batasan yang perlu diketahui user.
- FAQ dan troubleshooting praktis.

Di luar cakupan:
- Detail teknis admin panel secara mendalam.
- Detail implementasi database atau infrastruktur deployment.

---

## 2. Gambaran Aplikasi Singkat
Aplikasi ini adalah portal web organisasi yang menyatukan:
- Informasi organisasi dan program kerja.
- Artikel publik.
- Perpustakaan materi digital.
- Kuis edukatif dan ranking.
- Notifikasi update dan dukungan instalasi seperti aplikasi (PWA).

Secara pengalaman pengguna, aplikasi ini didesain mobile-first, tetap nyaman di desktop, dan bisa diakses tanpa login untuk sebagian besar konten publik.

---

## 3. Peta Halaman Publik dan User

| Halaman | URL | Fungsi Utama |
|---|---|---|
| Beranda | `/index.html` atau `/` | Ringkasan organisasi, highlight program kerja, artikel terbaru |
| Struktur Organisasi | `/struktur-organisasi.html` | Lihat bidang, anggota, program kerja, kirim kritik/saran |
| Artikel | `/articles` | Daftar artikel, pencarian, filter, baca detail |
| Perpustakaan | `/materi.html` | Cari dan baca materi digital (termasuk PDF/Drive) |
| Kuis Gamified | `/quiz-gamified.html` | Kerjakan kuis dengan sistem XP, streak, dan quest |
| Ranking | `/ranking.html` | Lihat leaderboard dan posisi user |
| Bantuan | `/help.html` | Panduan fitur, FAQ ringkas, dan kontak bantuan |
| Login | `/login.html` | Masuk akun user |
| Register | `/register.html` | Daftar akun baru |
| Profil | `/profile/index.html` | Redirect ke beranda lalu membuka modal profil user |

Catatan:
- Akses konten publik (beranda, artikel, materi, struktur, bantuan) tidak wajib login.
- Akses kuis, profil, dan notifikasi personal memerlukan login.

---

## 4. Alur Pengguna Utama (Step-by-Step)

### 4.1 Alur Pengunjung Baru
1. Buka beranda.
2. Jelajahi program kerja, artikel terbaru, atau struktur organisasi.
3. Buka perpustakaan untuk melihat materi publik.
4. Jika ingin ikut kuis, user diarahkan login terlebih dahulu.

### 4.2 Alur Pengguna Terdaftar
1. Login melalui halaman login.
2. Setelah berhasil login, user diarahkan ke halaman kuis gamified.
3. Pilih set kuis yang tersedia dan kerjakan sampai selesai.
4. Cek hasil dan lanjut lihat posisi di ranking.
5. Buka profil untuk melihat info akun, aktivitas, dan notifikasi.

### 4.3 Alur Pengguna yang Kembali
1. User membuka kembali aplikasi.
2. Di perpustakaan, user dapat melanjutkan materi terakhir (fitur "Lanjut Baca").
3. Di notifikasi, user melihat update artikel/program kerja terbaru.
4. User melanjutkan aktivitas kuis atau membaca artikel baru.

---

## 5. Dokumentasi Fitur per Halaman

### 5.1 Beranda
Fitur utama:
- Hero section organisasi.
- Highlight program kerja dengan countdown event.
- Artikel terbaru.
- Menu cepat ke halaman penting.

Perilaku penting:
- Data highlight program kerja dan artikel terbaru diambil otomatis.
- Ada dukungan notifikasi dan elemen profil dari header global.
- Navigasi mobile dan bottom navigation tersedia.

### 5.2 Login dan Register

#### Login
Input:
- Username.
- Password.
- Opsi "Ingat saya".

Alur:
1. User isi username dan password.
2. Sistem validasi input wajib.
3. Jika sukses, session disimpan (session/local storage sesuai "ingat saya").
4. User diarahkan ke halaman kuis gamified.

Jika gagal:
- Muncul pesan error yang mudah dipahami.

#### Register
Input:
- Nama Panjang.
- Asal Pimpinan (dipilih dari daftar).
- Username.
- Password.

Alur:
1. User isi data.
2. Sistem validasi kelengkapan input.
3. Jika sukses, user diarahkan ke halaman login.

Jika gagal:
- Muncul pesan error pendaftaran.

### 5.3 Profil User
Profil tampil sebagai modal overlay dari header.

Informasi yang ditampilkan:
- Username.
- Nama lengkap.
- Asal pimpinan.
- Ringkasan aktivitas kuis (status, skor terakhir, total kuis, ranking).
- Ringkasan notifikasi.

Aksi:
- Buka/tutup panel notifikasi di profil.
- Logout (menghapus session user di browser).

### 5.4 Artikel Publik

#### Daftar Artikel
Fitur:
- Search artikel.
- Sortir (terbaru, terpopuler, terlama).
- Filter kategori.
- Load more.
- Sidebar artikel terbaru dan kategori cepat.

#### Detail Artikel
Fitur:
- Tampilan baca fokus.
- Metadata artikel (penulis, tanggal, estimasi waktu baca).
- Daftar isi otomatis (jika heading mencukupi).
- Progress baca.
- Rekomendasi "Bacaan Berikutnya".
- Tombol share (native share, salin link, WhatsApp).

### 5.5 Perpustakaan Materi
Fitur utama:
- Search materi.
- Filter kategori.
- Daftar materi dengan thumbnail lazy loading.
- Infinite load per batch.

Reader materi:
- Klik materi membuka modal reader.
- Google Drive file dibuka dengan mode preview bila terdeteksi.
- File PDF dibaca langsung di aplikasi dengan kontrol:
  - Halaman sebelumnya/berikutnya.
  - Zoom in/out.
- Jika viewer gagal, sistem memberi mode fallback "buka tab baru".

Fitur "Lanjut Baca":
- Sistem menyimpan materi terakhir yang dibaca (termasuk posisi halaman PDF bila tersedia).
- User dapat melanjutkan dari posisi terakhir lewat kartu "Terakhir Dibaca".

### 5.6 Struktur Organisasi
Fitur utama:
- Visualisasi bidang organisasi (pimpinan, unsur inti, bidang pelaksana).
- Detail bidang: anggota dan program kerja.
- Modal detail anggota (profil singkat, role, quote, tautan Instagram jika ada).

Feedback program kerja:
- User dapat mengirim kritik/saran.
- Form dapat memuat nama, kontak, subjek, dan pesan.
- Pesan dikirim ke backend untuk ditindaklanjuti admin.

### 5.7 Kuis Gamified
Fitur utama:
- Pemilihan set kuis aktif.
- Timer per soal.
- XP, level, streak, quest, badge.
- Ringkasan hasil setelah submit.

Perilaku penting:
- Tiap set kuis normalnya hanya bisa diselesaikan 1 kali per user.
- Set bisa terbuka lagi jika admin melakukan reset attempt/set.
- Penilaian final disimpan di server saat kuis selesai.

### 5.8 Ranking
Fitur:
- Podium Top 3.
- List ranking peserta.
- Highlight posisi user saat ini.
- Filter (semua, mingguan, harian) dan search nama.
- Update berkala otomatis.

Catatan periode:
- Ada catatan periode bulanan.
- Data ranking di sisi backend memiliki mekanisme reset bulanan.

### 5.9 Notifikasi
Jenis notifikasi:
- Notifikasi update artikel terbaru.
- Notifikasi personal user (misalnya tindakan terkait akun/kuis).
- Countdown program kerja mendatang pada panel notifikasi.

Fitur panel:
- Badge unread.
- Daftar notifikasi terbaru.
- Tombol tandai semua dibaca.
- Dukungan push notification (jika user memberi izin browser).

### 5.10 Bantuan
Halaman bantuan berisi:
- Panduan navigasi cepat.
- Cara login/register.
- Ringkasan alur kuis dan ranking.
- Catatan notifikasi, PWA install, keamanan akun.
- FAQ singkat dan kontak bantuan.

---

## 6. Aturan dan Batasan Penting untuk User
- Set kuis hanya bisa dikerjakan sekali sampai di-reset admin.
- Fitur kuis, profil, dan notifikasi personal memerlukan login.
- Notifikasi push bergantung izin browser/perangkat user.
- Konten publik tetap bisa diakses tanpa login.
- Koneksi internet tetap diperlukan untuk sinkronisasi data terbaru.

---

## 7. FAQ Pengguna

### Apakah harus login untuk membaca artikel dan materi?
Tidak. Artikel, materi, struktur organisasi, dan bantuan dapat diakses tanpa login.

### Kenapa saya tidak bisa mengerjakan set kuis yang sama lagi?
Karena set kuis dibatasi satu kali percobaan per user, kecuali sudah di-reset admin.

### Kenapa notifikasi lock screen tidak muncul?
Kemungkinan izin notifikasi browser belum aktif, atau subscription push belum aktif.

### Apakah saya bisa melanjutkan membaca materi terakhir?
Bisa. Di halaman perpustakaan ada kartu "Terakhir Dibaca" jika data bacaan terakhir tersedia.

### Kenapa ranking terlihat berubah?
Ranking diperbarui dari hasil kuis terbaru dan memiliki periode bulanan.

---

## 8. Troubleshooting Pengguna

### Gagal Login
Langkah cek:
1. Pastikan username/password benar.
2. Coba ulang dengan koneksi internet stabil.
3. Jika masih gagal, hubungi admin untuk verifikasi akun.

### Kuis Tidak Bisa Dimulai
Langkah cek:
1. Pastikan sudah login.
2. Pastikan set yang dipilih belum pernah diselesaikan.
3. Coba muat ulang halaman kuis.

### Notifikasi Tidak Muncul
Langkah cek:
1. Pastikan izin notifikasi browser "Allow".
2. Pastikan perangkat tidak memblokir notifikasi situs.
3. Buka panel notifikasi untuk cek data in-app.

### Materi PDF Tidak Bisa Dibuka di Modal
Langkah cek:
1. Coba gunakan tombol "Tab Baru".
2. Pastikan link materi valid dan file dapat diakses publik.
3. Coba ulang setelah koneksi stabil.

### Data Artikel/Ranking Terasa Belum Terbaru
Langkah cek:
1. Refresh halaman.
2. Tunggu interval update otomatis.
3. Tutup-buka kembali halaman jika perlu.

---

## 9. Lampiran Ringkas

### 9.1 Istilah Penting
- PWA: Website yang bisa dipasang seperti aplikasi di layar utama.
- Push Notification: Notifikasi dari aplikasi yang bisa muncul di lock screen/perangkat.
- Leaderboard/Ranking: Daftar peringkat peserta berdasarkan hasil kuis.
- Streak: Rangkaian jawaban benar beruntun dalam kuis.
- Quest/Badge: Target progres dan pencapaian gamifikasi.

### 9.2 Endpoint yang Terlihat dari Sisi User (Ringkas)
Daftar ini disajikan untuk konsistensi dokumentasi lintas tim, bukan untuk penggunaan teknis end-user.

| Endpoint | Fungsi dari Sudut Pandang User |
|---|---|
| `POST /api/auth/login` | Masuk akun |
| `POST /api/auth/register` | Daftar akun |
| `GET /api/auth?action=pimpinanOptions` | Ambil pilihan asal pimpinan saat register |
| `GET /api/articles` | Ambil daftar/detail artikel |
| `GET /api/materials` | Ambil daftar materi perpustakaan |
| `GET /api/organization` | Ambil data struktur organisasi |
| `POST /api/feedback` | Kirim kritik/saran |
| `GET /api/questions` | Ambil set soal, summary, jadwal, gamification settings |
| `GET /api/results` | Ambil data ranking/hasil |
| `POST /api/results` | Simpan hasil kuis |
| `GET /api/users?username=...` | Ambil data profil user |
| `GET /api/users?action=notifications` | Ambil notifikasi user |
| `POST /api/users?action=markNotificationsRead` | Tandai notifikasi sebagai dibaca |
| `GET /api/push?action=publicKey` | Ambil public key push |
| `POST /api/push?action=subscribe` | Daftarkan perangkat ke push notification |

### 9.3 Public APIs / Interfaces / Types
- Tidak ada perubahan API, interface, atau tipe data aplikasi.
- Dokumen ini bersifat dokumentasi saja (documentation-only).

---

## 10. Checklist Validasi Dokumen
Checklist ini dipakai untuk memastikan isi dokumentasi sudah tepat:

1. Cakupan lengkap: semua fitur user/publik sudah punya subbagian.
2. Alur konsisten: langkah penggunaan sesuai perilaku UI aktual.
3. Istilah akurat: nama halaman/fitur sesuai aplikasi.
4. Aturan penting tepat: one-attempt quiz, login gate, notifikasi, lanjut baca materi.
5. Format rapi: heading dan struktur markdown jelas.
6. Keterbacaan non-teknis: bahasa mudah dipahami stakeholder non-dev.

---

## 11. Asumsi dan Default Dokumen
- Bahasa: Indonesia.
- Format: satu file markdown baru.
- Fokus: panduan fitur user/public, bukan panduan admin mendalam.
- Kedalaman teknis: minimal agar tetap akurat dan tidak misleading.
- Dokumen lama tetap dipertahankan dan tidak ditimpa.
