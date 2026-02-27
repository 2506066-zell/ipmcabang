// public-materials.js
export async function initPublicMaterials() {
    const DEFAULT_MATERIAL_THUMBNAIL = '/images/materials/material-placeholder.svg';
    const LAST_READ_STORAGE_KEY = 'ipm_material_last_read_v1';
    const PAGE_SIZE = 100;
    const INITIAL_BATCH_SIZE = 8;
    const LOAD_MORE_BATCH_SIZE = 8;
    const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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
    const readerTimer = document.getElementById('material-reader-timer');
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
    let readTickerId = null;
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

    const readSession = {
        startedAt: 0,
        accumulatedMs: 0,
        lastResumeAt: 0,
        paused: true
    };

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
                if (!candidate) {
                    clearLastRead();
                    renderLastReadCard();
                    if (window.Toast) Toast.show('Materi terakhir sudah tidak tersedia.', 'warning');
                    return;
                }
                openMaterialReader(candidate, { resumePage: lastRead.page });
            });
        }

        document.addEventListener('visibilitychange', syncReadSessionWithVisibility);
        window.addEventListener('focus', syncReadSessionWithVisibility);
        window.addEventListener('blur', syncReadSessionWithVisibility);
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
        startReadSession();

        if (driveId) {
            const previewUrl = `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`;
            showIframeMode(previewUrl);
            if (options.resumePage && window.Toast) {
                Toast.show(`Lanjut baca dari sesi terakhir (${formatReadDuration(lastRead?.seconds || 0)}).`, 'success');
            }
            return;
        }

        if (isPdfResource(rawUrl, material?.file_type)) {
            void showPdfMode(rawUrl, options.resumePage);
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
    }

    function closeMaterialReader() {
        if (!readerModal || !readerState.open) return;

        persistLastRead();
        stopReadSession();

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

    async function showPdfMode(url, resumePage) {
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
                withCredentials: false
            });
            const pdfDoc = await withTimeout(
                loadingTask.promise,
                10000,
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
            readerState.scale = 1.1;
            updatePdfControls();
            await queuePdfRender(readerState.pageNumber);
            setPdfLoadingState(false, '');
            if (readerState.pageNumber > 1 && window.Toast) {
                Toast.show(`Lanjut dari halaman ${readerState.pageNumber}.`, 'success');
            }
        } catch (err) {
            console.warn('PDF viewer load failed:', err);
            const timeoutMessage = err && err.message === 'PDF_LOAD_TIMEOUT'
                ? 'PDF terlalu lama dimuat. Kemungkinan link file bermasalah atau server sumber lambat.'
                : 'PDF tidak bisa dimuat di aplikasi. Kemungkinan link belum public, file tidak ditemukan, atau CORS belum terbuka.';
            showFallbackMode(timeoutMessage);
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
        try {
            const raw = localStorage.getItem(LAST_READ_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (!parsed.url || !parsed.title) return null;
            return parsed;
        } catch {
            return null;
        }
    }

    function saveLastRead(payload) {
        try {
            localStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(payload));
        } catch {
            // noop
        }
    }

    function clearLastRead() {
        lastRead = null;
        try {
            localStorage.removeItem(LAST_READ_STORAGE_KEY);
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
            clearLastRead();
            lastReadCard.hidden = true;
            return;
        }

        const viewedAtText = formatRelativeDate(lastRead.viewed_at);
        const durationText = formatReadDuration(Number(lastRead.seconds || 0));
        const pageText = Number(lastRead.page || 0) > 0
            ? `Hal. ${Number(lastRead.page)}`
            : 'Posisi belum tercatat';

        lastReadTitle.textContent = String(linkedMaterial.title || lastRead.title || 'Materi');
        lastReadMeta.textContent = `${viewedAtText} | ${durationText} | ${pageText}`;
        lastReadCard.hidden = false;
    }

    function formatRelativeDate(timestamp) {
        const ms = Number(timestamp || 0);
        if (!ms) return 'Baru saja';
        const now = Date.now();
        const diff = Math.max(0, now - ms);
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        if (diff < minute) return 'Baru saja';
        if (diff < hour) return `${Math.floor(diff / minute)} menit lalu`;
        if (diff < day) return `${Math.floor(diff / hour)} jam lalu`;
        return new Date(ms).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function formatReadDuration(totalSeconds) {
        const sec = Math.max(0, Number(totalSeconds) || 0);
        const hour = Math.floor(sec / 3600);
        const min = Math.floor((sec % 3600) / 60);
        const rem = sec % 60;
        if (hour > 0) return `${hour}j ${String(min).padStart(2, '0')}m`;
        return `${min}m ${String(rem).padStart(2, '0')}d`;
    }

    function formatTimerClock(ms) {
        const totalSec = Math.floor(Math.max(0, ms) / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    function startReadSession() {
        readSession.startedAt = Date.now();
        readSession.accumulatedMs = 0;
        readSession.lastResumeAt = 0;
        readSession.paused = true;
        syncReadSessionWithVisibility();

        if (readTickerId) window.clearInterval(readTickerId);
        readTickerId = window.setInterval(() => {
            updateReaderTimerUI();
        }, 1000);
        updateReaderTimerUI();
    }

    function stopReadSession() {
        pauseReadSession();
        if (readTickerId) {
            window.clearInterval(readTickerId);
            readTickerId = null;
        }
        readSession.startedAt = 0;
        readSession.accumulatedMs = 0;
        readSession.lastResumeAt = 0;
        readSession.paused = true;
        updateReaderTimerUI();
    }

    function shouldCountReadTime() {
        return Boolean(readerState.open)
            && document.visibilityState === 'visible'
            && document.hasFocus();
    }

    function syncReadSessionWithVisibility() {
        if (!readerState.open) return;
        if (shouldCountReadTime()) {
            resumeReadSession();
        } else {
            pauseReadSession();
        }
    }

    function resumeReadSession() {
        if (!readSession.startedAt || !readSession.paused) return;
        readSession.lastResumeAt = Date.now();
        readSession.paused = false;
    }

    function pauseReadSession() {
        if (!readSession.startedAt || readSession.paused) return;
        const now = Date.now();
        if (readSession.lastResumeAt) {
            readSession.accumulatedMs += Math.max(0, now - readSession.lastResumeAt);
        }
        readSession.lastResumeAt = 0;
        readSession.paused = true;
    }

    function getCurrentSessionMs() {
        if (!readSession.startedAt) return 0;
        if (readSession.paused || !readSession.lastResumeAt) return readSession.accumulatedMs;
        return readSession.accumulatedMs + Math.max(0, Date.now() - readSession.lastResumeAt);
    }

    function updateReaderTimerUI() {
        if (!readerTimer) return;
        const ms = getCurrentSessionMs();
        readerTimer.textContent = formatTimerClock(ms);
    }

    function persistLastRead() {
        const url = readerState.activeUrl;
        const title = readerState.activeTitle;
        if (!url || !title) return;

        const seconds = Math.max(0, Math.floor(getCurrentSessionMs() / 1000));
        const payload = {
            key: readerState.activeKey || url,
            title,
            url,
            file_type: String(readerState.activeMaterial?.file_type || 'pdf'),
            thumbnail: String(readerState.activeMaterial?.thumbnail || ''),
            page: Number(readerState.pageNumber || 1),
            total_pages: Number(readerState.totalPages || 0),
            seconds,
            viewed_at: Date.now()
        };
        lastRead = payload;
        saveLastRead(payload);
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
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
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
    updateReaderTimerUI();

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
