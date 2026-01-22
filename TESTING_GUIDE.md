# 🧪 Testing Guide - Refactor IPM Website

## 📋 Test Checklist

### 1. Visual Design Tests

#### Desktop View (1920x1080)
- [ ] Header sticky dan backdrop blur terlihat
- [ ] Member cards 160px width dengan proper spacing
- [ ] Hover effects: scale, shadow, border glow
- [ ] All fonts readable dan properly weighted
- [ ] All icons dari FontAwesome muncul

#### Tablet View (768x1024)
- [ ] Layout responsive dengan proper padding
- [ ] Member cards 140px width
- [ ] Scroll smooth di horizontal container
- [ ] Touch interactions work correctly

#### Mobile View (375x667 - iPhone)
- [ ] Header tidak crowded
- [ ] Member cards 130px width, fully visible
- [ ] Horizontal scroll swipeable
- [ ] Button "Lihat Detail" reachable (44px min)
- [ ] Footer readable

#### Mobile View (480x800 - Android)
- [ ] Layout optimized untuk ukuran ini
- [ ] Member cards dengan proper margins
- [ ] Text sizes comfortable untuk reading

---

### 2. Functionality Tests

#### Navigation
- [ ] Home link berfungsi
- [ ] "Tentang Kami" active state
- [ ] Artikel link navigasi
- [ ] Active nav styling correct

#### Member Cards Interaction
- [ ] Click "Lihat Detail" membuka modal
- [ ] Modal smooth slide-in animation
- [ ] Member name & role terlihat correct
- [ ] Personal quote & vision terlihat

#### Modal Features
- [ ] Close button (X) di top-right berfungsi
- [ ] Click backdrop (gelap) menutup modal
- [ ] Escape key menutup modal
- [ ] Smooth fade-out animation
- [ ] Body scroll disabled saat modal open
- [ ] Body scroll restored saat modal close

#### Scroll Features
- [ ] Horizontal scroll smooth
- [ ] Swipe works di mobile
- [ ] Snap alignment proper
- [ ] No scrollbar visible
- [ ] Scroll behavior: smooth

---

### 3. Animation Tests

#### Page Load
- [ ] Intro section fade-in
- [ ] Bidang sections slide-up with stagger
- [ ] Member cards staggered animation
- [ ] Timing: not too fast, not too slow
- [ ] Smooth ease-out function

#### Hover States
- [ ] Member card scale up (1.03x)
- [ ] Card moves up (-8px)
- [ ] Shadow glow appears
- [ ] Border color changes
- [ ] Background gradient appears
- [ ] Top border animates in

#### Click Feedback
- [ ] Immediate visual response
- [ ] No lag atau delay
- [ ] Smooth transition
- [ ] Active state shows

#### Modal Animation
- [ ] Pop-scale animation on open (0.4s)
- [ ] Backdrop blur appears
- [ ] Close animation smooth
- [ ] Escape animation clean

---

### 4. Responsive Design Tests

#### Breakpoint Testing
```
Mobile:   360px, 375px, 480px
Tablet:   600px, 768px, 800px
Desktop:  1024px, 1366px, 1920px
```

Tests per breakpoint:
- [ ] Layout tidak overflow
- [ ] Text readable
- [ ] Images scaled properly
- [ ] Buttons touchable
- [ ] Modals fit screen

#### Orientation Testing
- [ ] Portrait: normal view
- [ ] Landscape: adjusted layout
- [ ] Smooth transition between orientations
- [ ] No layout shift atau jump

---

### 5. Performance Tests

#### Chrome DevTools - Lighthouse
- [ ] Performance score: > 90
- [ ] Accessibility score: > 95
- [ ] Best Practices: > 90
- [ ] SEO: > 90

#### Speed Metrics
- [ ] FCP (First Contentful Paint): < 2s
- [ ] LCP (Largest Contentful Paint): < 2.5s
- [ ] CLS (Cumulative Layout Shift): < 0.1

#### Network Tests
- [ ] Slow 3G performance acceptable
- [ ] Images lazy-load properly
- [ ] FontAwesome CDN loads quickly

---

### 6. Browser Compatibility Tests

#### Chrome (Latest)
- [ ] All features work
- [ ] Animations smooth
- [ ] DevTools show no errors
- [ ] DevTools show no warnings

#### Firefox (Latest)
- [ ] Layout correct
- [ ] Animations play
- [ ] Hover states work
- [ ] No console errors

#### Safari (Latest)
- [ ] Glassmorphism works
- [ ] Scroll smooth
- [ ] Touch interactions responsive
- [ ] No rendering issues

#### Edge (Latest)
- [ ] Similar to Chrome (Chromium-based)
- [ ] All features work

#### Mobile Safari (iOS Latest)
- [ ] Swipe scroll works
- [ ] Touch-friendly buttons
- [ ] Modal responsive
- [ ] No layout issues

#### Chrome Mobile (Android Latest)
- [ ] Layout proper
- [ ] Performance good
- [ ] Touch interactions smooth
- [ ] Status bar integration

---

### 7. Data Tests

#### Member Data
- [ ] All 54 members load (9 bidang × 6 members)
- [ ] Names correct
- [ ] Roles correct
- [ ] Quotes display properly
- [ ] Vision statements complete
- [ ] Photos file paths correct

#### Bidang Data
- [ ] 9 bidang all visible
- [ ] Icons correct per bidang
- [ ] Titles correct
- [ ] Member counts accurate
- [ ] Subtitles display

---

