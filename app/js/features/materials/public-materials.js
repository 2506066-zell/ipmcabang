// public-materials.js
export async function initPublicMaterials() {
    const DEFAULT_MATERIAL_THUMBNAIL = '/images/materials/material-placeholder.svg';
    const PAGE_SIZE = 100;
    const grid = document.getElementById('materi-grid');
    const searchInput = document.getElementById('mat-search');
    const categorySelect = document.getElementById('mat-category-select');
    const emptyState = document.getElementById('empty-state');
    const loader = document.getElementById('loading-overlay');

    let materials = [];

    async function fetchData() {
        if (loader) loader.classList.remove('hidden');
        try {
            const q = searchInput.value || '';
            const cat = categorySelect.value || 'all';
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
        } catch (e) {
            console.error('Fetch error:', e);
            if (window.Toast) Toast.show('Gagal memuat materi', 'error');
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    }

    function render() {
        if (!grid) return;

        if (materials.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        grid.innerHTML = materials.map(mat => {
            const thumbUrl = resolveMaterialThumbnail(mat);
            const safeThumb = thumbUrl || DEFAULT_MATERIAL_THUMBNAIL;
            const thumbMarkup = `<img src="${safeThumb}" alt="${escapeHtml(mat.title)}" class="materi-thumb" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${DEFAULT_MATERIAL_THUMBNAIL}'">`;

            return `
                <div class="materi-card">
                    <a href="${mat.file_url}" target="_blank" rel="noopener noreferrer" class="materi-card-link" title="${escapeHtml(mat.title)}">
                        <div class="materi-thumb-wrap">
                            ${thumbMarkup}
                        </div>
                        <h3 class="materi-title-link">${escapeHtml(mat.title)}</h3>
                    </a>
                </div>
            `;
        }).join('');
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
