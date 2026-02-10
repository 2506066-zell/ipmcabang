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

        try { document.execCommand('styleWithCSS', false, true); } catch (e) { }

        let savedRange = null;

        const saveSelection = () => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                savedRange = sel.getRangeAt(0);
            }
        };

        const restoreSelection = () => {
            if (!savedRange) return;
            const sel = window.getSelection();
            if (!sel) return;
            sel.removeAllRanges();
            sel.addRange(savedRange);
        };

        const exec = (command, value = null) => {
            restoreSelection();
            document.execCommand(command, false, value);
            editorArea.focus();
        };

        const applyFontSize = (size) => {
            document.execCommand('fontSize', false, '7');
            const fonts = editorArea.querySelectorAll('font[size="7"]');
            fonts.forEach(f => {
                f.removeAttribute('size');
                f.style.fontSize = size;
            });
            editorArea.focus();
        };

        const applyLink = () => {
            let url = prompt('Masukkan URL tautan:');
            if (!url) return;
            if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) exec('createLink', url);
            else exec('insertHTML', `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
        };

        const applyImageUrl = () => {
            let url = prompt('URL gambar (kosongkan untuk upload):');
            if (url) {
                if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                exec('insertImage', url);
                return;
            }
            const fileInput = document.getElementById('editor-inline-image');
            if (fileInput) fileInput.click();
        };

        toolbar.querySelectorAll('.tool-btn').forEach(btn => {
            btn.onmousedown = saveSelection;
            btn.onclick = (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                const action = btn.dataset.action;
                if (action === 'link') return applyLink();
                if (action === 'image') return applyImageUrl();
                if (command) exec(command, btn.dataset.value || null);
            };
        });

        // Color Picker
        const colorPicker = document.getElementById('editor-color-picker');
        if (colorPicker) {
            colorPicker.oninput = (e) => exec('foreColor', e.target.value);
            colorPicker.onmousedown = saveSelection;
        }

        const fontFamily = document.getElementById('editor-font-family');
        if (fontFamily) {
            fontFamily.onchange = (e) => exec('fontName', e.target.value);
            fontFamily.onmousedown = saveSelection;
        }

        const fontSize = document.getElementById('editor-font-size');
        if (fontSize) {
            fontSize.onchange = (e) => applyFontSize(e.target.value);
            fontSize.onmousedown = saveSelection;
        }

        // Line Spacing
        const lineSpacingSelector = document.getElementById('editor-line-spacing');
        if (lineSpacingSelector) {
            lineSpacingSelector.onchange = (e) => {
                editorArea.style.lineHeight = e.target.value;
                editorArea.focus();
            };
            editorArea.style.lineHeight = lineSpacingSelector.value;
            lineSpacingSelector.onmousedown = saveSelection;
        }

        const inlineImage = document.getElementById('editor-inline-image');
        if (inlineImage) {
            inlineImage.onchange = () => {
                const file = inlineImage.files && inlineImage.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const src = evt.target && evt.target.result ? evt.target.result : '';
                    if (src) exec('insertImage', src);
                };
                reader.readAsDataURL(file);
                inlineImage.value = '';
            };
        }

        ['keyup', 'mouseup', 'focus', 'blur'].forEach(evt => {
            editorArea.addEventListener(evt, saveSelection);
        });

        document.addEventListener('selectionchange', () => {
            if (document.activeElement === editorArea) {
                saveSelection();
            }
        });

        // Sync content to hidden textarea on change
        editorArea.oninput = () => {
            if (inpContent) inpContent.value = editorArea.innerHTML;
            updateWordCount();
        };
    }

    function updateWordCount() {
        if (!editorArea) return;
        const text = editorArea.innerText || "";
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        if (statusText) statusText.textContent = `Draft • ${words} kata`;
    }

    // Load Articles
    async function loadArticles(page = 1) {
        if (!list) return;
        state.loading = true;
        list.innerHTML = '<div style="text-align:center; padding:20px;">Memuat...</div>';

        try {
            const q = searchInput ? (searchInput.value || '') : '';
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
        if (!list) return;
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

    function setDateInputToLocal(date, targetInput) {
        if (!targetInput) return;
        const d = date instanceof Date ? date : new Date(date || Date.now());
        if (Number.isNaN(d.getTime())) return;
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        targetInput.value = d.toISOString().slice(0, 16);
    }

    function setPreviewImage(src) {
        if (!previewDiv) return;
        const img = previewDiv.querySelector('img');
        if (img) img.src = src || '';
        previewDiv.style.display = src ? 'block' : 'none';
    }

    function resetForm() {
        if (inpId) inpId.value = '';
        if (inpTitle) inpTitle.value = '';
        if (inpAuthor) inpAuthor.value = '';
        if (inpCategory) inpCategory.value = 'Umum';
        if (inpDate) setDateInputToLocal(new Date(), inpDate);
        if (editorArea) editorArea.innerHTML = '';
        if (inpContent) inpContent.value = '';
        if (inpBase64) inpBase64.value = '';
        if (inpFile) inpFile.value = '';
        setPreviewImage('');
        updateWordCount();
    }

    async function loadArticleIntoForm(id) {
        const data = await api.fetchJsonWithRetry(`/api/articles?id=${id}`, { method: 'GET' });
        if (!data || data.status !== 'success' || !data.article) {
            throw new Error('Artikel tidak ditemukan');
        }

        const a = data.article;
        if (inpId) inpId.value = a.id || '';
        if (inpTitle) inpTitle.value = a.title || '';
        if (inpAuthor) inpAuthor.value = a.author || '';
        if (inpCategory) inpCategory.value = a.category || 'Umum';
        if (editorArea) editorArea.innerHTML = a.content || '';
        if (inpContent) inpContent.value = a.content || '';
        if (inpDate) setDateInputToLocal(a.publish_date, inpDate);
        if (a.image) setPreviewImage(a.image);
        else setPreviewImage('');
        updateWordCount();
    }

    // Modal Logic
    function openModal() {
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus title with instant feel
        requestAnimationFrame(() => {
            if (!inpTitle) return;
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
        if (!modal) return;
        modal.classList.remove('active');
        modal.classList.remove('focus-mode');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // Create/Edit
    if (addBtn) {
        addBtn.onclick = () => {
            window.location.href = 'editor.html';
        };
    }

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
    if (inpFile) {
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
                if (inpBase64) inpBase64.value = res;
                setPreviewImage(res);
            };
            reader.readAsDataURL(file);
        };
    }

    if (removeImgBtn) {
        removeImgBtn.onclick = () => {
            if (inpBase64) inpBase64.value = '';
            if (inpFile) inpFile.value = '';
            setPreviewImage('');
        };
    }

    // Save
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            // Final sync
            if (editorArea && inpContent) inpContent.value = editorArea.innerHTML;

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
            if (!btn) return;
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
    }

    // Close Actions
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    // Search & Paging
    if (searchInput) searchInput.oninput = api.debounce(() => loadArticles(1), 500);
    if (prevBtn) prevBtn.onclick = () => loadArticles(currentPage - 1);
    if (nextBtn) nextBtn.onclick = () => loadArticles(currentPage + 1);

    function escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Init Editor & Load
    initRichEditor();

    // Focus Mode: reduce distractions while typing
    function setFocusMode(enabled) {
        if (!modal) return;
        modal.classList.toggle('focus-mode', !!enabled);
    }

    if (editorArea && modal) {
        editorArea.addEventListener('focus', () => setFocusMode(true));
        editorArea.addEventListener('blur', () => {
            setTimeout(() => {
                const active = document.activeElement;
                if (!modal.contains(active)) return setFocusMode(false);
                if (active === editorArea) return;
                if (toolbar && toolbar.contains(active)) return;
                setFocusMode(false);
            }, 0);
        });
    }

    if (toolbar && modal) {
        toolbar.addEventListener('mousedown', () => setFocusMode(true));
    }

    loadArticles();
}
