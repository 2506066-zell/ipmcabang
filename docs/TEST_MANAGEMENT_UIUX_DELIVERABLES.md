# UI/UX Deliverables - Manajemen Pretest/Posttest

Dokumen ini merangkum deliverables desain + implementasi antarmuka untuk modul admin pretest/posttest.

## 1) Mockup Desktop (Wireframe)

### Screen A - Daftar Test + Status

```text
+-------------------------------------------------------------------------------------------+
| Sidebar Test                                                                             |
| [ + Baru ]                                                                               |
| ┌───────────────────────────────────────────────────────────────────────────────────────┐ |
| | PRETEST MUSYRAN 2026 • 20260415 • v1                                 [AKTIF]        | |
| | Progress: 58% | 128 submission | 70 direview | Updated: 15 Apr 2026 11:23          | |
| └───────────────────────────────────────────────────────────────────────────────────────┘ |
| ┌───────────────────────────────────────────────────────────────────────────────────────┐ |
| | POSTTEST MUSYRAN 2026 • 20260420 • v2                               [KADALUARSA]    | |
| | Progress: 100% | 212 submission | 212 direview | Updated: 20 Apr 2026 17:20        | |
| └───────────────────────────────────────────────────────────────────────────────────────┘ |
+-------------------------------------------------------------------------------------------+
```

### Screen B - Flow Peserta (Klik Test -> List Peserta)

```text
+-------------------------------------------------------------------------------------------+
| Toolbar: [Builder] [Submissions] [Inbox] [Sort] [Search] [Filter] [Refresh]            |
+---------------------------------------------+---------------------------------------------+
| Panel Kiri: Daftar Peserta                 | Panel Kanan: Detail Peserta                 |
| [Nama A] Skor 8/10 [SELESAI]               | Nama: Nama A                                 |
| [Nama B] Skor 6/10 [BARU]                  | Username: @nama_a                            |
| [Nama C] Skor 9/10 [FOLLOW UP]             | Skor Total: 8 / 10                           |
| ...                                         |----------------------------------------------|
|                                             | Q1 - Pilihan Ganda                           |
|                                             | Jawaban: B | Status: BENAR | Kunci: B        |
|                                             | Q2 - Pilihan Ganda                           |
|                                             | Jawaban: A | Status: SALAH | Kunci: C        |
|                                             | Q3 - Esai                                    |
|                                             | Jawaban: ... | Status: PERLU REVIEW          |
+---------------------------------------------+---------------------------------------------+
| [Sebelumnya] Halaman 2/8 (64 peserta) [Berikutnya]                                       |
+-------------------------------------------------------------------------------------------+
```

### Screen C - Builder Test (Anti Ambiguitas)

```text
+-------------------------------------------------------------------------------------------+
| Metadata Test                                                                             |
| Judul | Slug | Jenis (Pre/Post) | Status (Draft/Aktif/Selesai)                          |
| Versi | Target Peserta | Mulai | Selesai                                                 |
| Nama Otomatis: {Judul} • {Tanggal} • v{Versi}                                            |
|-------------------------------------------------------------------------------------------|
| Pertanyaan                                                                                |
| Label | Tipe | Opsi | Kunci Jawaban | Bobot Skor | Wajib | Fokus Inbox                  |
+-------------------------------------------------------------------------------------------+
```

## 2) Mockup Mobile (Wireframe)

```text
+---------------------------------------+
| [Builder][Submissions][Inbox]         |
| [Sort] [Cari] [Filter]                |
+---------------------------------------+
| Test Aktif: PRETEST ... v1            |
| Progress: 58%                         |
+---------------------------------------+
| Peserta 1 (Skor 8/10) [SELESAI]       |
| Peserta 2 (Skor 6/10) [BARU]          |
| Peserta 3 (Skor 9/10) [FOLLOW UP]     |
+---------------------------------------+
| Detail (expand)                       |
| Q1: Jawaban B (BENAR)                 |
| Q2: Jawaban A (SALAH)                 |
| Q3: Jawaban Esai (REVIEW)             |
+---------------------------------------+
```

