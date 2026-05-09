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
        analysis: null,
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
        } catch { }
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

    async function loadAnalysis() {
        if (!local.activeId) {
            local.analysis = null;
            return;
        }
        const data = await apiAdminVercel('GET', `/api/admin/forms?action=analysis&id=${local.activeId}`);
        local.analysis = data.stats || null;
    }

    function renderList() {
        const queryText = String(local.listQuery || '').trim().toLowerCase();
        const items = local.items.filter(item => {
            if (!queryText) return true;
            return (item.display_name || item.title || '').toLowerCase().includes(queryText) ||
                (item.description || '').toLowerCase().includes(queryText);
        });

        return `
            <div class="forms-admin-sidebar">
                <div class="forms-admin-side-head">
                    <div>
                        <h3>Forms Dashboard</h3>
                        <p>Kelola pre-test & post-test PKDTM1.</p>
                    </div>
                    <button type="button" class="btn btn-primary forms-admin-new" data-action="new-form" title="Buat form baru">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>

                <div class="forms-sidebar-search">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Cari template form..." value="${escapeHtml(local.listQuery || '')}" data-action="filter-list">
                </div>

                <div class="forms-admin-list">
                    ${items.length ? items.map((item) => {
            const typeIcon = item.type === 'pretest' ? 'fa-clipboard-list' : 'fa-clipboard-check';
            const typeLabel = item.type === 'pretest' ? 'Pre-Test' : 'Post-Test';
            const lifecycle = lifecycleBadge(item.lifecycle_status);

            return `
                            <button type="button" class="forms-admin-list-card ${Number(item.id) === local.activeId ? 'active' : ''}" data-action="pick-form" data-id="${item.id}">
                                <div class="forms-admin-card-top">
                                    <div class="form-type-pill">
                                        <i class="fas ${typeIcon}"></i>
                                        <span>${typeLabel}</span>
                                    </div>
                                    <span class="forms-admin-mini-status ${lifecycle.className}">${lifecycle.text}</span>
                                </div>
                                <div class="form-card-title">${escapeHtml(item.display_name || item.title)}</div>
                                <p>${escapeHtml(item.description || 'Tanpa deskripsi.')}</p>
                                
                                <div class="forms-admin-inline-stats">
                                    <div class="mini-stat" title="Total Submission">
                                        <i class="fas fa-users"></i> ${Number(item.submission_count || 0)}
                                    </div>
                                    <div class="mini-stat" title="Progres Review">
                                        <i class="fas fa-check-circle"></i> ${Number(item.submission_progress_percent || 0)}%
                                    </div>
                                    <div class="mini-stat" title="Inbox Baru">
                                        <i class="fas fa-envelope"></i> ${Number(item.inbox_count || 0)}
                                    </div>
                                </div>
                            </button>
                        `;
        }).join('') : `<div class="small muted align-center mt-24">Tidak ada form yang cocok.</div>`}
                </div>
            </div>
        `;
    }

    function renderEditorFields() {
        const fields = Array.isArray(local.editor?.fields) ? local.editor.fields : [];
        return fields.map((field, index) => {
            const typeMeta = FIELD_TYPES.find((item) => item.value === field.field_type) || FIELD_TYPES[0];
            const isChoice = ['single_choice', 'multiple_choice', 'dropdown'].includes(field.field_type);
            const optionCount = Array.isArray(field.options_json) ? field.options_json.length : 0;
            return `
                <article class="forms-builder-field forms-builder-question-card" data-index="${index}">
                    <div class="forms-builder-field-head">
                        <div class="forms-builder-question-title">
                            <span class="forms-builder-counter">${index + 1}</span>
                            <div>
                                <strong>${escapeHtml(field.label || 'Pertanyaan belum diberi judul')}</strong>
                                <div class="forms-builder-question-meta">
                                    <span>${escapeHtml(typeMeta.label)}</span>
                                    <span>${field.required !== false ? 'Wajib' : 'Opsional'}</span>
                                    ${field.focus_inbox === true ? '<span>Focus inbox</span>' : ''}
                                    ${isChoice ? `<span>${optionCount} opsi</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="forms-builder-actions">
                            <button type="button" class="btn btn-ghost forms-inline-btn" data-action="move-up" data-index="${index}" ${index === 0 ? 'disabled' : ''} title="Naikkan pertanyaan"><i class="fas fa-arrow-up"></i></button>
                            <button type="button" class="btn btn-ghost forms-inline-btn" data-action="move-down" data-index="${index}" ${index === fields.length - 1 ? 'disabled' : ''} title="Turunkan pertanyaan"><i class="fas fa-arrow-down"></i></button>
                            <button type="button" class="btn btn-ghost forms-inline-btn is-danger" data-action="remove-field" data-index="${index}" ${fields.length === 1 ? 'disabled' : ''} title="Hapus pertanyaan"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="forms-builder-grid forms-builder-question-grid">
                        <label class="forms-builder-label forms-builder-span-2">
                            <span>Isi pertanyaan</span>
                            <textarea rows="2" data-action="field-label" data-index="${index}" placeholder="Tulis pertanyaan yang akan dijawab peserta...">${escapeHtml(field.label || '')}</textarea>
                        </label>
                        <label class="forms-builder-label">
                            <span>Tipe jawaban</span>
                            <select data-action="field-type" data-index="${index}">
                                ${FIELD_TYPES.map((item) => `<option value="${item.value}" ${item.value === field.field_type ? 'selected' : ''}>${item.label}</option>`).join('')}
                            </select>
                        </label>
                        <label class="forms-builder-label">
                            <span>Placeholder / bantuan singkat</span>
                            <input type="text" data-action="field-placeholder" data-index="${index}" value="${escapeHtml(field.placeholder || '')}" placeholder="Contoh: Tulis jawaban dengan jelas">
                        </label>
                        ${isChoice ? `
                            <label class="forms-builder-label forms-builder-span-2">
                                <span>Opsi jawaban</span>
                                <textarea rows="4" data-action="field-options" data-index="${index}" placeholder="Satu opsi per baris&#10;Contoh: Sangat setuju&#10;Setuju&#10;Tidak setuju">${escapeHtml((field.options_json || []).join('\n'))}</textarea>
                            </label>
                            <label class="forms-builder-label">
                                <span>Kunci jawaban ${field.field_type === 'multiple_choice' ? '(pisahkan dengan |)' : ''}</span>
                                <input type="text" data-action="field-answer-key" data-index="${index}" value="${escapeHtml(field.answer_key_text || '')}" placeholder="${field.field_type === 'multiple_choice' ? 'Opsi A|Opsi C' : 'Opsi benar'}">
                            </label>
                            <label class="forms-builder-label">
                                <span>Bobot skor</span>
                                <input type="number" min="0" max="100" step="1" data-action="field-score-weight" data-index="${index}" value="${Number(field.score_weight || 1)}">
                            </label>
                        ` : ''}
                        <div class="forms-builder-toggle-row forms-builder-span-2">
                            <label class="forms-builder-check">
                                <input type="checkbox" data-action="field-required" data-index="${index}" ${field.required !== false ? 'checked' : ''}>
                                <span>Wajib dijawab</span>
                            </label>
                            <label class="forms-builder-check">
                                <input type="checkbox" data-action="field-focus" data-index="${index}" ${field.focus_inbox === true ? 'checked' : ''}>
                                <span>Tampilkan di inbox admin</span>
                            </label>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderBuilderView() {
        const editor = local.editor || createBlankForm();
        const stats = local.detail?.stats || { submission_count: 0, inbox_count: 0, reviewed_count: 0, submission_progress_percent: 0 };
        return `
            <div class="forms-admin-workspace">
                <div class="forms-admin-toolbar">
                    <div class="forms-admin-view-switch">
                        <button type="button" class="forms-view-btn ${local.activeView === 'builder' ? 'active' : ''}" data-view="builder"><i class="fas fa-layer-group"></i> Form Builder</button>
                        <button type="button" class="forms-view-btn ${local.activeView === 'submissions' ? 'active' : ''}" data-view="submissions" ${!editor.id ? 'disabled' : ''}><i class="fas fa-list-check"></i> Submissions</button>
                        <button type="button" class="forms-view-btn ${local.activeView === 'analysis' ? 'active' : ''}" data-view="analysis" ${!editor.id ? 'disabled' : ''}><i class="fas fa-chart-line"></i> Analysis</button>
                        <button type="button" class="forms-view-btn ${local.activeView === 'inbox' ? 'active' : ''}" data-view="inbox" ${!editor.id ? 'disabled' : ''}><i class="fas fa-inbox"></i> Inbox</button>
                    </div>
                    <div class="forms-admin-inline-stats">
                        <span>${Number(stats.submission_count || 0)} submission</span>
                        <span>${Number(stats.submission_progress_percent || 0)}% progres</span>
                        <span>${Number(stats.reviewed_count || 0)} direview</span>
                        <span>${Number(stats.inbox_count || 0)} inbox</span>
                    </div>
                </div>

                <section class="forms-admin-card forms-builder-section forms-builder-hero-section">
                    <div class="forms-builder-section-head">
                        <div>
                            <span class="forms-builder-section-kicker">Info Test</span>
                            <h3>${editor.id ? 'Editor Template' : 'Template Baru'}</h3>
                            <p>Identitas utama test yang akan dilihat peserta di halaman publik.</p>
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
                        <label class="forms-builder-label forms-builder-span-2">
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
                        <div class="forms-builder-subsection forms-builder-span-2">
                            <span class="forms-builder-section-kicker">Pengaturan Publikasi</span>
                            <strong>Jadwal, status, dan target peserta</strong>
                        </div>
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
                        <div class="forms-builder-generated-name forms-builder-span-2">
                            <span>Nama Test Otomatis</span>
                            <small class="muted">${escapeHtml((editor.title || 'Tanpa Judul').trim() || 'Tanpa Judul')} • ${new Date().toLocaleDateString('id-ID')} • v${Number(editor.version || 1)}</small>
                        </div>
                        <label class="forms-builder-check forms-builder-setting-toggle">
                            <input type="checkbox" data-action="meta-allow-multiple" ${editor.allow_multiple === true ? 'checked' : ''}>
                            <span>Izinkan multiple submission</span>
                        </label>
                    </div>
                </section>

                <section class="forms-admin-card forms-builder-section forms-builder-question-section">
                    <div class="forms-builder-section-head forms-builder-sticky-head">
                        <div>
                            <span class="forms-builder-section-kicker">Daftar Pertanyaan</span>
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
                        <button type="button" class="forms-view-btn ${local.activeView === 'analysis' ? 'active' : ''}" data-view="analysis">Analysis</button>
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

    function renderAnalysisView() {
        const stats = local.analysis;
        if (!stats || stats.total_submissions === 0) {
            return `
                <div class="forms-admin-workspace">
                    ${renderReviewToolbar('analysis')}
                    <section class="forms-admin-card forms-review-detail-empty">
                        Belum ada data untuk dianalisis. Tunggu peserta mengisi form ini.
                    </section>
                </div>
            `;
        }

        return `
            <div class="forms-admin-workspace">
                ${renderReviewToolbar('analysis')}
                <div class="forms-analysis-grid">
                    <section class="forms-admin-card">
                        <div class="forms-admin-card-head">
                            <h3>Rangkuman Skor</h3>
                        </div>
                        <div class="forms-stats-summary">
                            <div class="stat-box">
                                <span class="label">Rata-rata</span>
                                <span class="value">${stats.average_score}</span>
                            </div>
                            <div class="stat-box">
                                <span class="label">Tertinggi</span>
                                <span class="value">${stats.highest_score}</span>
                            </div>
                            <div class="stat-box">
                                <span class="label">Terendah</span>
                                <span class="value">${stats.lowest_score}</span>
                            </div>
                        </div>
                    </section>

                    <section class="forms-admin-card">
                        <div class="forms-admin-card-head">
                            <h3>Analisis Butir Soal</h3>
                            <p>Persentase jawaban benar per pertanyaan (Difficulty Index).</p>
                        </div>
                        <div class="forms-analysis-list">
                            ${stats.field_analysis.filter(f => f.is_scorable).map(f => `
                                <div class="analysis-item">
                                    <div class="analysis-meta">
                                        <strong>${escapeHtml(f.label)}</strong>
                                        <span class="forms-review-badge ${f.correct_percent > 70 ? 'is-read' : (f.correct_percent > 40 ? 'is-follow-up' : 'is-new')}">${f.correct_percent}% Benar</span>
                                    </div>
                                    <div class="analysis-progress-bg">
                                        <div class="analysis-progress-bar" style="width: ${f.correct_percent}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </section>

                    ${stats.field_analysis.filter(f => f.distribution && f.distribution.length > 0).map(f => `
                        <section class="forms-admin-card">
                            <div class="forms-admin-card-head">
                                <h3>Distribusi: ${escapeHtml(f.label)}</h3>
                            </div>
                            <div class="forms-distribution-list">
                                ${f.distribution.sort((a, b) => b.value - a.value).map(d => `
                                    <div class="dist-item">
                                        <div class="dist-info">
                                            <span>${escapeHtml(d.key)}</span>
                                            <strong>${d.value} (${d.percent}%)</strong>
                                        </div>
                                        <div class="dist-bar-bg">
                                            <div class="dist-bar" style="width: ${d.percent}%"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </section>
                    `).join('')}
                </div>
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
        const refreshBusy = isActionBusy(refreshAction);

        let selectedLabel = 'Belum dipilih';
        if (view === 'inbox') {
            const list = getSortedInbox();
            const selected = list.find((item) => Number(item.id) === Number(local.review.inbox.selectedId)) || list[0] || null;
            if (selected) selectedLabel = selected.nama_panjang || selected.username || 'User';
        } else {
            const list = getSortedSubmissions();
            const selected = list.find((item) => Number(item.id) === Number(local.review.submissions.selectedId)) || list[0] || null;
            if (selected) selectedLabel = selected.nama_panjang || selected.username || 'User';
        }

        const activeItem = local.items.find(i => Number(i.id) === local.activeId);
        const typeIcon = activeItem?.type === 'pretest' ? 'fa-clipboard-list' : 'fa-clipboard-check';
        const typeLabel = activeItem?.type === 'pretest' ? 'PRE-TEST MODE' : 'POST-TEST MODE';

        return `
            <div class="forms-admin-workspace-header">
                <div class="forms-type-indicator">
                    <i class="fas ${typeIcon}"></i>
                    <span>${typeLabel}</span>
                    <strong class="muted">• ${escapeHtml(activeItem?.display_name || activeItem?.title || 'Form Baru')}</strong>
                </div>
            </div>
            <div class="forms-admin-toolbar">
                <div class="forms-admin-view-switch">
                    <button type="button" class="forms-view-btn ${local.activeView === 'builder' ? 'active' : ''}" data-view="builder" title="Kelola struktur dan pengaturan test"><i class="fas fa-layer-group"></i> Form Builder</button>
                    <button type="button" class="forms-view-btn ${local.activeView === 'submissions' ? 'active' : ''}" data-view="submissions" title="Lihat daftar peserta dan hasil jawaban"><i class="fas fa-list-check"></i> Submissions</button>
                    <button type="button" class="forms-view-btn ${local.activeView === 'analysis' ? 'active' : ''}" data-view="analysis" title="Lihat analisis statistik dan data agregat"><i class="fas fa-chart-line"></i> Analysis</button>
                    <button type="button" class="forms-view-btn ${local.activeView === 'inbox' ? 'active' : ''}" data-view="inbox" title="Lihat jawaban fokus yang perlu ditindaklanjuti"><i class="fas fa-inbox"></i> Inbox</button>
                </div>
                <div class="forms-review-controls">
                    <div class="forms-review-filter-group" title="Urutkan daftar">
                        <button type="button" class="forms-review-filter ${review.sort === 'newest' ? 'active' : ''}" data-action="${view}-sort" data-value="newest">Terbaru</button>
                        <button type="button" class="forms-review-filter ${review.sort === 'oldest' ? 'active' : ''}" data-action="${view}-sort" data-value="oldest">Terlama</button>
                        ${view === 'submissions' ? `
                            <button type="button" class="forms-review-filter ${review.sort === 'score_high' ? 'active' : ''}" data-action="${view}-sort" data-value="score_high">Skor ↑</button>
                            <button type="button" class="forms-review-filter ${review.sort === 'score_low' ? 'active' : ''}" data-action="${view}-sort" data-value="score_low">Skor ↓</button>
                        ` : ''}
                    </div>
                    <div class="toolbar-select-wrapper" title="Cari data lebih cepat">
                        <i class="fas fa-search"></i>
                        <input type="search" class="toolbar-input" data-action="${view}-query" value="${escapeHtml(review.query || '')}" placeholder="${view === 'submissions' ? 'Cari nama, username, pimpinan, atau isi jawaban...' : 'Cari nama, field, atau jawaban...'}">
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

    function renderAnswerValue(answer) {
        const rawAnswer = Array.isArray(answer.answer_json) ? answer.answer_json : (answer.answer_text || '');
        if (Array.isArray(rawAnswer)) {
            return rawAnswer.length
                ? `<div class="forms-answer-pills">${rawAnswer.map(v => `<span class="answer-pill">${escapeHtml(v)}</span>`).join('')}</div>`
                : '<div class="forms-answer-empty">Tidak ada jawaban.</div>';
        }
        const text = String(rawAnswer || '').trim();
        return text
            ? `<div class="forms-answer-text">${escapeHtml(text)}</div>`
            : '<div class="forms-answer-empty">Tidak ada jawaban.</div>';
    }

    function getAnswerStatusView(answer) {
        const isCorrect = answer.answer_status === 'benar';
        const isWrong = answer.answer_status === 'salah';
        return {
            className: isCorrect ? 'is-success' : (isWrong ? 'is-danger' : 'is-warning'),
            icon: isCorrect ? 'fa-circle-check' : (isWrong ? 'fa-circle-xmark' : 'fa-circle-dot'),
            text: isCorrect ? 'Benar' : (isWrong ? 'Salah' : 'Review')
        };
    }

    function renderSubmissionDetail(item) {
        if (!item) return `<section class="forms-admin-card forms-review-detail-empty">Pilih submission di panel kiri untuk melihat jawaban lengkap.</section>`;
        const status = workflowBadge(getWorkflowStatus('submission', item.id));
        const archive = archiveStatusBadge(item.archive_status);
        const confidentiality = confidentialityBadge(item.confidentiality_level);
        const canArchiveRead = can('forms.archive_read');
        const canArchiveManage = can('forms.archive_manage');
        const answers = Array.isArray(item.answers) ? item.answers : [];
        const focusCount = answers.filter((answer) => answer.focus_inbox === true).length;
        const scoreObtained = Number(item.score_obtained || 0);
        const scoreMax = Number(item.score_max || 0);
        const scoreLabel = scoreMax > 0 ? `${scoreObtained} / ${scoreMax}` : 'Tidak berskor';
        return `
            <section class="forms-admin-card forms-review-detail-card">
                <div class="forms-review-paper-head">
                    <div>
                        <h3>${escapeHtml(item.nama_panjang || item.username)}</h3>
                        <p>@${escapeHtml(item.username || '-')} • ${escapeHtml(item.pimpinan || '-')}</p>
                    </div>
                    <div class="forms-review-badge-stack">
                        <span class="forms-review-badge is-time">${formatDateTime(item.submitted_at)}</span>
                        <span class="forms-review-badge ${status.className}">${status.text}</span>
                    </div>
                </div>

                <div class="forms-review-summary-strip">
                    <div><span>Pertanyaan</span><strong>${answers.length}</strong></div>
                    <div><span>Focus inbox</span><strong>${focusCount}</strong></div>
                    <div><span>Skor</span><strong>${scoreLabel}</strong></div>
                </div>

                <div class="forms-review-action-row forms-review-action-row-compact">
                    <button type="button" class="btn btn-secondary forms-inline-btn" data-action="workflow-submission" data-id="${item.id}" data-status="unread"><i class="fas fa-envelope"></i> Baru</button>
                    <button type="button" class="btn btn-secondary forms-inline-btn" data-action="workflow-submission" data-id="${item.id}" data-status="follow_up"><i class="fas fa-clock"></i> Follow Up</button>
                    <button type="button" class="btn btn-secondary forms-inline-btn" data-action="workflow-submission" data-id="${item.id}" data-status="done"><i class="fas fa-check-double"></i> Selesai</button>
                </div>
                <div class="forms-admin-answer-list">
                    ${answers.map((answer, index) => {
            const statusView = getAnswerStatusView(answer);
            const isLongText = !Array.isArray(answer.answer_json) && String(answer.answer_text || '').length > 80;

            return `
                            <div class="forms-answer-detail-card ${answer.focus_inbox ? 'is-focus' : ''}">
                                <div class="forms-answer-header">
                                    <div class="forms-answer-q-number">${index + 1}</div>
                                    <div class="forms-answer-q-main">
                                        <div class="forms-answer-q-label">${escapeHtml(answer.label)}</div>
                                        <div class="forms-answer-q-meta">
                                            <span>${escapeHtml(answer.field_type || 'text')}</span>
                                            ${answer.focus_inbox ? '<span>Focus inbox</span>' : ''}
                                        </div>
                                    </div>
                                    <div class="forms-answer-status ${statusView.className}">
                                        <i class="fas ${statusView.icon}"></i>
                                        <span>${statusView.text}</span>
                                    </div>
                                </div>
                                <div class="forms-answer-body ${isLongText ? 'is-paragraph' : ''}">
                                    ${renderAnswerValue(answer)}
                                </div>
                                ${answer.answer_key_text ? `
                                    <div class="forms-answer-key">
                                        <i class="fas fa-key"></i>
                                        <strong>Kunci Jawaban:</strong> ${escapeHtml(answer.answer_key_text)}
                                    </div>
                                ` : ''}
                            </div>
                        `;
        }).join('')}
                </div>
                ${canArchiveRead ? `
                    <details class="forms-archive-details">
                    <summary>
                        <span>Metadata Arsip</span>
                        <small>${archive.text} - ${confidentiality.text}</small>
                    </summary>
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
                    </details>
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

            const scoreObtained = Number(item.score_obtained || 0);
            const scoreMax = Number(item.score_max || 1); // Avoid div by zero
            const scorePercent = Math.min(100, Math.round((scoreObtained / scoreMax) * 100));
            const scoreColor = scorePercent >= 80 ? '#10b981' : (scorePercent >= 60 ? '#f59e0b' : '#ef4444');

            return `
                                    <article class="forms-review-list-item ${Number(selected?.id || 0) === Number(item.id) ? 'active' : ''}">
                                        <button type="button" class="forms-review-list-main" data-action="pick-submission" data-id="${item.id}">
                                        <div class="forms-review-list-head">
                                            <strong>${escapeHtml(item.nama_panjang || item.username)}</strong>
                                            <span class="forms-review-badge is-time">${formatDateTime(item.submitted_at)}</span>
                                        </div>
                                        <div class="forms-list-item-meta">
                                            <div class="small muted">@${escapeHtml(item.username || '-')} • ${escapeHtml(item.pimpinan || '-')}</div>
                                            <div class="forms-list-score-wrapper">
                                                <div class="forms-list-score-bar-bg">
                                                    <div class="forms-list-score-bar-fill" style="width: ${scorePercent}%; background: ${scoreColor};"></div>
                                                </div>
                                                <span class="forms-list-score-text" style="color: ${scoreColor}">${scoreObtained}/${scoreMax}</span>
                                            </div>
                                        </div>
                                        <div class="forms-review-badge-row">
                                            <span class="forms-review-badge ${status.className}">${status.text}</span>
                                            ${hasFocus ? '<span class="forms-review-badge is-focus">Focus Inbox</span>' : ''}
                                            <span class="forms-review-badge ${archive.className}">${archive.text}</span>
                                        </div>
                                        </button>
                                        <div class="forms-list-quick-actions">
                                            <button type="button" class="quick-action-btn" data-action="workflow-submission" data-id="${item.id}" data-status="follow_up" title="Set Follow Up"><i class="fas fa-clock"></i></button>
                                            <button type="button" class="quick-action-btn" data-action="workflow-submission" data-id="${item.id}" data-status="done" title="Set Selesai"><i class="fas fa-check"></i></button>
                                        </div>
                                    </article>
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
        const activeItem = local.items.find(i => Number(i.id) === local.activeId);
        const themeClass = activeItem ? `is-${activeItem.type}` : '';
        const workspace = local.activeView === 'submissions'
            ? renderSubmissionsViewV2()
            : (local.activeView === 'inbox' ? renderInboxViewV2() : renderBuilderView());

        root.innerHTML = `
            <div class="forms-admin-layout ${themeClass}">
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

    root.addEventListener('input', (event) => {
        const actionEl = event.target.closest('[data-action="filter-list"]');
        if (actionEl) {
            local.listQuery = event.target.value;
            render();
        }
    });

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
                if (local.activeView === 'submissions') {
                    await loadSubmissions();
                    await loadArchiveSummary();
                } else if (local.activeView === 'inbox') {
                    await loadInbox();
                } else if (local.activeView === 'analysis') {
                    await loadAnalysis();
                }
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
            if (action === 'submissions-sort' || action === 'inbox-sort') {
                const view = action === 'submissions-sort' ? 'submissions' : 'inbox';
                local.review[view].sort = actionEl.dataset.value || 'newest';
                local.review[view].page = 1;
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
            if (action === 'reload-analysis') {
                if (isActionBusy(action)) return;
                setActionBusy(action, true);
                render();
                await loadAnalysis();
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
