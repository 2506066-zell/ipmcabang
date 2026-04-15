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
        editor: null,
        readState: {},
        review: {
            submissions: { sort: 'newest', filter: 'all', selectedId: 0 },
            inbox: { sort: 'newest', filter: 'all', selectedId: 0 }
        }
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
        return local.readState[readStateKey(type, local.activeId, itemId)] === true;
    }

    function markRead(type, itemId) {
        if (!itemId) return;
        local.readState[readStateKey(type, local.activeId, itemId)] = true;
        saveReadState();
    }

    function formatDateTime(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('id-ID');
    }

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
            local.review.submissions.selectedId = 0;
            return;
        }
        const data = await apiAdminVercel('GET', `/api/admin/forms?action=submissions&id=${local.activeId}`);
        local.submissions = Array.isArray(data.items) ? data.items : [];
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
        if (filter === 'focus') return list.filter((item) => (item.answers || []).some((answer) => answer.focus_inbox === true));
        if (filter === 'unread') return list.filter((item) => !isRead('submission', item.id));
        return list;
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
        if (filter === 'unread') return list.filter((item) => !isRead('inbox', item.id));
        return list;
    }

    function renderReviewToolbar(view) {
        const review = view === 'inbox' ? local.review.inbox : local.review.submissions;
        const refreshAction = view === 'inbox' ? 'reload-inbox' : 'reload-submissions';
        return `
            <div class="forms-admin-toolbar">
                <div class="forms-admin-view-switch">
                    <button type="button" class="forms-view-btn ${local.activeView === 'builder' ? 'active' : ''}" data-view="builder">Form Builder</button>
                    <button type="button" class="forms-view-btn ${local.activeView === 'submissions' ? 'active' : ''}" data-view="submissions">Submissions</button>
                    <button type="button" class="forms-view-btn ${local.activeView === 'inbox' ? 'active' : ''}" data-view="inbox">Inbox</button>
                </div>
                <div class="forms-review-controls">
                    <select class="toolbar-select" data-action="${view}-sort">
                        <option value="newest" ${review.sort === 'newest' ? 'selected' : ''}>Urut: Terbaru</option>
                        <option value="oldest" ${review.sort === 'oldest' ? 'selected' : ''}>Urut: Terlama</option>
                        <option value="name_asc" ${review.sort === 'name_asc' ? 'selected' : ''}>Urut: Nama A-Z</option>
                    </select>
                    <div class="forms-review-filter-group">
                        <button type="button" class="forms-review-filter ${review.filter === 'all' ? 'active' : ''}" data-action="${view}-filter" data-filter="all">Semua</button>
                        <button type="button" class="forms-review-filter ${review.filter === 'focus' ? 'active' : ''}" data-action="${view}-filter" data-filter="focus">Focus Inbox</button>
                        <button type="button" class="forms-review-filter ${review.filter === 'unread' ? 'active' : ''}" data-action="${view}-filter" data-filter="unread">Belum dibaca</button>
                    </div>
                    <button type="button" class="btn btn-secondary" data-action="${refreshAction}"><i class="fas fa-rotate"></i> Refresh</button>
                </div>
            </div>
        `;
    }

    function renderSubmissionDetail(item) {
        if (!item) return `<section class="forms-admin-card forms-review-detail-empty">Pilih submission di panel kiri untuk melihat jawaban lengkap.</section>`;
        return `
            <section class="forms-admin-card forms-review-detail-card">
                <div class="forms-admin-card-head">
                    <div>
                        <h3>${escapeHtml(item.nama_panjang || item.username)}</h3>
                        <p>@${escapeHtml(item.username || '-')} • ${escapeHtml(item.pimpinan || '-')}</p>
                    </div>
                    <div class="forms-review-badge-stack">
                        <span class="forms-review-badge is-time">${formatDateTime(item.submitted_at)}</span>
                        <span class="forms-review-badge ${isRead('submission', item.id) ? 'is-read' : 'is-new'}">${isRead('submission', item.id) ? 'Sudah dibaca' : 'Baru'}</span>
                    </div>
                </div>
                <div class="forms-admin-answer-list forms-admin-answer-list-strong">
                    ${(item.answers || []).map((answer) => `
                        <div class="forms-admin-answer-item ${answer.focus_inbox ? 'focus' : ''}">
                            <div class="forms-admin-answer-label">${escapeHtml(answer.label)}</div>
                            <div class="forms-admin-answer-value strong">${escapeHtml(Array.isArray(answer.answer_json) ? answer.answer_json.join(', ') : (answer.answer_text || '-'))}</div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    function renderSubmissionsViewV2() {
        const list = getSortedSubmissions();
        const selected = list.find((item) => Number(item.id) === Number(local.review.submissions.selectedId)) || list[0] || null;
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
                            ${list.length ? list.map((item) => {
                                const hasFocus = (item.answers || []).some((answer) => answer.focus_inbox === true);
                                const read = isRead('submission', item.id);
                                return `
                                    <button type="button" class="forms-review-list-item ${Number(selected?.id || 0) === Number(item.id) ? 'active' : ''}" data-action="pick-submission" data-id="${item.id}">
                                        <div class="forms-review-list-head">
                                            <strong>${escapeHtml(item.nama_panjang || item.username)}</strong>
                                            <span class="forms-review-badge is-time">${formatDateTime(item.submitted_at)}</span>
                                        </div>
                                        <div class="small muted">@${escapeHtml(item.username || '-')} • ${escapeHtml(item.pimpinan || '-')}</div>
                                        <div class="forms-review-badge-row">
                                            <span class="forms-review-badge ${read ? 'is-read' : 'is-new'}">${read ? 'Sudah dibaca' : 'Baru'}</span>
                                            ${hasFocus ? '<span class="forms-review-badge is-focus">Focus Inbox</span>' : ''}
                                        </div>
                                    </button>
                                `;
                            }).join('') : '<div class="small muted">Belum ada submission untuk form ini.</div>'}
                        </div>
                    </section>
                    ${renderSubmissionDetail(selected)}
                </div>
            </div>
        `;
    }

    function renderInboxDetail(item) {
        if (!item) return `<section class="forms-admin-card forms-review-detail-empty">Pilih item inbox di panel kiri untuk membaca jawaban lengkap.</section>`;
        return `
            <section class="forms-admin-card forms-review-detail-card">
                <div class="forms-admin-card-head">
                    <div>
                        <h3>${escapeHtml(item.nama_panjang || item.username)}</h3>
                        <p>${escapeHtml(item.field_label || 'Field teks')} • ${escapeHtml(item.form_title || '-')}</p>
                    </div>
                    <div class="forms-review-badge-stack">
                        <span class="forms-review-badge is-time">${formatDateTime(item.submitted_at)}</span>
                        <span class="forms-review-badge ${isRead('inbox', item.id) ? 'is-read' : 'is-new'}">${isRead('inbox', item.id) ? 'Sudah dibaca' : 'Baru'}</span>
                    </div>
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
                                const read = isRead('inbox', item.id);
                                return `
                                    <button type="button" class="forms-review-list-item ${Number(selected?.id || 0) === Number(item.id) ? 'active' : ''}" data-action="pick-inbox-item" data-id="${item.id}">
                                        <div class="forms-review-list-head">
                                            <strong>${escapeHtml(item.nama_panjang || item.username)}</strong>
                                            <span class="forms-review-badge is-time">${formatDateTime(item.submitted_at)}</span>
                                        </div>
                                        <div class="small muted">${escapeHtml(item.field_label || '-')}</div>
                                        <div class="forms-review-preview">${escapeHtml(item.answer_text || '-')}</div>
                                        <div class="forms-review-badge-row">
                                            <span class="forms-review-badge ${read ? 'is-read' : 'is-new'}">${read ? 'Sudah dibaca' : 'Baru'}</span>
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
                local.review.submissions.selectedId = 0;
                local.review.inbox.selectedId = 0;
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
                return;
            }
            if (action === 'pick-submission') {
                const id = Number(actionEl.dataset.id || 0);
                local.review.submissions.selectedId = id;
                markRead('submission', id);
                render();
                return;
            }
            if (action === 'pick-inbox-item') {
                const id = Number(actionEl.dataset.id || 0);
                local.review.inbox.selectedId = id;
                markRead('inbox', id);
                render();
                return;
            }
            if (action === 'submissions-filter') {
                local.review.submissions.filter = actionEl.dataset.filter || 'all';
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
                markRead('submission', local.review.submissions.selectedId);
                render();
                return;
            }
        } catch (error) {
            setStatus(error.message || 'Terjadi kesalahan pada modul form.', 'error');
        }
    });

    root.addEventListener('input', (event) => {
        const action = event.target.dataset.action || '';
        if (!action || (!action.startsWith('meta-') && !action.startsWith('field-'))) return;
        updateEditorValue(action, Number(event.target.dataset.index || -1), event.target.value, event.target.checked);
    });

    root.addEventListener('change', (event) => {
        const action = event.target.dataset.action || '';
        if (!action) return;
        if (action === 'submissions-sort') {
            local.review.submissions.sort = event.target.value || 'newest';
            render();
            return;
        }
        if (action === 'inbox-sort') {
            local.review.inbox.sort = event.target.value || 'newest';
            render();
            return;
        }
        if (!action.startsWith('meta-') && !action.startsWith('field-')) return;
        updateEditorValue(action, Number(event.target.dataset.index || -1), event.target.value, event.target.checked);
    });

    window.__adminFormsReload = reloadAll;

    loadReadState();

    reloadAll().catch((error) => {
        root.innerHTML = `<div class="small muted">Gagal memuat modul form: ${escapeHtml(error.message || 'error')}</div>`;
    });
}
