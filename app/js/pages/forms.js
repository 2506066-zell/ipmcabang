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
        submitError: '',
        currentStep: 0
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
        els.list.innerHTML = items.map((item) => {
            const isPretest = item.type === 'pretest';
            const typeClass = isPretest ? 'is-pretest' : 'is-posttest';
            const typeLabel = isPretest ? 'Pre-Test' : 'Post-Test';
            const typeIcon = isPretest ? 'fa-clipboard-list' : 'fa-clipboard-check';

            const status = getCardStatusLabel(item);
            const statusIcon = item.already_submitted ? 'fa-circle-check' : (hasDraftStarted(readDraft(item.slug)) ? 'fa-pen' : 'fa-circle');
            const statusClass = item.already_submitted ? 'is-submitted' : (hasDraftStarted(readDraft(item.slug)) ? 'is-draft' : 'is-new');

            const ctaText = item.already_submitted ? 'Lihat Hasil' : (hasDraftStarted(readDraft(item.slug)) ? 'Lanjutkan' : 'Mulai Isi');
            const ctaIcon = item.already_submitted ? 'fa-eye' : 'fa-arrow-right';

            return `
                <button type="button" class="forms-list-card ${typeClass} ${item.slug === state.activeSlug ? 'active' : ''}" data-slug="${escapeHtml(item.slug)}">
                    <div class="forms-card-header">
                        <span class="forms-form-type"><i class="fas ${typeIcon}"></i> ${typeLabel}</span>
                        <span class="forms-card-status ${statusClass}"><i class="fas ${statusIcon}"></i> ${status}</span>
                    </div>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.description || 'Form evaluasi kegiatan.')}</p>
                    <div class="forms-card-footer">
                        <span class="forms-meta-pill"><i class="fas fa-users"></i> ${Number(item.submission_count || 0)} pengisi</span>
                        <span class="forms-card-cta"><i class="fas ${ctaIcon}"></i> ${ctaText}</span>
                    </div>
                </button>
            `;
        }).join('');
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
                <div class="forms-textarea-wrapper">
                    <textarea class="forms-textarea" data-field-id="${field.id}" aria-describedby="${errorId}" placeholder="${escapeHtml(field.placeholder || 'Tulis jawaban Anda di sini...')}">${escapeHtml(value)}</textarea>
                    <div class="forms-char-counter" id="forms-char-count-${field.id}">${value.length} karakter</div>
                </div>
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
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return `
            <div class="forms-options">
                ${(field.options_json || []).map((option, idx) => {
                    const inputId = `field-${field.id}-${idx}`;
                    const checked = currentValues.includes(option);
                    return `
                        <label class="forms-choice-label" for="${inputId}">
                            <span class="forms-choice-letter">${letters[idx] || idx + 1}</span>
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
        const isPretest = form.type === 'pretest';
        const typeLabel = isPretest ? 'Pre-Test' : 'Post-Test';
        const typeIcon = isPretest ? 'fa-clipboard-list' : 'fa-clipboard-check';

        els.stage.innerHTML = `
            <article class="forms-success-card">
                <div class="forms-success-header">
                    <div class="forms-success-icon"><i class="fas fa-check"></i></div>
                    <span class="forms-form-type"><i class="fas ${typeIcon}"></i> ${typeLabel}</span>
                    <h2>Jawaban Anda Berhasil Terkirim!</h2>
                    <p>Terima kasih telah mengisi ${typeLabel}. Jawaban Anda sudah tercatat dan tidak perlu diisi ulang.</p>
                </div>
                <div class="forms-success-details">
                    <div class="forms-success-detail-row">
                        <i class="fas fa-file-lines"></i>
                        <div>
                            <strong>Form</strong>
                            <span>${escapeHtml(form.title)}</span>
                        </div>
                    </div>
                    <div class="forms-success-detail-row">
                        <i class="fas fa-clock"></i>
                        <div>
                            <strong>Waktu Pengiriman</strong>
                            <span>${latest?.submitted_at ? formatDate(latest.submitted_at) : 'Baru saja'}</span>
                        </div>
                    </div>
                    <div class="forms-success-detail-row">
                        <i class="fas fa-user"></i>
                        <div>
                            <strong>Nama Pengisi</strong>
                            <span>${latest?.submitter_name ? escapeHtml(latest.submitter_name) : '-'}</span>
                        </div>
                    </div>
                </div>
                <div class="forms-success-actions">
                    <button type="button" class="forms-submit-btn" id="forms-back-to-picker">
                        <i class="fas fa-arrow-left"></i> Kembali ke Daftar Evaluasi
                    </button>
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
        state.currentStep = 0; // Reset to identity step
        const draftAnswers = getDraftAnswers(form);
        const draftSubmitterName = getDraftSubmitterName(form);
        const loginWarning = !state.auth ? '<div class="forms-auth-warning">Belum login. Login dulu untuk kirim jawaban.</div>' : '';

        els.stage.innerHTML = `
            <article class="forms-stage-card forms-stage-card-focus">
                <div class="forms-focus-hero ${form.type === 'pretest' ? 'theme-pretest' : 'theme-posttest'}">
                    <div class="forms-progress-bar">
                        <span id="forms-progress-fill" style="width:0%"></span>
                    </div>
                    <div class="forms-form-head">
                        <span class="forms-form-type"><i class="fas ${form.type === 'pretest' ? 'fa-clipboard-list' : 'fa-clipboard-check'}"></i> ${form.type === 'pretest' ? 'Pre-Test' : 'Post-Test'}</span>
                        <h2>${escapeHtml(form.title)}</h2>
                        <p>${escapeHtml(form.description || 'Jawab semua pertanyaan di bawah ini, lalu kirim saat semua sudah lengkap.')}</p>
                    </div>
                    <div class="forms-overview-strip">
                        <div class="forms-overview-card">
                            <span class="forms-overview-label">Status</span>
                            <strong id="forms-meta-status">Belum mulai</strong>
                        </div>
                        <div class="forms-overview-card">
                            <span class="forms-overview-label">Pertanyaan</span>
                            <strong id="forms-meta-total">${form.fields.length}</strong>
                        </div>
                        <div class="forms-overview-card">
                            <span class="forms-overview-label">Progres</span>
                            <strong id="forms-meta-progress">0/${form.fields.length} terisi</strong>
                        </div>
                    </div>
                    <div class="forms-runtime-status" id="forms-runtime-status" data-status="not_started" aria-live="polite">
                        <div class="forms-runtime-main">
                            <div class="forms-runtime-badge" id="forms-runtime-badge"><i class="fas fa-circle"></i> Belum mulai</div>
                            <div class="forms-runtime-note" id="forms-runtime-note">Mulai isi jawaban untuk menyimpan draft otomatis.</div>
                        </div>
                    </div>
                </div>
                ${loginWarning}
        const steps = [];
        const timelineSegments = [];
        
        // Helper for answer indicator
        const answerIndicator = '<div class="forms-answer-indicator"><i class="fas fa-check"></i></div>';

        // Step 0: Identity
        steps.push(`
            <div class="forms-step-container active" data-step="0">
                <div class="forms-question-card forms-identity-card">
                    ${answerIndicator}
                    <div class="forms-q-header">
                        <div class="forms-q-icon"><i class="fas fa-user"></i></div>
                        <div class="forms-q-title">
                            <span class="forms-q-text">Nama Lengkap Pengisi</span>
                            <span class="forms-question-state is-required" id="forms-identity-state">Wajib</span>
                        </div>
                    </div>
                    <div class="forms-q-body">
                        <input id="forms-submitter-name" class="forms-text-input" maxlength="120" value="${escapeHtml(draftSubmitterName)}" placeholder="Contoh: Ahmad Zaky Maulana">
                        <div id="forms-submitter-name-error" class="forms-inline-error" hidden></div>
                    </div>
                    <div class="forms-field-help"><i class="fas fa-info-circle"></i> Nama ini akan dicantumkan sebagai identitas jawaban Anda.</div>
                </div>
            </div>
        `);
        timelineSegments.push('<div class="forms-timeline-segment active" data-step="0"></div>');

        // Step 1..N: Questions
        form.fields.forEach((field, index) => {
            steps.push(`
                <div class="forms-step-container" data-step="${index + 1}">
                    <div class="forms-question-card" data-question-id="${field.id}">
                        ${answerIndicator}
                        <div class="forms-q-header">
                            <div class="forms-q-number">${index + 1}</div>
                            <div class="forms-q-title">
                                <span class="forms-q-text">${escapeHtml(field.label)}</span>
                                <span class="forms-question-state ${field.required ? 'is-required' : ''}" id="forms-question-state-${field.id}">${field.required ? 'Wajib diisi' : 'Opsional'}</span>
                            </div>
                        </div>
                        <div class="forms-q-body">
                            ${buildFieldInput(field, draftAnswers[field.id])}
                        </div>
                    </div>
                </div>
            `);
            timelineSegments.push(`<div class="forms-timeline-segment" data-step="${index + 1}"></div>`);
        });

        // Final Step: Review & Submit
        const lastStepIdx = form.fields.length + 1;
        steps.push(`
            <div class="forms-step-container" data-step="${lastStepIdx}">
                <div class="forms-question-card forms-review-step">
                    <div class="forms-q-header">
                        <div class="forms-q-icon"><i class="fas fa-paper-plane"></i></div>
                        <div class="forms-q-title">
                            <span class="forms-q-text">Siap Kirim?</span>
                            <p style="margin:0;font-size:0.85rem;color:var(--forms-muted);">Tinjau kembali progres Anda sebelum menekan tombol kirim di bawah.</p>
                        </div>
                    </div>
                    <div class="forms-review-summary" id="forms-review-summary">
                        <!-- Filled by updateRuntimeUI -->
                    </div>
                </div>
            </div>
        `);
        timelineSegments.push(`<div class="forms-timeline-segment" data-step="${lastStepIdx}"></div>`);

        els.stage.innerHTML = `
            <article class="forms-stage-card forms-stage-card-focus">
                <div class="forms-focus-hero ${form.type === 'pretest' ? 'theme-pretest' : 'theme-posttest'}">
                    <div class="forms-progress-bar">
                        <span id="forms-progress-fill" style="width:0%"></span>
                    </div>
                    <div class="forms-form-head">
                        <span class="forms-form-type"><i class="fas ${form.type === 'pretest' ? 'fa-clipboard-list' : 'fa-clipboard-check'}"></i> ${form.type === 'pretest' ? 'Pre-Test' : 'Post-Test'}</span>
                        <h2>${escapeHtml(form.title)}</h2>
                        <p>${escapeHtml(form.description || 'Selesaikan setiap tahap pengerjaan hingga selesai.')}</p>
                        <div class="forms-timeline">
                            ${timelineSegments.join('')}
                        </div>
                    </div>
                    <div class="forms-overview-strip">
                        <div class="forms-overview-card">
                            <span class="forms-overview-label">Bagian</span>
                            <strong id="forms-step-label">1 / ${steps.length}</strong>
                        </div>
                        <div class="forms-overview-card">
                            <span class="forms-overview-label">Pertanyaan</span>
                            <strong id="forms-meta-total">${form.fields.length}</strong>
                        </div>
                        <div class="forms-overview-card">
                            <span class="forms-overview-label">Terisi</span>
                            <strong id="forms-meta-progress">0/${form.fields.length}</strong>
                        </div>
                    </div>
                    <div class="forms-runtime-status" id="forms-runtime-status" data-status="not_started" aria-live="polite">
                        <div class="forms-runtime-main">
                            <div class="forms-runtime-badge" id="forms-runtime-badge"><i class="fas fa-circle"></i> Belum mulai</div>
                            <div class="forms-runtime-note" id="forms-runtime-note">Lengkapi identitas untuk melanjutkan.</div>
                        </div>
                    </div>
                </div>
                ${loginWarning}
                <form id="forms-submit-form" class="forms-form-card">
                    <div class="forms-steps-wrapper">
                        ${steps.join('')}
                    </div>
                    
                    <div class="forms-pagination-controls">
                        <button type="button" class="forms-secondary-btn forms-pagination-btn" id="forms-prev-btn" disabled>
                            <i class="fas fa-chevron-left"></i> Sebelumnya
                        </button>
                        <button type="button" class="forms-submit-btn forms-pagination-btn" id="forms-next-btn">
                            Lanjut <i class="fas fa-chevron-right"></i>
                        </button>
                        <button type="submit" class="forms-submit-btn forms-pagination-btn" id="forms-final-submit" style="display:none;" ${!state.auth || form.already_submitted ? 'disabled' : ''}>
                            <i class="fas fa-paper-plane"></i> Kirim Jawaban
                        </button>
                    </div>

                    <div class="forms-footer-bar">
                        <div class="forms-footer-meta">
                            <div class="forms-draft-indicator" id="forms-draft-indicator">Draft tersimpan otomatis</div>
                        </div>
                        <button type="button" class="forms-secondary-btn" id="forms-login-btn" hidden>Login sekarang</button>
                    </div>
                </form>
            </article>
        `;

        const formEl = $('forms-submit-form');
        bindProgressObserver(formEl, form);
        bindDraftAutosave(formEl, form);
        bindPagination(formEl, form);
        updateRuntimeUI(formEl, form);
        initUIEnhancements(formEl, form);
        formEl?.addEventListener('submit', (event) => handleSubmit(event, form));
        $('forms-login-btn')?.addEventListener('click', redirectToLogin);
    }

    function bindPagination(formEl, form) {
        const nextBtn = $('forms-next-btn');
        const prevBtn = $('forms-prev-btn');
        const submitBtn = $('forms-final-submit');
        const totalSteps = form.fields.length + 2; // Identity + Questions + Review

        const goToStep = (stepIdx) => {
            if (stepIdx < 0 || stepIdx >= totalSteps) return;
            
            // Validate before going to next step (optional but good)
            if (stepIdx > state.currentStep) {
                if (state.currentStep === 0) {
                    const name = getSubmitterName(formEl);
                    if (!name) {
                        showSubmitterNameError(formEl, 'Nama wajib diisi.');
                        window.Toast?.show('Nama wajib diisi untuk lanjut.', 'warning');
                        return;
                    }
                    clearValidation(formEl);
                } else if (state.currentStep <= form.fields.length) {
                    const field = form.fields[state.currentStep - 1];
                    const answers = collectAnswers(formEl, form);
                    if (field.required && !hasValue(answers[field.id])) {
                        showFieldError(formEl, field.id, 'Pertanyaan ini wajib diisi.');
                        window.Toast?.show('Wajib diisi untuk lanjut.', 'warning');
                        return;
                    }
                    clearValidation(formEl);
                }
            }

            state.currentStep = stepIdx;
            
            // Step Visibility Update
            const steps = formEl.querySelectorAll('.forms-step-container');
            steps.forEach((s, idx) => {
                s.classList.toggle('active', idx === state.currentStep);
                // Highlight active card
                const card = s.querySelector('.forms-question-card');
                if (card) card.classList.toggle('is-active', idx === state.currentStep);
            });

            // Timeline Update
            const segments = formEl.closest('.forms-stage-card')?.querySelectorAll('.forms-timeline-segment');
            segments?.forEach((seg, idx) => {
                seg.classList.toggle('active', idx === state.currentStep);
                seg.classList.toggle('done', idx < state.currentStep);
            });

            // Buttons
            prevBtn.disabled = state.currentStep === 0;
            const isLast = state.currentStep === totalSteps - 1;
            nextBtn.style.display = isLast ? 'none' : 'inline-flex';
            submitBtn.style.display = isLast ? 'inline-flex' : 'none';

            // Stats
            $('forms-step-label').textContent = `${state.currentStep + 1} / ${totalSteps}`;
            
            // Scroll to top of card
            formEl.closest('.forms-stage-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            updateRuntimeUI(formEl, form);
        };

        nextBtn?.addEventListener('click', () => goToStep(state.currentStep + 1));
        prevBtn?.addEventListener('click', () => goToStep(state.currentStep - 1));
    }

    function initUIEnhancements(formEl, form) {
        if (!formEl) return;

        // Auto-expand textareas
        const textareas = formEl.querySelectorAll('.forms-textarea');
        const adjustHeight = (el) => {
            el.style.height = 'auto';
            el.style.height = (el.scrollHeight + 2) + 'px';
        };

        textareas.forEach(textarea => {
            // Initial adjustment
            setTimeout(() => adjustHeight(textarea), 10);
            
            textarea.addEventListener('input', () => {
                adjustHeight(textarea);
                const counter = formEl.querySelector(`#forms-char-count-${textarea.dataset.fieldId}`);
                if (counter) {
                    const len = textarea.value.length;
                    counter.textContent = `${len} karakter`;
                    counter.style.color = len > 0 ? 'var(--forms-accent)' : 'var(--forms-muted)';
                }
            });
        });

        // Auto-scroll to next question on single choice
        formEl.addEventListener('change', (e) => {
            const radio = e.target.closest('input[type="radio"]');
            if (!radio) return;

            const currentCard = radio.closest('.forms-question-card');
            if (!currentCard) return;

            const nextCard = currentCard.nextElementSibling;
            if (nextCard && nextCard.classList.contains('forms-question-card')) {
                setTimeout(() => {
                    nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Visual feedback
                    nextCard.style.transition = 'box-shadow 0.4s';
                    nextCard.style.boxShadow = '0 0 0 2px var(--forms-accent)';
                    setTimeout(() => nextCard.style.boxShadow = '', 600);
                }, 150);
            }

            // Premium: Auto-next step for single choice
            if (radio.type === 'radio' && radio.checked) {
                setTimeout(() => {
                    // Only auto-next if we are in filling mode and not on the last step
                    const nextBtn = $('forms-next-btn');
                    if (nextBtn && nextBtn.style.display !== 'none') {
                        nextBtn.click();
                    }
                }, 600);
            }
        });
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
        card?.classList.remove('is-complete');
        const errorEl = formEl.querySelector(`#forms-error-${fieldId}`);
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = message;
        }
        const stateEl = formEl.querySelector(`#forms-question-state-${fieldId}`);
        if (stateEl) {
            stateEl.textContent = 'Perlu isi';
            stateEl.className = 'forms-question-state is-invalid';
        }
    }

    function showSubmitterNameError(formEl, message) {
        const card = formEl.querySelector('.forms-identity-card');
        card?.classList.add('invalid');
        card?.classList.remove('is-complete');
        const errorEl = formEl.querySelector('#forms-submitter-name-error');
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = message;
        }
        const stateEl = formEl.querySelector('#forms-identity-state');
        if (stateEl) {
            stateEl.textContent = 'Perlu isi';
            stateEl.className = 'forms-question-state is-invalid';
        }
    }

    function focusFirstInvalidField(formEl) {
        const target = formEl.querySelector('.forms-identity-card.invalid input, .forms-question-card.invalid input, .forms-question-card.invalid textarea, .forms-question-card.invalid select');
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { target.focus({ preventScroll: true }); } catch { target.focus(); }
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
        const answers = collectAnswers(formEl, form);
        const statusView = resolveStatusView(form, analysis);
        const runtime = $('forms-runtime-status');
        const badge = $('forms-runtime-badge');
        const note = $('forms-runtime-note');
        const metaStatus = $('forms-meta-status');
        const footerNote = $('forms-footer-note');
        if (runtime) runtime.dataset.status = statusView.code;
        if (badge) badge.innerHTML = `<i class="fas fa-circle"></i> ${escapeHtml(statusView.badge)}`;
        if (note) note.textContent = statusView.note;
        if (metaStatus) metaStatus.textContent = statusView.badge;
        if (footerNote) {
            footerNote.textContent = form.already_submitted
                ? 'Form ini sudah terkirim dan tidak perlu diperbarui lagi.'
                : (!state.auth
                    ? 'Login diperlukan sebelum jawaban bisa dikirim.'
                    : (analysis.readyToSubmit
                        ? 'Semua pertanyaan wajib sudah lengkap. Kamu bisa kirim jawaban sekarang.'
                        : 'Lanjutkan isi bagian yang belum lengkap agar tombol kirim aktif.'));
        }

        const identityCard = formEl.querySelector('.forms-identity-card');
        const identityState = formEl.querySelector('#forms-identity-state');
        const identityComplete = Boolean(analysis.submitterName);
        if (identityCard) {
            identityCard.classList.toggle('is-complete', identityComplete);
            if (!identityCard.classList.contains('invalid')) identityCard.classList.remove('invalid');
        }
        if (identityState && !identityCard?.classList.contains('invalid')) {
            identityState.textContent = identityComplete ? 'Siap' : 'Wajib';
            identityState.className = `forms-question-state ${identityComplete ? 'is-complete' : 'is-required'}`;
        }

        form.fields.forEach((field) => {
            const card = formEl.querySelector(`[data-question-id="${field.id}"]`);
            if (!card) return;
            const complete = hasValue(answers[field.id]);
            const stateEl = formEl.querySelector(`#forms-question-state-${field.id}`);
            card.classList.toggle('is-complete', complete);
            if (!card.classList.contains('invalid')) card.classList.remove('invalid');
            if (stateEl && !card.classList.contains('invalid')) {
                stateEl.textContent = complete ? 'Terisi' : (field.required ? 'Wajib' : 'Opsional');
                stateEl.className = `forms-question-state ${complete ? 'is-complete' : (field.required ? 'is-required' : '')}`;
            }
        });

        // Review Step Content
        const reviewSummary = $('forms-review-summary');
        if (reviewSummary && state.currentStep === form.fields.length + 1) {
            const requiredMissing = form.fields.filter(f => f.required && !hasValue(answers[f.id]));
            reviewSummary.innerHTML = `
                <div class="forms-review-grid">
                    <div class="forms-review-item">
                        <span>Nama Pengisi</span>
                        <strong>${escapeHtml(analysis.submitterName || '-')}</strong>
                    </div>
                    <div class="forms-review-item">
                        <span>Terisi</span>
                        <strong>${analysis.filled} dari ${form.fields.length} pertanyaan</strong>
                    </div>
                    ${requiredMissing.length > 0 ? `
                        <div class="forms-review-alert warning">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>Masih ada ${requiredMissing.length} pertanyaan wajib yang belum diisi.</span>
                        </div>
                    ` : `
                        <div class="forms-review-alert success">
                            <i class="fas fa-check-circle"></i>
                            <span>Semua pertanyaan wajib sudah lengkap.</span>
                        </div>
                    `}
                </div>
            `;
        }

        const submitBtn = formEl.querySelector('#forms-final-submit');
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

    function scrollToFirstError(formEl) {
        const firstError = formEl.querySelector('.forms-inline-error:not([hidden])');
        if (firstError) {
            const card = firstError.closest('.forms-question-card') || firstError.closest('.forms-identity-card');
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.animation = 'none';
                card.offsetHeight; // trigger reflow
                card.style.animation = 'formsErrorShake 0.4s ease';
            }
        }
    }

    async function handleSubmit(event, form) {
        event.preventDefault();
        const formEl = event.target;
        const submitterName = getSubmitterName(formEl);
        const answers = collectAnswers(formEl, form);

        // Haptic Feedback
        if (window.navigator?.vibrate) window.navigator.vibrate(15);

        clearValidation(formEl);
        if (!submitterName) {
            showSubmitterNameError(formEl, 'Nama pengisi wajib diisi.');
            scrollToFirstError(formEl);
            window.Toast?.show('Nama pengisi wajib diisi.', 'warning');
            return;
        }

        if (!validateAnswers(formEl, form, answers)) {
            scrollToFirstError(formEl);
            state.submitState = 'idle';
            state.submitError = '';
            updateRuntimeUI(formEl, form);
            window.Toast?.show('Mohon lengkapi semua pertanyaan wajib.', 'warning');
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
        
        // Show Skeleton Loader
        els.stage.innerHTML = `
            <div class="forms-stage-loading">
                <div class="forms-skeleton-card"></div>
                <div class="forms-skeleton-card"></div>
                <div class="forms-skeleton-card"></div>
            </div>
        `;

        try {
            const data = await fetchJson(`/api/forms?action=detail&slug=${encodeURIComponent(slug)}`);
            state.activeForm = data.form;

            // Apply theme classes
            document.body.classList.remove('is-pretest', 'is-posttest');
            if (state.activeForm.type === 'pretest') document.body.classList.add('is-pretest');
            else if (state.activeForm.type === 'posttest') document.body.classList.add('is-posttest');

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
        document.body.classList.remove('is-pretest', 'is-posttest');
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
