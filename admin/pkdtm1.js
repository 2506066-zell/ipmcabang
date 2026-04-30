/**
 * Admin PKDTM1 Module
 * Manages PKDTM1 registration list, status updates, and detail views.
 */

let _state, _els, _utils;
let pkdtm1Page = 1;
const PKDTM1_PAGE_SIZE = 25;

export function initPkdtm1(state, els, utils) {
    _state = state;
    _els = els;
    _utils = utils;

    bindEvents();
    loadRegistrations();
    loadStats();

    window.__adminPkdtm1Reload = () => {
        loadRegistrations();
        loadStats();
    };
}

function bindEvents() {
    const refreshBtn = document.getElementById('pkdtm1-refresh-btn');
    const statusFilter = document.getElementById('pkdtm1-status-filter');
    const searchInput = document.getElementById('pkdtm1-search');
    const prevBtn = document.getElementById('pkdtm1-prev');
    const nextBtn = document.getElementById('pkdtm1-next');

    if (refreshBtn) refreshBtn.addEventListener('click', () => { pkdtm1Page = 1; loadRegistrations(); loadStats(); });
    if (statusFilter) statusFilter.addEventListener('change', () => { pkdtm1Page = 1; loadRegistrations(); });
    if (searchInput) searchInput.addEventListener('input', _utils.debounce(() => { pkdtm1Page = 1; loadRegistrations(); }, 400));
    if (prevBtn) prevBtn.addEventListener('click', () => { if (pkdtm1Page > 1) { pkdtm1Page--; loadRegistrations(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { pkdtm1Page++; loadRegistrations(); });

    const exportBtn = document.getElementById('pkdtm1-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportCsv);

    // Delegate clicks in the list
    const listEl = document.getElementById('pkdtm1-list');
    if (listEl) {
        listEl.addEventListener('click', (e) => {
            const verifyBtn = e.target.closest('[data-action="verify"]');
            const rejectBtn = e.target.closest('[data-action="reject"]');
            const deleteBtn = e.target.closest('[data-action="delete"]');
            const viewLink = e.target.closest('[data-action="view-file"]');

            if (verifyBtn) {
                const id = Number(verifyBtn.dataset.id);
                updateStatus(id, 'verified');
            } else if (rejectBtn) {
                const id = Number(rejectBtn.dataset.id);
                const note = prompt('Catatan alasan penolakan (opsional):');
                updateStatus(id, 'rejected', note || '');
            } else if (deleteBtn) {
                const id = Number(deleteBtn.dataset.id);
                if (confirm('Hapus registrasi ini secara permanen?')) deleteRegistration(id);
            } else if (viewLink) {
                const url = viewLink.dataset.url;
                if (url && !url.startsWith('data:')) {
                    window.open(url, '_blank');
                } else if (url) {
                    // Data URL - open in new tab
                    const w = window.open();
                    if (w) {
                        w.document.write(`<html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#111;">
                            ${url.startsWith('data:image') ? `<img src="${url}" style="max-width:100%;max-height:100vh;">` : `<iframe src="${url}" style="width:100%;height:100vh;border:none;"></iframe>`}
                        </body></html>`);
                    }
                }
            }
        });
    }
}

async function loadRegistrations() {
    const listEl = document.getElementById('pkdtm1-list');
    const pageInfo = document.getElementById('pkdtm1-page-info');
    if (!listEl) return;

    const status = document.getElementById('pkdtm1-status-filter')?.value || 'all';
    const search = document.getElementById('pkdtm1-search')?.value?.trim() || '';

    listEl.innerHTML = `<div class="pkdtm1-empty"><i class="fas fa-spinner fa-spin"></i>Memuat data pendaftar...</div>`;

    try {
        const params = new URLSearchParams({
            action: 'admin-list',
            status,
            search,
            page: String(pkdtm1Page),
            limit: String(PKDTM1_PAGE_SIZE)
        });

        const data = await _utils.apiAdminVercel('GET', `/api/pkdtm1?${params.toString()}`);
        const registrations = data.registrations || [];
        const total = data.total || 0;
        const totalPages = data.totalPages || 1;

        if (pageInfo) pageInfo.textContent = `Page ${pkdtm1Page} / ${totalPages} (${total} total)`;

        // Update pager buttons
        const prevBtn = document.getElementById('pkdtm1-prev');
        const nextBtn = document.getElementById('pkdtm1-next');
        if (prevBtn) prevBtn.disabled = pkdtm1Page <= 1;
        if (nextBtn) nextBtn.disabled = pkdtm1Page >= totalPages;

        if (registrations.length === 0) {
            listEl.innerHTML = `<div class="pkdtm1-empty"><i class="fas fa-inbox"></i>Belum ada pendaftar PKDTM1.</div>`;
            return;
        }

        listEl.innerHTML = `<div class="pkdtm1-list">${registrations.map(r => renderRegistrationCard(r)).join('')}</div>`;

    } catch (err) {
        console.error('[PKDTM1 Admin] Load error:', err);
        listEl.innerHTML = `<div class="pkdtm1-empty"><i class="fas fa-exclamation-triangle"></i>Gagal memuat data: ${_utils.escapeHtml(err.message)}</div>`;
    }
}

function renderRegistrationCard(r) {
    const statusConfig = {
        pending: { label: 'Pending', icon: 'fa-clock', cls: 'pending' },
        verified: { label: 'Verified', icon: 'fa-check-circle', cls: 'verified' },
        rejected: { label: 'Rejected', icon: 'fa-times-circle', cls: 'rejected' }
    };
    const sc = statusConfig[r.status] || statusConfig.pending;
    const date = formatDate(r.created_at);

    const fileLinks = [
        { label: 'Sertifikat', url: r.sertifikat_url, icon: 'fa-file-certificate' },
        { label: 'Foto', url: r.foto_url, icon: 'fa-camera' },
        { label: 'Motivasi', url: r.motivasi_url, icon: 'fa-file-pdf' },
        { label: 'KTA', url: r.kta_url, icon: 'fa-id-card' },
        { label: 'Essay', url: r.essay_url, icon: 'fa-pen-fancy' }
    ];

    const fileLinksHtml = fileLinks.map(f => {
        if (!f.url) return `<span class="pkdtm1-file-btn empty" title="${f.label} — tidak ada"><i class="fas ${f.icon}"></i> ${f.label}</span>`;
        return `<button class="pkdtm1-file-btn" data-action="view-file" data-url="${_utils.escapeHtml(f.url)}" title="Lihat ${f.label}">
            <i class="fas ${f.icon}"></i> ${f.label}
        </button>`;
    }).join('');

    const actionsHtml = r.status === 'pending' ? `
        <div class="pkdtm1-actions">
            <button class="pkdtm1-action-btn verify" data-action="verify" data-id="${r.id}">
                <i class="fas fa-check"></i> Verifikasi
            </button>
            <button class="pkdtm1-action-btn reject" data-action="reject" data-id="${r.id}">
                <i class="fas fa-times"></i> Tolak
            </button>
            <button class="pkdtm1-action-btn delete" data-action="delete" data-id="${r.id}" title="Hapus permanen">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    ` : `
        <div class="pkdtm1-actions">
            <button class="pkdtm1-action-btn secondary" data-action="verify" data-id="${r.id}">
                <i class="fas fa-redo"></i> Set Verified
            </button>
            <button class="pkdtm1-action-btn secondary" data-action="reject" data-id="${r.id}">
                <i class="fas fa-ban"></i> Set Rejected
            </button>
            <button class="pkdtm1-action-btn delete" data-action="delete" data-id="${r.id}" title="Hapus permanen">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    const noteHtml = r.admin_note ? `<div class="pkdtm1-note"><strong>Catatan:</strong> ${_utils.escapeHtml(r.admin_note)}</div>` : '';

    return `
        <div class="pkdtm1-card">
            <div class="pkdtm1-card-head">
                <div>
                    <div class="pkdtm1-card-name">${_utils.escapeHtml(r.nama)}</div>
                    <div class="pkdtm1-card-meta">
                        <span class="pkdtm1-meta-item"><i class="fas fa-user"></i> @${_utils.escapeHtml(r.username || '-')}</span>
                        <span class="pkdtm1-meta-item"><i class="fas fa-location-dot"></i> ${_utils.escapeHtml(r.asal_pimpinan)}</span>
                        <span class="pkdtm1-meta-item"><i class="fas fa-calendar"></i> ${date}</span>
                    </div>
                </div>
                <span class="pkdtm1-status ${sc.cls}"><i class="fas ${sc.icon}"></i> ${sc.label}</span>
            </div>
            <div class="pkdtm1-files">${fileLinksHtml}</div>
            ${noteHtml}
            ${actionsHtml}
        </div>
    `;
}

async function loadStats() {
    const statsText = document.getElementById('pkdtm1-stats-text');
    if (!statsText) return;

    try {
        const data = await _utils.apiAdminVercel('GET', '/api/pkdtm1?action=admin-stats');
        const s = data.stats || {};
        statsText.innerHTML = `
            <strong>${s.total || 0}</strong> total &bull;
            <span style="color:#926e0f;">${s.pending || 0} pending</span> &bull;
            <span style="color:#2b7153;">${s.verified || 0} verified</span> &bull;
            <span style="color:#c23d4f;">${s.rejected || 0} rejected</span>
        `;
    } catch {
        statsText.textContent = 'Gagal memuat statistik';
    }
}

async function updateStatus(id, status, note) {
    try {
        const body = { id, status };
        if (note !== undefined) body.admin_note = note;
        const data = await _utils.apiAdminVercel('POST', '/api/pkdtm1?action=admin-update', body);
        _utils.setStatus(data.message || 'Status berhasil diubah', 'ok');
        loadRegistrations();
        loadStats();
    } catch (err) {
        _utils.setStatus(err.message || 'Gagal mengubah status', 'error');
    }
}

async function deleteRegistration(id) {
    try {
        const data = await _utils.apiAdminVercel('DELETE', `/api/pkdtm1?action=admin-delete&id=${id}`);
        _utils.setStatus(data.message || 'Registrasi dihapus', 'ok');
        loadRegistrations();
        loadStats();
    } catch (err) {
        _utils.setStatus(err.message || 'Gagal menghapus', 'error');
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch { return dateStr; }
}

async function exportCsv() {
    try {
        _utils.setStatus('Mengunduh data untuk export...', 'info');
        const data = await _utils.apiAdminVercel('GET', '/api/pkdtm1?action=admin-list&limit=9999&page=1');
        const rows = data.registrations || [];
        if (rows.length === 0) {
            _utils.setStatus('Tidak ada data untuk di-export', 'error');
            return;
        }

        const headers = ['No', 'Nama', 'Username', 'Asal Pimpinan', 'Status', 'Catatan Admin', 'Tanggal Daftar'];
        const csvRows = [headers.join(',')];

        rows.forEach((r, i) => {
            const row = [
                i + 1,
                `"${(r.nama || '').replace(/"/g, '""')}"`,
                `"${(r.username || '').replace(/"/g, '""')}"`,
                `"${(r.asal_pimpinan || '').replace(/"/g, '""')}"`,
                r.status || 'pending',
                `"${(r.admin_note || '').replace(/"/g, '""')}"`,
                formatDate(r.created_at)
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pkdtm1_registrasi_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        _utils.setStatus(`${rows.length} data berhasil di-export`, 'ok');
    } catch (err) {
        _utils.setStatus('Gagal export: ' + err.message, 'error');
    }
}
