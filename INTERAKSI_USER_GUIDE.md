# 🎯 PANDUAN INTERAKSI USER - STRUKTUR ORGANISASI

## 📖 PENDAHULUAN

Halaman Struktur Organisasi dirancang untuk memberikan pengalaman visual yang menarik dan interaktif dalam mengenal anggota setiap bidang IPM Panawuan. Desain mobile-first memastikan pengalaman optimal di semua perangkat.

---

## 🎬 SKENARIO PENGGUNAAN

### SKENARIO 1: User Pertama Kali Mengunjungi Halaman

```
Langkah 1: Navigasi ke halaman
├─ User buka menu navigasi
├─ Pilih "Struktur" atau click link struktur-organisasi
└─ Halaman load dengan animasi smooth

Langkah 2: Lihat daftar bidang
├─ Halaman menampilkan 9 bidang dalam vertical stack
├─ Setiap bidang menampilkan:
│  ├─ Icon bidang (dengan warna background)
│  ├─ Nama bidang (bold, modern)
│  ├─ Deskripsi singkat
│  ├─ Jumlah anggota (6 orang per bidang)
│  └─ Tombol "Lihat Anggota" (hijau, menonjol)
├─ Animasi slide-up saat setiap section load
└─ User bisa scroll ke bawah untuk lihat bidang lain

Langkah 3: Pelajari bidang-bidang
├─ Hover/tap tombol untuk lihat efek (scale & glow)
├─ Baca deskripsi singkat setiap bidang
└─ Tentukan bidang yang ingin dilihat lebih detail
```

### SKENARIO 2: User Ingin Melihat Anggota Bidang

```
Langkah 1: Click tombol "Lihat Anggota"
├─ User tap/click tombol pada bidang pilihan
├─ Tombol memberikan feedback visual (scale down 0.95)
├─ Modal mulai fade-in (transisi 0.3s smooth)
└─ Layar menjadi gelap (overlay dark semi-transparent)

Langkah 2: Modal membuka fullscreen
├─ Header menampilkan:
│  ├─ Icon bidang + Nama bidang
│  └─ Tombol close (X circle)
├─ Carousel menampilkan member cards
│  ├─ Kartu pertama otomatis di-center
│  ├─ Kartu ditampilkan full-screen dengan:
│  │  ├─ Foto/avatar member (60% kartu - dominant)
│  │  ├─ Nama anggota (20px, bold)
│  │  ├─ Bidang (small, uppercase)
│  │  ├─ Jabatan/Role (12px, subtle)
│  │  └─ Quote pribadi (italic, soft color)
│  └─ Kartu lain terlihat sedikit di samping (peek effect)
└─ Dot indicators di bawah carousel

Langkah 3: Navigasi member dalam carousel
├─ OPSI A: Swipe/Scroll horizontal
│  ├─ Geser finger kiri-kanan pada mobile
│  ├─ Scroll dengan mouse pada desktop
│  ├─ Scroll smooth dengan snap-scroll
│  └─ Kartu otomatis center ketika berhenti
│
├─ OPSI B: Tap dot indicator
│  ├─ Tap dot di bawah untuk jump ke member tertentu
│  ├─ Smooth scroll animation (300ms)
│  └─ Dot otomatis highlight member aktif
│
├─ OPSI C: Keyboard (desktop only)
│  ├─ Arrow Left: Scroll ke member sebelumnya
│  ├─ Arrow Right: Scroll ke member berikutnya
│  └─ Escape: Close modal
│
└─ Card indicator update real-time saat scroll

Langkah 4: Lihat info member
├─ Foto/Avatar member (placeholder dengan initials)
│  ├─ Ukuran optimal untuk fokus visual
│  ├─ Rounded corners (premium look)
│  └─ Soft shadow (depth)
│
├─ Nama member ditampilkan prominent
├─ Role/Jabatan (Ketua, Wakil Ketua, Anggota Inti, dll)
├─ Quote pribadi member:
│  ├─ Menampilkan nilai/filosofi member
│  ├─ Italic styling
│  ├─ Soft background color
│  └─ Left border accent
│
└─ Info mudah dibaca dan elegan

Langkah 5: Lihat member berikutnya
├─ Swipe/scroll ke member berikutnya
├─ Animasi smooth (card fade & scale)
├─ Dot indicator update
└─ Repeat sampai lihat semua member

Langkah 6: Close modal
├─ OPSI A: Click tombol X (close button)
├─ OPSI B: Press tombol Escape (keyboard)
├─ OPSI C: Click area gelap di luar modal
└─ Modal fade-out (transisi smooth)
```

