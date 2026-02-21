(function initArticleEditor() {
    'use strict';

    const SESSION_KEY = 'ipmquiz_admin_session';
    const DRAFT_KEY = 'ipmquiz_editor_draft';
    const MIN_WORD_COUNT = 120;
    const DEBOUNCE_MS = 250;

    const state = {
        session: sessionStorage.getItem(SESSION_KEY) || '',
        id: new URLSearchParams(window.location.search).get('id'),
        loading: false,
        savedRange: null,
        currentPane: 'write',
        lint: { errors: [], warnings: [] }
    };

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
        autosaveText: document.getElementById('editor-autosave'),
        saveBtn: document.getElementById('art-save-btn'),
        saveBtnBottom: document.getElementById('art-save-btn-bottom'),
        overlay: document.getElementById('loading-overlay'),
        removeImgBtn: document.getElementById('remove-art-image'),
        cancelBtn: document.getElementById('art-cancel-btn'),
        previewBtn: document.getElementById('previewBtn'),
        splitLayout: document.getElementById('editor-split-layout'),
        tabButtons: Array.from(document.querySelectorAll('.editor-tab-btn')),
        livePreview: document.getElementById('editor-live-preview'),
        lintList: document.getElementById('article-lint-list'),
        blockSelect: document.getElementById('editor-block-style'),
        inlineImageInput: document.getElementById('editor-inline-image'),
        linkPopover: document.getElementById('editor-link-popover'),
        linkInput: document.getElementById('editor-link-input'),
        linkApplyBtn: document.getElementById('editor-link-apply'),
        linkCancelBtn: document.getElementById('editor-link-cancel'),
        imagePopover: document.getElementById('editor-image-popover'),
        imageInput: document.getElementById('editor-image-input'),
        imageApplyBtn: document.getElementById('editor-image-apply'),
        imageUploadBtn: document.getElementById('editor-image-upload')
    };

    function getRenderer() {
        return window.ArticleRenderer || null;
    }

    function debounce(fn, delay) {
        let timer = null;
        return function debounced(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    async function fetchJson(url, init) {
        const opts = { ...(init || {}) };
        if (!opts.credentials) opts.credentials = 'include';
        const res = await fetch(url, opts);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.message || `HTTP ${res.status}`);
        return payload;
    }

    async function apiRequest(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (state.session) headers.Authorization = `Bearer ${state.session}`;
        return fetchJson(path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
    }

    function showLoader(show) {
        if (!els.overlay) return;
        els.overlay.classList.toggle('hidden', !show);
    }

    function notify(message, type) {
        if (window.Toast && typeof window.Toast.show === 'function') {
            window.Toast.show(message, type || 'info');
            return;
        }
        if (message) alert(message);
    }

    function isMobileView() {
        return window.matchMedia('(max-width: 900px)').matches;
    }

    function setPane(pane) {
        state.currentPane = pane === 'preview' ? 'preview' : 'write';
        if (!els.splitLayout) return;
        els.splitLayout.classList.toggle('show-preview', state.currentPane === 'preview');
        els.tabButtons.forEach((btn) => {
            const active = btn.dataset.pane === state.currentPane;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    }

    function updateStatus(wordCount) {
        if (els.statusText) {
            els.statusText.textContent = `Draft • ${wordCount} kata`;
        }
    }

    function updateAutosaveLabel(text) {
        if (els.autosaveText) els.autosaveText.textContent = text;
    }

    function getWordCountFromHtml(html) {
        const renderer = getRenderer();
        const plain = renderer && typeof renderer.stripHtml === 'function'
            ? renderer.stripHtml(html)
            : String(html || '').replace(/<[^>]+>/g, ' ');
        return plain.trim() ? plain.trim().split(/\s+/).length : 0;
    }

    function sanitizeHtml(rawHtml) {
        const renderer = getRenderer();
        if (renderer && typeof renderer.sanitizeArticleHTML === 'function') {
            return renderer.sanitizeArticleHTML(rawHtml, { removeHeadingOne: true });
        }
        return String(rawHtml || '')
            .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
            .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
            .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
            .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
    }

    function saveSelection() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        state.savedRange = sel.getRangeAt(0);
    }

    function restoreSelection() {
        if (!state.savedRange) return;
        const sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(state.savedRange);
    }

    function normalizeHref(raw) {
        const value = String(raw || '').trim();
        if (!value) return '';
        if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
        return `https://${value}`;
    }

    function execCommand(command, value) {
        restoreSelection();
        document.execCommand(command, false, value || null);
        if (els.editorArea) els.editorArea.focus();
        refreshToolbarState();
    }

    function refreshToolbarState() {
        if (!els.toolbar) return;
        const buttons = els.toolbar.querySelectorAll('.tool-btn[data-command]');
        buttons.forEach((btn) => {
            const cmd = btn.dataset.command;
            let active = false;
            try {
                active = document.queryCommandState(cmd);
            } catch {
                active = false;
            }
            btn.classList.toggle('active', Boolean(active));
        });
    }

    function closeAllPopovers() {
        if (els.linkPopover) els.linkPopover.hidden = true;
        if (els.imagePopover) els.imagePopover.hidden = true;
    }

    function openLinkPopover() {
        closeAllPopovers();
        if (!els.linkPopover || !els.linkInput) return;
        els.linkPopover.hidden = false;
        els.linkInput.focus();
    }

    function openImagePopover() {
        closeAllPopovers();
        if (!els.imagePopover || !els.imageInput) return;
        els.imagePopover.hidden = false;
        els.imageInput.focus();
    }

    function applyLink() {
        if (!els.linkInput) return;
        const href = normalizeHref(els.linkInput.value);
        if (!href) {
            notify('URL tautan belum diisi.', 'warning');
            return;
        }
        restoreSelection();
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
            execCommand('createLink', href);
        } else {
            execCommand('insertHTML', `<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>`);
        }
        closeAllPopovers();
        els.linkInput.value = '';
    }

    function applyInlineImageSource(src) {
        const safeSrc = String(src || '').trim();
        if (!safeSrc) return;
        restoreSelection();
        execCommand('insertHTML', `<img src="${safeSrc}" alt="Gambar artikel">`);
    }

    function applyImageFromUrl() {
        if (!els.imageInput) return;
        const value = normalizeHref(els.imageInput.value);
        if (!value) {
            notify('URL gambar belum diisi.', 'warning');
            return;
        }
        applyInlineImageSource(value);
        closeAllPopovers();
        els.imageInput.value = '';
        handleEditorContentChange();
    }

    function handleInlineImageUpload(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const src = evt.target && evt.target.result ? evt.target.result : '';
            if (!src) return;
            applyInlineImageSource(src);
            handleEditorContentChange();
        };
        reader.readAsDataURL(file);
    }

    function getRawArticleForPreview() {
        return {
            id: els.inpId ? els.inpId.value : '',
            title: els.inpTitle ? els.inpTitle.value : '',
            author: els.inpAuthor ? els.inpAuthor.value : '',
            category: els.inpCategory ? els.inpCategory.value : 'Umum',
            publish_date: els.inpDate && els.inpDate.value ? new Date(els.inpDate.value).toISOString() : new Date().toISOString(),
            image: els.inpBase64 ? els.inpBase64.value : '',
            content: sanitizeHtml(els.editorArea ? els.editorArea.innerHTML : '')
        };
    }

    function setupPreviewToc(root, prefix) {
        const toc = root.querySelector(`#${prefix}article-toc`);
        const content = root.querySelector(`#${prefix}article-content-body`);
        if (!toc || !content) return;

        const headings = Array.from(content.querySelectorAll('h2, h3')).filter((el) => (el.textContent || '').trim().length > 0);
        if (headings.length < 2) {
            toc.hidden = true;
            toc.innerHTML = '';
            return;
        }

        const idSet = new Set();
        headings.forEach((heading, index) => {
            const base = (heading.textContent || `bagian-${index + 1}`)
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-') || `bagian-${index + 1}`;
            let id = `${prefix}${base}`;
            while (idSet.has(id)) id = `${id}-${index + 1}`;
            idSet.add(id);
            heading.id = id;
        });

        const tocItems = headings.map((heading) => {
            const level = heading.tagName.toLowerCase();
            return `
                <li class="toc-item ${level === 'h3' ? 'is-sub' : ''}">
                    <a class="toc-link" href="#${heading.id}">${heading.textContent || ''}</a>
                </li>
            `;
        }).join('');
        toc.innerHTML = `
            <div class="toc-title">Daftar Isi</div>
            <ol class="toc-list">${tocItems}</ol>
        `;
        toc.hidden = false;

        toc.onclick = (evt) => {
            const link = evt.target.closest('a.toc-link');
            if (!link) return;
            const target = root.querySelector(link.getAttribute('href'));
            if (!target) return;
            evt.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
    }

    function renderLivePreview() {
        if (!els.livePreview) return;
        const renderer = getRenderer();
        if (!renderer || typeof renderer.buildArticleViewModel !== 'function' || typeof renderer.renderArticleDetailHTML !== 'function') {
            els.livePreview.innerHTML = '<p style="padding:12px">Renderer belum siap.</p>';
            return;
        }

        const article = getRawArticleForPreview();
        const vm = renderer.buildArticleViewModel(article, { url: '/articles' });
        const html = renderer.renderArticleDetailHTML(vm, {
            includeBackLink: false,
            showReadingTools: true,
            showToc: true,
            idPrefix: 'preview-',
            articleClassName: 'article-detail'
        });

        els.livePreview.innerHTML = html;
        const heroImg = els.livePreview.querySelector('.hero-img');
        if (heroImg) {
            if (heroImg.complete) heroImg.classList.add('is-loaded');
            else heroImg.addEventListener('load', () => heroImg.classList.add('is-loaded'), { once: true });
        }
        setupPreviewToc(els.livePreview, 'preview-');
    }

    function runStructureLint() {
        const errors = [];
        const warnings = [];
        const rawContent = els.editorArea ? els.editorArea.innerHTML : '';
        const contentHtml = sanitizeHtml(rawContent);
        const wordCount = getWordCountFromHtml(contentHtml);
        const title = String(els.inpTitle ? els.inpTitle.value : '').trim();
        const author = String(els.inpAuthor ? els.inpAuthor.value : '').trim();

        if (title.length < 12) errors.push('Judul minimal 12 karakter.');
        if (!author) errors.push('Penulis wajib diisi.');
        if (wordCount < MIN_WORD_COUNT) errors.push(`Konten minimal ${MIN_WORD_COUNT} kata.`);

        const parser = new DOMParser();
        const doc = parser.parseFromString(rawContent, 'text/html');
        const h1Count = doc.querySelectorAll('h1').length;
        if (h1Count > 1) warnings.push('Terdapat lebih dari satu H1 pada konten.');

        let foundH2 = false;
        let hasH3BeforeH2 = false;
        const headings = Array.from(doc.querySelectorAll('h2, h3'));
        headings.forEach((heading) => {
            if (heading.tagName.toLowerCase() === 'h2') foundH2 = true;
            if (heading.tagName.toLowerCase() === 'h3' && !foundH2) {
                hasH3BeforeH2 = true;
            }
        });
        if (hasH3BeforeH2) warnings.push('H3 ditemukan sebelum H2.');

        const images = Array.from(doc.querySelectorAll('img'));
        const imageWithoutAlt = images.some((img) => !(img.getAttribute('alt') || '').trim());
        if (imageWithoutAlt) warnings.push('Sebagian gambar belum memiliki alt text.');

        state.lint = { errors, warnings };
        renderLintPanel(errors, warnings);
        return state.lint;
    }

    function renderLintPanel(errors, warnings) {
        if (!els.lintList) return;
        const rows = [];
        errors.forEach((message) => {
            rows.push(`<li class="article-lint-item error"><i class="fas fa-circle-exclamation"></i><span>${message}</span></li>`);
        });
        warnings.forEach((message) => {
            rows.push(`<li class="article-lint-item warning"><i class="fas fa-triangle-exclamation"></i><span>${message}</span></li>`);
        });
        if (!rows.length) {
            rows.push('<li class="article-lint-item success"><i class="fas fa-circle-check"></i><span>Struktur artikel sudah rapi dan siap publish.</span></li>');
        }
        els.lintList.innerHTML = rows.join('');
    }

    function saveDraft() {
        if (state.id) return;
        const payload = {
            title: els.inpTitle ? els.inpTitle.value : '',
            author: els.inpAuthor ? els.inpAuthor.value : '',
            category: els.inpCategory ? els.inpCategory.value : 'Umum',
            publishDate: els.inpDate ? els.inpDate.value : '',
            content: els.editorArea ? els.editorArea.innerHTML : '',
            image: els.inpBase64 ? els.inpBase64.value : '',
            ts: Date.now()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        updateAutosaveLabel(`Draft tersimpan ${new Date(payload.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
    }

    function loadDraft() {
        if (state.id) return;
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        try {
            const draft = JSON.parse(raw);
            if (!draft || !draft.ts || Date.now() - draft.ts > 2 * 60 * 60 * 1000) return;
            if (!confirm('Lanjutkan draft artikel terakhir?')) {
                localStorage.removeItem(DRAFT_KEY);
                return;
            }
            if (els.inpTitle) els.inpTitle.value = draft.title || '';
            if (els.inpAuthor) els.inpAuthor.value = draft.author || '';
            if (els.inpCategory) els.inpCategory.value = draft.category || 'Umum';
            if (els.inpDate && draft.publishDate) els.inpDate.value = draft.publishDate;
            if (els.editorArea) els.editorArea.innerHTML = draft.content || '';
            if (els.inpBase64 && draft.image) {
                els.inpBase64.value = draft.image;
                if (els.previewDiv) {
                    const img = els.previewDiv.querySelector('img');
                    if (img) img.src = draft.image;
                    els.previewDiv.style.display = 'block';
                }
            }
            updateAutosaveLabel(`Draft dipulihkan ${new Date(draft.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
        } catch {
            // ignore invalid draft
        }
    }

    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
    }

    function updateWordAndStatus() {
        const count = getWordCountFromHtml(els.editorArea ? els.editorArea.innerHTML : '');
        updateStatus(count);
    }

    const handleEditorContentChange = debounce(() => {
        updateWordAndStatus();
        saveDraft();
        runStructureLint();
        renderLivePreview();
    }, DEBOUNCE_MS);

    function bindCoverImageUpload() {
        if (els.inpFile) {
            els.inpFile.onchange = () => {
                const file = els.inpFile.files && els.inpFile.files[0];
                if (!file) return;
                if (file.size > 250 * 1024) {
                    notify('Ukuran gambar maksimal 250KB.', 'warning');
                    els.inpFile.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const result = evt.target && evt.target.result ? evt.target.result : '';
                    if (!result) return;
                    if (els.inpBase64) els.inpBase64.value = result;
                    if (els.previewDiv) {
                        const img = els.previewDiv.querySelector('img');
                        if (img) img.src = result;
                        els.previewDiv.style.display = 'block';
                    }
                    handleEditorContentChange();
                };
                reader.readAsDataURL(file);
            };
        }

        if (els.removeImgBtn) {
            els.removeImgBtn.onclick = () => {
                if (els.inpBase64) els.inpBase64.value = '';
                if (els.inpFile) els.inpFile.value = '';
                if (els.previewDiv) els.previewDiv.style.display = 'none';
                handleEditorContentChange();
            };
        }
    }

    function bindToolbar() {
        if (!els.toolbar || !els.editorArea) return;
        try {
            document.execCommand('styleWithCSS', false, true);
        } catch {
            // unsupported on some browsers
        }

        const commandButtons = els.toolbar.querySelectorAll('.tool-btn');
        commandButtons.forEach((btn) => {
            btn.addEventListener('mousedown', saveSelection);
            btn.addEventListener('click', (evt) => {
                evt.preventDefault();
                const action = btn.dataset.action;
                const command = btn.dataset.command;
                if (action === 'link') {
                    openLinkPopover();
                    return;
                }
                if (action === 'image') {
                    openImagePopover();
                    return;
                }
                if (!command) return;
                execCommand(command, btn.dataset.value || null);
                handleEditorContentChange();
            });
        });

        if (els.blockSelect) {
            els.blockSelect.addEventListener('change', () => {
                const value = els.blockSelect.value || 'p';
                const block = value === 'p' ? 'P' : value.toUpperCase();
                execCommand('formatBlock', block);
                handleEditorContentChange();
            });
        }

        if (els.linkApplyBtn) els.linkApplyBtn.addEventListener('click', applyLink);
        if (els.linkCancelBtn) els.linkCancelBtn.addEventListener('click', closeAllPopovers);
        if (els.imageApplyBtn) els.imageApplyBtn.addEventListener('click', applyImageFromUrl);
        if (els.imageUploadBtn && els.inlineImageInput) {
            els.imageUploadBtn.addEventListener('click', () => els.inlineImageInput.click());
        }

        if (els.inlineImageInput) {
            els.inlineImageInput.addEventListener('change', () => {
                const file = els.inlineImageInput.files && els.inlineImageInput.files[0];
                if (!file) return;
                handleInlineImageUpload(file);
                els.inlineImageInput.value = '';
                closeAllPopovers();
            });
        }

        els.editorArea.addEventListener('keydown', (evt) => {
            if (!(evt.ctrlKey || evt.metaKey)) return;
            const key = String(evt.key || '').toLowerCase();
            if (key === 'b') {
                evt.preventDefault();
                execCommand('bold');
                handleEditorContentChange();
                return;
            }
            if (key === 'i') {
                evt.preventDefault();
                execCommand('italic');
                handleEditorContentChange();
                return;
            }
            if (key === 'k') {
                evt.preventDefault();
                openLinkPopover();
            }
        });

        els.editorArea.addEventListener('paste', (evt) => {
            evt.preventDefault();
            const html = evt.clipboardData.getData('text/html');
            const text = evt.clipboardData.getData('text/plain');
            let sanitized = '';
            if (html) {
                sanitized = sanitizeHtml(html);
            } else {
                sanitized = String(text || '')
                    .split(/\n{2,}/)
                    .map((line) => `<p>${line.trim()}</p>`)
                    .join('');
            }
            execCommand('insertHTML', sanitized);
            handleEditorContentChange();
        });

        ['keyup', 'mouseup', 'focus'].forEach((name) => {
            els.editorArea.addEventListener(name, () => {
                saveSelection();
                refreshToolbarState();
            });
        });

        document.addEventListener('selectionchange', () => {
            if (document.activeElement === els.editorArea) {
                saveSelection();
                refreshToolbarState();
            }
        });

        document.addEventListener('click', (evt) => {
            const isPopover = evt.target.closest('.editor-popover');
            const isTool = evt.target.closest('.tool-btn[data-action]');
            if (!isPopover && !isTool) closeAllPopovers();
        });
    }

    function bindPaneToggle() {
        if (els.tabButtons.length) {
            els.tabButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    setPane(btn.dataset.pane);
                });
            });
        }

        if (els.previewBtn) {
            els.previewBtn.addEventListener('click', () => {
                if (isMobileView()) {
                    setPane('preview');
                    return;
                }
                if (els.livePreview) {
                    els.livePreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        window.addEventListener('resize', () => {
            if (!isMobileView()) setPane('write');
        });
    }

    async function loadExistingArticle() {
        if (!state.id) return;
        showLoader(true);
        try {
            const data = await fetchJson(`/api/articles?id=${state.id}`);
            if (data.status !== 'success' || !data.article) throw new Error('Artikel tidak ditemukan');
            const article = data.article;
            if (els.inpId) els.inpId.value = article.id || '';
            if (els.inpTitle) els.inpTitle.value = article.title || '';
            if (els.inpAuthor) els.inpAuthor.value = article.author || '';
            if (els.inpCategory) els.inpCategory.value = article.category || 'Umum';
            if (els.editorArea) els.editorArea.innerHTML = sanitizeHtml(article.content || '');
            if (els.inpDate) {
                const date = new Date(article.publish_date || Date.now());
                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                els.inpDate.value = date.toISOString().slice(0, 16);
            }
            if (article.image && els.inpBase64) {
                els.inpBase64.value = article.image;
                if (els.previewDiv) {
                    const img = els.previewDiv.querySelector('img');
                    if (img) img.src = article.image;
                    els.previewDiv.style.display = 'block';
                }
            }
        } finally {
            showLoader(false);
        }
    }

    function buildPayload() {
        const publishIso = els.inpDate && els.inpDate.value
            ? new Date(els.inpDate.value).toISOString()
            : new Date().toISOString();

        return {
            id: els.inpId ? els.inpId.value : '',
            title: els.inpTitle ? els.inpTitle.value.trim() : '',
            author: els.inpAuthor ? els.inpAuthor.value.trim() : '',
            category: els.inpCategory ? els.inpCategory.value : 'Umum',
            content: sanitizeHtml(els.editorArea ? els.editorArea.innerHTML : ''),
            image: els.inpBase64 ? els.inpBase64.value : '',
            publish_date: publishIso
        };
    }

    function bindFormActions() {
        if (els.cancelBtn) {
            els.cancelBtn.addEventListener('click', () => {
                window.location.href = 'admin.html#articles';
            });
        }

        if (!els.form) return;
        els.form.addEventListener('submit', async (evt) => {
            evt.preventDefault();
            runStructureLint();
            if (state.lint.errors.length > 0) {
                notify('Perbaiki error kualitas artikel sebelum publish.', 'error');
                return;
            }

            const payload = buildPayload();
            const method = payload.id ? 'PUT' : 'POST';
            const oldTop = els.saveBtn ? els.saveBtn.innerHTML : '';
            const oldBottom = els.saveBtnBottom ? els.saveBtnBottom.innerHTML : '';

            if (els.saveBtn) {
                els.saveBtn.disabled = true;
                els.saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
            }
            if (els.saveBtnBottom) {
                els.saveBtnBottom.disabled = true;
                els.saveBtnBottom.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
            }

            try {
                await apiRequest(method, '/api/articles', payload);
                clearDraft();
                notify('Artikel berhasil dipublikasikan.', 'success');
                setTimeout(() => {
                    window.location.href = 'admin.html#articles';
                }, 700);
            } catch (err) {
                notify(`Gagal simpan: ${err.message}`, 'error');
                if (els.saveBtn) {
                    els.saveBtn.disabled = false;
                    els.saveBtn.innerHTML = oldTop;
                }
                if (els.saveBtnBottom) {
                    els.saveBtnBottom.disabled = false;
                    els.saveBtnBottom.innerHTML = oldBottom;
                }
            }
        });
    }

    function bindInputObservers() {
        const fields = [els.inpTitle, els.inpAuthor, els.inpCategory, els.inpDate, els.editorArea];
        fields.forEach((field) => {
            if (!field) return;
            field.addEventListener('input', handleEditorContentChange);
            field.addEventListener('change', handleEditorContentChange);
        });
    }

    async function initialize() {
        if (!state.session) {
            window.location.href = 'admin.html';
            return;
        }

        bindPaneToggle();
        bindCoverImageUpload();
        bindToolbar();
        bindInputObservers();
        bindFormActions();

        if (state.id) {
            await loadExistingArticle();
            updateAutosaveLabel('Mode edit artikel');
        } else {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            if (els.inpDate) els.inpDate.value = now.toISOString().slice(0, 16);
            loadDraft();
        }

        updateWordAndStatus();
        runStructureLint();
        renderLivePreview();
        refreshToolbarState();
    }

    initialize().catch((err) => {
        notify(err.message || 'Gagal memuat editor.', 'error');
    });
})();
