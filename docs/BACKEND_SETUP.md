# Backend Vercel untuk IPMWeb — Panduan Langkah Demi Langkah (Pemula)

Dokumen ini memandu Anda (benar-benar pemula) untuk menyiapkan backend di Vercel agar website bisa menyimpan/mengambil data dari database dengan mudah dan aman. Ikuti urutannya, verifikasi setiap langkah sebelum lanjut.

## Istilah Penting (Bahasa Sederhana)

- Vercel: layanan hosting yang dapat menjalankan website dan fungsi backend tanpa server rumit.
- Serverless Function: potongan kode backend yang berjalan “sesekali” saat ada request (misalnya `/api/...`).
- Database (Postgres): tempat menyimpan data terstruktur (tabel baris-kolom). Vercel Postgres adalah Postgres yang disediakan Vercel.
- Environment Variable (env): nilai rahasia (mis. URL database, token admin) yang disimpan aman di pengaturan Vercel, bukan di file kode.
- Endpoint API: alamat (URL) untuk operasi (misalnya `GET /api/questions` untuk membaca pertanyaan).
- Token Admin: “kunci rahasia” untuk mengizinkan aksi sensitif seperti membuat/mengubah/menghapus data.

## Prasyarat

- Anda sudah punya akun Vercel dan project website ter-deploy.
- Anda bisa masuk ke Dashboard Vercel (vercel.com) dan melihat project Anda.
- Website Anda menggunakan repo yang sekarang berisi folder `api/` (backend) dan file `vercel.json` (konfigurasi).

## Ringkasan Fitur yang Sudah Disediakan

