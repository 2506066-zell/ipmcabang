(() => {
    const state = {
        auth: null,
        items: [],
        mySubmissions: [],
        filter: 'all',
        mode: 'picker',
        activeSlug: '',
        activeForm: null
    };

    const els = {};

    function $(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function fetchJson(url, init = {}) {
        const response = await fetch(url, { credentials: 'include', ...init });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const error = new Error(data?.message || `HTTP ${response.status}`);
            error.status = response.status;
            throw error;
        }
        return data;
    }

    function setMode(mode) {
        state.mode = mode === 'filling' ? 'filling' : 'picker';
        document.body.classList.toggle('mode-filling', state.mode === 'filling');
        document.body.classList.toggle('mode-picker', state.mode !== 'filling');
    }

    function setAuthState(text) {
        if (els.authState) els.authState.textContent = text;
    }

    function setPanelCopy(text) {
        if (els.panelCopy) els.panelCopy.textContent = text;
    }

    function filteredItems() {
        return state.items.filter((item) => state.filter === 'all' || item.type === state.filter);
    }

    function formatDate(value) {
        try {
            return new Date(value).toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '-';
        }
    }

    function autosaveStorageKey(slug) {
        return `ipm_forms_draft_${slug}`;
    }

    function readDraft(slug) {
        try {
            return JSON.parse(localStorage.getItem(autosaveStorageKey(slug)) || '{}');
        } catch {
            return {};
        }
    }

    function saveDraft(slug, answers) {
        if (!slug) return;
        localStorage.setItem(autosaveStorageKey(slug), JSON.stringify({
            updated_at: new Date().toISOString(),
            answers
        }));
    }

    function clearDraft(slug) {
        if (!slug) return;
        localStorage.removeItem(autosaveStorageKey(slug));
    }

    function updateStats() {
        const items = state.items;
        const submitted = items.filter((item) => item.already_submitted).length;
        if (els.statActive) els.statActive.textContent = String(items.length);
        if (els.statSubmitted) els.statSubmitted.textContent = String(submitted);
    }

    function renderPickerEmpty(message) {
        if (!els.list) return;
        els.list.innerHTML = `<div class="forms-empty-state">${escapeHtml(message || 'Belum ada form tersedia.')}</div>`;
    }

    function renderFormsList() {
        if (!els.list) return;
        const items = filteredItems();
        if (!items.length) {
            renderPickerEmpty('Belum ada form pada filter ini.');
            return;
        }
        els.list.innerHTML = items.map((item) => `
            <button type="button" class="forms-list-card ${item.slug === state.activeSlug ? 'active' : ''}" data-slug="${escapeHtml(item.slug)}">
                <div class="forms-card-meta">
                    <span class="forms-form-type">${escapeHtml(item.type)}</span>
                    <span class="forms-meta-pill">${item.already_submitted ? 'Sudah submit' : 'Belum submit'}</span>
                </div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description || 'Form evaluasi.')}</p>
                <div class="forms-inline-meta">
                    <span class="forms-meta-pill">${Number(item.submission_count || 0)} pengisi</span>
                    <span class="forms-meta-pill">${item.already_submitted ? 'Lihat form' : 'Mulai isi'}</span>
                </div>
            </button>
        `).join('');
    }

    async function loadAuth() {
        try {
            const data = await fetchJson('/api/auth?action=me');
            state.auth = data.user || null;
            setAuthState(`Login: ${state.auth?.nama_panjang || state.auth?.username || 'user'}`);
        } catch {
            state.auth = null;
            setAuthState('Belum login');
        }
    }

    async function loadMySubmissions() {
        if (!state.auth) {
            state.mySubmissions = [];
            return;
        }
        try {
            const data = await fetchJson('/api/forms?action=mySubmissions');
            state.mySubmissions = Array.isArray(data.items) ? data.items : [];
        } catch {
            state.mySubmissions = [];
        }
    }

    async function loadForms() {
        setPanelCopy('Pilih satu form lalu mulai isi.');
        const data = await fetchJson('/api/forms?action=listPublished');
        state.items = Array.isArray(data.items) ? data.items : [];
        updateStats();
        renderFormsList();
    }

    function renderFocusError(message) {
        els.stage.innerHTML = `
            <div class="forms-empty-stage">
                <div class="forms-empty-icon"><i class="fas fa-triangle-exclamation"></i></div>
                <h2>Form tidak tersedia</h2>
                <p>${escapeHtml(message || 'Form belum bisa dibuka.')}</p>
            </div>
        `;
    }

    function buildFieldInput(field, draftValue) {
        const value = draftValue ?? '';
        const errorId = `forms-error-${field.id}`;

        if (field.field_type === 'paragraph') {
            return `
                <textarea class="forms-textarea" data-field-id="${field.id}" aria-describedby="${errorId}" placeholder="${escapeHtml(field.placeholder || 'Tulis jawaban')}">${escapeHtml(value)}</textarea>
                <div id="${errorId}" class="forms-inline-error" hidden></div>
            `;
        }

        if (field.field_type === 'short_text') {
            return `
                <input class="forms-text-input" data-field-id="${field.id}" value="${escapeHtml(value)}" aria-describedby="${errorId}" placeholder="${escapeHtml(field.placeholder || 'Tulis jawaban')}">
                <div id="${errorId}" class="forms-inline-error" hidden></div>
            `;
        }

        if (field.field_type === 'dropdown') {
            const options = ['<option value="">Pilih...</option>']
                .concat((field.options_json || []).map((option) => `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`))
                .join('');
            return `
                <select class="forms-select" data-field-id="${field.id}" aria-describedby="${errorId}">${options}</select>
                <div id="${errorId}" class="forms-inline-error" hidden></div>
            `;
        }

        const currentValues = Array.isArray(value) ? value : [value].filter(Boolean);
        const type = field.field_type === 'multiple_choice' ? 'checkbox' : 'radio';
        return `
            <div class="forms-options">
                ${(field.options_json || []).map((option, idx) => {
                    const inputId = `field-${field.id}-${idx}`;
                    const checked = currentValues.includes(option);
                    return `
                        <label class="forms-choice-label" for="${inputId}">
                            <input id="${inputId}" type="${type}" name="field-${field.id}" data-field-id="${field.id}" value="${escapeHtml(option)}" ${checked ? 'checked' : ''}>
                            <span>${escapeHtml(option)}</span>
                        </label>
                    `;
                }).join('')}
            </div>
            <div id="${errorId}" class="forms-inline-error" hidden></div>
        `;
    }

    function getDraftAnswers(form) {
        return readDraft(form.slug)?.answers || {};
    }

    function renderSuccess(form) {
        const latest = state.mySubmissions.find((item) => item.form_id === form.id) || form.my_submission;
        els.stage.innerHTML = `
            <article class="forms-success-card">
                <div class="forms-success-icon"><i class="fas fa-check"></i></div>
                <span class="forms-form-type">${escapeHtml(form.type)}</span>
                <h2>Jawaban terkirim</h2>
                <p>Form berhasil dikirim.</p>
                <div class="forms-success-meta">
                    <span>${escapeHtml(form.title)}</span>
                    <span>${latest?.submitted_at ? formatDate(latest.submitted_at) : 'Baru saja'}</span>
                </div>
                <div class="forms-result-meta">
                    <button type="button" class="forms-secondary-btn" id="forms-back-to-picker">Kembali ke daftar</button>
                </div>
            </article>
        `;
        $('forms-back-to-picker')?.addEventListener('click', () => {
            setMode('picker');
            state.activeForm = null;
            state.activeSlug = '';
            const url = new URL(window.location.href);
            url.searchParams.delete('slug');
            window.history.replaceState({}, '', url.toString());
            renderFormsList();
        });
    }

    function renderForm(form) {
        const draftAnswers = getDraftAnswers(form);
        const total = form.fields.length;
        const filled = form.fields.filter((field) => {
            const val = draftAnswers[field.id];
            return Array.isArray(val) ? val.length > 0 : Boolean(String(val || '').trim());
        }).length;
        const draftTime = readDraft(form.slug)?.updated_at;
        const loginWarning = !state.auth ? '<div class="forms-auth-warning">Belum login. Login dulu untuk kirim jawaban.</div>' : '';

        els.stage.innerHTML = `
            <article class="forms-stage-card">
                <div class="forms-form-head">
                    <span class="forms-form-type">${escapeHtml(form.type)}</span>
                    <h2>${escapeHtml(form.title)}</h2>
                    <p>${escapeHtml(form.description || 'Isi semua pertanyaan yang diperlukan.')}</p>
                    <div class="forms-result-meta">
                        <span class="forms-meta-pill">${total} pertanyaan</span>
                        <span class="forms-meta-pill">${filled}/${total} terisi</span>
                    </div>
                </div>
                ${loginWarning}
                <div class="forms-progress-bar">
                    <span style="width:${total ? Math.round((filled / total) * 100) : 0}%"></span>
                </div>
                <form id="forms-submit-form" class="forms-form-card">
                    ${form.fields.map((field, index) => `
                        <div class="forms-question-card" data-question-id="${field.id}">
                            <div class="forms-question-label">
                                <span>${index + 1}. ${escapeHtml(field.label)}</span>
                                ${field.required ? '<span class="forms-required">Wajib</span>' : ''}
                            </div>
                            ${buildFieldInput(field, draftAnswers[field.id])}
                            <div class="forms-field-help">${field.focus_inbox ? 'Jawaban ini masuk inbox admin.' : ''}</div>
                        </div>
                    `).join('')}
                    <div class="forms-footer-bar">
                        <div class="forms-draft-indicator">${draftTime ? `Draft: ${formatDate(draftTime)}` : 'Draft tersimpan otomatis'}</div>
                        <button type="submit" class="forms-submit-btn" ${!state.auth || form.already_submitted ? 'disabled' : ''}>
                            ${form.already_submitted ? 'Sudah submit' : 'Kirim jawaban'}
                        </button>
                    </div>
                </form>
            </article>
        `;

        const formEl = $('forms-submit-form');
        bindDraftAutosave(formEl, form);
        formEl?.addEventListener('submit', (event) => handleSubmit(event, form));
    }

    function collectAnswers(formEl, form) {
        const answers = {};
        form.fields.forEach((field) => {
            if (field.field_type === 'multiple_choice') {
                answers[field.id] = Array.from(formEl.querySelectorAll(`[data-field-id="${field.id}"]:checked`)).map((el) => el.value);
                return;
            }
            if (field.field_type === 'single_choice') {
                answers[field.id] = formEl.querySelector(`[data-field-id="${field.id}"]:checked`)?.value || '';
                return;
            }
            answers[field.id] = formEl.querySelector(`[data-field-id="${field.id}"]`)?.value || '';
        });
        return answers;
    }

    function clearValidation(formEl) {
        formEl.querySelectorAll('.forms-question-card').forEach((card) => card.classList.remove('invalid'));
        formEl.querySelectorAll('.forms-inline-error').forEach((errorEl) => {
            errorEl.hidden = true;
            errorEl.textContent = '';
        });
    }

    function showFieldError(formEl, fieldId, message) {
        const card = formEl.querySelector(`[data-question-id="${fieldId}"]`);
        card?.classList.add('invalid');
        const errorEl = formEl.querySelector(`#forms-error-${fieldId}`);
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = message;
        }
    }

    function validateAnswers(formEl, form, answers) {
        clearValidation(formEl);
        let valid = true;
        form.fields.forEach((field) => {
            const value = answers[field.id];
            const hasValue = Array.isArray(value) ? value.length > 0 : Boolean(String(value || '').trim());
            if (field.required && !hasValue) {
                valid = false;
                showFieldError(formEl, field.id, 'Pertanyaan ini wajib diisi.');
            }
        });
        return valid;
    }

    function bindDraftAutosave(formEl, form) {
        if (!formEl) return;
        const save = () => saveDraft(form.slug, collectAnswers(formEl, form));
        formEl.addEventListener('input', save);
        formEl.addEventListener('change', save);
    }

    async function handleSubmit(event, form) {
        event.preventDefault();
        const formEl = event.currentTarget;
        const answers = collectAnswers(formEl, form);

        if (!validateAnswers(formEl, form, answers)) {
            window.Toast?.show('Masih ada pertanyaan wajib yang belum diisi.', 'warning');
            return;
        }
        if (!state.auth) {
            window.Toast?.show('Silakan login terlebih dahulu.', 'warning');
            return;
        }

        const submitBtn = formEl.querySelector('.forms-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mengirim...';
        }

        try {
            await fetchJson('/api/forms?action=submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form_id: form.id,
                    answers: form.fields.map((field) => ({
                        field_id: field.id,
                        value: answers[field.id]
                    }))
                })
            });

            clearDraft(form.slug);
            await Promise.all([loadMySubmissions(), loadForms()]);
            renderSuccess({
                ...form,
                already_submitted: true,
                my_submission: state.mySubmissions.find((item) => item.form_id === form.id) || null
            });
            window.Toast?.show('Form berhasil dikirim.', 'success');
        } catch (error) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Kirim jawaban';
            }
            window.Toast?.show(error.message || 'Gagal mengirim form.', 'error');
        }
    }

    async function openForm(slug, options = {}) {
        if (!slug) return;
        state.activeSlug = slug;
        setMode('filling');
        renderFormsList();
        els.stage.innerHTML = '<div class="forms-stage-loading">Memuat form...</div>';

        try {
            const data = await fetchJson(`/api/forms?action=detail&slug=${encodeURIComponent(slug)}`);
            state.activeForm = data.form;
            if (options.syncHistory !== false) {
                const url = new URL(window.location.href);
                url.searchParams.set('slug', slug);
                window.history.replaceState({}, '', url.toString());
            }
            if (state.activeForm.already_submitted) {
                renderSuccess(state.activeForm);
            } else {
                renderForm(state.activeForm);
            }
        } catch (error) {
            renderFocusError(error.message || 'Form belum tersedia.');
        }
    }

    function backToPicker() {
        setMode('picker');
        state.activeForm = null;
        state.activeSlug = '';
        const url = new URL(window.location.href);
        url.searchParams.delete('slug');
        window.history.replaceState({}, '', url.toString());
        renderFormsList();
    }

    function bindEvents() {
        els.list?.addEventListener('click', (event) => {
            const card = event.target.closest('.forms-list-card');
            if (!card) return;
            openForm(card.dataset.slug || '');
        });

        document.querySelectorAll('.forms-filter').forEach((button) => {
            button.addEventListener('click', () => {
                state.filter = button.dataset.filter || 'all';
                document.querySelectorAll('.forms-filter').forEach((item) => item.classList.toggle('active', item === button));
                renderFormsList();
            });
        });

        els.refreshBtn?.addEventListener('click', () => init());
        els.backBtn?.addEventListener('click', backToPicker);
    }

    async function init() {
        try {
            await loadAuth();
            await loadMySubmissions();
            await loadForms();
            const slug = new URLSearchParams(window.location.search).get('slug') || '';
            if (slug) {
                await openForm(slug, { syncHistory: false });
            } else {
                setMode('picker');
                els.stage.innerHTML = `
                    <div class="forms-empty-stage">
                        <div class="forms-empty-icon"><i class="fas fa-file-signature"></i></div>
                        <h2>Pilih form terlebih dahulu</h2>
                        <p>Klik tombol "Mulai isi" pada daftar form.</p>
                    </div>
                `;
            }
        } catch (error) {
            setPanelCopy('Gagal memuat form.');
            renderPickerEmpty(error.message || 'Terjadi gangguan saat memuat data.');
        }
    }

    function initElements() {
        els.list = $('forms-list');
        els.stage = $('forms-stage');
        els.authState = $('forms-auth-state');
        els.panelCopy = $('forms-panel-copy');
        els.statActive = $('forms-stat-active');
        els.statSubmitted = $('forms-stat-submitted');
        els.refreshBtn = $('forms-refresh-btn');
        els.backBtn = $('forms-back-btn');
    }

    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        bindEvents();
        init();
    });
})();
