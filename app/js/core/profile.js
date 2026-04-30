(() => {
    const USER_SESSION_KEY = 'ipmquiz_user_session';
    const USER_USERNAME_KEY = 'ipmquiz_user_username';
    const USER_FULLNAME_KEY = 'ipmquiz_user_fullname';
    const USER_PIMPINAN_KEY = 'ipmquiz_user_pimpinan';

    let overlayEl = null;

    function getSession() {
        return sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '';
    }

    function getStored(key) {
        return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
    }

    function setStored(key, value, persist) {
        try {
            const storage = persist ? localStorage : sessionStorage;
            storage.setItem(key, value);
        } catch {}
    }

    function clearStored(key) {
        try { sessionStorage.removeItem(key); } catch {}
        try { localStorage.removeItem(key); } catch {}
    }

    function initialsFrom(name) {
        const text = String(name || '').trim();
        if (!text) return 'U';
        const parts = text.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return text.slice(0, 2).toUpperCase();
    }

    function renderProfile(container) {
        container.innerHTML = `
            <div class="profile-shell dropdown">
                <div class="profile-card compact">
                    <button type="button" class="profile-close-btn" id="profile-close-btn" aria-label="Tutup">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="profile-header">
                        <div class="profile-avatar border-dynamic" id="profile-avatar">U</div>
                        <div class="profile-header-text">
                            <h1 class="profile-username" id="profile-username">Pengguna</h1>
                            <div class="profile-subtext" id="profile-subtext">Profil Akun</div>
                        </div>
                    </div>
                    <div class="profile-badges-container" id="profile-badges-container"></div>
                    <div class="profile-info-grid">
                        <div class="profile-info-row">
                            <span class="profile-label">Username</span>
                            <span class="profile-value" id="profile-info-username">-</span>
                        </div>
                        <div class="profile-info-row">
                            <span class="profile-label">Nama Lengkap</span>
                            <span class="profile-value" id="profile-info-fullname">-</span>
                        </div>
                        <div class="profile-info-row">
                            <span class="profile-label">Asal Pimpinan</span>
                            <span class="profile-value" id="profile-info-pimpinan">-</span>
                        </div>
                    </div>
                    <div class="profile-section-header">📊 Aktivitas</div>
                    <div class="profile-activity-list">
                        <div class="profile-activity-row">
                            <span class="profile-label">Status Kuis</span>
                            <span class="profile-value" id="profile-activity-status">Belum menyelesaikan kuis</span>
                        </div>
                        <div class="profile-activity-row">
                            <span class="profile-label">Skor Terakhir</span>
                            <span class="profile-value" id="profile-activity-score">-</span>
                        </div>
                        <div class="profile-activity-row">
                            <span class="profile-label">Total Kuis Diselesaikan</span>
                            <span class="profile-value" id="profile-activity-total">0</span>
                        </div>
                        <div class="profile-activity-row">
                            <span class="profile-label">Ranking Saat Ini</span>
                            <span class="profile-value" id="profile-activity-rank">-</span>
                        </div>
                    </div>
                    <div class="profile-activity-empty" id="profile-activity-empty">Belum ada aktivitas kuis.</div>
                    <div class="profile-section-header profile-notif-header" style="margin-top:12px;">
                        <span>🔔 Notifikasi</span>
                        <button type="button" class="profile-notif-toggle" id="profile-notif-toggle">Lihat</button>
                    </div>
                    <div class="profile-notif-list collapsed" id="profile-notif-list">
                        <div class="profile-notif-empty">Belum ada notifikasi.</div>
                    </div>
                    <div class="profile-section-header">🎫 Kartu Anggota Digital</div>
                    <div class="profile-digital-card-container">
                        <div class="digital-membership-card" id="digital-membership-card">
                            <div class="card-glow"></div>
                            <div class="card-brand">
                                <img src="/ipm%20(2).png" alt="IPM">
                                <span>IKATAN PELAJAR MUHAMMADIYAH</span>
                            </div>
                            <div class="card-body">
                                <div class="card-user-info">
                                    <div class="card-name" id="card-name-val">-</div>
                                    <div class="card-pimpinan" id="card-pimpinan-val">-</div>
                                    <div class="card-role" id="card-role-val">ANGGOTA</div>
                                </div>
                                <div class="card-qr-section">
                                    <div id="card-qr-code" class="card-qr-code"></div>
                                </div>
                            </div>
                            <div class="card-footer">E-CARD PC IPM PANAWUAN</div>
                        </div>
                    </div>

                    <div class="profile-section-header">🛡️ Keamanan & Identitas</div>
                    <div class="profile-biometric-section" id="profile-biometric-section">
                        <div class="biometric-info">
                            <strong>Login Biometrik (Passkey)</strong>
                            <p>Masuk lebih cepat dan aman tanpa password menggunakan sidik jari atau wajah.</p>
                        </div>
                        <button type="button" class="profile-btn secondary" id="profile-biometric-btn">
                            <i class="fas fa-fingerprint"></i> Daftarkan Biometrik
                        </button>
                    </div>

                    <div class="profile-section-header">🔍 Interaksi</div>
                    <div class="profile-interaction-section">
                        <button type="button" class="profile-btn secondary" id="profile-scan-btn">
                            <i class="fas fa-qrcode"></i> Pindai Kartu Anggota
                        </button>
                    </div>

                    <div class="profile-actions compact-actions">
                        <button type="button" class="profile-btn primary" id="profile-logout-btn">Logout</button>
                    </div>
                </div>
            </div>
        `;
    }

    function fillProfile(container, data) {
        const username = data.username || 'Pengguna';
        const nama = data.nama_panjang || 'Pengguna IPM';
        const pimpinan = data.pimpinan || '-';

        const avatar = container.querySelector('#profile-avatar');
        const title = container.querySelector('#profile-username');
        const subtext = container.querySelector('#profile-subtext');
        const infoUser = container.querySelector('#profile-info-username');
        const infoNama = container.querySelector('#profile-info-fullname');
        const infoPimpinan = container.querySelector('#profile-info-pimpinan');

        if (avatar) avatar.textContent = initialsFrom(nama || username);
        if (title) title.textContent = username;
        if (subtext) subtext.textContent = nama;
        if (infoUser) infoUser.textContent = username;
        if (infoNama) infoNama.textContent = nama;
        if (infoPimpinan) infoPimpinan.textContent = pimpinan;
    }

    function fillActivity(container, activity) {
        const statusEl = container.querySelector('#profile-activity-status');
        const scoreEl = container.querySelector('#profile-activity-score');
        const totalEl = container.querySelector('#profile-activity-total');
        const rankEl = container.querySelector('#profile-activity-rank');
        const emptyEl = container.querySelector('#profile-activity-empty');

        if (!statusEl || !scoreEl || !totalEl || !rankEl || !emptyEl) return;

        if (!activity || !activity.hasActivity) {
            statusEl.textContent = 'Belum menyelesaikan kuis';
            scoreEl.textContent = '-';
            totalEl.textContent = '0';
            rankEl.textContent = '-';
            emptyEl.style.display = 'block';
            return;
        }

        statusEl.textContent = activity.statusText || 'Sudah menyelesaikan kuis';
        scoreEl.textContent = activity.lastScore !== undefined ? String(activity.lastScore) : '-';
        totalEl.textContent = activity.totalCompleted !== undefined ? String(activity.totalCompleted) : '1';
        rankEl.textContent = activity.rank ? `#${activity.rank}` : '-';
        emptyEl.style.display = 'none';

        // Render Badges
        const badgesContainer = container.querySelector('#profile-badges-container');
        if (badgesContainer && activity.badges && activity.badges.length > 0) {
            badgesContainer.innerHTML = activity.badges.map(b => `<div class="badge-item ${b.type}"><i class="${b.icon}"></i> ${b.name}</div>`).join('');
            
            // Dynamic Avatar Border
            const avatar = container.querySelector('#profile-avatar');
            if (avatar) {
                if(activity.badges.some(b => b.type === 'legend')) {
                    avatar.style.boxShadow = '0 0 0 4px #fbbf24, 0 0 15px rgba(251, 191, 36, 0.6)';
                } else if(activity.badges.some(b => b.type === 'epic')) {
                    avatar.style.boxShadow = '0 0 0 4px #94a3b8';
                }
            }
        } else if (badgesContainer) {
            badgesContainer.innerHTML = '';
        }
    }

    async function loadProfileData(container) {
        const session = getSession();
        if (!session) {
            window.location.href = '/login.html';
            return;
        }

        const username = getStored(USER_USERNAME_KEY);
        const cachedNama = getStored(USER_FULLNAME_KEY);
        const cachedPimpinan = getStored(USER_PIMPINAN_KEY);

        const base = {
            username: username || 'Pengguna',
            nama_panjang: cachedNama || '',
            pimpinan: cachedPimpinan || ''
        };
        fillProfile(container, base);
        fillActivity(container, { hasActivity: false });

        if (!username) return;

        try {
            const res = await fetch(`/api/users?username=${encodeURIComponent(username)}`);
            const data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.users) && data.users[0]) {
                const persist = !!localStorage.getItem(USER_SESSION_KEY);
                const user = data.users[0];
                const updated = {
                    username: user.username || username,
                    nama_panjang: user.nama_panjang || cachedNama,
                    pimpinan: user.pimpinan || cachedPimpinan
                };
                fillProfile(container, updated);
                if (user.nama_panjang) setStored(USER_FULLNAME_KEY, user.nama_panjang, persist);
                if (user.pimpinan) setStored(USER_PIMPINAN_KEY, user.pimpinan, persist);
            }
        } catch {}
    }

    async function loadActivityData(container, username) {
        if (!username) return;
        try {
            const res = await fetch('/api/results');
            if (!res.ok) return;
            const data = await res.json();
            if (data.status !== 'success' || !Array.isArray(data.results)) return;

            const results = data.results.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
            const idx = results.findIndex(r => String(r.username || '').toLowerCase() === String(username).toLowerCase());

            if (idx === -1) {
                fillActivity(container, { hasActivity: false });
                return;
            }

            const row = results[idx];
            const totalCompleted = row.total || row.attempts || 1;
            const badges = [];
            if (row.score >= 100) badges.push({ name: 'Si Akurat', type: 'epic', icon: 'fas fa-bullseye' });
            if (idx === 0) badges.push({ name: 'Juara Bertahan', type: 'legend', icon: 'fas fa-crown' });
            if (totalCompleted >= 3) badges.push({ name: 'Kader Pelopor', type: 'rare', icon: 'fas fa-fire' });

            const activity = {
                hasActivity: true,
                lastScore: row.score || 0,
                totalCompleted,
                rank: idx + 1,
                statusText: `Sudah menyelesaikan ${totalCompleted} kuis`,
                badges
            };
            fillActivity(container, activity);
        } catch {}
    }

    async function loadNotifications(container) {
        const session = getSession();
        if (!session) return;
        const list = container.querySelector('#profile-notif-list');
        if (!list) return;
        try {
            const res = await fetch('/api/notifications', {
                headers: { Authorization: `Bearer ${session}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data.status !== 'success' || !Array.isArray(data.notifications)) return;

            if (data.notifications.length === 0) {
                list.innerHTML = '<div class="profile-notif-empty">Belum ada notifikasi.</div>';
                return;
            }

            const preview = data.notifications.slice(0, 3);
            const moreCount = data.notifications.length - preview.length;
            list.innerHTML = preview.map(n => `
                <div class="profile-notif-item ${n.is_read ? '' : 'unread'}">
                    <div class="profile-notif-message">${n.message || 'Ada pembaruan.'}${n.is_read ? '' : '<span class="profile-notif-dot"></span>'}</div>
                    <div class="profile-notif-time">${new Date(n.created_at).toLocaleString('id-ID')}</div>
                </div>
            `).join('');

            if (moreCount > 0) {
                const moreBtn = document.createElement('button');
                moreBtn.type = 'button';
                moreBtn.className = 'profile-notif-more';
                moreBtn.textContent = `Lihat semua (${moreCount} lainnya)`;
                moreBtn.addEventListener('click', () => {
                    list.innerHTML = data.notifications.map(n => `
                        <div class="profile-notif-item ${n.is_read ? '' : 'unread'}">
                            <div class="profile-notif-message">${n.message || 'Ada pembaruan.'}${n.is_read ? '' : '<span class="profile-notif-dot"></span>'}</div>
                            <div class="profile-notif-time">${new Date(n.created_at).toLocaleString('id-ID')}</div>
                        </div>
                    `).join('');
                    list.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
                list.appendChild(moreBtn);
            }
        } catch {}
    }

    function bindNotifToggle(container) {
        const btn = container.querySelector('#profile-notif-toggle');
        const list = container.querySelector('#profile-notif-list');
        if (!btn || !list) return;
        btn.addEventListener('click', () => {
            const isCollapsed = list.classList.toggle('collapsed');
            btn.textContent = isCollapsed ? 'Lihat' : 'Sembunyikan';
        });
    }

    function bindLogout(container) {
        const btn = container.querySelector('#profile-logout-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            clearStored(USER_SESSION_KEY);
            clearStored(USER_USERNAME_KEY);
            clearStored(USER_FULLNAME_KEY);
            clearStored(USER_PIMPINAN_KEY);
            try { sessionStorage.setItem('ipmquiz_flash', 'Anda telah keluar. Silakan masuk kembali.'); } catch {}
            window.location.href = '/index.html';
        });
    }

    function openOverlay() {
        const session = getSession();
        if (!session) {
            window.location.href = '/login.html';
            return;
        }

        if (overlayEl) return;
        const triggerBtn = document.getElementById('profile-header-btn');
        if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'true');
        overlayEl = document.createElement('div');
        overlayEl.className = 'profile-overlay';
        overlayEl.innerHTML = '<div id="profile-root" class="profile-root"></div>';
        document.body.appendChild(overlayEl);
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
        }
        document.body.classList.add('body-no-scroll');
        const root = overlayEl.querySelector('#profile-root');
        if (root) {
            const trigger = document.getElementById('profile-header-btn');
            if (trigger) {
                const rect = trigger.getBoundingClientRect();
                const top = Math.max(60, Math.round(rect.bottom + 8));
                const right = Math.max(8, Math.round(window.innerWidth - rect.right));
                root.style.setProperty('--profile-trigger-top', `${top}px`);
                root.style.setProperty('--profile-trigger-right', `${right}px`);
            }
            renderProfile(root);
            loadProfileData(root);
            bindLogout(root);
            bindNotifToggle(root);
            const uname = getStored(USER_USERNAME_KEY);
            loadActivityData(root, uname);
            loadNotifications(root);
            initDigitalCard(root);
            initBiometricSetup(root);
            initScannerAction(root);
        }

        requestAnimationFrame(() => {
            overlayEl.classList.add('show');
        });

        if (window.__uiBack && window.__uiBack.open) {
            window.__uiBack.open('profile');
        }
    }

    function closeOverlay(fromPop) {
        if (!fromPop && window.__uiBack && window.__uiBack.requestClose) {
            window.__uiBack.requestClose('profile');
            return;
        }
        if (!overlayEl) return;
        const triggerBtn = document.getElementById('profile-header-btn');
        if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');
        overlayEl.classList.remove('show');
        document.body.classList.remove('body-no-scroll');
        document.body.style.removeProperty('--scrollbar-width');
        setTimeout(() => {
            if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
            overlayEl = null;
        }, 200);
    }

    window.ProfilePage = {
        open() {
            if (document.body.classList.contains('page-profile')) return;
            openOverlay();
        },
        close() {
            closeOverlay();
        }
    };

    const registerUiBack = () => {
        if (window.__uiBack && window.__uiBack.register) {
            window.__uiBack.register('profile', closeOverlay);
        }
    };
    registerUiBack();

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('profile-root');
        if (root && document.body.classList.contains('page-profile')) {
            renderProfile(root);
            loadProfileData(root);
            bindLogout(root);
            bindNotifToggle(root);
            const uname = getStored(USER_USERNAME_KEY);
            loadActivityData(root, uname);
            loadNotifications(root);
            initDigitalCard(root);
            initBiometricSetup(root);
            initScannerAction(root);
        }
        registerUiBack();
    });

    document.addEventListener('click', (e) => {
        if (!overlayEl) return;
        if (e.target === overlayEl) closeOverlay();
        if (e.target && e.target.closest && e.target.closest('#profile-close-btn')) closeOverlay();
    });
    function initDigitalCard(container) {
        const qrContainer = container.querySelector('#card-qr-code');
        if (!qrContainer || !window.QRCode) return;

        const username = getStored(USER_USERNAME_KEY);
        const fullName = getStored(USER_FULLNAME_KEY);
        const pimpinan = getStored(USER_PIMPINAN_KEY);

        // Update card values
        const nameVal = container.querySelector('#card-name-val');
        const pimpinanVal = container.querySelector('#card-pimpinan-val');
        if (nameVal) nameVal.textContent = (fullName || username).toUpperCase();
        if (pimpinanVal) pimpinanVal.textContent = (pimpinan || 'PIMPINAN BELUM SET').toUpperCase();

        // Generate QR
        qrContainer.innerHTML = '';
        const qrData = JSON.stringify({
            u: username,
            p: pimpinan,
            t: Date.now()
        });

        new window.QRCode(qrContainer, {
            text: qrData,
            width: 80,
            height: 80,
            colorDark: "#064e3b",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.H
        });
    }

    function initBiometricSetup(container) {
        const bioBtn = container.querySelector('#profile-biometric-btn');
        if (!bioBtn || !window.WebAuthnClient) return;

        window.WebAuthnClient.isSupported().then(async supported => {
            if (!supported) {
                const section = container.querySelector('#profile-biometric-section');
                if (section) section.style.display = 'none';
                return;
            }

            // Check if already registered
            try {
                const res = await fetch('/api/webauthn?action=list-authenticators');
                const data = await res.json();
                if (data.status === 'success' && data.count > 0) {
                    bioBtn.classList.add('active');
                    bioBtn.innerHTML = '<i class="fas fa-check-circle"></i> Biometrik Aktif';
                }
            } catch (e) {}
        });

        bioBtn.addEventListener('click', async () => {
            if (window.AppLoader) window.AppLoader.show('Mendaftarkan Biometrik...');
            try {
                const result = await window.WebAuthnClient.register();
                if (result.status === 'success') {
                    if (window.Toast) window.Toast.show('Biometrik berhasil didaftarkan!', 'success');
                    bioBtn.innerHTML = '<i class="fas fa-check"></i> Biometrik Aktif';
                    bioBtn.disabled = true;
                } else {
                    if (window.Toast) window.Toast.show(result.message || 'Gagal mendaftarkan biometrik.', 'error');
                }
            } catch (err) {
                if (window.Toast) window.Toast.show('Terjadi kesalahan pada biometrik.', 'error');
            } finally {
                if (window.AppLoader) window.AppLoader.hide();
            }
        });
    }

    function initScannerAction(container) {
        const scanBtn = container.querySelector('#profile-scan-btn');
        if (!scanBtn || !window.CardScanner) return;

        scanBtn.addEventListener('click', () => {
            window.CardScanner.scan((data) => {
                try {
                    const parsed = JSON.parse(data);
                    if (window.Toast) window.Toast.show(`Kader ditemukan: ${parsed.u || 'Anonim'}`, 'success');
                    // Add logic here to show public profile of scanned user
                } catch (e) {
                    if (window.Toast) window.Toast.show(`Data QR: ${data}`, 'info');
                }
            });
        });
    }
})();




