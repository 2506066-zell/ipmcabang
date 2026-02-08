// Logic for Materials Management (Ebooks & PDFs)
export function initMaterials(state, els, api) {
    console.log('[Materials] Initializing...');

    // UI Elements
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
    const inpAuthor = document.getElementById('mat-author');
    const inpActive = document.getElementById('mat-active');

    // Close Buttons
    const closeBtn = document.getElementById('mat-close-btn');
    const cancelBtn = document.getElementById('mat-cancel-btn');

    // Upload UI Elements
    const fileZone = document.getElementById('mat-file-zone');
    const fileInput = document.getElementById('mat-file-input');
    const fileStatus = document.getElementById('mat-file-status');
    const fileNameDisplay = fileStatus.querySelector('.file-name');
    const removeFileBtn = fileStatus.querySelector('.btn-remove-file');

    const thumbZone = document.getElementById('mat-thumb-zone');
    const thumbInput = document.getElementById('mat-thumb-input');
    const thumbPreview = document.getElementById('mat-thumb-preview');
    const thumbPlaceholder = thumbZone.querySelector('.upload-placeholder');

    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressPercent = document.getElementById('upload-percent');
    const progressText = document.getElementById('upload-status-text');

    let currentFile = null;
    let currentThumb = null;
    let currentPage = 1;
    let totalPages = 1;

    // --- Upload Handlers ---

    fileZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleFileSelect(e.target.files[0]);

    thumbZone.onclick = () => thumbInput.click();
    thumbInput.onchange = (e) => handleThumbSelect(e.target.files[0]);

    // Drag & Drop
    [fileZone, thumbZone].forEach(zone => {
        zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('drag-over'); };
        zone.ondragleave = () => zone.classList.remove('drag-over');
        zone.ondrop = (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (zone.id === 'mat-file-zone') handleFileSelect(file);
            else handleThumbSelect(file);
        };
    });

    function handleFileSelect(file) {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return alert('File terlalu besar! Maksimal 5MB.');
        currentFile = file;
        fileNameDisplay.textContent = file.name;
        fileStatus.classList.remove('hidden');
        fileZone.querySelector('.upload-placeholder').classList.add('hidden');
    }

    removeFileBtn.onclick = (e) => {
        e.stopPropagation();
        currentFile = null;
        fileStatus.classList.add('hidden');
        fileZone.querySelector('.upload-placeholder').classList.remove('hidden');
        fileInput.value = '';
    };

    async function handleThumbSelect(file) {
        if (!file) return;
        if (!file.type.startsWith('image/')) return alert('Hanya file gambar!');

        // UI Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            thumbPreview.src = e.target.result;
            thumbPreview.classList.remove('hidden');
            thumbPlaceholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);

        // Compression
        currentThumb = await compressImage(file);
    }

    async function compressImage(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max = 800;
                if (width > height && width > max) { height *= max / width; width = max; }
                else if (height > max) { width *= max / height; height = max; }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
            };
        });
    }

    async function uploadToCloud(file, type = 'file') {
        if (!file) return null;

        progressContainer.classList.remove('hidden');
        progressText.textContent = `Mengunggah ${type === 'thumb' ? 'sampul' : 'materi'}...`;

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/upload');
            xhr.setRequestHeader('Authorization', localStorage.getItem('adminToken') || 'dummy');
            xhr.setRequestHeader('x-filename', file.name || `upload-${Date.now()}.${type === 'thumb' ? 'jpg' : 'pdf'}`);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = pct + '%';
                    progressPercent.textContent = pct + '%';
                }
            };

            xhr.onload = () => {
                const res = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) resolve(res.url);
                else reject(new Error(res.error || 'Upload gagal'));
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
        });
    }

    async function loadMaterials(page = 1) {
        if (!list) return;
        list.innerHTML = '<div style="text-align:center; padding:20px;">Memuat...</div>';

        try {
            const q = searchInput ? searchInput.value : '';
            let url = `/api/admin/materials?page=${page}&size=10`;
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
            list.innerHTML = `<div style="text-align:center; color:red">Gagal memuat: ${e.message}</div>`;
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
                    <span class="item-badge" style="background:#0f172a; color:#fff;">${escapeHtml(mat.file_type.toUpperCase())}</span>
                </div>
                <div style="font-size:0.85rem; color:#666; margin-bottom:8px;">
                    <i class="fas fa-folder"></i> ${escapeHtml(mat.category)} &nbsp;•&nbsp; 
                    <i class="fas fa-user"></i> ${escapeHtml(mat.author || 'Tim IPM')} &nbsp;•&nbsp;
                    <i class="fas fa-circle ${mat.active ? 'text-success' : 'text-muted'}" style="font-size:8px"></i> ${mat.active ? 'Aktif' : 'Draft'}
                </div>
                <div style="display:flex; gap:8px;">
                     <button class="btn btn-secondary btn-sm edit-btn" data-id="${mat.id}"><i class="fas fa-edit"></i> Edit</button>
                     <button class="btn btn-secondary btn-sm del-btn" style="color:red; border-color:red" data-id="${mat.id}"><i class="fas fa-trash"></i> Hapus</button>
                     <a href="${mat.file_url}" target="_blank" class="btn btn-secondary btn-sm"><i class="fas fa-download"></i> Buka File</a>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => openEdit(b.dataset.id));
        list.querySelectorAll('.del-btn').forEach(b => b.onclick = () => handleDelete(b.dataset.id));
    }

    function updatePagination() {
        if (pageInfo) pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    }

    function openModal(title = 'Tambah Materi') {
        document.getElementById('material-modal-title').textContent = title;
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        form.reset();
        inpId.value = '';

        // Reset Upload Previews
        currentFile = null;
        currentThumb = null;
        fileStatus.classList.add('hidden');
        fileZone.querySelector('.upload-placeholder').classList.remove('hidden');
        thumbPreview.classList.add('hidden');
        thumbPlaceholder.classList.remove('hidden');
        progressContainer.classList.add('hidden');
        progressBar.style.width = '0%';
    }

    addBtn.onclick = () => openModal();

    async function openEdit(id) {
        try {
            const mat = await fetchSingle(id);
            if (!mat) return;

            inpId.value = mat.id;
            inpTitle.value = mat.title;
            inpDesc.value = mat.description || '';
            inpFileType.value = mat.file_type || 'pdf';
            inpCategory.value = mat.category || 'Umum';
            inpFileUrl.value = mat.file_url || '';
            inpThumbnail.value = mat.thumbnail || '';
            inpAuthor.value = mat.author || '';
            inpActive.checked = mat.active;

            if (mat.thumbnail) {
                thumbPreview.src = mat.thumbnail;
                thumbPreview.classList.remove('hidden');
                thumbPlaceholder.classList.add('hidden');
            }

            openModal('Edit Materi');
        } catch (e) {
            alert('Gagal memuat data: ' + e.message);
        }
    }

    async function fetchSingle(id) {
        const data = await api.apiAdminVercel('GET', `/api/admin/materials`);
        return data.materials?.find(m => m.id == id);
    }

    async function handleDelete(id) {
        if (!confirm('Yakin hapus materi ini?')) return;
        try {
            await api.apiAdminVercel('POST', `/api/admin/materials?action=deleteMaterial`, { id });
            loadMaterials(currentPage);
            if (window.Toast) Toast.show('Materi berhasil dihapus', 'success');
        } catch (e) {
            alert('Gagal hapus: ' + e.message);
        }
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        const btn = document.getElementById('mat-save-btn');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        try {
            // Step 1: Handle Uploads if Any
            let fileUrl = inpFileUrl.value;
            let thumbUrl = inpThumbnail.value;

            if (currentFile) {
                fileUrl = await uploadToCloud(currentFile, 'file');
            }
            if (currentThumb) {
                thumbUrl = await uploadToCloud(currentThumb, 'thumb');
            }

            // Step 2: Save metadata
            const payload = {
                id: inpId.value || undefined,
                title: inpTitle.value,
                description: inpDesc.value,
                file_type: inpFileType.value,
                category: inpCategory.value,
                file_url: fileUrl,
                thumbnail: thumbUrl,
                author: inpAuthor.value,
                active: inpActive.checked
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

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    if (searchInput) searchInput.oninput = api.debounce(() => loadMaterials(1), 500);
    if (prevBtn) prevBtn.onclick = () => loadMaterials(currentPage - 1);
    if (nextBtn) nextBtn.onclick = () => loadMaterials(currentPage + 1);

    function escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    loadMaterials();
}
