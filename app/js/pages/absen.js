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
        pendingRoomId: 0,
        selfieFile: null,
        pollingInterval: null
    };

    const els = {};

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
        el.style.color = type === 'error' ? '#b42318' : (type === 'success' ? '#0f7b42' : '#526171');
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
        if (els.roomGrid) {
            els.roomGrid.innerHTML = `
                <div class="attendance-empty-card">
                    <strong>Sesi login diperlukan</strong>
                    <p>${escapeHtml(text)}</p>
                    <a class="attendance-primary-btn" href="/login.html">Login Sekarang</a>
                </div>
            `;
        }
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

    function openCodeModal(roomId, roomName) {
        state.pendingRoomId = Number(roomId) || 0;
        if (els.codeModal) {
            els.codeModal.dataset.roomId = String(state.pendingRoomId || '');
            els.codeModal.dataset.roomName = String(roomName || '');
        }
        setText('attendance-code-modal-title', `Masukkan kode room ${roomName || ''}`.trim());
        if (els.codeModal) els.codeModal.hidden = false;
        if (els.codeInput) {
            els.codeInput.value = '';
            els.codeInput.focus();
        }
        setInlineStatus(els.codeStatus, '');
    }

    function closeCodeModal() {
        state.pendingRoomId = 0;
        if (els.codeModal) {
            els.codeModal.hidden = true;
            delete els.codeModal.dataset.roomId;
            delete els.codeModal.dataset.roomName;
        }
        setInlineStatus(els.codeStatus, '');
    }

    function renderRooms() {
        if (!els.roomGrid) return;
        if (!state.rooms.length) {
            els.roomGrid.innerHTML = '<div class="attendance-empty-card">Belum ada room absensi yang siap dipakai.</div>';
            return;
        }

        els.roomGrid.innerHTML = state.rooms.map((room) => {
            const selected = Number(room.id) === Number(state.currentRoomId);
            const accessLabel = room.has_access ? 'Sudah dibuka' : 'Masuk pakai kode';
            const eventLabel = room.today_event ? `${escapeHtml(room.today_event.title)} sedang aktif` : 'Belum ada event aktif hari ini';
            const isEligible = String(state.user?.pimpinan || '').trim() === String(room.pimpinan || '').trim();

            return `
                <button type="button" class="attendance-room-card ${selected ? 'is-selected' : ''}" data-room-id="${room.id}" data-room-name="${escapeHtml(room.pimpinan)}">
                    <div class="attendance-room-head">
                        <div>
                            <span class="attendance-room-label">Room</span>
                            <h3 class="attendance-room-name">${escapeHtml(room.pimpinan)}</h3>
                        </div>
                        <span class="attendance-pill ${room.today_event ? 'is-alert' : ''}">
                            <i class="fas ${room.today_event ? 'fa-calendar-check' : 'fa-lock'}"></i> ${accessLabel}
                        </span>
                    </div>
                    <div class="attendance-room-meta">
                        <span><i class="fas fa-users-viewfinder"></i> ${escapeHtml(eventLabel)}</span>
                        <span><i class="fas fa-user-check"></i> ${isEligible ? 'Kamu bisa self check-in di room ini.' : 'Kamu bisa masuk room, tapi self check-in terkunci.'}</span>
                    </div>
                    <div class="attendance-room-actions">
                        <span class="attendance-secondary-btn">${room.has_access ? 'Buka Room' : 'Masukkan Kode'}</span>
                    </div>
                </button>
            `;
        }).join('');
    }

    function renderSummary(summary) {
        setText('attendance-summary-total', String(summary?.total_events || 0));
        setText('attendance-summary-hadir', String(summary?.hadir_count || 0));
        setText('attendance-summary-percent', `${summary?.attendance_percent || 0}%`);
        setText('attendance-summary-status', String(summary?.activity_status || 'pasif').toUpperCase());
    }

    function renderAccessStrip() {
        if (!els.accessStrip || !state.detail?.room) return;
        const detail = state.detail;
        const currentEvent = detail.current_event;
        const canSelfCheckIn = !!detail.permissions?.can_self_check_in;
        const memberCount = Number(detail.room.member_count || 0);

        els.accessStrip.innerHTML = `
            <article class="attendance-access-card">
                <span class="attendance-room-label">Akses Room</span>
                <strong>${escapeHtml(detail.room.pimpinan)}</strong>
                <p>Kode room sudah diverifikasi untuk sesi login ini. Kamu bisa masuk lagi tanpa mengetik ulang selama sesi masih aktif.</p>
            </article>
            <article class="attendance-access-card ${canSelfCheckIn ? '' : 'is-warning'}">
                <span class="attendance-room-label">Status Kehadiran</span>
                <strong>${canSelfCheckIn ? 'Boleh Self Check-in' : 'Perlu Admin Manual'}</strong>
                <p>${canSelfCheckIn ? 'Pimpinan akunmu cocok dengan room ini, jadi absensi mandiri dengan selfie bisa dipakai.' : 'Kamu tetap bisa membuka room, tapi absensi mandiri terkunci karena pimpinan akunmu berbeda.'}</p>
            </article>
            <article class="attendance-access-card ${currentEvent ? '' : 'is-muted'}">
                <span class="attendance-room-label">Kondisi Room</span>
                <strong>${currentEvent ? 'Rapat Sedang Berjalan' : 'Menunggu Event Baru'}</strong>
                <p>${currentEvent ? `${Number(currentEvent.attendees_count || 0)} anggota sudah tercatat hadir dari sekitar ${memberCount} anggota room.` : `Room ini terhubung dengan sekitar ${memberCount} anggota pimpinan.`}</p>
            </article>
        `;
    }

    function renderHistory(items) {
        if (!els.historyList) return;
        if (!Array.isArray(items) || !items.length) {
            els.historyList.innerHTML = '<div class="attendance-empty-state">Belum ada riwayat event untuk room ini.</div>';
            return;
        }

        els.historyList.innerHTML = items.map((item) => `
            <article class="attendance-history-item">
                <h4 class="attendance-history-title">${escapeHtml(item.title)}</h4>
                <div class="attendance-history-meta">
                    <span><i class="fas fa-calendar-day"></i> ${escapeHtml(String(item.event_date || '').slice(0, 10))}</span>
                    <span><i class="fas fa-user-check"></i> ${Number(item.hadir_count || 0)} hadir</span>
                    <span><i class="fas fa-file-signature"></i> ${Number(item.submitted_count || 0)} data masuk</span>
                </div>
                <p>${escapeHtml(item.status === 'closed' ? 'Event sudah ditutup dan masuk histori evaluasi.' : 'Event ini masih aktif hari ini.')}</p>
            </article>
        `).join('');
    }

    function renderCreateFormState(currentEvent) {
        if (!els.createForm) return;
        const disabled = !!currentEvent;
        els.createForm.classList.toggle('is-disabled', disabled);
        if (els.createBtn) {
            els.createBtn.disabled = disabled;
            els.createBtn.innerHTML = disabled
                ? '<i class="fas fa-lock"></i> Event Hari Ini Sudah Aktif'
                : '<i class="fas fa-plus"></i> Buat Event Hari Ini';
        }
        setInlineStatus(
            els.createStatus,
            disabled
                ? 'Event aktif sudah ada. Tunggu event ini ditutup dulu sebelum membuat event baru.'
                : 'Kalau rapat belum dibuka hari ini, kamu bisa membuat event baru dari form ini.'
        );
    }

    function renderCurrentEvent() {
        const detail = state.detail;
        const currentEvent = detail?.current_event;
        const canSelfCheckIn = !!detail?.permissions?.can_self_check_in;
        if (!els.currentEventBox) return;

        if (!currentEvent) {
            els.currentEventBox.innerHTML = '<div class="attendance-empty-state">Belum ada event aktif untuk room ini hari ini.</div>';
            setText('attendance-event-badge', 'Menunggu');
            if (els.checkinForm) els.checkinForm.hidden = true;
            renderCreateFormState(null);
            setInlineStatus(
                els.checkinStatus,
                canSelfCheckIn
                    ? 'Buat atau tunggu event aktif lebih dulu sebelum check-in.'
                    : 'Kamu bisa masuk room ini, tapi absensi mandiri hanya untuk anggota pimpinan yang sama.'
            );
            return;
        }

        const myRecord = currentEvent.my_record;
        const creator = currentEvent.created_by_name || currentEvent.created_by_username || 'User room';
        const attendeesCount = Number(currentEvent.attendees_count || 0);
        const recentAttendees = Array.isArray(currentEvent.recent_attendees) ? currentEvent.recent_attendees : [];
        setText('attendance-event-badge', 'Aktif Hari Ini');

        els.currentEventBox.innerHTML = `
            <article class="attendance-event-card">
                <h4 class="attendance-event-title">${escapeHtml(currentEvent.title)}</h4>
                <div class="attendance-event-meta">
                    <span><i class="fas fa-calendar-day"></i> ${escapeHtml(String(currentEvent.event_date || '').slice(0, 10))}</span>
                    <span><i class="fas fa-user-pen"></i> Dibuat oleh ${escapeHtml(creator)}</span>
                    <span><i class="fas fa-signal"></i> Status ${escapeHtml(currentEvent.status || 'active')}</span>
                </div>
                <div class="attendance-event-stats">
                    <div class="attendance-event-stat">
                        <strong>${attendeesCount}</strong>
                        <span>Sudah hadir</span>
                    </div>
                    <div class="attendance-event-stat">
                        <strong>${Number(detail.room?.member_count || 0)}</strong>
                        <span>Anggota room</span>
                    </div>
                    <div class="attendance-event-stat">
                        <strong>${myRecord ? 'Sudah' : 'Belum'}</strong>
                        <span>Status absensimu</span>
                    </div>
                </div>
                <p>${escapeHtml(currentEvent.description || 'Event rapat aktif untuk room ini. Gunakan panel di bawah untuk check-in dengan selfie.')}</p>
                ${myRecord ? `
                    <div class="attendance-pill">
                        <i class="fas fa-check-circle"></i> Kamu sudah tercatat: ${escapeHtml(myRecord.attendance_status)}
                    </div>
                ` : ''}
                <div class="attendance-roster">
                    ${recentAttendees.length ? recentAttendees.map((item) => `
                        <div class="attendance-roster-item">
                            <div>
                                <strong>${escapeHtml(item.nama_panjang || item.username)}</strong>
                                <span>@${escapeHtml(item.username || '')}</span>
                            </div>
                            <span>${escapeHtml(item.check_in_at ? new Date(item.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-')}</span>
                        </div>
                    `).join('') : '<div class="attendance-empty-state">Belum ada peserta yang check-in pada event ini.</div>'}
                </div>
            </article>
        `;

        renderCreateFormState(currentEvent);

        if (els.checkinForm) {
            els.checkinForm.hidden = !canSelfCheckIn || !!myRecord;
        }
        if (!canSelfCheckIn) {
            setInlineStatus(els.checkinStatus, 'Self check-in dinonaktifkan karena pimpinan akunmu berbeda dengan room ini.', 'error');
        } else if (myRecord) {
            setInlineStatus(els.checkinStatus, `Absensi kamu sudah masuk dengan status ${myRecord.attendance_status}.`, 'success');
        } else {
            setInlineStatus(els.checkinStatus, 'Ambil selfie terbaru lalu kirim kehadiran sekarang.');
        }
    }

    function renderDetail() {
        const detail = state.detail;
        if (!detail || !detail.room) {
            if (els.roomPanel) els.roomPanel.hidden = true;
            return;
        }

        if (els.roomPanel) els.roomPanel.hidden = false;
        setText('attendance-room-label', `Room ${detail.room.pimpinan}`);
        setText('attendance-room-title', detail.room.pimpinan);
        setText(
            'attendance-room-subtitle',
            detail.permissions?.can_self_check_in
                ? 'Kamu bisa membuat event dan check-in mandiri di room ini.'
                : 'Kamu bisa membuka room dan membuat event, tetapi absensi mandiri hanya untuk anggota pimpinan yang sama.'
        );

        renderAccessStrip();
        renderSummary(detail.my_summary || {});
        renderCurrentEvent();
        renderHistory(detail.history || []);
        startLivePolling(detail.room.id);
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
        try {
            const data = await apiFetch('/api/attendance?action=rooms');
            state.user = data.user || state.user || null;
            state.rooms = Array.isArray(data.rooms) ? data.rooms : [];
            updateUserChip();
            renderRooms();

            const targetRoomId = Number(preferredRoomId || state.currentRoomId || state.rooms.find((room) => room.has_access)?.id || 0);
            if (targetRoomId) {
                await loadRoomDetail(targetRoomId, false);
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
        } finally {
            if (els.refreshBtn) els.refreshBtn.disabled = false;
        }
    }

    async function loadRoomDetail(roomId, openCodeWhenNeeded) {
        const room = state.rooms.find((item) => Number(item.id) === Number(roomId));
        if (!room) return;

        try {
            const data = await apiFetch(`/api/attendance?action=roomDetail&room_id=${encodeURIComponent(roomId)}`, { method: 'GET' }, roomId);
            state.currentRoomId = Number(roomId);
            state.detail = data;
            renderRooms();
            renderDetail();
        } catch (error) {
            if (error.status === 403) {
                setRoomAccess(roomId, '');
                state.currentRoomId = 0;
                state.detail = null;
                renderRooms();
                renderDetail();
                if (openCodeWhenNeeded !== false) openCodeModal(roomId, room.pimpinan);
                return;
            }
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
        try {
            await apiFetch('/api/attendance?action=createEvent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: roomId, title, description })
            }, roomId);
            if (els.createForm) els.createForm.reset();
            showToast('Event rapat berhasil dibuat', 'success');
            await loadRooms(roomId);
        } catch (error) {
            if (error.status === 401) {
                clearStoredSession();
                renderAuthRequired('Sesi login kamu habis saat membuat event rapat.');
                showToast('Login ulang dulu untuk membuat event.', 'error');
                return;
            }
            setInlineStatus(els.createStatus, error.message || 'Gagal membuat event.', 'error');
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
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        els.selfieImage.src = objectUrl;
        els.selfiePreview.hidden = false;
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
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.status === 'error' || !data.url) {
            throw new Error(data.message || 'Gagal mengunggah selfie.');
        }
        return data.url;
    }

    async function handleCheckIn(event) {
        event.preventDefault();
        const currentEvent = state.detail?.current_event;
        if (!currentEvent) {
            setInlineStatus(els.checkinStatus, 'Belum ada event aktif untuk dihadiri.', 'error');
            return;
        }
        if (!state.selfieFile) {
            setInlineStatus(els.checkinStatus, 'Selfie wajib diambil sebelum kirim absensi.', 'error');
            return;
        }

        if (els.checkinBtn) els.checkinBtn.disabled = true;
        setInlineStatus(els.checkinStatus, 'Mengunggah selfie dan menyimpan absensi...');
        try {
            const photoUrl = await uploadSelfie(state.selfieFile);
            await apiFetch('/api/attendance?action=checkIn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: currentEvent.id,
                    photo_url: photoUrl
                })
            }, Number(state.currentRoomId));
            if (els.checkinForm) els.checkinForm.reset();
            updateSelfiePreview(null);
            showToast('Absensi berhasil direkam', 'success');
            await loadRooms(state.currentRoomId);
        } catch (error) {
            if (error.status === 401) {
                clearStoredSession();
                renderAuthRequired('Sesi login kamu habis saat mengirim absensi.');
                showToast('Login ulang dulu untuk mengirim absensi.', 'error');
                return;
            }
            setInlineStatus(els.checkinStatus, error.message || 'Gagal mengirim absensi.', 'error');
        } finally {
            if (els.checkinBtn) els.checkinBtn.disabled = false;
        }
    }

    function bindElements() {
        els.roomGrid = document.getElementById('attendance-room-grid');
        els.roomPanel = document.getElementById('attendance-room-panel');
        els.accessStrip = document.getElementById('attendance-access-strip');
        els.currentEventBox = document.getElementById('attendance-current-event');
        els.historyList = document.getElementById('attendance-history-list');
        els.refreshBtn = document.getElementById('attendance-refresh-btn');
        els.changeRoomBtn = document.getElementById('attendance-change-room-btn');
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
        els.selfieInput = document.getElementById('attendance-selfie-input');
        els.selfiePreview = document.getElementById('attendance-selfie-preview');
        els.selfieImage = document.getElementById('attendance-selfie-image');
    }

    function bindEvents() {
        els.refreshBtn?.addEventListener('click', () => loadRooms(state.currentRoomId));
        els.changeRoomBtn?.addEventListener('click', () => {
            const room = state.rooms.find((item) => Number(item.id) === Number(state.currentRoomId));
            if (!room) return;
            setRoomAccess(room.id, '');
            renderRooms();
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
        els.selfieInput?.addEventListener('change', () => {
            const file = els.selfieInput?.files?.[0] || null;
            updateSelfiePreview(file);
        });
        els.roomGrid?.addEventListener('click', (event) => {
            const card = event.target.closest('[data-room-id]');
            if (!card) return;
            const roomId = Number(card.dataset.roomId || 0);
            const roomName = String(card.dataset.roomName || '');
            const room = state.rooms.find((item) => Number(item.id) === roomId);
            if (room?.has_access || state.accessMap[String(roomId)]) {
                loadRoomDetail(roomId, true);
                return;
            }
            openCodeModal(roomId, roomName);
        });
    }

    async function init() {
        if (!requireLogin()) return;
        bindElements();
        bindEvents();
        state.accessMap = loadRoomAccessMap();
        updateUserChip();
        const valid = await validateSession();
        if (!valid) return;
        await loadRooms();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
