import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Struktur Organisasi | PC IPM Panawuan' };

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/struktur-zen.css" />

      <main className="main-container">

        <section className="org-hero" aria-labelledby="orgHeroTitle">
            <p className="org-kicker">Struktur Resmi Organisasi</p>
            <h1 className="org-hero-title" id="orgHeroTitle">Struktur Organisasi</h1>
            <p className="org-hero-subtitle">Susunan bidang, anggota, dan program kerja</p>
            <div className="org-hero-stats" aria-label="Ringkasan organisasi">
                <article className="org-stat">
                    <span className="org-stat-value" id="heroTotalBidang">0</span>
                    <span className="org-stat-label">Bidang Aktif</span>
                </article>
                <article className="org-stat">
                    <span className="org-stat-value" id="heroTotalAnggota">0</span>
                    <span className="org-stat-label">Total Anggota</span>
                </article>
                <article className="org-stat">
                    <span className="org-stat-value" id="heroTotalProgram">0</span>
                    <span className="org-stat-label">Program Kerja</span>
                </article>
            </div>
        </section>

        <section id="viewBidangGrid" className="org-chart-view" aria-labelledby="orgChartHeading">
            <div className="org-section-head">
                <h2 id="orgChartHeading">Susunan Bidang</h2>
                <p>Pilih kartu bidang untuk melihat susunan anggota dan program kerja secara detail.</p>
            </div>
            <div className="org-chart-canvas" id="orgChartCanvas">
                <div className="org-chart-tiers" id="bidangGrid"></div>
            </div>
        </section>

        <section id="viewDetail" className="org-detail-workspace" aria-live="polite">
            <header className="detail-header">
                <button className="back-btn" id="backToGridBtn" type="button" aria-label="Kembali ke struktur bidang">
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div className="detail-header-info">
                    <h2 className="detail-title" id="detailBidangTitle" tabindex="-1"></h2>
                    <div className="detail-meta">
                        <span id="detailMemberCount"></span>
                        <span id="detailProgramCount"></span>
                    </div>
                </div>
            </header>
            <nav className="detail-segment" role="tablist" aria-label="Konten detail bidang">
                <button className="segment-btn active" id="detailSegmentAnggota" type="button" role="tab"
                    aria-selected="true" data-segment="anggota">
                    Susunan Anggota
                </button>
                <button className="segment-btn" id="detailSegmentProgram" type="button" role="tab" aria-selected="false"
                    data-segment="program">
                    Program Kerja
                </button>
            </nav>
            <section className="detail-panel active" id="detailPanelAnggota" role="tabpanel"
                aria-labelledby="detailSegmentAnggota">
                <div id="leadershipSection"></div>
                <div id="membersSection"></div>
            </section>
            <section className="detail-panel" id="detailPanelProgram" role="tabpanel" aria-labelledby="detailSegmentProgram"
                hidden>
                <div className="program-list" id="programList"></div>
            </section>
        </section>

        <section className="org-feedback-card" id="orgFeedbackSection" aria-labelledby="orgFeedbackTitle" hidden>
            <div className="org-feedback-head">
                <h2 id="orgFeedbackTitle">Kritik &amp; Saran Program Kerja</h2>
                <p>Masukan kamu akan dipakai untuk meningkatkan kualitas program kerja pada bidang yang sedang dibuka.
                </p>
            </div>
            <button type="button" className="org-feedback-trigger" id="orgFeedbackToggleBtn" aria-expanded="false"
                aria-controls="orgFeedbackPanel">
                <i className="fas fa-comment-dots" aria-hidden="true"></i>
                <span>Kirim Kritik &amp; Saran Program Kerja</span>
            </button>
            <div className="org-feedback-panel" id="orgFeedbackPanel" hidden>
                <form id="orgFeedbackForm" className="org-feedback-form">
                    <div className="org-feedback-row">
                        <div className="org-feedback-field">
                            <label htmlFor="orgFeedbackName">Nama (opsional)</label>
                            <input type="text" id="orgFeedbackName" maxlength="80" placeholder="Nama kamu" />
                        </div>
                        <div className="org-feedback-field">
                            <label htmlFor="orgFeedbackContact">Kontak (opsional)</label>
                            <input type="text" id="orgFeedbackContact" maxlength="120" placeholder="WA / Email / IG" />
                        </div>
                    </div>
                    <div className="org-feedback-field">
                        <label htmlFor="orgFeedbackSubject">Topik Program Kerja</label>
                        <input type="text" id="orgFeedbackSubject" maxlength="140"
                            placeholder="Contoh: Program kaderisasi perlu timeline lebih jelas" />
                    </div>
                    <div className="org-feedback-field">
                        <label htmlFor="orgFeedbackMessage">Pesan</label>
                        <textarea id="orgFeedbackMessage" rows="4" maxlength="2000"
                            placeholder="Tulis kritik/saran program kerja secara spesifik agar mudah ditindaklanjuti admin."
                            required></textarea>
                    </div>
                    <div className="org-feedback-actions">
                        <button type="submit" className="btn-submit-feedback" id="orgFeedbackSubmitBtn">
                            <i className="fas fa-paper-plane"></i> Kirim
                        </button>
                        <span className="org-feedback-status" id="orgFeedbackStatus" aria-live="polite"></span>
                    </div>
                </form>
            </div>
        </section>
    
</main>

      <script src="/app/js/pages/struktur-organisasi.js" defer></script>
    </>
  );
}
