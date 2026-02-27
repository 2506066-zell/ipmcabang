// public-materials.js
export async function initPublicMaterials() {
    const DEFAULT_MATERIAL_THUMBNAIL = '/images/materials/material-placeholder.svg';
    const LAST_READ_STORAGE_KEY = 'ipm_material_last_read_v1';
    const PAGE_SIZE = 100;
    const INITIAL_BATCH_SIZE = 8;
    const LOAD_MORE_BATCH_SIZE = 8;
    const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const PDF_LOAD_TIMEOUT_MS = 8000;
    const PDF_MAX_DEVICE_PIXEL_RATIO = 1.5;
    const PDF_RANGE_CHUNK_SIZE = 256 * 1024;
    const USER_SESSION_KEY = 'ipmquiz_user_session';
    const USER_USERNAME_KEY = 'ipmquiz_user_username';

    const grid = document.getElementById('materi-grid');
    const searchInput = document.getElementById('mat-search');
    const categorySelect = document.getElementById('mat-category-select');
    const emptyState = document.getElementById('empty-state');
    const loader = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const loadMoreSentinel = document.getElementById('materi-load-more-sentinel');
    const lastReadCard = document.getElementById('material-last-read-card');
    const lastReadTitle = document.getElementById('material-last-read-title');
    const lastReadMeta = document.getElementById('material-last-read-meta');
    const lastReadResumeBtn = document.getElementById('material-last-read-resume-btn');

    const readerModal = document.getElementById('material-reader-modal');
    const readerTitle = document.getElementById('material-reader-title');
    const readerCloseBtn = document.getElementById('material-reader-close-btn');
    const readerOpenTabLink = document.getElementById('material-reader-open-tab');
    const readerFrame = document.getElementById('material-reader-frame');
    const readerFallback = document.getElementById('material-reader-fallback');
    const readerFallbackText = document.getElementById('material-reader-fallback-text');
    const readerFallbackLink = document.getElementById('material-reader-fallback-link');
    const pdfShell = document.getElementById('material-pdf-shell');
    const pdfCanvas = document.getElementById('material-pdf-canvas');
    const pdfLoading = document.getElementById('material-pdf-loading');
    const pdfPageInfo = document.getElementById('material-pdf-page-info');
    const pdfPrevBtn = document.getElementById('material-pdf-prev');
    const pdfNextBtn = document.getElementById('material-pdf-next');
    const pdfZoomOutBtn = document.getElementById('material-pdf-zoom-out');
    const pdfZoomInBtn = document.getElementById('material-pdf-zoom-in');

    let materials = [];
    let renderedCount = 0;
    let isFetching = false;
    let hasLoadedOnce = false;
    let thumbObserver = null;
    let loadMoreObserver = null;
    let pdfJsLoadPromise = null;
    let syncLastReadTimerId = null;
    let syncLastReadPendingPayload = null;
    let syncLastReadBusy = false;
    let lastRead = loadLastRead();

    const readerState = {
        open: false,
        activeUrl: '',
        activeTitle: '',
        activeKey: '',
        activeMaterial: null,
        pdfDoc: null,
        pageNumber: 1,
        totalPages: 0,
        scale: 1.1,
        isRendering: false,
        queuedPage: 0,
        renderTask: null
    };

    function getStored(key) {
        try {
            return String(sessionStorage.getItem(key) || localStorage.getItem(key) || '').trim();
        } catch {
            return '';
        }
    }

    function getSessionToken() {
        return getStored(USER_SESSION_KEY);
    }

    function getUsername() {
        return getStored(USER_USERNAME_KEY);
    }

    function getScopedLastReadKey() {
        const normalizedUser = getUsername().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
        if (!normalizedUser) return `${LAST_READ_STORAGE_KEY}_guest`;
        return `${LAST_READ_STORAGE_KEY}_${normalizedUser}`;
    }

    function normalizeLastReadPayload(payload) {
        if (!payload || typeof payload !== 'object') return null;
        const url = sanitizeMaterialUrl(payload.url || '');
        const title = String(payload.title || '').trim();
        if (!url || !title) return null;

        return {
            key: String(payload.key || url),
            title,
            url,
            file_type: String(payload.file_type || 'pdf'),
            thumbnail: String(payload.thumbnail || ''),
            page: Math.max(0, Number(payload.page) || 0),
            total_pages: Math.max(0, Number(payload.total_pages) || 0),
            updated_at_ms: Math.max(0, Number(payload.updated_at_ms) || 0)
        };
    }

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
            const q = (searchInput && searchInput.value) || '';
            const cat = (categorySelect && categorySelect.value) || 'all';

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
                if (page > 50) break;
            }

            materials = collected;
            render();
            hasLoadedOnce = true;
        } catch (err) {
            materials = previousMaterials;
            render();
            console.error('Fetch error:', err);
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
        renderLastReadCard();

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

        const startIndex = renderedCount;
        const nextCount = Math.min(renderedCount + batchSize, materials.length);
        const chunk = materials.slice(renderedCount, nextCount);
        const markup = chunk.map((mat, idx) => renderMaterialCard(mat, startIndex + idx)).join('');

        grid.insertAdjacentHTML('beforeend', markup);
        renderedCount = nextCount;
        setupLazyThumbs();
        setLoadMoreSentinel(renderedCount < materials.length);
    }

    function renderMaterialCard(mat, index) {
        const thumbUrl = resolveMaterialThumbnail(mat);
        const safeThumb = thumbUrl || DEFAULT_MATERIAL_THUMBNAIL;
        const hasCustomThumb = safeThumb !== DEFAULT_MATERIAL_THUMBNAIL;
        const safeTitle = escapeHtml(mat.title || 'Materi');
        const safeHref = escapeAttribute(sanitizeMaterialUrl(mat.file_url) || '#');

        const thumbAttrs = hasCustomThumb
            ? `src="${DEFAULT_MATERIAL_THUMBNAIL}" data-src="${escapeAttribute(safeThumb)}"`
            : `src="${DEFAULT_MATERIAL_THUMBNAIL}"`;

        return `
            <div class="materi-card">
                <a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="materi-card-link" data-material-index="${index}" title="${safeTitle}">
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

    function setupReader() {
        if (!grid) return;
        if (window.__uiBack && window.__uiBack.register) {
            window.__uiBack.register('material-reader', closeMaterialReader);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'hidden') return;
            if (!readerState.open) return;
            persistLastRead({ skipRemote: true });
        });

        window.addEventListener('pagehide', () => {
            if (!readerState.open) return;
            persistLastRead({ skipRemote: true });
        });

        grid.addEventListener('click', (event) => {
            const link = event.target.closest('a.materi-card-link');
            if (!link || !grid.contains(link)) return;
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const index = Number(link.dataset.materialIndex);
            const material = Number.isInteger(index) ? materials[index] : null;
            if (!material) return;

            event.preventDefault();
            openMaterialReader(material);
        });

        if (readerCloseBtn) {
            readerCloseBtn.addEventListener('click', closeMaterialReader);
        }

        if (readerModal) {
            readerModal.addEventListener('click', (event) => {
                if (event.target === readerModal) closeMaterialReader();
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && readerState.open) {
                closeMaterialReader();
            }
        });

        if (pdfPrevBtn) {
            pdfPrevBtn.addEventListener('click', () => {
                if (!readerState.pdfDoc || readerState.pageNumber <= 1) return;
                void queuePdfRender(readerState.pageNumber - 1);
            });
        }

        if (pdfNextBtn) {
            pdfNextBtn.addEventListener('click', () => {
                if (!readerState.pdfDoc || readerState.pageNumber >= readerState.totalPages) return;
                void queuePdfRender(readerState.pageNumber + 1);
            });
        }

        if (pdfZoomOutBtn) {
            pdfZoomOutBtn.addEventListener('click', () => {
                if (!readerState.pdfDoc) return;
                const nextScale = Math.max(0.65, Number((readerState.scale - 0.15).toFixed(2)));
                if (nextScale === readerState.scale) return;
                readerState.scale = nextScale;
                void queuePdfRender(readerState.pageNumber);
            });
        }

        if (pdfZoomInBtn) {
            pdfZoomInBtn.addEventListener('click', () => {
                if (!readerState.pdfDoc) return;
                const nextScale = Math.min(2.2, Number((readerState.scale + 0.15).toFixed(2)));
                if (nextScale === readerState.scale) return;
                readerState.scale = nextScale;
                void queuePdfRender(readerState.pageNumber);
            });
        }

        if (lastReadResumeBtn) {
            lastReadResumeBtn.addEventListener('click', () => {
                if (!lastRead || !lastRead.url) return;
                const candidate = findMaterialByUrl(lastRead.url);
                const target = candidate || {
                    title: lastRead.title,
                    file_url: lastRead.url,
                    file_type: lastRead.file_type,
                    thumbnail: lastRead.thumbnail
                };
                openMaterialReader(target, { resumePage: lastRead.page });
            });
        }
    }

    function openMaterialReader(material, options = {}) {
        const rawUrl = sanitizeMaterialUrl(material?.file_url);
        if (!rawUrl) {
            if (window.Toast) Toast.show('Link materi belum valid.', 'error');
            return;
        }

        if (!readerModal || !readerTitle || !readerFrame) {
            window.open(rawUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        const title = String(material?.title || 'Materi').trim() || 'Materi';
        const driveId = extractGoogleDriveFileId(rawUrl);

        readerState.activeUrl = rawUrl;
        readerState.activeTitle = title;
        readerState.activeKey = buildMaterialKey(material);
        readerState.activeMaterial = material;
        readerTitle.textContent = title;

        if (readerOpenTabLink) readerOpenTabLink.href = rawUrl;
        if (readerFallbackLink) readerFallbackLink.href = rawUrl;

        showReaderModal();

        if (isPdfResource(rawUrl, material?.file_type)) {
            if (driveId) {
                const proxiedPdfUrl = `/api/materials-file?id=${encodeURIComponent(driveId)}`;
                const previewUrl = `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`;
                void showPdfMode(proxiedPdfUrl, options.resumePage, previewUrl);
                return;
            }
            void showPdfMode(rawUrl, options.resumePage);
            return;
        }

        if (driveId) {
            const previewUrl = `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`;
            showIframeMode(previewUrl);
            if (options.resumePage && window.Toast) {
                Toast.show('Lanjut baca materi terakhir.', 'success');
            }
            return;
        }

        showIframeMode(rawUrl);
    }

    function showReaderModal() {
        if (!readerModal) return;
        readerModal.hidden = false;
        readerModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('material-reader-open');
        readerState.open = true;
        if (window.__uiBack && window.__uiBack.open) {
            window.__uiBack.open('material-reader');
        }
    }

    function closeMaterialReader(fromPop) {
        if (!readerModal || !readerState.open) return;
        if (!fromPop && window.__uiBack && window.__uiBack.requestClose) {
            window.__uiBack.requestClose('material-reader');
            return;
        }

        persistLastRead();

        readerModal.hidden = true;
        readerModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('material-reader-open');
        readerState.open = false;

        if (readerFrame) readerFrame.src = 'about:blank';
        clearPdfState();
        setReaderMode('iframe');
    }

    function setReaderMode(mode) {
        if (pdfShell) pdfShell.hidden = mode !== 'pdf';
        if (readerFrame) readerFrame.hidden = mode !== 'iframe';
        if (readerFallback) readerFallback.hidden = mode !== 'fallback';
    }

    function showIframeMode(src) {
        setReaderMode('iframe');
        clearPdfState();
        if (readerFrame) readerFrame.src = src;
    }

    async function showPdfMode(url, resumePage, iframeFallbackSrc = '') {
        setReaderMode('pdf');
        setPdfLoadingState(true, 'Memuat PDF...');

        const ready = await ensurePdfJsReady();
        if (!ready || !window.pdfjsLib) {
            showFallbackMode('Viewer PDF belum tersedia. Silakan buka di tab baru.');
            return;
        }

        try {
            clearPdfState();
            const loadingTask = window.pdfjsLib.getDocument({
                url,
                withCredentials: false,
                rangeChunkSize: PDF_RANGE_CHUNK_SIZE
            });
            const pdfDoc = await withTimeout(
                loadingTask.promise,
                PDF_LOAD_TIMEOUT_MS,
                () => {
                    try {
                        if (typeof loadingTask.destroy === 'function') loadingTask.destroy();
                    } catch {
                        // noop
                    }
                }
            );
            readerState.pdfDoc = pdfDoc;
            readerState.totalPages = Number(pdfDoc.numPages || 0);
            readerState.pageNumber = Math.min(Math.max(Number(resumePage) || 1, 1), readerState.totalPages || 1);
            readerState.scale = await resolveInitialPdfScale(pdfDoc, readerState.pageNumber);
            updatePdfControls();
            await queuePdfRender(readerState.pageNumber);
            setPdfLoadingState(false, '');
            if (readerState.pageNumber > 1 && window.Toast) {
                Toast.show(`Lanjut dari halaman ${readerState.pageNumber}.`, 'success');
            }
        } catch (err) {
            console.warn('PDF viewer load failed:', err);
            if (err && err.message === 'PDF_LOAD_TIMEOUT') {
                showIframeMode(iframeFallbackSrc || url);
                if (window.Toast) Toast.show('Mode cepat aktif karena PDF terlalu lama dimuat.', 'warning');
                return;
            }
            if (iframeFallbackSrc) {
                showIframeMode(iframeFallbackSrc);
                if (window.Toast) Toast.show('PDF direct gagal, dialihkan ke mode preview.', 'warning');
                return;
            }
            showFallbackMode('PDF tidak bisa dimuat di aplikasi. Kemungkinan link belum public, file tidak ditemukan, atau CORS belum terbuka.');
        }
    }

    async function resolveInitialPdfScale(pdfDoc, pageNumber) {
        if (!pdfDoc || !pdfCanvas) return 1;

        try {
            const page = await pdfDoc.getPage(pageNumber);
            const baseViewport = page.getViewport({ scale: 1 });
            const canvasWrap = pdfCanvas.parentElement;
            const wrapWidth = Number(canvasWrap?.clientWidth || 0);
            if (!wrapWidth || !baseViewport.width) return 1;

            const usableWidth = Math.max(240, wrapWidth - 24);
            const fitScale = usableWidth / baseViewport.width;
            return Math.min(1.1, Math.max(0.78, Number(fitScale.toFixed(2))));
        } catch {
            return 1;
        }
    }

    function withTimeout(promise, timeoutMs, onTimeout) {
        let timeoutId = null;
        return new Promise((resolve, reject) => {
            timeoutId = window.setTimeout(() => {
                if (typeof onTimeout === 'function') onTimeout();
                reject(new Error('PDF_LOAD_TIMEOUT'));
            }, Math.max(1000, Number(timeoutMs) || 10000));

            Promise.resolve(promise)
                .then((value) => {
                    if (timeoutId) window.clearTimeout(timeoutId);
                    resolve(value);
                })
                .catch((error) => {
                    if (timeoutId) window.clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    function showFallbackMode(message) {
        setReaderMode('fallback');
        if (readerFallbackText) readerFallbackText.textContent = message;
        setPdfLoadingState(false, '');
        clearPdfState();
    }

    function clearPdfState() {
        if (readerState.renderTask && typeof readerState.renderTask.cancel === 'function') {
            try {
                readerState.renderTask.cancel();
            } catch {
                // noop
            }
        }
        readerState.renderTask = null;
        readerState.isRendering = false;
        readerState.queuedPage = 0;

        if (readerState.pdfDoc && typeof readerState.pdfDoc.destroy === 'function') {
            try {
                readerState.pdfDoc.destroy();
            } catch {
                // noop
            }
        }

        readerState.pdfDoc = null;
        readerState.totalPages = 0;
        readerState.pageNumber = 1;

        if (pdfCanvas) {
            const ctx = pdfCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
            pdfCanvas.width = 0;
            pdfCanvas.height = 0;
            pdfCanvas.style.width = '';
            pdfCanvas.style.height = '';
        }

        updatePdfControls();
    }

    function loadLastRead() {
        const scopedKey = getScopedLastReadKey();
        const legacyKey = LAST_READ_STORAGE_KEY;

        try {
            const scopedRaw = localStorage.getItem(scopedKey);
            if (scopedRaw) {
                const normalized = normalizeLastReadPayload(JSON.parse(scopedRaw));
                if (normalized) return normalized;
            }

            const legacyRaw = localStorage.getItem(legacyKey);
            if (!legacyRaw) return null;
            const legacy = normalizeLastReadPayload(JSON.parse(legacyRaw));
            if (!legacy) return null;

            localStorage.setItem(scopedKey, JSON.stringify(legacy));
            return legacy;
        } catch {
            return null;
        }
    }

    function saveLastRead(payload, options = {}) {
        const normalized = normalizeLastReadPayload(payload);
        if (!normalized) return;
        const localPayload = {
            ...normalized,
            updated_at_ms: normalized.updated_at_ms || Date.now()
        };
        const scopedKey = getScopedLastReadKey();

        try {
            localStorage.setItem(scopedKey, JSON.stringify(localPayload));
        } catch {
            // noop
        }

        if (options.skipRemote) return;
        scheduleLastReadSync(localPayload);
    }

    function clearLastRead() {
        lastRead = null;
        try {
            localStorage.removeItem(getScopedLastReadKey());
        } catch {
            // noop
        }
    }

    function scheduleLastReadSync(payload) {
        const token = getSessionToken();
        if (!token) return;

        syncLastReadPendingPayload = payload;
        if (syncLastReadTimerId) window.clearTimeout(syncLastReadTimerId);
        syncLastReadTimerId = window.setTimeout(() => {
            void flushLastReadSync();
        }, 900);
    }

    async function flushLastReadSync() {
        if (syncLastReadBusy || !syncLastReadPendingPayload) return;
        const token = getSessionToken();
        if (!token) return;

        const payload = syncLastReadPendingPayload;
        syncLastReadPendingPayload = null;
        syncLastReadBusy = true;

        try {
            await fetch('/api/materials?action=lastRead', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
        } catch {
            syncLastReadPendingPayload = payload;
        } finally {
            syncLastReadBusy = false;
            if (syncLastReadPendingPayload) {
                if (syncLastReadTimerId) window.clearTimeout(syncLastReadTimerId);
                syncLastReadTimerId = window.setTimeout(() => {
                    void flushLastReadSync();
                }, 1400);
            }
        }
    }

    async function hydrateLastReadFromServer() {
        const token = getSessionToken();
        if (!token) return;

        try {
            const res = await fetch('/api/materials?action=lastRead', {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.status !== 'success') return;

            const remoteRaw = data.last_read;
            if (!remoteRaw) return;

            const normalizedRemote = normalizeLastReadPayload({
                key: remoteRaw.material_key || remoteRaw.key || remoteRaw.url,
                title: remoteRaw.title,
                url: remoteRaw.url,
                file_type: remoteRaw.file_type,
                thumbnail: remoteRaw.thumbnail,
                page: remoteRaw.page,
                total_pages: remoteRaw.total_pages,
                updated_at_ms: remoteRaw.updated_at ? Date.parse(remoteRaw.updated_at) : 0
            });
            if (!normalizedRemote) return;

            const localTs = Number(lastRead?.updated_at_ms || 0);
            const remoteTs = Number(normalizedRemote.updated_at_ms || 0);

            if (!lastRead || remoteTs >= localTs) {
                lastRead = normalizedRemote;
                saveLastRead(normalizedRemote, { skipRemote: true });
                renderLastReadCard();
                return;
            }

            scheduleLastReadSync(lastRead);
        } catch {
            // noop
        }
    }

    function buildMaterialKey(material) {
        const safeUrl = sanitizeMaterialUrl(material?.file_url || '');
        if (safeUrl) return safeUrl;
        return String(material?.title || 'materi').trim().toLowerCase();
    }

    function findMaterialByUrl(url) {
        const target = sanitizeMaterialUrl(url);
        if (!target) return null;
        return materials.find((item) => sanitizeMaterialUrl(item?.file_url || '') === target) || null;
    }

    function renderLastReadCard() {
        if (!lastReadCard || !lastReadTitle || !lastReadMeta) return;
        if (!lastRead || !lastRead.url) {
            lastReadCard.hidden = true;
            return;
        }

        const linkedMaterial = findMaterialByUrl(lastRead.url);
        if (!linkedMaterial) {
            const pageTextBeforeData = Number(lastRead.page || 0) > 0
                ? `Hal. ${Number(lastRead.page)}`
                : 'Posisi belum tercatat';
            lastReadTitle.textContent = String(lastRead.title || 'Materi');
            lastReadMeta.textContent = `Terakhir dibaca | ${pageTextBeforeData}`;
            lastReadCard.hidden = false;
            return;
        }

        const pageText = Number(lastRead.page || 0) > 0
            ? `Hal. ${Number(lastRead.page)}`
            : 'Posisi belum tercatat';

        lastReadTitle.textContent = String(linkedMaterial.title || lastRead.title || 'Materi');
        lastReadMeta.textContent = `Terakhir dibaca | ${pageText}`;
        lastReadCard.hidden = false;
    }

    function persistLastRead(options = {}) {
        const url = readerState.activeUrl;
        const title = readerState.activeTitle;
        if (!url || !title) return;

        const hasPdfDoc = Boolean(readerState.pdfDoc);
        let page = 0;
        if (hasPdfDoc) {
            page = Math.max(1, Number(readerState.pageNumber || 1));
        } else if (lastRead && lastRead.key === (readerState.activeKey || url)) {
            page = Number(lastRead.page || 0);
        }
        if (!page && isPdfResource(url, readerState.activeMaterial?.file_type)) {
            page = Math.max(1, Number(lastRead?.page || 1));
        }

        const payload = {
            key: readerState.activeKey || url,
            title,
            url,
            file_type: String(readerState.activeMaterial?.file_type || 'pdf'),
            thumbnail: String(readerState.activeMaterial?.thumbnail || ''),
            page,
            total_pages: hasPdfDoc ? Number(readerState.totalPages || 0) : Number(lastRead?.total_pages || 0),
            updated_at_ms: Date.now()
        };
        lastRead = payload;
        saveLastRead(payload, { skipRemote: !!options.skipRemote });
        renderLastReadCard();
    }

    async function ensurePdfJsReady() {
        if (window.pdfjsLib) return true;
        if (pdfJsLoadPromise) return pdfJsLoadPromise;

        pdfJsLoadPromise = loadScriptOnce(PDFJS_CDN)
            .then(() => {
                if (!window.pdfjsLib) return false;
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
                return true;
            })
            .catch((err) => {
                console.warn('Failed to load pdf.js:', err);
                return false;
            });

        return pdfJsLoadPromise;
    }

    function schedulePdfJsWarmup() {
        if (window.pdfjsLib || pdfJsLoadPromise) return;
        const run = () => {
            void ensurePdfJsReady();
        };

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => run(), { timeout: 1800 });
        } else {
            window.setTimeout(run, 1200);
        }
    }

    function loadScriptOnce(src) {
        return new Promise((resolve, reject) => {
            const attrName = 'data-src-key';
            const selectorSafeSrc = src.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const existing = document.querySelector(`script[${attrName}="${selectorSafeSrc}"]`);
            if (existing) {
                if (existing.getAttribute('data-loaded') === '1') {
                    resolve();
                    return;
                }
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error('script load error')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.setAttribute(attrName, src);
            script.addEventListener('load', () => {
                script.setAttribute('data-loaded', '1');
                resolve();
            }, { once: true });
            script.addEventListener('error', () => reject(new Error('script load error')), { once: true });
            document.head.appendChild(script);
        });
    }

    async function queuePdfRender(pageNumber) {
        if (!readerState.pdfDoc) return;
        const clamped = Math.min(Math.max(Number(pageNumber) || 1, 1), readerState.totalPages || 1);
        if (readerState.isRendering) {
            readerState.queuedPage = clamped;
            return;
        }
        await renderPdfPage(clamped);
    }

    async function renderPdfPage(pageNumber) {
        if (!readerState.pdfDoc || !pdfCanvas) return;
        readerState.isRendering = true;
        readerState.pageNumber = pageNumber;
        updatePdfControls();
        setPdfLoadingState(true, `Memuat halaman ${pageNumber}...`);

        try {
            const page = await readerState.pdfDoc.getPage(pageNumber);
            const viewport = page.getViewport({ scale: readerState.scale });
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            const ratioCap = isMobile ? 1.2 : PDF_MAX_DEVICE_PIXEL_RATIO;
            const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 1), ratioCap);
            const context = pdfCanvas.getContext('2d');
            if (!context) throw new Error('Canvas context unavailable');

            pdfCanvas.width = Math.floor(viewport.width * ratio);
            pdfCanvas.height = Math.floor(viewport.height * ratio);
            pdfCanvas.style.width = `${Math.floor(viewport.width)}px`;
            pdfCanvas.style.height = `${Math.floor(viewport.height)}px`;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, viewport.width, viewport.height);

            readerState.renderTask = page.render({
                canvasContext: context,
                viewport
            });
            await readerState.renderTask.promise;
            persistLastRead();
            setPdfLoadingState(false, '');
        } catch (err) {
            if (!err || err.name !== 'RenderingCancelledException') {
                console.warn('PDF render failed:', err);
                showFallbackMode('Gagal merender PDF di aplikasi. Silakan buka di tab baru.');
            }
        } finally {
            readerState.renderTask = null;
            readerState.isRendering = false;
            updatePdfControls();

            if (readerState.queuedPage) {
                const queued = readerState.queuedPage;
                readerState.queuedPage = 0;
                await renderPdfPage(queued);
            }
        }
    }

    function setPdfLoadingState(show, text) {
        if (!pdfLoading) return;
        pdfLoading.hidden = !show;
        if (text) pdfLoading.textContent = text;
    }

    function updatePdfControls() {
        const hasDoc = Boolean(readerState.pdfDoc);
        if (pdfPageInfo) {
            pdfPageInfo.textContent = hasDoc
                ? `${readerState.pageNumber} / ${readerState.totalPages}`
                : '- / -';
        }

        if (pdfPrevBtn) {
            pdfPrevBtn.disabled = !hasDoc || readerState.isRendering || readerState.pageNumber <= 1;
        }
        if (pdfNextBtn) {
            pdfNextBtn.disabled = !hasDoc || readerState.isRendering || readerState.pageNumber >= readerState.totalPages;
        }
        if (pdfZoomOutBtn) {
            pdfZoomOutBtn.disabled = !hasDoc || readerState.isRendering || readerState.scale <= 0.65;
        }
        if (pdfZoomInBtn) {
            pdfZoomInBtn.disabled = !hasDoc || readerState.isRendering || readerState.scale >= 2.2;
        }
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

    function sanitizeMaterialUrl(url) {
        const raw = String(url || '').trim();
        if (!raw) return '';
        if (/^javascript:/i.test(raw)) return '';

        try {
            const parsed = new URL(raw, window.location.origin);
            if (!/^https?:$/i.test(parsed.protocol)) return '';
            return parsed.toString();
        } catch {
            return '';
        }
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

    function isPdfResource(url, fileType) {
        const normalizedType = String(fileType || '').trim().toLowerCase();
        if (normalizedType === 'pdf') return true;

        try {
            const parsed = new URL(url);
            const path = parsed.pathname.toLowerCase();
            if (path.endsWith('.pdf')) return true;

            const format = String(parsed.searchParams.get('format') || '').toLowerCase();
            if (format === 'pdf') return true;

            const filename = String(parsed.searchParams.get('filename') || '').toLowerCase();
            if (filename.endsWith('.pdf')) return true;
        } catch {
            const lower = String(url).toLowerCase();
            if (lower.includes('.pdf')) return true;
        }

        return false;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function escapeAttribute(text) {
        return escapeHtml(text)
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    setupReader();
    renderLastReadCard();
    schedulePdfJsWarmup();
    void hydrateLastReadFromServer();

    if (searchInput) {
        let timeout = null;
        searchInput.oninput = () => {
            clearTimeout(timeout);
            timeout = setTimeout(fetchData, 500);
        };
    }

    if (categorySelect) categorySelect.onchange = fetchData;

    fetchData();
}
