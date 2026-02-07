# Panduan Admin Sistem Kuis IPM

Dokumen ini menjelaskan cara menggunakan fitur administrasi untuk mengelola kuis, user, jadwal, dan melihat log aktivitas.

## 1. Akses Admin
1. Buka halaman `/admin/admin.html` (atau klik ikon gear di header kuis).
2. Masukkan Username dan Password admin yang telah dikonfigurasi di environment variable (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).
3. Klik "Masuk".

## 2. Dashboard Admin
Setelah login, Anda akan melihat Sidebar navigasi di sebelah kiri (desktop) atau menu bawah (mobile).
- **Dashboard**: Ringkasan statistik (Total User, Kuis Selesai, Jadwal Aktif) dan aktivitas terbaru.
- **Bank Soal**: Manajemen bank soal (CRUD).
- **Hasil Kuis**: Melihat riwayat pengerjaan kuis oleh user.
- **Manajemen User**: Pengelolaan data pengguna lengkap.
- **Jadwal & Setting**: Pengaturan jadwal kuis dan reset data.
- **Activity Logs**: Catatan audit trail sistem.

Fitur tambahan:
- **Dark Mode**: Toggle tema gelap/terang di pojok kanan atas.

## 3. Manajemen Soal (Tab Soal)
- **Tambah Soal**: Klik tombol FAB (+) di pojok kanan bawah. Isi form soal, opsi jawaban, kunci jawaban, kategori, dan set kuis.
- **Edit Soal**: Klik tombol "Edit" pada kartu soal.
- **Hapus Soal**: Klik tombol "Hapus" pada kartu soal.
- **Filter**: Gunakan dropdown di atas untuk memfilter berdasarkan Set Kuis atau Kategori.
- **Cari**: Gunakan kolom pencarian untuk mencari isi pertanyaan.

## 4. Manajemen User (Tab User)
- **Tambah User**: Klik tombol "Tambah User" untuk mendaftarkan user baru atau admin baru secara manual.
- **Edit User**: Klik tombol "Edit" pada kartu user untuk mengubah Username, Email, Role, Password, atau Status Aktif.
- **Filter & Sortir**: Filter berdasarkan status (Aktif/Nonaktif) dan urutkan berdasarkan skor atau aktivitas.
- **Reset Attempt**: Reset status pengerjaan kuis spesifik user agar bisa mengerjakan ulang.
- **Hapus User**: Menghapus user beserta seluruh data riwayatnya (Logs, Hasil, Notifikasi).

## 5. Pengaturan Jadwal & Reset (Tab Setting)
### Manajemen Jadwal
- **Lihat Jadwal**: Daftar jadwal kuis aktif/akan datang ditampilkan.
- **Tambah Jadwal**: Klik "Tambah Jadwal Baru", isi Judul, Waktu Mulai, dan Waktu Selesai.
- **Edit Jadwal**: Klik "Edit" pada item jadwal untuk mengubah waktu.
- **Countdown**: Jadwal yang aktif akan memicu tampilan countdown di halaman user jika waktu mulai belum tiba.

### Reset Global
- **Reset Set Kuis**: Fitur ini digunakan untuk menghapus **SEMUA** data hasil pengerjaan user untuk satu set kuis tertentu (misal: Reset Kuis 1 untuk memulai periode baru).
- **Peringatan**: Tindakan ini tidak dapat dibatalkan. Anda harus mengetik "RESET" untuk konfirmasi.

## 6. Log Aktivitas (Tab Logs)
- Sistem mencatat tindakan penting admin seperti:
  - Login admin
  - Reset attempt user
  - Hapus user
  - Update jadwal
  - Reset global set
- Gunakan tab ini untuk audit trail jika terjadi perubahan data yang tidak diinginkan.

## 7. Troubleshooting
- Jika data tidak muncul, klik tombol "Refresh" di pojok kanan atas tab masing-masing.
- Jika terjadi error "Unauthorized", coba logout dan login kembali.
- Pastikan koneksi internet stabil karena sistem menggunakan database cloud.
