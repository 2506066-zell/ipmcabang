# Frontend Structure Migration - Phase 1

## Tujuan
Merapikan struktur frontend tanpa memutus flow existing.

## Strategi
- Non-breaking migration (safe):
  - File lama tetap ada.
  - File baru dibuat di struktur `app/js/...`.
  - Referensi HTML dipindahkan ke path baru untuk batch halaman publik.

## Struktur Baru (Batch 1)
- `app/js/core/`
  - `main.js`
  - `toast.js`
  - `install-header.js`
  - `profile.js`
- `app/js/features/articles/`
  - `public-articles.js`
- `app/js/features/materials/`
  - `public-materials.js`
- `app/js/features/quiz/`
  - `quiz-react.js`
- `app/js/pages/`
  - `quiz.js`
  - `ranking.js`

## Halaman Yang Sudah Diarahkan ke Struktur Baru
- `index.html`
- `help.html`
- `articles.html`
- `article.html` (legacy page)
- `materi.html`
- `quiz.html`
- `quiz-gamified.html`
- `ranking.html`
- `struktur-organisasi.html`
- `profile/index.html`
- `login.html` (toast/profile ke core baru)
- `register.html` (toast/profile ke core baru)

## Service Worker
- `sw.js` diperbarui:
  - menambahkan asset path baru `app/js/...`
  - bump cache version ke `static-v11`

## Catatan
- File lama belum dihapus agar rollback cepat jika ada regresi.
- Phase berikutnya: migrasi CSS/asset folder dan cleanup file lama setelah stabil.
