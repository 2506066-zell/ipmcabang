# Frontend Structure Migration - Phase 2

## Objective
Rapikan struktur frontend lanjutan tanpa mengubah output UI/UX dan tanpa mengubah backend.

## Scope (Non-Functional Only)
- Migrasi path stylesheet ke struktur baru `app/css`.
- Menjaga kompatibilitas penuh: file lama tidak dihapus.
- Menambah struktur aset `app/media` (copy-only, tanpa mengganti referensi aktif).

## Changes Implemented
- Created: `app/css/` and copied all files from `styles/`.
- Updated HTML stylesheet refs:
  - from `styles/*.css` or `/styles/*.css`
  - to `/app/css/*.css`
- Updated `sw.js`:
  - cache version bumped to `static-v12`
  - added `app/css/*` assets to precache
  - added query-variant assets used by pages
- Created:
  - `app/media/brand/ipm-logo.png`
  - `app/media/icons/icon-192.png`
  - `app/media/icons/icon-512.png`

## Compatibility Guarantee
- UI/UX behavior is preserved (same CSS content, only path relocation).
- Backend API and server logic are untouched.
- Legacy folders/files remain to allow safe rollback.
