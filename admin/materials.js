// Logic for Materials Management (URL-based, no file upload)
export function initMaterials(state, els, api) {
    console.log('[Materials] Initializing...');

    const list = document.getElementById('materials-list');
    const searchInput = document.getElementById('material-search');
    const addBtn = document.getElementById('add-material-btn');
    const modal = document.getElementById('material-modal');
    const form = document.getElementById('material-form');
    const prevBtn = document.getElementById('mat-prev');
    const nextBtn = document.getElementById('mat-next');
    const pageInfo = document.getElementById('mat-page-info');

    // Modal Inputs
    const inpId = document.getElementById('mat-id');
    const inpTitle = document.getElementById('mat-title');
    const inpDesc = document.getElementById('mat-desc');
    const inpFileType = document.getElementById('mat-file-type');
    const inpCategory = document.getElementById('mat-category');
    const inpFileUrl = document.getElementById('mat-file-url');
    const inpThumbnail = document.getElementById('mat-thumbnail');
    const inpActive = document.getElementById('mat-active');
    const thumbPreview = document.getElementById('mat-thumb-preview');
    const generateThumbBtn = document.getElementById('mat-generate-thumb-btn');

    const closeBtn = document.getElementById('mat-close-btn');
    const cancelBtn = document.getElementById('mat-cancel-btn');

    let currentPage = 1;
    let totalPages = 1;

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function setThumbPreview(url) {
        if (!thumbPreview) return;
        const clean = String(url || '').trim();
        if (!clean) {
            thumbPreview.classList.add('hidden');
            thumbPreview.removeAttribute('src');
            return;
        }
        thumbPreview.src = clean;
        thumbPreview.classList.remove('hidden');
    }

    function extractGoogleDriveFileId(url) {
        const raw = String(url || '').trim();
        if (!raw) return '';

        const byPath = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (byPath && byPath[1]) return byPath[1];

        try {
            const parsed = new URL(raw);
            const fromQuery = parsed.searchParams.get('id');
            if (fromQuery) return fromQuery;
        } catch {
            return '';
        }

        return '';
    }

    function deriveThumbnailFromFileUrl(fileUrl) {
        const driveId = extractGoogleDriveFileId(fileUrl);
        if (!driveId) return '';
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200`;
    }

    function tryAutoGenerateThumbnail(force = false) {
        if (!inpFileUrl || !inpThumbnail) return;
        const fileUrl = String(inpFileUrl.value || '').trim();
        const currentThumb = String(inpThumbnail.value || '').trim();
        const autoThumb = deriveThumbnailFromFileUrl(fileUrl);

        if (!autoThumb) {
            if (force && window.Toast) {
                Toast.show('URL bukan Google Drive yang didukung untuk auto-thumbnail.', 'warning');
            }
            return;
        }

        const canFill = force || !currentThumb || inpThumbnail.dataset.autoThumb === '1';
        if (!canFill) return;

        inpThumbnail.value = autoThumb;
        inpThumbnail.dataset.autoThumb = '1';
        setThumbPreview(autoThumb);
        if (force && window.Toast) {
            Toast.show('Thumbnail berhasil digenerate dari Google Drive.', 'success');
        }
    }

    async function loadMaterials(page = 1) {
        if (!list) return;
        list.innerHTML = '<div style="text-align:center; padding:20px;">Memuat...</div>';

        try {
            const q = searchInput ? searchInput.value : '';
            let url = `/api/admin/materials?action=listMaterials&page=${page}&size=10`;
            if (q) url += `&search=${encodeURIComponent(q)}`;

            const data = await api.apiAdminVercel('GET', url);
            if (data.status === 'success') {
                currentPage = data.page;
                totalPages = Math.ceil(data.total / 10) || 1;
                renderList(data.materials || []);
                updatePagination();
            }
        } catch (e) {
            console.error(e);
            list.innerHTML = `<div style="text-align:center; color:red">Gagal memuat: ${escapeHtml(e.message)}</div>`;
        }
    }

    function renderList(materials) {
        if (materials.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:20px;">Belum ada materi.</div>';
            return;
        }

        list.innerHTML = materials.map(mat => `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="item-title" style="font-size:1.1rem">${escapeHtml(mat.title)}</span>
                    <span class="item-badge" style="background:#0f172a; color:#fff;">${escapeHtml(String(mat.file_type || 'other').toUpperCase())}</span>
                </div>
                <div style="font-size:0.85rem; color:#666; margin-bottom:8px;">
                    <i class="fas fa-folder"></i> ${escapeHtml(mat.category)} &nbsp;•&nbsp;
                    <i class="fas fa-user"></i> ${escapeHtml(mat.author || 'Tim IPM')} &nbsp;•&nbsp;
                    <i class="fas fa-circle ${mat.active ? 'text-success' : 'text-muted'}" style="font-size:8px"></i> ${mat.active ? 'Aktif' : 'Draft'}
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-secondary btn-sm edit-btn" data-id="${mat.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-secondary btn-sm del-btn" style="color:red; border-color:red" data-id="${mat.id}">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                    ${mat.file_url
                        ? `<a href="${mat.file_url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm"><i class="fas fa-link"></i> Buka URL</a>`
                        : `<span class="btn btn-secondary btn-sm" style="opacity:0.6; cursor:not-allowed;"><i class="fas fa-file"></i> URL belum ada</span>`}
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.edit-btn').forEach(btn => btn.onclick = () => openEdit(btn.dataset.id));
        list.querySelectorAll('.del-btn').forEach(btn => btn.onclick = () => handleDelete(btn.dataset.id));
    }

    function updatePagination() {
        if (pageInfo) pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    }

    function resetFormState() {
        form?.reset();
        if (inpId) inpId.value = '';
        if (inpThumbnail) {
            inpThumbnail.dataset.autoThumb = '';
        }
        setThumbPreview('');
    }

    function openModal(title = 'Tambah Materi') {
        const titleEl = document.getElementById('material-modal-title');
        if (titleEl) titleEl.textContent = title;
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (window.__uiBack) window.__uiBack.open('admin-material');
    }

    function closeModal(fromPop) {
        modal.classList.remove('active');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        resetFormState();
        if (!fromPop && window.__uiBack) window.__uiBack.requestClose('admin-material');
    }

    async function fetchSingle(id) {
        const data = await api.apiAdminVercel('GET', '/api/admin/materials?action=listMaterials');
        return data.materials?.find(m => String(m.id) === String(id));
    }

    async function openEdit(id) {
        try {
            const mat = await fetchSingle(id);
            if (!mat) return;

            inpId.value = mat.id;
            inpTitle.value = mat.title || '';
            inpDesc.value = mat.description || '';
            inpFileType.value = mat.file_type || 'pdf';
            inpCategory.value = mat.category || 'Umum';
            inpFileUrl.value = mat.file_url || '';
            inpThumbnail.value = mat.thumbnail || '';
            inpActive.checked = !!mat.active;

            if (mat.thumbnail) {
                inpThumbnail.dataset.autoThumb = '0';
                setThumbPreview(mat.thumbnail);
            } else {
                inpThumbnail.dataset.autoThumb = '1';
                tryAutoGenerateThumbnail(false);
            }

            openModal('Edit Materi');
        } catch (e) {
            alert('Gagal memuat data: ' + e.message);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Yakin hapus materi ini?')) return;
        try {
            await api.apiAdminVercel('POST', '/api/admin/materials?action=deleteMaterial', { id });
            loadMaterials(currentPage);
            if (window.Toast) Toast.show('Materi berhasil dihapus', 'success');
        } catch (e) {
            alert('Gagal hapus: ' + e.message);
        }
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        const title = String(inpTitle.value || '').trim();
        const fileUrl = String(inpFileUrl.value || '').trim();
        if (!title) {
            alert('Judul materi wajib diisi.');
            return;
        }
        if (!fileUrl) {
            alert('URL materi wajib diisi.');
            return;
        }

        const btn = document.getElementById('mat-save-btn');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        try {
            let thumbUrl = String(inpThumbnail.value || '').trim();
            if (!thumbUrl) {
                thumbUrl = deriveThumbnailFromFileUrl(fileUrl);
            }

            const payload = {
                id: inpId.value || undefined,
                title,
                description: String(inpDesc.value || '').trim(),
                file_type: String(inpFileType.value || 'pdf').trim(),
                category: String(inpCategory.value || 'Umum').trim(),
                file_url: fileUrl,
                thumbnail: thumbUrl,
                active: !!inpActive.checked
            };

            await api.apiAdminVercel('POST', '/api/admin/materials?action=upsertMaterial', payload);
            closeModal();
            loadMaterials(currentPage);
            if (window.Toast) Toast.show('Materi berhasil disimpan!', 'success');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    };

    addBtn.onclick = () => {
        resetFormState();
        openModal('Tambah Materi');
    };
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    inpFileUrl?.addEventListener('change', () => tryAutoGenerateThumbnail(false));
    inpFileUrl?.addEventListener('blur', () => tryAutoGenerateThumbnail(false));
    inpThumbnail?.addEventListener('input', () => {
        inpThumbnail.dataset.autoThumb = '0';
        setThumbPreview(inpThumbnail.value);
    });
    generateThumbBtn?.addEventListener('click', () => tryAutoGenerateThumbnail(true));

    if (window.__uiBack) window.__uiBack.register('admin-material', closeModal);
    if (searchInput) searchInput.oninput = api.debounce(() => loadMaterials(1), 500);
    if (prevBtn) prevBtn.onclick = () => loadMaterials(currentPage - 1);
    if (nextBtn) nextBtn.onclick = () => loadMaterials(currentPage + 1);

    loadMaterials();
}
