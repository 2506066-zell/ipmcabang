(function () {
    const STORAGE = {
        session: 'ipmquiz_user_session',
        username: 'ipmquiz_user_username',
        fullname: 'ipmquiz_user_fullname',
        pimpinan: 'ipmquiz_user_pimpinan',
        roomAccess: 'ipmquiz_attendance_room_access_v1'
    };

    const state = {
        session: '',
        user: null,
        rooms: [],
        accessMap: {},
        currentRoomId: 0,
        detail: null,
        memberOptions: [],
        pendingRoomId: 0,
        selfieFile: null,
        selfieStream: null,
        pollingInterval: null,
        deferredPrompt: null,
        flowStatus: { tone: 'pending', title: 'Belum mulai', note: 'Pilih room lalu verifikasi kode untuk mulai absensi.' }
    };

    const els = {};

    function setPageMode(mode) {
        const root = document.body;
        if (!root) return;
        const nextMode = mode === 'room-focus' ? 'mode-room-focus' : 'mode-room-picker';
        root.classList.remove('mode-room-picker', 'mode-room-focus');
        root.classList.add(nextMode);
    }

    function syncRoomUrl(roomId) {
        try {
            const url = new URL(window.location.href);
            if (roomId) url.searchParams.set('room_id', String(roomId));
            else url.searchParams.delete('room_id');
            window.history.replaceState({}, '', url.toString());
        } catch {}
    }

    function backToRoomPicker() {
        state.currentRoomId = 0;
        state.detail = null;
        stopCamera();
        renderRooms();
        renderDetail();
        setFlowStatus('pending', 'Pilih room', 'Pilih room lalu masukkan kode akses.');
        setPageMode('room-picker');
        syncRoomUrl(0);
    }

    function getStored(key) {
        return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
    }

    function getStorageBucket() {
        return localStorage.getItem(STORAGE.session) ? localStorage : sessionStorage;
    }

    function loadRoomAccessMap() {
        try {
            const raw = localStorage.getItem(STORAGE.roomAccess) || sessionStorage.getItem(STORAGE.roomAccess) || '{}';
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    function saveRoomAccessMap() {
        try {
            const bucket = getStorageBucket();
            bucket.setItem(STORAGE.roomAccess, JSON.stringify(state.accessMap));
            const other = bucket === localStorage ? sessionStorage : localStorage;
            other.removeItem(STORAGE.roomAccess);
        } catch {}
    }

    function setRoomAccess(roomId, token) {
        if (!roomId) return;
        if (token) state.accessMap[String(roomId)] = token;
        else delete state.accessMap[String(roomId)];
        saveRoomAccessMap();
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setText(target, value) {
        const el = typeof target === 'string' ? document.getElementById(target) : target;
        if (el) el.textContent = value;
    }

    function showToast(message, type) {
        if (window.Toast && typeof window.Toast.show === 'function') {
            window.Toast.show(message, type || 'info');
        }
    }

    function clearStoredSession() {
        Object.values(STORAGE).forEach((key) => {
            try {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            } catch {}
        });
    }

    function setInlineStatus(el, message, type) {
        if (!el) return;
        el.textContent = message || '';
        el.dataset.tone = type || 'neutral';
        el.style.color = '';
    }

    function setFlowStatus(tone, title, note) {
        state.flowStatus = {
            tone: tone || 'pending',
            title: title || 'Belum mulai',
            note: note || ''
        };
        if (els.flowStatus) els.flowStatus.dataset.flow = state.flowStatus.tone;
        if (els.flowBadge) els.flowBadge.innerHTML = `<i class="fas fa-circle"></i> ${escapeHtml(state.flowStatus.title)}`;
        if (els.flowNote) els.flowNote.textContent = state.flowStatus.note;
    }

    function setStepStatus(stepEl, stateLabelEl, noteEl, mode, label, note) {
        if (!stepEl) return;
        stepEl.classList.remove('is-active', 'is-done', 'is-locked');
        if (mode) stepEl.classList.add(`is-${mode}`);
        if (stateLabelEl) stateLabelEl.textContent = label || 'Menunggu';
        if (noteEl && note) noteEl.textContent = note;
    }

    function hasValue(value) {
        return Array.isArray(value) ? value.length > 0 : Boolean(String(value || '').trim());
    }

    function evaluateCheckinFlowStatus() {
        const detail = state.detail;
        const currentEvent = detail?.current_event;
        const canSelfCheckIn = !!detail?.permissions?.can_self_check_in;
        if (!detail?.room) {
            setFlowStatus('pending', 'Pilih room', 'Pilih room lalu masukkan kode akses.');
            return;
        }
        if (!currentEvent) {
            setFlowStatus('pending', 'Menunggu rapat aktif', 'Buat atau tunggu rapat aktif untuk melanjutkan absensi.');
            return;
        }
        if (!canSelfCheckIn) {
            setFlowStatus('pending', 'Mode verifikasi manual', 'Absensi mandiri sedang tidak tersedia di room ini. Gunakan admin manual.');
            return;
        }

        const needsMember = requiresMemberSelection();
        const hasMember = needsMember ? hasRepresentativeIdentity() : true;
        const hasSelfie = Boolean(state.selfieFile);

        if (!hasMember) {
            setFlowStatus('pending', 'Langkah 1: pilih kader', 'Pilih kader dulu untuk lanjut ke kamera.');
            return;
        }
        if (!hasSelfie) {
            setFlowStatus('pending', 'Langkah 2: ambil selfie', 'Buka kamera lalu ambil selfie sebagai bukti kehadiran.');
            return;
        }
        setFlowStatus('ready', 'Siap kirim absensi', 'Semua syarat terpenuhi. Tekan tombol Kirim Kehadiran.');
    }

    function redirectToLogin(message) {
        try {
            sessionStorage.setItem('ipmquiz_flash', message || 'Silakan login dulu untuk membuka room absensi.');
        } catch {}
        window.location.href = '/login.html';
    }

    async function apiFetch(path, init = {}, roomId = 0) {
        const headers = { ...(init.headers || {}) };
        if (state.session) headers.Authorization = `Bearer ${state.session}`;
        const roomToken = roomId ? state.accessMap[String(roomId)] : '';
        if (roomToken) headers['x-room-access'] = roomToken;
        const response = await fetch(path, { ...init, headers });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.status === 'error') {
            const err = new Error(data.message || `HTTP ${response.status}`);
            err.status = response.status;
            throw err;
        }
        return data;
    }

    function renderAuthRequired(message) {
        const text = message || 'Sesi login kamu sudah habis. Login lagi untuk membuka room absensi.';
        state.user = null;
        state.rooms = [];
        state.currentRoomId = 0;
        state.detail = null;
        if (state.pollingInterval) {
            clearInterval(state.pollingInterval);
            state.pollingInterval = null;
        }
        if (els.roomPanel) els.roomPanel.hidden = true;
        setPageMode('room-picker');
        syncRoomUrl(0);
        if (els.roomGrid) {
            els.roomGrid.innerHTML = `
                <div class="attendance-empty-card">
                    <strong>Sesi login diperlukan</strong>
                    <p>${escapeHtml(text)}</p>
                    <a class="attendance-primary-btn" href="/login.html">Login Sekarang</a>
                </div>
            `;
        }
        setFlowStatus('error', 'Sesi login diperlukan', 'Login ulang untuk melanjutkan absensi.');
        updateUserChip();
    }

    function requireLogin() {
        state.session = getStored(STORAGE.session);
        if (!state.session) {
            redirectToLogin('Silakan login dulu untuk membuka room absensi.');
            return false;
        }
        return true;
    }

    async function validateSession() {
        try {
            const data = await apiFetch('/api/auth?action=me');
            state.user = data.user || null;
            updateUserChip();
            return true;
        } catch (error) {
            if (error.status === 401) {
                clearStoredSession();
                renderAuthRequired('Sesi login kamu tidak valid atau sudah berakhir.');
                showToast('Sesi habis. Halaman akan diarahkan ke login.', 'error');
                setTimeout(() => {
                    redirectToLogin('Sesi login kamu sudah habis. Silakan masuk lagi.');
                }, 900);
                return false;
            }
            throw error;
        }
    }

    function updateUserChip() {
        const fallbackName = getStored(STORAGE.fullname) || getStored(STORAGE.username) || 'User';
        const fallbackPimpinan = getStored(STORAGE.pimpinan) || '-';
        const name = state.user?.nama_panjang || state.user?.username || fallbackName;
        const pimpinan = state.user?.pimpinan || fallbackPimpinan;
        setText('attendance-user-chip', `${name} | ${pimpinan}`);
    }

    function currentIdentityMode() {
        return String(state.detail?.room?.identity_mode || '').trim() || 'account_identity';
    }

    function usesOrgMemberDirectory() {
        return currentIdentityMode() === 'org_member_select';
    }

    function requiresMemberSelection() {
        return true;
    }

    function getSelectedRepresentativeId() {
        return Number(els.memberSelect?.value || 0);
    }

    function getManualRepresentativeName() {
        return String(els.manualNameInput?.value || '').trim();
    }

    function hasRepresentativeIdentity() {
        return usesOrgMemberDirectory() ? hasValue(els.memberSelect?.value) : hasValue(getManualRepresentativeName());
    }

    function setCodeModalOpen(isOpen) {
        if (!els.codeModal) return;
        els.codeModal.hidden = !isOpen;
        els.codeModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        els.codeModal.classList.toggle('is-open', !!isOpen);
    }

    function openCodeModal(roomId, roomName) {
        state.pendingRoomId = Number(roomId) || 0;
        if (!state.pendingRoomId) {
            closeCodeModal();
            showToast('Room belum siap dibuka. Pilih kartu room lagi.', 'error');
            return;
        }
        if (els.codeModal) {
            els.codeModal.dataset.roomId = String(state.pendingRoomId);
            els.codeModal.dataset.roomName = String(roomName || '');
        }
        setText('attendance-code-modal-title', `Masukkan kode room ${roomName || ''}`.trim());
        setCodeModalOpen(true);
        setFlowStatus('pending', 'Masukkan kode room', `Masukkan kode untuk membuka room ${roomName || ''}`.trim());
        if (els.codeInput) {
            els.codeInput.value = '';
            els.codeInput.focus();
        }
        setInlineStatus(els.codeStatus, '');
    }

    function closeCodeModal() {
        state.pendingRoomId = 0;
        if (els.codeModal) {
            delete els.codeModal.dataset.roomId;
            delete els.codeModal.dataset.roomName;
        }
        setCodeModalOpen(false);
        if (els.codeForm) els.codeForm.reset();
        setInlineStatus(els.codeStatus, '');
        evaluateCheckinFlowStatus();
    }

    function renderRooms() {
        if (!els.roomGrid) return;
        if (!state.rooms.length) {
            els.roomGrid.innerHTML = '<div class="attendance-empty-card">Belum ada room absensi yang siap dipakai.</div>';
            return;
        }

        els.roomGrid.innerHTML = state.rooms.map((room) => {
            const selected = Number(room.id) === Number(state.currentRoomId);
            const accessLabel = room.has_access ? 'Terbuka' : 'Terkunci';
            const eventLabel = room.today_event ? `${escapeHtml(room.today_event.title)} sedang aktif` : 'Belum ada rapat aktif hari ini';
            return `
                <button type="button" class="attendance-room-card reveal ${selected ? 'is-selected' : ''}" data-room-id="${room.id}" data-room-name="${escapeHtml(room.pimpinan)}">
                    <div class="attendance-room-head">
                        <div>
                            <span class="attendance-room-label">Pimpinan</span>
                            <h3 class="attendance-room-name">${escapeHtml(room.pimpinan)}</h3>
                        </div>
                        <span class="attendance-pill ${room.today_event ? 'is-alert' : ''}">
                            <i class="fas ${room.today_event ? 'fa-calendar-check' : 'fa-lock'}"></i> ${accessLabel}
                        </span>
                    </div>
                    <div class="attendance-room-meta">
                        <span><i class="fas fa-signal"></i> ${escapeHtml(eventLabel)}</span>
                        <span><i class="fas fa-shield-halved"></i> Pilih kader room ini lalu lanjut selfie.</span>
                    </div>
                    <div class="attendance-room-actions">
                        <span class="attendance-primary-btn" style="padding: 10px 16px; font-size: 0.85rem; box-shadow: none;">
                            <i class="fas ${room.has_access ? 'fa-door-open' : 'fa-key'}"></i> ${room.has_access ? 'Buka Room' : 'Akses Room'}
                        </span>
                    </div>
                </button>
            `;
        }).join('');

    }

    function findRoomById(roomId) {
        return state.rooms.find((item) => Number(item.id) === Number(roomId)) || null;
    }

    function renderSummary(summary) {
        setText('attendance-summary-total', String(summary?.total_events || 0));
        setText('attendance-summary-hadir', String(summary?.hadir_count || 0));
        setText('attendance-summary-percent', `${summary?.attendance_percent || 0}%`);
        setText('attendance-summary-status', String(summary?.activity_status || 'pasif').toUpperCase());
    }

    function renderMemberOptions(isFirstLoad = false, filterText = '') {
        if (!els.memberField || !els.memberSelect || !els.memberMeta) return;
        const isCabangRoom = usesOrgMemberDirectory();
        els.memberField.hidden = false;
        if (els.memberDirectory) els.memberDirectory.hidden = !isCabangRoom;
        if (els.manualNameWrap) els.manualNameWrap.hidden = isCabangRoom;

        const queryText = String(filterText || '').toLowerCase().trim();
        const options = Array.isArray(state.memberOptions) ? state.memberOptions : [];
        const defaultOption = isCabangRoom
            ? 'Pilih nama dari struktur organisasi'
            : 'Pilih kader dari room ini';

        if (!isCabangRoom) {
            els.memberMeta.textContent = hasValue(getManualRepresentativeName())
                ? 'Nama kader manual siap dipakai untuk absensi.'
                : 'Tulis nama kader yang akan diabsenkan untuk room ini.';
            els.memberMeta.style.color = 'var(--c-text-muted)';
            updateStepHighlight();
            return;
        }
        
        let filtered = options;
        if (queryText) {
            filtered = options.filter(item => 
                String(item.full_name || '').toLowerCase().includes(queryText) ||
                String(item.role_title || '').toLowerCase().includes(queryText) ||
                String(item.bidang_name || '').toLowerCase().includes(queryText)
            );
        }

        // ONLY populate innerHTML if it's a first load, search changed, or empty
        const currentVal = els.memberSelect.value;
        const shouldRepopulate = isFirstLoad || !!queryText || els.memberSelect.options.length <= 1;

        if (shouldRepopulate) {
            els.memberSelect.innerHTML = [
                `<option value="">${defaultOption}</option>`,
                ...filtered.map((item) => `<option value="${item.id}">${escapeHtml(item.full_name)}</option>`)
            ].join('');
            
            // Try to restore previous value if it's still in the filtered list
            if (currentVal && filtered.some(item => String(item.id) === String(currentVal))) {
                els.memberSelect.value = currentVal;
            }
        }

        const selected = options.find((item) => String(item.id) === String(els.memberSelect.value || ''));
        if (selected) {
            els.memberMeta.textContent = `${selected.role_title || 'Anggota'}${selected.bidang_name ? ` • ${selected.bidang_name}` : ''}`;
            els.memberMeta.style.color = 'var(--c-text-muted)';
        } else if (queryText && filtered.length === 0) {
            els.memberMeta.textContent = `Nama "${filterText}" tidak ditemukan.`;
            els.memberMeta.style.color = '#ef4444';
        } else if (options.length === 0) {
            els.memberMeta.textContent = isCabangRoom
                ? 'Data kader belum ada di struktur organisasi. Hubungi admin untuk input data.'
                : 'Data kader room ini belum tersedia. Pastikan akun anggota dan pimpinan room sudah sesuai.';
            els.memberMeta.style.color = '#f59e0b'; // Amber warning
        } else {
            els.memberMeta.textContent = queryText 
                ? `${filtered.length} nama ditemukan.`
                : (isCabangRoom
                    ? 'Pilih nama kader aktif dari struktur organisasi.'
                    : 'Pilih kader yang akan diabsenkan dari room ini.');
            els.memberMeta.style.color = 'var(--c-text-muted)';
        }
        updateStepHighlight();
    }

    function renderAccessStrip() {
        if (!els.accessStrip || !state.detail?.room) return;
        const detail = state.detail;
        const currentEvent = detail.current_event;
        const canSelfCheckIn = !!detail.permissions?.can_self_check_in;
        
        els.accessStrip.innerHTML = `
            <div class="attendance-status-bar">
                <span class="status-pill ${canSelfCheckIn ? 'is-success' : 'is-warning'}">
                    <i class="fas fa-fingerprint"></i> ${canSelfCheckIn ? 'Akses Perwakilan' : 'Verifikasi Manual'}
                </span>
                <span class="status-pill ${currentEvent ? 'is-active' : 'is-muted'}">
                    <i class="fas fa-bolt"></i> ${currentEvent ? 'Rapat Aktif' : 'Standby'}
                </span>
                <span class="status-pill">
                    <i class="fas fa-users"></i> ${detail.room.member_count || 0} Kader
                </span>
            </div>
        `;
    }

    function renderHistory(items) {
        if (!els.historyList) return;
        if (!Array.isArray(items)) return;

        // Store original to state if not yet stored
        if (items !== state.originalHistory) {
            state.originalHistory = items;
            state.historySearch = '';
            state.historyFilter = 'all';
            if (els.historySearch) els.historySearch.value = '';
            els.historyFilters?.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
        }

        // Apply Filtering
        let filtered = [...items];
        if (state.historySearch) {
            const query = state.historySearch.toLowerCase();
            filtered = filtered.filter(it => 
                (it.title || '').toLowerCase().includes(query) || 
                (it.event_date || '').includes(query)
            );
        }
        if (state.historyFilter && state.historyFilter !== 'all') {
            filtered = filtered.filter(it => it.status === state.historyFilter);
        }

        if (!filtered.length) {
            els.historyList.innerHTML = '<div class="attendance-empty-state">Tidak ada riwayat yang sesuai dengan pencarian Anda.</div>';
            return;
        }

        // Chronological Sorting (Ensure Newest First)
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Group by Month & Year
        const groups = {};
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        filtered.forEach(item => {
            const date = new Date(item.event_date);
            const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        // Generate HTML with Group Headers
        let html = '';
        for (const [monthKey, groupItems] of Object.entries(groups)) {
            html += `
                <div class="history-month-group">
                    <div class="history-month-header">${monthKey}</div>
                    <div class="attendance-history-list">
                        ${groupItems.map(item => `
                            <article class="attendance-history-item clickable ${item.status === 'closed' ? 'inactive' : ''}" 
                                     data-event-id="${item.id}" 
                                     data-event-title="${escapeHtml(item.title)}" 
                                     data-event-date="${escapeHtml(String(item.event_date || '').slice(0, 10))}">
                                <div class="attendance-history-content">
                                    <div class="attendance-pill" style="margin-bottom: 8px; font-size: 10px; padding: 4px 10px; background: ${item.status === 'active' ? 'var(--c-emerald-50)' : '#f1f5f9'}; color: ${item.status === 'active' ? 'var(--c-emerald-700)' : '#64748b'};">
                                        ${item.status === 'active' ? 'AKTIF' : 'DIARSIPKAN'}
                                    </div>
                                    <h4 class="attendance-history-title">${escapeHtml(item.title)}</h4>
                                    <div class="attendance-history-meta">
                                        <span><i class="fas fa-calendar-day"></i> ${escapeHtml(String(item.event_date || '').slice(0, 10))}</span>
                                        <span><i class="fas fa-users"></i> ${Number(item.hadir_count || 0)} Hadir</span>
                                    </div>
                                </div>
                                <button type="button" class="attendance-icon-btn action-download" data-event-id="${item.id}" title="Ekspor CSV">
                                    <i class="fas fa-file-csv"></i>
                                    <span>Ekspor</span>
                                </button>
                            </article>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        els.historyList.innerHTML = html;
    }

    function renderCreateFormState(currentEvent) {
        if (!els.createForm) return;
        const disabled = !!currentEvent;
        els.createForm.classList.toggle('is-disabled', disabled);
        if (els.createBtn) {
            els.createBtn.disabled = disabled;
            els.createBtn.innerHTML = disabled
                ? '<i class="fas fa-lock"></i> Rapat Hari Ini Sudah Aktif'
                : '<i class="fas fa-plus"></i> Buat Rapat Hari Ini';
        }
        setInlineStatus(
            els.createStatus,
            disabled
                ? 'Rapat aktif sudah ada. Tunggu rapat ini ditutup dulu sebelum membuat rapat baru.'
                : 'Kalau rapat belum dibuka hari ini, kamu bisa membuat rapat baru dari form ini.'
        );
    }

    function renderCurrentEvent() {
        const detail = state.detail;
        const currentEvent = detail?.current_event;
        const canSelfCheckIn = !!detail?.permissions?.can_self_check_in;
        if (!els.currentEventBox) return;

        if (!currentEvent) {
            els.currentEventBox.innerHTML = '<div class="attendance-empty-state">Belum ada rapat aktif untuk room ini hari ini.</div>';
            setText('attendance-event-badge', 'Menunggu');
            if (els.checkinForm) els.checkinForm.hidden = true;
            renderCreateFormState(null);
            setInlineStatus(
                els.checkinStatus,
                canSelfCheckIn
                    ? 'Buat atau tunggu rapat aktif lebih dulu sebelum check-in.'
                    : 'Kamu bisa masuk room ini, tetapi absensi mandiri sedang tidak tersedia.'
            );
            renderMemberOptions();
            evaluateCheckinFlowStatus();
            return;
        }

        const myRecord = currentEvent.my_record;
        const creator = currentEvent.created_by_name || currentEvent.created_by_username || 'User room';
        const attendeesCount = Number(currentEvent.attendees_count || 0);
        const recentAttendees = Array.isArray(currentEvent.recent_attendees) ? currentEvent.recent_attendees : [];
        setText('attendance-event-badge', 'Aktif Hari Ini');

        els.currentEventBox.innerHTML = `
            <article class="attendance-event-card">
                <div class="event-card-main">
                    <h4 class="event-title">${escapeHtml(currentEvent.title)}</h4>
                    <div class="event-meta">
                        <span><i class="fas fa-calendar-day"></i> ${escapeHtml(String(currentEvent.event_date || '').slice(0, 10))}</span>
                        <span><i class="fas fa-user-circle"></i> ${escapeHtml(creator)}</span>
                    </div>
                </div>
                
                <div class="attendance-event-stats">
                    <div class="event-stat-item">
                        <span class="stat-label">Terdaftar</span>
                        <strong class="stat-value">${attendeesCount}</strong>
                    </div>
                    <div class="event-stat-item">
                        <span class="stat-label">Anggota</span>
                        <strong class="stat-value">${Number(detail.room?.member_count || 0)}</strong>
                    </div>
                    <div class="event-stat-item ${myRecord ? 'is-highlight' : ''}">
                        <span class="stat-label">Status</span>
                        <strong class="stat-value">${myRecord ? 'Hadir' : 'Pasif'}</strong>
                    </div>
                </div>
                
                <p class="event-description">${escapeHtml(currentEvent.description || 'Agenda rapat rutin.')}</p>
                
                <div class="attendance-roster">
                    <div class="roster-head">Check-in Terbaru</div>
                    ${recentAttendees.length ? recentAttendees.map((item) => `
                        <div class="roster-item">
                            <div class="roster-info">
                                <span class="roster-name">${escapeHtml(item.attendee_name || item.nama_panjang || item.username)}</span>
                                <span class="roster-time">${escapeHtml(item.check_in_at ? new Date(item.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-')}</span>
                            </div>
                        </div>
                    `).join('') : '<div class="attendance-empty-state">Belum ada kader yang hadir.</div>'}
                </div>
            </article>
        `;


        renderCreateFormState(currentEvent);
        renderMemberOptions();

        if (els.checkinForm) {
            els.checkinForm.hidden = !canSelfCheckIn; // Form stays open allowing multiple proxy check-ins
        }
        if (!canSelfCheckIn) {
            setInlineStatus(els.checkinStatus, 'Absensi mandiri sedang tidak tersedia untuk room ini.', 'error');
        } else {
            setInlineStatus(els.checkinStatus, 'Pilih kader, ambil selfie terbaru, lalu kirim. Kamu bisa check-in berulang untuk perwakilan.');
        }
        evaluateCheckinFlowStatus();
    }

    function renderDetail() {
        const detail = state.detail;
        if (!detail || !detail.room) {
            if (els.roomPanel) els.roomPanel.hidden = true;
            setPageMode('room-picker');
            return;
        }

        if (els.roomPanel) els.roomPanel.hidden = false;
        setPageMode('room-focus');
        syncRoomUrl(detail.room.id);
        setText('attendance-room-label', `Room ${detail.room.pimpinan}`);
        setText('attendance-room-title', detail.room.pimpinan);
        setText(
            'attendance-room-subtitle',
            detail.permissions?.can_self_check_in
                ? 'Kamu bisa membuat rapat dan mengabsenkan kader dari room ini.'
                : 'Kamu bisa membuka room dan membuat rapat, tetapi absensi mandiri sedang dibatasi.'
        );

        renderAccessStrip();
        renderSummary(detail.my_summary || {});
        renderCurrentEvent();
        renderHistory(detail.history || []);
        startLivePolling(detail.room.id);
    }

    async function loadMemberOptions(roomId) {
        if (!roomId) return;
        state.memberOptions = [];
        if (els.memberSelect) els.memberSelect.value = '';
        if (els.memberSearch) els.memberSearch.value = '';
        try {
            const data = await apiFetch(`/api/attendance?action=members&room_id=${encodeURIComponent(roomId)}`, { method: 'GET' }, roomId);
            state.memberOptions = Array.isArray(data.members) ? data.members : [];
            renderMemberOptions(true); // Pass true to force populate list
        } catch (error) {
            console.error('Gagal memuat daftar anggota:', error);
            state.memberOptions = [];
            renderMemberOptions(true);
        }
    }

    function startLivePolling(roomId) {
        if (state.pollingInterval) clearInterval(state.pollingInterval);
        state.pollingInterval = setInterval(async () => {
            if (!state.currentRoomId || state.currentRoomId !== roomId) {
                clearInterval(state.pollingInterval);
                return;
            }
            try {
                const data = await apiFetch(`/api/attendance?action=roomDetail&room_id=${encodeURIComponent(roomId)}`, { method: 'GET' }, roomId);
                const newAttendees = data.current_event?.recent_attendees || [];
                const oldAttendees = state.detail?.current_event?.recent_attendees || [];
                if (newAttendees.length > 0 && oldAttendees.length > 0) {
                    const oldIds = new Set(oldAttendees.map((item) => item.username));
                    const freshlyJoined = newAttendees.filter((item) => !oldIds.has(item.username));
                    freshlyJoined.forEach((item) => {
                        showToast(`${item.nama_panjang || item.username} baru saja hadir`, 'success');
                    });
                }
                state.detail = data;
                renderAccessStrip();
                renderSummary(data.my_summary || {});
                renderCurrentEvent();
                renderHistory(data.history || []);
            } catch {}
        }, 12000);
    }

    async function loadRooms(preferredRoomId) {
        if (els.refreshBtn) els.refreshBtn.disabled = true;
        setFlowStatus('progress', 'Memuat room...', 'Mengambil daftar room absensi.');
        try {
            const data = await apiFetch('/api/attendance?action=rooms');
            state.user = data.user || state.user || null;
            state.rooms = Array.isArray(data.rooms) ? data.rooms : [];
            updateUserChip();
            renderRooms();

            const preferredRoom = findRoomById(preferredRoomId);
            const currentRoom = findRoomById(state.currentRoomId);
            const accessibleRoom = state.rooms.find((room) => room.has_access) || null;
            const targetRoom = preferredRoom?.has_access
                ? preferredRoom
                : (currentRoom?.has_access ? currentRoom : accessibleRoom);

            if (targetRoom?.id) {
                await loadRoomDetail(targetRoom.id, false);
            } else if (preferredRoom?.id) {
                openCodeModal(preferredRoom.id, preferredRoom.pimpinan);
            } else {
                setFlowStatus('pending', 'Pilih room', 'Pilih room lalu masukkan kode akses.');
            }
        } catch (error) {
            if (error.status === 401) {
                clearStoredSession();
                renderAuthRequired('Sesi login kamu tidak valid atau sudah kedaluwarsa.');
                showToast('Silakan login lagi untuk memakai fitur absensi.', 'error');
                setTimeout(() => {
                    redirectToLogin('Sesi login kamu sudah habis. Silakan masuk lagi.');
                }, 900);
                return;
            }
            showToast(error.message || 'Gagal memuat room absensi', 'error');
            if (els.roomGrid) {
                els.roomGrid.innerHTML = `<div class="attendance-empty-card">${escapeHtml(error.message || 'Gagal memuat room absensi.')}</div>`;
            }
            setFlowStatus('error', 'Gagal memuat room', error.message || 'Coba muat ulang halaman.');
        } finally {
            if (els.refreshBtn) els.refreshBtn.disabled = false;
        }
    }

    async function loadRoomDetail(roomId, openCodeWhenNeeded) {
        const room = state.rooms.find((item) => Number(item.id) === Number(roomId));
        if (!room) return;

        try {
            setFlowStatus('progress', 'Membuka room...', 'Memuat detail room dan rapat aktif.');
            const data = await apiFetch(`/api/attendance?action=roomDetail&room_id=${encodeURIComponent(roomId)}`, { method: 'GET' }, roomId);
            state.currentRoomId = Number(roomId);
            state.detail = data;
            renderRooms();
            renderDetail();
            await loadMemberOptions(roomId);
            evaluateCheckinFlowStatus();
        } catch (error) {
            if (error.status === 403) {
                setRoomAccess(roomId, '');
                state.currentRoomId = 0;
                state.detail = null;
                renderRooms();
                renderDetail();
                setPageMode('room-picker');
                syncRoomUrl(0);
                if (openCodeWhenNeeded !== false) openCodeModal(roomId, room.pimpinan);
                return;
            }
            setFlowStatus('error', 'Gagal membuka room', error.message || 'Detail room tidak bisa dimuat.');
            showToast(error.message || 'Gagal memuat detail room', 'error');
        }
    }

    async function handleCodeSubmit(event) {
        event.preventDefault();
        const roomId = Number(state.pendingRoomId || els.codeModal?.dataset.roomId || 0);
        if (!roomId) {
            setInlineStatus(els.codeStatus, 'Room belum terpilih. Tutup modal lalu pilih room lagi.', 'error');
            showToast('Pilih room dulu sebelum memasukkan kode.', 'error');
            return;
        }
        state.pendingRoomId = roomId;
        if (els.codeSubmit) els.codeSubmit.disabled = true;
        setInlineStatus(els.codeStatus, 'Memverifikasi kode room...');
        setFlowStatus('progress', 'Verifikasi kode room', 'Memastikan kode room sesuai.');
        try {
            const data = await apiFetch('/api/attendance?action=verifyRoom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: roomId,
                    room_code: String(els.codeInput?.value || '').trim()
                })
            });
            setRoomAccess(roomId, data.access_token || '');
            closeCodeModal();
            await loadRooms(roomId);
            setFlowStatus('success', 'Room terbuka', 'Kode valid. Lanjutkan ke event dan absensi.');
            showToast('Room berhasil dibuka', 'success');
        } catch (error) {
            if (error.status === 401) {
                clearStoredSession();
                closeCodeModal();
                renderAuthRequired('Kode room tidak bisa diverifikasi karena sesi login kamu sudah habis.');
                showToast('Login ulang dulu lalu masukkan kode room lagi.', 'error');
                return;
            }
            setInlineStatus(els.codeStatus, error.message || 'Kode room tidak sesuai.', 'error');
            setFlowStatus('error', 'Kode room gagal', error.message || 'Kode room tidak sesuai.');
        } finally {
            if (els.codeSubmit) els.codeSubmit.disabled = false;
        }
    }

    async function handleCreateEvent(event) {
        event.preventDefault();
        const roomId = Number(state.currentRoomId || 0);
        if (!roomId) return;
        const title = String(els.createTitle?.value || '').trim();
        const description = String(els.createDesc?.value || '').trim();
        if (!title) {
            setInlineStatus(els.createStatus, 'Judul event wajib diisi.', 'error');
            return;
        }

        if (els.createBtn) els.createBtn.disabled = true;
        setInlineStatus(els.createStatus, 'Membuat event rapat...');
        setFlowStatus('progress', 'Membuat event', 'Menyimpan event rapat untuk hari ini.');
        try {
            await apiFetch('/api/attendance?action=createEvent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: roomId, title, description })
            }, roomId);
            if (els.createForm) els.createForm.reset();
            showToast('Event rapat berhasil dibuat', 'success');
            await loadRooms(roomId);
            setFlowStatus('success', 'Event aktif dibuat', 'Event sudah aktif. Lanjutkan ke pengisian absensi.');
        } catch (error) {
            if (error.status === 401) {
                clearStoredSession();
                renderAuthRequired('Sesi login kamu habis saat membuat event rapat.');
                showToast('Login ulang dulu untuk membuat event.', 'error');
                return;
            }
            setInlineStatus(els.createStatus, error.message || 'Gagal membuat event.', 'error');
            setFlowStatus('error', 'Gagal membuat event', error.message || 'Coba lagi beberapa saat.');
        } finally {
            renderCreateFormState(state.detail?.current_event || null);
        }
    }

    function updateSelfiePreview(file) {
        state.selfieFile = file || null;
        if (!els.selfiePreview || !els.selfieImage) return;
        if (!file) {
            els.selfiePreview.hidden = true;
            els.selfieImage.src = '';
            updateStepHighlight();
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        els.selfieImage.src = objectUrl;
        els.selfiePreview.hidden = false;
        updateStepHighlight();
    }

    function stopCamera() {
        const stream = state.selfieStream;
        if (stream && typeof stream.getTracks === 'function') {
            stream.getTracks().forEach((track) => track.stop());
        }
        state.selfieStream = null;
        if (els.cameraVideo) {
            try { els.cameraVideo.pause(); } catch(e) {}
            els.cameraVideo.srcObject = null;
            els.cameraVideo.hidden = true;
            els.cameraVideo.classList.remove('is-active');
        }
        if (els.cameraGuide) els.cameraGuide.hidden = true;
        if (els.captureCameraBtn) els.captureCameraBtn.hidden = true;
    }

    async function openCamera() {
        // Immediate check: requires secure context
        if (!window.isSecureContext) {
            if (els.cameraOverlay) els.cameraOverlay.hidden = false;
            if (els.secureWarning) els.secureWarning.hidden = false;
            if (els.cameraErrorMessage) els.cameraErrorMessage.hidden = true;
            setFlowStatus('error', 'Kamera tidak tersedia', 'Akses kamera butuh koneksi aman (HTTPS).');
            return;
        }

        stopCamera();
        
        // Reset UI immediately (no awaits)
        if (els.cameraOverlay) els.cameraOverlay.style.display = 'none';
        if (els.cameraErrorMessage) els.cameraErrorMessage.style.display = 'none';
        if (els.cameraPlaceholder) els.cameraPlaceholder.style.display = 'flex';

        try {
            const selectedDeviceId = els.cameraSelect?.value;
            // 1. First attempt: High quality ideal
            let constraints = {
                video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { 
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (initialError) {
                console.warn('[Camera] High-res failed, trying fallback true:', initialError);
                // 2. Fallback: Minimal constraints
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }

            state.selfieStream = stream;
            
            if (els.cameraVideo) {
                els.cameraVideo.srcObject = stream;
                els.cameraVideo.hidden = false;
                
                // FORCE HIDE all overlays on success
                if (els.cameraPlaceholder) els.cameraPlaceholder.style.display = 'none';
                if (els.cameraOverlay) els.cameraOverlay.style.display = 'none';
                if (els.secureWarning) els.secureWarning.style.display = 'none';
                if (els.cameraErrorMessage) els.cameraErrorMessage.style.display = 'none';
                if (els.cameraGuide) els.cameraGuide.hidden = false;
                
                await new Promise((resolve) => {
                    els.cameraVideo.onloadedmetadata = () => resolve();
                });
                await els.cameraVideo.play();
                els.cameraVideo.classList.add('is-active');
            }

            await enumerateCameras();

            if (els.captureCameraBtn) els.captureCameraBtn.hidden = false;
            if (els.retakeCameraBtn) els.retakeCameraBtn.hidden = true;
            if (els.openCameraBtn) els.openCameraBtn.hidden = true;
            
            updateSelfiePreview(null);
            setInlineStatus(els.checkinStatus, 'Kamera aktif.', 'success');
            setFlowStatus('ready', 'Kamera aktif', 'Ambil selfie untuk melanjutkan absensi.');
        } catch (error) {
            console.error('[Camera] Final Error:', error);
            let msg = `Gagal akses kamera: ${error.name}`;
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                msg = 'Izin kamera tetap ditolak oleh browser/sistem OS.';
                if (els.cameraOverlay) els.cameraOverlay.style.display = 'flex';
                if (els.cameraPlaceholder) els.cameraPlaceholder.style.display = 'none';
                if (els.cameraErrorMessage) {
                    els.cameraErrorMessage.style.display = 'block';
                    els.cameraErrorMessage.innerHTML = `
                        <div style="text-align: left; font-size: 0.8rem; line-height: 1.4;">
                            <strong style="color: #ff4d4d;">Akses Diblokir (${error.name})</strong><br><br>
                            1. Pastikan izin di browser (ikon gembok/garis) sudah <strong>Allow</strong>.<br>
                            2. Cek <strong>Pengaturan Privasi Windows/Ponsel</strong> (Izinkan Browser akses Kamera).<br>
                            3. Tutup aplikasi lain (Zoom, Meet, WA) yang mungkin memakai kamera.<br>
                            4. Gunakan browser Google Chrome terbaru.
                        </div>
                    `;
                }
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                msg = 'Kamera tidak ditemukan di perangkat.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                msg = 'Kamera sudah dipakai aplikasi lain.';
            }
            
            setInlineStatus(els.checkinStatus, msg, 'error');
            setFlowStatus('error', 'Akses kamera gagal', msg);
            if (window.Toast) window.Toast.show(msg, 'error');
        } finally {
            if (window.AppLoader) window.AppLoader.hide();
        }
    }

    async function enumerateCameras() {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            const select = els.cameraSelect;
            const container = els.deviceSelector;
            
            if (!select || !container || videoDevices.length <= 1) {
                if (container) container.hidden = true;
                return;
            }

            container.hidden = false;
            const currentVal = select.value;
            select.innerHTML = '';
            
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Kamera ${index + 1}`;
                select.appendChild(option);
            });

            if (currentVal && videoDevices.some(d => d.deviceId === currentVal)) {
                select.value = currentVal;
            }
        } catch (err) {
            console.error('[Camera] Enumerate failed:', err);
        }
    }

    /**
     * Compress an image blob to target max size (default 200KB).
     * Resizes to maxDim first, then progressively lowers JPEG quality.
     */
    async function compressImage(sourceCanvas, maxDim = 800, maxBytes = 200 * 1024) {
        const canvas = document.createElement('canvas');
        const srcW = sourceCanvas.width;
        const srcH = sourceCanvas.height;

        // Step 1: Resize if larger than maxDim
        let w = srcW, h = srcH;
        if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceCanvas, 0, 0, w, h);

        // Step 2: Progressive quality reduction
        let quality = 0.82;
        let blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));

        while (blob && blob.size > maxBytes && quality > 0.3) {
            quality -= 0.1;
            blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
        }

        const sizeKB = blob ? (blob.size / 1024).toFixed(0) : '?';
        console.log(`[Compress] ${srcW}x${srcH} → ${w}x${h}, quality=${quality.toFixed(1)}, size=${sizeKB}KB`);
        return blob;
    }

    async function captureSelfie() {
        if (!state.selfieStream || !els.cameraVideo) {
            setInlineStatus(els.checkinStatus, 'Buka kamera dulu sebelum mengambil selfie.', 'error');
            setFlowStatus('pending', 'Kamera belum aktif', 'Buka kamera lalu ambil selfie.');
            return;
        }

        // Capture raw frame
        const rawCanvas = document.createElement('canvas');
        rawCanvas.width = els.cameraVideo.videoWidth || 720;
        rawCanvas.height = els.cameraVideo.videoHeight || 960;
        const ctx = rawCanvas.getContext('2d');
        if (!ctx) {
            setInlineStatus(els.checkinStatus, 'Gagal menyiapkan kamera untuk capture selfie.', 'error');
            setFlowStatus('error', 'Selfie gagal', 'Gagal menyiapkan kamera. Coba buka kamera ulang.');
            return;
        }
        ctx.drawImage(els.cameraVideo, 0, 0, rawCanvas.width, rawCanvas.height);

        // Compress: resize to max 800px + target ≤200KB
        const blob = await compressImage(rawCanvas, 800, 200 * 1024);
        if (!blob) {
            setInlineStatus(els.checkinStatus, 'Selfie gagal diproses. Coba ambil ulang.', 'error');
            setFlowStatus('error', 'Selfie gagal diproses', 'Coba ambil selfie ulang.');
            return;
        }

        const sizeKB = (blob.size / 1024).toFixed(0);
        const file = new File([blob], `attendance-selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
        updateSelfiePreview(file);
        await stopCamera();
        if (els.retakeCameraBtn) els.retakeCameraBtn.hidden = false;
        setInlineStatus(els.checkinStatus, `Selfie siap (${sizeKB}KB). Periksa lalu kirim.`, 'success');
        evaluateCheckinFlowStatus();
    }

    async function uploadSelfie(file) {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${state.session}`,
                'Content-Type': file.type || 'image/jpeg',
                'x-filename': file.name || `attendance-selfie-${Date.now()}.jpg`,
                'x-upload-scope': 'attendance-selfie'
            },
            body: file
        });

        if (response.status === 503) {
            throw new Error('Layanan penyimpanan belum aktif. Hubungi admin untuk konfigurasi Vercel Blob.');
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.status === 'error' || !data.url) {
            throw new Error(data.message || 'Gagal mengunggah selfie.');
        }
        return data.url;
    }

    async function handleCheckIn(event) {
        event.preventDefault();
        const currentEvent = state.detail?.current_event;
        const identityMode = currentIdentityMode();
        if (!currentEvent) {
            setInlineStatus(els.checkinStatus, 'Belum ada event aktif untuk dihadiri.', 'error');
            setFlowStatus('pending', 'Belum ada event aktif', 'Buat atau tunggu event aktif dulu.');
            return;
        }
        const selectedMemberId = getSelectedRepresentativeId();
        const manualRepresentativeName = getManualRepresentativeName();
        if (usesOrgMemberDirectory() && requiresMemberSelection() && !selectedMemberId) {
            setInlineStatus(els.checkinStatus, 'Pilih dulu kader yang akan diabsenkan (Langkah 1)', 'error');
            setFlowStatus('pending', 'Langkah 1 belum selesai', 'Pilih kader terlebih dahulu.');
            showToast('Pilih kader di Langkah 1', 'error');
            return;
        }
        if (!usesOrgMemberDirectory() && requiresMemberSelection() && !manualRepresentativeName) {
            setInlineStatus(els.checkinStatus, 'Tulis dulu nama kader yang akan diabsenkan (Langkah 1)', 'error');
            setFlowStatus('pending', 'Langkah 1 belum selesai', 'Tulis nama kader terlebih dahulu.');
            showToast('Tulis nama kader di Langkah 1', 'error');
            return;
        }
        if (!state.selfieFile) {
            setInlineStatus(els.checkinStatus, 'Ambil foto selfie dulu (Langkah 2)', 'error');
            setFlowStatus('pending', 'Langkah 2 belum selesai', 'Ambil selfie terlebih dahulu.');
            showToast('Ambil foto di Langkah 2', 'error');
            return;
        }

        if (els.checkinBtn) els.checkinBtn.disabled = true;
        setInlineStatus(els.checkinStatus, 'Mengunggah selfie dan memverifikasi...');
        setFlowStatus('progress', 'Sedang mengirim absensi...', 'Mengunggah selfie dan memverifikasi kehadiran.');
        
        try {
            const photoUrl = await uploadSelfie(state.selfieFile);
            await apiFetch('/api/attendance?action=checkIn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: currentEvent.id,
                    photo_url: photoUrl,
                    org_member_id: identityMode === 'org_member_select' ? selectedMemberId : null,
                    attendee_name: identityMode === 'org_member_select' ? null : manualRepresentativeName
                })
            }, Number(state.currentRoomId));

            // SUCCESS STATE - Immediate Reset for Seamless Multi-Entry
            showToast('Absensi Berhasil!', 'success');
            setInlineStatus(els.checkinStatus, 'Absensi berhasil. Silakan pilih kader lain jika ingin lanjut mengabsenkan perwakilan.', 'success');
            setFlowStatus('success', 'Absensi terkirim', 'Data kehadiran berhasil masuk.');
            
            // Reset state & fields
            state.selfieFile = null;
            if (els.memberSelect) els.memberSelect.value = '';
            if (els.memberSearch) els.memberSearch.value = '';
            if (els.manualNameInput) els.manualNameInput.value = '';
            if (els.retakeCameraBtn) els.retakeCameraBtn.hidden = true;
            
            // Re-open camera for next person if applicable
            updateStepHighlight();
            if (els.cameraSelect?.value !== 'disabled') {
                openCamera();
            }
            
            await loadRooms(state.currentRoomId);
        } catch (error) {
            if (error.status === 401) {
                clearStoredSession();
                renderAuthRequired('Sesi login kamu habis saat mengirim absensi.');
                showToast('Login ulang dulu untuk melanjutkan.', 'error');
                return;
            }
            setInlineStatus(els.checkinStatus, error.message || 'Gagal mengirim absensi. Coba lagi.', 'error');
            setFlowStatus('error', 'Gagal kirim absensi', error.message || 'Periksa koneksi lalu kirim ulang.');
            showToast(error.message || 'Gagal mengirim absensi', 'error');
        } finally {
            if (els.checkinBtn) els.checkinBtn.disabled = false;
            evaluateCheckinFlowStatus();
        }
    }

    // Step Highlighting Logic
    function updateStepHighlight() {
        if (!els.stepIdentity || !els.stepPhoto || !els.stepSubmit) return;

        const needsIdentityPick = requiresMemberSelection();
        const isIdentityDone = needsIdentityPick ? hasRepresentativeIdentity() : true;
        const isPhotoDone = !!state.selfieFile;
        const hasEvent = !!state.detail?.current_event;
        const canSelfCheckIn = !!state.detail?.permissions?.can_self_check_in;

        [els.stepIdentity, els.stepPhoto, els.stepSubmit].forEach((s) => {
            const field = s.querySelector('.attendance-field');
            if (field) field.style.display = 'none';
        });

        const identityField = els.stepIdentity.querySelector('.attendance-field');
        const photoField = els.stepPhoto.querySelector('.attendance-field');
        const submitField = els.stepSubmit.querySelector('.attendance-field');

        if (!hasEvent || !canSelfCheckIn) {
            setStepStatus(
                els.stepIdentity,
                els.stepIdentityState,
                els.stepIdentityNote,
                needsIdentityPick ? 'active' : 'done',
                needsIdentityPick ? 'Siapkan' : 'Selesai',
                needsIdentityPick
                    ? 'Buka event aktif dulu, lalu pilih kader yang akan diabsenkan.'
                    : 'Identitas akun sudah dipakai otomatis untuk room ini.'
            );
            setStepStatus(els.stepPhoto, els.stepPhotoState, els.stepPhotoNote, 'locked', 'Menunggu', 'Kamera bisa dipakai setelah event aktif tersedia.');
            setStepStatus(els.stepSubmit, els.stepSubmitState, els.stepSubmitNote, 'locked', 'Menunggu', 'Kirim kehadiran tersedia setelah selfie siap.');
            if (identityField) identityField.style.display = needsIdentityPick ? 'flex' : 'none';
            evaluateCheckinFlowStatus();
            return;
        }

        if (!isIdentityDone) {
            setStepStatus(els.stepIdentity, els.stepIdentityState, els.stepIdentityNote, 'active', 'Sedang diisi', 'Pilih nama kader yang akan diabsenkan.');
            setStepStatus(els.stepPhoto, els.stepPhotoState, els.stepPhotoNote, 'locked', 'Menunggu', 'Buka kamera setelah identitas selesai.');
            setStepStatus(els.stepSubmit, els.stepSubmitState, els.stepSubmitNote, 'locked', 'Menunggu', 'Kirim kehadiran tersedia setelah selfie siap.');
            if (identityField) identityField.style.display = 'flex';
        } else if (!isPhotoDone) {
            setStepStatus(
                els.stepIdentity,
                els.stepIdentityState,
                els.stepIdentityNote,
                'done',
                'Selesai',
                needsIdentityPick ? 'Identitas sudah dipilih. Lanjut ke kamera.' : 'Identitas akun sudah siap dipakai.'
            );
            setStepStatus(els.stepPhoto, els.stepPhotoState, els.stepPhotoNote, 'active', 'Sedang diisi', 'Buka kamera lalu ambil selfie terbaru.');
            setStepStatus(els.stepSubmit, els.stepSubmitState, els.stepSubmitNote, 'locked', 'Menunggu', 'Tombol kirim aktif setelah selfie siap.');
            if (photoField) photoField.style.display = 'flex';
        } else {
            setStepStatus(
                els.stepIdentity,
                els.stepIdentityState,
                els.stepIdentityNote,
                'done',
                'Selesai',
                needsIdentityPick ? 'Identitas sudah dipilih dan siap dipakai.' : 'Identitas akun sudah siap dipakai.'
            );
            setStepStatus(els.stepPhoto, els.stepPhotoState, els.stepPhotoNote, 'done', 'Selesai', 'Selfie sudah siap. Kamu bisa ulang jika perlu.');
            setStepStatus(els.stepSubmit, els.stepSubmitState, els.stepSubmitNote, 'active', 'Siap kirim', 'Periksa status lalu kirim kehadiran sekarang.');
            if (submitField) submitField.style.display = 'flex';
        }

        evaluateCheckinFlowStatus();
    }

    function bindElements() {
        els.roomGrid = document.getElementById('attendance-room-grid');
        els.roomPanel = document.getElementById('attendance-room-panel');
        els.accessStrip = document.getElementById('attendance-access-strip');
        els.currentEventBox = document.getElementById('attendance-current-event');
        els.historyList = document.getElementById('attendance-history-list');
        els.refreshBtn = document.getElementById('attendance-refresh-btn');
        els.changeRoomBtn = document.getElementById('attendance-change-room-btn');
        els.backToRoomsBtn = document.getElementById('attendance-back-to-rooms-btn');
        els.codeModal = document.getElementById('attendance-code-modal');
        els.codeClose = document.getElementById('attendance-code-close');
        els.codeForm = document.getElementById('attendance-code-form');
        els.codeInput = document.getElementById('attendance-room-code-input');
        els.codeSubmit = document.getElementById('attendance-code-submit');
        els.codeStatus = document.getElementById('attendance-code-status');
        els.createForm = document.getElementById('attendance-create-form');
        els.createTitle = document.getElementById('attendance-event-title');
        els.createDesc = document.getElementById('attendance-event-description');
        els.createBtn = document.getElementById('attendance-create-btn');
        els.createStatus = document.getElementById('attendance-create-status');
        els.checkinForm = document.getElementById('attendance-checkin-form');
        els.checkinBtn = document.getElementById('attendance-checkin-btn');
        els.checkinStatus = document.getElementById('attendance-checkin-status');
        els.memberSelect = document.getElementById('attendance-member-select');
        els.memberSearch = document.getElementById('attendance-member-search');
        els.memberField = document.getElementById('attendance-member-field');
        els.memberMeta = document.getElementById('attendance-member-meta');
        els.memberDirectory = document.getElementById('attendance-member-directory');
        els.manualNameWrap = document.getElementById('attendance-manual-name-wrap');
        els.manualNameInput = document.getElementById('attendance-manual-name');
        els.openCameraBtn = document.getElementById('attendance-open-camera-btn');
        els.captureCameraBtn = document.getElementById('attendance-capture-camera-btn');
        els.retakeCameraBtn = document.getElementById('attendance-retake-camera-btn');
        els.cameraVideo = document.getElementById('attendance-camera-video');
        els.cameraPlaceholder = document.getElementById('attendance-camera-placeholder');
        els.cameraOverlay = document.getElementById('camera-permission-overlay');
        els.cameraErrorMessage = document.getElementById('camera-error-message');
        els.secureWarning = document.getElementById('secure-context-warning');
        els.deviceSelector = document.getElementById('attendance-device-selector');
        els.cameraSelect = document.getElementById('attendance-camera-select');
        els.selfiePreview = document.getElementById('attendance-selfie-preview');
        els.selfieImage = document.getElementById('attendance-selfie-image');
        els.cameraGuide = document.getElementById('attendance-camera-guide');
        els.successOverlay = document.getElementById('attendance-success-overlay');
        els.stepIdentity = document.getElementById('step-identity');
        els.stepPhoto = document.getElementById('step-photo');
        els.stepSubmit = document.getElementById('step-submit');
        els.stepIdentityState = document.getElementById('attendance-step-identity-state');
        els.stepPhotoState = document.getElementById('attendance-step-photo-state');
        els.stepSubmitState = document.getElementById('attendance-step-submit-state');
        els.stepIdentityNote = document.getElementById('attendance-step-identity-note');
        els.stepPhotoNote = document.getElementById('attendance-step-photo-note');
        els.stepSubmitNote = document.getElementById('attendance-step-submit-note');
        els.historySearch = document.getElementById('history-search-input');
        els.historyFilters = document.querySelectorAll('.history-filter-btn');
        els.tabBtns = document.querySelectorAll('.tab-btn');
        els.tabPanels = document.querySelectorAll('.attendance-tab-panel');
        els.flowStatus = document.getElementById('attendance-flow-status');
        els.flowBadge = document.getElementById('attendance-flow-badge');
        els.flowNote = document.getElementById('attendance-flow-note');
        
        // PWA Install
        els.pwaInstallSection = document.getElementById('pwa-install-section');
        els.pwaInstallBtn = document.getElementById('pwa-install-btn');
        
        // Drawer elements
        els.drawerOverlay = document.getElementById('attendees-drawer-overlay');
        els.drawer = document.getElementById('attendees-drawer');
        els.drawerClose = document.getElementById('attendees-drawer-close');
        els.drawerTitle = document.getElementById('drawer-event-title');
        els.drawerMeta = document.getElementById('drawer-event-meta');
        els.drawerContent = document.getElementById('attendees-list-content');
        els.photoModal = document.getElementById('attendance-photo-modal');
        els.photoBackdrop = document.getElementById('attendance-photo-backdrop');
        els.photoClose = document.getElementById('attendance-photo-close');
        els.photoImage = document.getElementById('attendance-photo-image');
        els.photoTitle = document.getElementById('attendance-photo-title');
        
        setCodeModalOpen(false);
        setFlowStatus('pending', 'Pilih room', 'Pilih room lalu masukkan kode akses.');
    }

    function bindEvents() {
        els.refreshBtn?.addEventListener('click', () => loadRooms(state.currentRoomId));
        els.backToRoomsBtn?.addEventListener('click', backToRoomPicker);
        els.changeRoomBtn?.addEventListener('click', () => {
            const room = state.rooms.find((item) => Number(item.id) === Number(state.currentRoomId));
            if (!room) return;
            setRoomAccess(room.id, '');
            renderRooms();
            setPageMode('room-picker');
            syncRoomUrl(0);
            openCodeModal(room.id, room.pimpinan);
        });
        els.codeClose?.addEventListener('click', closeCodeModal);
        els.codeModal?.addEventListener('click', (event) => {
            if (event.target === els.codeModal) closeCodeModal();
        });
        els.codeInput?.addEventListener('input', () => {
            if (!els.codeInput) return;
            els.codeInput.value = String(els.codeInput.value || '').toUpperCase().replace(/\s+/g, '');
        });
        els.codeForm?.addEventListener('submit', handleCodeSubmit);
        els.codeSubmit?.addEventListener('click', () => {
            if (!els.codeForm?.reportValidity || els.codeForm.reportValidity()) {
                setInlineStatus(els.codeStatus, 'Menyiapkan verifikasi room...');
            }
        });
        els.createForm?.addEventListener('submit', handleCreateEvent);
        els.checkinForm?.addEventListener('submit', handleCheckIn);
        els.historyList?.addEventListener('click', (event) => {
            const downloadBtn = event.target.closest('.action-download');
            if (downloadBtn) {
                handleExportAction(Number(downloadBtn.dataset.eventId));
                return;
            }
            
            const item = event.target.closest('.attendance-history-item');
            if (item) {
                const id = Number(item.dataset.eventId);
                const title = item.dataset.eventTitle;
                const meta = item.dataset.eventDate;
                showAttendeesDrawer(id, title, meta);
            }
        });
        els.drawerClose?.addEventListener('click', closeAttendeesDrawer);
        els.drawerOverlay?.addEventListener('click', (e) => {
            if (e.target === els.drawerOverlay) closeAttendeesDrawer();
        });
        els.drawerContent?.addEventListener('click', (event) => {
            const previewBtn = event.target.closest('.attendee-preview-btn[data-photo-url]');
            if (!previewBtn || previewBtn.classList.contains('is-disabled')) return;
            openPhotoPreview(String(previewBtn.dataset.photoUrl || ''), String(previewBtn.dataset.photoName || ''));
        });
        els.photoClose?.addEventListener('click', closePhotoPreview);
        els.photoBackdrop?.addEventListener('click', closePhotoPreview);
        els.memberSelect?.addEventListener('change', () => renderMemberOptions(false, els.memberSearch?.value));
        els.memberSearch?.addEventListener('input', (e) => renderMemberOptions(false, e.target.value));
        els.manualNameInput?.addEventListener('input', () => renderMemberOptions(false, ''));
        els.openCameraBtn?.addEventListener('click', openCamera);
        els.captureCameraBtn?.addEventListener('click', captureSelfie);
        els.retakeCameraBtn?.addEventListener('click', openCamera);
        els.cameraSelect?.addEventListener('change', openCamera);
        els.roomGrid?.addEventListener('click', (event) => {
            const card = event.target.closest('[data-room-id]');
            if (!card) return;
            const roomId = Number(card.dataset.roomId || 0);
            const roomName = String(card.dataset.roomName || '');
            const room = findRoomById(roomId);
            if (room?.has_access) {
                loadRoomDetail(roomId, true);
                return;
            }
            openCodeModal(roomId, roomName);
        });

        // History Filters
        els.historySearch?.addEventListener('input', (e) => {
            state.historySearch = e.target.value;
            renderHistory(state.originalHistory);
        });

        els.historyFilters?.forEach(btn => {
            btn.addEventListener('click', () => {
                els.historyFilters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.historyFilter = btn.dataset.filter;
                renderHistory(state.originalHistory);
            });
        });

        window.addEventListener('beforeunload', () => {
            stopCamera();
        });

        // PWA Install Logic
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            state.deferredPrompt = e;
            if (els.pwaInstallSection) els.pwaInstallSection.hidden = false;
        });

        els.pwaInstallBtn?.addEventListener('click', async () => {
            if (!state.deferredPrompt) return;
            state.deferredPrompt.prompt();
            const { outcome } = await state.deferredPrompt.userChoice;
            console.log(`[PWA] User response: ${outcome}`);
            state.deferredPrompt = null;
            if (els.pwaInstallSection) els.pwaInstallSection.hidden = true;
        });

        initTabs();
    }

    async function showAttendeesDrawer(eventId, title, meta) {
        if (!eventId || !els.drawerOverlay || !els.drawerContent) return;
        
        // 1. Setup UI Immediately
        els.drawerTitle.textContent = title || 'Daftar Hadir';
        els.drawerMeta.textContent = `Riwayat: ${meta || '--'}`;
        els.drawerContent.innerHTML = `
            <div class="attendance-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Memuat data partisipan...</p>
            </div>
        `;
        
        // 2. Show Overlay
        els.drawerOverlay.hidden = false;
        document.body.style.overflow = 'hidden'; 
        
        try {
            // 3. Fetch Data
            const result = await apiFetch(`/api/attendance?action=exportEvent&event_id=${eventId}`, { method: 'GET' }, state.currentRoomId);
            if (result.status === 'success' && Array.isArray(result.data)) {
                renderAttendeesList(result.data);
            } else {
                throw new Error('Data hadir tidak valid.');
            }
        } catch (error) {
            console.error('[Drawer] Fetch failed:', error);
            els.drawerContent.innerHTML = `
                <div class="attendance-empty-state">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #ef4444; margin-bottom: 12px;"></i>
                    <p>${error.message || 'Gagal memuat daftar hadir.'}</p>
                    <button class="attendance-pill" style="margin-top: 12px; background: #fee2e2; color: #b91c1c; border: none; cursor: pointer;" onclick="location.reload()">Refresh Halaman</button>
                </div>
            `;
        }
    }

    function renderAttendeesList(data) {
        if (!els.drawerContent) return;
        if (!data || !data.length) {
            els.drawerContent.innerHTML = '<div class="attendance-empty-state">Belum ada yang hadir di event ini.</div>';
            return;
        }

        els.drawerContent.innerHTML = `
            <div class="attendee-stats-ribbon">
                <strong>${data.length}</strong> <span>Kader Hadir</span>
            </div>
            <div class="attendee-list-grid">
                ${data.map(item => `
                    <div class="attendee-list-item">
                        <div class="attendee-avatar">
                            ${(item.nama || item.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div class="attendee-info">
                            <div class="attendee-name">${escapeHtml(item.nama || item.username)}</div>
                            <div class="attendee-role">${escapeHtml(item.jabatan || 'Anggota')} • ${escapeHtml(item.bidang || 'Pimpinan')}</div>
                        </div>
                        <div class="attendee-time">
                            ${escapeHtml(item.waktu_absen || '--:--')}
                        </div>
                        <div class="attendee-actions">
                            ${item.foto ? `
                                <button type="button" class="attendee-preview-btn" data-photo-url="${escapeHtml(item.foto)}" data-photo-name="${escapeHtml(item.nama || item.username || 'Kader')}">
                                    <i class="fas fa-image"></i> Preview
                                </button>
                            ` : `
                                <span class="attendee-preview-btn is-disabled">
                                    <i class="fas fa-image"></i> Tidak ada foto
                                </span>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function closeAttendeesDrawer() {
        if (els.drawerOverlay) els.drawerOverlay.hidden = true;
        document.body.style.overflow = '';
    }

    function openPhotoPreview(url, name) {
        if (!url || !els.photoModal || !els.photoImage) return;
        els.photoImage.src = url;
        els.photoImage.alt = `Preview foto absensi ${name || 'kader'}`;
        if (els.photoTitle) els.photoTitle.textContent = name ? `Bukti Kehadiran - ${name}` : 'Bukti Kehadiran';
        els.photoModal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closePhotoPreview() {
        if (els.photoModal) els.photoModal.hidden = true;
        if (els.photoImage) {
            els.photoImage.src = '';
            els.photoImage.alt = 'Preview foto absensi';
        }
        if (!els.drawerOverlay || els.drawerOverlay.hidden) {
            document.body.style.overflow = '';
        }
    }

    function initTabs() {
        if (!els.tabBtns || !els.tabPanels) return;
        
        els.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                if (!targetId) return;

                // CRITICAL FIX: Close any open drawer when switching tabs
                closeAttendeesDrawer();

                // Stop camera if moving away from attendance tab
                if (targetId !== 'tab-attendance') {
                    stopCamera();
                }

                els.tabBtns.forEach(b => b.classList.remove('active'));
                els.tabPanels.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) targetPanel.classList.add('active');
            });
        });
    }

    async function handleExportAction(eventId) {
        if (!eventId) return;
        const room = state.detail?.room;
        if (window.AppLoader) window.AppLoader.show('Menyiapkan laporan...');
        try {
            const result = await apiFetch(`/api/attendance?action=exportEvent&event_id=${eventId}`, { method: 'GET' }, state.currentRoomId);
            if (result.status === 'success' && result.data) {
                const csv = convertToCSV(result.data, result.event);
                const filename = `Absensi_${result.event.pimpinan || 'PCIPM'}_${result.event.title.replace(/\s+/g, '_')}_${result.event.date}.csv`;
                downloadFile(csv, filename, 'text/csv;charset=utf-8;');
                showToast('Laporan berhasil diunduh', 'success');
            }
        } catch (error) {
            showToast('Gagal mengunduh laporan: ' + error.message, 'error');
        } finally {
            if (window.AppLoader) window.AppLoader.hide();
        }
    }

    function convertToCSV(data, eventInfo) {
        if (!data || !data.length) return '';
        const headers = ['No', 'Nama', 'Jabatan', 'Bidang', 'Status Kehadiran', 'Waktu Masuk', 'Sumber Data', 'URL Foto Selfie', 'Catatan'];
        
        const metadata = [
            [`LAPORAN ABSENSI DIGITAL - PC IPM PANAWUAN`],
            [`Pimpinan: ${eventInfo.pimpinan || '-'}`],
            [`Agenda: ${eventInfo.title || '-'}`],
            [`Tanggal: ${eventInfo.date || '-'}`],
            [''],
            headers
        ];

        const rows = data.map((item, index) => [
            index + 1,
            item.nama,
            item.jabatan,
            item.bidang,
            item.status,
            item.waktu_absen,
            item.sumber,
            item.foto,
            item.catatan || '-'
        ]);

        return metadata.concat(rows).map(row => 
            row.map(cell => {
                const text = String(cell || '').replace(/"/g, '""');
                return `"${text}"`;
            }).join(',')
        ).join('\r\n');
    }

    function downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    async function init() {
        if (!requireLogin()) return;
        bindElements();
        bindEvents();
        setPageMode('room-picker');
        state.accessMap = loadRoomAccessMap();
        updateUserChip();
        const valid = await validateSession();
        if (!valid) return;
        const roomFromUrl = Number(new URLSearchParams(window.location.search).get('room_id') || 0);
        await loadRooms(roomFromUrl || 0);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
