import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Artikel | PC IPM Panawuan',
  description: 'Kumpulan artikel, opini, dan pemikiran dari kader IPM Panawuan.',
};

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/article-enhancements.css" />

      <main className="main-content" style={{ paddingTop: 70, paddingBottom: 100 }}>

        <div className="container article-layout-container">
            {/* List View Container */}
            <div id="articles-list-view" className="articles-main-col">
                <h1 className="page-title">Artikel & Berita</h1>

                {/* Filter & Search */}
                <div className="articles-toolbar">
                    <div className="search-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <input type="text" id="search-input" placeholder="Cari artikel..." />
                    </div>

                    <div className="filter-wrapper">
                        <select id="sort-select">
                            <option value="newest">Terbaru</option>
                            <option value="popular">Terpopuler</option>
                            <option value="oldest">Terlama</option>
                        </select>
                        <select id="category-select">
                            <option value="all">Semua Kategori</option>
                            <option value="Umum">Umum</option>
                            <option value="Kader">Kader</option>
                            <option value="Opini">Opini</option>
                            <option value="Berita">Berita</option>
                            <option value="Program Kerja">Program Kerja</option>
                        </select>
                    </div>
                </div>

                <div id="loading-indicator" className="loader-anim">
                    <div className="scanner-dot"></div>
                    <span>Memuat Artikel...</span>
                </div>

                <div id="articles-grid" className="articles-grid">
                    {/* JS will inject cards here */}
                </div>

                <div className="load-more-container">
                    <button id="load-more-btn" className="btn btn-secondary" style={{ display: 'none' }}>Muat Lebih
                        Banyak</button>
                </div>
            </div>

            {/* Detail View Container */}
            <div id="article-detail-view" className="articles-main-col" style={{ display: 'none' }}>
                <div id="article-detail-content">
                    {/* JS will inject detail here */}
                </div>
            </div>

            {/* Sidebar (Desktop only or hidden on mobile detail) */}
            <aside className="articles-sidebar" id="articles-sidebar">
                {/* Latest Articles Section */}
                <section className="sidebar-section">
                    <h3 className="section-title">Artikel Terbaru</h3>
                    <div id="latest-articles-list" className="sidebar-list">
                        {/* JS will inject here */}
                        <div className="skeleton-list"></div>
                    </div>
                </section>

                {/* Categories Section */}
                <section className="sidebar-section">
                    <h3 className="section-title">Kategori</h3>
                    <div id="categories-list" className="sidebar-tags">
                        {/* JS will inject here */}
                    </div>
                </section>
            </aside>

            {/* Floating Social Share Bar (Detail only) */}
            <div className="social-share-bar" id="social-share-bar" style={{ display: 'none' }}>
                <button className="share-btn whatsapp" onClick={() => { /* window.shareArticle('whatsapp') */ }}
                    title="Bagikan ke WhatsApp">
                    <i className="fab fa-whatsapp"></i>
                </button>
                <button className="share-btn twitter" onClick={() => { /* window.shareArticle('twitter') */ }} title="Bagikan ke Twitter">
                    <i className="fab fa-x-twitter"></i>
                </button>
                <button className="share-btn copy" onClick={() => { /* window.shareArticle('copy') */ }} title="Salin Tautan">
                    <i className="fas fa-link"></i>
                </button>
            </div>
        </div>
    
</main>

      <script src="/app/js/features/articles/article-renderer-shared.js" defer></script>
      <script type="module" dangerouslySetInnerHTML={{ __html: `import { initPublicArticles } from '/app/js/features/articles/public-articles.js'; setTimeout(() => initPublicArticles(), 200);` }}></script>
    </>
  );
}