### 8. Accessibility Tests

#### Keyboard Navigation
- [ ] Tab key navigates through elements
- [ ] Focus visible dengan outline
- [ ] Enter key activates buttons
- [ ] Escape key closes modal
- [ ] No keyboard traps

#### Color Contrast
- [ ] Text vs background contrast > 4.5:1
- [ ] Buttons vs background contrast adequate
- [ ] Icons vs background contrast good

#### Screen Reader (NVDA/JAWS)
- [ ] Headers announced correctly
- [ ] Button labels clear
- [ ] Link purposes clear
- [ ] Form elements labeled
- [ ] Modal announced as dialog

#### Semantic HTML
- [ ] Proper heading hierarchy (h1, h2, h3)
- [ ] Buttons dengan role="button"
- [ ] Modal dengan aria-modal
- [ ] Landmarks: header, main, footer
- [ ] Images with alt text

---

### 9. Cross-Device Tests

#### Desktop Browsers
- [ ] Chrome Windows
- [ ] Firefox Windows
- [ ] Edge Windows
- [ ] Safari macOS
- [ ] Firefox macOS

#### Tablets
- [ ] iPad Air (2024)
- [ ] Samsung Tab S9
- [ ] iPad Mini

#### Phones
- [ ] iPhone 15 Pro
- [ ] iPhone 15
- [ ] Samsung Galaxy S24
- [ ] Pixel 8
- [ ] OnePlus 12

---

### 10. Edge Cases

#### Empty States
- [ ] What if member photo missing?
  - Should show icon fallback ✓

#### Long Text
- [ ] Member name very long?
  - Should wrap/truncate properly
- [ ] Quote very long?
  - Should clamp di 2 lines

#### Large Screens
- [ ] 4K displays (3840x2160)?
  - Max-width container prevents overflow
- [ ] Content scales proportionally?

#### Slow Networks
- [ ] Smooth degradation
- [ ] Fonts load from fallback
- [ ] Images with proper sizes
- [ ] Animations don't block

---

## 🔍 Detailed Test Scenarios

### Scenario 1: First Time User (Mobile)
1. Load page on iPhone
2. Read intro section
3. Scroll down to first bidang
4. Swipe through member cards
5. Click "Lihat Detail" on random member
6. Read member details
7. Close modal dengan Escape
8. Scroll ke bidang lain
9. Try member dari bidang different
10. Check footer contact info

**Expected Result**: Smooth experience, all animations visible, no errors

---

### Scenario 2: Experienced User (Desktop)
1. Load page on desktop
2. Use keyboard Tab to navigate
3. Hover over various elements
4. Click multiple member cards
5. Open DevTools Console (F12)
6. Check for any error messages
7. Run Lighthouse audit
8. Check Network tab loading times
9. Test horizontal scroll dengan mouse wheel
10. Resize browser window

**Expected Result**: No console errors, good Lighthouse scores, smooth resize

---

### Scenario 3: Accessibility Test (Screen Reader)
1. Open page dengan NVDA/JAWS
2. Listen to page announcements
3. Navigate with keyboard only (no mouse)
4. Tab through all interactive elements
5. Activate buttons dengan Enter
6. Close modals dengan Escape
7. Verify all information conveyed

**Expected Result**: All content accessible, clear labels, good experience

---

### Scenario 4: Performance Test (Slow Network)
1. Open DevTools → Network tab
2. Set throttling: Slow 3G
3. Load page
4. Observe:
   - Loading time
   - CLS (layout shift)
   - Visual completeness
5. Scroll and interact
6. Check for jank/stutter

**Expected Result**: Acceptable loading, smooth interactions

---

## 📊 Test Results Template

```
Date: [Date]
Tester: [Name]
Browser/Device: [Details]

VISUAL DESIGN:        ✅ / ⚠️ / ❌
FUNCTIONALITY:        ✅ / ⚠️ / ❌
ANIMATIONS:           ✅ / ⚠️ / ❌
RESPONSIVENESS:       ✅ / ⚠️ / ❌
PERFORMANCE:          ✅ / ⚠️ / ❌
ACCESSIBILITY:        ✅ / ⚠️ / ❌

Issues Found:
- [Issue 1]
- [Issue 2]

Notes:
[Additional observations]
```

---

## 🐛 Issue Reporting

Format untuk report issue:

```
TITLE: [Brief description]

Device: [e.g., iPhone 15, Samsung Tab S9]
Browser: [e.g., Safari 17, Chrome 120]
OS: [e.g., iOS 17, Android 14]

REPRODUCE:
1. Step 1
2. Step 2
3. Step 3

EXPECTED:
[What should happen]

ACTUAL:
[What actually happened]

SCREENSHOT: [If visual issue]
```

---

## ✅ Sign-Off Checklist

Sebelum launch, pastikan:

- [ ] Semua browser tests passed
- [ ] Mobile optimization verified
- [ ] Performance acceptable
- [ ] Accessibility compliant
- [ ] Data integrity confirmed
- [ ] Links all working
- [ ] Images loading
- [ ] No console errors
- [ ] User feedback positive
- [ ] Stakeholder approval

---

## 📝 Notes

- Test di incognito/private mode untuk clear cache
- Use real devices, bukan hanya DevTools emulation
- Test pada peak hours untuk network variability
- Get feedback dari actual users
- Document all findings

---

**Testing Completed:** _______________  
**Tester Name:** _______________  
**Date:** _______________  
**Status:** Ready for Launch ✅

---

*Last Updated: January 2026*
