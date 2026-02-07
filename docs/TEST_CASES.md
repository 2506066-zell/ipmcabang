# Test Cases: Sistem Notifikasi Countdown & Reset

Dokumen ini berisi skenario pengujian untuk memverifikasi fitur Notifikasi Countdown dan Reset Kuis.

## 1. Panel Admin - Manajemen Jadwal

### TC-01: Membuat Jadwal Baru (Happy Path)
**Langkah:**
1. Login sebagai Admin.
2. Buka tab "Jadwal".
3. Klik tombol "Tambah Jadwal Baru".
4. Isi Judul: "Kuis Akbar", Deskripsi: "Uji wawasanmu tentang kemerdekaan", Waktu Mulai: (Besok), Waktu Selesai: (Lusa).
5. Klik "Simpan Jadwal".
**Ekspektasi:**
- Loader muncul "Menyimpan...".
- Modal tertutup.
- Toast muncul "Jadwal tersimpan".
- Jadwal baru muncul di daftar dengan status "NONAKTIF" (karena belum mulai) atau "AKTIF" (jika waktu sesuai).

### TC-02: Validasi Waktu Mundur
**Langkah:**
1. Tambah Jadwal Baru.
2. Isi Waktu Mulai: (Lusa).
3. Isi Waktu Selesai: (Besok).
4. Klik "Simpan".
**Ekspektasi:**
- Pesan error muncul: "Waktu selesai harus setelah waktu mulai".
- Data tidak tersimpan.

### TC-03: Preview Notifikasi
**Langkah:**
1. Isi form jadwal dengan Judul dan Deskripsi.
2. Klik tombol "Preview".
**Ekspektasi:**
- Panel overlay muncul menampilkan simulasi tampilan notifikasi di sisi user.
- Judul dan Deskripsi sesuai input.
- Timer berjalan (mock).
- Klik "Tutup Preview" menutup overlay.

### TC-04: Edit Jadwal
**Langkah:**
1. Klik tombol "Edit" pada salah satu jadwal.
2. Ubah Deskripsi.
3. Klik "Simpan".
**Ekspektasi:**
- Perubahan tersimpan dan terlihat di daftar (snippet deskripsi).

## 2. User Frontend - Notifikasi Countdown

### TC-05: Tampilan Countdown (Desktop & Mobile)
**Langkah:**
1. Buka halaman Kuis (`/quiz.html`) sebagai User.
2. Pastikan ada jadwal aktif yang akan datang.
**Ekspektasi:**
- Box "Kuis Berikutnya" muncul.
- Judul dan Topik/Deskripsi sesuai.
- Timer (Jam : Menit : Detik) berjalan mundur secara real-time.
- Layout grid responsif (rapi di HP dan Desktop).

### TC-06: Real-time Update (SSE)
**Langkah:**
1. Buka halaman Kuis di Browser A.
2. Buka Panel Admin di Browser B.
3. Di Admin, ubah Judul jadwal aktif menjadi "Judul Baru Revisi".
4. Simpan perubahan di Admin.
5. Amati Browser A (tanpa refresh).
**Ekspektasi:**
- Dalam waktu 10-15 detik (interval polling SSE), judul di Browser A berubah otomatis menjadi "Judul Baru Revisi".
- Toast notifikasi "Info kuis diperbarui" muncul di Browser A.

### TC-07: Timer Habis
**Langkah:**
1. Set jadwal kuis yang akan mulai dalam 1 menit.
2. Tunggu di halaman user.
**Ekspektasi:**
- Saat timer mencapai 00:00:00, teks topik berubah menjadi "Kuis telah dimulai! Silakan refresh.".
- Warna teks menjadi hijau/highlight.

## 3. Fitur Reset Kuis

### TC-08: Reset Global dengan Konfirmasi
**Langkah:**
1. Di Admin > Tab Jadwal/Setting.
2. Pilih "Kuis 1" pada dropdown Reset.
3. Klik tombol "Reset Total Set Kuis".
4. Pada prompt konfirmasi browser, klik "Cancel".
**Ekspektasi:**
- Proses dibatalkan, data tidak terhapus.

### TC-09: Reset Global Eksekusi
**Langkah:**
1. Ulangi langkah reset.
2. Pada prompt, ketik sembarang teks (bukan "RESET").
**Ekspektasi:**
- Alert "Batal" muncul. Data aman.
3. Ulangi, ketik "RESET" (huruf besar).
**Ekspektasi:**
- Loader muncul "Mereset Global...".
- Toast sukses muncul.
- Data hasil kuis untuk set tersebut terhapus di database (cek via Tab Hasil).
- Log aktivitas tercatat di Tab Logs.
