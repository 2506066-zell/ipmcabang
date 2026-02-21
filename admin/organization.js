export function initOrganization(state, els, api) {
    const bidangFilter = document.getElementById('org-bidang-filter');
    const refreshBtn = document.getElementById('org-refresh-btn');
    const statusEl = document.getElementById('org-status');

    const memberForm = document.getElementById('org-member-form');
    const memberId = document.getElementById('org-member-id');
    const memberName = document.getElementById('org-member-name');
    const memberRole = document.getElementById('org-member-role');
    const memberQuote = document.getElementById('org-member-quote');
    const memberInstagram = document.getElementById('org-member-instagram');
    const memberPhotoUrl = document.getElementById('org-member-photo-url');
    const memberPhotoFile = document.getElementById('org-member-photo-file');
    const memberSort = document.getElementById('org-member-sort');
    const memberCancelBtn = document.getElementById('org-member-cancel-btn');
    const membersList = document.getElementById('org-members-list');

    const programForm = document.getElementById('org-program-form');
    const programId = document.getElementById('org-program-id');
    const programTitle = document.getElementById('org-program-title');
    const programDescription = document.getElementById('org-program-description');
    const programStatus = document.getElementById('org-program-status');
    const programSort = document.getElementById('org-program-sort');
    const programCancelBtn = document.getElementById('org-program-cancel-btn');
    const programsList = document.getElementById('org-programs-list');

    const localState = {
        bidang: [],
        selectedBidangCode: ''
    };

    function setLocalStatus(message, type = 'muted') {
        if (!statusEl) return;
        statusEl.textContent = message || '';
        statusEl.className = type === 'error' ? 'small' : 'small muted';
    }

    function getSelectedBidang() {
        return localState.bidang.find(b => String(b.code) === String(localState.selectedBidangCode)) || null;
    }

    function renderBidangOptions() {
        if (!bidangFilter) return;
        const current = localState.selectedBidangCode;
        bidangFilter.innerHTML = localState.bidang.map(b => (
            `<option value="${api.escapeHtml(String(b.code || ''))}">${api.escapeHtml(String(b.name || 'Bidang'))}</option>`
        )).join('');
        if (current) {
            bidangFilter.value = current;
        }
        if (!bidangFilter.value && localState.bidang.length) {
            bidangFilter.value = String(localState.bidang[0].code || '');
        }
        localState.selectedBidangCode = bidangFilter.value || '';
    }

    function normalizeStatusLabel(value) {
        const v = String(value || 'draft').toLowerCase();
        if (v === 'terlaksana') return 'terlaksana';
        if (v === 'rencana') return 'rencana';
        return 'draft';
    }

    function renderMembers() {
        if (!membersList) return;
        const bidang = getSelectedBidang();
        if (!bidang) {
            membersList.innerHTML = '<div class="small muted">Pilih bidang untuk melihat anggota.</div>';
            return;
        }
        const members = Array.isArray(bidang.members) ? bidang.members : [];
        if (!members.length) {
            membersList.innerHTML = '<div class="small muted">Belum ada anggota di bidang ini.</div>';
            return;
        }

        membersList.innerHTML = members.map(m => {
            const photo = String(m.photo_url || '').trim();
            const thumb = photo
                ? `<img class="org-thumb" src="${api.escapeHtml(photo)}" alt="${api.escapeHtml(m.full_name || '')}">`
                : '<div class="org-thumb"></div>';
            return `
                <div class="list-item" data-member-id="${m.id}">
                    <div class="list-item-header">
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${thumb}
                            <div>
                                <div class="item-title">${api.escapeHtml(m.full_name || '-')}</div>
                                <div class="small muted">${api.escapeHtml(m.role_title || '-')}</div>
                            </div>
                        </div>
                    </div>
                    <div class="org-row-meta">
                        <span>Urutan: ${Number(m.sort_order || 1)}</span>
                        <span>Instagram: ${m.instagram_url ? 'Ada' : 'Tidak ada'}</span>
                    </div>
                    <div class="toolbar-row">
                        <button type="button" class="btn btn-secondary org-edit-member">
                            <i class="fas fa-pen"></i> Edit
                        </button>
                        <button type="button" class="btn btn-danger org-delete-member">
                            <i class="fas fa-trash"></i> Hapus
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderPrograms() {
        if (!programsList) return;
        const bidang = getSelectedBidang();
        if (!bidang) {
            programsList.innerHTML = '<div class="small muted">Pilih bidang untuk melihat program kerja.</div>';
            return;
        }
        const programs = Array.isArray(bidang.programs) ? bidang.programs : [];
        if (!programs.length) {
            programsList.innerHTML = '<div class="small muted">Belum ada program kerja di bidang ini.</div>';
            return;
        }
        programsList.innerHTML = programs.map(p => {
            const chip = normalizeStatusLabel(p.status);
            return `
                <div class="list-item" data-program-id="${p.id}">
                    <div class="list-item-header">
                        <div class="item-title">${api.escapeHtml(p.title || '-')}</div>
                        <span class="org-chip ${chip}">${chip}</span>
                    </div>
                    <div class="small muted">${api.escapeHtml(p.description || '-')}</div>
                    <div class="org-row-meta">
                        <span>Urutan: ${Number(p.sort_order || 1)}</span>
                    </div>
                    <div class="toolbar-row">
                        <button type="button" class="btn btn-secondary org-edit-program">
                            <i class="fas fa-pen"></i> Edit
                        </button>
                        <button type="button" class="btn btn-danger org-delete-program">
                            <i class="fas fa-trash"></i> Hapus
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderAll() {
        renderBidangOptions();
        renderMembers();
        renderPrograms();
    }

    function resetMemberForm() {
        if (!memberForm) return;
        memberId.value = '';
        memberName.value = '';
        memberRole.value = '';
        memberQuote.value = '';
        memberInstagram.value = '';
        memberPhotoUrl.value = '';
        memberSort.value = '';
        if (memberPhotoFile) memberPhotoFile.value = '';
    }

    function resetProgramForm() {
        if (!programForm) return;
        programId.value = '';
        programTitle.value = '';
        programDescription.value = '';
        programStatus.value = 'draft';
        programSort.value = '';
    }

    function getAuthHeaderValue() {
        return state.adminToken || state.session || '';
    }

    async function uploadMemberPhoto(file) {
        if (!file) return '';
        const token = getAuthHeaderValue();
        if (!token) throw new Error('Sesi admin tidak ditemukan.');
        const headers = {
            'Content-Type': file.type || 'application/octet-stream',
            'x-filename': file.name || `member-${Date.now()}.jpg`,
            'Authorization': `Bearer ${token}`
        };
        const res = await fetch('/api/upload', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: file
        });
        const data = await res.json();
        if (!res.ok || data?.status !== 'success' || !data?.url) {
            throw new Error(data?.message || `Upload gagal (HTTP ${res.status})`);
        }
        return String(data.url);
    }

    async function loadSnapshot() {
        api.showLoader('Memuat struktur organisasi...');
        try {
            const data = await api.apiAdminVercel('GET', '/api/admin/organization?action=snapshot');
            if (!data || data.status !== 'success' || !Array.isArray(data.bidang)) {
                throw new Error('Data snapshot organisasi tidak valid');
            }
            localState.bidang = data.bidang;
            if (!localState.selectedBidangCode && localState.bidang.length) {
                localState.selectedBidangCode = String(localState.bidang[0].code || '');
            }
            renderAll();
            setLocalStatus(`Data termuat: ${localState.bidang.length} bidang.`);
        } catch (e) {
            console.error('[Organization] load failed:', e);
            setLocalStatus(`Gagal memuat: ${e.message || 'error'}`, 'error');
            if (membersList) membersList.innerHTML = '<div class="small muted">Gagal memuat anggota.</div>';
            if (programsList) programsList.innerHTML = '<div class="small muted">Gagal memuat program kerja.</div>';
        } finally {
            api.hideLoader();
        }
    }

    async function submitMemberForm(event) {
        event.preventDefault();
        const bidang = getSelectedBidang();
        if (!bidang) {
            setLocalStatus('Pilih bidang terlebih dahulu.', 'error');
            return;
        }
        api.showLoader('Menyimpan anggota...');
        try {
            let photoUrl = String(memberPhotoUrl.value || '').trim();
            if (memberPhotoFile && memberPhotoFile.files && memberPhotoFile.files[0]) {
                photoUrl = await uploadMemberPhoto(memberPhotoFile.files[0]);
            }
            const payload = {
                id: Number(memberId.value || 0) || undefined,
                bidang_id: bidang.id,
                full_name: String(memberName.value || '').trim(),
                role_title: String(memberRole.value || '').trim(),
                quote: String(memberQuote.value || '').trim(),
                instagram_url: String(memberInstagram.value || '').trim(),
                photo_url: photoUrl,
                sort_order: Number(memberSort.value || 0) || undefined
            };
            const data = await api.apiAdminVercel('POST', '/api/admin/organization?action=upsertMember', payload);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menyimpan anggota');
            resetMemberForm();
            await loadSnapshot();
            setLocalStatus('Anggota berhasil disimpan.');
        } catch (e) {
            console.error('[Organization] save member failed:', e);
            setLocalStatus(`Gagal simpan anggota: ${e.message || 'error'}`, 'error');
        } finally {
            api.hideLoader();
        }
    }

    async function submitProgramForm(event) {
        event.preventDefault();
        const bidang = getSelectedBidang();
        if (!bidang) {
            setLocalStatus('Pilih bidang terlebih dahulu.', 'error');
            return;
        }
        api.showLoader('Menyimpan program kerja...');
        try {
            const payload = {
                id: Number(programId.value || 0) || undefined,
                bidang_id: bidang.id,
                title: String(programTitle.value || '').trim(),
                description: String(programDescription.value || '').trim(),
                status: String(programStatus.value || 'draft').trim(),
                sort_order: Number(programSort.value || 0) || undefined
            };
            const data = await api.apiAdminVercel('POST', '/api/admin/organization?action=upsertProgram', payload);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menyimpan program');
            resetProgramForm();
            await loadSnapshot();
            setLocalStatus('Program kerja berhasil disimpan.');
        } catch (e) {
            console.error('[Organization] save program failed:', e);
            setLocalStatus(`Gagal simpan program: ${e.message || 'error'}`, 'error');
        } finally {
            api.hideLoader();
        }
    }

    async function deleteMember(id) {
        if (!id || !window.confirm('Hapus anggota ini?')) return;
        api.showLoader('Menghapus anggota...');
        try {
            const data = await api.apiAdminVercel('POST', '/api/admin/organization?action=deleteMember', { id });
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menghapus anggota');
            resetMemberForm();
            await loadSnapshot();
            setLocalStatus('Anggota berhasil dihapus.');
        } catch (e) {
            console.error('[Organization] delete member failed:', e);
            setLocalStatus(`Gagal hapus anggota: ${e.message || 'error'}`, 'error');
        } finally {
            api.hideLoader();
        }
    }

    async function deleteProgram(id) {
        if (!id || !window.confirm('Hapus program ini?')) return;
        api.showLoader('Menghapus program kerja...');
        try {
            const data = await api.apiAdminVercel('POST', '/api/admin/organization?action=deleteProgram', { id });
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menghapus program');
            resetProgramForm();
            await loadSnapshot();
            setLocalStatus('Program kerja berhasil dihapus.');
        } catch (e) {
            console.error('[Organization] delete program failed:', e);
            setLocalStatus(`Gagal hapus program: ${e.message || 'error'}`, 'error');
        } finally {
            api.hideLoader();
        }
    }

    function bindMemberListActions() {
        if (!membersList) return;
        membersList.addEventListener('click', (event) => {
            const row = event.target.closest('[data-member-id]');
            if (!row) return;
            const memberIdValue = Number(row.getAttribute('data-member-id') || 0);
            if (!memberIdValue) return;
            const bidang = getSelectedBidang();
            if (!bidang) return;
            const item = (bidang.members || []).find(m => Number(m.id) === memberIdValue);
            if (!item) return;

            if (event.target.closest('.org-edit-member')) {
                memberId.value = String(item.id || '');
                memberName.value = String(item.full_name || '');
                memberRole.value = String(item.role_title || '');
                memberQuote.value = String(item.quote || '');
                memberInstagram.value = String(item.instagram_url || '');
                memberPhotoUrl.value = String(item.photo_url || '');
                memberSort.value = String(item.sort_order || '');
                if (memberPhotoFile) memberPhotoFile.value = '';
                memberName.focus();
            }

            if (event.target.closest('.org-delete-member')) {
                deleteMember(memberIdValue);
            }
        });
    }

    function bindProgramListActions() {
        if (!programsList) return;
        programsList.addEventListener('click', (event) => {
            const row = event.target.closest('[data-program-id]');
            if (!row) return;
            const programIdValue = Number(row.getAttribute('data-program-id') || 0);
            if (!programIdValue) return;
            const bidang = getSelectedBidang();
            if (!bidang) return;
            const item = (bidang.programs || []).find(p => Number(p.id) === programIdValue);
            if (!item) return;

            if (event.target.closest('.org-edit-program')) {
                programId.value = String(item.id || '');
                programTitle.value = String(item.title || '');
                programDescription.value = String(item.description || '');
                programStatus.value = String(item.status || 'draft');
                programSort.value = String(item.sort_order || '');
                programTitle.focus();
            }

            if (event.target.closest('.org-delete-program')) {
                deleteProgram(programIdValue);
            }
        });
    }

    function bindEvents() {
        refreshBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            loadSnapshot();
        });
        bidangFilter?.addEventListener('change', () => {
            localState.selectedBidangCode = String(bidangFilter.value || '');
            resetMemberForm();
            resetProgramForm();
            renderMembers();
            renderPrograms();
        });
        memberForm?.addEventListener('submit', submitMemberForm);
        programForm?.addEventListener('submit', submitProgramForm);
        memberCancelBtn?.addEventListener('click', resetMemberForm);
        programCancelBtn?.addEventListener('click', resetProgramForm);
        bindMemberListActions();
        bindProgramListActions();
    }

    bindEvents();
    loadSnapshot();
}
