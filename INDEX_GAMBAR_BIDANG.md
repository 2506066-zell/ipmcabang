# 📚 Index - Menu Bidang dengan Gambar (9:16)

## 📌 Files Overview

### Main Application
- **struktur-organisasi-redesign.html**
  - Main application file
  - Grid menu bidang dengan 2 tombol (Anggota & Program)
  - Landing page program kerja per bidang
  - Responsive: desktop, tablet, mobile
  - Size: ~1116 lines HTML+CSS+JS

### Documentation Files

#### 1. **SETUP_GAMBAR_BIDANG.md**
   - Complete setup guide
   - Folder structure
   - Image requirements (9:16 ratio)
   - Naming convention
   - Troubleshooting guide
   - Performance tips
   - Testing checklist

#### 2. **QUICK_REFERENCE_GAMBAR.md**
   - Quick reference card
   - TL;DR section
   - Ratio calculator
   - Common tasks
   - Common problems & solutions
   - File size reference

#### 3. **VISUAL_STRUCTURE_DIAGRAM.md**
   - Layout diagrams (ASCII art)
   - Dimension reference
   - Layer composition
   - Responsive behavior breakdown
   - Interaction & animation specs
   - Performance notes

#### 4. **images/bidang/README.md**
   - File location guide
   - Image specifications
   - CSS properties reference
   - Responsive behavior
   - Loading optimization
   - Troubleshooting tips

#### 5. **images/bidang/STRUKTUR_HTML_REFERENCE.html**
   - HTML structure reference
   - CSS breakdown
   - Image requirements
   - File paths
   - Responsive behavior details
   - Loading optimization info

---

## 🎯 Quick Start

### Step 1: Prepare Images
```
Format: JPG or PNG
Ratio: 9:16 (portrait)
Min Size: 450px × 800px
Recommended: 540px × 960px
Max File Size: 200 KB per image
```

### Step 2: Name Files (Case-Sensitive)
```
ketuaUmum.jpg
sekretaris.jpg
bendahara.jpg
perkaderan.jpg
pengkajianIlmu.jpg
kajianDakwah.jpg
apresiasiBudaya.jpg
advokasi.jpg
ipmawati.jpg
```

### Step 3: Upload to Folder
```
images/bidang/
```

### Step 4: Test
```
Open struktur-organisasi-redesign.html in browser
```

---

## 📂 Folder Structure

```
c:\.vscode\ipmweb\
├── struktur-organisasi-redesign.html    ← Main file
├── SETUP_GAMBAR_BIDANG.md              ← Setup guide
├── QUICK_REFERENCE_GAMBAR.md           ← Quick ref
├── VISUAL_STRUCTURE_DIAGRAM.md         ← Diagrams
├── images/
│   └── bidang/
│       ├── ketuaUmum.jpg               ← Image 1
│       ├── sekretaris.jpg              ← Image 2
│       ├── bendahara.jpg               ← Image 3
│       ├── perkaderan.jpg              ← Image 4
│       ├── pengkajianIlmu.jpg          ← Image 5
│       ├── kajianDakwah.jpg            ← Image 6
│       ├── apresiasiBudaya.jpg         ← Image 7
│       ├── advokasi.jpg                ← Image 8
│       ├── ipmawati.jpg                ← Image 9
│       ├── README.md                   ← File guide
│       └── STRUKTUR_HTML_REFERENCE.html← HTML ref
└── members/
    └── [existing member photos]
```

---

## 🎨 Features

### Menu Bidang (Grid View)
✅ 2-column grid (desktop/tablet)
✅ 1-column grid (mobile)
✅ Image-based (9:16 portrait ratio)
✅ Overlay gradient for readability
✅ Shine effect for depth
✅ 2 action buttons per card (Anggota & Program)
✅ Smooth hover/tap interactions
✅ Lazy loading for performance

### Views
✅ View 1: Bidang grid (main)
✅ View 2: Anggota list (member details)
✅ View 3: Program kerja (work programs)

### Responsive
✅ Mobile (480px): 1 column
✅ Tablet (768px): 2 columns
✅ Desktop (1200px+): 2 columns

### Performance
✅ Lazy loading (loading="lazy")
✅ Image optimization ready
✅ No blur effects on images
✅ Smooth transitions (250ms)
✅ Touch-friendly sizing

---

## 📐 Image Specifications

| Property | Value |
|----------|-------|
| **Ratio** | 9:16 (portrait) |
| **Min Resolution** | 450×800 px |
| **Recommended** | 540×960 px |
| **Max File Size** | 200 KB |
| **Format** | JPG, JPEG, atau PNG |
| **Object-fit** | cover |
| **Object-position** | center |
| **Loading** | lazy |