### SKENARIO 3: Mobile Experience

```
Saat user di mobile device (< 480px):

Langkah 1: Layout optimized
├─ Full-width sections
├─ Card carousel: 90% viewport width
├─ Padding comfortable untuk jari (14px minimum)
├─ Touch targets minimum 40x40px
└─ Scrollbar hidden (cleaner)

Langkah 2: Interaksi touch-friendly
├─ No hover-only interactions
├─ All buttons tappable dengan jari
├─ Swipe gesture smooth & responsif
├─ No lag atau jank saat scroll
└─ Feedback visual instant

Langkah 3: Portrait orientation optimal
├─ Card aspect ratio 9:16 (portrait natural)
├─ Foto member besar & jelas
├─ Teks readable tanpa zoom
├─ Modal fullscreen optimal view
└─ No cut-off atau overflow
```

---

## 🎨 VISUAL FEEDBACK

### Button "Lihat Anggota" - Interaction States

```
1. DEFAULT STATE
   ├─ Background: Green gradient #4a7c5d
   ├─ Text: White, uppercase, bold
   ├─ Shadow: Soft box-shadow
   └─ Border-radius: 10px

2. HOVER STATE (desktop)
   ├─ Shadow: Lebih dalam
   ├─ Transform: translateY(-2px) naik sedikit
   ├─ Background: Sedikit darker
   └─ Cursor: pointer

3. ACTIVE/PRESS STATE
   ├─ Transform: scale(0.95) kecil
   ├─ Feedback visual instant
   └─ Terasa "responsive"

4. DISABLED STATE (jika ada)
   ├─ Opacity: 0.5
   └─ Cursor: not-allowed
```

### Carousel Card - Interaction States

```
1. ACTIVE CARD (center)
   ├─ Transform: scale(1)
   ├─ Opacity: 1 (full)
   ├─ Shadow: 0 30px 80px (strong)
   ├─ Z-index: higher
   └─ Feels: Close & important

2. INACTIVE CARDS (sides)
   ├─ Transform: scale(0.85)
   ├─ Opacity: 0.6 (faded)
   ├─ Shadow: 0 20px 60px (lighter)
   └─ Feels: Far & secondary

3. PEEK EFFECT
   ├─ 15% dari card sebelah visible
   ├─ Hint untuk user swipe available
   └─ Smooth reveal saat swipe
```

### Indicator Dots - States

```
1. INACTIVE DOT
   ├─ Shape: Circle 8px
   ├─ Background: rgba(255,255,255, 0.4)
   ├─ Border: 1px rgba(255,255,255, 0.3)
   └─ Terasa: Secondary

2. ACTIVE DOT (highlight)
   ├─ Shape: Rounded rect 24x8px
   ├─ Background: White solid
   ├─ Border: White solid
   └─ Terasa: Current position

3. HOVER/CLICK DOT
   ├─ Cursor: pointer
   ├─ Scale: 1.1x (slightly larger)
   └─ Feedback: Clear tappable
```

---

## 🚀 PERFORMANCE & RESPONSIVENESS

### Desktop (> 1024px)
```
Layout: Optimal
├─ Sections full width dengan max-width 1000px
├─ Comfortable spacing all around
├─ Hover effects smooth
└─ No scrollbars jank
```

### Tablet (768px - 1024px)
```
Layout: Adjusted
├─ Reduced padding slightly
├─ Still readable without zoom
├─ Touch-friendly buttons
└─ Smooth scrolling
```

### Mobile (480px - 768px)
```
Layout: Responsive
├─ Single column
├─ 100% width sections
├─ Optimal padding untuk jari
└─ All text readable
```

