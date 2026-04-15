# Implementasi Fase 1: Pengarsipan Form Jawaban Masuk

Dokumen ini menjadi blueprint teknis untuk meningkatkan modul form dari pola "inbox operasional" menjadi "arsip terstruktur tahap awal" tanpa mengganggu data berjalan.

## 1. Tujuan Fase 1

- Menetapkan metadata arsip minimum agar data mudah dicari, diaudit, dan dikelola.
- Memisahkan status review operasional dari status siklus arsip.
- Menyiapkan role permission yang lebih granular pada modul form.
- Menambahkan endpoint dasar untuk update metadata dan status arsip.
- Menjaga kompatibilitas mundur untuk frontend admin/public yang sudah aktif.

## 2. Ruang Lingkup Fase 1

Termasuk:
- Perubahan skema database non-destruktif (add column/add table/add index).
- Penyesuaian API admin forms untuk metadata arsip.
- Penyesuaian UI admin forms (tab builder/submission/inbox).
- Logging aktivitas arsip di `activity_logs`.
- Dokumen SOP dan checklist UAT.

Belum termasuk (masuk fase berikutnya):
- Auto-retention job terjadwal.
- Legal hold lintas modul.
- Export bundle arsip (PDF/ZIP + checksum).
- Mesin klasifikasi otomatis (NLP/tagging pintar).

## 3. Desain Konsep Data

### 3.1 Pemisahan Status

Tetap gunakan status yang ada:
- `form_submission_workflow.workflow_status` untuk review operasional (`unread`, `follow_up`, `done`).

Tambah status arsip baru (fase 1):
- `archive_status`: `active_archive`, `inactive_archive`, `destroy_scheduled`.

Catatan:
- Workflow menjawab pertanyaan "sudah ditinjau admin atau belum".
- Archive status menjawab pertanyaan "posisi data dalam siklus kearsipan".

### 3.2 Metadata Arsip Minimum

Untuk setiap submission, simpan metadata berikut:
- `archive_code` (kode klasifikasi arsip, contoh: `FRM-PRETEST-001`).
- `confidentiality_level` (`internal`, `restricted`, `secret`).
- `retention_years` (durasi retensi numerik, contoh `2`, `5`, `7`).
- `archive_status` (status siklus arsip).
- `archive_note` (catatan admin arsip).
- `archived_at` (waktu status masuk arsip aktif/inaktif).
- `archive_due_at` (tanggal target retensi berakhir).
- `archive_updated_by` (admin terakhir yang mengubah metadata arsip).
- `archive_updated_at` (timestamp update metadata arsip).

## 4. Perubahan Database (SQL)

Eksekusi aman via `ensureSchema()` di `api/_bootstrap.js`.

### 4.1 Alter Table `form_submissions`

```sql
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_code TEXT;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS confidentiality_level TEXT DEFAULT 'internal';
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS retention_years INT DEFAULT 2;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_status TEXT DEFAULT 'active_archive';
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_note TEXT;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_due_at TIMESTAMP;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_updated_by INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_updated_at TIMESTAMP DEFAULT NOW();
```

### 4.2 Index Tambahan

```sql
CREATE INDEX IF NOT EXISTS idx_form_submissions_archive_status ON form_submissions(archive_status, archive_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_archive_due_at ON form_submissions(archive_due_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_archive_code ON form_submissions(archive_code);
```

### 4.3 Constraint Validasi Ringan

```sql
ALTER TABLE form_submissions
  ADD CONSTRAINT chk_form_submissions_confidentiality
  CHECK (confidentiality_level IN ('internal', 'restricted', 'secret'));

ALTER TABLE form_submissions
  ADD CONSTRAINT chk_form_submissions_archive_status
  CHECK (archive_status IN ('active_archive', 'inactive_archive', 'destroy_scheduled'));

ALTER TABLE form_submissions
  ADD CONSTRAINT chk_form_submissions_retention_years
  CHECK (retention_years >= 1 AND retention_years <= 25);
```

Catatan implementasi:
- Jika constraint sudah ada, tangani error duplicate dengan try/catch di bootstrap agar tetap idempoten.

## 5. Perubahan API (Admin Forms)

Lokasi: `api/_handler_forms.js` pada route `/api/admin/forms`.

### 5.1 Action Baru: `updateArchiveMeta`

Method:
- `POST /api/admin/forms?action=updateArchiveMeta`

Request body:
```json
{
  "form_id": 12,
  "submission_id": 987,
  "archive_code": "FRM-PRETEST-001",
  "confidentiality_level": "restricted",
  "retention_years": 5,
  "archive_status": "active_archive",
  "archive_note": "Siap arsip aktif tahap 1"
}
```

Validasi:
- `form_id`, `submission_id` wajib.
- Submission harus milik `form_id` terkait.
- Enum valid untuk `confidentiality_level` dan `archive_status`.
- `retention_years` integer di rentang aman.

