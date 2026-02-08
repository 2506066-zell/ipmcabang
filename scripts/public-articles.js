
const API_BASE = '/api/articles';

export function initPublicArticles() {
    // Determine if List or Detail page
    if (document.body.classList.contains('page-articles')) {
        initListPage();
    } else if (document.body.classList.contains('page-article-detail')) {
        initDetailPage();
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
        loader.style.display = 'block';

        if (!append) grid.innerHTML = '';

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

        const html = articles.map(art => {
            const thumbUrl = art.image || 'https://via.placeholder.com/400x250?text=No+Thumbnail';

            // Create excerpt
            const div = document.createElement('div');
            div.innerHTML = (art.content || '').substring(0, 120) + '...';
            const excerpt = div.textContent || div.innerText || '';
            const publishDate = new Date(art.publish_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

            return `
            <a href="article.html?slug=${art.slug || ''}&id=${art.id}" class="article-card">
                <div class="card-thumbnail" style="background-image: url('${thumbUrl}')">
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
            </a>
            `;
        }).join('');

        if (append) {
            grid.insertAdjacentHTML('beforeend', html);
        } else {
            grid.innerHTML = html;
        }
    }

    // Events
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            state.search = e.target.value;
            state.page = 1;
            fetchArticles(false);
        }, 500);
    });

    sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        state.page = 1;
        fetchArticles(false);
    });

    catSelect.addEventListener('change', (e) => {
        state.category = e.target.value;
        state.page = 1;
        fetchArticles(false);
    });

    loadMoreBtn.addEventListener('click', () => {
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

    // 1. Fetch Latest Articles
    try {
        const res = await fetch(`${API_BASE}?size=5&sort=newest`);
        const data = await res.json();
        if (data.status === 'success' && latestList) {
            latestList.innerHTML = data.articles.map(art => `
                <a href="article.html?slug=${art.slug || ''}&id=${art.id}" class="sidebar-item">
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

    // 2. Mocking Categories (Since API doesn't have a specific endpoint, we extract from main select or common list)
    if (categoriesList) {
        const categories = ['Umum', 'Kader', 'Opini', 'Berita'];
        categoriesList.innerHTML = categories.map(cat => `
            <button class="tag-btn" onclick="document.getElementById('category-select').value='${cat}'; document.getElementById('category-select').dispatchEvent(new Event('change'))">${cat}</button>
        `).join('');
    }

    // 3. Independent Sidebar Countdown
    initSidebarCountdown();
}

async function initSidebarCountdown() {
    const container = document.getElementById('sidebar-countdown-container');
    const titleEl = document.getElementById('side-nq-title');
    const timerEl = document.getElementById('side-nq-timer');
    if (!container || !timerEl) return;

    try {
        // We reuse the same endpoint from quiz system
        const res = await fetch('/api/questions?mode=schedules');
        const data = await res.json();
        const schedules = data.schedules || [];
        const now = Date.now();

        let target = schedules.find(s => {
            const start = new Date(s.start_time).getTime();
            const end = s.end_time ? new Date(s.end_time).getTime() : Infinity;
            return now >= start && now < end;
        });

        let isActive = true;
        if (!target) {
            target = schedules
                .filter(s => new Date(s.start_time).getTime() > now)
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
            isActive = false;
        }

        if (target) {
            container.style.display = 'block';
            if (titleEl) titleEl.textContent = target.title;

            // Setup segments
            timerEl.innerHTML = `
                <div class="nq-min-segment"><span id="side-d" class="nq-min-digit">00</span><small class="nq-min-label">Hr</small></div>
                <div class="nq-min-separator">:</div>
                <div class="nq-min-segment"><span id="side-h" class="nq-min-digit">00</span><small class="nq-min-label">Jam</small></div>
                <div class="nq-min-separator">:</div>
                <div class="nq-min-segment"><span id="side-m" class="nq-min-digit">00</span><small class="nq-min-label">Mnt</small></div>
                <div class="nq-min-separator">:</div>
                <div class="nq-min-segment"><span id="side-s" class="nq-min-digit">00</span><small class="nq-min-label">Dtk</small></div>
            `;

            const updateTimer = () => {
                const now = Date.now();
                let diff = 0;
                if (isActive) {
                    const end = target.end_time ? new Date(target.end_time).getTime() : Infinity;
                    diff = Math.max(0, end - now);
                } else {
                    const start = new Date(target.start_time).getTime();
                    diff = Math.max(0, start - now);
                }

                const s = Math.floor(diff / 1000);
                const d = Math.floor(s / 86400);
                const h = Math.floor((s % 86400) / 3600);
                const m = Math.floor((s % 3600) / 60);
                const sec = s % 60;

                const dEl = document.getElementById('side-d');
                const hEl = document.getElementById('side-h');
                const mEl = document.getElementById('side-m');
                const sEl = document.getElementById('side-s');

                if (dEl) dEl.textContent = String(d).padStart(2, '0');
                if (hEl) hEl.textContent = String(h).padStart(2, '0');
                if (mEl) mEl.textContent = String(m).padStart(2, '0');
                if (sEl) sEl.textContent = String(sec).padStart(2, '0');
            };

            updateTimer();
            setInterval(updateTimer, 1000);
        }
    } catch (e) {
        console.warn('Sidebar countdown failed to init', e);
    }
}

// --- Detail Page Logic ---
function initDetailPage() {
    const container = document.getElementById('article-detail-container');
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const id = urlParams.get('id');

    if (!slug && !id) {
        container.innerHTML = '<p style="text-align:center; padding:40px;">Artikel tidak ditemukan.</p>';
        return;
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

        let heroImage = '';
        if (art.image) {
            heroImage = `<img src="${art.image}" alt="${art.title}" style="width:100%; max-height:400px; object-fit:cover; border-radius:12px; margin-bottom:24px;">`;
        }

        // Simple Markdown Parser (Headers, Bold, Italic, Lists)
        let content = art.content
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
            .replace(/\*(.*)\*/gim, '<i>$1</i>')
            .replace(/\n\n/g, '<br><br>');

        container.innerHTML = `
            <div class="article-header" style="margin-bottom:24px;">
                <span class="badge" style="background:var(--accent-primary); color:white; padding:4px 12px; border-radius:16px; font-size:0.85rem;">${art.category || 'Umum'}</span>
                <h1 style="margin-top:12px; font-size:2rem; line-height:1.2;">${art.title}</h1>
                <div class="meta" style="color:#666; font-size:0.9rem; margin-top:12px; display:flex; gap:16px;">
                    <span><i class="fas fa-user-circle"></i> ${art.author}</span>
                    <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                    <span><i class="fas fa-eye"></i> ${art.views || 0} views</span>
                </div>
            </div>
            ${heroImage}
            <div class="article-content" style="font-size:1.1rem; line-height:1.8; color:#333;">
                ${content}
            </div>
            <div class="share-buttons" style="margin-top:40px; border-top:1px solid #eee; padding-top:20px;">
                <p style="font-weight:bold; margin-bottom:12px;">Bagikan artikel ini:</p>
                <div style="display:flex; gap:10px;">
                    <a href="https://wa.me/?text=${encodeURIComponent(art.title + ' ' + window.location.href)}" target="_blank" class="btn btn-secondary" style="background:#25D366; color:white; border:none;"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="btn btn-secondary" style="background:#1877F2; color:white; border:none;"><i class="fab fa-facebook"></i> Facebook</a>
                    <button class="btn btn-secondary" onclick="navigator.share({title:'${art.title}', url:window.location.href})"><i class="fas fa-share-alt"></i> Share</button>
                </div>
            </div>
        `;
    }

    function updateSEO(art) {
        document.title = `${art.title} - IPM Panawuan`;

        // Helper to set meta
        const setMeta = (name, content) => {
            let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
            if (!el) {
                el = document.createElement('meta');
                if (name.startsWith('og:')) el.setAttribute('property', name);
                else el.setAttribute('name', name);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        setMeta('description', (art.content || '').substring(0, 150));
        setMeta('og:title', art.title);
        setMeta('og:description', (art.content || '').substring(0, 150));
        if (art.image) setMeta('og:image', art.image);
        setMeta('og:url', window.location.href);
        setMeta('og:type', 'article');
    }

    loadDetail();
}
