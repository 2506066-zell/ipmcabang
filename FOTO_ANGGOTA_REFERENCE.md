# 📸 DAFTAR FOTO ANGGOTA - FILE PATHS

## Format Penamaan Foto

Semua foto anggota harus ditempatkan di folder: `images/members/`

**Format nama file**: `nama-anggota.jpg` (lowercase, spasi diganti dengan dash)

---

## DAFTAR LENGKAP FOTO YANG DIPERLUKAN (54 file)

### BIDANG PENDIDIKAN (6 foto)
```
images/members/ahmad-rifki.jpg
images/members/siti-nurhaliza.jpg
images/members/budi-santoso.jpg
images/members/eka-putri.jpg
images/members/reza-pratama.jpg
images/members/lina-wijaya.jpg
```

### BIDANG SOSIAL (6 foto)
```
images/members/hendra-gunawan.jpg
images/members/maya-kusuma.jpg
images/members/fajar-hidayat.jpg
images/members/dewi-sartika.jpg
images/members/arif-rahman.jpg
images/members/nita-sylvia.jpg
```

### BIDANG PENGEMBANGAN (6 foto)
```
images/members/iqbal-maulana.jpg
images/members/tasya-marisha.jpg
images/members/andri-wijaya.jpg
images/members/fitri-annisa.jpg
images/members/gilang-satria.jpg
images/members/raisa-putri.jpg
```

### BIDANG KESEHATAN (6 foto)
```
images/members/dodi-kurniawan.jpg
images/members/rini-handayani.jpg
images/members/bambang-setiawan.jpg
images/members/yani-sobariah.jpg
images/members/sandi-primadana.jpg
images/members/mira-nurjanah.jpg
```

### BIDANG SPIRITUAL (6 foto)
```
images/members/muhammad-faris.jpg
images/members/aisyah-humaira.jpg
images/members/irfan-setiadi.jpg
images/members/zahra-amelia.jpg
images/members/hasan-suryanto.jpg
images/members/nadia-salsabila.jpg
```

### BIDANG KERJASAMA (6 foto)
```
images/members/yusuf-hermawan.jpg
images/members/sindi-anastasya.jpg
images/members/rizki-pratama.jpg
images/members/eka-suryani.jpg
images/members/cahya-mahendra.jpg
images/members/bunga-safira.jpg
```

### BIDANG ADVOKASI (6 foto)
```
images/members/wacana-irawan.jpg
images/members/vera-yuliana.jpg
images/members/bambang-sutrisno.jpg
images/members/susi-handoko.jpg
images/members/teguh-santoso.jpg
images/members/indah-permata.jpg
```

### BIDANG INTERNASIONAL (6 foto)
```
images/members/adnan-habibi.jpg
images/members/natalia-wijaya.jpg
images/members/dimas-prasetyo.jpg
images/members/elisa-mustika.jpg
images/members/kornelius-salim.jpg
images/members/bella-christiana.jpg
```

### BIDANG LINGKUNGAN (6 foto)
```
images/members/hendra-pratama.jpg
images/members/silvia-handoko.jpg
images/members/vito-sutrisno.jpg
images/members/gita-suwandi.jpg
images/members/irawan-kusuma.jpg
images/members/zahara-wahyuni.jpg
```

---

## SPESIFIKASI FOTO

### Ukuran & Format:
- **Format**: JPG atau PNG (preferably JPG untuk performa)
- **Lebar minimum**: 400px
- **Tinggi minimum**: 600px (portrait)
- **Aspect ratio**: 2:3 atau 9:16 (portrait)
- **File size**: Max 500KB per file (untuk performa)

### Rekomendasi Ukuran Optimal:
- **600px × 900px** (ideal untuk portrait)
- **800px × 1200px** (untuk high-quality display)

### Konten Foto:
- **Tipe**: Portrait photo (dari dada ke atas minimal)
- **Background**: Plain/neutral atau blur (preferred)
- **Pose**: Natural & professional
- **Lighting**: Good lighting, clear face
- **Quality**: Sharp & well-focused

---

## FALLBACK BEHAVIOR