---

## 🎬 Interactions

### Hover (Desktop)
```css
transform: translateY(-6px);
box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
transition: 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Active (Tap/Click)
```css
transform: translateY(-3px) scale(0.98);
box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
transition: 150ms ease-out;
```

---

## 🔍 Key CSS Classes

```css
.bidang-card              /* Card wrapper */
.bidang-card-header       /* Image container (9:16) */
.bidang-card-header img   /* Image element */
.bidang-card-content      /* Text & buttons area */
.bidang-card-name         /* Bidang name */
.bidang-card-actions      /* Button container */
.btn-card-anggota         /* Anggota button */
.btn-card-program         /* Program button */
```

---

## 🖼️ HTML Structure

```html
<div class="bidang-card">
    <div class="bidang-card-header">
        <img src="images/bidang/ketuaUmum.jpg" alt="Ketua Umum" loading="lazy">
        <!-- Overlay & shine: CSS ::before & ::after -->
    </div>
    <div class="bidang-card-content">
        <div class="bidang-card-name">Ketua Umum</div>
        <div class="bidang-card-actions">
            <button class="btn-card btn-card-anggota">Anggota</button>
            <button class="btn-card btn-card-program">Program</button>
        </div>
    </div>
</div>
```

---

## 🚀 Performance Metrics

### Load Times (Expected)
- Images (lazy loaded): On-demand
- Initial HTML: <100ms
- CSS parsing: <50ms
- JS initialization: <50ms
- **Total first paint**: <500ms

### Mobile (3G)
- 9 images × 120KB = 1.08 MB
- Load time: 5-10 seconds (background)
- Interactive: Immediate (lazy loading)

### Desktop (Fast 4G)
- 9 images × 120KB = 1.08 MB
- Load time: 1-2 seconds (background)
- Interactive: Immediate

---

## ✅ Implementation Checklist

### Before Upload
- [ ] 9 images prepared
- [ ] Each image is 9:16 ratio
- [ ] Image size 50-200 KB
- [ ] Named correctly (case-sensitive)
- [ ] Saved as JPG or PNG

### During Upload
- [ ] Create folder: `images/bidang/`
- [ ] Upload all 9 images
- [ ] Verify file names match

### After Upload
- [ ] Open HTML in browser
- [ ] Check grid displays 2 columns
- [ ] Check images load correctly
- [ ] Check images aren't distorted
- [ ] Test hover effect
- [ ] Test tap/click effect
- [ ] Test "Anggota" button
- [ ] Test "Program" button
- [ ] Test on mobile (480px)
- [ ] Test lazy loading

---

## 🐛 Troubleshooting

### Images not showing?
1. Check file names (case-sensitive)
2. Check folder path: `images/bidang/`
3. Clear browser cache (Ctrl+Shift+R)
4. Check console (F12) for errors

### Images distorted?
1. Verify ratio is 9:16
2. Check resolution (min 450px width)
3. Use image editor to resize
4. Verify aspect ratio calculator

### Loading slow?
1. Compress images (target 100-150 KB)
2. Use JPG format (smaller than PNG)
3. Verify lazy loading enabled
4. Check internet speed

### Overlay not visible?
1. Overlay is already applied via CSS
2. Check image brightness
3. Darken image if needed
4. Overlay opacity configurable in CSS

---

## 📞 Support

### Documentation
- **Setup Guide**: SETUP_GAMBAR_BIDANG.md
- **Quick Ref**: QUICK_REFERENCE_GAMBAR.md
- **Diagrams**: VISUAL_STRUCTURE_DIAGRAM.md
- **HTML Ref**: images/bidang/STRUKTUR_HTML_REFERENCE.html

### Tools
- Image Resize: https://squoosh.app/
- Compress: https://tinyjpg.com/
- Ratio Check: https://www.rapidtables.com/calc/math/ratio-calc.html

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Total Files | 9 images + 1 HTML |
| Total Size | ~1.2-1.8 MB |
| Lines of Code | 1116 |
| CSS Classes | 30+ |
| JavaScript Functions | 5 |
| Breakpoints | 3 (768px, 480px) |
| Browser Support | All modern browsers |

---

## 🎯 Version

- **Version**: 1.0
- **Release Date**: January 2026
- **Status**: Production Ready ✅
- **Last Updated**: January 20, 2026

---

## 📝 Notes

- All images must be 9:16 ratio (CRITICAL!)
- Case-sensitive file naming required
- Overlay styling is automatic (CSS)
- Lazy loading improves performance
- Mobile-first responsive design
- No database required (static data)

---

**Ready to use! Upload images to images/bidang/ and enjoy! 🎉**
