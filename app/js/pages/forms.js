(() => {
    const state = {
        auth: null,
        items: [],
        mySubmissions: [],
        filter: 'all',
        mode: 'picker',
        activeSlug: '',
        activeForm: null,
        submitState: 'idle',
        submitError: ''
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

    function getSessionToken() {
        return (
            sessionStorage.getItem('ipmquiz_user_session') ||
            localStorage.getItem('ipmquiz_user_session') ||
            sessionStorage.getItem('ipmquiz_admin_session') ||
            localStorage.getItem('ipmquiz_admin_session') ||
            ''
        );
    }

    async function fetchJson(url, init = {}) {
        const headers = { ...(init.headers || {}) };
        const token = String(getSessionToken() || '').trim();
        if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(url, { credentials: 'include', ...init, headers });
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

    function setButtonLoading(button, loading) {
        if (!button) return;
        button.classList.toggle('is-loading', Boolean(loading));
        button.setAttribute('aria-busy', loading ? 'true' : 'false');
    }

    function redirectToLogin() {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?next=${next}`;
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

    function hasValue(value) {
        return Array.isArray(value) ? value.length > 0 : Boolean(String(value || '').trim());
    }

    function hasAnyAnswer(answers) {
        if (!answers || typeof answers !== 'object') return false;
        return Object.values(answers).some((value) => hasValue(value));
    }

    function hasDraftStarted(draft) {
        return Boolean(String(draft?.submitter_name || '').trim()) || hasAnyAnswer(draft?.answers || {});
    }

    function readDraft(slug) {
        try {
            return JSON.parse(localStorage.getItem(autosaveStorageKey(slug)) || '{}');
        } catch {
            return {};
        }
    }

    function saveDraft(slug, draftPayload) {
        if (!slug) return;
        const payload = draftPayload && typeof draftPayload === 'object' ? draftPayload : {};
        localStorage.setItem(autosaveStorageKey(slug), JSON.stringify({
            updated_at: new Date().toISOString(),
            answers: payload.answers || {},
            submitter_name: String(payload.submitter_name || '').trim()
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
                    <span class="forms-meta-pill">${getCardStatusLabel(item)}</span>
                </div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description || 'Form evaluasi.')}</p>
                <div class="forms-inline-meta">
                    <span class="forms-meta-pill">${item.my_submission?.submitted_at ? `Dikirim ${formatDate(item.my_submission.submitted_at)}` : `${Number(item.submission_count || 0)} pengisi`}</span>
                    <span class="forms-meta-pill">${item.already_submitted ? 'Lihat form' : 'Mulai isi'}</span>
                </div>
            </button>
        `).join('');
    }

    function getCardStatusLabel(item) {
        if (item?.already_submitted) return 'Status: sudah terkirim';
        const draft = readDraft(item?.slug || '');
        return hasDraftStarted(draft) ? 'Status: draft tersimpan' : 'Status: belum mulai';
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

    function getDraftSubmitterName(form) {
        return String(readDraft(form.slug)?.submitter_name || '').trim();
    }

    function renderSuccess(form) {
        const latest = state.mySubmissions.find((item) => item.form_id === form.id) || form.my_submission;
        els.stage.innerHTML = `
            <article class="forms-success-card">
                <div class="forms-success-icon"><i class="fas fa-check"></i></div>
                <span class="forms-form-type">${escapeHtml(form.type)}</span>
                <h2>Jawaban terkirim</h2>
                <p>Status: jawaban sudah masuk ke sistem.</p>
                <div class="forms-success-meta">
                    <span>${escapeHtml(form.title)}</span>
                    <span>${latest?.submitted_at ? formatDate(latest.submitted_at) : 'Baru saja'}</span>
                    <span>${latest?.submitter_name ? `Nama pengisi: ${escapeHtml(latest.submitter_name)}` : ''}</span>
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
        state.submitState = 'idle';
        state.submitError = '';
        const draftAnswers = getDraftAnswers(form);
        const draftSubmitterName = getDraftSubmitterName(form);
        const loginWarning = !state.auth ? '<div class="forms-auth-warning">Belum login. Login dulu untuk kirim jawaban.</div>' : '';

        els.stage.innerHTML = `
            <article class="forms-stage-card">
                <div class="forms-form-head">
                    <span class="forms-form-type">${escapeHtml(form.type)}</span>
                    <h2>${escapeHtml(form.title)}</h2>
                    <p>${escapeHtml(form.description || 'Isi jawaban lalu kirim.')}</p>
                    <div class="forms-result-meta">
                        <span class="forms-meta-pill" id="forms-meta-status">Status: belum mulai</span>
                        <span class="forms-meta-pill" id="forms-meta-total">${form.fields.length} pertanyaan</span>
                        <span class="forms-meta-pill" id="forms-meta-progress">0/${form.fields.length} terisi</span>
                    </div>
                </div>
                ${loginWarning}
                <div class="forms-runtime-status" id="forms-runtime-status" data-status="not_started" aria-live="polite">
                    <div class="forms-runtime-badge" id="forms-runtime-badge"><i class="fas fa-circle"></i> Belum mulai</div>
                    <div class="forms-runtime-note" id="forms-runtime-note">Mulai isi jawaban untuk menyimpan draft otomatis.</div>
                </div>
                <div class="forms-progress-bar">
                    <span id="forms-progress-fill" style="width:0%"></span>
                </div>
                <form id="forms-submit-form" class="forms-form-card">
                    <div class="forms-question-card forms-identity-card">
                        <div class="forms-question-label">
                            <span>Nama Pengisi</span>
                            <span class="forms-required">Wajib</span>
                        </div>
                        <input id="forms-submitter-name" class="forms-text-input" maxlength="120" value="${escapeHtml(draftSubmitterName)}" placeholder="Tulis nama lengkap Anda">
                        <div id="forms-submitter-name-error" class="forms-inline-error" hidden></div>
                        <div class="forms-field-help">Nama ini dipakai sebagai identitas utama pengisian form.</div>
                    </div>
                    ${form.fields.map((field, index) => `
                        <div class="forms-question-card" data-question-id="${field.id}">
                            <div class="forms-question-label">
                                <span>${index + 1}. ${escapeHtml(field.label)}</span>
                                ${field.required ? '<span class="forms-required">Wajib</span>' : ''}
                            </div>
                            ${buildFieldInput(field, draftAnswers[field.id])}
                            <div class="forms-field-help">${field.focus_inbox ? 'Masuk inbox admin.' : ''}</div>
                        </div>
                    `).join('')}
                    <div class="forms-footer-bar">
                        <div class="forms-draft-indicator" id="forms-draft-indicator">Draft tersimpan otomatis</div>
                        <button type="button" class="forms-secondary-btn" id="forms-login-btn" hidden>Login sekarang</button>
                        <button type="submit" class="forms-submit-btn" ${!state.auth || form.already_submitted ? 'disabled' : ''}>
                            ${form.already_submitted ? 'Jawaban terkirim' : 'Kirim jawaban'}
                        </button>
                    </div>
                </form>
            </article>
        `;

        const formEl = $('forms-submit-form');
        bindProgressObserver(formEl, form);
        bindDraftAutosave(formEl, form);
        updateRuntimeUI(formEl, form);
        formEl?.addEventListener('submit', (event) => handleSubmit(event, form));
        $('forms-login-btn')?.addEventListener('click', redirectToLogin);
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

    function showSubmitterNameError(formEl, message) {
        const card = formEl.querySelector('.forms-identity-card');
        card?.classList.add('invalid');
        const errorEl = formEl.querySelector('#forms-submitter-name-error');
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = message;
        }
    }

    function getSubmitterName(formEl) {
        return String(formEl.querySelector('#forms-submitter-name')?.value || '').trim();
    }

    function updateProgressText(formEl, form) {
        if (!formEl || !form) return;
        const analysis = analyzeFormProgress(formEl, form);
        const total = form.fields.length;
        const textEl = $('forms-meta-progress');
        if (textEl) textEl.textContent = `${analysis.filled}/${total} terisi`;
        const barEl = $('forms-progress-fill');
        if (barEl) barEl.style.width = `${total ? Math.round((analysis.filled / total) * 100) : 0}%`;
        const draftIndicator = $('forms-draft-indicator');
        const draftTime = readDraft(form.slug)?.updated_at;
        if (draftIndicator) {
            draftIndicator.textContent = draftTime ? `Draft: ${formatDate(draftTime)}` : 'Draft tersimpan otomatis';
        }
    }

    function analyzeFormProgress(formEl, form) {
        const answers = collectAnswers(formEl, form);
        const submitterName = getSubmitterName(formEl);
        const total = form.fields.length;
        const filled = form.fields.filter((field) => hasValue(answers[field.id])).length;
        const requiredReady = form.fields.every((field) => !field.required || hasValue(answers[field.id]));
        const started = hasAnyAnswer(answers) || Boolean(submitterName);
        const readyToSubmit = Boolean(submitterName) && requiredReady;
        return { total, filled, requiredReady, started, readyToSubmit, submitterName };
    }

    function resolveStatusView(form, analysis) {
        if (form.already_submitted) {
            return {
                code: 'submitted',
                badge: 'Sudah terkirim',
                note: form.my_submission?.submitted_at
                    ? `Jawaban terkirim ${formatDate(form.my_submission.submitted_at)}.`
                    : 'Jawaban sudah masuk ke sistem.'
            };
        }
        if (state.submitState === 'sending') {
            return {
                code: 'sending',
                badge: 'Sedang mengirim...',
                note: 'Mohon tunggu, jawaban sedang diproses.'
            };
        }
        if (state.submitState === 'failed') {
            return {
                code: 'failed',
                badge: 'Gagal mengirim',
                note: state.submitError || 'Koneksi terganggu. Coba kirim lagi.'
            };
        }
        if (state.submitState === 'auth_required' || !state.auth) {
            return {
                code: 'auth_required',
                badge: 'Perlu login',
                note: state.submitError || 'Sesi login belum aktif. Login dulu untuk kirim jawaban.'
            };
        }
        if (!analysis.started) {
            return {
                code: 'not_started',
                badge: 'Belum mulai',
                note: 'Mulai isi jawaban untuk menyimpan draft otomatis.'
            };
        }
        if (analysis.readyToSubmit) {
            return {
                code: 'ready',
                badge: 'Siap dikirim',
                note: state.auth ? 'Semua syarat terpenuhi. Tekan Kirim jawaban.' : 'Login dulu agar bisa kirim jawaban.'
            };
        }
        return {
            code: 'draft',
            badge: 'Draft tersimpan',
            note: 'Lengkapi semua pertanyaan wajib lalu kirim.'
        };
    }

    function updateRuntimeUI(formEl, form) {
        if (!formEl || !form) return;
        updateProgressText(formEl, form);
        const analysis = analyzeFormProgress(formEl, form);
        const statusView = resolveStatusView(form, analysis);
        const runtime = $('forms-runtime-status');
        const badge = $('forms-runtime-badge');
        const note = $('forms-runtime-note');
        const metaStatus = $('forms-meta-status');
        if (runtime) runtime.dataset.status = statusView.code;
        if (badge) badge.innerHTML = `<i class="fas fa-circle"></i> ${escapeHtml(statusView.badge)}`;
        if (note) note.textContent = statusView.note;
        if (metaStatus) metaStatus.textContent = `Status: ${statusView.badge.toLowerCase()}`;

        const submitBtn = formEl.querySelector('.forms-submit-btn');
        const loginBtn = formEl.querySelector('#forms-login-btn');
        if (loginBtn) loginBtn.hidden = statusView.code !== 'auth_required';
        if (!submitBtn) return;
        setButtonLoading(submitBtn, state.submitState === 'sending');
        if (form.already_submitted) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Jawaban terkirim';
            return;
        }
        const canRetry = state.submitState === 'failed' && analysis.readyToSubmit && Boolean(state.auth);
        const canSubmit = analysis.readyToSubmit && Boolean(state.auth) && state.submitState !== 'sending';
        submitBtn.disabled = !(canSubmit || canRetry);
        if (state.submitState === 'sending') submitBtn.textContent = 'Sedang mengirim...';
        else if (state.submitState === 'auth_required' || !state.auth) submitBtn.textContent = 'Perlu login';
        else if (state.submitState === 'failed') submitBtn.textContent = 'Coba kirim lagi';
        else submitBtn.textContent = 'Kirim jawaban';
    }

    function bindProgressObserver(formEl, form) {
        if (!formEl) return;
        const sync = () => updateRuntimeUI(formEl, form);
        formEl.addEventListener('input', sync);
        formEl.addEventListener('change', sync);
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
        const save = () => {
            if (state.submitState === 'failed') {
                state.submitState = 'idle';
                state.submitError = '';
            }
            saveDraft(form.slug, {
                submitter_name: getSubmitterName(formEl),
                answers: collectAnswers(formEl, form)
            });
            updateRuntimeUI(formEl, form);
        };
        formEl.addEventListener('input', save);
        formEl.addEventListener('change', save);
    }

    async function handleSubmit(event, form) {
        event.preventDefault();
        const formEl = event.currentTarget;
        const answers = collectAnswers(formEl, form);
        const submitterName = getSubmitterName(formEl);

        clearValidation(formEl);
        if (!submitterName) {
            showSubmitterNameError(formEl, 'Nama pengisi wajib diisi.');
            state.submitState = 'idle';
            state.submitError = '';
            updateRuntimeUI(formEl, form);
            window.Toast?.show('Nama pengisi wajib diisi.', 'warning');
            return;
        }

        if (!validateAnswers(formEl, form, answers)) {
            state.submitState = 'idle';
            state.submitError = '';
            updateRuntimeUI(formEl, form);
            window.Toast?.show('Masih ada pertanyaan wajib yang belum diisi.', 'warning');
            return;
        }
        if (!state.auth) {
            state.submitState = 'auth_required';
            state.submitError = 'Silakan login untuk mengisi form.';
            updateRuntimeUI(formEl, form);
            window.Toast?.show('Silakan login terlebih dahulu.', 'warning');
            return;
        }

        state.submitState = 'sending';
        state.submitError = '';
        updateRuntimeUI(formEl, form);

        try {
            await fetchJson('/api/forms?action=submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form_id: form.id,
                    submitter_name: submitterName,
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
            if (error.status === 401) {
                state.auth = null;
                setAuthState('Belum login');
                state.submitState = 'auth_required';
                state.submitError = 'Sesi login habis. Login ulang untuk mengirim jawaban.';
            } else {
                state.submitState = 'failed';
                state.submitError = error.message || 'Gagal mengirim form.';
            }
            updateRuntimeUI(formEl, form);
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

        els.refreshBtn?.addEventListener('click', async () => {
            if (!els.refreshBtn || els.refreshBtn.disabled) return;
            els.refreshBtn.disabled = true;
            setButtonLoading(els.refreshBtn, true);
            try {
                await init();
            } finally {
                setButtonLoading(els.refreshBtn, false);
                els.refreshBtn.disabled = false;
            }
        });
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
