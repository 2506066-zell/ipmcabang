import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Absensi | PC IPM Panawuan' };

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/attendance.css" />

      <main className="main-content attendance-main">

        <section className="attendance-hero reveal" id="attendance-hero-section">
            <div className="attendance-hero-copy">
                <span className="attendance-kicker"><i className="fas fa-fingerprint"></i> Absensi Digital</span>
                <h1>Room Absensi</h1>
                <p>Masuk ke room pimpinan, lalu lakukan absensi mandiri dengan verifikasi wajah.</p>
            </div>
            <div className="attendance-hero-side">
                <div className="attendance-user-chip" id="attendance-user-chip"><i className="fas fa-spinner fa-spin"></i> Menyiapkan akun...</div>
                <div className="attendance-tip reveal">
                    <i className="fas fa-shield-check"></i>
                    <span>Kode room adalah kunci akses. Selfie wajib saat check-in untuk bukti kehadiran yang sah.</span>
                </div>
            </div>
        </section>



        <section className="attendance-section" id="attendance-room-list-section">
            <div className="attendance-section-head">
                <div>
                    <h2>5 Room Absensi</h2>
                    <p>Pilih room sesuai rapat yang sedang berjalan, lalu masukkan kodenya untuk membuka akses.</p>
                </div>
                <button type="button" className="attendance-secondary-btn" id="attendance-refresh-btn">
                    <i className="fas fa-rotate"></i> Muat ulang
                </button>
            </div>
            <div className="attendance-room-grid" id="attendance-room-grid">
                <div className="attendance-empty-card">Memuat room absensi...</div>
            </div>
        </section>

        <section className="attendance-section" id="attendance-room-panel" hidden>
            <div className="attendance-room-shell">
                <div className="attendance-room-header">
                    <div>
                        <span className="attendance-room-label" id="attendance-room-label">Room</span>
                        <h2 id="attendance-room-title">Detail Room</h2>
                        <p id="attendance-room-subtitle">Ringkasan rapat aktif, histori rapat, dan status keaktifan pribadi.</p>
                    </div>
                    <div className="attendance-room-header-actions">
                        <button type="button" className="attendance-secondary-btn" id="attendance-back-to-rooms-btn">
                            <i className="fas fa-arrow-left"></i> Kembali ke daftar
                        </button>
                        <button type="button" className="attendance-secondary-btn" id="attendance-change-room-btn">
                            <i className="fas fa-key"></i> Ganti Kode
                        </button>
                    </div>
                </div>

                <div className="attendance-status-container" id="attendance-access-strip"></div>

                <div className="attendance-mini-stats" id="attendance-summary-grid">
                    <span className="mini-stat"><b>Rapat:</b> <i id="attendance-summary-total">0</i></span>
                    <span className="mini-stat"><b>Hadir:</b> <i id="attendance-summary-hadir">0</i></span>
                    <span className="mini-stat"><b>Ratio:</b> <i id="attendance-summary-percent">0%</i></span>
                    <span className="mini-stat highlight"><b>Status:</b> <i id="attendance-summary-status">...</i></span>
                </div>


                {/* Segmented Tab Control (Mobile First) */}
                <nav className="attendance-tabs-nav">
                    <button className="tab-btn active" data-target="tab-attendance">
                        <i className="fas fa-fingerprint"></i> Absensi
                    </button>
                    <button className="tab-btn" data-target="tab-info">
                        <i className="fas fa-info-circle"></i> Info
                    </button>
                    <button className="tab-btn" data-target="tab-history">
                        <i className="fas fa-clock-rotate-left"></i> Riwayat
                    </button>
                </nav>

                <div className="attendance-tabs-container">
                    {/* TAB 1: ABSENSI (PRIMARY) */}
                    <div id="tab-attendance" className="attendance-tab-panel active">
                        <section className="attendance-flow-status" id="attendance-flow-status" aria-live="polite">
                            <div className="attendance-flow-badge" id="attendance-flow-badge">
                                <i className="fas fa-circle"></i> Belum mulai
                            </div>
                            <p className="attendance-flow-note" id="attendance-flow-note">Pilih room lalu verifikasi kode untuk mulai absensi.</p>
                        </section>

                        <section className="attendance-panel-card hero-panel">
                            <div className="attendance-panel-head">
                                <div>
                                    <h3>Absensi Mandiri</h3>
                                    <p>Identitas & verifikasi wajah diperlukan.</p>
                                </div>
                            </div>
                            
                            <form id="attendance-checkin-form" className="attendance-form" style={{ position: 'relative' }}>
                                {/* Success feedback is now handled via toasts and status text */}

                                {/* Step 1: Identitas */}
                                <div className="attendance-step is-active" id="step-identity">
                                    <div className="attendance-step-head">
                                        <span className="attendance-step-tag">1</span>
                                        <div className="attendance-step-copy">
                                            <strong>Pilih identitas</strong>
                                            <small id="attendance-step-identity-note">Pilih kader yang akan diabsenkan sebelum lanjut ke kamera.</small>
                                        </div>
                                        <span className="attendance-step-state" id="attendance-step-identity-state">Menunggu</span>
                                    </div>
                                    <div className="attendance-field" id="attendance-member-field" hidden>
                                        <span>Pilih Kader</span>
                                        <div id="attendance-member-directory">
                                            <div className="attendance-search-wrapper">
                                                <i className="fas fa-search"></i>
                                                <input type="text" id="attendance-member-search" placeholder="Cari nama kader..." className="attendance-input" />
                                            </div>
                                            <select id="attendance-member-select" className="attendance-select">
                                                <option value="">Pilih kader yang akan diabsenkan</option>
                                            </select>
                                        </div>
                                        <div id="attendance-manual-name-wrap" hidden>
                                            <input type="text" id="attendance-manual-name" className="attendance-input" placeholder="Tulis nama kader yang diabsenkan" />
                                        </div>
                                        <small id="attendance-member-meta" className="attendance-helper-text"></small>
                                    </div>
                                </div>

                                {/* Step 2: Kamera */}
                                <div className="attendance-step" id="step-photo">
                                    <div className="attendance-step-head">
                                        <span className="attendance-step-tag">2</span>
                                        <div className="attendance-step-copy">
                                            <strong>Ambil selfie</strong>
                                            <small id="attendance-step-photo-note">Buka kamera lalu ambil foto sebagai bukti kehadiran.</small>
                                        </div>
                                        <span className="attendance-step-state" id="attendance-step-photo-state">Menunggu</span>
                                    </div>
                                    <div className="attendance-field">
                                        <span>Verifikasi Wajah</span>
                                        <div className="attendance-camera-shell" id="attendance-camera-shell">
                                            <div className="attendance-camera-placeholder" id="attendance-camera-placeholder">
                                                <i className="fas fa-camera"></i>
                                                <span>Kamera Siap</span>
                                            </div>
                                            <video id="attendance-camera-video" className="attendance-camera-video" autoPlay playsInline muted hidden></video>
                                            <div className="attendance-preview" id="attendance-selfie-preview" hidden>
                                                <img src="" id="attendance-selfie-image" />
                                            </div>
                                            <div className="camera-permission-overlay" id="camera-permission-overlay" hidden>
                                                <i className="fas fa-lock"></i>
                                                <p>Izin kamera diperlukan.</p>
                                            </div>
                                        </div>
                                        <div className="attendance-camera-actions">
                                            <button type="button" className="attendance-secondary-btn" id="attendance-open-camera-btn">
                                                <i className="fas fa-video"></i> Buka Kamera
                                            </button>
                                            <button type="button" className="attendance-secondary-btn" id="attendance-capture-camera-btn" hidden>
                                                <i className="fas fa-camera"></i> Ambil Selfie
                                            </button>
                                            <button type="button" className="attendance-secondary-btn" id="attendance-retake-camera-btn" hidden>
                                                <i className="fas fa-rotate-left"></i> Ulang
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 3: Submit */}
                                <div className="attendance-step" id="step-submit">
                                    <div className="attendance-step-head">
                                        <span className="attendance-step-tag">3</span>
                                        <div className="attendance-step-copy">
                                            <strong>Kirim kehadiran</strong>
                                            <small id="attendance-step-submit-note">Kirim setelah semua syarat lengkap.</small>
                                        </div>
                                        <span className="attendance-step-state" id="attendance-step-submit-state">Menunggu</span>
                                    </div>
                                    <div className="attendance-field">
                                        <span>Konfirmasi</span>
                                        <button type="submit" className="attendance-primary-btn" id="attendance-checkin-btn">
                                            <i className="fas fa-paper-plane"></i> Kirim Kehadiran
                                        </button>
                                        <p className="attendance-inline-status" id="attendance-checkin-status"></p>
                                    </div>
                                </div>
                            </form>
                        </section>
                    </div>

                    {/* TAB 2: INFO & CREATE */}
                    <div id="tab-info" className="attendance-tab-panel">
                        <section className="attendance-panel-card">
                            <div className="attendance-panel-head">
                                <div>
                                    <h3>Rapat Aktif</h3>
                                    <p>Status rapat saat ini.</p>
                                </div>
                                <span className="attendance-status-badge" id="attendance-event-badge">Menunggu</span>
                            </div>
                            <div id="attendance-current-event">
                                <div className="attendance-empty-state">Belum ada rapat aktif.</div>
                            </div>
                        </section>

                        <section className="attendance-panel-card">
                            <div className="attendance-panel-head">
                                <div>
                                    <h3>Buat Rapat Baru</h3>
                                    <p id="attendance-event-helper">Admin/pengelola room.</p>
                                </div>
                            </div>
                            <form id="attendance-create-form" className="attendance-form">
                                <label className="attendance-field">
                                    <span>Judul Rapat</span>
                                    <input type="text" id="attendance-event-title" placeholder="Nama rapat..." required />
                                </label>
                                <label className="attendance-field">
                                    <span>Keterangan</span>
                                    <textarea id="attendance-event-description" rows={2} placeholder="Agenda..."></textarea>
                                </label>
                                <button type="submit" className="attendance-primary-btn" id="attendance-create-btn">
                                    <i className="fas fa-plus"></i> Buat Rapat
                                </button>
                                <p className="attendance-inline-status" id="attendance-create-status"></p>
                            </form>
                        </section>

                        <section className="attendance-panel-card" id="pwa-install-section" hidden>
                            <div className="attendance-panel-head">
                                <div>
                                    <h3>Aplikasi PWA</h3>
                                    <p>Pasang di perangkat untuk akses lebih cepat.</p>
                                </div>
                                <i className="fas fa-mobile-screen-button" style={{ fontSize: '24px', color: 'var(--c-emerald-700)' }}></i>
                            </div>
                            <div style={{ padding: '16px', background: 'var(--c-emerald-50)', borderRadius: '12px', marginBottom: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--c-emerald-800)', margin: '0' }}>Nikmati pengalaman absensi yang lebih stabil dan native dengan memasang aplikasi ini di layar utama HP kamu.</p>
                            </div>
                            <button type="button" className="attendance-primary-btn" id="pwa-install-btn">
                                <i className="fas fa-download"></i> Pasang Aplikasi Sekarang
                            </button>
                        </section>
                    </div>

                    {/* TAB 3: RIWAYAT */}
                    <div id="tab-history" className="attendance-tab-panel">
                        <section className="attendance-panel-card">
                            <div className="attendance-panel-head">
                                <div>
                                    <h3>Riwayat Rapat</h3>
                                    <p>Arsip kegiatan di room ini.</p>
                                </div>
                            </div>
                            <div className="attendance-history-controls">
                                <div className="history-search-box">
                                    <i className="fas fa-search"></i>
                                    <input type="text" id="history-search-input" placeholder="Cari event..." />
                                </div>
                                <div className="history-filter-pills">
                                    <button type="button" className="history-filter-btn active" data-filter="all">Semua</button>
                                    <button type="button" className="history-filter-btn" data-filter="active">Aktif</button>
                                    <button type="button" className="history-filter-btn" data-filter="closed">Arsip</button>
                                </div>
                            </div>
                            <div className="attendance-history-list" id="attendance-history-list">
                                <div className="attendance-empty-state">Riwayat belum tersedia.</div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </section>
    
</main>

      <script src="/app/js/pages/absen.js" defer></script>
    </>
  );
}
