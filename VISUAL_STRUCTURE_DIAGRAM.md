# Struktur Visual Menu Bidang dengan Gambar

## 📐 Layout Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    STRUKTUR ORGANISASI                       │
│              Jelajahi bidang dan program kerja                │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────┐
│                          │                          │
│                          │                          │
│  ┌────────────────────┐  │  ┌────────────────────┐  │
│  │                    │  │  │                    │  │
│  │   GAMBAR BIDANG    │  │  │   GAMBAR BIDANG    │  │
│  │   (9:16 ratio)     │  │  │   (9:16 ratio)     │  │
│  │   [Foto Portrait]  │  │  │   [Foto Portrait]  │  │
│  │                    │  │  │                    │  │
│  │   ╔════════════╗   │  │  │   ╔════════════╗   │  │
│  │   ║ Overlay    ║   │  │  │   ║ Overlay    ║   │  │
│  │   ║ Gradien    ║   │  │  │   ║ Gradien    ║   │  │
│  │   ║ (gelap)    ║   │  │  │   ║ (gelap)    ║   │  │
│  │   ║ Nama Bid   ║   │  │  │   ║ Nama Bid   ║   │  │
│  │   ╚════════════╝   │  │  │   ╚════════════╝   │  │
│  │                    │  │  │                    │  │
│  │  ┌─────┬─────────┐ │  │  │  ┌─────┬─────────┐ │  │
│  │  │Angg │ Program │ │  │  │  │Angg │ Program │ │  │
│  │  │ota  │ Kerja   │ │  │  │  │ota  │ Kerja   │ │  │
│  │  └─────┴─────────┘ │  │  │  └─────┴─────────┘ │  │
│  └────────────────────┘  │  └────────────────────┘  │
│   Bidang 1               │   Bidang 2                │
│   (9 Bidang total)       │   (scroll down)           │
│                          │                          │
└──────────────────────────┴──────────────────────────┘

Grid 2 kolom (responsive)
```

## 📏 Dimensi & Rasio

```
Card Wrapper:
├─ Width: 100% (responsive, max 500px mobile)
├─ Min Height: 360px
└─ Border Radius: 20px

Bidang Card Header (Image Container):
├─ Aspect Ratio: 9 / 16 (WAJIB!)
├─ Width: 100% (dari card wrapper)
├─ Height: Auto (calculated from aspect-ratio)
├─ Object-fit: cover (no distortion)
└─ Overlay: 2 layer (gradient + shine)

Image Sizing Examples:
├─ Minimal: 450px × 800px
├─ Recommended: 540px × 960px
├─ HD: 720px × 1280px
└─ 4K: 1080px × 1920px
```

## 🎨 Layer Komposisi

```
Layer 1 (Bottom):
└─ Image File (JPG/PNG)
   └─ object-fit: cover
      └─ Fills 9:16 container

Layer 2 (Middle - Overlay Gelap):
└─ CSS ::before
   └─ linear-gradient(to top, rgba(0,0,0,0.5) → transparent)
      └─ Z-index: 2
         └─ Buat nama bidang tetap terbaca

Layer 3 (Top - Shine Effect):
└─ CSS ::after
   └─ radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08))
      └─ Z-index: 3
         └─ Subtle depth effect
```

## 🖼️ Breakdown Satu Card

```
BIDANG CARD (min-height: 360px)
├─────────────────────────────┐
│                             │
│  HEADER (aspect-ratio 9:16) │  ← Gambar taruh di sini
│  ┌─────────────────────────┐│
│  │   [IMAGE 9:16 RATIO]    ││
│  │   + Overlay Gelap       ││  ← Auto applied via CSS
│  │   + Shine Effect        ││  ← Auto applied via CSS
│  │                         ││
│  │  (Gambar dominan)       ││
│  │                         ││
│  │  Ketua Umum             ││  ← Nama bidang (dibawah, via overlay)
│  └─────────────────────────┘│
│                             │
│  CONTENT (white bg)         │
│  ┌─────────────────────────┐│
│  │                         ││
│  │  Ketua Umum             ││  ← Nama bidang
│  │                         ││
│  │  ┌────────┬───────────┐ ││
│  │  │ Anggota│  Program  │ ││  ← Action buttons
│  │  └────────┴───────────┘ ││
│  │                         ││
│  └─────────────────────────┘│
├─────────────────────────────┤