## 3) Prototype Interaktif

- Prototype implementasi utama sudah langsung tersedia di modul admin:
  - `Admin > Pre/Post Test > Submissions`
  - Flow klik test -> klik peserta -> detail jawaban + status + skor
- Prototype statis tambahan: [test-management-prototype.html](file:///d:/cabang/docs/test-management-prototype.html)

## 4) Style Guide Ringkas

### Palet Warna

- `Primary Action`: `#3B82F6`
- `Success/Benar`: `#10B981`
- `Warning/Follow Up`: `#F59E0B`
- `Danger/Salah/Kadaluarsa`: `#EF4444`
- `Surface Dark`: `#0F172A`
- `Text Primary`: `#E2E8F0`
- `Text Secondary`: `#94A3B8`

### Tipografi

- Judul: 18-22px / 700
- Label: 12-14px / 600
- Isi: 14-16px / 400-500
- Badge: 11-12px / 700 / uppercase

### Komponen Wajib

- `Status badge`: Draft, Aktif, Selesai, Kadaluarsa
- `Workflow badge`: Baru, Follow Up, Selesai
- `Score pill`: `Skor X/Y`
- `Pagination`: tombol prev/next + info halaman
- `Search + Filter`: selalu tampil di toolbar

### Aksesibilitas

- Rasio kontras target minimum: `4.5:1`
- Semua ikon utama diberi `title` tooltip.
- Semua input memiliki label teks yang eksplisit.

## 5) Dokumentasi Teknis Implementasi

### Frontend

- [forms.js](file:///d:/cabang/admin/forms.js)
  - Penamaan test deskriptif (`display_name` dari backend)
  - Flow klik test -> list peserta -> detail jawaban
  - Search/filter + pagination peserta
  - Tampilkan status jawaban (`benar/salah/perlu_review`) + skor total
  - Metadata test: versi, target peserta, jadwal mulai/selesai

- [admin.css](file:///d:/cabang/admin/admin.css)
  - Grid responsive desktop/tablet/mobile
  - Komponen skor, pagination, toolbar, panel detail
  - Perbaikan kontras visual untuk keterbacaan

### Backend

- [_bootstrap.js](file:///d:/cabang/api/_bootstrap.js)
  - Tambahan skema: `form_templates.version`, `target_participants`, `start_at`, `end_at`
  - Tambahan skema: `form_fields.answer_key_text`, `score_weight`
  - Constraint validasi ringan

- [_handler_forms.js](file:///d:/cabang/api/_handler_forms.js)
  - Hitung `lifecycle_status` (`draft/aktif/selesai/kadaluarsa`)
  - `display_name` test untuk anti ambigu
  - Hitung progress peserta
  - Evaluasi jawaban per soal + skor total per submission
  - Return field evaluasi ke UI

## 6) Testing Requirements & Checklist

### Flow Interaksi

- [ ] Klik test menampilkan daftar peserta yang benar.
- [ ] Klik peserta menampilkan semua soal, jawaban, status, skor.
- [ ] Search/filter/sort bekerja konsisten.
- [ ] Pagination peserta bekerja tanpa lompat data.

### Aksesibilitas

- [ ] Cek kontras warna via DevTools Lighthouse / axe.
- [ ] Tooltip pada ikon penting muncul.
- [ ] Navigasi keyboard (tab, enter) tetap berfungsi.

### Responsive & Browser

- [ ] Desktop >= 1280px
- [ ] Tablet 768-1024px
- [ ] Mobile <= 720px
- [ ] Browser: Chrome, Edge, Firefox

### Performa

- [ ] Transisi view <= 200ms pada data menengah.
- [ ] Query submissions tetap responsif saat data bertambah.
