const API_BASE = '/api/articles';
const LOCAL_ARTICLE_FALLBACK = '/ipm%20(2).png';
const LIST_SCROLL_KEY = 'ipm_articles_list_scroll';
const LIST_FOCUS_KEY = 'ipm_articles_list_focus';
const JSONLD_ID = 'article-jsonld';

let listInitialized = false;
let detailCleanupFns = [];
let activeRefs = null;
let resizeHandlerBound = false;
let currentMode = 'list';

function getSharedRenderer() {
    return window.ArticleRenderer || null;
}

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

function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
}

function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.textContent || div.innerText || '').trim();
}

function slugifyText(text) {
    return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function toAbsoluteUrl(raw) {
    try {
        return new URL(raw, window.location.origin).toString();
    } catch {
        return new URL(LOCAL_ARTICLE_FALLBACK, window.location.origin).toString();
    }
}

function getArticlePath(article) {
    const slug = String(article?.slug || '').trim();
    if (slug) return `/articles/${encodeURIComponent(slug)}`;
    return `/articles?id=${encodeURIComponent(article?.id || '')}`;
}

function getArticleUrl(article) {
    return toAbsoluteUrl(getArticlePath(article));
}

function getExcerptFromContent(content, maxChars = 180, fallback = '') {
    const plain = stripHtml(content || fallback || '');
    if (!plain) return '';
    if (plain.length <= maxChars) return plain;
    return `${plain.slice(0, maxChars).trim()}...`;
}

function estimateReadMinutes(content) {
    const renderer = getSharedRenderer();
    if (renderer && typeof renderer.estimateReadMinutes === 'function') {
        return renderer.estimateReadMinutes(content);
    }
    const plain = stripHtml(content);
    const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
    return Math.max(1, Math.ceil(words / 200));
}

function formatDate(input, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
    const d = new Date(input || Date.now());
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', opts);
}

function toIsoDate(input) {
    const d = new Date(input || Date.now());
    if (Number.isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
}

function collectRefs() {
    return {
        listView: document.getElementById('articles-list-view'),
        detailView: document.getElementById('article-detail-view'),
        detailContent: document.getElementById('article-detail-content'),
        legacyDetailContent: document.getElementById('article-detail-container'),
        sidebar: document.getElementById('articles-sidebar'),
        backBtn: document.getElementById('header-back-btn'),
        shareBar: document.getElementById('social-share-bar'),
        progressContainer: document.getElementById('detail-progress-container'),
        scrollBar: document.getElementById('detail-scroll-bar'),
        grid: document.getElementById('articles-grid')
    };
}

function addDetailCleanup(fn) {
    if (typeof fn === 'function') detailCleanupFns.push(fn);
}

function cleanupDetailLifecycle() {
    while (detailCleanupFns.length) {
        const fn = detailCleanupFns.pop();
        try {
            fn();
        } catch (e) {
            console.warn('[Article Detail Cleanup] Failed', e);
        }
    }
}

function syncSidebarVisibility() {
    if (!activeRefs?.sidebar) return;
    if (currentMode === 'detail' && window.innerWidth < 1024) {
        activeRefs.sidebar.style.display = 'none';
        return;
    }
    activeRefs.sidebar.style.display = 'block';
}

function setMode(mode) {
    currentMode = mode === 'detail' ? 'detail' : 'list';
    const refs = activeRefs;
    if (!refs) return;

    const isDetail = currentMode === 'detail';
    if (refs.listView) refs.listView.style.display = isDetail ? 'none' : 'block';
    if (refs.detailView) refs.detailView.style.display = isDetail ? 'block' : 'none';
    if (refs.backBtn) refs.backBtn.style.display = isDetail ? 'flex' : 'none';
    if (refs.shareBar) refs.shareBar.style.display = 'none';
    if (refs.progressContainer) refs.progressContainer.style.display = isDetail ? 'block' : 'none';

    document.body.classList.toggle('reading-mode', isDetail);
    syncSidebarVisibility();
}

function rememberListState(focusId = '') {
    try {
        sessionStorage.setItem(LIST_SCROLL_KEY, String(window.scrollY || window.pageYOffset || 0));
        if (focusId) sessionStorage.setItem(LIST_FOCUS_KEY, focusId);
    } catch {
        // ignore storage errors in private mode
    }
}

function shouldRestoreListState() {
    try {
        const nav = performance.getEntriesByType('navigation')[0];
        const isBackForward = nav && nav.type === 'back_forward';
        const hasSavedState = sessionStorage.getItem(LIST_SCROLL_KEY) || sessionStorage.getItem(LIST_FOCUS_KEY);
        const referrer = document.referrer || '';
        const fromDetail = /\/articles(\.html)?(\/|\?|$)/.test(referrer) && (referrer.includes('?') || /\/articles\/[^/?#]+/.test(referrer));
        return Boolean(hasSavedState) && (isBackForward || fromDetail);
    } catch {
        return false;
    }
}

function restoreListStateIfAvailable(grid) {
    if (!grid || !shouldRestoreListState()) return;
    let savedScroll = 0;
    let savedFocusId = '';
    try {
        savedScroll = Number(sessionStorage.getItem(LIST_SCROLL_KEY) || 0);
        savedFocusId = sessionStorage.getItem(LIST_FOCUS_KEY) || '';
        sessionStorage.removeItem(LIST_SCROLL_KEY);
        sessionStorage.removeItem(LIST_FOCUS_KEY);
    } catch {
        return;
    }

    requestAnimationFrame(() => {
        if (savedScroll > 0) window.scrollTo({ top: savedScroll, behavior: 'auto' });
        if (!savedFocusId) return;
        const focusEl = document.getElementById(savedFocusId);
        if (focusEl) focusEl.focus({ preventScroll: true });
    });
}

export function initPublicArticles() {
    activeRefs = collectRefs();
    const route = getDetailRouteParams();
    const id = route.id;
    const slug = route.slug;
    const detailHost = activeRefs.detailContent || activeRefs.legacyDetailContent;

    if (!resizeHandlerBound) {
        resizeHandlerBound = true;
        window.addEventListener('resize', syncSidebarVisibility, { passive: true });
        window.addEventListener('pagehide', cleanupDetailLifecycle);
    }

    if (activeRefs.backBtn && !activeRefs.backBtn.dataset.bound) {
        activeRefs.backBtn.dataset.bound = 'true';
        activeRefs.backBtn.setAttribute('href', '/articles');
        activeRefs.backBtn.addEventListener('click', () => cleanupDetailLifecycle());
    }

    if ((id || slug) && detailHost) {
        setMode('detail');
        initDetailPage(id, slug);
        return;
    }

    if (activeRefs.listView || activeRefs.detailView) {
        cleanupDetailLifecycle();
        setMode('list');
        initListPage();
        return;
    }

    if (detailHost) {
        setMode('detail');
        initDetailPage(id, slug);
    }
}

function getDetailRouteParams() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const byQuery = params.get('slug');
    if (id || byQuery) return { id, slug: byQuery };
    const match = String(window.location.pathname || '').match(/^\/articles\/([^/?#]+)/i);
    if (!match || !match[1]) return { id: '', slug: '' };
    try {
        return { id: '', slug: decodeURIComponent(match[1]) };
    } catch {
        return { id: '', slug: match[1] };
    }
}

function initListPage() {
    const grid = document.getElementById('articles-grid');
    if (!grid) return;

    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const catSelect = document.getElementById('category-select');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const loader = document.getElementById('loading-indicator');

    if (listInitialized) {
        initSidebar();
        return;
    }

    const state = {
        page: 1,
        limit: 9,
        search: '',
        sort: 'newest',
        category: 'all',
        hasMore: true,
        loading: false,
        restored: false
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
        } else if (loader) {
            loader.style.display = 'block';
        }

        try {
            const params = new URLSearchParams({
                page: String(state.page),
                size: String(state.limit),
                sort: state.sort,
                search: state.search,
                category: state.category
            });
            const res = await fetch(`${API_BASE}?${params}`);
            const data = await res.json();

            if (data.status === 'success') {
                renderArticles(data.articles || [], append);
                state.hasMore = state.page < Number(data.totalPages || 0);
                if (loadMoreBtn) loadMoreBtn.style.display = state.hasMore ? 'inline-flex' : 'none';
                if (!state.restored && !append) {
                    state.restored = true;
                    restoreListStateIfAvailable(grid);
                }
            } else if (!append) {
                grid.innerHTML = '<p style="text-align:center">Gagal memuat artikel.</p>';
            }
        } catch (e) {
            console.error(e);
            if (!append) grid.innerHTML = '<p style="text-align:center">Gagal memuat artikel.</p>';
        } finally {
            state.loading = false;
            if (loader) loader.style.display = 'none';
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
            const excerpt = escapeHtml(getExcerptFromContent(art.content, 120));
            const publishDate = formatDate(art.publish_date);
            const safeTitle = escapeHtml(art.title || 'Tanpa Judul');
            const safeCategory = escapeHtml(art.category || 'Umum');
            const safeAuthor = escapeHtml(art.author || 'Admin');
            const safeThumb = escapeHtml(thumbUrl);
            const href = getArticlePath(art);
            const cardId = `article-card-${escapeHtml(String(art.id || index))}`;

            const card = document.createElement('a');
            card.href = href;
            card.className = 'article-card';
            card.id = cardId;
            card.style.animationDelay = `${index * 0.08}s`;
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
        cards.forEach((card) => grid.appendChild(card));
    }

    let debounceTimer = null;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                state.search = e.target.value || '';
                state.page = 1;
                fetchArticles(false);
            }, 350);
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.sort = e.target.value;
            state.page = 1;
            fetchArticles(false);
        });
    }

    if (catSelect) {
        catSelect.addEventListener('change', (e) => {
            state.category = e.target.value;
            state.page = 1;
            fetchArticles(false);
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            state.page += 1;
            fetchArticles(true);
        });
    }

    grid.addEventListener('click', (event) => {
        const card = event.target.closest('a.article-card');
        if (!card) return;
        rememberListState(card.id);
    });

    initSidebar();
    fetchArticles(false);
    listInitialized = true;
}

async function initSidebar() {
    const latestList = document.getElementById('latest-articles-list');
    const categoriesList = document.getElementById('categories-list');

    try {
        const res = await fetch(`${API_BASE}?size=5&sort=newest`);
        const data = await res.json();
        if (data.status === 'success' && latestList) {
            latestList.innerHTML = (data.articles || []).map((art) => `
                <a href="${getArticlePath(art)}" class="sidebar-item">
                    <div class="sidebar-item-thumb" style="background-image: url('${escapeHtml(sanitizeUrl(art.image, LOCAL_ARTICLE_FALLBACK))}')"></div>
                    <div class="sidebar-item-info">
                        <h4 class="sidebar-item-title">${escapeHtml(art.title || 'Tanpa Judul')}</h4>
                        <span class="sidebar-item-date">${formatDate(art.publish_date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                </a>
            `).join('');
        }
    } catch (e) {
        console.error('Failed to load latest articles sidebar', e);
    }

    if (categoriesList) {
        const categories = ['Umum', 'Kader', 'Opini', 'Berita', 'Program Kerja'];
        categoriesList.innerHTML = categories.map((cat) => `
            <button class="tag-btn" onclick="const s = document.getElementById('category-select'); if (s) { s.value='${cat}'; s.dispatchEvent(new Event('change')); window.scrollTo({ top: 0, behavior: 'smooth' }); }">${cat}</button>
        `).join('');
    }
}

function initDetailPage(id, slug) {
    cleanupDetailLifecycle();
    const container = document.getElementById('article-detail-content') || document.getElementById('article-detail-container');
    if (!container) return;

    if (!id && !slug) {
        container.innerHTML = `
            <p style="text-align:center; padding:40px;">
                Artikel tidak ditemukan.
                <br><br>
                <a href="/articles" class="more-articles-btn no-transition">Kembali ke daftar artikel</a>
            </p>
        `;
        return;
    }

    container.innerHTML = `
        <article class="article-detail fade-in">
            <div class="rec-skeleton">
                <div class="rec-skeleton-thumb"><div class="shimmer"></div></div>
                <div class="rec-skeleton-body">
                    <div class="rec-skeleton-line"><div class="shimmer"></div></div>
                    <div class="rec-skeleton-line short"><div class="shimmer"></div></div>
                    <div class="rec-skeleton-line tiny"><div class="shimmer"></div></div>
                </div>
            </div>
        </article>
    `;

    const query = new URLSearchParams();
    if (slug) query.set('slug', slug);
    else query.set('id', id);

    fetch(`${API_BASE}?${query.toString()}`)
        .then(async (res) => {
            const data = await res.json();
            if (data.status !== 'success' || !data.article) throw new Error('ARTICLE_NOT_FOUND');
            return data.article;
        })
        .then((article) => {
            article.content = sanitizeArticle(article.content);
            syncPreferredArticleUrl(article);
            renderDetail(container, article);
            updateSEO(article);
            initSidebar();
            renderRecommendations(article);
            setupDetailLifecycle(container, article);
        })
        .catch((err) => {
            console.error(err);
            container.innerHTML = '<p style="text-align:center; padding:40px;">Gagal memuat artikel.</p>';
        });
}

function sanitizeArticle(html) {
    const renderer = getSharedRenderer();
    if (renderer && typeof renderer.sanitizeArticleHTML === 'function') {
        return renderer.sanitizeArticleHTML(html, { removeHeadingOne: true });
    }

    if (!html) return '';
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
    blocked.forEach((el) => el.remove());

    doc.querySelectorAll('*').forEach((el) => {
        [...el.attributes].forEach((attr) => {
            const name = attr.name.toLowerCase();
            const value = String(attr.value || '').trim();
            if (name.startsWith('on')) {
                el.removeAttribute(attr.name);
                return;
            }
            if ((name === 'href' || name === 'src') && (/^javascript:/i.test(value) || /^data:(?!image\/)/i.test(value))) {
                el.removeAttribute(attr.name);
            }
        });
    });
    return doc.body.innerHTML;
}

function syncPreferredArticleUrl(article) {
    if (!article) return;
    const preferredPath = getArticlePath(article);
    const preferred = new URL(preferredPath, window.location.origin);
    const current = new URL(window.location.href);
    if (preferred.pathname === current.pathname && preferred.search === current.search) return;
    window.history.replaceState(window.history.state || {}, '', preferred.toString());
}

function buildDetailDek(article) {
    const provided = String(article?.summary || article?.excerpt || '').trim();
    if (provided) return provided;
    return getExcerptFromContent(article?.content, 210);
}

function renderDetail(container, article) {
    const articleUrl = getArticleUrl(article);
    const renderer = getSharedRenderer();
    let detailHtml = '';

    if (renderer && typeof renderer.buildArticleViewModel === 'function' && typeof renderer.renderArticleDetailHTML === 'function') {
        const vm = renderer.buildArticleViewModel({ ...article, content: article.content }, { url: articleUrl });
        const core = renderer.renderArticleDetailHTML(vm, {
            includeBackLink: true,
            backHref: '/articles',
            showReadingTools: true,
            showToc: true,
            idPrefix: '',
            articleClassName: 'article-detail fade-in'
        });
        const recommendationSection = `
            <section class="article-recommendations" aria-labelledby="rec-title">
                <h2 class="rec-title" id="rec-title">Bacaan Berikutnya</h2>
                <div id="article-recommendations" class="rec-grid">
                    ${getRecommendationSkeletonMarkup(3)}
                </div>
            </section>

            <div class="more-articles-wrap">
                <a href="/articles" id="more-articles-btn" class="more-articles-btn no-transition" aria-label="Kembali ke daftar artikel">Kembali ke daftar artikel</a>
            </div>
        `;
        detailHtml = core.replace('</article>', `${recommendationSection}</article>`);
    } else {
        const safeTitle = escapeHtml(article.title || 'Artikel');
        const safeCategory = escapeHtml(article.category || 'Umum');
        const safeAuthor = escapeHtml(article.author || 'Redaksi IPM Panawuan');
        const dek = escapeHtml(buildDetailDek(article));
        const publishedLong = formatDate(article.publish_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const publishedShort = formatDate(article.publish_date, { day: 'numeric', month: 'short', year: 'numeric' });
        const readMinutes = estimateReadMinutes(article.content);
        const safeImage = sanitizeUrl(article.image, '');
        const heroImage = safeImage ? `
            <figure class="article-hero">
                <img src="${escapeHtml(safeImage)}" alt="${safeTitle}" class="hero-img" loading="lazy" decoding="async">
            </figure>
        ` : '';
        detailHtml = `
            <article class="article-detail fade-in" aria-labelledby="article-headline">
                <header class="reading-hero">
                    <a href="/articles" class="reading-back-link no-transition" id="reading-back-link" aria-label="Kembali ke daftar artikel">
                        <i class="fas fa-arrow-left"></i>
                        <span>Kembali ke daftar</span>
                    </a>
                    <p class="reading-kicker">${safeCategory}</p>
                    <h1 id="article-headline" class="detail-title" tabindex="-1">${safeTitle}</h1>
                    ${dek ? `<p class="detail-dek">${dek}</p>` : ''}
                    <div class="reading-byline" role="list" aria-label="Informasi artikel">
                        <span class="byline-item" role="listitem"><i class="fas fa-user-edit" aria-hidden="true"></i>${safeAuthor}</span>
                        <span class="byline-item" role="listitem"><i class="fas fa-calendar-alt" aria-hidden="true"></i><time datetime="${escapeHtml(toIsoDate(article.publish_date))}">${publishedLong}</time></span>
                        <span class="byline-item" role="listitem"><i class="fas fa-clock" aria-hidden="true"></i>${readMinutes} menit baca</span>
                    </div>
                    ${heroImage}
                    <div class="reading-summary-meta">
                        <span>${publishedShort}</span>
                        <span>${readMinutes} menit</span>
                    </div>
                </header>
                <section class="reading-tools" id="reading-tools" role="region" aria-label="Alat bantu membaca">
                    <div class="reading-tools-status">
                        <span id="reading-progress-label" aria-live="polite">0% dibaca</span>
                        <span id="reading-remaining-label" aria-live="polite">Sisa ${readMinutes} menit</span>
                    </div>
                    <div class="reading-tools-actions">
                        <button type="button" class="reading-tool-btn primary" data-share="native" aria-label="Bagikan artikel">Bagikan</button>
                        <button type="button" class="reading-tool-btn" data-share="copy" aria-label="Salin tautan artikel">Salin link</button>
                        <button type="button" class="reading-tool-btn" data-share="whatsapp" aria-label="Bagikan ke WhatsApp">WhatsApp</button>
                    </div>
                </section>
                <nav class="article-toc" id="article-toc" aria-label="Daftar isi artikel" hidden></nav>
                <div class="article-divider"></div>
                <div class="article-content-body pro-article" id="article-content-body">
                    ${article.content}
                </div>
                <section class="article-recommendations" aria-labelledby="rec-title">
                    <h2 class="rec-title" id="rec-title">Bacaan Berikutnya</h2>
                    <div id="article-recommendations" class="rec-grid">
                        ${getRecommendationSkeletonMarkup(3)}
                    </div>
                </section>
                <div class="more-articles-wrap">
                    <a href="/articles" id="more-articles-btn" class="more-articles-btn no-transition" aria-label="Kembali ke daftar artikel">Kembali ke daftar artikel</a>
                </div>
            </article>
        `;
    }

    container.innerHTML = detailHtml;
    window.__currentArticle = {
        title: article.title || 'Artikel',
        url: articleUrl
    };

    const heroImg = container.querySelector('.hero-img');
    if (heroImg) {
        if (heroImg.complete) heroImg.classList.add('is-loaded');
        else heroImg.addEventListener('load', () => heroImg.classList.add('is-loaded'), { once: true });
    }
}

function setupDetailLifecycle(container, article) {
    setupShareButtons(container);
    setupBackToListActions(container);
    setupReadingTOC(container);
    setupReadingProgress(container, article);
    focusHeadline(container);
}

function setupBackToListActions(container) {
    const backLink = container.querySelector('#reading-back-link');
    const moreLink = container.querySelector('#more-articles-btn');
    const onLeave = () => cleanupDetailLifecycle();
    if (backLink) {
        backLink.addEventListener('click', onLeave);
        addDetailCleanup(() => backLink.removeEventListener('click', onLeave));
    }
    if (moreLink) {
        moreLink.addEventListener('click', onLeave);
        addDetailCleanup(() => moreLink.removeEventListener('click', onLeave));
    }
}

function focusHeadline(container) {
    const heading = container.querySelector('#article-headline');
    if (!heading) return;
    requestAnimationFrame(() => heading.focus({ preventScroll: true }));
}

function setupShareButtons(container) {
    const nativeBtn = container.querySelector('[data-share="native"]');
    const copyBtn = container.querySelector('[data-share="copy"]');
    const waBtn = container.querySelector('[data-share="whatsapp"]');
    const hasNative = typeof navigator.share === 'function';

    if (nativeBtn) nativeBtn.style.display = hasNative ? 'inline-flex' : 'none';
    if (waBtn) waBtn.style.display = hasNative ? 'none' : 'inline-flex';

    const onNative = () => window.shareArticleNative();
    const onCopy = () => window.shareArticle('copy');
    const onWhatsApp = () => window.shareArticle('whatsapp');

    if (nativeBtn) {
        nativeBtn.addEventListener('click', onNative);
        addDetailCleanup(() => nativeBtn.removeEventListener('click', onNative));
    }
    if (copyBtn) {
        copyBtn.addEventListener('click', onCopy);
        addDetailCleanup(() => copyBtn.removeEventListener('click', onCopy));
    }
    if (waBtn) {
        waBtn.addEventListener('click', onWhatsApp);
        addDetailCleanup(() => waBtn.removeEventListener('click', onWhatsApp));
    }
}

function setupReadingTOC(container) {
    const tocWrap = container.querySelector('#article-toc');
    const content = container.querySelector('#article-content-body');
    if (!tocWrap || !content) return;

    const headings = [...content.querySelectorAll('h2, h3')].filter((el) => stripHtml(el.textContent).length > 0);
    if (headings.length < 2) {
        tocWrap.hidden = true;
        return;
    }

    const usedIds = new Set();
    headings.forEach((heading, index) => {
        const sourceText = stripHtml(heading.textContent) || `Bagian ${index + 1}`;
        let generated = slugifyText(sourceText) || `bagian-${index + 1}`;
        while (usedIds.has(generated) || document.getElementById(generated)) {
            generated = `${generated}-${index + 1}`;
        }
        heading.id = generated;
        usedIds.add(generated);
    });

    const tocItems = headings.map((heading) => {
        const label = escapeHtml(stripHtml(heading.textContent));
        const level = heading.tagName.toLowerCase();
        return `<li class="toc-item ${level === 'h3' ? 'is-sub' : ''}">
            <a class="toc-link" href="#${escapeHtml(heading.id)}">${label}</a>
        </li>`;
    }).join('');

    tocWrap.innerHTML = `
        <div class="toc-title">Daftar Isi</div>
        <ol class="toc-list">${tocItems}</ol>
    `;
    tocWrap.hidden = false;

    const clickHandler = (event) => {
        const link = event.target.closest('a.toc-link');
        if (!link) return;
        const hash = link.getAttribute('href');
        if (!hash || !hash.startsWith('#')) return;
        const target = container.querySelector(hash);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    };
    tocWrap.addEventListener('click', clickHandler);
    addDetailCleanup(() => tocWrap.removeEventListener('click', clickHandler));

    const tocLinks = [...tocWrap.querySelectorAll('.toc-link')];
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        let activeId = '';
        entries.forEach((entry) => {
            if (entry.isIntersecting) activeId = entry.target.id;
        });
        if (!activeId) return;
        tocLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`));
    }, { root: null, threshold: 0.2, rootMargin: '-20% 0px -65% 0px' });

    headings.forEach((heading) => observer.observe(heading));
    addDetailCleanup(() => observer.disconnect());
}

function setupReadingProgress(container, article) {
    const content = container.querySelector('#article-content-body');
    if (!content) return;

    const progressLabel = container.querySelector('#reading-progress-label');
    const remainingLabel = container.querySelector('#reading-remaining-label');
    const progressBar = document.getElementById('detail-scroll-bar');
    const totalMinutes = estimateReadMinutes(article?.content);
    let rafId = 0;
    let lastAnnouncedProgress = -1;

    const updateProgress = () => {
        const rect = content.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        const start = scrollTop + rect.top - 120;
        const end = start + Math.max(rect.height - window.innerHeight * 0.55, 1);
        const progress = clamp((scrollTop - start) / (end - start), 0, 1);
        const progressPct = Math.round(progress * 100);
        const remainingMinutes = Math.max(0, Math.ceil(totalMinutes * (1 - progress)));

        if (progressBar) progressBar.style.width = `${progressPct}%`;
        if (progressLabel && Math.abs(progressPct - lastAnnouncedProgress) >= 2) {
            progressLabel.textContent = `${progressPct}% dibaca`;
            lastAnnouncedProgress = progressPct;
        }
        if (remainingLabel) {
            remainingLabel.textContent = remainingMinutes > 0 ? `Sisa ${remainingMinutes} menit` : 'Selesai dibaca';
        }
    };

    const onScroll = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            updateProgress();
        });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    addDetailCleanup(() => window.removeEventListener('scroll', onScroll));
    addDetailCleanup(() => window.removeEventListener('resize', onScroll));
    addDetailCleanup(() => {
        if (rafId) cancelAnimationFrame(rafId);
    });
    updateProgress();
}

function getRecommendationSkeletonMarkup(count = 3) {
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

async function renderRecommendations(current) {
    const wrap = document.getElementById('article-recommendations');
    if (!wrap) return;
    wrap.innerHTML = getRecommendationSkeletonMarkup(3);

    try {
        const res = await fetch(`${API_BASE}?page=1&size=6&sort=newest`);
        const data = await res.json();
        const items = (data.articles || []).filter((a) => String(a.id) !== String(current.id)).slice(0, 3);
        if (!items.length) {
            wrap.innerHTML = '<div class="rec-empty">Belum ada rekomendasi untuk saat ini.</div>';
            return;
        }
        wrap.innerHTML = items.map((a) => {
            const thumb = sanitizeUrl(a.image, LOCAL_ARTICLE_FALLBACK);
            const safeTitle = escapeHtml(a.title || 'Tanpa Judul');
            const snippet = escapeHtml(getExcerptFromContent(a.content, 100));
            return `
                <a class="rec-card no-transition" href="${getArticlePath(a)}">
                    <div class="rec-thumb">
                        <img src="${escapeHtml(thumb)}" alt="${safeTitle}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${LOCAL_ARTICLE_FALLBACK}'">
                    </div>
                    <div class="rec-body">
                        <div class="rec-card-title">${safeTitle}</div>
                        <div class="rec-card-snippet">${snippet}</div>
                    </div>
                </a>
            `;
        }).join('');
    } catch (e) {
        wrap.innerHTML = '<div class="rec-empty">Gagal memuat rekomendasi.</div>';
    }
}

function setMetaByName(name, content) {
    if (!name) return;
    let el = document.head.querySelector(`meta[name="${name}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content || '');
}

function setMetaByProperty(property, content) {
    if (!property) return;
    let el = document.head.querySelector(`meta[property="${property}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content || '');
}

function setCanonical(url) {
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
}

function updateJSONLD(article, canonicalUrl, description, imageUrl) {
    let script = document.getElementById(JSONLD_ID);
    if (!script) {
        script = document.createElement('script');
        script.id = JSONLD_ID;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }

    const published = new Date(article?.publish_date || Date.now());
    const modified = new Date(article?.updated_at || article?.publish_date || Date.now());
    const payload = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article?.title || 'Artikel Organisasi',
        description,
        image: imageUrl ? [imageUrl] : undefined,
        author: {
            '@type': 'Person',
            name: article?.author || 'Redaksi IPM Panawuan'
        },
        datePublished: Number.isNaN(published.getTime()) ? undefined : published.toISOString(),
        dateModified: Number.isNaN(modified.getTime()) ? undefined : modified.toISOString(),
        mainEntityOfPage: canonicalUrl,
        publisher: {
            '@type': 'Organization',
            name: 'PC IPM Panawuan',
            logo: {
                '@type': 'ImageObject',
                url: toAbsoluteUrl(LOCAL_ARTICLE_FALLBACK)
            }
        }
    };

    Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
    });

    script.textContent = JSON.stringify(payload);
}

function updateSEO(article) {
    if (!article) return;
    const siteLabel = 'PC IPM Panawuan';
    const canonicalUrl = getArticleUrl(article);
    const title = `${article.title || 'Artikel Organisasi'} - ${siteLabel}`;
    const description = getExcerptFromContent(article.content, 170, article.summary || article.excerpt || '');
    const safeImage = sanitizeUrl(article.image, LOCAL_ARTICLE_FALLBACK);
    const imageUrl = toAbsoluteUrl(safeImage);

    document.title = title;
    setMetaByName('description', description);
    setMetaByProperty('og:type', 'article');
    setMetaByProperty('og:title', title);
    setMetaByProperty('og:description', description);
    setMetaByProperty('og:image', imageUrl);
    setMetaByProperty('og:url', canonicalUrl);
    setMetaByProperty('article:published_time', toIsoDate(article.publish_date));
    setMetaByName('twitter:card', 'summary_large_image');
    setMetaByName('twitter:title', title);
    setMetaByName('twitter:description', description);
    setMetaByName('twitter:image', imageUrl);
    setCanonical(canonicalUrl);
    updateJSONLD(article, canonicalUrl, description, imageUrl);
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
    const data = window.__currentArticle || {};
    const url = data.url || window.location.href;
    const title = data.title || document.title;
    const text = encodeURIComponent(`Baca artikel ini: ${title}\n\n`);

    switch (platform) {
        case 'whatsapp':
            window.open(`https://wa.me/?text=${text}${encodeURIComponent(url)}`, '_blank', 'noopener');
            break;
        case 'twitter':
            window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank', 'noopener');
            break;
        case 'copy':
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url)
                    .then(() => notifyShare('Tautan artikel disalin.', 'success'))
                    .catch(() => notifyShare('Gagal menyalin tautan.', 'error'));
                break;
            }
            try {
                const temp = document.createElement('textarea');
                temp.value = url;
                temp.setAttribute('readonly', 'readonly');
                temp.style.position = 'fixed';
                temp.style.left = '-9999px';
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
                notifyShare('Tautan artikel disalin.', 'success');
            } catch {
                notifyShare('Gagal menyalin tautan.', 'error');
            }
            break;
        default:
            break;
    }
};
