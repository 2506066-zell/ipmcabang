
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
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Tidak ada artikel ditemukan.</p>';
            return;
        }

        const html = articles.map(art => {
            const imgStyle = art.image
                ? `background-image: url('${art.image}')`
                : 'background-color: #eee; display:flex; align-items:center; justify-content:center; color:#ccc;';
            const imgContent = art.image ? '' : '<i class="fas fa-image fa-2x"></i>';

            // Create excerpt
            const div = document.createElement('div');
            div.innerHTML = (art.content || '').substring(0, 100) + '...';
            const excerpt = div.textContent || div.innerText || '';

            return `
            <a href="article.html?slug=${art.slug || ''}&id=${art.id}" class="article-card" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); transition:transform 0.2s;">
                <div style="height:180px; ${imgStyle}; background-size:cover; background-position:center;">${imgContent}</div>
                <div style="padding:16px; flex:1; display:flex; flex-direction:column;">
                    <div style="font-size:0.8rem; color:var(--accent-primary); font-weight:bold; margin-bottom:6px; text-transform:uppercase;">${art.category || 'Umum'}</div>
                    <h3 style="margin:0 0 8px 0; font-size:1.1rem; line-height:1.4;">${art.title}</h3>
                    <p style="font-size:0.9rem; color:#666; margin-bottom:12px; flex:1;">${excerpt}</p>
                    <div style="font-size:0.8rem; color:#999; display:flex; justify-content:space-between;">
                        <span><i class="fas fa-user"></i> ${art.author}</span>
                        <span>${new Date(art.publish_date).toLocaleDateString()}</span>
                    </div>
                </div>
            </a>
            `;
        }).join('');

        grid.insertAdjacentHTML('beforeend', html);
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

    fetchArticles();
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
