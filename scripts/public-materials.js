// public-materials.js
export async function initPublicMaterials() {
    const DEFAULT_MATERIAL_THUMBNAIL = '/images/materials/material-placeholder.svg';
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
            let url = `/api/materials?page=1&size=50`;
            if (q) url += `&search=${encodeURIComponent(q)}`;
            if (cat !== 'all') url += `&category=${encodeURIComponent(cat)}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.status === 'success') {
                materials = data.materials || [];
                render();
            }
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
