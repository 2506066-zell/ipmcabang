# Setup Gambar Bidang - Struktur Organisasi Redesign

## 📋 Checklist Setup

### 1. Folder Structure
```
c:\.vscode\ipmweb\
├── struktur-organisasi-redesign.html
└── images/
    └── bidang/
        ├── ketuaUmum.jpg
        ├── sekretaris.jpg
        ├── bendahara.jpg
        ├── perkaderan.jpg
        ├── pengkajianIlmu.jpg
        ├── kajianDakwah.jpg
        ├── apresiasiBudaya.jpg
        ├── advokasi.jpg
        └── ipmawati.jpg
```

### 2. Persyaratan Gambar

**Setiap file gambar harus memenuhi:**

| Kriteria | Spesifikasi |
|----------|-------------|
| **Rasio** | 9:16 (Portrait) |
| **Format** | JPG, JPEG, atau PNG |
| **Ukuran Minimal** | 450px × 800px |
| **Ukuran Rekomendasi** | 540px × 960px |
| **Ukuran File** | 50-200 KB (optimal mobile) |
| **Kualitas** | Tajam, tidak buram |

### 3. Naming Convention

Nama file HARUS sesuai dengan key bidang (case-sensitive).
Gunakan salah satu format: **.jpg**, **.jpeg**, atau **.png**

```javascript
ketuaUmum.jpg          // atau ketuaUmum.jpeg atau ketuaUmum.png
sekretaris.jpg
bendahara.jpg
perkaderan.jpg
pengkajianIlmu.jpg
kajianDakwah.jpg
apresiasiBudaya.jpg
advokasi.jpg
ipmawati.jpg
```

### 4. CSS Properties Applied

Setiap gambar akan otomatis di-process dengan:

```css
/* Gambar */
object-fit: cover;           /* Fill container tanpa distorsi */
aspect-ratio: 9 / 16;        /* Rasio portrait */
object-position: center;     /* Center crop */

/* Overlay Gradien (untuk readability nama) */
linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, transparent 60%);

/* Shine Effect (untuk depth) */
radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.08));
```

### 5. Path Reference dalam Code

File `struktur-organisasi-redesign.html` menggunakan path otomatis:

```javascript
const imagePath = `images/bidang/${key}.jpg`;
// Contoh: images/bidang/ketuaUmum.jpg
```

### 6. Lazy Loading

Setiap gambar memiliki `loading="lazy"`:

```html
<img src="images/bidang/ketuaUmum.jpg" alt="Ketua Umum" loading="lazy">
```

Browser akan load gambar hanya saat mendekati viewport → lebih cepat!

### 7. Troubleshooting

**Gambar tidak muncul?**
- ✅ Cek nama file sesuai dengan key (case-sensitive)
- ✅ Cek folder path: `images/bidang/`
- ✅ Cek format JPG/PNG (bukan GIF/WEBP)
- ✅ Refresh browser cache (Ctrl+Shift+R)

**Gambar terdistorsi?**
- ✅ Pastikan rasio 9:16 (width:height = 0.5625)
- ✅ CSS sudah auto-handle dengan `object-fit: cover`
- ✅ Resize dengan tools: Photoshop, GIMP, atau online tools

**Loading lambat di mobile?**
- ✅ Kompresi gambar ke 100-150 KB
- ✅ Gunakan JPG format (lebih kecil dari PNG)
- ✅ Ukuran minimal: 450px × 800px
- ✅ Tools: TinyJPG, ImageOptim, atau Compression tools

**Nama overlay gelap tidak terlihat?**
- ✅ Overlay sudah applied via CSS gradient
- ✅ Jika background gambar terlalu terang, overlay akan lebih terlihat
- ✅ Opacity sudah optimized (0.5 di bawah, 0.3 di atas)

### 8. Responsive Behavior

**Desktop (768px+):**
- Grid 2 kolom
- Card height: 360px
- Foto height: 225px (9:16 ratio dari width)

**Mobile (480px):**
- Grid 1 kolom (full width)
- Card height: 340px
- Foto height: 212px (9:16 ratio dari width)

### 9. Performance Tips

1. **Kompresi gambar** sebelum upload
   - Target size: 100-150 KB per gambar
   - Tools: https://tinyjpg.com/

2. **Gunakan format optimal**
   - Foto real → JPG
   - Graphic/ilustrasi → PNG

3. **Ukuran resolusi**
   - Mobile first: 450px × 800px
   - Desktop: 540px × 960px

4. **Caching**
   - Browser cache: 1 tahun (HTTP headers)
   - Mobile cache: auto via `loading="lazy"`

### 10. Testing Checklist

Setelah upload semua gambar:

- [ ] Buka `struktur-organisasi-redesign.html` di browser
- [ ] Grid bidang 2 kolom tampil dengan gambar
- [ ] Setiap gambar tidak terdistorsi
- [ ] Nama bidang terlihat jelas dengan overlay gelap
- [ ] Tombol "Anggota" dan "Program" fungsional
- [ ] Test di mobile (480px) - grid 1 kolom
- [ ] Test loading speed (lazy load bekerja)
- [ ] Hover effect smooth (transform + shadow)
- [ ] Tap feedback cepat (scale 0.98)

### 11. File References

Dokumentasi lengkap tersedia di:

```
images/bidang/README.md                    → Panduan lengkap
images/bidang/STRUKTUR_HTML_REFERENCE.html → Referensi HTML/CSS
```

### 12. Contact & Support

Jika ada masalah:

1. Cek naming convention (case-sensitive)
2. Verifikasi rasio 9:16
3. Refresh browser cache
4. Cek browser console (F12) untuk error message
5. Cek file size (max 200 KB)

---

**Status**: ✅ Ready to use
**Last Updated**: January 2026
**File Modified**: struktur-organisasi-redesign.html
