# Gambar Bidang - Struktur Organisasi

## Panduan Penempatan Gambar Bidang

Tempat gambar-gambar bidang di folder ini dengan nama file sesuai dengan key bidang.

### Daftar File Gambar yang Diperlukan:

Semua gambar harus memiliki rasio **9:16** (portrait) dan format **JPG, JPEG, atau PNG**.

```
images/bidang/
├── ketuaUmum.jpg          → Gambar Ketua Umum (9:16) [JPG/JPEG/PNG]
├── sekretaris.jpg         → Gambar Sekretaris (9:16) [JPG/JPEG/PNG]
├── bendahara.jpg          → Gambar Bendahara (9:16) [JPG/JPEG/PNG]
├── perkaderan.jpg         → Gambar Perkaderan (9:16) [JPG/JPEG/PNG]
├── pengkajianIlmu.jpg     → Gambar Pengkajian Ilmu Pengetahuan (9:16) [JPG/JPEG/PNG]
├── kajianDakwah.jpg       → Gambar Kajian Dakwah Islam (9:16) [JPG/JPEG/PNG]
├── apresiasiBudaya.jpg    → Gambar Apresiasi Budaya & Olahraga (9:16) [JPG/JPEG/PNG]
├── advokasi.jpg           → Gambar Advokasi (9:16) [JPG/JPEG/PNG]
└── ipmawati.jpg           → Gambar Ipmawati (9:16) [JPG/JPEG/PNG]
```

### Spesifikasi Gambar:

- **Rasio**: 9:16 (Portrait)
- **Format**: JPG, JPEG, atau PNG
- **Ukuran File**: Optimal 50-200 KB (untuk mobile loading)
- **Resolusi Minimal**: 450px × 800px (9:16)
- **Resolusi Rekomendasian**: 540px × 960px (9:16)
- **Object-fit**: cover (gambar akan di-crop untuk fill kontainer)

### CSS Properties:

```css
object-fit: cover;
aspect-ratio: 9 / 16;
```

Gambar akan ditampilkan dengan:
- Gradient overlay gelap di bagian bawah untuk readability nama bidang
- Shine effect subtle di atas untuk depth
- Lazy loading untuk performa mobile

### Catatan:

1. **Naming**: Nama file HARUS sesuai dengan key bidang (case-sensitive)
2. **Overlay**: Gradien gelap sudah ditambahkan via CSS, jadi gambar bisa langsung digunakan
3. **Responsiveness**: Gambar akan auto-adjust di semua ukuran layar
4. **Performance**: Lazy loading ditambahkan secara otomatis via HTML
5. **Touch-friendly**: Grid 2 kolom dioptimalkan untuk sentuhan thumb

### Template Ukuran:

Untuk desain di Adobe XD, Figma, atau tools lainnya:
- **Width**: 540px
- **Height**: 960px
- **Ratio**: 9:16 (0.5625)

### Troubleshooting:

**Gambar tidak tampil?**
- Cek nama file sesuai key bidang
- Cek path folder: `images/bidang/`
- Pastikan format JPG/PNG

**Gambar terdistorsi?**
- Pastikan rasio 9:16
- CSS sudah mengatur object-fit: cover

**Loading lambat?**
- Kompresi gambar (target 100-150 KB)
- Gunakan format JPG untuk foto
- PNG untuk graphic/ilustrasi

---

**Terakhir diupdate**: January 2026
