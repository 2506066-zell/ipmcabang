# Panduan Push ke GitHub untuk Pemula

## Prasyarat
- Git terpasang di komputer.
- Akun GitHub aktif dan login di web.
- Folder proyek: `c:\.vscode\ipmweb`.

## Langkah 1: Inisialisasi Repo Lokal
1. Buka terminal di `c:\.vscode\ipmweb`.
2. Jalankan:
   - `git init`
   - `git add .`
   - `git commit -m "init: ipmweb + backend vercel"`

Verifikasi: `git status` harus menunjukkan "nothing to commit".

## Langkah 2: Buat Repo di GitHub
1. Masuk GitHub → klik "New" → isi nama repo (mis. `ipmweb`).
2. Pilih Public atau Private → klik Create repository.
3. Salin URL HTTPS repo: `https://github.com/<username>/<repo>.git`.

## Langkah 3: Hubungkan dan Push
1. Jalankan:
   - `git branch -M main`
   - `git remote add origin https://github.com/<username>/<repo>.git`
   - `git push -u origin main`

Verifikasi: buka halaman repo di GitHub → file Anda tampil (termasuk `vercel.json`, folder `api`).

## Langkah 4: Auto Import ke Vercel
1. Masuk ke Vercel → "Add New..." → "Project".
2. Pilih GitHub, pilih repo yang baru di-push.
3. Set Environment Variables:
   - `POSTGRES_URL` dari Vercel Postgres.
   - `ADMIN_TOKEN` string acak kuat.
4. Deploy.

Verifikasi: buka `https://domain-anda/api/health` → harus JSON `{"status":"success","ok":true}`.

## Tips Keamanan
- Jangan pernah commit file `.env`. Sudah diabaikan oleh `.gitignore`.
- Jangan menaruh `ADMIN_TOKEN` di JavaScript klien.
