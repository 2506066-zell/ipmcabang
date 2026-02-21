const API_BASE = '/api/articles';
let listInitialized = false;
const LOCAL_ARTICLE_FALLBACK = '/ipm%20(2).png';

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeUrl(raw, fallback = '#') {
    const val = String(raw || '').trim();
    if (!val) return fallback;
    if (/^javascript:/i.test(val)) return fallback;
    if (/^data:image\//i.test(val)) return val;
    if (/^data:/i.test(val)) return fallback;
    if (/^(https?:)?\/\//i.test(val) || val.startsWith('/')) return val;
    return fallback;
}

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
    if (listInitialized) return;
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
            const thumbUrl = sanitizeUrl(art.image, LOCAL_ARTICLE_FALLBACK);
            const div = document.createElement('div');
            div.innerHTML = (art.content || '').substring(0, 120) + '...';
            const excerpt = escapeHtml(div.textContent || div.innerText || '');
            const publishDate = new Date(art.publish_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            const safeTitle = escapeHtml(art.title || 'Tanpa Judul');
            const safeCategory = escapeHtml(art.category || 'Umum');
            const safeAuthor = escapeHtml(art.author || 'Admin');
            const safeThumb = escapeHtml(thumbUrl);

            const card = document.createElement('a');
            card.href = `articles.html?id=${art.id}`;
            card.className = 'article-card';
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <div class="card-thumbnail">
                    <img src="${safeThumb}" alt="${safeTitle}" onload="this.classList.add('loaded')" onerror="this.onerror=null;this.src='${LOCAL_ARTICLE_FALLBACK}'">
                    <span class="card-category-badge">${safeCategory}</span>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${safeTitle}</h3>
                    <p class="card-snippet">${excerpt}</p>
                    <div class="card-meta">
                        <div class="author-info">
                            <i class="fas fa-user-circle"></i>
                            <span class="author-name">${safeAuthor}</span>
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
    listInitialized = true;
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
                    <div class="sidebar-item-thumb" style="background-image: url('${escapeHtml(sanitizeUrl(art.image, LOCAL_ARTICLE_FALLBACK))}')"></div>
                    <div class="sidebar-item-info">
                        <h4 class="sidebar-item-title">${escapeHtml(art.title || 'Tanpa Judul')}</h4>
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

    function getRecSkeletonMarkup(count = 3) {
        return Array(count).fill(0).map(() => `
            <div class="rec-skeleton">
                <div class="rec-skeleton-thumb"><div class="shimmer"></div></div>
                <div class="rec-skeleton-body">
                    <div class="rec-skeleton-line"><div class="shimmer"></div></div>
                    <div class="rec-skeleton-line short"><div class="shimmer"></div></div>
                    <div class="rec-skeleton-line tiny"><div class="shimmer"></div></div>
                </div>
            </div>
        `).join('');
    }

    async function loadDetail() {
        try {
            let url = `${API_BASE}?`;
            if (slug) url += `slug=${slug}`;
            else url += `id=${id}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.status === 'success' && data.article) {
                // Sanitize article content before rendering
                data.article.content = sanitizeArticle(data.article.content);
                renderDetail(data.article);
                updateSEO(data.article);
                initScrollProgress();
                initSidebar(); // Show sidebar even in detail mode (for desktop)
                renderRecommendations(data.article);
                setupMoreButton();
            } else {
                container.innerHTML = '<p style="text-align:center; padding:40px;">Artikel tidak ditemukan.</p>';
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p style="text-align:center; padding:40px;">Gagal memuat artikel.</p>';
        }
    }

    function sanitizeArticle(html) {
        if (!html) return "";
        const input = String(html);
        if (typeof DOMParser === 'undefined') {
            return input
                .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
                .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
                .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
                .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
                .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/html');
        const blocked = doc.querySelectorAll('script,style,iframe,object,embed,link,meta,base,form,input,button,textarea,select');
        blocked.forEach(el => el.remove());

        doc.querySelectorAll('*').forEach((el) => {
            [...el.attributes].forEach((attr) => {
                const name = attr.name.toLowerCase();
                const value = String(attr.value || '').trim();
                if (name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                    return;
                }
                if ((name === 'href' || name === 'src')) {
                    if (/^javascript:/i.test(value) || /^data:(?!image\/)/i.test(value)) {
                        el.removeAttribute(attr.name);
                    }
                }
            });
        });

        return doc.body.innerHTML;
    }

    function renderDetail(art) {
        const date = new Date(art.publish_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const safeTitle = escapeHtml(art.title || 'Artikel');
        const safeCategory = escapeHtml(art.category || 'Umum');
        const safeImage = sanitizeUrl(art.image, '');
        const heroImage = safeImage ? `
            <figure class="article-hero">
                <img src="${escapeHtml(safeImage)}" alt="${safeTitle}" class="hero-img" loading="lazy" decoding="async">
            </figure>
        ` : '';
        window.__currentArticle = {
            title: art.title || 'Artikel',
            url: window.location.href
        };

        container.innerHTML = `
            <article class="article-detail fade-in">
                ${heroImage}
                <h1 class="detail-title">${safeTitle}</h1>
                <div class="detail-meta">
                    <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                    <span><i class="fas fa-tag"></i> ${safeCategory}</span>
                </div>
                <div class="article-divider"></div>
                <div class="article-content-body pro-article">
                    ${art.content}
                </div>
                <div class="article-share-section" id="article-share-section">
                    <div class="share-title">Bagikan artikel ini</div>
                    <div class="share-actions" id="share-actions">
                        <button class="share-action-btn minimal" data-share="native">Bagikan</button>
                        <button class="share-action-btn whatsapp" data-share="whatsapp">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </button>
                        <button class="share-action-btn twitter" data-share="twitter">
                            <i class="fab fa-x-twitter"></i> Twitter
                        </button>
                        <button class="share-action-btn copy" data-share="copy">
                            <i class="fas fa-link"></i> Salin Tautan
                        </button>
                    </div>
                </div>
                <section class="article-recommendations">
                    <h2 class="rec-title">Artikel Lainnya Untuk Anda</h2>
                    <div id="article-recommendations" class="rec-grid">
                        ${getRecSkeletonMarkup(3)}
                    </div>
                </section>
                <div class="more-articles-wrap">
                    <button id="more-articles-btn" class="more-articles-btn">Baca Artikel Lainnya</button>
                </div>
                <div id="more-articles-sentinel" class="more-articles-sentinel" aria-hidden="true"></div>
            </article>
        `;

        const heroImg = container.querySelector('.hero-img');
        if (heroImg) {
            if (heroImg.complete) heroImg.classList.add('is-loaded');
            else heroImg.addEventListener('load', () => heroImg.classList.add('is-loaded'), { once: true });
        }
        setupShareButtons();
    }

    function setupShareButtons() {
        const wrap = container.querySelector('#share-actions');
        if (!wrap) return;
        const nativeBtn = wrap.querySelector('[data-share="native"]');
        const waBtn = wrap.querySelector('[data-share="whatsapp"]');
        const twBtn = wrap.querySelector('[data-share="twitter"]');
        const copyBtn = wrap.querySelector('[data-share="copy"]');
        const hasNative = !!navigator.share;

        if (nativeBtn) nativeBtn.style.display = hasNative ? 'inline-flex' : 'none';
        if (waBtn) waBtn.style.display = hasNative ? 'none' : 'inline-flex';
        if (twBtn) twBtn.style.display = hasNative ? 'none' : 'inline-flex';
        if (copyBtn) copyBtn.style.display = 'inline-flex';

        if (nativeBtn) nativeBtn.onclick = () => window.shareArticleNative();
        if (waBtn) waBtn.onclick = () => window.shareArticle('whatsapp');
        if (twBtn) twBtn.onclick = () => window.shareArticle('twitter');
        if (copyBtn) copyBtn.onclick = () => window.shareArticle('copy');
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

    function stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        return (div.textContent || div.innerText || '').trim();
    }

    async function renderRecommendations(current) {
        const wrap = document.getElementById('article-recommendations');
        if (!wrap) return;
        wrap.innerHTML = getRecSkeletonMarkup(3);
        try {
            const res = await fetch(`${API_BASE}?page=1&size=6&sort=newest`);
            const data = await res.json();
            const items = (data.articles || []).filter(a => String(a.id) !== String(current.id)).slice(0, 3);
            if (!items.length) {
                wrap.innerHTML = '<div class="rec-empty">Belum ada rekomendasi untuk saat ini.</div>';
                return;
            }
            wrap.innerHTML = items.map(a => {
                const thumb = sanitizeUrl(a.image, LOCAL_ARTICLE_FALLBACK);
                const snippet = escapeHtml(stripHtml(a.content).slice(0, 120));
                const safeTitle = escapeHtml(a.title || 'Tanpa Judul');
                return `
                    <a class="rec-card" href="articles.html?id=${a.id}">
                        <div class="rec-thumb">
                            <img src="${escapeHtml(thumb)}" alt="${safeTitle}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${LOCAL_ARTICLE_FALLBACK}'">
                        </div>
                        <div class="rec-body">
                            <div class="rec-card-title">${safeTitle}</div>
                            <div class="rec-card-snippet">${snippet}${snippet.length ? '...' : ''}</div>
                        </div>
                    </a>
                `;
            }).join('');
        } catch (e) {
            wrap.innerHTML = '<div class="rec-empty">Gagal memuat rekomendasi.</div>';
        }
    }

    function setupMoreButton() {
        const btn = document.getElementById('more-articles-btn');
        const sentinel = document.getElementById('more-articles-sentinel');
        if (!btn || !sentinel) return;

        const io = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) btn.classList.add('show');
        }, { threshold: 0.1 });
        io.observe(sentinel);

        btn.addEventListener('click', () => {
            const listView = document.getElementById('articles-list-view');
            const detailView = document.getElementById('article-detail-view');
            const sidebar = document.getElementById('articles-sidebar');
            const backBtn = document.getElementById('header-back-btn');
            if (listView && detailView && window.location.pathname.includes('articles.html')) {
                listView.style.display = 'block';
                detailView.style.display = 'none';
                if (backBtn) backBtn.style.display = 'none';
                if (sidebar) sidebar.style.display = 'block';
                window.history.pushState({}, '', 'articles.html');
                initListPage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                window.location.href = 'articles.html';
            }
        });
    }

    loadDetail();
}

function notifyShare(message, type = 'info') {
    if (window.Toast) window.Toast.show(message, type);
    else if (message) alert(message);
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
                notifyShare('Tautan disalin!', 'success');
            }).catch(() => {
                notifyShare('Gagal menyalin tautan.', 'error');
            });
            break;
    }
};

