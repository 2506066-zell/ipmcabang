export function initAttendance(appState, api) {
    const root = document.getElementById('attendance-admin-root');
    if (!root) return;

    const state = {
        overview: [],
        selectedRoomId: 0,
        selectedRoomData: null,
        selectedEventId: 0,
        eventDetail: null,
        loading: false
    };

    function escapeHtml(value) {
        return api.escapeHtml ? api.escapeHtml(value) : String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setLoading(flag, message) {
        state.loading = !!flag;
        if (flag) api.showLoader?.(message || 'Memuat data absensi...');
        else api.hideLoader?.();
    }

    function currentRoom() {
        return state.overview.find((item) => Number(item.id) === Number(state.selectedRoomId)) || null;
    }

    function roomEvents() {
        return Array.isArray(state.selectedRoomData?.events) ? state.selectedRoomData.events : [];
    }

    function roomRecapUsers() {
        return Array.isArray(state.selectedRoomData?.recap?.users) ? state.selectedRoomData.recap.users : [];
    }

    function renderShell() {
        root.innerHTML = `
            <section class="card section-card attendance-admin-shell">
                <div class="subsection-heading-row">
                    <div>
                        <h3 class="section-card-title">Kontrol Room Absensi</h3>
                        <p class="section-support-text">Atur kode room, pantau event aktif per pimpinan, dan tindak lanjuti data absensi manual dari satu panel.</p>
                    </div>
                    <button type="button" class="btn btn-secondary" id="attendance-admin-refresh-btn">
                        <i class="fas fa-rotate"></i> Muat Ulang
                    </button>
                </div>
                <div class="attendance-admin-kpi-grid mt-16" id="attendance-admin-kpi-grid"></div>
            </section>

            <div class="attendance-admin-layout mt-20">
                <section class="card section-card attendance-admin-room-panel">
                    <div class="subsection-heading-row">
                        <div>
                            <h3 class="section-card-title">Room & Kode Akses</h3>
                            <p class="section-support-text">Room mengikuti data pimpinan yang aktif. Kode bisa diubah kapan saja dari sini.</p>
                        </div>
                    </div>
                    <div id="attendance-admin-room-grid" class="attendance-admin-room-grid mt-16"></div>
                </section>

                <section class="card section-card attendance-admin-events-panel">
                    <div class="subsection-heading-row">
                        <div>
                            <h3 class="section-card-title">Event & Rekap Room</h3>
                            <p class="section-support-text" id="attendance-admin-room-meta">Pilih room untuk melihat event, status aktif, dan ringkasan kader.</p>
                        </div>
                    </div>
                    <div id="attendance-admin-events-list" class="attendance-admin-events-list mt-16"></div>
                    <div id="attendance-admin-recap-list" class="attendance-admin-recap-list mt-16"></div>
                </section>

                <section class="card section-card attendance-admin-detail-panel">
                    <div class="subsection-heading-row">
                        <div>
                            <h3 class="section-card-title">Detail Event & Manual Input</h3>
                            <p class="section-support-text">Admin bisa mengisi atau mengoreksi status hadir, izin, sakit, atau alfa untuk tiap kader.</p>
                        </div>
                    </div>
                    <div id="attendance-admin-event-detail" class="attendance-admin-event-detail mt-16"></div>
                </section>
            </div>
        `;
    }

    function renderKpis() {
        const wrap = document.getElementById('attendance-admin-kpi-grid');
        if (!wrap) return;
        const rooms = state.overview || [];
        const activeRooms = rooms.filter((item) => item.active_event).length;
        const activeMembers = rooms.reduce((sum, item) => sum + Number(item.recap?.active_members || 0), 0);
        const passiveMembers = rooms.reduce((sum, item) => sum + Number(item.recap?.passive_members || 0), 0);

        wrap.innerHTML = `
            <article class="mini-summary-card">
                <div class="mini-summary-label">Total Room</div>
                <div class="mini-summary-value">${rooms.length}</div>
                <div class="mini-summary-meta">Sesuai data pimpinan aktif</div>
            </article>
            <article class="mini-summary-card">
                <div class="mini-summary-label">Event Aktif</div>
                <div class="mini-summary-value">${activeRooms}</div>
                <div class="mini-summary-meta">Room yang sedang punya rapat hari ini</div>
            </article>
            <article class="mini-summary-card">
                <div class="mini-summary-label">Kader Aktif</div>
                <div class="mini-summary-value">${activeMembers}</div>
                <div class="mini-summary-meta">Persentase hadir minimal 75%</div>
            </article>
            <article class="mini-summary-card">
                <div class="mini-summary-label">Kader Pasif</div>
                <div class="mini-summary-value">${passiveMembers}</div>
                <div class="mini-summary-meta">Perlu follow up kehadiran</div>
            </article>
        `;
    }

    function renderRooms() {
        const wrap = document.getElementById('attendance-admin-room-grid');
        if (!wrap) return;
        if (!state.overview.length) {
            wrap.innerHTML = '<div class="small muted">Belum ada room absensi yang terdaftar.</div>';
            return;
        }

        wrap.innerHTML = state.overview.map((room) => {
            const selected = Number(room.id) === Number(state.selectedRoomId);
            const isActive = !!room.active_event;
            return `
                <article class="attendance-admin-room-card ${selected ? 'is-selected' : ''}">
                    <div class="attendance-admin-room-head">
                        <div>
                            <div class="status-badge ${isActive ? 'status-warning' : 'status-muted'}">${isActive ? 'Event Aktif' : 'Standby'}</div>
                            <h4>${escapeHtml(room.pimpinan)}</h4>
                            <p>${isActive ? escapeHtml(room.active_event.title || 'Rapat aktif hari ini') : 'Belum ada rapat aktif hari ini.'}</p>
                        </div>
                        <button type="button" class="btn btn-secondary btn-sm attendance-room-open-btn" data-room-id="${room.id}">
                            <i class="fas fa-eye"></i> Buka
                        </button>
                    </div>
                    <div class="attendance-admin-room-stats">
                        <span><i class="fas fa-user-check"></i> ${Number(room.recap?.active_members || 0)} aktif</span>
                        <span><i class="fas fa-user-clock"></i> ${Number(room.recap?.passive_members || 0)} pasif</span>
                    </div>
                    <form class="attendance-room-code-form" data-room-id="${room.id}">
                        <label class="small muted">Kode room</label>
                        <div class="toolbar-row">
                            <input type="text" class="toolbar-input attendance-room-code-input" name="room_code" value="${escapeHtml(room.room_code || '')}" required>
                            <button type="submit" class="btn btn-primary btn-sm">
                                <i class="fas fa-save"></i> Simpan
                            </button>
                        </div>
                    </form>
                </article>
            `;
        }).join('');
    }

    function renderRoomEventsAndRecap() {
        const meta = document.getElementById('attendance-admin-room-meta');
        const eventsWrap = document.getElementById('attendance-admin-events-list');
        const recapWrap = document.getElementById('attendance-admin-recap-list');
        const room = currentRoom();

        if (!room || !eventsWrap || !recapWrap) {
            if (eventsWrap) eventsWrap.innerHTML = '<div class="small muted">Pilih room untuk melihat daftar event.</div>';
            if (recapWrap) recapWrap.innerHTML = '';
            if (meta) meta.textContent = 'Pilih room untuk melihat event, status aktif, dan ringkasan kader.';
            return;
        }

        const events = roomEvents();
        if (meta) {
            meta.textContent = `${room.pimpinan} • ${events.length} event tercatat • ${Number(state.selectedRoomData?.recap?.total_members || 0)} kader`;
        }

        if (!events.length) {
            eventsWrap.innerHTML = '<div class="small muted">Belum ada event untuk room ini.</div>';
        } else {
            eventsWrap.innerHTML = events.map((event) => {
                const selected = Number(event.id) === Number(state.selectedEventId);
                const active = String(event.status || '').toLowerCase() === 'active';
                return `
                    <article class="attendance-admin-event-card ${selected ? 'is-selected' : ''}">
                        <div class="attendance-admin-event-head">
                            <div>
                                <div class="status-badge ${active ? 'status-warning' : 'status-muted'}">${active ? 'Active' : 'Closed'}</div>
                                <h4>${escapeHtml(event.title)}</h4>
                                <p>${escapeHtml(String(event.event_date || '').slice(0, 10))} • ${Number(event.hadir_count || 0)} hadir • ${Number(event.submitted_count || 0)} data masuk</p>
                            </div>
                            <div class="attendance-admin-event-actions">
                                <button type="button" class="btn btn-secondary btn-sm attendance-event-open-btn" data-event-id="${event.id}">
                                    <i class="fas fa-list"></i> Detail
                                </button>
                                ${active ? `
                                    <button type="button" class="btn btn-danger btn-sm attendance-event-close-btn" data-event-id="${event.id}">
                                        <i class="fas fa-ban"></i> Tutup
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </article>
                `;
            }).join('');
        }

        const users = roomRecapUsers();
        recapWrap.innerHTML = `
            <div class="attendance-admin-recap-head">
                <h4>Rekap Keaktifan Kader</h4>
                <span class="small muted">Status aktif jika hadir minimal 75%</span>
            </div>
            <div class="attendance-admin-recap-table">
                ${users.length ? users.map((user) => `
                    <div class="attendance-admin-recap-row">
                        <div>
                            <strong>${escapeHtml(user.nama_panjang || user.username)}</strong>
                            <div class="small muted">@${escapeHtml(user.username)}</div>
                        </div>
                        <div class="small muted">${Number(user.summary?.hadir_count || 0)}/${Number(user.summary?.total_events || 0)} hadir</div>
                        <div class="status-badge ${String(user.summary?.activity_status || '') === 'aktif' ? 'status-success' : 'status-warning'}">
                            ${escapeHtml(String(user.summary?.activity_status || 'pasif').toUpperCase())} • ${Number(user.summary?.attendance_percent || 0)}%
                        </div>
                    </div>
                `).join('') : '<div class="small muted">Belum ada data kader untuk room ini.</div>'}
            </div>
        `;
    }

    function renderEventDetail() {
        const wrap = document.getElementById('attendance-admin-event-detail');
        if (!wrap) return;
        const detail = state.eventDetail;
        if (!detail || !detail.event) {
            wrap.innerHTML = '<div class="small muted">Pilih event untuk melihat daftar peserta dan melakukan input manual.</div>';
            return;
        }

        wrap.innerHTML = `
            <div class="attendance-admin-event-summary">
                <div class="attendance-admin-event-summary-card">
                    <span class="small muted">Event</span>
                    <strong>${escapeHtml(detail.event.title)}</strong>
                    <p class="small muted">${escapeHtml(String(detail.event.event_date || '').slice(0, 10))} • ${escapeHtml(detail.event.status || 'active')}</p>
                    <button class="btn btn-secondary btn-sm mt-8" id="attendance-export-csv-btn" data-event-id="${detail.event.id}"><i class="fas fa-file-csv"></i> Unduh CSV Laporan</button>
                </div>
                <div class="attendance-admin-event-summary-card">
                    <span class="small muted">Distribusi Status</span>
                    <p class="small muted">Hadir ${Number(detail.summary?.hadir || 0)} • Izin ${Number(detail.summary?.izin || 0)} • Sakit ${Number(detail.summary?.sakit || 0)} • Alfa ${Number(detail.summary?.alfa || 0)}</p>
                </div>
            </div>
            <div class="attendance-admin-participant-list">
                ${(detail.participants || []).map((item) => `
                    <article class="attendance-admin-participant-card">
                        <div class="attendance-admin-participant-main">
                            <div>
                                <h4>${escapeHtml(item.nama_panjang || item.username)}</h4>
                                <p class="small muted">@${escapeHtml(item.username)} • ${escapeHtml(item.source || 'belum absen')}</p>
                                <div class="attendance-admin-participant-meta">
                                    <span class="status-badge ${String(item.attendance_status || '') === 'hadir' ? 'status-success' : 'status-muted'}">
                                        ${escapeHtml(String(item.attendance_status || 'belum').toUpperCase())}
                                    </span>
                                    ${item.photo_url ? `<a href="${escapeHtml(item.photo_url)}" target="_blank" rel="noopener noreferrer" class="small">Lihat Foto</a>` : '<span class="small muted">Tanpa foto</span>'}
                                </div>
                            </div>
                        </div>
                        <form class="attendance-admin-manual-form" data-user-id="${item.id}" data-event-id="${detail.event.id}">
                            <div class="toolbar-row">
                                <select name="attendance_status" class="toolbar-select">
                                    <option value="hadir" ${item.attendance_status === 'hadir' ? 'selected' : ''}>Hadir</option>
                                    <option value="izin" ${item.attendance_status === 'izin' ? 'selected' : ''}>Izin</option>
                                    <option value="sakit" ${item.attendance_status === 'sakit' ? 'selected' : ''}>Sakit</option>
                                    <option value="alfa" ${item.attendance_status === 'alfa' || item.attendance_status === 'belum' ? 'selected' : ''}>Alfa</option>
                                </select>
                                <input type="url" name="photo_url" class="toolbar-input" placeholder="URL foto opsional" value="${escapeHtml(item.photo_url || '')}">
                            </div>
                            <div class="toolbar-row mt-12">
                                <input type="text" name="note" class="toolbar-input" placeholder="Catatan admin" value="${escapeHtml(item.note || '')}">
                                <button type="submit" class="btn btn-primary btn-sm">
                                    <i class="fas fa-floppy-disk"></i> Simpan
                                </button>
                            </div>
                        </form>
                    </article>
                `).join('')}
            </div>
        `;
    }

    async function loadOverview(preferredRoomId) {
        setLoading(true, 'Memuat ringkasan room absensi...');
        try {
            const data = await api.apiAdminVercel('GET', '/api/attendance?action=adminOverview');
            state.overview = Array.isArray(data.rooms) ? data.rooms : [];
            if (!state.selectedRoomId || !state.overview.some((item) => Number(item.id) === Number(state.selectedRoomId))) {
                state.selectedRoomId = Number(preferredRoomId || state.overview[0]?.id || 0);
            }
            renderKpis();
            renderRooms();
            await loadRoom(state.selectedRoomId, state.selectedEventId);
        } catch (error) {
            root.innerHTML = `<div class="card section-card"><div class="small" style="color:#b42318;">Gagal memuat room absensi: ${escapeHtml(error.message || 'error')}</div></div>`;
        } finally {
            setLoading(false);
        }
    }

    async function loadRoom(roomId, preferredEventId) {
        if (!roomId) {
            state.selectedRoomData = null;
            state.eventDetail = null;
            renderRoomEventsAndRecap();
            renderEventDetail();
            return;
        }
        setLoading(true, 'Memuat event room...');
        try {
            const data = await api.apiAdminVercel('GET', `/api/attendance?action=adminRoomEvents&room_id=${encodeURIComponent(roomId)}`);
            state.selectedRoomId = Number(roomId);
            state.selectedRoomData = data;
            const events = roomEvents();
            state.selectedEventId = Number(preferredEventId || events[0]?.id || 0);
            renderRooms();
            renderRoomEventsAndRecap();
            if (state.selectedEventId) {
                await loadEventDetail(state.selectedEventId);
            } else {
                state.eventDetail = null;
                renderEventDetail();
            }
        } catch (error) {
            api.setStatus?.(`Gagal memuat room: ${error.message || 'error'}`, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function loadEventDetail(eventId) {
        if (!eventId) {
            state.eventDetail = null;
            renderEventDetail();
            return;
        }
        setLoading(true, 'Memuat detail event...');
        try {
            const data = await api.apiAdminVercel('GET', `/api/attendance?action=adminEventDetail&event_id=${encodeURIComponent(eventId)}`);
            state.selectedEventId = Number(eventId);
            state.eventDetail = data;
            renderRoomEventsAndRecap();
            renderEventDetail();
        } catch (error) {
            api.setStatus?.(`Gagal memuat detail event: ${error.message || 'error'}`, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function updateRoomCode(form) {
        const roomId = Number(form.dataset.roomId || 0);
        const roomCode = String(new FormData(form).get('room_code') || '').trim();
        if (!roomId || !roomCode) return;
        setLoading(true, 'Menyimpan kode room...');
        try {
            await api.apiAdminVercel('POST', '/api/attendance?action=updateRoomCode', {
                room_id: roomId,
                room_code: roomCode
            });
            api.setStatus?.('Kode room berhasil diperbarui', 'success');
            await loadOverview(roomId);
        } catch (error) {
            api.setStatus?.(`Gagal memperbarui kode room: ${error.message || 'error'}`, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function closeEvent(eventId) {
        if (!eventId) return;
        if (!confirm('Tutup event ini? Event yang ditutup akan masuk histori dan kader yang belum tercatat akan dihitung alfa.')) return;
        setLoading(true, 'Menutup event...');
        try {
            await api.apiAdminVercel('POST', '/api/attendance?action=closeEvent', { event_id: eventId });
            api.setStatus?.('Event berhasil ditutup', 'success');
            await loadOverview(state.selectedRoomId);
        } catch (error) {
            api.setStatus?.(`Gagal menutup event: ${error.message || 'error'}`, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function submitManual(form) {
        const fd = new FormData(form);
        const eventId = Number(form.dataset.eventId || 0);
        const userId = Number(form.dataset.userId || 0);
        if (!eventId || !userId) return;
        setLoading(true, 'Menyimpan status absensi...');
        try {
            await api.apiAdminVercel('POST', '/api/attendance?action=manualRecord', {
                event_id: eventId,
                user_id: userId,
                attendance_status: String(fd.get('attendance_status') || '').trim(),
                photo_url: String(fd.get('photo_url') || '').trim(),
                note: String(fd.get('note') || '').trim()
            });
            api.setStatus?.('Status absensi berhasil diperbarui', 'success');
            await loadRoom(state.selectedRoomId, eventId);
        } catch (error) {
            api.setStatus?.(`Gagal menyimpan absensi manual: ${error.message || 'error'}`, 'error');
        } finally {
            setLoading(false);
        }
    }

    root.addEventListener('click', (event) => {
        const roomBtn = event.target.closest('.attendance-room-open-btn');
        if (roomBtn) {
            loadRoom(Number(roomBtn.dataset.roomId || 0));
            return;
        }
        const eventBtn = event.target.closest('.attendance-event-open-btn');
        if (eventBtn) {
            loadEventDetail(Number(eventBtn.dataset.eventId || 0));
            return;
        }
        const closeBtn = event.target.closest('.attendance-event-close-btn');
        if (closeBtn) {
            closeEvent(Number(closeBtn.dataset.eventId || 0));
            return;
        }
        const refreshBtn = event.target.closest('#attendance-admin-refresh-btn');
        if (refreshBtn) {
            loadOverview(state.selectedRoomId);
            return;
        }
        const exportBtn = event.target.closest('#attendance-export-csv-btn');
        if (exportBtn) {
            exportToCSV();
            return;
        }
    });

    root.addEventListener('submit', (event) => {
        const roomForm = event.target.closest('.attendance-room-code-form');
        if (roomForm) {
            event.preventDefault();
            updateRoomCode(roomForm);
            return;
        }
        const manualForm = event.target.closest('.attendance-admin-manual-form');
        if (manualForm) {
            event.preventDefault();
            submitManual(manualForm);
        }
    });

    function exportToCSV() {
        if (!state.eventDetail || !state.eventDetail.participants) return;
        const p = state.eventDetail.participants;
        let csvContent = "Nama Lengkap,Username,Pimpinan,Status Absensi,Waktu Check-in,Sumber,Catatan\n";
        p.forEach(row => {
            const name = `"${String(row.nama_panjang || row.username).replace(/"/g, '""')}"`;
            const username = `"${String(row.username || '').replace(/"/g, '""')}"`;
            const pimpinan = `"${String(row.pimpinan || '').replace(/"/g, '""')}"`;
            const status = `"${String(row.attendance_status || '').toUpperCase()}"`;
            const time = `"${row.check_in_at ? new Date(row.check_in_at).toLocaleString('id-ID') : '-'}"`;
            const source = `"${String(row.source || '').replace(/"/g, '""')}"`;
            const note = `"${String(row.note || '').replace(/"/g, '""')}"`;
            csvContent += [name, username, pimpinan, status, time, source, note].join(",") + "\n";
        });
        
        const blob = new Blob(["\\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const eventTitle = (state.eventDetail.event.title || 'Event').replace(/\\s+/g, '_');
        const eventDate = String(state.eventDetail.event.event_date || '').slice(0, 10);
        link.href = URL.createObjectURL(blob);
        link.download = `Rekap_${eventTitle}_${eventDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    window.__adminAttendanceReload = () => {
        loadOverview(state.selectedRoomId);
    };

    renderShell();
    loadOverview();
}