### Small Mobile (< 480px)
```
Layout: Compact
├─ Maximum readability
├─ All buttons tappable
├─ No overflow
└─ Smooth performance
```

---

## 🎯 KEY INTERACTION POINTS

### 1. Modal Open Animation
```
Duration: 0.3s
Easing: ease
Effect: Fade-in + Background overlay
User feels: Smooth transition
```

### 2. Card Swipe Animation
```
Duration: smooth (natural scrolling)
Easing: scroll-behavior
Effect: Horizontal scroll + snap
User feels: Natural & responsive
```

### 3. Indicator Update
```
Trigger: User scroll carousel
Delay: Real-time
Effect: Dot highlight changes
User feels: Position awareness
```

### 4. Modal Close Animation
```
Duration: 0.3s
Effect: Fade-out
User feels: Smooth dismissal
```

---

## 💡 USER TIPS & BEST PRACTICES

### Untuk Mobile Users:
1. **Swipe smoothly** - Jangan swipe terlalu cepat
2. **Tap dot untuk jump** - Lebih cepat dari swipe
3. **Use landscape** - Jika perlu view yang lebih lebar
4. **Tap close button** - atau tekan Escape

### Untuk Desktop Users:
1. **Scroll smooth** - Use mouse wheel atau trackpad
2. **Keyboard shortcuts** - Arrow keys untuk navigate
3. **Hover buttons** - Lihat feedback visual
4. **Press Escape** - Quick close modal

---

## 🔄 FLOW CHART

```
START
  ↓
[Buka Halaman Struktur Organisasi]
  ↓
[Lihat 9 Bidang dalam Section Cards]
  ├─→ Scroll ke bawah untuk lihat lebih banyak
  │    ↓
  │   [Baca deskripsi setiap bidang]
  │
  └─→ Pilih bidang → Click "Lihat Anggota"
       ↓
    [Modal membuka dengan Carousel]
       ↓
    [Lihat Member Pertama]
       ├─→ Swipe/Scroll ke member lain
       ├─→ Tap dot untuk jump
       └─→ Use arrow keys (desktop)
           ↓
        [Lihat info member: nama, role, quote]
           ↓
        [Repeat: Navigasi ke member lain]
           ↓
    [Puas dengan info? → Close modal]
       ↓
    [Bisa pilih bidang lain atau exit]
       ↓
END
```

---

## ⚡ ACCESSIBILITY CONSIDERATIONS

### Keyboard Navigation
- ✅ All interactive elements focusable dengan Tab
- ✅ Arrow keys untuk navigate carousel
- ✅ Escape untuk close modal
- ✅ Enter untuk activate buttons

### Screen Readers
- ✅ Semantic HTML (header, main, footer, etc)
- ✅ Descriptive button labels
- ✅ ARIA labels jika perlu
- ✅ Alt text untuk images

### Color Contrast
- ✅ White text on green: High contrast ✓
- ✅ Dark text on light: High contrast ✓
- ✅ All elements readable

### Touch Targets
- ✅ Minimum 40x40px (button targets)
- ✅ Adequate spacing between elements
- ✅ No small click targets
- ✅ Easy to tap untuk semua pengguna

---

## 🎯 SUCCESS METRICS

Pengalaman pengguna yang sukses:

1. **Ease of Use**
   - User bisa navigate bidang dalam 10 detik
   - Open modal dalam 1 click
   - Swipe member intuitif & smooth

2. **Visual Appeal**
   - Design modern & elegan
   - Animasi smooth tidak mengganggu
   - Layout balanced & professional

3. **Performance**
   - Page load < 2 detik
   - Scroll smooth 60fps
   - No lag atau jank

4. **Engagement**
   - User explore multiple bidang
   - Spend time reading member info
   - No frustration atau confusion

---

## 📝 NOTES

- Semua data real (tidak dummy data)
- Warna bidang konsisten
- Quote anggota meaningful & authentic
- Design siap untuk production
- Tested cross-browser compatibility

---

**Version**: 1.0
**Last Updated**: January 2026
**Status**: ✅ Ready to Use
