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
        overlay: document.getElementById('loading-overlay'),
        removeImgBtn: document.getElementById('remove-art-image')
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
        els.toolbar.querySelectorAll('.tool-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                const value = btn.dataset.value || null;
                document.execCommand(command, false, value);
                els.editorArea.focus();
            };
        });

        const colorPicker = document.getElementById('editor-color-picker');
        if (colorPicker) {
            colorPicker.oninput = (e) => {
                document.execCommand('foreColor', false, e.target.value);
                els.editorArea.focus();
            };
        }

        const lineSpacing = document.getElementById('editor-line-spacing');
        if (lineSpacing) {
            lineSpacing.onchange = (e) => {
                els.editorArea.style.lineHeight = e.target.value;
                els.editorArea.focus();
            };
        }

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

        const oldHtml = els.saveBtn.innerHTML;
        els.saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        els.saveBtn.disabled = true;

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
            els.saveBtn.innerHTML = oldHtml;
            els.saveBtn.disabled = false;
        }
    };

    // Initialize
    initRichEditor();
    loadData();

})();
