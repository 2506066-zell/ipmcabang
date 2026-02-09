const API_BASE = '/api/articles';

export function initPublicArticles() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const slug = urlParams.get('slug');

    const listView = document.getElementById('articles-list-view');
    const detailView = document.getElementById('article-detail-view');
    const sidebar = document.getElementById('articles-sidebar');
    const backBtn = document.getElementById('header-back-btn');
    const shareBar = document.getElementById('social-share-bar');
    const progressContainer = document.getElementById('detail-progress-container');

    if (id || slug) {
        // Mode Detail
        if (listView) listView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';
        if (backBtn) backBtn.style.display = 'flex';
        if (shareBar) shareBar.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'block';

        // Hide sidebar on small screens in detail mode
        if (window.innerWidth < 1024 && sidebar) {
            sidebar.style.display = 'none';
        }

        initDetailPage(id, slug);
    } else {
        // Mode List
        if (listView) listView.style.display = 'block';
        if (detailView) detailView.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';
        if (shareBar) shareBar.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';
        if (sidebar) sidebar.style.display = 'block';

        initListPage();
    }
}

// --- List Page Logic ---
function initListPage() {
    const grid = document.getElementById('articles-grid');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const catSelect = document.getElementById('category-select');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const loader = document.getElementById('loading-indicator');

    let state = {
        page: 1,
        limit: 9,
        search: '',
        sort: 'newest',
        category: 'all',
        hasMore: true,
        loading: false
    };

    async function fetchArticles(append = false) {
        if (state.loading) return;
        state.loading = true;

        if (!append) {
            grid.innerHTML = Array(6).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-img"><div class="shimmer"></div></div>
                    <div class="skeleton-text">
                        <div class="skeleton-line title"><div class="shimmer"></div></div>
                        <div class="skeleton-line"><div class="shimmer"></div></div>
                        <div class="skeleton-line"><div class="shimmer"></div></div>
                        <div class="skeleton-line short"><div class="shimmer"></div></div>
                    </div>
                </div>
            `).join('');
        } else {
            loader.style.display = 'block';
        }

        try {
            const params = new URLSearchParams({
                page: state.page,
                size: state.limit,
                sort: state.sort,
                search: state.search,
                category: state.category
            });

            const res = await fetch(`${API_BASE}?${params}`);
            const data = await res.json();

            if (data.status === 'success') {
                renderArticles(data.articles, append);
                state.hasMore = state.page < data.totalPages;
                loadMoreBtn.style.display = state.hasMore ? 'inline-block' : 'none';
            }
        } catch (e) {
            console.error(e);
            if (!append) grid.innerHTML = '<p style="text-align:center">Gagal memuat artikel.</p>';
        } finally {
            state.loading = false;
            loader.style.display = 'none';
        }
    }

    function renderArticles(articles, append) {
        if (!articles.length && !append) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-newspaper"></i></div>
                    <h3>Belum ada artikel</h3>
                    <p>Coba cari dengan kata kunci lain atau pilih kategori berbeda.</p>
                </div>
            `;
            return;
        }

        const cards = articles.map((art, index) => {
            const thumbUrl = art.image || 'https://via.placeholder.com/400x250?text=No+Thumbnail';
            const div = document.createElement('div');
            div.innerHTML = (art.content || '').substring(0, 120) + '...';
            const excerpt = div.textContent || div.innerText || '';
            const publishDate = new Date(art.publish_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

            const card = document.createElement('a');
            card.href = `articles.html?id=${art.id}`;
            card.className = 'article-card';
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <div class="card-thumbnail">
                    <img src="${thumbUrl}" alt="${art.title}" onload="this.classList.add('loaded')">
                    <span class="card-category-badge">${art.category || 'Umum'}</span>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${art.title}</h3>
                    <p class="card-snippet">${excerpt}</p>
                    <div class="card-meta">
                        <div class="author-info">
                            <i class="fas fa-user-circle"></i>
                            <span class="author-name">${art.author}</span>
                        </div>
                        <span class="publish-date">${publishDate}</span>
                    </div>
                </div>
            `;
            return card;
        });

        if (!append) grid.innerHTML = '';
        cards.forEach(card => grid.appendChild(card));
    }

    // Events
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                state.search = e.target.value;
                state.page = 1;
                fetchArticles(false);
            }, 500);
        });
    }

    if (sortSelect) sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        state.page = 1;
        fetchArticles(false);
    });

    if (catSelect) catSelect.addEventListener('change', (e) => {
        state.category = e.target.value;
        state.page = 1;
        fetchArticles(false);
    });

    if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => {
        state.page++;
        fetchArticles(true);
    });

    initSidebar();
    fetchArticles();
}

// --- Sidebar Logic ---
async function initSidebar() {
    const latestList = document.getElementById('latest-articles-list');
    const categoriesList = document.getElementById('categories-list');

    try {
        const res = await fetch(`${API_BASE}?size=5&sort=newest`);
        const data = await res.json();
        if (data.status === 'success' && latestList) {
            latestList.innerHTML = data.articles.map(art => `
                <a href="articles.html?id=${art.id}" class="sidebar-item">
                    <div class="sidebar-item-thumb" style="background-image: url('${art.image || 'https://via.placeholder.com/100'}')"></div>
                    <div class="sidebar-item-info">
                        <h4 class="sidebar-item-title">${art.title}</h4>
                        <span class="sidebar-item-date">${new Date(art.publish_date).toLocaleDateString('id-ID')}</span>
                    </div>
                </a>
            `).join('');
        }
    } catch (e) {
        console.error('Failed to load latest articles sidebar', e);
    }

    if (categoriesList) {
        const categories = ['Umum', 'Kader', 'Opini', 'Berita', 'Program Kerja'];
        categoriesList.innerHTML = categories.map(cat => `
            <button class="tag-btn" onclick="const s = document.getElementById('category-select'); if(s) { s.value='${cat}'; s.dispatchEvent(new Event('change')); window.scrollTo({top:0, behavior:'smooth'}); }">${cat}</button>
        `).join('');
    }
}

// --- Detail Page Logic ---
function initDetailPage(id, slug) {
    const container = document.getElementById('article-detail-content');
    const scrollBar = document.getElementById('detail-scroll-bar');
    const detailView = document.getElementById('article-detail-view');

    function ensureActionBar() {
        if (!detailView) return;
        let bar = document.getElementById('article-action-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'article-action-bar';
            bar.className = 'article-action-bar';
            bar.innerHTML = `
                <button class="action-btn action-share" id="action-share-btn">
                    <i class="fas fa-share-alt"></i> Bagikan
                </button>
                <button class="action-btn action-save" id="action-save-btn">
                    <i class="fas fa-link"></i> Simpan
                </button>
            `;
            document.body.appendChild(bar);
        }

        const shareBtn = bar.querySelector('#action-share-btn');
        const saveBtn = bar.querySelector('#action-save-btn');

        if (shareBtn) {
            shareBtn.onclick = () => {
                if (window.shareArticleNative) window.shareArticleNative();
                else if (window.shareArticle) window.shareArticle('copy');
            };
        }
        if (saveBtn) {
            saveBtn.onclick = () => {
                if (window.shareArticle) window.shareArticle('copy');
            };
        }
    }

    function ensureBackToTop() {
        let btn = document.getElementById('article-back-top');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'article-back-top';
            btn.className = 'article-back-top';
            btn.type = 'button';
            btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            document.body.appendChild(btn);
        }
        btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) btn.classList.add('visible');
            else btn.classList.remove('visible');
        }, { passive: true });
    }

    async function loadDetail() {
        try {
            let url = `${API_BASE}?`;
            if (slug) url += `slug=${slug}`;
            else url += `id=${id}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.status === 'success' && data.article) {
                renderDetail(data.article);
                updateSEO(data.article);
                initScrollProgress();
                initSidebar(); // Show sidebar even in detail mode (for desktop)
            } else {
                container.innerHTML = '<p style="text-align:center; padding:40px;">Artikel tidak ditemukan.</p>';
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p style="text-align:center; padding:40px;">Gagal memuat artikel.</p>';
        }
    }

    function renderDetail(art) {
        const date = new Date(art.publish_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const heroImage = art.image ? `<img src="${art.image}" alt="${art.title}" class="detail-hero-img">` : '';
        window.__currentArticle = {
            title: art.title || 'Artikel',
            url: window.location.href
        };

        // Simple Markdown Parser
        let content = art.content
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
            .replace(/\*(.*)\*/gim, '<i>$1</i>')
            .replace(/\n\n/g, '<br><br>');

        container.innerHTML = `
            <article class="article-detail fade-in">
                <div class="article-detail-header">
                    <span class="detail-badge">${art.category || 'Umum'}</span>
                    <h1 class="detail-title">${art.title}</h1>
                    <div class="detail-meta">
                        <span><i class="fas fa-user-circle"></i> ${art.author}</span>
                        <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                        <span><i class="fas fa-eye"></i> ${art.views || 0} views</span>
                    </div>
                </div>
                ${heroImage}
                <div class="article-content-body">
                    ${content}
                </div>
                <div class="article-share-section" id="article-share-section">
                    <div class="share-title">Bagikan artikel ini</div>
                    <div class="share-actions">
                        <button class="share-action-btn whatsapp" onclick="window.shareArticle('whatsapp')">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </button>
                        <button class="share-action-btn twitter" onclick="window.shareArticle('twitter')">
                            <i class="fab fa-x-twitter"></i> Twitter
                        </button>
                        <button class="share-action-btn copy" onclick="window.shareArticle('copy')">
                            <i class="fas fa-link"></i> Salin Tautan
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    function initScrollProgress() {
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            if (scrollBar) scrollBar.style.width = scrolled + "%";
        });
    }

    function updateSEO(art) {
        document.title = `${art.title} - IPM Panawuan`;
        // ... (SEO implementation same as before)
    }

    loadDetail();
    ensureActionBar();
    ensureBackToTop();
}

window.shareArticleNative = function () {
    const data = window.__currentArticle || {};
    if (navigator.share) {
        navigator.share({
            title: data.title || document.title,
            text: data.title || document.title,
            url: data.url || window.location.href
        }).catch(() => {
            if (window.shareArticle) window.shareArticle('copy');
        });
        return;
    }
    if (window.shareArticle) window.shareArticle('copy');
};

window.shareArticle = function (platform) {
    const url = window.location.href;
    const title = document.title;
    const text = encodeURIComponent(`Baca artikel menarik ini: ${title}\n\n`);

    switch (platform) {
        case 'whatsapp': window.open(`https://wa.me/?text=${text}${encodeURIComponent(url)}`, '_blank'); break;
        case 'twitter': window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank'); break;
        case 'copy':
            navigator.clipboard.writeText(url).then(() => {
                if (window.Toast) window.Toast.show('Tautan disalin!', 'success');
                else alert('Tautan disalin!');
            });
            break;
    }
};
