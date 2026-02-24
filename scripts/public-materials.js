// public-materials.js
export async function initPublicMaterials() {
    const DEFAULT_MATERIAL_THUMBNAIL = '/images/materials/material-placeholder.svg';
    const PAGE_SIZE = 100;
    const INITIAL_BATCH_SIZE = 8;
    const LOAD_MORE_BATCH_SIZE = 8;
    const grid = document.getElementById('materi-grid');
    const searchInput = document.getElementById('mat-search');
    const categorySelect = document.getElementById('mat-category-select');
    const emptyState = document.getElementById('empty-state');
    const loader = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const loadMoreSentinel = document.getElementById('materi-load-more-sentinel');

    let materials = [];
    let renderedCount = 0;
    let isFetching = false;
    let hasLoadedOnce = false;
    let thumbObserver = null;
    let loadMoreObserver = null;

    function setOverlayLoading(show, text) {
        if (!loader) return;
        if (loadingText && text) loadingText.textContent = text;
        loader.classList.toggle('show', !!show);
    }

    async function fetchData() {
        if (isFetching) return;
        isFetching = true;
        const isInitialLoad = !hasLoadedOnce;
        const previousMaterials = materials.slice();
        try {
            const q = searchInput.value || '';
            const cat = categorySelect.value || 'all';
            if (isInitialLoad) {
                setOverlayLoading(true, 'Memuat Perpustakaan Digital...');
            } else {
                renderInlineSkeleton(INITIAL_BATCH_SIZE);
            }

            const params = new URLSearchParams();
            params.set('size', String(PAGE_SIZE));
            if (q) params.set('search', q);
            if (cat !== 'all') params.set('category', cat);

            let page = 1;
            let collected = [];
            let total = null;

            while (true) {
                params.set('page', String(page));
                const res = await fetch(`/api/materials?${params.toString()}`);
                const data = await res.json();
                if (data.status !== 'success') break;

                const chunk = Array.isArray(data.materials) ? data.materials : [];
                collected = collected.concat(chunk);
                total = Number(data.total ?? total ?? chunk.length);
                if (!chunk.length || collected.length >= total) break;

                page += 1;
                if (page > 50) break; // guard agar tidak loop tak terbatas
            }

            materials = collected;
            render();
            hasLoadedOnce = true;
        } catch (e) {
            materials = previousMaterials;
            render();
            console.error('Fetch error:', e);
            if (window.Toast) Toast.show('Gagal memuat materi', 'error');
        } finally {
            if (isInitialLoad) setOverlayLoading(false);
            isFetching = false;
        }
    }

    function render() {
        if (!grid) return;
        disconnectLoadMoreObserver();
        disconnectThumbObserver();

        if (materials.length === 0) {
            grid.innerHTML = '';
            setEmptyState(true);
            setLoadMoreSentinel(false);
            return;
        }

        setEmptyState(false);
        grid.innerHTML = '';
        renderedCount = 0;
        renderNextBatch(INITIAL_BATCH_SIZE);
        setupLoadMoreObserver();
    }

    function renderInlineSkeleton(count = INITIAL_BATCH_SIZE) {
        if (!grid) return;
        disconnectLoadMoreObserver();
        disconnectThumbObserver();
        setEmptyState(false);
        setLoadMoreSentinel(false);
        grid.innerHTML = new Array(count).fill(`
            <div class="materi-card materi-card-skeleton" aria-hidden="true">
                <div class="materi-thumb-wrap">
                    <div class="materi-skeleton-line materi-skeleton-thumb"></div>
                </div>
                <div class="materi-skeleton-body">
                    <div class="materi-skeleton-line materi-skeleton-title"></div>
                    <div class="materi-skeleton-line materi-skeleton-subtitle"></div>
                </div>
            </div>
        `).join('');
    }

    function renderNextBatch(batchSize = LOAD_MORE_BATCH_SIZE) {
        if (!grid || renderedCount >= materials.length) {
            setLoadMoreSentinel(false);
            return;
        }

        const nextCount = Math.min(renderedCount + batchSize, materials.length);
        const chunk = materials.slice(renderedCount, nextCount);
        const markup = chunk.map(renderMaterialCard).join('');

        grid.insertAdjacentHTML('beforeend', markup);
        renderedCount = nextCount;
        setupLazyThumbs();
        setLoadMoreSentinel(renderedCount < materials.length);
    }

    function renderMaterialCard(mat) {
        const thumbUrl = resolveMaterialThumbnail(mat);
        const safeThumb = thumbUrl || DEFAULT_MATERIAL_THUMBNAIL;
        const hasCustomThumb = safeThumb !== DEFAULT_MATERIAL_THUMBNAIL;
        const safeTitle = escapeHtml(mat.title || 'Materi');
        const safeHref = escapeAttribute(mat.file_url || '#');

        const thumbAttrs = hasCustomThumb
            ? `src="${DEFAULT_MATERIAL_THUMBNAIL}" data-src="${escapeAttribute(safeThumb)}"`
            : `src="${DEFAULT_MATERIAL_THUMBNAIL}"`;

        return `
            <div class="materi-card">
                <a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="materi-card-link" title="${safeTitle}">
                    <div class="materi-thumb-wrap">
                        <img ${thumbAttrs} alt="${safeTitle}" class="materi-thumb materi-thumb-lazy" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${DEFAULT_MATERIAL_THUMBNAIL}'">
                    </div>
                    <h3 class="materi-title-link">${safeTitle}</h3>
                </a>
            </div>
        `;
    }

    function setupLazyThumbs() {
        if (!grid) return;
        const lazyThumbs = grid.querySelectorAll('img.materi-thumb-lazy[data-src]');
        if (!lazyThumbs.length) return;

        if (!('IntersectionObserver' in window)) {
            lazyThumbs.forEach((img) => {
                const src = img.getAttribute('data-src');
                if (src) img.src = src;
                img.removeAttribute('data-src');
            });
            return;
        }

        if (!thumbObserver) {
            thumbObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const image = entry.target;
                    const src = image.getAttribute('data-src');
                    if (src) image.src = src;
                    image.removeAttribute('data-src');
                    observer.unobserve(image);
                });
            }, {
                rootMargin: '220px 0px',
                threshold: 0.01
            });
        }

        lazyThumbs.forEach((img) => thumbObserver.observe(img));
    }

    function setupLoadMoreObserver() {
        if (!loadMoreSentinel || renderedCount >= materials.length) return;
        if (!('IntersectionObserver' in window)) {
            while (renderedCount < materials.length) {
                renderNextBatch(LOAD_MORE_BATCH_SIZE);
            }
            return;
        }

        disconnectLoadMoreObserver();
        loadMoreObserver = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            renderNextBatch(LOAD_MORE_BATCH_SIZE);
            if (renderedCount >= materials.length) disconnectLoadMoreObserver();
        }, {
            rootMargin: '280px 0px',
            threshold: 0.01
        });
        loadMoreObserver.observe(loadMoreSentinel);
    }

    function disconnectLoadMoreObserver() {
        if (!loadMoreObserver) return;
        loadMoreObserver.disconnect();
        loadMoreObserver = null;
    }

    function disconnectThumbObserver() {
        if (!thumbObserver) return;
        thumbObserver.disconnect();
        thumbObserver = null;
    }

    function setLoadMoreSentinel(show) {
        if (!loadMoreSentinel) return;
        loadMoreSentinel.hidden = !show;
    }

    function setEmptyState(show) {
        if (!emptyState) return;
        emptyState.hidden = !show;
    }

    function resolveMaterialThumbnail(material) {
        const explicit = String(material?.thumbnail || '').trim();
        if (explicit) return explicit;

        const fileUrl = String(material?.file_url || '').trim();
        if (!fileUrl) return '';

        const driveId = extractGoogleDriveFileId(fileUrl);
        if (!driveId) return '';
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200`;
    }

    function extractGoogleDriveFileId(url) {
        const raw = String(url || '').trim();
        if (!raw) return '';

        const byPath = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (byPath && byPath[1]) return byPath[1];
        const byDocsPath = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (byDocsPath && byDocsPath[1]) return byDocsPath[1];

        try {
            const parsed = new URL(raw);
            const fromQuery = parsed.searchParams.get('id');
            if (fromQuery) return fromQuery;
        } catch {
            return '';
        }

        return '';
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function escapeAttribute(text) {
        return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Event Listeners
    if (searchInput) {
        let timeout;
        searchInput.oninput = () => {
            clearTimeout(timeout);
            timeout = setTimeout(fetchData, 500);
        };
    }
    if (categorySelect) categorySelect.onchange = fetchData;

    fetchData();
}
