export function initFormsAdmin(state, els, deps) {
    const { apiAdminVercel, escapeHtml, setStatus } = deps;
    const root = document.getElementById('forms-admin-root');
    if (!root) return;

    const local = {
        items: [],
        activeId: 0,
        activeView: 'builder',
        detail: null,
        submissions: [],
        inbox: [],
        editor: null
    };

    const FIELD_TYPES = [
        { value: 'short_text', label: 'Short Text' },
        { value: 'paragraph', label: 'Paragraph' },
        { value: 'single_choice', label: 'Single Choice' },
        { value: 'multiple_choice', label: 'Multiple Choice' },
        { value: 'dropdown', label: 'Dropdown' }
    ];

    function createBlankField() {
        return {
            id: 0,
            label: '',
            field_type: 'short_text',
            required: true,
            placeholder: '',
            options_json: [],
            focus_inbox: false
        };
    }

    function createBlankForm() {
        return {
            id: 0,
            title: '',
            slug: '',
            type: 'pretest',
            description: '',
            status: 'draft',
            allow_multiple: false,
            theme_variant: 'aurora-premium',
            fields: [createBlankField()]
        };
    }

    async function loadList() {
        const data = await apiAdminVercel('GET', '/api/admin/forms?action=list');
        local.items = Array.isArray(data.items) ? data.items : [];
        if (!local.activeId && local.items[0]) local.activeId = Number(local.items[0].id);
        if (!local.activeId) local.editor = createBlankForm();
    }

    async function loadDetail() {
        if (!local.activeId) {
            local.detail = null;
            local.editor = createBlankForm();
            return;
        }
        const data = await apiAdminVercel('GET', `/api/admin/forms?action=detail&id=${local.activeId}`);
        local.detail = data.form || null;
        local.editor = JSON.parse(JSON.stringify(local.detail || createBlankForm()));
    }

    async function loadSubmissions() {
        if (!local.activeId) {
            local.submissions = [];
            return;
        }
        const data = await apiAdminVercel('GET', `/api/admin/forms?action=submissions&id=${local.activeId}`);
        local.submissions = Array.isArray(data.items) ? data.items : [];
    }

    async function loadInbox() {
        if (!local.activeId) {
            local.inbox = [];
            return;
        }
        const data = await apiAdminVercel('GET', `/api/admin/forms?action=inbox&id=${local.activeId}`);
        local.inbox = Array.isArray(data.items) ? data.items : [];
    }

    function renderList() {
        const items = local.items;
        return `
            <div class="forms-admin-sidebar">
                <div class="forms-admin-side-head">
                    <div>
                        <h3>Builder Form</h3>
                        <p>Kelola template pretest dan posttest terpisah dari bank soal lama.</p>
                    </div>
                    <button type="button" class="btn btn-primary forms-admin-new" data-action="new-form">
                        <i class="fas fa-plus"></i> Baru
                    </button>
                </div>
                <div class="forms-admin-list">
                    ${items.length ? items.map((item) => `
                        <button type="button" class="forms-admin-list-card ${Number(item.id) === local.activeId ? 'active' : ''}" data-action="pick-form" data-id="${item.id}">
                            <div class="forms-admin-card-top">
                                <span class="status-badge status-muted">${escapeHtml(item.type)}</span>
                                <span class="forms-admin-mini-status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
                            </div>
                            <strong>${escapeHtml(item.title)}</strong>
                            <p>${escapeHtml(item.description || 'Belum ada deskripsi form.')}</p>
                            <div class="forms-admin-inline-stats">
                                <span>${Number(item.submission_count || 0)} submission</span>
                                <span>${Number(item.inbox_count || 0)} inbox</span>
                            </div>
                        </button>
                    `).join('') : '<div class="small muted">Belum ada form. Buat form pertama dari tombol Baru.</div>'}
                </div>
            </div>
        `;
    }

    function renderEditorFields() {
        const fields = Array.isArray(local.editor?.fields) ? local.editor.fields : [];
        return fields.map((field, index) => `
            <article class="forms-builder-field" data-index="${index}">
                <div class="forms-builder-field-head">
                    <span class="forms-builder-counter">Pertanyaan ${index + 1}</span>
                    <div class="forms-builder-actions">
                        <button type="button" class="btn btn-ghost forms-inline-btn" data-action="move-up" data-index="${index}" ${index === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="btn btn-ghost forms-inline-btn" data-action="move-down" data-index="${index}" ${index === fields.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="btn btn-ghost forms-inline-btn" data-action="remove-field" data-index="${index}" ${fields.length === 1 ? 'disabled' : ''}><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="forms-builder-grid">
                    <label class="forms-builder-label">
                        <span>Label pertanyaan</span>
                        <input type="text" data-action="field-label" data-index="${index}" value="${escapeHtml(field.label || '')}" placeholder="Contoh: Apa motivasi utama kamu ikut kegiatan ini?">
                    </label>
                    <label class="forms-builder-label">
                        <span>Tipe field</span>
                        <select data-action="field-type" data-index="${index}">
                            ${FIELD_TYPES.map((item) => `<option value="${item.value}" ${item.value === field.field_type ? 'selected' : ''}>${item.label}</option>`).join('')}
                        </select>
                    </label>
                    <label class="forms-builder-label forms-builder-span-2">
                        <span>Placeholder / helper</span>
                        <input type="text" data-action="field-placeholder" data-index="${index}" value="${escapeHtml(field.placeholder || '')}" placeholder="Teks bantuan opsional">
                    </label>
                    ${['single_choice', 'multiple_choice', 'dropdown'].includes(field.field_type) ? `
                        <label class="forms-builder-label forms-builder-span-2">
                            <span>Opsi pilihan (satu baris satu opsi)</span>
                            <textarea rows="4" data-action="field-options" data-index="${index}" placeholder="Opsi A&#10;Opsi B&#10;Opsi C">${escapeHtml((field.options_json || []).join('\n'))}</textarea>
                        </label>
                    ` : ''}
                    <label class="forms-builder-check">
                        <input type="checkbox" data-action="field-required" data-index="${index}" ${field.required !== false ? 'checked' : ''}>
                        <span>Wajib diisi</span>
                    </label>
                    <label class="forms-builder-check">
                        <input type="checkbox" data-action="field-focus" data-index="${index}" ${field.focus_inbox === true ? 'checked' : ''}>
                        <span>Masuk inbox admin</span>
                    </label>
                </div>
            </article>
        `).join('');
    }

    function renderBuilderView() {
        const editor = local.editor || createBlankForm();
        const stats = local.detail?.stats || { submission_count: 0, inbox_count: 0 };
        return `
            <div class="forms-admin-workspace">
                <div class="forms-admin-toolbar">
                    <div class="forms-admin-view-switch">
                        <button type="button" class="forms-view-btn ${local.activeView === 'builder' ? 'active' : ''}" data-view="builder">Form Builder</button>
                        <button type="button" class="forms-view-btn ${local.activeView === 'submissions' ? 'active' : ''}" data-view="submissions" ${!editor.id ? 'disabled' : ''}>Submissions</button>
                        <button type="button" class="forms-view-btn ${local.activeView === 'inbox' ? 'active' : ''}" data-view="inbox" ${!editor.id ? 'disabled' : ''}>Inbox</button>
                    </div>
                    <div class="forms-admin-inline-stats">
                        <span>${Number(stats.submission_count || 0)} submission</span>
                        <span>${Number(stats.inbox_count || 0)} inbox</span>
                    </div>
                </div>

                <section class="forms-admin-card">
                    <div class="forms-admin-card-head">
                        <div>
                            <h3>${editor.id ? 'Editor Template' : 'Template Baru'}</h3>
                            <p>Builder ini dirancang untuk pretest dan posttest tanpa skor, dengan fokus pada kualitas jawaban dan inbox admin.</p>
                        </div>
                        <div class="forms-admin-header-actions">
                            ${editor.id ? `
                                <button type="button" class="btn btn-secondary" data-action="toggle-status" data-status="${editor.status === 'published' ? 'archived' : 'published'}">
                                    <i class="fas ${editor.status === 'published' ? 'fa-box-archive' : 'fa-paper-plane'}"></i>
                                    ${editor.status === 'published' ? 'Arsipkan' : 'Publikasikan'}
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-primary" data-action="save-form">
                                <i class="fas fa-floppy-disk"></i> Simpan Template
                            </button>
                        </div>
                    </div>
                    <div class="forms-builder-grid forms-builder-meta-grid">
                        <label class="forms-builder-label">
                            <span>Judul</span>
                            <input type="text" data-action="meta-title" value="${escapeHtml(editor.title || '')}" placeholder="Contoh: Pretest Musyran 2026">
                        </label>
                        <label class="forms-builder-label">
                            <span>Slug</span>
                            <input type="text" data-action="meta-slug" value="${escapeHtml(editor.slug || '')}" placeholder="pretest-musyran-2026">
                        </label>
                        <label class="forms-builder-label">
                            <span>Jenis form</span>
                            <select data-action="meta-type">
                                <option value="pretest" ${editor.type === 'pretest' ? 'selected' : ''}>Pretest</option>
                                <option value="posttest" ${editor.type === 'posttest' ? 'selected' : ''}>Posttest</option>
                            </select>
                        </label>
                        <label class="forms-builder-label">
                            <span>Status</span>
                            <select data-action="meta-status">
                                <option value="draft" ${editor.status === 'draft' ? 'selected' : ''}>Draft</option>
                                <option value="published" ${editor.status === 'published' ? 'selected' : ''}>Published</option>
                                <option value="archived" ${editor.status === 'archived' ? 'selected' : ''}>Archived</option>
                            </select>
                        </label>
                        <label class="forms-builder-label forms-builder-span-2">
                            <span>Deskripsi</span>
                            <textarea rows="3" data-action="meta-description" placeholder="Jelaskan konteks pengisian form...">${escapeHtml(editor.description || '')}</textarea>
                        </label>
                        <label class="forms-builder-check">
                            <input type="checkbox" data-action="meta-allow-multiple" ${editor.allow_multiple === true ? 'checked' : ''}>
                            <span>Izinkan multiple submission</span>
                        </label>
                    </div>
                </section>

                <section class="forms-admin-card">
                    <div class="forms-admin-card-head">
                        <div>
                            <h3>Daftar Pertanyaan</h3>
                            <p>Tambahkan, urutkan, dan tandai pertanyaan esai penting agar masuk ke kotak surat admin.</p>
                        </div>
                        <button type="button" class="btn btn-secondary" data-action="add-field">
                            <i class="fas fa-plus"></i> Tambah Pertanyaan
                        </button>
                    </div>
                    <div class="forms-builder-field-list">
                        ${renderEditorFields()}
                    </div>
                </section>
            </div>
        `;
    }

    function renderSubmissionsView() {
        return `
            <div class="forms-admin-workspace">
                <div class="forms-admin-toolbar">
                    <div class="forms-admin-view-switch">
                        <button type="button" class="forms-view-btn ${local.activeView === 'builder' ? 'active' : ''}" data-view="builder">Form Builder</button>
                        <button type="button" class="forms-view-btn ${local.activeView === 'submissions' ? 'active' : ''}" data-view="submissions">Submissions</button>
                        <button type="button" class="forms-view-btn ${local.activeView === 'inbox' ? 'active' : ''}" data-view="inbox">Inbox</button>
                    </div>
                    <button type="button" class="btn btn-secondary" data-action="reload-submissions"><i class="fas fa-rotate"></i> Refresh</button>
                </div>
                <section class="forms-admin-card">
                    <div class="forms-admin-card-head">
                        <div>
                            <h3>Submission Masuk</h3>
                            <p>Lihat semua pengisi lengkap dengan jawaban per pertanyaan.</p>
                        </div>
                    </div>
                    <div class="forms-admin-submissions">
                        ${local.submissions.length ? local.submissions.map((item) => `
                            <article class="forms-admin-submission-card">
                                <div class="forms-admin-submission-head">
                                    <div>
                                        <strong>${escapeHtml(item.nama_panjang || item.username)}</strong>
                                        <div class="small muted">@${escapeHtml(item.username || '-')} • ${escapeHtml(item.pimpinan || '-')}</div>
                                    </div>
                                    <span class="status-badge status-muted">${new Date(item.submitted_at).toLocaleString('id-ID')}</span>
                                </div>
                                <div class="forms-admin-answer-list">
                                    ${item.answers.map((answer) => `
                                        <div class="forms-admin-answer-item ${answer.focus_inbox ? 'focus' : ''}">
                                            <div class="forms-admin-answer-label">${escapeHtml(answer.label)}</div>
                                            <div class="forms-admin-answer-value">${escapeHtml(Array.isArray(answer.answer_json) ? answer.answer_json.join(', ') : (answer.answer_text || '-'))}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </article>
                        `).join('') : '<div class="small muted">Belum ada submission untuk form ini.</div>'}
                    </div>
                </section>
            </div>
        `;
    }

    function renderInboxView() {
        return `
            <div class="forms-admin-workspace">
                <div class="forms-admin-toolbar">
                    <div class="forms-admin-view-switch">
                        <button type="button" class="forms-view-btn ${local.activeView === 'builder' ? 'active' : ''}" data-view="builder">Form Builder</button>
                        <button type="button" class="forms-view-btn ${local.activeView === 'submissions' ? 'active' : ''}" data-view="submissions">Submissions</button>
                        <button type="button" class="forms-view-btn ${local.activeView === 'inbox' ? 'active' : ''}" data-view="inbox">Inbox</button>
                    </div>
                    <button type="button" class="btn btn-secondary" data-action="reload-inbox"><i class="fas fa-rotate"></i> Refresh</button>
                </div>
                <section class="forms-admin-card">
                    <div class="forms-admin-card-head">
                        <div>
                            <h3>Kotak Surat Jawaban</h3>
                            <p>Inbox ini hanya menampilkan jawaban teks dan paragraf yang kamu tandai sebagai fokus inbox.</p>
                        </div>
                    </div>
                    <div class="forms-admin-inbox">
                        ${local.inbox.length ? local.inbox.map((item) => `
                            <article class="forms-admin-inbox-card">
                                <div class="forms-admin-inbox-top">
                                    <span class="status-badge status-muted">${escapeHtml(item.field_label)}</span>
                                    <span class="small muted">${new Date(item.submitted_at).toLocaleString('id-ID')}</span>
                                </div>
                                <strong>${escapeHtml(item.nama_panjang || item.username)}</strong>
                                <p>${escapeHtml(item.answer_text || '-')}</p>
                                <div class="small muted">@${escapeHtml(item.username || '-')} • ${escapeHtml(item.form_title || '')}</div>
                            </article>
                        `).join('') : '<div class="small muted">Inbox masih kosong. Tandai field teks sebagai fokus inbox untuk mulai mengumpulkan jawaban penting.</div>'}
                    </div>
                </section>
            </div>
        `;
    }

    function render() {
        const workspace = local.activeView === 'submissions'
            ? renderSubmissionsView()
            : (local.activeView === 'inbox' ? renderInboxView() : renderBuilderView());
        root.innerHTML = `
            <div class="forms-admin-layout">
                ${renderList()}
                ${workspace}
            </div>
        `;
    }

    function updateEditorValue(action, index, value, checked) {
        const editor = local.editor || createBlankForm();
        if (action.startsWith('meta-')) {
            const key = action.replace('meta-', '').replace(/-([a-z])/g, (_, char) => char.toUpperCase());
            if (key === 'allowMultiple') editor.allow_multiple = checked;
            else editor[key] = value;
            return;
        }
        const field = editor.fields?.[index];
        if (!field) return;
        if (action === 'field-label') field.label = value;
        if (action === 'field-type') {
            field.field_type = value;
            if (!['single_choice', 'multiple_choice', 'dropdown'].includes(value)) field.options_json = [];
        }
        if (action === 'field-placeholder') field.placeholder = value;
        if (action === 'field-options') field.options_json = String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
        if (action === 'field-required') field.required = checked;
        if (action === 'field-focus') field.focus_inbox = checked;
    }

    async function saveEditor() {
        const payload = {
            id: local.editor.id || undefined,
            title: local.editor.title,
            slug: local.editor.slug,
            type: local.editor.type,
            description: local.editor.description,
            status: local.editor.status,
            allow_multiple: local.editor.allow_multiple === true,
            theme_variant: 'aurora-premium',
            fields: local.editor.fields || []
        };
        const data = await apiAdminVercel('POST', '/api/admin/forms?action=saveTemplate', payload);
        local.activeId = Number(data.form?.id || 0);
        setStatus('Template form berhasil disimpan.', 'ok');
        await reloadAll();
    }

    async function toggleStatus(status) {
        if (!local.activeId) return;
        await apiAdminVercel('POST', '/api/admin/forms?action=publish', { id: local.activeId, status });
        setStatus(`Status form diubah menjadi ${status}.`, 'ok');
        await reloadAll();
    }

    async function reloadAll() {
        await loadList();
        if (local.activeId) {
            await Promise.all([loadDetail(), loadSubmissions(), loadInbox()]);
        }
        render();
    }

    root.addEventListener('click', async (event) => {
        const actionEl = event.target.closest('[data-action], [data-view]');
        if (!actionEl) return;
        const action = actionEl.dataset.action || '';
        const view = actionEl.dataset.view || '';
        const index = Number(actionEl.dataset.index || -1);

        try {
            if (view) {
                local.activeView = view;
                if (view === 'submissions') await loadSubmissions();
                if (view === 'inbox') await loadInbox();
                render();
                return;
            }
            if (action === 'pick-form') {
                local.activeId = Number(actionEl.dataset.id || 0);
                local.activeView = 'builder';
                await Promise.all([loadDetail(), loadSubmissions(), loadInbox()]);
                render();
                return;
            }
            if (action === 'new-form') {
                local.activeId = 0;
                local.activeView = 'builder';
                local.detail = null;
                local.editor = createBlankForm();
                render();
                return;
            }
            if (action === 'add-field') {
                local.editor.fields.push(createBlankField());
                render();
                return;
            }
            if (action === 'remove-field' && index >= 0) {
                local.editor.fields.splice(index, 1);
                render();
                return;
            }
            if (action === 'move-up' && index > 0) {
                const current = local.editor.fields[index];
                local.editor.fields[index] = local.editor.fields[index - 1];
                local.editor.fields[index - 1] = current;
                render();
                return;
            }
            if (action === 'move-down' && index >= 0 && index < local.editor.fields.length - 1) {
                const current = local.editor.fields[index];
                local.editor.fields[index] = local.editor.fields[index + 1];
                local.editor.fields[index + 1] = current;
                render();
                return;
            }
            if (action === 'save-form') {
                await saveEditor();
                return;
            }
            if (action === 'toggle-status') {
                await toggleStatus(actionEl.dataset.status || 'published');
                return;
            }
            if (action === 'reload-submissions') {
                await loadSubmissions();
                render();
                return;
            }
            if (action === 'reload-inbox') {
                await loadInbox();
                render();
            }
        } catch (error) {
            setStatus(error.message || 'Terjadi kesalahan pada modul form.', 'error');
        }
    });

    root.addEventListener('input', (event) => {
        const action = event.target.dataset.action || '';
        if (!action) return;
        updateEditorValue(action, Number(event.target.dataset.index || -1), event.target.value, event.target.checked);
    });

    root.addEventListener('change', (event) => {
        const action = event.target.dataset.action || '';
        if (!action) return;
        updateEditorValue(action, Number(event.target.dataset.index || -1), event.target.value, event.target.checked);
    });

    window.__adminFormsReload = reloadAll;

    reloadAll().catch((error) => {
        root.innerHTML = `<div class="small muted">Gagal memuat modul form: ${escapeHtml(error.message || 'error')}</div>`;
    });
}