Jika foto tidak ditemukan, sistem akan otomatis menampilkan:
- **Placeholder**: Initials (huruf pertama nama) di atas background color
- **Contoh**: Ahmad Rifki → "AR" dengan background green

**Tidak ada error** - Website tetap berfungsi normal

---

## STRUKTUR FOLDER

```
ipmweb/
├── struktur-organisasi.html
├── images/
│   └── members/
│       ├── ahmad-rifki.jpg
│       ├── siti-nurhaliza.jpg
│       ├── budi-santoso.jpg
│       ├── ... (54 files total)
│       └── zahara-wahyuni.jpg
└── ...
```

---

## CARA MENGUPLOAD FOTO

### 1. Siapkan Folder
```bash
mkdir -p images/members
```

### 2. Rename Foto Sesuai Format
- Gunakan format: `nama-anggota.jpg`
- Pastikan lowercase
- Spasi → dash (-)
- Contoh: "Ahmad Rifki" → "ahmad-rifki.jpg"

### 3. Simpan di Folder Correct
```
images/members/
└── ahmad-rifki.jpg
```

### 4. Verify
- Buka `struktur-organisasi.html` di browser
- Setiap member card seharusnya menampilkan foto
- Jika tidak ada, akan menampilkan initials (fallback)

---

## OPTIMIZATION TIPS

### Untuk performa optimal:

1. **Compress images**
   - Gunakan tool: TinyJPG, ImageOptim, atau Squoosh
   - Target: 300-500KB per file
   - Jangan kehilangan kualitas

2. **Resize sebelum upload**
   - Gunakan: Photoshop, GIMP, atau online tool
   - Ukuran: 600×900px atau 800×1200px
   - Format: JPG (80% quality)

3. **Batch processing**
   - Process semua 54 foto sekaligus
   - Tools: ImageMagick, FFmpeg scripting
   - Hemat waktu & konsistensi

### Command Line Example (ImageMagick):
```bash
# Resize & compress semua jpg
for file in *.jpg; do
  convert "$file" -resize 600x900 -quality 80 "images/members/$file"
done
```

---

## TESTING CHECKLIST

- [ ] Folder `images/members/` sudah ada
- [ ] Semua 54 foto sudah diupload
- [ ] Nama file sesuai format (lowercase, dash)
- [ ] Foto berukuran optimal (600×900px)
- [ ] File size ≤ 500KB per file
- [ ] Buka halaman di browser
- [ ] Semua foto tampil di member cards
- [ ] Fallback (initials) work jika foto missing
- [ ] No console errors
- [ ] Swipe carousel smooth
- [ ] Responsive di mobile

---

## TROUBLESHOOTING

### Foto tidak tampil?
1. Check file path di console (F12)
2. Pastikan nama file exact match dengan property `photo`
3. Verify folder structure: `images/members/`
4. Ensure file exists dan readable

### Blurry/pixelated foto?
1. Ukuran original terlalu kecil
2. Resize ke 600×900px minimum
3. Gunakan lossless compression

### Slow loading?
1. File size terlalu besar
2. Compress menggunakan TinyJPG
3. Target: 300-400KB max

### Wrong aspect ratio?
1. Photo di-crop tidak portrait
2. Resize ke 2:3 atau 9:16 ratio
3. Use aspect-ratio: 9/16

---

## FUTURE ENHANCEMENTS

Bisa ditambahkan nanti:
- [ ] Lazy loading images
- [ ] WebP format support
- [ ] CDN/Cloud storage
- [ ] Photo gallery/lightbox
- [ ] Admin panel untuk upload
- [ ] Image optimization pipeline

---

## PRODUCTION DEPLOYMENT

Sebelum go live:

1. ✅ Upload semua 54 foto
2. ✅ Test di staging environment
3. ✅ Verify di mobile (iOS & Android)
4. ✅ Check performance (Lighthouse)
5. ✅ Monitor for 404 errors
6. ✅ Get approval dari stakeholder
7. ✅ Deploy ke production

---

**Total Files**: 54 foto
**Total Size (approx)**: 20-25MB (jika 400-500KB per file)
**Format**: JPG/PNG
**Compression**: Recommended

---

**Last Updated**: January 2026
