// public-materials.js
export async function initPublicMaterials() {
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
            const icon = mat.file_type === 'pdf' ? 'fa-file-pdf' : (mat.file_type === 'ebook' ? 'fa-book-open' : 'fa-file-alt');
            const thumb = mat.thumbnail ? `<img src="${mat.thumbnail}" alt="${mat.title}" class="materi-thumb">` : `<div class="materi-thumb"><i class="fas ${icon}"></i></div>`;

            return `
                <div class="materi-card">
                    <span class="type-badge">${mat.file_type}</span>
                    ${thumb}
                    <div class="materi-info">
                        <h3>${escapeHtml(mat.title)}</h3>
                        <p>${escapeHtml(mat.description || 'Tidak ada deskripsi.')}</p>
                        <div class="materi-meta">
                            <span><i class="fas fa-user-edit"></i> ${escapeHtml(mat.author || 'Tim IPM')}</span>
                            <span><i class="fas fa-tag"></i> ${escapeHtml(mat.category)}</span>
                        </div>
                    </div>
                    <div class="materi-footer">
                        <a href="${mat.file_url}" target="_blank" class="btn-download">
                            <i class="fas fa-download"></i> Unduh
                        </a>
                    </div>
                </div>
            `;
        }).join('');
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