Aksi server:
- Hitung `archive_due_at = NOW() + retention_years`.
- Update metadata di `form_submissions`.
- Tulis log `activity_logs` action: `UPDATE_FORM_ARCHIVE_META`.

### 5.2 Action Baru: `archiveSummary`

Method:
- `GET /api/admin/forms?action=archiveSummary&id=<form_id>`

Response:
- total submission per `archive_status`
- item mendekati due date (contoh <= 30 hari)
- item `restricted/secret`

Tujuan:
- menjadi sumber data ringkas untuk dashboard mini pada tab forms.

### 5.3 Perluasan Response Existing

Perluas data dari action:
- `submissions`

Tambahkan field pada setiap item:
- `archive_code`
- `confidentiality_level`
- `retention_years`
- `archive_status`
- `archive_due_at`
- `archive_note`
- `archive_updated_at`

## 6. Perubahan Permission

Saat ini permission forms masih full-allow hardcoded.

Fase 1:
- Tambahkan flag permission baru:
  - `forms.archive_manage`
  - `forms.archive_read`
- Integrasi check permission di frontend `admin/forms.js`:
  - tombol simpan metadata arsip hanya aktif jika `archive_manage=true`.
  - badge/status arsip tetap tampil jika `archive_read=true`.

Catatan:
- Jika backend permission belum berbasis DB, gunakan fallback aman:
  - default `archive_read=true`, `archive_manage=false` untuk role non-super.

## 7. Perubahan UI Admin (forms.js)

Lokasi: `admin/forms.js`.

### 7.1 Submission Detail Panel

Tambah panel "Metadata Arsip":
- input `archive_code`
- select `confidentiality_level`
- input angka `retention_years`
- select `archive_status`
- textarea `archive_note`
- teks readonly `archive_due_at`
- tombol `Simpan Metadata Arsip`

### 7.2 Filter List Submission

Tambah filter:
- `archive_status` (`all`, `active_archive`, `inactive_archive`, `destroy_scheduled`)
- `confidentiality_level` (`all`, `internal`, `restricted`, `secret`)

### 7.3 Visual Badge

Badge baru pada item list submission:
- badge workflow (tetap)
- badge archive status (baru)
- badge confidentiality (baru)

## 8. Logging dan Audit

Tambahkan log action berikut:
- `UPDATE_FORM_ARCHIVE_META`
- `BULK_SET_ARCHIVE_STATUS` (opsional jika ada aksi massal di fase 1.1)

Field `details` minimum:
- `form_id`
- `submission_id`
- nilai lama vs baru untuk field utama (`archive_status`, `retention_years`, `confidentiality_level`)
- `updated_by`

## 9. Rencana Migrasi Aman (Tanpa Downtime)

## Tahap A - Persiapan
- Backup database.
- Deploy perubahan bootstrap (`ALTER TABLE`, index, constraint) dulu.
- Pastikan endpoint existing tetap jalan tanpa memakai kolom baru.

## Tahap B - Backend
- Tambah action baru API.
- Tambah field arsip dalam response `submissions`.
- Logging metadata arsip aktif.

## Tahap C - Frontend Admin
- Rilis panel metadata arsip di `forms.js`.
- Rilis filter baru.
- Guard dengan permission agar tidak merusak role lama.

## Tahap D - Verifikasi
- UAT admin internal.
- Monitor error API 400/500 selama 3-7 hari.
- Rollback plan: nonaktifkan aksi baru via guard frontend jika ditemukan issue.

## 10. Checklist UAT Fase 1

- Admin dapat melihat metadata arsip di detail submission.
- Admin dengan izin `archive_manage` dapat mengubah metadata arsip.
- Admin tanpa izin `archive_manage` tidak bisa simpan perubahan.
- Validasi enum berjalan (input tidak valid ditolak 400).
- `archive_due_at` terhitung sesuai `retention_years`.
- Filter by `archive_status` dan `confidentiality_level` bekerja.
- Activity log tersimpan setiap metadata arsip diubah.
- Submission lama (sebelum migrasi) tetap bisa dibuka dan tidak error.

## 11. Risiko dan Mitigasi

- Risiko: query submissions melambat setelah join field tambahan.
  - Mitigasi: index tambahan pada `archive_status`, `archive_due_at`.
- Risiko: permission belum granular penuh.
  - Mitigasi: guard UI + fallback deny untuk aksi update arsip.
- Risiko: data lama tidak punya nilai metadata lengkap.
  - Mitigasi: default aman (`internal`, `active_archive`, `retention_years=2`).

## 12. Definisi Selesai (Definition of Done)

Fase 1 dianggap selesai jika:
- Skema database baru aktif dan idempoten.
- API metadata arsip aktif dan tervalidasi.
- UI admin dapat baca/tulis metadata arsip (sesuai izin).
- Audit log tercatat.
- UAT lulus untuk skenario inti.

