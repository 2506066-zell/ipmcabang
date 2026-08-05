import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Admin IPM Panawuan',
    default: 'Panel Admin | PC IPM Panawuan',
  },
  robots: { index: false, follow: false }, // No indexing for admin
};

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: 'fa-tachometer-alt', exact: true },
  { href: '/admin/users', label: 'Manajemen User', icon: 'fa-users' },
  { href: '/admin/questions', label: 'Bank Soal Quiz', icon: 'fa-question-circle' },
  { href: '/admin/materials', label: 'Materi', icon: 'fa-book' },
  { href: '/admin/organization', label: 'Struktur Org.', icon: 'fa-sitemap' },
  { href: '/admin/attendance', label: 'Absensi', icon: 'fa-clipboard-check' },
  { href: '/admin/notifications', label: 'Notifikasi', icon: 'fa-bell' },
  { href: '/admin/forms', label: 'Form & PKDTM1', icon: 'fa-wpforms' },
  { href: '/admin/settings', label: 'Pengaturan', icon: 'fa-cog' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar" id="admin-sidebar" aria-label="Admin Navigation">
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ipm-logo.png" alt="Logo IPM" className="admin-brand-logo" />
            <div className="admin-brand-text">
              <span className="admin-brand-name">IPM Panawuan</span>
              <span className="admin-brand-role">Panel Admin</span>
            </div>
          </div>
          <button className="admin-sidebar-close" id="admin-sidebar-close" aria-label="Tutup sidebar">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <nav className="admin-nav" aria-label="Admin menu">
          <ul className="admin-nav-list">
            {ADMIN_NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="admin-nav-link" data-exact={item.exact ? 'true' : undefined}>
                  <span className="admin-nav-icon"><i className={`fas ${item.icon}`}></i></span>
                  <span className="admin-nav-label">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="admin-sidebar-footer">
          <a href="/" className="admin-nav-link" target="_blank" rel="noopener">
            <span className="admin-nav-icon"><i className="fas fa-external-link-alt"></i></span>
            <span className="admin-nav-label">Lihat Website</span>
          </a>
          <button className="admin-nav-link admin-logout-btn" id="admin-logout-btn">
            <span className="admin-nav-icon"><i className="fas fa-sign-out-alt"></i></span>
            <span className="admin-nav-label">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      <div className="admin-sidebar-overlay" id="admin-sidebar-overlay" aria-hidden="true"></div>

      {/* Main Content */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <button className="admin-topbar-toggle" id="admin-sidebar-toggle" aria-label="Toggle sidebar">
            <i className="fas fa-bars"></i>
          </button>
          <div className="admin-topbar-breadcrumb" id="admin-breadcrumb">
            <span>Admin</span>
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-user-chip" id="admin-user-chip">
              <i className="fas fa-user-shield"></i>
              <span id="admin-username-display">Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content" id="admin-page-content">
          {children}
        </main>
      </div>

      {/* Admin scripts */}
      <link rel="stylesheet" href="/app/css/style.css" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Active nav link
            document.addEventListener('DOMContentLoaded', function() {
              const links = document.querySelectorAll('.admin-nav-link');
              const path = window.location.pathname;
              links.forEach(link => {
                const href = link.getAttribute('href');
                const isExact = link.dataset.exact === 'true';
                const isActive = isExact ? path === href : path.startsWith(href);
                if (isActive) link.classList.add('active');
              });

              // Mobile sidebar toggle
              const toggle = document.getElementById('admin-sidebar-toggle');
              const sidebar = document.getElementById('admin-sidebar');
              const overlay = document.getElementById('admin-sidebar-overlay');
              const close = document.getElementById('admin-sidebar-close');

              function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); }
              function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

              toggle?.addEventListener('click', openSidebar);
              overlay?.addEventListener('click', closeSidebar);
              close?.addEventListener('click', closeSidebar);

              // Load admin user
              fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + (localStorage.getItem('ipm_session') || '') } })
                .then(r => r.json())
                .then(d => {
                  if (d.status === 'success') {
                    document.getElementById('admin-username-display').textContent = d.user?.nama_panjang || d.user?.username || 'Admin';
                  }
                }).catch(() => {});

              // Logout
              document.getElementById('admin-logout-btn')?.addEventListener('click', function() {
                if (!confirm('Yakin ingin keluar?')) return;
                fetch('/api/auth/logout', { method: 'DELETE' }).finally(() => {
                  localStorage.removeItem('ipm_session');
                  window.location.href = '/login';
                });
              });
            });
          `,
        }}
      />
    </div>
  );
}
