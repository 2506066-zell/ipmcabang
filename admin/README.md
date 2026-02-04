# Admin Kuis

Folder ini berisi UI admin (static) + contoh kode Google Apps Script untuk backend kuis.

## File
- `admin/admin.html` — halaman admin (CRUD soal, lihat hasil).
- `admin/admin.js` — logic admin.
- `admin/apps-script.gs` — backend Apps Script (web app).

## Cara pakai (ringkas)
1. Buat / buka Google Apps Script project.
2. Salin isi `admin/apps-script.gs` ke file `Code.gs` (atau import sebagai file baru).
3. Edit list admin login di bagian `ADMINS_` (username + password) di `admin/apps-script.gs`.
4. (Opsional) Jalankan sekali fungsi `setup_()` dari Apps Script editor (Run) untuk membuat header sheet otomatis.
5. Set Script Properties:
   - `SPREADSHEET_ID` = ID Google Sheet database kuis (agar admin & kuis pakai database yang sama)
   - (opsional) `QUESTIONS_SHEET` = nama sheet soal (default: `Questions`)
   - (opsional) `RESULTS_SHEET` = nama sheet hasil (default: `Results`)
6. Deploy sebagai Web App (Execute as: Me; Who has access: Anyone).
7. Buka `admin/admin.html`, isi:
   - Username + Password (sesuai `ADMINS_`)

Catatan: Kalau URL Web App berubah, update `DEFAULT_API_URL` di `admin/admin.js`.

## Struktur sheet (default)
Sheet soal (`Questions`) butuh header di baris pertama:
`id, question, a, b, c, d, correct_answer, active`

- Kalau sheet kamu sudah terlanjur pakai header Indonesia seperti: `Pertanyaan`, `Opsi A`, `Jawaban Benar`, script ini tetap bisa baca/tulis (akan masuk ke kolom A–G sesuai header tersebut).

- `id` angka unik
- `correct_answer` isi `a/b/c/d`
- `active` isi `TRUE/FALSE` (atau kosong = dianggap aktif)

Sheet hasil (`Results`) akan dibuat otomatis jika belum ada.

Catatan: Karena web app bisa diakses publik, pakai password yang kuat dan pertimbangkan pembatasan akses deploy (mis. hanya akun tertentu) kalau memungkinkan.
https://script.google.com/macros/s/AKfycbzQfRpw3cbu_FOfiA4ftjv-9AcWklpSZieRJZeotvwVSc3lkXC6i3saKYtt4P0V9tVn/exec