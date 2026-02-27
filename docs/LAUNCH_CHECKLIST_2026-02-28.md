# Launch Checklist
## IPM Panawuan Web App
Tanggal rilis: **Sabtu, 28 Februari 2026**

---

## 1. Tujuan
Checklist ini dipakai sebagai panduan operasional launch agar:
- alur utama user berjalan normal,
- risiko gangguan bisa ditangani cepat,
- tim punya prosedur rollback yang jelas.

---

## 2. Tim dan Peran Singkat
- `Release Lead`: pengambil keputusan go/no-go.
- `Engineer On Duty`: eksekusi cek teknis, hotfix, rollback.
- `Admin Operasional`: verifikasi konten, notifikasi, dan alur admin dasar.
- `PIC Komunikasi`: update status ke internal tim.

---

## 3. Pre-Launch (H-1 sampai H-0, sebelum publikasi)

## 3.1 Final Technical Checks
- [ ] Pastikan `npm test` lulus.
- [ ] Pastikan `node test_syntax.js` lulus.
- [ ] Pastikan endpoint health normal:
  - [ ] `GET /api/health`
  - [ ] `GET /api/dbHealth`
- [ ] Pastikan environment variable production tersedia:
  - [ ] `POSTGRES_URL`
  - [ ] `VAPID_PUBLIC_KEY`
  - [ ] `VAPID_PRIVATE_KEY`
  - [ ] `VAPID_SUBJECT`

## 3.2 Data and Content Readiness
- [ ] Artikel terbaru tersedia dan tampil di beranda + halaman artikel.
- [ ] Materi perpustakaan minimal 1-2 item per kategori utama.
- [ ] Soal kuis aktif tersedia untuk set yang ingin dipublikasi.
- [ ] Jadwal kuis/program kerja (jika dipakai) sudah valid.

## 3.3 Security and Access Checks
- [ ] Login user normal.
- [ ] Register user normal.
- [ ] Akses admin tetap terbatas (unauthorized ditolak).
- [ ] Header keamanan dari `vercel.json` aktif (minimal verifikasi cepat via response header).

## 3.4 Backup and Rollback Readiness
- [ ] Snapshot/backup database dibuat sebelum launch.
- [ ] Commit rilis sudah ditag: `release-2026-02-28`.
- [ ] Catatan rollback sudah disetujui tim.

---

## 4. Go/No-Go Checklist (Launch Window)

Keputusan **GO** hanya jika semua item P0 di bawah lolos.

## 4.1 P0 User Journey (Wajib Lolos)
- [ ] Register -> Login -> masuk kuis.
- [ ] Kerjakan kuis -> submit hasil -> skor tersimpan.
- [ ] Ranking menampilkan hasil terbaru.
- [ ] Artikel list dan detail bisa dibuka.
- [ ] Materi bisa dibuka, termasuk PDF/fallback tab baru.
- [ ] Header menampilkan `Login` saat belum login, ikon profil saat sudah login.

## 4.2 P1 Experience (Sangat Disarankan Lolos)
- [ ] Notifikasi panel tampil normal.
- [ ] Mark all read berfungsi.
- [ ] Push notification test terkirim dan click-through ke halaman tujuan.
- [ ] Struktur organisasi + form feedback berfungsi.

---

## 5. Launch Day Runbook (Sabtu, 28 Februari 2026)

## 5.1 T-30 menit
- [ ] Freeze code (tidak ada fitur baru).
- [ ] Pastikan tim on-call siap.
- [ ] Cek health endpoint sekali lagi.

## 5.2 T-10 menit
- [ ] Jalankan smoke test P0 cepat.
- [ ] Konfirmasi backup database tersedia.

## 5.3 T-0 (Publish)
- [ ] Aktifkan pengumuman rilis internal.
- [ ] Monitor error/keluhan 15 menit pertama.

## 5.4 T+15 sampai T+120 menit
- [ ] Pantau:
  - login gagal,
  - submit kuis gagal,
  - materi gagal load,
  - notifikasi tidak muncul.
- [ ] Catat insiden per timestamp + dampak + tindakan.

---

## 6. Incident Priority
- **P0**: aplikasi tidak bisa dipakai untuk alur inti (login/quiz/submit/results).
- **P1**: fitur penting terganggu tapi ada workaround (materi fallback, notif panel).
- **P2**: bug minor UI/teks/visual tanpa dampak besar.

SLA respons internal saat launch:
- P0: langsung tangani (< 10 menit).
- P1: tangani di hari yang sama.
- P2: masuk backlog perbaikan pasca-launch.

---

## 7. Rollback Plan (Cepat)
Jika terjadi insiden P0 yang tidak bisa diperbaiki cepat:

1. `Release Lead` putuskan rollback.
2. Deploy ulang ke versi stabil terakhir (tag sebelum launch).
3. Verifikasi endpoint:
   - `GET /api/health`
   - alur login -> quiz -> ranking
4. Umumkan status rollback ke tim internal.
5. Buka postmortem singkat setelah layanan stabil.

---

## 8. Post-Launch (H+1 sampai H+24)
- [ ] Rekap error dan feedback user.
- [ ] Buat daftar quick wins (hotfix ringan).
- [ ] Jadwalkan patch release jika ada bug prioritas.
- [ ] Update dokumentasi perubahan pasca-launch.

---

## 9. Catatan Eksekusi
- Isi nama PIC per checklist item saat briefing terakhir.
- Simpan checklist ini sebagai dokumen kerja live selama launch window.

