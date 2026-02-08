
// Logic for Article Management
export function initArticles(state, els, api) {
    console.log('[Articles] Initializing...');

    // UI Elements
    const list = document.getElementById('articles-list');
    const searchInput = document.getElementById('article-search');
    const addBtn = document.getElementById('add-article-btn');
    const modal = document.getElementById('article-modal');
    const form = document.getElementById('article-form');
    const prevBtn = document.getElementById('art-prev');
    const nextBtn = document.getElementById('art-next');
    const pageInfo = document.getElementById('art-page-info');

    // Debug: Check critical elements
    console.log('[Articles] Elements:', {
        list: !!list,
        addBtn: !!addBtn,
        modal: !!modal,
        form: !!form
    });

    // Validate critical elements exist
    if (!list || !addBtn || !modal || !form) {
        console.error('[Articles] Critical elements missing!', { list, addBtn, modal, form });
        return;
    }

    // Inputs
    const inpId = document.getElementById('art-id');
    const inpTitle = document.getElementById('art-title');
    const inpCategory = document.getElementById('art-category');
    const inpDate = document.getElementById('art-date');
    const inpFile = document.getElementById('art-image-file');
    const inpBase64 = document.getElementById('art-image-base64');
    const previewDiv = document.getElementById('art-image-preview');
    const inpContent = document.getElementById('art-content');

    let currentPage = 1;
    let totalPages = 1;

    // Load Articles
    async function loadArticles(page = 1) {
        state.loading = true;
        list.innerHTML = '<div style="text-align:center; padding:20px;">Memuat...</div>';

        try {
            const q = searchInput.value || '';
            let url = `/api/articles?page=${page}&size=10&sort=newest`;
            if (q) url += `&search=${encodeURIComponent(q)}`;

            const data = await api.fetchJsonWithRetry(url, { method: 'GET' });

            if (data.status === 'success') {
                currentPage = data.page;
                totalPages = data.totalPages;
                renderList(data.articles || []);
                updatePagination();
            }
        } catch (e) {
            console.error(e);
            list.innerHTML = `<div style="text-align:center; color:red">Gagal memuat: ${e.message}</div>`;
        } finally {
            state.loading = false;
        }
    }

    function renderList(articles) {
        if (articles.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:20px;">Belum ada artikel.</div>';
            return;
        }

        list.innerHTML = articles.map(art => `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="item-title" style="font-size:1.1rem">${escapeHtml(art.title)}</span>
                    <span class="item-badge" style="background:#ddd; color:#333;">${escapeHtml(art.category || 'Umum')}</span>
                </div>
                <div style="font-size:0.85rem; color:#666; margin-bottom:8px;">
                    <i class="fas fa-user"></i> ${escapeHtml(art.author)} &nbsp;•&nbsp; 
                    <i class="fas fa-calendar"></i> ${new Date(art.publish_date).toLocaleDateString()} &nbsp;•&nbsp;
                    <i class="fas fa-eye"></i> ${art.views} Views
                </div>
                <div style="display:flex; gap:8px;">
                     <button class="btn btn-secondary btn-sm edit-btn" data-id="${art.id}"><i class="fas fa-edit"></i> Edit</button>
                     <button class="btn btn-secondary btn-sm del-btn" style="color:red; border-color:red" data-id="${art.id}"><i class="fas fa-trash"></i> Hapus</button>
                     <a href="/article.html?slug=${art.slug}" target="_blank" class="btn btn-secondary btn-sm"><i class="fas fa-external-link-alt"></i> Lihat</a>
                </div>
            </div>
        `).join('');

        // Attach events
        list.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => openEdit(b.dataset.id));
        list.querySelectorAll('.del-btn').forEach(b => b.onclick = () => handleDelete(b.dataset.id));
    }

    function updatePagination() {
        if (pageInfo) pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    }

    // Modal Logic
    function openModal() {
        console.log('[Articles] openModal called');
        modal.classList.remove('hidden');
        modal.classList.add('active');  // CSS uses .modal.active for visibility
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // Create/Edit
    addBtn.onclick = () => {
        console.log('[Articles] Add button clicked');
        try {
            form.reset();
            if (inpId) inpId.value = '';
            if (inpBase64) inpBase64.value = '';
            if (previewDiv) previewDiv.style.display = 'none';
            const modalTitle = document.getElementById('article-modal-title');
            if (modalTitle) modalTitle.textContent = 'Tambah Artikel';
            console.log('[Articles] Opening modal...');
            openModal();
            console.log('[Articles] Modal opened');
        } catch (e) {
            console.error('[Articles] Error opening modal:', e);
        }
    };

    async function openEdit(id) {
        // Fetch detail
        try {
            const data = await api.fetchJsonWithRetry(`/api/articles?id=${id}`);
            if (data.status === 'success' && data.article) {
                const a = data.article;
                inpId.value = a.id;
                inpTitle.value = a.title;
                inpCategory.value = a.category || 'Umum';
                inpContent.value = a.content;

                // Date format for datetime-local: YYYY-MM-DDTHH:mm
                const d = new Date(a.publish_date);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                inpDate.value = d.toISOString().slice(0, 16);

                if (a.image) {
                    inpBase64.value = a.image; // Keep existing unless changed
                    previewDiv.querySelector('img').src = a.image;
                    previewDiv.style.display = 'block';
                } else {
                    inpBase64.value = '';
                    previewDiv.style.display = 'none';
                }

                document.getElementById('article-modal-title').textContent = 'Edit Artikel';
                openModal();
            }
        } catch (e) {
            alert('Gagal mengambil data: ' + e.message);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Yakin hapus artikel ini?')) return;
        try {
            await api.apiAdminVercel('DELETE', `/api/articles?id=${id}`);
            loadArticles(currentPage);
        } catch (e) {
            alert('Gagal hapus: ' + e.message);
        }
    }

    // Image Handling
    inpFile.onchange = () => {
        const file = inpFile.files[0];
        if (!file) return;

        if (file.size > 150 * 1024) {
            alert('Ukuran gambar maksimal 150KB!');
            inpFile.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const res = e.target.result;
            inpBase64.value = res;
            previewDiv.querySelector('img').src = res;
            previewDiv.style.display = 'block';
        };
        reader.readAsDataURL(file);
    };

    // Save
    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = inpId.value;
        const payload = {
            id,
            title: inpTitle.value,
            category: inpCategory.value,
            content: inpContent.value,
            image: inpBase64.value, // Will send base64 string
            publish_date: inpDate.value ? new Date(inpDate.value).toISOString() : new Date().toISOString()
        };

        const btn = document.getElementById('art-save-btn');
        const oldText = btn.textContent;
        btn.textContent = 'Menyimpan...';
        btn.disabled = true;

        try {
            if (id) {
                await api.apiAdminVercel('PUT', '/api/articles', payload);
            } else {
                await api.apiAdminVercel('POST', '/api/articles', payload);
            }
            closeModal();
            loadArticles(currentPage);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    };

    // Events
    searchInput.oninput = api.debounce(() => loadArticles(1), 500);
    prevBtn.onclick = () => loadArticles(currentPage - 1);
    nextBtn.onclick = () => loadArticles(currentPage + 1);

    function escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Init load
    loadArticles();
}
