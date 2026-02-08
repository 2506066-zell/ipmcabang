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

    // Editor Specific Elements
    const editorArea = document.getElementById('art-editor');
    const toolbar = document.getElementById('editor-toolbar');
    const statusText = document.getElementById('editor-status');
    const closeBtn = document.getElementById('art-close-btn');
    const cancelBtn = document.getElementById('art-cancel-btn');
    const removeImgBtn = document.getElementById('remove-art-image');

    // Inputs
    const inpId = document.getElementById('art-id');
    const inpTitle = document.getElementById('art-title');
    const inpAuthor = document.getElementById('art-author');
    const inpCategory = document.getElementById('art-category');
    const inpDate = document.getElementById('art-date');
    const inpFile = document.getElementById('art-image-file');
    const inpBase64 = document.getElementById('art-image-base64');
    const previewDiv = document.getElementById('art-image-preview');
    const inpContent = document.getElementById('art-content'); // Hidden backend sync

    let currentPage = 1;
    let totalPages = 1;

    // --- RICH EDITOR LOGIC ---
    function initRichEditor() {
        if (!toolbar || !editorArea) return;

        toolbar.querySelectorAll('.tool-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                const value = btn.dataset.value || null;
                document.execCommand(command, false, value);
                editorArea.focus();
            };
        });

        // Color Picker
        const colorPicker = document.getElementById('editor-color-picker');
        if (colorPicker) {
            colorPicker.oninput = (e) => {
                document.execCommand('foreColor', false, e.target.value);
                editorArea.focus();
            };
        }

        // Line Spacing
        const lineSpacingSelector = document.getElementById('editor-line-spacing');
        if (lineSpacingSelector) {
            lineSpacingSelector.onchange = (e) => {
                editorArea.style.lineHeight = e.target.value;
                editorArea.focus();
            };
            // Set initial
            editorArea.style.lineHeight = lineSpacingSelector.value;
        }

        // Sync content to hidden textarea on change
        editorArea.oninput = () => {
            inpContent.value = editorArea.innerHTML;
            updateWordCount();
        };
    }

    function updateWordCount() {
        const text = editorArea.innerText || "";
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        if (statusText) statusText.textContent = `Draft • ${words} kata`;
    }

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
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus title with instant feel
        requestAnimationFrame(() => {
            inpTitle.focus();
            // Move cursor to end if editing
            if (inpTitle.value) {
                const len = inpTitle.value.length;
                inpTitle.setSelectionRange(len, len);
            }
        });
        updateWordCount();
    }

    function closeModal() {
        modal.classList.remove('active');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // Create/Edit
    addBtn.onclick = () => {
        window.location.href = 'editor.html';
    };

    async function openEdit(id) {
        window.location.href = `editor.html?id=${id}`;
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

        if (file.size > 200 * 1024) { // Increased to 200KB for better quality sampul
            alert('Ukuran gambar maksimal 200KB!');
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

    removeImgBtn.onclick = () => {
        inpBase64.value = '';
        inpFile.value = '';
        previewDiv.style.display = 'none';
    };

    // Save
    form.onsubmit = async (e) => {
        e.preventDefault();

        // Final sync
        inpContent.value = editorArea.innerHTML;

        const id = inpId.value;
        const payload = {
            id,
            title: inpTitle.value,
            author: inpAuthor.value,
            category: inpCategory.value,
            content: inpContent.value,
            image: inpBase64.value,
            publish_date: inpDate.value ? new Date(inpDate.value).toISOString() : new Date().toISOString()
        };

        const btn = document.getElementById('art-save-btn');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mempublikasikan...';
        btn.disabled = true;

        try {
            if (id) {
                await api.apiAdminVercel('PUT', '/api/articles', payload);
            } else {
                await api.apiAdminVercel('POST', '/api/articles', payload);
            }
            closeModal();
            loadArticles(currentPage);
            if (window.toast) toast.show('Artikel berhasil dipublikasikan!', 'success');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    };

    // Close Actions
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    // Search & Paging
    searchInput.oninput = api.debounce(() => loadArticles(1), 500);
    prevBtn.onclick = () => loadArticles(currentPage - 1);
    nextBtn.onclick = () => loadArticles(currentPage + 1);

    function escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Init Editor & Load
    initRichEditor();
    loadArticles();
}