- Koneksi database: [api/db.js](file:///c:/.vscode/ipmweb/api/db.js)
- Endpoint kesehatan: [api/health.js](file:///c:/.vscode/ipmweb/api/health.js)
- Endpoint migrasi tabel: [api/migrate.js](file:///c:/.vscode/ipmweb/api/migrate.js)
- Endpoint CRUD:
  - Pertanyaan: [api/questions.js](file:///c:/.vscode/ipmweb/api/questions.js)
  - Pengguna: [api/users.js](file:///c:/.vscode/ipmweb/api/users.js)
  - Hasil: [api/results.js](file:///c:/.vscode/ipmweb/api/results.js)
- Util JSON & Caching: [api/_util.js](file:///c:/.vscode/ipmweb/api/_util.js)
- Client contoh: [scripts/api-client.js](file:///c:/.vscode/ipmweb/scripts/api-client.js)
- Konfigurasi: [vercel.json](file:///c:/.vscode/ipmweb/vercel.json), [.env.example](file:///c:/.vscode/ipmweb/.env.example)

---

## Langkah 1 — Buat Database Vercel Postgres

1. Masuk ke Dashboard Vercel → pilih project website Anda.
2. Buka tab “Storage” (atau “Databases”) → buat “Vercel Postgres”.
3. Ikuti wizard hingga selesai. Setelah dibuat, Anda akan melihat kredensial (URL database).

Verifikasi:
- Anda melihat sebuah database aktif terhubung ke project. Catat `POSTGRES_URL` yang ditampilkan.

Catatan:
- Vercel Postgres biasanya memanfaatkan Neon di belakang layar — detail teknisnya tidak perlu Anda khawatirkan.

## Langkah 2 — Atur Environment Variables (Rahasia)

1. Di Dashboard Vercel → Project Settings → Environment Variables.
2. Tambah variabel:
   - `POSTGRES_URL` → isi dengan URL dari langkah sebelumnya.
   - `ADMIN_TOKEN` → isi dengan string acak yang kuat (misal hasil copy dari generator password).
3. Simpan perubahan.

Verifikasi:
- Di halaman Environment Variables, kedua variable terlihat dan statusnya “Available”.
- Anda tidak menaruh nilai rahasia di file kode (tidak ada di repository).

Istilah:
- `ADMIN_TOKEN` digunakan untuk mencegah orang tak berwenang melakukan perubahan data melalui endpoint admin.

## Langkah 3 — Deploy Ulang Project

1. Klik “Deploy” atau tunggu auto-deploy berjalan setelah perubahan env.
2. Pastikan deployment sukses (status “Ready”).

Verifikasi:
- Buka URL website produksi Anda.
- Akses `GET /api/health` di browser: `https://domain-anda/api/health`.
- Hasil yang benar: JSON `{"status":"success","ok":true,...}`.

Jika gagal:
- Cek Logs di Vercel untuk fungsi `api/health`.
- Pastikan `vercel.json` ada dan fungsi `api/*.js` terdeteksi.

## Langkah 4 — Buat Tabel dengan Endpoint Migrasi

1. Kirim request `POST` ke `https://domain-anda/api/migrate`.
   - Cara mudah: gunakan alat seperti Postman, atau gunakan browser dengan ekstensi REST Client, atau jalankan perintah ini di PowerShell:
     - `curl -X POST https://domain-anda/api/migrate`
2. Endpoint akan membuat tabel `users`, `questions`, `results` jika belum ada.

Verifikasi:
- Respons JSON `{"status":"success"}`.
- Jika error: periksa `POSTGRES_URL` benar dan database aktif.

## Langkah 5 — Uji Endpoint Baca (GET)

1. Pertanyaan: buka `https://domain-anda/api/questions`.
   - Seharusnya mengembalikan `{ status:"success", questions: [] }` (kosong jika belum ada data).
2. Pengguna: `https://domain-anda/api/users` → `{ status:"success", users: [] }`.
3. Hasil: `https://domain-anda/api/results` → `{ status:"success", results: [] }`.

Verifikasi Caching:
- Buka DevTools (F12) → tab Network → klik response → lihat headers `Cache-Control` dan `ETag`.
- Adanya `ETag` dan `Cache-Control` menandakan caching sudah aktif.

## Langkah 6 — Uji Endpoint Tulis (POST/PUT/DELETE)

Perlu `ADMIN_TOKEN` untuk endpoint admin (pertanyaan/pengguna). Kirim di header: `Authorization: Bearer <ADMIN_TOKEN>`.

Contoh buat pertanyaan (PowerShell):

```
curl -X POST https://domain-anda/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d "{\"question\":\"Siapa pendiri IPM?\",\"options\":{\"a\":\"Opsi A\",\"b\":\"Opsi B\",\"c\":\"Opsi C\",\"d\":\"Opsi D\"},\"correct_answer\":\"a\",\"active\":true,\"category\":\"Sejarah\",\"quiz_set\":1}"
```

Verifikasi:
- Respons HTTP 201 dan field `question` berisi data yang baru dibuat.
- Buka `GET /api/questions` → pertanyaan baru muncul.

Update/Hapus:
- `PUT /api/questions` dengan body berisi `id` dan kolom yang diubah.
- `DELETE /api/questions?id=123` untuk menghapus.

## Langkah 7 — Integrasi di Website (Contoh Klien)

1. Sertakan client helper di halaman admin (opsional):
   - `<script src="/scripts/api-client.js" defer></script>`
2. Contoh pakai di browser:

```
IpmApi.listQuestions(1).then(d => console.log('Pertanyaan:', d.questions))
IpmApi.submitResult({ username:'user1', score:8, total:10, percent:80, time_spent:120000, quiz_set:1 })
```

Verifikasi:
- Cek console → terlihat daftar pertanyaan.
- Cek `GET /api/results` → ada hasil baru.

Catatan keamanan:
- Jangan letakkan `ADMIN_TOKEN` di klien; gunakan hanya pada operasi admin dari lingkungan yang terkontrol.

## Langkah 8 — Migrasi Data dari Spreadsheet (Praktis)

Cara paling mudah tanpa alat DB:

1. Ekspor sheet pertanyaan ke CSV.
2. Konversi CSV ke JSON (banyak situs online menyediakan konversi).
3. Di browser, jalankan script kecil yang memanggil `POST /api/questions` per baris JSON dengan `Authorization: Bearer <ADMIN_TOKEN>` (gunakan DevTools Console).

Contoh (pseudo):

```
const token = '<ADMIN_TOKEN>'; // JANGAN simpan di file produksi
for (const row of dataJson) {
  await fetch('/api/questions', {
    method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
    body: JSON.stringify({ question: row.question, options:{ a:row.a, b:row.b, c:row.c, d:row.d }, correct_answer: row.correct, active:true, category: row.category, quiz_set: Number(row.quiz_set||1) })
  });
}
```

Verifikasi:
- `GET /api/questions` menampilkan semua data yang berhasil diimpor.

Alternatif (lebih teknis):
- Gunakan alat `psql` atau GUI untuk import CSV langsung ke Postgres (opsi ini memerlukan pengetahuan tambahan).

## Langkah 9 — Keamanan & Praktik Baik

- Gunakan token admin kuat dan simpan hanya di environment Vercel.
- Jangan expose kredensial DB ke klien.
- Operasi admin (buat/update/hapus) hanya dari halaman admin atau alat terkontrol.
- Caching GET aktif; untuk data admin yang sering berubah, sesuaikan waktu cache di [api/_util.js](file:///c:/.vscode/ipmweb/api/_util.js).

## Langkah 10 — Troubleshooting (Jika Ada Kendala)

- 404 pada `/api/*`: pastikan `vercel.json` ada dan file berada di folder `api/`.
- 500 error: cek Logs fungsi terkait di Dashboard Vercel; pastikan `POSTGRES_URL` benar.
- Unauthorized: pastikan header `Authorization: Bearer <ADMIN_TOKEN>` dikirim.
- Data tidak muncul: jalankan ulang `POST /api/migrate` untuk memastikan tabel ada.

---

## Daftar Endpoint (Ringkas)

- `GET /api/health`
- `POST /api/migrate`
- `GET /api/questions?set=1`
- `POST /api/questions` (Authorization Bearer `ADMIN_TOKEN`)
- `PUT /api/questions` (Authorization)
- `DELETE /api/questions?id=123` (Authorization)
- `GET /api/users`
- `POST /api/users` (Authorization)
- `PUT /api/users` (Authorization)
- `DELETE /api/users?id=1` (Authorization)
- `GET /api/results`
- `POST /api/results`
- `DELETE /api/results` (Authorization)