Total Height: ~360px
Image Height: ~225px (9:16)
Content Height: ~135px
```

## 📱 Responsive Behavior

### Desktop (768px+)
```
┌─────────────────────────┬─────────────────────────┐
│         Card 1          │         Card 2          │
│    (width: 45%)         │    (width: 45%)         │
│    height: 360px        │    height: 360px        │
│                         │                         │
│  [9:16 Image]           │  [9:16 Image]           │
│  225px × 360px          │  225px × 360px          │
│                         │                         │
│  Buttons (full width)   │  Buttons (full width)   │
└─────────────────────────┴─────────────────────────┘
```

### Tablet (768px)
```
┌─────────────────────────┬─────────────────────────┐
│         Card 1          │         Card 2          │
│    (width: 50%)         │    (width: 50%)         │
│    height: 350px        │    height: 350px        │
│                         │                         │
│  [9:16 Image]           │  [9:16 Image]           │
│  220px × 350px          │  220px × 350px          │
│                         │                         │
│  Buttons (full width)   │  Buttons (full width)   │
└─────────────────────────┴─────────────────────────┘
```

### Mobile (480px)
```
┌───────────────────────┐
│       Card 1          │
│   (width: 88vw)       │
│   height: 340px       │
│                       │
│  [9:16 Image]         │
│  212px × 340px        │
│                       │
│  Buttons (full width) │
│                       │
└───────────────────────┘

┌───────────────────────┐
│       Card 2          │
│   (width: 88vw)       │
│   height: 340px       │
│                       │
│  [9:16 Image]         │
│  212px × 340px        │
│                       │
│  Buttons (full width) │
│                       │
└───────────────────────┘

(grid-template-columns: 1fr via media query)
```

## 🎬 Interaksi & Animasi

```
STATE: DEFAULT
├─ transform: translateY(0)
├─ opacity: 1
└─ box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08)

STATE: HOVER
├─ transform: translateY(-6px)
├─ box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12)
├─ border-color: rgba(255, 255, 255, 0.5)
└─ transition: 250ms cubic-bezier(0.34, 1.56, 0.64, 1)

STATE: ACTIVE (Click)
├─ transform: translateY(-3px) scale(0.98)
├─ box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1)
└─ transition: 150ms ease-out
```

## 🖼️ File Paths

```
Project Root
├── struktur-organisasi-redesign.html     (Main file)
├── SETUP_GAMBAR_BIDANG.md                (Setup guide)
└── images/
    └── bidang/
        ├── ketuaUmum.jpg (or .jpeg/.png) (9:16, 450-540px width)
        ├── sekretaris.jpg                (9:16, 450-540px width)
        ├── bendahara.jpg                 (9:16, 450-540px width)
        ├── perkaderan.jpg                (9:16, 450-540px width)
        ├── pengkajianIlmu.jpg            (9:16, 450-540px width)
        ├── kajianDakwah.jpg              (9:16, 450-540px width)
        ├── apresiasiBudaya.jpg           (9:16, 450-540px width)
        ├── advokasi.jpg                  (9:16, 450-540px width)
        ├── ipmawati.jpg                  (9:16, 450-540px width)
        ├── README.md                     (File guide)
        └── STRUKTUR_HTML_REFERENCE.html  (HTML ref)
```

## ⚡ Performance Notes

```
Lazy Loading:
├─ Browser loads gambar saat mendekati viewport
├─ Mengurangi initial load time
└─ Attribute: loading="lazy" pada <img>

Image Optimization:
├─ Format: JPG untuk foto, PNG untuk graphic
├─ Size: 50-200 KB per file (total 450-1800 KB untuk 9 files)
├─ Resolution: 450px × 800px minimal
└─ Compression: Gunakan TinyJPG atau ImageOptim

Mobile-First:
├─ Grid 1 kolom by default
├─ Expands ke 2 kolom di tablet+
├─ Touch-friendly button sizing
└─ Optimized for thumb interaction
```

---

**Visual Structure**: ✅ Complete
**Mobile Optimized**: ✅ Yes
**Performance Ready**: ✅ Lazy loaded
**Responsive**: ✅ 1-2 columns
