import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Ruang Diskusi | PC IPM Panawuan' };

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/discussions.css" />

      <main className="main-content">

        {/* Forum Hero */}
        <section className="forum-hero reveal">
            <div className="container">
                <span className="forum-hero-badge">
                    <i className="fas fa-comments"></i> Forum Kader
                </span>
                <h1 className="forum-title">Ruang Diskusi</h1>
                <p className="forum-subtitle">Tempat berekspresi, berbagi gagasan, dan berdiskusi sesama Kader PC IPM Panawuan.</p>
                <div className="forum-hero-actions">
                    <button id="btn-new-topic" className="btn-create-topic">
                        <i className="fas fa-pen-to-square"></i> Buat Topik Baru
                    </button>
                </div>
                <div className="forum-stats" id="forum-stats">
                    <div className="forum-stat">
                        <span className="forum-stat-value" id="stat-topics">—</span>
                        <span className="forum-stat-label">Topik</span>
                    </div>
                    <div className="forum-stat">
                        <span className="forum-stat-value" id="stat-replies">—</span>
                        <span className="forum-stat-label">Balasan</span>
                    </div>
                    <div className="forum-stat">
                        <span className="forum-stat-value" id="stat-views">—</span>
                        <span className="forum-stat-label">Views</span>
                    </div>
                </div>
            </div>
        </section>

        {/* New Topic Modal */}
        <div className="topic-modal-overlay" id="topic-modal" hidden>
            <div className="topic-modal">
                <div className="topic-modal-header">
                    <h3><i className="fas fa-pen-to-square" style={{ color: 'var(--ds-primary); margin-right: 8px' }}></i> Buat Diskusi Baru</h3>
                    <button className="btn-close-modal" id="btn-close-topic"><i className="fas fa-times"></i></button>
                </div>
                <div className="topic-modal-body">
                    <input type="text" id="topic-title" className="topic-input" placeholder="Judul topik diskusi..." maxLength={150} />
                    <span className="topic-char-count" id="topic-title-count">0 / 150</span>
                    <textarea id="topic-content" className="topic-textarea" placeholder="Tuliskan gagasan, pertanyaan, atau pendapatmu di sini..." rows={5}></textarea>
                    <button id="btn-submit-topic" className="btn-submit">
                        <i className="fas fa-paper-plane"></i> Posting Diskusi
                    </button>
                </div>
            </div>
        </div>

        <div className="container forum-container">
            {/* Search Bar */}
            <div className="forum-search-bar" id="forum-search-bar">
                <i className="fas fa-search"></i>
                <input type="text" className="forum-search-input" id="forum-search-input" placeholder="Cari topik diskusi..." />
            </div>

            {/* Discussion List View */}
            <div id="discussions-list-view">
                <div id="discussions-feed" className="discussions-feed">
                    <div className="skeleton-card"></div>
                    <div className="skeleton-card"></div>
                    <div className="skeleton-card"></div>
                </div>
            </div>

            {/* Detail View (Hidden initially) */}
            <div id="discussion-detail-view" hidden>
                <button id="btn-back-to-list" className="btn-back-thread"><i className="fas fa-arrow-left"></i> Kembali</button>
                
                <div id="thread-head" className="thread-head"></div>
                
                <div className="replies-section">
                    <h4 className="replies-title">Balasan</h4>
                    <div id="replies-list" className="replies-list"></div>
                    
                    <div className="reply-form" id="reply-form">
                        <span className="reply-form-label"><i className="fas fa-reply"></i> Tulis Balasanmu</span>
                        <textarea id="reply-content" className="reply-textarea" placeholder="Tulis balasanmu di sini..."></textarea>
                        <button id="btn-submit-reply" className="btn-submit">
                            <i className="fas fa-paper-plane"></i> Kirim Balasan
                        </button>
                    </div>
                    <div className="reply-login-prompt" id="reply-login-prompt" hidden>
                        <p><i className="fas fa-lock" style={{ marginRight: '6px' }}></i> Silakan <a href="login.html">Login</a> untuk membalas diskusi ini.</p>
                    </div>
                </div>
            </div>
        </div>
    
</main>

      <script src="/app/js/pages/discussions.js" defer></script>
    </>
  );
}
