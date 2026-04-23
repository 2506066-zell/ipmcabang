// Logic for Materials Management (URL-based, no file upload)
export function initMaterials(state, els, api) {
    console.log('[Materials] Initializing...');
    const DEFAULT_MATERIAL_THUMBNAIL = '/images/materials/material-placeholder.svg';

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
    const titleHint = document.getElementById('mat-title-hint');
    const inpDesc = document.getElementById('mat-desc');
    const inpFileType = document.getElementById('mat-file-type');
    const inpCategory = document.getElementById('mat-category');
    const inpFileUrl = document.getElementById('mat-file-url');
    const fileUrlHint = document.getElementById('mat-file-url-hint');
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
        thumbPreview.onerror = () => {
            thumbPreview.onerror = null;
            thumbPreview.src = DEFAULT_MATERIAL_THUMBNAIL;
        };
        thumbPreview.src = clean;
        thumbPreview.classList.remove('hidden');
    }

    function setTitleHint(message, tone = 'muted') {
        if (!titleHint) return;
        titleHint.textContent = message;
        titleHint.className = 'small';
        if (tone === 'success') {
            titleHint.style.color = '#16a34a';
        } else if (tone === 'warning') {
            titleHint.style.color = '#f59e0b';
        } else if (tone === 'error') {
            titleHint.style.color = '#ef4444';
        } else {
            titleHint.className = 'small muted';
            titleHint.style.color = '';
        }
    }

    function prettifyFileName(rawName) {
        const clean = String(rawName || '')
            .trim()
            .replace(/\.[a-zA-Z0-9]{2,5}$/i, '')
            .replace(/[_\-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!clean) return '';

        return clean
            .split(' ')
            .map((word) => {
                if (!word) return '';
                if (/^[A-Z0-9]{2,}$/.test(word)) return word;
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
    }

    function extractTitleFromFileUrl(url) {
        const raw = String(url || '').trim();
        if (!raw) return '';

        try {
            const parsed = new URL(raw);
            const fromParams = ['title', 'filename', 'file', 'name']
                .map(key => parsed.searchParams.get(key))
                .find(Boolean);
            if (fromParams) {
                const pretty = prettifyFileName(decodeURIComponent(fromParams));
                if (pretty) return pretty;
            }

            const lastSegment = decodeURIComponent((parsed.pathname || '').split('/').filter(Boolean).pop() || '');
            if (/\.[a-zA-Z0-9]{2,5}$/i.test(lastSegment)) {
                const pretty = prettifyFileName(lastSegment);
                if (pretty) return pretty;
            }
        } catch {
            return '';
        }

        return '';
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

    function buildDriveThumbnailCandidates(fileUrl) {
        const driveId = extractGoogleDriveFileId(fileUrl);
        if (!driveId) return [];
        const encId = encodeURIComponent(driveId);
        return [
            `https://drive.google.com/thumbnail?id=${encId}&sz=w1200`,
            `https://drive.google.com/thumbnail?authuser=0&id=${encId}&sz=w1200`,
            `https://drive.google.com/thumbnail?id=${encId}&sz=w1000`,
            `https://lh3.googleusercontent.com/d/${encId}=w1200`
        ];
    }

    function deriveThumbnailFromFileUrl(fileUrl) {
        return buildDriveThumbnailCandidates(fileUrl)[0] || '';
    }

    function probeImage(url, timeoutMs = 3500) {
        return new Promise((resolve) => {
            if (!url) {
                resolve(false);
                return;
            }
            const img = new Image();
            let settled = false;
            const timer = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve(false);
            }, timeoutMs);
            img.onload = () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                resolve(true);
            };
            img.onerror = () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                resolve(false);
            };
            img.src = url;
        });
    }

    async function resolveThumbnailFromFileUrl(fileUrl) {
        const candidates = buildDriveThumbnailCandidates(fileUrl);
        for (const candidate of candidates) {
            const ok = await probeImage(candidate);
            if (ok) return candidate;
        }
        return candidates[0] || '';
    }

    function setFileUrlHint(message, tone = 'muted') {
        if (!fileUrlHint) return;
        fileUrlHint.textContent = message;
        fileUrlHint.className = 'small';
        if (tone === 'success') {
            fileUrlHint.style.color = '#16a34a';
        } else if (tone === 'warning') {
            fileUrlHint.style.color = '#f59e0b';
        } else if (tone === 'error') {
            fileUrlHint.style.color = '#ef4444';
        } else {
            fileUrlHint.className = 'small muted';
            fileUrlHint.style.color = '';
        }
    }

    function isValidHttpUrl(value) {
        try {
            const parsed = new URL(String(value || '').trim());
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    function assessFileUrl(value) {
        const raw = String(value || '').trim();
        if (!raw) return { state: 'empty', driveId: '' };
        if (!isValidHttpUrl(raw)) return { state: 'invalid', driveId: '' };
        const driveId = extractGoogleDriveFileId(raw);
        if (driveId) return { state: 'drive', driveId };
        return { state: 'generic', driveId: '' };
    }

    function updateFileUrlHint() {
        const assessed = assessFileUrl(inpFileUrl?.value);
        if (assessed.state === 'empty') {
            setFileUrlHint('Gunakan URL Google Drive agar thumbnail PDF bisa ter-generate otomatis.', 'muted');
            return assessed;
        }
        if (assessed.state === 'invalid') {
            setFileUrlHint('Format URL tidak valid. Gunakan link lengkap mulai dari https://', 'error');
            return assessed;
        }
        if (assessed.state === 'drive') {
            setFileUrlHint('URL Google Drive valid. Thumbnail PDF bisa digenerate otomatis.', 'success');
            return assessed;
        }
        setFileUrlHint('URL valid, tapi bukan Google Drive. Isi thumbnail manual jika perlu.', 'warning');
        return assessed;
    }

    async function tryAutoGenerateThumbnail(force = false) {
        if (!inpFileUrl || !inpThumbnail) return;
        const assessed = updateFileUrlHint();
        const fileUrl = String(inpFileUrl.value || '').trim();
        const currentThumb = String(inpThumbnail.value || '').trim();
        let autoThumb = '';

        try {
            autoThumb = await resolveThumbnailFromFileUrl(fileUrl);
        } catch {
            autoThumb = deriveThumbnailFromFileUrl(fileUrl);
        }

        if (!autoThumb) {
            if (force && window.Toast) {
                const msg = assessed.state === 'invalid'
                    ? 'Format URL tidak valid.'
                    : 'Thumbnail Drive tidak tersedia. Menggunakan thumbnail standar.';
                window.Toast.show(msg, 'warning');
            }
            if (force) {
                inpThumbnail.value = DEFAULT_MATERIAL_THUMBNAIL;
                inpThumbnail.dataset.autoThumb = '1';
                setThumbPreview(DEFAULT_MATERIAL_THUMBNAIL);
            }
            return;
        }

        const canFill = force || !currentThumb || inpThumbnail.dataset.autoThumb === '1';
        if (!canFill) return;

        inpThumbnail.value = autoThumb;
        inpThumbnail.dataset.autoThumb = '1';
        setThumbPreview(autoThumb);
        if (force && window.Toast) {
            window.Toast.show('Thumbnail berhasil digenerate dari Google Drive.', 'success');
        }
    }

    function tryAutoFillTitleFromUrl(force = false) {
        if (!inpTitle || !inpFileUrl) return;
        const currentTitle = String(inpTitle.value || '').trim();
        const autoTitleFlag = inpTitle.dataset.autoTitle === '1';
        const canAutofill = force || !currentTitle || autoTitleFlag;
        if (!canAutofill) return;

        const derived = extractTitleFromFileUrl(inpFileUrl.value);
        if (!derived) {
            if (force) {
                setTitleHint('Nama file tidak terdeteksi dari URL ini. Isi judul manual.', 'warning');
            }
            return;
        }

        inpTitle.value = derived;
        inpTitle.dataset.autoTitle = '1';
        setTitleHint('Judul terisi otomatis dari nama file URL.', 'success');
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
                    <button class="btn btn-secondary btn-sm notify-btn" data-id="${mat.id}" style="color:var(--accent-primary); border-color:var(--accent-primary)">
                        <i class="fas fa-bell"></i> Kirim Notifikasi
                    </button>
                    ${mat.file_url
                        ? `<a href="${mat.file_url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm"><i class="fas fa-link"></i> Buka URL</a>`
                        : `<span class="btn btn-secondary btn-sm" style="opacity:0.6; cursor:not-allowed;"><i class="fas fa-file"></i> URL belum ada</span>`}
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.edit-btn').forEach(btn => btn.onclick = () => openEdit(btn.dataset.id));
        list.querySelectorAll('.del-btn').forEach(btn => btn.onclick = () => handleDelete(btn.dataset.id));
        list.querySelectorAll('.notify-btn').forEach(btn => {
            btn.onclick = () => {
                const mat = materials.find(m => String(m.id) === String(btn.dataset.id));
                if (mat && window.prepareLibraryReminder) {
                    window.prepareLibraryReminder(mat);
                }
            };
        });
    }

    function updatePagination() {
        if (pageInfo) pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    }

    function resetFormState() {
        form?.reset();
        if (inpId) inpId.value = '';
        if (inpTitle) {
            inpTitle.dataset.autoTitle = '1';
            setTitleHint('Judul bisa terisi otomatis dari nama file pada URL materi.', 'muted');
        }
        if (inpThumbnail) {
            inpThumbnail.dataset.autoThumb = '';
        }
        setThumbPreview('');
        setFileUrlHint('Gunakan URL Google Drive agar thumbnail PDF bisa ter-generate otomatis.', 'muted');
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
            inpTitle.dataset.autoTitle = mat.title ? '0' : '1';
            inpDesc.value = mat.description || '';
            inpFileType.value = mat.file_type || 'pdf';
            inpCategory.value = mat.category || 'Umum';
            inpFileUrl.value = mat.file_url || '';
            inpThumbnail.value = mat.thumbnail || '';
            inpActive.checked = !!mat.active;
            updateFileUrlHint();
            if (!mat.title) {
                tryAutoFillTitleFromUrl(false);
            } else {
                setTitleHint('Judul manual aktif. Ubah URL tidak akan menimpa judul ini.', 'muted');
            }

            if (mat.thumbnail) {
                inpThumbnail.dataset.autoThumb = '0';
                setThumbPreview(mat.thumbnail);
            } else {
                inpThumbnail.dataset.autoThumb = '1';
                void tryAutoGenerateThumbnail(false);
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
            if (window.Toast) window.Toast.show('Materi berhasil dihapus', 'success');
        } catch (e) {
            alert('Gagal hapus: ' + e.message);
        }
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        const title = String(inpTitle.value || '').trim();
        const fileUrl = String(inpFileUrl.value || '').trim();
        const assessedUrl = assessFileUrl(fileUrl);
        if (!title) {
            alert('Judul materi wajib diisi.');
            return;
        }
        if (!fileUrl) {
            alert('URL materi wajib diisi.');
            return;
        }
        if (assessedUrl.state === 'invalid') {
            alert('Format URL materi tidak valid. Gunakan link lengkap mulai dari https://');
            return;
        }

        const btn = document.getElementById('mat-save-btn');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        btn.disabled = true;

        try {
            let thumbUrl = String(inpThumbnail.value || '').trim();
            if (!thumbUrl) {
                thumbUrl = await resolveThumbnailFromFileUrl(fileUrl);
            }
            if (!thumbUrl) {
                thumbUrl = DEFAULT_MATERIAL_THUMBNAIL;
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
            if (window.Toast) window.Toast.show('Materi berhasil disimpan!', 'success');
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
        tryAutoFillTitleFromUrl(false);
    };
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    inpFileUrl?.addEventListener('input', () => updateFileUrlHint());
    inpFileUrl?.addEventListener('change', () => {
        tryAutoFillTitleFromUrl(false);
        void tryAutoGenerateThumbnail(false);
    });
    inpFileUrl?.addEventListener('blur', () => {
        tryAutoFillTitleFromUrl(false);
        void tryAutoGenerateThumbnail(false);
    });
    inpTitle?.addEventListener('input', () => {
        inpTitle.dataset.autoTitle = '0';
        setTitleHint('Judul manual aktif. Otomatisasi judul dimatikan untuk field ini.', 'muted');
    });
    inpThumbnail?.addEventListener('input', () => {
        inpThumbnail.dataset.autoThumb = '0';
        setThumbPreview(inpThumbnail.value);
    });
    generateThumbBtn?.addEventListener('click', () => void tryAutoGenerateThumbnail(true));

    if (window.__uiBack) window.__uiBack.register('admin-material', closeModal);
    if (searchInput) searchInput.oninput = api.debounce(() => loadMaterials(1), 500);
    if (prevBtn) prevBtn.onclick = () => loadMaterials(currentPage - 1);
    if (nextBtn) nextBtn.onclick = () => loadMaterials(currentPage + 1);

    updateFileUrlHint();
    loadMaterials();
}
