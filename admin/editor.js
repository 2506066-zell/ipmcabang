(() => {
    const SESSION_KEY = 'ipmquiz_admin_session';
    const DRAFT_KEY = 'ipmquiz_editor_draft';

    const state = {
        session: sessionStorage.getItem(SESSION_KEY) || '',
        id: new URLSearchParams(window.location.search).get('id'),
        loading: false
    };

    // Elements
    const els = {
        form: document.getElementById('article-form'),
        inpId: document.getElementById('art-id'),
        inpTitle: document.getElementById('art-title'),
        inpAuthor: document.getElementById('art-author'),
        inpCategory: document.getElementById('art-category'),
        inpDate: document.getElementById('art-date'),
        inpFile: document.getElementById('art-image-file'),
        inpBase64: document.getElementById('art-image-base64'),
        previewDiv: document.getElementById('art-image-preview'),
        editorArea: document.getElementById('art-editor'),
        inpContent: document.getElementById('art-content'),
        toolbar: document.getElementById('editor-toolbar'),
        statusText: document.getElementById('editor-status'),
        saveBtn: document.getElementById('art-save-btn'),
        saveBtnBottom: document.getElementById('art-save-btn-bottom'),
        overlay: document.getElementById('loading-overlay'),
        removeImgBtn: document.getElementById('remove-art-image'),
        cancelBtn: document.getElementById('art-cancel-btn')
    };

    // --- UTILS ---
    async function fetchJson(url, init = {}) {
        if (!init.credentials) init.credentials = 'include';
        const response = await fetch(url, init);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
        return data;
    }

    async function apiRequest(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (state.session) headers['Authorization'] = `Bearer ${state.session}`;
        return await fetchJson(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    }

    function showLoader(show = true) {
        els.overlay.classList.toggle('hidden', !show);
    }

    function updateWordCount() {
        const text = els.editorArea.innerText || "";
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        els.statusText.textContent = `Draft • ${words} kata`;
        // Auto-save draft
        saveDraft();
    }

    // --- DRAFT LOGIC ---
    function saveDraft() {
        const draft = {
            title: els.inpTitle.value,
            author: els.inpAuthor.value,
            category: els.inpCategory.value,
            content: els.editorArea.innerHTML,
            ts: Date.now()
        };
        if (!state.id) {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
    }

    function loadDraft() {
        if (state.id) return; // Don't load draft when editing existing
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
            try {
                const d = JSON.parse(saved);
                // Only load if recent (last 2 hours)
                if (Date.now() - d.ts < 120 * 60 * 1000) {
                    if (confirm('Lanjutkan tulisan terakhir Anda yang belum disimpan?')) {
                        els.inpTitle.value = d.title || '';
                        els.inpAuthor.value = d.author || '';
                        els.inpCategory.value = d.category || 'Umum';
                        els.editorArea.innerHTML = d.content || '';
                        updateWordCount();
                    } else {
                        localStorage.removeItem(DRAFT_KEY);
                    }
                }
            } catch (e) { }
        }
    }

    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
    }

    // --- EDITOR ---
    function initRichEditor() {
        if (!els.toolbar || !els.editorArea) return;

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
            els.editorArea.focus();
        };

        const applyFontSize = (size) => {
            restoreSelection();
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            document.execCommand('fontSize', false, '7');
            const root = range.commonAncestorContainer.nodeType === 1
                ? range.commonAncestorContainer
                : range.commonAncestorContainer.parentElement;
            const fonts = root ? root.querySelectorAll('font[size="7"]') : [];
            fonts.forEach(f => {
                if (!range.intersectsNode(f)) return;
                f.removeAttribute('size');
                f.style.fontSize = size;
            });
            els.editorArea.focus();
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

        els.toolbar.querySelectorAll('.tool-btn').forEach(btn => {
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

        const lineSpacing = document.getElementById('editor-line-spacing');
        if (lineSpacing) {
            lineSpacing.onchange = (e) => {
                els.editorArea.style.lineHeight = e.target.value;
                els.editorArea.focus();
            };
            els.editorArea.style.lineHeight = lineSpacing.value;
            lineSpacing.onmousedown = saveSelection;
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
            els.editorArea.addEventListener(evt, saveSelection);
        });

        document.addEventListener('selectionchange', () => {
            if (document.activeElement === els.editorArea) {
                saveSelection();
            }
        });

        els.editorArea.oninput = updateWordCount;
        els.inpTitle.oninput = saveDraft;
    }

    // --- IMAGE HANDLING ---
    els.inpFile.onchange = () => {
        const file = els.inpFile.files[0];
        if (!file) return;

        if (file.size > 250 * 1024) {
            alert('Ukuran gambar maksimal 250KB!');
            els.inpFile.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const res = e.target.result;
            els.inpBase64.value = res;
            els.previewDiv.querySelector('img').src = res;
            els.previewDiv.style.display = 'block';
        };
        reader.readAsDataURL(file);
    };

    els.removeImgBtn.onclick = () => {
        els.inpBase64.value = '';
        els.inpFile.value = '';
        els.previewDiv.style.display = 'none';
    };

    // --- DATA LOADING ---
    async function loadData() {
        if (!state.session) {
            window.location.href = 'admin.html';
            return;
        }

        if (state.id) {
            showLoader(true);
            try {
                const data = await fetchJson(`/api/articles?id=${state.id}`);
                if (data.status === 'success' && data.article) {
                    const a = data.article;
                    els.inpId.value = a.id;
                    els.inpTitle.value = a.title;
                    els.inpAuthor.value = a.author || '';
                    els.inpCategory.value = a.category || 'Umum';
                    els.editorArea.innerHTML = a.content || '';

                    const d = new Date(a.publish_date);
                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                    els.inpDate.value = d.toISOString().slice(0, 16);

                    if (a.image) {
                        els.inpBase64.value = a.image;
                        els.previewDiv.querySelector('img').src = a.image;
                        els.previewDiv.style.display = 'block';
                    }
                    updateWordCount();
                }
            } catch (e) {
                alert('Gagal memuat artikel: ' + e.message);
                window.location.href = 'admin.html#articles';
            } finally {
                showLoader(false);
            }
        } else {
            // New Article
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            els.inpDate.value = now.toISOString().slice(0, 16);
            loadDraft();
        }
    }

    // --- SAVE ---
    els.form.onsubmit = async (e) => {
        e.preventDefault();

        const payload = {
            id: els.inpId.value,
            title: els.inpTitle.value,
            author: els.inpAuthor.value,
            category: els.inpCategory.value,
            content: els.editorArea.innerHTML,
            image: els.inpBase64.value,
            publish_date: els.inpDate.value ? new Date(els.inpDate.value).toISOString() : new Date().toISOString()
        };

        const oldHtml = els.saveBtn ? els.saveBtn.innerHTML : '';
        const oldHtmlBottom = els.saveBtnBottom ? els.saveBtnBottom.innerHTML : '';
        els.saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        els.saveBtn.disabled = true;
        if (els.saveBtnBottom) {
            els.saveBtnBottom.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
            els.saveBtnBottom.disabled = true;
        }

        try {
            const method = payload.id ? 'PUT' : 'POST';
            await apiRequest(method, '/api/articles', payload);
            clearDraft();
            if (window.Toast) window.Toast.show('Artikel dipublikasikan!', 'success');
            setTimeout(() => {
                window.location.href = 'admin.html#articles';
            }, 1000);
        } catch (err) {
            alert('Gagal simpan: ' + err.message);
            if (els.saveBtn) {
                els.saveBtn.innerHTML = oldHtml;
                els.saveBtn.disabled = false;
            }
            if (els.saveBtnBottom) {
                els.saveBtnBottom.innerHTML = oldHtmlBottom;
                els.saveBtnBottom.disabled = false;
            }
        }
    };

    if (els.cancelBtn) {
        els.cancelBtn.addEventListener('click', () => {
            window.location.href = 'admin.html#articles';
        });
    }

    // Initialize
    initRichEditor();
    loadData();

})();
