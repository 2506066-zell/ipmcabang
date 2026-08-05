import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Peringkat Kader | PC IPM Panawuan' };

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/ranking.css" />

      <main className="ranking-container">

        <div className="ranking-header">
            <h1><i className="fas fa-trophy" style={{ color: 'var(--rank-gold)' }}></i> Papan Peringkat</h1>
            <p>Uji kemampuanmu dan raih posisi puncak!</p>
            <div id="last-updated" className="last-updated"></div>
        </div>
        <div className="ranking-period-note" role="note" aria-live="polite">
            <div className="period-badge">
                <i className="fas fa-calendar-alt"></i>
                <span id="ranking-period">Periode: </span>
            </div>
            <div className="reset-note">Skor direset otomatis setiap awal bulan.</div>
            <button id="share-ranking-btn" className="ranking-share-btn" type="button" aria-label="Bagikan juara satu ranking">
                <i className="fas fa-share-alt"></i> Share Juara #1
            </button>
        </div>

        <section id="archive-section" className="ranking-archive-section" style={{ display: 'none' }}>
            <div className="archive-header">
                <div>
                    <h2>Arsip Juara Bulanan</h2>
                    <p>Lihat juara 1-3 tiap bulan dan pantau siapa paling konsisten.</p>
                </div>
                <div className="archive-controls">
                    <label htmlFor="archive-month-select" className="archive-label">Periode</label>
                    <select id="archive-month-select" className="archive-select" disabled>
                        <option value="">Belum ada arsip</option>
                    </select>
                </div>
            </div>
            <div id="archive-meta" className="archive-meta"></div>
            <div id="archive-empty" className="archive-empty" hidden>Arsip akan muncul setelah reset bulanan pertama.</div>
            <div id="archive-podium" className="archive-podium"></div>
            <div id="hall-of-fame-wrap" className="hall-of-fame-wrap" hidden>
                <h3>Hall of Fame</h3>
                <div id="hall-of-fame" className="hall-of-fame-list"></div>
            </div>
        </section>

        <div id="loading-indicator" className="loading-indicator">
            <div className="loading-content">
                <h2>Menganalisis Peringkat...</h2>
                <div className="scanner"></div>
            </div>
        </div>

        <div id="error-container" style={{ display: 'none' }}>
            <h2>Terjadi Kesalahan</h2>
            <p id="error-message"></p>
        </div>

        <div id="empty-state" className="empty-state" style={{ display: 'none' }}>
            <div className="empty-icon"><i className="fas fa-ranking-star"></i></div>
            <h3>Belum ada data peringkat</h3>
            <p>Mulai kuis terlebih dahulu atau muat ulang jika data baru tersedia.</p>
            <button id="empty-reload" className="filter-btn">Muat Ulang</button>
        </div>

        <div id="main-content" style={{ display: 'none' }}>
            {/* User Rank Card */}
            <div id="user-rank-card" className="user-rank-card" style={{ display: 'none' }}>
                {/* Injected via JS */}
            </div>

            {/* Controls */}
            <div className="ranking-controls">
                <input type="text" id="search-input" placeholder="Cari nama peserta..." />
                <div className="filter-buttons">
                    <button className="filter-btn active" data-filter="all">Semua</button>
                    <button className="filter-btn" data-filter="weekly">Mingguan</button>
                    <button className="filter-btn" data-filter="daily">Harian</button>
                </div>
            </div>

            {/* Top 3 Podium */}
            <div id="top-3-showcase" className="top-3-container" role="list">
                {/* Injected via JS */}
            </div>

            {/* List Ranking */}
            <div id="ranking-list" className="ranking-list" role="list" aria-live="polite">
                {/* Injected via JS */}
            </div>
        </div>
    
</main>

      <script src="/app/js/pages/ranking.js" defer></script>
    </>
  );
}
