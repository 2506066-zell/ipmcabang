import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'PC IPM Panawuan - Ikatan Pelajar Muhammadiyah',
  description: 'Platform digital resmi PC IPM Panawuan — perpustakaan digital, artikel, quiz kader, absensi, dan informasi organisasi.',
};

const NAV_LINKS = [
  { href: '/', label: 'Beranda', icon: 'fa-home', active: true },
  { href: '/struktur', label: 'Struktur Organisasi', icon: 'fa-sitemap' },
  { href: '/articles', label: 'Artikel', icon: 'fa-newspaper' },
  { href: '/materi', label: 'Perpustakaan', icon: 'fa-book' },
  { href: '/quiz', label: 'Quiz', icon: 'fa-question-circle' },
  { href: '/pendaftaran/pkdtm1', label: 'Pendaftaran PKDTM1', icon: 'fa-user-graduate' },
  { href: '/absen', label: 'Absensi', icon: 'fa-camera' },
  { href: '/diskusi', label: 'Ruang Diskusi', icon: 'fa-comments' },
];

const TYPEWRITER_TEXTS = [
  'Platform Digital Kader IPM',
  'Perpustakaan Digital Pelajar',
  'Ruang Belajar Bersama',
  'Forum Diskusi Intelektual',
];

export default function HomePage() {
  return (
    <>
      {/* Loading Overlay */}
      <div className="loading-overlay" id="loading-overlay">
        <div className="loading-content">
          <div className="scanner-container">
            <Image src="/ipm-logo.png" alt="Loading..." width={80} height={80} className="loading-logo" priority />
            <div className="scanner"></div>
          </div>
          <p id="loading-text">Memuat...</p>
        </div>
      </div>

      {/* Mobile Header */}
      <header className="mobile-header" id="mobile-header">
        <div className="logo-container">
          <Image src="/ipm-logo.png" alt="Logo IPM" width={36} height={36} className="header-logo" priority />
          <span className="header-title">PC IPM Panawuan</span>
        </div>
        <div className="header-right-icons">
          <button className="header-icon notif-bell" id="notif-bell" aria-label="Notifikasi">
            <i className="fas fa-bell"></i>
            <span className="notif-badge" id="notif-badge" hidden>0</span>
          </button>
          <Link href="/ranking" className="header-icon" aria-label="Peringkat">
            <i className="fas fa-trophy"></i>
          </Link>
          <Link href="/profile" className="header-icon" aria-label="Profil">
            <i className="fas fa-user-circle"></i>
          </Link>
          <button className="hamburger-menu" id="hamburger-menu" aria-label="Buka Menu" aria-expanded="false" aria-controls="mobile-nav">
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
      </header>

      {/* Notification Panel */}
      <div className="notif-overlay" id="notif-overlay" hidden></div>
      <div className="notif-panel" id="notif-panel" hidden>
        <div className="notif-panel-header">
          <span>Notifikasi</span>
          <button className="notif-close" id="notif-close" aria-label="Tutup">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="notif-panel-list" id="notif-panel-list"></div>
        <button className="notif-mark-read" id="notif-mark-read">Tandai semua dibaca</button>
      </div>

      {/* Mobile Nav */}
      <nav className="mobile-nav" id="mobile-nav" aria-hidden="true">
        <ul className="mobile-nav-links">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={`mobile-nav-link${link.active ? ' active' : ''}`}>
                <i className={`fas ${link.icon}`}></i> {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/bantuan" className="mobile-nav-link">
              <i className="fas fa-circle-question"></i> Bantuan
            </Link>
          </li>
        </ul>
      </nav>
      <div className="mobile-nav-overlay" id="mobile-nav-overlay"></div>

      {/* Background blobs */}
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <main className="main-content">
        {/* Hero */}
        <div className="hero-section" id="hero">
          <div className="hero-content">
            <Image src="/ipm-logo.png" alt="Logo IPM Panawuan" width={120} height={120} className="hero-logo" />
            <h1 className="hero-title">Ikatan Pelajar Muhammadiyah</h1>
            <p className="hero-subtitle">
              <span id="typewriter"></span>
              <span className="cursor" aria-hidden>|</span>
            </p>
            <div className="hero-buttons">
              <Link href="/struktur" className="btn-hero btn-hero-primary">
                <i className="fas fa-building"></i> Tentang Kami
              </Link>
              <Link href="/quiz" className="btn-hero btn-hero-primary">
                <i className="fas fa-pencil-alt"></i> Kader Pintar
              </Link>
              <Link href="/pendaftaran/pkdtm1" className="btn-hero btn-hero-primary">
                <i className="fas fa-id-card"></i> Daftar PKDTM 1
              </Link>
            </div>
          </div>
        </div>

        {/* Program Highlights */}
        <section className="program-highlights reveal" id="program-highlights-section">
          <div className="container">
            <div className="highlights-wrapper">
              <div className="highlights-info">
                <h2 className="highlights-title">Program Kerja</h2>
                <p className="highlights-description">
                  Pantau dan ikuti gerak langkah perjuangan kami melalui agenda mendatang.
                </p>
                <div className="highlights-countdown" id="program-countdown" hidden>
                  <div className="program-countdown-head">
                    <div className="program-countdown-title" id="program-countdown-title"></div>
                    <span className="program-countdown-badge upcoming" id="program-countdown-badge">
                      <span className="countdown-pulse"></span> Segera
                    </span>
                  </div>
                  <div className="program-countdown-timer" id="program-countdown-timer"></div>
                  <div className="program-countdown-sub" id="program-countdown-sub"></div>
                </div>
              </div>
              <div id="highlights-content" className="highlights-grid">
                {/* Skeleton Loading */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-highlight-card">
                    <div className="skeleton-line sm"></div>
                    <div className="skeleton-line lg"></div>
                    <div className="skeleton-line md"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Latest Articles */}
        <section className="latest-articles reveal" id="latest-articles-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Artikel Terbaru</h2>
              <p className="section-subtitle">Jelajahi pemikiran dan gagasan kader IPM Panawuan</p>
            </div>
            <div id="featured-articles-grid" className="featured-grid">
              <div className="skeleton-card"></div>
              <div className="skeleton-card"></div>
              <div className="skeleton-card"></div>
            </div>
            <div className="section-footer">
              <Link href="/articles" className="btn-text">
                Lihat Semua Artikel <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FAB QR Scanner */}
      <button type="button" className="scan-fab" id="global-scan-btn" aria-label="Pindai QR Kader">
        <i className="fas fa-qrcode"></i>
      </button>

      {/* Footer */}
      <footer className="public-footer">
        <p className="footer-text">© 2026 Ikatan Pelajar Muhammadiyah - PC Panawuan</p>
        <div className="footer-socials">
          <a href="https://www.instagram.com/ipmgarut_" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://www.youtube.com/@ipmchannelgarut" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="YouTube">
            <i className="fab fa-youtube"></i>
          </a>
        </div>
        <div className="footer-info">
          <span><i className="fas fa-map-marker-alt"></i>Panawuan</span>
        </div>
      </footer>

      {/* Legacy CSS & JS (unchanged design, now served from /public) */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/profile.css" />
      <link rel="stylesheet" href="/app/css/home-dynamic.css" />
      <link rel="stylesheet" href="/app/css/scanner.css" />

      <script src="/app/js/core/toast.js" defer></script>
      <script src="/app/js/core/main.js" defer></script>
      <script src="/app/js/core/install-header.js" defer></script>
      <script src="/app/js/features/auth/webauthn-client.js" defer></script>
      <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
      <script src="/app/js/features/scanner.js" defer></script>
      <script src="/app/js/core/profile.js" defer></script>
      <script src="/app/js/features/realtime.js" defer></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Typewriter effect
            const texts = ${JSON.stringify(TYPEWRITER_TEXTS)};
            let tIdx = 0, cIdx = 0, deleting = false;
            const el = document.getElementById('typewriter');
            function typewriter() {
              if (!el) return;
              const cur = texts[tIdx];
              el.textContent = cur.slice(0, cIdx);
              if (!deleting) {
                cIdx++;
                if (cIdx > cur.length) { deleting = true; setTimeout(typewriter, 2000); return; }
              } else {
                cIdx--;
                if (cIdx < 0) { deleting = false; tIdx = (tIdx + 1) % texts.length; cIdx = 0; }
              }
              setTimeout(typewriter, deleting ? 50 : 80);
            }
            typewriter();
          `,
        }}
      />
    </>
  );
}
