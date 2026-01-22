# Quick Reference - Gambar Bidang Setup

## ⚡ TL;DR - Setup Cepat

### 1. Siapkan 9 Gambar
```
Rasio: 9:16 (portrait)
Ukuran: 450px × 800px atau 540px × 960px
Format: JPG, JPEG, atau PNG
Size: 50-200 KB per file
```

### 2. Naming Convention (Case-Sensitive!)
```
Gunakan salah satu: .jpg, .jpeg, atau .png

ketuaUmum.jpg (or .jpeg or .png)
sekretaris.jpg
bendahara.jpg
perkaderan.jpg
pengkajianIlmu.jpg
kajianDakwah.jpg
apresiasiBudaya.jpg
advokasi.jpg
ipmawati.jpg
```

### 3. Upload ke Folder
```
images/bidang/
```

### 4. Done! ✅
Gambar sudah otomatis tampil dengan overlay & styling.

---

## 📐 Gambar Calculator

### Jika Width = 450px, maka Height = ?
```
Width: 450px
Ratio: 9:16
Height = 450 × (16/9) = 800px ✅
```

### Jika Width = 540px, maka Height = ?
```
Width: 540px
Ratio: 9:16
Height = 540 × (16/9) = 960px ✅
```

### Jika Height = 1000px, maka Width = ?
```
Height: 1000px
Ratio: 9:16
Width = 1000 × (9/16) = 562.5px ✅
```

---

## 🎨 Overlay Styling

**Sudah otomatis applied via CSS!**

```css
/* Overlay Gelap (readability) */
linear-gradient(to top, 
  rgba(0, 0, 0, 0.5) 0%, 
  rgba(0, 0, 0, 0.3) 30%, 
  transparent 60%);

/* Shine Effect (depth) */
radial-gradient(circle at 30% 30%, 
  rgba(255, 255, 255, 0.08) 0%, 
  transparent 50%);
```

Tidak perlu edit manual!

---

## 🖼️ Image Properties

```css
object-fit: cover;              /* Fills container, no distortion */
object-position: center;        /* Center crop */
aspect-ratio: 9 / 16;           /* Portrait ratio */
loading: lazy;                  /* Lazy load for performance */
```

---

## 📱 Grid Behavior

| Device | Columns | Card Width | Image Width |
|--------|---------|-----------|------------|
| Desktop 1200px | 2 | ~550px | ~225px |
| Tablet 768px | 2 | ~390px | ~195px |
| Mobile 480px | 1 | 88vw (~424px) | ~212px |

---

## 🔧 Common Tasks

### Gambar tidak muncul?
```
1. Cek nama file (case-sensitive!)
2. Cek path: images/bidang/
3. Refresh: Ctrl+Shift+R (cache clear)
4. Console (F12): Cek error message
```

### Gambar terdistorsi?
```
1. Ukur rasio: width ÷ height = ?
2. Harus 0.5625 (9:16)
3. Resize dengan tools:
   - Photoshop: Image > Image Size
   - GIMP: Image > Scale Image
   - Online: https://squoosh.app/
```

### Loading lambat?
```
1. Kompresi gambar:
   - Target: 100-150 KB max
   - Tools: https://tinyjpg.com/
   - atau https://imagecompressor.com/
2. Format JPG (lebih kecil dari PNG)
3. Lazy loading sudah enabled
```

### Nama bidang tidak terlihat?
```
1. Overlay gelap sudah applied
2. Jika masih sulit dibaca:
   - Gunakan foto dengan background terang
   - Atau overlay akan lebih kontras
3. Overlay opacity dapat di-adjust di CSS
```

---

## 📊 File Size Reference

**Untuk 9 gambar optimal:**

| Format | Per File | Total |
|--------|----------|-------|
| JPG (optimal) | 100-150 KB | 900-1350 KB |
| PNG (graphic) | 150-250 KB | 1350-2250 KB |
| WEBP (modern) | 80-120 KB | 720-1080 KB |

**Rekomendasi**: JPG untuk semua (smallest size)

---

## 🚀 Performance Tips

```
1. Use JPG format (smallest)
2. Compression level: 70-80 quality
3. Width: 450-540px (mobile-first)
4. Size: target 100-150 KB max per file
5. Lazy loading: Already enabled ✅

Expected Load Time (3G):
- 9 images × 120 KB = 1.08 MB
- 3G speed: ~1-2 Mbps
- Load time: ~5-10 seconds
- After cache: Instant ✅
```

---

## 🎯 Checklist

- [ ] 9 gambar siap (9:16 rasio)
- [ ] Ukuran 450px × 800px atau lebih besar
- [ ] Format JPG atau PNG
- [ ] Size 50-200 KB per file
- [ ] Named dengan key bidang (case-sensitive)
- [ ] Uploaded ke `images/bidang/` folder
- [ ] Buka HTML di browser
- [ ] Grid 2 kolom tampil dengan gambar
- [ ] Gambar tidak terdistorsi
- [ ] Overlay gelap terlihat
- [ ] Buttons fungsional
- [ ] Mobile test (1 kolom grid)
- [ ] Hover effect smooth
- [ ] Tap feedback responsive

---

## 📞 Need Help?

### Error: Image not displaying
```javascript
// Check browser console (F12)
// Look for 404 errors
// Verify file path: images/bidang/ketuaUmum.jpg
```

### Image is blurry
```
1. Check resolution (min 450×800)
2. Check aspect ratio (exactly 9:16)
3. Use object-fit: cover (already set)
4. File not compressed too much
```

### Slow loading on mobile
```
1. Reduce image size (target 100 KB)
2. Use JPG instead of PNG
3. Lazy loading is enabled (automatic)
4. Check network speed in DevTools
```

---

**Last Updated**: January 2026
**Status**: ✅ Production Ready
**Testing**: Mobile & Desktop ✅
