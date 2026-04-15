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
        archiveSummary: null,
        inbox: [],
        editor: null,
        readState: {},
        review: {
            submissions: { sort: 'newest', filter: 'all', selectedId: 0, archiveStatus: 'all', confidentiality: 'all', query: '', page: 1, pageSize: 8 },
            inbox: { sort: 'newest', filter: 'all', selectedId: 0, query: '' }
        },
        workflowState: {},
        busy: {}
    };

    const FIELD_TYPES = [
        { value: 'short_text', label: 'Short Text' },
        { value: 'paragraph', label: 'Paragraph' },
        { value: 'single_choice', label: 'Single Choice' },
        { value: 'multiple_choice', label: 'Multiple Choice' },
        { value: 'dropdown', label: 'Dropdown' }
    ];

    const READ_STATE_KEY = 'ipm_admin_forms_read_v1';

    function readStateKey(type, formId, itemId) {
        return `${type}:${Number(formId || 0)}:${Number(itemId || 0)}`;
    }

    function loadReadState() {
        try {
            const parsed = JSON.parse(localStorage.getItem(READ_STATE_KEY) || '{}');
            local.readState = parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            local.readState = {};
        }
    }

    function saveReadState() {
        try {
            localStorage.setItem(READ_STATE_KEY, JSON.stringify(local.readState));
        } catch {}
    }

    function isRead(type, itemId) {
        const workflow = getWorkflowStatus(type, itemId);
        if (workflow) return workflow === 'done';
        return local.readState[readStateKey(type, local.activeId, itemId)] === true;
    }

    function workflowKey(type, itemId) {
        return `${type}:${Number(local.activeId || 0)}:${Number(itemId || 0)}`;
    }

    function getWorkflowStatus(type, itemId) {
        return String(local.workflowState[workflowKey(type, itemId)] || '').trim().toLowerCase();
    }

    function setWorkflowStatus(type, itemId, status) {
        local.workflowState[workflowKey(type, itemId)] = String(status || 'unread').trim().toLowerCase();
    }

    function markRead(type, itemId) {
        if (!itemId) return;
        local.readState[readStateKey(type, local.activeId, itemId)] = true;
        saveReadState();
    }

    async function markWorkflow(type, itemId, status = 'done') {
        if (!itemId || !local.activeId) return;
        const itemType = type === 'inbox' ? 'inbox' : 'submission';
        const desired = ['unread', 'follow_up', 'done'].includes(status) ? status : 'done';
        await apiAdminVercel('POST', '/api/admin/forms?action=markWorkflow', {
            form_id: Number(local.activeId),
            item_type: itemType,
            item_id: Number(itemId),
            status: desired
        });
        setWorkflowStatus(type, itemId, desired);
    }

    async function saveArchiveMeta(submissionId, payload) {
        if (!local.activeId || !submissionId) return;
        await apiAdminVercel('POST', '/api/admin/forms?action=updateArchiveMeta', {
            form_id: Number(local.activeId),
            submission_id: Number(submissionId),
            archive_code: payload.archive_code || '',
            confidentiality_level: payload.confidentiality_level || 'internal',
            retention_years: Number(payload.retention_years || 2),
            archive_status: payload.archive_status || 'active_archive',
            archive_note: payload.archive_note || ''
        });
    }

    function setActionBusy(action, busy = true) {
        local.busy[action] = Boolean(busy);
    }

    function isActionBusy(action) {
        return local.busy[action] === true;
    }

    function formatDateTime(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('id-ID');
    }

    function can(permissionPath, fallback = true) {
        const perms = state?.permissions;
        if (!perms || typeof perms !== 'object') return fallback;
        const parts = String(permissionPath || '').split('.').filter(Boolean);
        let cursor = perms;
        for (const part of parts) {
            if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return fallback;
            cursor = cursor[part];
        }
        return cursor === true;
    }

    function workflowBadge(status) {
        const value = String(status || 'unread').trim().toLowerCase();
        if (value === 'done') return { text: 'Selesai', className: 'is-read' };
        if (value === 'follow_up') return { text: 'Follow Up', className: 'is-follow-up' };
        return { text: 'Baru', className: 'is-new' };
    }

    function archiveStatusBadge(status) {
        const value = String(status || 'active_archive').trim().toLowerCase();
        if (value === 'inactive_archive') return { text: 'Arsip Inaktif', className: 'is-follow-up' };
        if (value === 'destroy_scheduled') return { text: 'Jadwal Musnah', className: 'is-new' };
        return { text: 'Arsip Aktif', className: 'is-read' };
    }

    function renderArchiveSummary() {
        if (!local.archiveSummary) return '';
        const s = local.archiveSummary;
        return `
            <div class="forms-archive-summary">
                <div class="summary-item">
                    <span class="label">Arsip Aktif</span>
                    <span class="value">${s.archive_status.active_archive}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Arsip Inaktif</span>
                    <span class="value">${s.archive_status.inactive_archive}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Jadwal Musnah</span>
                    <span class="value">${s.archive_status.destroy_scheduled}</span>
                </div>
                <div class="summary-item ${s.due_in_30_days > 0 ? 'highlight' : ''}">
                    <span class="label">Retensi Selesai (30 hr)</span>
                    <span class="value">${s.due_in_30_days}</span>
                </div>
            </div>
        `;
    }

    function confidentialityBadge(level) {
        const value = String(level || 'internal').trim().toLowerCase();
        if (value === 'secret') return { text: 'Rahasia', className: 'is-new' };
        if (value === 'restricted') return { text: 'Terbatas', className: 'is-follow-up' };
        return { text: 'Internal', className: 'is-read' };
    }

    function lifecycleBadge(status) {
        const value = String(status || 'draft').trim().toLowerCase();
        if (value === 'aktif') return { text: 'Aktif', className: 'is-read' };
        if (value === 'selesai') return { text: 'Selesai', className: 'is-follow-up' };
        if (value === 'kadaluarsa') return { text: 'Kadaluarsa', className: 'is-new' };
        return { text: 'Draft', className: 'is-time' };
    }

    function createBlankField() {
        return {
            id: 0,
            label: '',
            field_type: 'short_text',
            required: true,
            placeholder: '',
            options_json: [],
            answer_key_text: '',
            score_weight: 1,
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
            version: 1,
            target_participants: 0,
            start_at: '',
            end_at: '',
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
            local.review.submissions.selectedId = 0;
            return;
        }
        const data = await apiAdminVercel('GET', `/api/admin/forms?action=submissions&id=${local.activeId}`);
        local.submissions = Array.isArray(data.items) ? data.items : [];
        local.submissions.forEach((item) => {
            setWorkflowStatus('submission', item.id, item.workflow_status || 'unread');
        });
        const hasCurrent = local.submissions.some((item) => Number(item.id) === Number(local.review.submissions.selectedId));
        if (!hasCurrent) {
            local.review.submissions.selectedId = Number(local.submissions[0]?.id || 0);
        }
    }

    async function loadInbox() {
        if (!local.activeId) {
            local.inbox = [];
            local.review.inbox.selectedId = 0;
            return;
        }
        const data = await apiAdminVercel('GET', `/api/admin/forms?action=inbox&id=${local.activeId}`);
        local.inbox = Array.isArray(data.items) ? data.items : [];
        local.inbox.forEach((item) => {
            setWorkflowStatus('inbox', item.id, item.workflow_status || 'unread');
        });
        const hasCurrent = local.inbox.some((item) => Number(item.id) === Number(local.review.inbox.selectedId));
        if (!hasCurrent) {
            local.review.inbox.selectedId = Number(local.inbox[0]?.id || 0);
        }
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
                                <span class="forms-admin-mini-status ${escapeHtml(item.status)}">${escapeHtml(lifecycleBadge(item.lifecycle_status).text)}</span>
                            </div>
                            <strong>${escapeHtml(item.display_name || item.title)}</strong>
                            <p>${escapeHtml(item.description || 'Belum ada deskripsi form.')}</p>
                            <div class="forms-admin-inline-stats">
                                <span>${Number(item.submission_count || 0)} submission</span>
                                <span>${Number(item.submission_progress_percent || 0)}% progres</span>
                                <span>${Number(item.reviewed_count || 0)} direview</span>
                                <span>${Number(item.inbox_count || 0)} inbox</span>
                            </div>
                            <div class="small muted">Diupdate: ${formatDateTime(item.updated_at)}</div>
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
                        <label class="forms-builder-label">
                            <span>Kunci jawaban ${field.field_type === 'multiple_choice' ? '(pisahkan dengan |)' : ''}</span>
                            <input type="text" data-action="field-answer-key" data-index="${index}" value="${escapeHtml(field.answer_key_text || '')}" placeholder="${field.field_type === 'multiple_choice' ? 'Contoh: Opsi A|Opsi C' : 'Contoh: Opsi B'}">
                        </label>
                        <label class="forms-builder-label">
                            <span>Bobot skor</span>
                            <input type="number" min="0" max="100" step="1" data-action="field-score-weight" data-index="${index}" value="${Number(field.score_weight || 1)}">
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
        const stats = local.detail?.stats || { submission_count: 0, inbox_count: 0, reviewed_count: 0, submission_progress_percent: 0 };
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
                        <span>${Number(stats.submission_progress_percent || 0)}% progres</span>
                        <span>${Number(stats.reviewed_count || 0)} direview</span>
                        <span>${Number(stats.inbox_count || 0)} inbox</span>
                    </div>
                </div>

                <section class="forms-admin-card">
                    <div class="forms-admin-card-head">
                        <div>
                            <h3>${editor.id ? 'Editor Template' : 'Template Baru'}</h3>
                            <p>Kelola pretest/posttest dengan nama jelas, jadwal, versi, dan target peserta agar tidak ambigu.</p>
                        </div>
                        <div class="forms-admin-header-actions">
                            ${editor.id ? `
                                <button type="button" class="btn btn-secondary ${isActionBusy('toggle-status') ? 'is-loading' : ''}" data-action="toggle-status" data-status="${editor.status === 'published' ? 'archived' : 'published'}" ${(!can('forms.publish') || isActionBusy('toggle-status')) ? 'disabled' : ''} title="${can('forms.publish') ? '' : 'Tidak punya izin publish'}">
                                    <i class="fas ${editor.status === 'published' ? 'fa-box-archive' : 'fa-paper-plane'}"></i>
                                    ${isActionBusy('toggle-status') ? 'Memproses...' : (editor.status === 'published' ? 'Arsipkan' : 'Publikasikan')}
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-primary ${isActionBusy('save-form') ? 'is-loading' : ''}" data-action="save-form" ${(!can('forms.write') || isActionBusy('save-form')) ? 'disabled' : ''} title="${can('forms.write') ? '' : 'Tidak punya izin edit'}">
                                <i class="fas fa-floppy-disk"></i> ${isActionBusy('save-form') ? 'Menyimpan...' : 'Simpan Template'}
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
                                <option value="published" ${editor.status === 'published' ? 'selected' : ''}>Aktif</option>
                                <option value="archived" ${editor.status === 'archived' ? 'selected' : ''}>Selesai</option>
                            </select>
                        </label>
                        <label class="forms-builder-label">
                            <span>Versi</span>
                            <input type="number" min="1" max="99" step="1" data-action="meta-version" value="${Number(editor.version || 1)}" placeholder="1">
                        </label>
                        <label class="forms-builder-label">
                            <span>Target Peserta</span>
                            <input type="number" min="0" max="100000" step="1" data-action="meta-target-participants" value="${Number(editor.target_participants || 0)}" placeholder="0">
                        </label>
                        <label class="forms-builder-label">
                            <span>Mulai</span>
                            <input type="datetime-local" data-action="meta-start-at" value="${escapeHtml(String(editor.start_at || '').slice(0, 16))}">
                        </label>
                        <label class="forms-builder-label">
                            <span>Selesai</span>
                            <input type="datetime-local" data-action="meta-end-at" value="${escapeHtml(String(editor.end_at || '').slice(0, 16))}">
                        </label>
                        <label class="forms-builder-label forms-builder-span-2">
                            <span>Deskripsi</span>
                            <textarea rows="3" data-action="meta-description" placeholder="Jelaskan konteks pengisian form...">${escapeHtml(editor.description || '')}</textarea>
                        </label>
                        <div class="forms-builder-label forms-builder-span-2">
                            <span>Nama Test Otomatis</span>
                            <small class="muted">${escapeHtml((editor.title || 'Tanpa Judul').trim() || 'Tanpa Judul')} • ${new Date().toLocaleDateString('id-ID')} • v${Number(editor.version || 1)}</small>
                        </div>
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
                        <button type="button" class="btn btn-secondary" data-action="add-field" ${!can('forms.write') ? 'disabled' : ''} title="${can('forms.write') ? '' : 'Tidak punya izin edit'}">
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

    function getSortedSubmissions() {
        const mode = local.review.submissions.sort || 'newest';
        const list = [...local.submissions];
        list.sort((a, b) => {
            if (mode === 'oldest') return new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0);
            if (mode === 'name_asc') {
                return String(a.nama_panjang || a.username || '').localeCompare(String(b.nama_panjang || b.username || ''), 'id', { sensitivity: 'base' });
            }
            return new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0);
        });
        const filter = local.review.submissions.filter || 'all';
        let filtered = list;
        if (filter === 'focus') filtered = filtered.filter((item) => (item.answers || []).some((answer) => answer.focus_inbox === true));
        if (filter === 'unread') filtered = filtered.filter((item) => getWorkflowStatus('submission', item.id) !== 'done');
        const archiveStatus = local.review.submissions.archiveStatus || 'all';
        if (archiveStatus !== 'all') {
            filtered = filtered.filter((item) => String(item.archive_status || 'active_archive').trim().toLowerCase() === archiveStatus);
        }
        const confidentiality = local.review.submissions.confidentiality || 'all';
        if (confidentiality !== 'all') {
            filtered = filtered.filter((item) => String(item.confidentiality_level || 'internal').trim().toLowerCase() === confidentiality);
        }
        const queryText = String(local.review.submissions.query || '').trim().toLowerCase();
        if (queryText) {
            filtered = filtered.filter((item) => {
                const haystack = [
                    item.nama_panjang,
                    item.username,
                    item.pimpinan,
                    item.archive_code,
                    item.archive_note
                ]
                    .map((v) => String(v || '').toLowerCase())
                    .join(' ');
                return haystack.includes(queryText);
            });
        }
        return filtered;
    }

    function getPaginatedSubmissions() {
        const list = getSortedSubmissions();
        const pageSize = Math.max(1, Number(local.review.submissions.pageSize || 8));
        const totalItems = list.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const page = Math.min(Math.max(1, Number(local.review.submissions.page || 1)), totalPages);
        local.review.submissions.page = page;
        const start = (page - 1) * pageSize;
        return {
            page,
            pageSize,
            totalItems,
            totalPages,
            items: list.slice(start, start + pageSize),
            allItems: list
        };
    }

    function getSortedInbox() {
        const mode = local.review.inbox.sort || 'newest';
        const list = [...local.inbox];
        list.sort((a, b) => {
            if (mode === 'oldest') return new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0);
            if (mode === 'name_asc') {
                return String(a.nama_panjang || a.username || '').localeCompare(String(b.nama_panjang || b.username || ''), 'id', { sensitivity: 'base' });
            }
            return new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0);
        });
        const filter = local.review.inbox.filter || 'all';
        let filtered = list;
        if (filter === 'unread') filtered = filtered.filter((item) => getWorkflowStatus('inbox', item.id) !== 'done');
        const queryText = String(local.review.inbox.query || '').trim().toLowerCase();
        if (!queryText) return filtered;
        return filtered.filter((item) => {
            const haystack = [
                item.nama_panjang,
                item.username,
                item.field_label,
                item.form_title,
                item.answer_text
            ]
                .map((v) => String(v || '').toLowerCase())
                .join(' ');
            return haystack.includes(queryText);
        });
    }

    function renderReviewToolbar(view) {
        const review = view === 'inbox' ? local.review.inbox : local.review.submissions;
        const refreshAction = view === 'inbox' ? 'reload-inbox' : 'reload-submissions';
        const activeList = view === 'inbox' ? getSortedInbox() : getSortedSubmissions();
        const selectedId = Number(review.selectedId || 0);
        const selectedItem = activeList.find((item) => Number(item.id) === selectedId) || activeList[0] || null;
        const selectedLabel = selectedItem ? escapeHtml(selectedItem.nama_panjang || selectedItem.username || '-') : 'Belum ada item dipilih';
        const refreshBusy = isActionBusy(refreshAction);
        return `
            <div class="forms-admin-toolbar">
                <div class="forms-admin-view-switch">
                    <button type="button" class="forms-view-btn ${local.activeView === 'builder' ? 'active' : ''}" data-view="builder" title="Kelola struktur dan pengaturan test"><i class="fas fa-layer-group"></i> Form Builder</button>
                    <button type="button" class="forms-view-btn ${local.activeView === 'submissions' ? 'active' : ''}" data-view="submissions" title="Lihat daftar peserta dan hasil jawaban"><i class="fas fa-list-check"></i> Submissions</button>
                    <button type="button" class="forms-view-btn ${local.activeView === 'inbox' ? 'active' : ''}" data-view="inbox" title="Lihat jawaban fokus yang perlu ditindaklanjuti"><i class="fas fa-inbox"></i> Inbox</button>
                </div>
                <div class="forms-review-controls">
                    <div class="toolbar-select-wrapper" title="Urutkan daftar peserta/jawaban">
                        <i class="fas fa-sort-amount-down-alt"></i>
                        <select class="toolbar-select" data-action="${view}-sort">
                            <option value="newest" ${review.sort === 'newest' ? 'selected' : ''}>Terbaru</option>
                            <option value="oldest" ${review.sort === 'oldest' ? 'selected' : ''}>Terlama</option>
                            <option value="name_asc" ${review.sort === 'name_asc' ? 'selected' : ''}>Nama A-Z</option>
                        </select>
                    </div>
                    <div class="toolbar-select-wrapper" title="Cari data lebih cepat">
                        <i class="fas fa-search"></i>
                        <input type="search" class="toolbar-input" data-action="${view}-query" value="${escapeHtml(review.query || '')}" placeholder="${view === 'submissions' ? 'Cari nama / username / kode arsip…' : 'Cari nama / field / jawaban…'}">
                    </div>
                    <div class="forms-review-filter-group">
                        <button type="button" class="forms-review-filter ${review.filter === 'all' ? 'active' : ''}" data-action="${view}-filter" data-filter="all">Semua</button>
                        <button type="button" class="forms-review-filter ${review.filter === 'focus' ? 'active' : ''}" data-action="${view}-filter" data-filter="focus"><i class="fas fa-star"></i> Focus</button>
                        <button type="button" class="forms-review-filter ${review.filter === 'unread' ? 'active' : ''}" data-action="${view}-filter" data-filter="unread"><i class="fas fa-eye-slash"></i> Baru</button>
                    </div>
                    ${view === 'submissions' ? `
                        <div class="toolbar-select-wrapper">
                            <i class="fas fa-box-archive"></i>
                            <select class="toolbar-select" data-action="submissions-archive-status">
                                <option value="all" ${review.archiveStatus === 'all' ? 'selected' : ''}>Semua Arsip</option>
                                <option value="active_archive" ${review.archiveStatus === 'active_archive' ? 'selected' : ''}>Arsip Aktif</option>
                                <option value="inactive_archive" ${review.archiveStatus === 'inactive_archive' ? 'selected' : ''}>Arsip Inaktif</option>
                                <option value="destroy_scheduled" ${review.archiveStatus === 'destroy_scheduled' ? 'selected' : ''}>Jadwal Musnah</option>
                            </select>
                        </div>
                        <div class="toolbar-select-wrapper">
                            <i class="fas fa-shield-alt"></i>
                            <select class="toolbar-select" data-action="submissions-confidentiality">
                                <option value="all" ${review.confidentiality === 'all' ? 'selected' : ''}>Semua Akses</option>
                                <option value="internal" ${review.confidentiality === 'internal' ? 'selected' : ''}>Internal</option>
                                <option value="restricted" ${review.confidentiality === 'restricted' ? 'selected' : ''}>Terbatas</option>
                                <option value="secret" ${review.confidentiality === 'secret' ? 'selected' : ''}>Rahasia</option>
                            </select>
                        </div>
                    ` : ''}
                    <button type="button" class="btn btn-secondary ${refreshBusy ? 'is-loading' : ''}" data-action="${refreshAction}" ${refreshBusy ? 'disabled' : ''}>
                        <i class="fas fa-rotate"></i> ${refreshBusy ? 'Memuat...' : 'Refresh'}
                    </button>
                </div>
                <div class="forms-review-selected-context">
                    <i class="fas fa-user-check"></i> <span>Sedang meninjau: <strong>${selectedLabel}</strong></span>
                </div>
            </div>
        `;
    }

    function renderSubmissionDetail(item) {
        if (!item) return `<section class="forms-admin-card forms-review-detail-empty">Pilih submission di panel kiri untuk melihat jawaban lengkap.</section>`;
        const status = workflowBadge(getWorkflowStatus('submission', item.id));
        const archive = archiveStatusBadge(item.archive_status);
        const confidentiality = confidentialityBadge(item.confidentiality_level);
        const canArchiveRead = can('forms.archive_read');
        const canArchiveManage = can('forms.archive_manage');
        return `
            <section class="forms-admin-card forms-review-detail-card">
                <div class="forms-admin-card-head">
                    <div>
                        <h3>${escapeHtml(item.nama_panjang || item.username)}</h3>
                        <p>@${escapeHtml(item.username || '-')} • ${escapeHtml(item.pimpinan || '-')}</p>
                    </div>
                    <div class="forms-review-badge-stack">
                        <span class="forms-review-badge is-time">${formatDateTime(item.submitted_at)}</span>
                        <span class="forms-review-badge ${status.className}">${status.text}</span>
                        ${canArchiveRead ? `<span class="forms-review-badge ${archive.className}">${archive.text}</span>` : ''}
                        ${canArchiveRead ? `<span class="forms-review-badge ${confidentiality.className}">${confidentiality.text}</span>` : ''}
                    </div>
                </div>
                <div class="forms-review-action-row">
                    <button type="button" class="btn btn-secondary forms-inline-btn" data-action="workflow-submission" data-id="${item.id}" data-status="unread"><i class="fas fa-envelope"></i> Set Baru</button>
                    <button type="button" class="btn btn-secondary forms-inline-btn" data-action="workflow-submission" data-id="${item.id}" data-status="follow_up"><i class="fas fa-clock"></i> Set Follow Up</button>
                    <button type="button" class="btn btn-secondary forms-inline-btn" data-action="workflow-submission" data-id="${item.id}" data-status="done"><i class="fas fa-check-double"></i> Set Selesai</button>
                </div>
                <div class="forms-review-score-row">
                    <span class="forms-review-badge is-focus">Skor: ${Number(item.score_obtained || 0)} / ${Number(item.score_max || 0)}</span>
                    <span class="small muted">Dinilai otomatis untuk soal pilihan yang punya kunci jawaban.</span>
                </div>
                <div class="forms-admin-answer-list forms-admin-answer-list-strong">
                    ${(item.answers || []).map((answer) => `
                        <div class="forms-admin-answer-item ${answer.focus_inbox ? 'focus' : ''}">
                            <div class="forms-admin-answer-label">
                                ${escapeHtml(answer.label)}
                                <span class="forms-review-badge ${answer.answer_status === 'benar' ? 'is-read' : (answer.answer_status === 'salah' ? 'is-new' : 'is-time')}">
                                    ${answer.answer_status === 'benar' ? 'Benar' : (answer.answer_status === 'salah' ? 'Salah' : 'Perlu Review')}
                                </span>
                            </div>
                            <div class="forms-admin-answer-value strong">${escapeHtml(Array.isArray(answer.answer_json) ? answer.answer_json.join(', ') : (answer.answer_text || '-'))}</div>
                            ${answer.answer_key_text ? `<div class="small muted mt-12">Kunci: ${escapeHtml(answer.answer_key_text)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                ${canArchiveRead ? `
                    <div class="forms-admin-card-head mt-12">
                        <div>
                            <h3>Metadata Arsip</h3>
                            <p>Kelola klasifikasi, retensi, dan status arsip submission ini.</p>
                        </div>
                    </div>
                    <div class="forms-builder-grid forms-builder-meta-grid">
                        <label class="forms-builder-label">
                            <span>Kode Arsip</span>
                            <input type="text" data-action="archive-code" data-id="${item.id}" value="${escapeHtml(item.archive_code || '')}" placeholder="FRM-PRETEST-001" ${!canArchiveManage ? 'disabled' : ''}>
                        </label>
                        <label class="forms-builder-label">
                            <span>Kerahasiaan</span>
                            <select data-action="archive-confidentiality" data-id="${item.id}" ${!canArchiveManage ? 'disabled' : ''}>
                                <option value="internal" ${String(item.confidentiality_level || 'internal') === 'internal' ? 'selected' : ''}>Internal</option>
                                <option value="restricted" ${String(item.confidentiality_level || '') === 'restricted' ? 'selected' : ''}>Terbatas</option>
                                <option value="secret" ${String(item.confidentiality_level || '') === 'secret' ? 'selected' : ''}>Rahasia</option>
                            </select>
                        </label>
                        <label class="forms-builder-label">
                            <span>Retensi (tahun)</span>
                            <input type="number" min="1" max="25" step="1" data-action="archive-retention" data-id="${item.id}" value="${Number(item.retention_years || 2)}" ${!canArchiveManage ? 'disabled' : ''}>
                        </label>
                        <label class="forms-builder-label">
                            <span>Status Arsip</span>
                            <select data-action="archive-status" data-id="${item.id}" ${!canArchiveManage ? 'disabled' : ''}>
                                <option value="active_archive" ${String(item.archive_status || 'active_archive') === 'active_archive' ? 'selected' : ''}>Arsip Aktif</option>
                                <option value="inactive_archive" ${String(item.archive_status || '') === 'inactive_archive' ? 'selected' : ''}>Arsip Inaktif</option>
                                <option value="destroy_scheduled" ${String(item.archive_status || '') === 'destroy_scheduled' ? 'selected' : ''}>Jadwal Musnah</option>
                            </select>
                        </label>
                        <label class="forms-builder-label forms-builder-span-2">
                            <span>Catatan Arsip</span>
                            <textarea rows="3" data-action="archive-note" data-id="${item.id}" placeholder="Catatan admin arsip..." ${!canArchiveManage ? 'disabled' : ''}>${escapeHtml(item.archive_note || '')}</textarea>
                        </label>
                        <label class="forms-builder-label forms-builder-span-2">
                            <span>Jatuh Tempo Retensi</span>
                            <input type="text" value="${escapeHtml(item.archive_due_at ? formatDateTime(item.archive_due_at) : '-')}" readonly>
                        </label>
                    </div>
                    ${canArchiveManage ? `
                        <div class="forms-review-action-row">
                            <button type="button" class="btn btn-primary forms-inline-btn" data-action="save-archive-meta" data-id="${item.id}">
                                <i class="fas fa-floppy-disk"></i> Simpan Metadata Arsip
                            </button>
                        </div>
                    ` : '<div class="small muted">Mode baca saja: Anda tidak memiliki izin untuk mengubah metadata arsip.</div>'}
                ` : ''}
            </section>
        `;
    }

    function renderSubmissionsViewV2() {
        const pagination = getPaginatedSubmissions();
        const list = pagination.items;
        const selected = pagination.allItems.find((item) => Number(item.id) === Number(local.review.submissions.selectedId)) || pagination.allItems[0] || null;
        return `
            <div class="forms-admin-workspace">
                ${renderReviewToolbar('submissions')}
                <div class="forms-admin-review-shell">
                    <section class="forms-admin-card forms-review-list-panel">
                        <div class="forms-admin-card-head">
                            <div>
                                <h3>Submission Masuk</h3>
                                <p>Pilih pengisi di kiri, baca jawaban di panel kanan.</p>
                            </div>
                        </div>
                        <div class="forms-review-list">
                            ${can('forms.archive_read') ? renderArchiveSummary() : ''}
                            ${list.length ? list.map((item) => {
                                const hasFocus = (item.answers || []).some((answer) => answer.focus_inbox === true);
                                const status = workflowBadge(getWorkflowStatus('submission', item.id));
                                const archive = archiveStatusBadge(item.archive_status);
                                const confidentiality = confidentialityBadge(item.confidentiality_level);
                                return `
                                    <button type="button" class="forms-review-list-item ${Number(selected?.id || 0) === Number(item.id) ? 'active' : ''}" data-action="pick-submission" data-id="${item.id}">
                                        <div class="forms-review-list-head">
                                            <strong>${escapeHtml(item.nama_panjang || item.username)}</strong>
                                            <span class="forms-review-badge is-time">${formatDateTime(item.submitted_at)}</span>
                                        </div>
                                        <div class="small muted">@${escapeHtml(item.username || '-')} • ${escapeHtml(item.pimpinan || '-')}</div>
                                        <div class="small muted">Skor: ${Number(item.score_obtained || 0)} / ${Number(item.score_max || 0)}</div>
                                        <div class="forms-review-badge-row">
                                            <span class="forms-review-badge ${status.className}">${status.text}</span>
                                            ${hasFocus ? '<span class="forms-review-badge is-focus">Focus Inbox</span>' : ''}
                                            <span class="forms-review-badge ${archive.className}">${archive.text}</span>
                                            <span class="forms-review-badge ${confidentiality.className}">${confidentiality.text}</span>
                                        </div>
                                    </button>
                                `;
                            }).join('') : '<div class="small muted">Belum ada submission untuk form ini.</div>'}
                        </div>
                        <div class="forms-review-pagination">
                            <button type="button" class="btn btn-secondary" data-action="submissions-page-prev" ${pagination.page <= 1 ? 'disabled' : ''}>Sebelumnya</button>
                            <span class="small muted">Halaman ${pagination.page} / ${pagination.totalPages} (${pagination.totalItems} peserta)</span>
                            <button type="button" class="btn btn-secondary" data-action="submissions-page-next" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>Berikutnya</button>
                        </div>
                    </section>
                    ${renderSubmissionDetail(selected)}
                </div>
            </div>
        `;
    }

    function renderInboxDetail(item) {
        if (!item) return `<section class="forms-admin-card forms-review-detail-empty">Pilih item inbox di panel kiri untuk membaca jawaban lengkap.</section>`;
        const status = workflowBadge(getWorkflowStatus('inbox', item.id));
        return `
            <section class="forms-admin-card forms-review-detail-card">
                <div class="forms-admin-card-head">
                    <div>
                        <h3>${escapeHtml(item.nama_panjang || item.username)}</h3>
                        <p>${escapeHtml(item.field_label || 'Field teks')} • ${escapeHtml(item.form_title || '-')}</p>
                    </div>
                    <div class="forms-review-badge-stack">
                        <span class="forms-review-badge is-time">${formatDateTime(item.submitted_at)}</span>
                        <span class="forms-review-badge ${status.className}">${status.text}</span>
                    </div>
                </div>
                <div class="forms-review-action-row">
                    <button type="button" class="btn btn-secondary forms-inline-btn" data-action="workflow-inbox" data-id="${item.id}" data-status="unread"><i class="fas fa-envelope"></i> Set Baru</button>
                    <button type="button" class="btn btn-secondary forms-inline-btn" data-action="workflow-inbox" data-id="${item.id}" data-status="follow_up"><i class="fas fa-clock"></i> Set Follow Up</button>
                    <button type="button" class="btn btn-secondary forms-inline-btn" data-action="workflow-inbox" data-id="${item.id}" data-status="done"><i class="fas fa-check-double"></i> Set Selesai</button>
                </div>
                <div class="forms-admin-answer-item focus">
                    <div class="forms-admin-answer-label">${escapeHtml(item.field_label || 'Jawaban')}</div>
                    <div class="forms-admin-answer-value strong">${escapeHtml(item.answer_text || '-')}</div>
                </div>
                <div class="forms-review-badge-row mt-12">
                    <span class="forms-review-badge is-focus">Focus Inbox</span>
                    <button type="button" class="btn btn-secondary" data-action="open-submission-from-inbox" data-id="${item.submission_id}">Buka Submission Asal</button>
                </div>
            </section>
        `;
    }

    function renderInboxViewV2() {
        const list = getSortedInbox();
        const selected = list.find((item) => Number(item.id) === Number(local.review.inbox.selectedId)) || list[0] || null;
        return `
            <div class="forms-admin-workspace">
                ${renderReviewToolbar('inbox')}
                <div class="forms-admin-review-shell">
                    <section class="forms-admin-card forms-review-list-panel">
                        <div class="forms-admin-card-head">
                            <div>
                                <h3>Kotak Surat Jawaban</h3>
                                <p>Pilih item inbox untuk membaca jawaban penting secara penuh.</p>
                            </div>
                        </div>
                        <div class="forms-review-list">
                            ${list.length ? list.map((item) => {
                                const status = workflowBadge(getWorkflowStatus('inbox', item.id));
                                return `
                                    <button type="button" class="forms-review-list-item ${Number(selected?.id || 0) === Number(item.id) ? 'active' : ''}" data-action="pick-inbox-item" data-id="${item.id}">
                                        <div class="forms-review-list-head">
                                            <strong>${escapeHtml(item.nama_panjang || item.username)}</strong>
                                            <span class="forms-review-badge is-time">${formatDateTime(item.submitted_at)}</span>
                                        </div>
                                        <div class="small muted">${escapeHtml(item.field_label || '-')}</div>
                                        <div class="forms-review-preview">${escapeHtml(item.answer_text || '-')}</div>
                                        <div class="forms-review-badge-row">
                                            <span class="forms-review-badge ${status.className}">${status.text}</span>
                                            <span class="forms-review-badge is-focus">Focus Inbox</span>
                                        </div>
                                    </button>
                                `;
                            }).join('') : '<div class="small muted">Inbox masih kosong. Tandai field teks sebagai focus inbox untuk mulai mengumpulkan jawaban penting.</div>'}
                        </div>
                    </section>
                    ${renderInboxDetail(selected)}
                </div>
            </div>
        `;
    }

    function render() {
        const workspace = local.activeView === 'submissions'
            ? renderSubmissionsViewV2()
            : (local.activeView === 'inbox' ? renderInboxViewV2() : renderBuilderView());
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
            else if (key === 'version') editor.version = Number(value || 1);
            else if (key === 'targetParticipants') editor.target_participants = Number(value || 0);
            else if (key === 'startAt') editor.start_at = value || '';
            else if (key === 'endAt') editor.end_at = value || '';
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
        if (action === 'field-answer-key') field.answer_key_text = value;
        if (action === 'field-score-weight') field.score_weight = Number(value || 1);
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
            version: Number(local.editor.version || 1),
            target_participants: Number(local.editor.target_participants || 0),
            start_at: local.editor.start_at || null,
            end_at: local.editor.end_at || null,
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

    async function loadArchiveSummary() {
        if (!local.activeId) {
            local.archiveSummary = null;
            return;
        }
        const data = await apiAdminVercel('GET', `/api/admin/forms?action=archiveSummary&id=${local.activeId}`);
        local.archiveSummary = data.summary || null;
    }

    async function reloadAll() {
        await loadList();
        if (local.activeId) {
            await Promise.all([loadDetail(), loadSubmissions(), loadInbox(), loadArchiveSummary()]);
        }
        render();
    }

    function moveSelection(delta = 1) {
        if (local.activeView !== 'submissions' && local.activeView !== 'inbox') return;
        const list = local.activeView === 'submissions' ? getSortedSubmissions() : getSortedInbox();
        if (!list.length) return;
        const review = local.activeView === 'submissions' ? local.review.submissions : local.review.inbox;
        const currentId = Number(review.selectedId || 0);
        const currentIndex = Math.max(0, list.findIndex((item) => Number(item.id) === currentId));
        const nextIndex = Math.min(Math.max(currentIndex + delta, 0), list.length - 1);
        review.selectedId = Number(list[nextIndex].id);
        render();
    }

    root.addEventListener('click', async (event) => {
        const actionEl = event.target.closest('[data-action], [data-view]');
        if (!actionEl) return;
        const action = actionEl.dataset.action || '';
        const view = actionEl.dataset.view || '';
        const index = Number(actionEl.dataset.index || -1);

        try {
            const writeActions = new Set(['add-field', 'remove-field', 'move-up', 'move-down', 'save-form']);
            if (writeActions.has(action) && !can('forms.write')) {
                setStatus('Aksi ditolak: izin edit form tidak tersedia.', 'error');
                return;
            }
            if (action === 'toggle-status' && !can('forms.publish')) {
                setStatus('Aksi ditolak: izin publish tidak tersedia.', 'error');
                return;
            }
            if ((action === 'workflow-submission' || action === 'workflow-inbox') && !can('forms.workflow_mark')) {
                setStatus('Aksi ditolak: izin workflow tidak tersedia.', 'error');
                return;
            }
            if (action === 'save-archive-meta' && !can('forms.archive_manage')) {
                setStatus('Aksi ditolak: izin arsip tidak tersedia.', 'error');
                return;
            }

            if (view) {
                local.activeView = view;
                if (view === 'submissions') await loadSubmissions();
                if (view === 'submissions') await loadArchiveSummary();
                if (view === 'inbox') await loadInbox();
                render();
                return;
            }
            if (action === 'pick-form') {
                local.activeId = Number(actionEl.dataset.id || 0);
                local.activeView = 'builder';
                local.review.submissions.page = 1;
                local.review.submissions.selectedId = 0;
                local.review.inbox.selectedId = 0;
                await Promise.all([loadDetail(), loadSubmissions(), loadInbox(), loadArchiveSummary()]);
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
                if (isActionBusy(action)) return;
                setActionBusy(action, true);
                render();
                await saveEditor();
                setActionBusy(action, false);
                render();
                return;
            }
            if (action === 'toggle-status') {
                if (isActionBusy(action)) return;
                setActionBusy(action, true);
                render();
                await toggleStatus(actionEl.dataset.status || 'published');
                setActionBusy(action, false);
                render();
                return;
            }
            if (action === 'reload-submissions') {
                if (isActionBusy(action)) return;
                setActionBusy(action, true);
                render();
                await Promise.all([loadSubmissions(), loadArchiveSummary()]);
                setActionBusy(action, false);
                render();
                return;
            }
            if (action === 'reload-inbox') {
                if (isActionBusy(action)) return;
                setActionBusy(action, true);
                render();
                await loadInbox();
                setActionBusy(action, false);
                render();
                return;
            }
            if (action === 'pick-submission') {
                const id = Number(actionEl.dataset.id || 0);
                local.review.submissions.selectedId = id;
                markRead('submission', id);
                if (can('forms.workflow_mark')) await markWorkflow('submission', id, 'done');
                render();
                return;
            }
            if (action === 'submissions-page-prev') {
                local.review.submissions.page = Math.max(1, Number(local.review.submissions.page || 1) - 1);
                render();
                return;
            }
            if (action === 'submissions-page-next') {
                local.review.submissions.page = Number(local.review.submissions.page || 1) + 1;
                render();
                return;
            }
            if (action === 'pick-inbox-item') {
                const id = Number(actionEl.dataset.id || 0);
                local.review.inbox.selectedId = id;
                markRead('inbox', id);
                if (can('forms.workflow_mark')) await markWorkflow('inbox', id, 'done');
                render();
                return;
            }
            if (action === 'submissions-filter') {
                local.review.submissions.filter = actionEl.dataset.filter || 'all';
                local.review.submissions.page = 1;
                render();
                return;
            }
            if (action === 'inbox-filter') {
                local.review.inbox.filter = actionEl.dataset.filter || 'all';
                render();
                return;
            }
            if (action === 'open-submission-from-inbox') {
                local.activeView = 'submissions';
                local.review.submissions.selectedId = Number(actionEl.dataset.id || 0);
                local.review.submissions.page = 1;
                markRead('submission', local.review.submissions.selectedId);
                if (can('forms.workflow_mark')) await markWorkflow('submission', local.review.submissions.selectedId, 'done');
                await loadSubmissions();
                render();
                return;
            }
            if (action === 'workflow-submission') {
                const id = Number(actionEl.dataset.id || 0);
                await markWorkflow('submission', id, actionEl.dataset.status || 'done');
                if (id) local.review.submissions.selectedId = id;
                await loadSubmissions();
                render();
                return;
            }
            if (action === 'workflow-inbox') {
                const id = Number(actionEl.dataset.id || 0);
                await markWorkflow('inbox', id, actionEl.dataset.status || 'done');
                if (id) local.review.inbox.selectedId = id;
                await loadInbox();
                render();
                return;
            }
            if (action === 'save-archive-meta') {
                const id = Number(actionEl.dataset.id || 0);
                if (!id) return;
                const fieldCode = root.querySelector(`[data-action="archive-code"][data-id="${id}"]`);
                const fieldConf = root.querySelector(`[data-action="archive-confidentiality"][data-id="${id}"]`);
                const fieldRetention = root.querySelector(`[data-action="archive-retention"][data-id="${id}"]`);
                const fieldStatus = root.querySelector(`[data-action="archive-status"][data-id="${id}"]`);
                const fieldNote = root.querySelector(`[data-action="archive-note"][data-id="${id}"]`);
                await saveArchiveMeta(id, {
                    archive_code: fieldCode?.value || '',
                    confidentiality_level: fieldConf?.value || 'internal',
                    retention_years: Number(fieldRetention?.value || 2),
                    archive_status: fieldStatus?.value || 'active_archive',
                    archive_note: fieldNote?.value || ''
                });
                setStatus('Metadata arsip berhasil disimpan.', 'ok');
                await Promise.all([loadSubmissions(), loadArchiveSummary()]);
                render();
                return;
            }
        } catch (error) {
            setActionBusy(action, false);
            setStatus(error.message || 'Terjadi kesalahan pada modul form.', 'error');
            render();
        }
    });

    root.addEventListener('input', (event) => {
        const action = event.target.dataset.action || '';
        if (!action) return;
        if (action === 'submissions-query') {
            local.review.submissions.query = event.target.value || '';
            local.review.submissions.page = 1;
            render();
            return;
        }
        if (action === 'inbox-query') {
            local.review.inbox.query = event.target.value || '';
            render();
            return;
        }
        if (!action.startsWith('meta-') && !action.startsWith('field-')) return;
        if (!can('forms.write')) return;
        updateEditorValue(action, Number(event.target.dataset.index || -1), event.target.value, event.target.checked);
    });

    root.addEventListener('change', (event) => {
        const action = event.target.dataset.action || '';
        if (!action) return;
        if (action === 'submissions-sort') {
            local.review.submissions.sort = event.target.value || 'newest';
            local.review.submissions.page = 1;
            render();
            return;
        }
        if (action === 'inbox-sort') {
            local.review.inbox.sort = event.target.value || 'newest';
            render();
            return;
        }
        if (action === 'submissions-archive-status') {
            local.review.submissions.archiveStatus = event.target.value || 'all';
            local.review.submissions.page = 1;
            render();
            return;
        }
        if (action === 'submissions-confidentiality') {
            local.review.submissions.confidentiality = event.target.value || 'all';
            local.review.submissions.page = 1;
            render();
            return;
        }
        if (!action.startsWith('meta-') && !action.startsWith('field-')) return;
        if (!can('forms.write')) return;
        updateEditorValue(action, Number(event.target.dataset.index || -1), event.target.value, event.target.checked);
    });

    document.addEventListener('keydown', async (event) => {
        if (!root || !root.isConnected) return;
        if (local.activeView !== 'submissions' && local.activeView !== 'inbox') return;
        if (root.offsetParent === null) return;
        const target = event.target;
        const tag = String(target?.tagName || '').toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag) || target?.isContentEditable) return;

        if (event.key === 'j' || event.key === 'J') {
            event.preventDefault();
            moveSelection(1);
            return;
        }
        if (event.key === 'k' || event.key === 'K') {
            event.preventDefault();
            moveSelection(-1);
            return;
        }
        if (event.key === 'm' || event.key === 'M') {
            event.preventDefault();
            if (!can('forms.workflow_mark')) return;
            const activeId = local.activeView === 'submissions'
                ? Number(local.review.submissions.selectedId || 0)
                : Number(local.review.inbox.selectedId || 0);
            if (!activeId) return;
            const itemType = local.activeView === 'submissions' ? 'submission' : 'inbox';
            await markWorkflow(itemType, activeId, 'done');
            if (itemType === 'submission') await loadSubmissions();
            else await loadInbox();
            render();
            return;
        }
        if (event.key === 'f' || event.key === 'F') {
            event.preventDefault();
            if (local.activeView === 'submissions') {
                local.review.submissions.filter = local.review.submissions.filter === 'focus' ? 'all' : 'focus';
            } else {
                local.review.inbox.filter = local.review.inbox.filter === 'focus' ? 'all' : 'focus';
            }
            render();
        }
    });

    window.__adminFormsReload = reloadAll;

    loadReadState();

    reloadAll().catch((error) => {
        root.innerHTML = `<div class="small muted">Gagal memuat modul form: ${escapeHtml(error.message || 'error')}</div>`;
    });
}
