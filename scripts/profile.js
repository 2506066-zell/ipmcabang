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
            <div class="profile-shell">
                <div class="profile-card">
                    <button type="button" class="profile-close-btn" id="profile-close-btn" aria-label="Tutup">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="profile-header">
                        <div class="profile-avatar" id="profile-avatar">U</div>
                        <div class="profile-header-text">
                            <h1 class="profile-username" id="profile-username">Pengguna</h1>
                            <div class="profile-subtext" id="profile-subtext">Profil Akun</div>
                        </div>
                    </div>
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
                        <div class="profile-info-row">
                            <span class="profile-label">Password</span>
                            <span class="profile-value">••••••••</span>
                        </div>
                    </div>
                    <div class="profile-actions">
                        <button type="button" class="profile-btn secondary" id="profile-edit-btn" disabled>Edit Profil</button>
                        <button type="button" class="profile-btn primary" id="profile-logout-btn">Logout</button>
                    </div>
                </div>
                <div class="profile-card profile-activity-card">
                    <div class="profile-activity-header">📊 Aktivitas</div>
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
            const activity = {
                hasActivity: true,
                lastScore: row.score || 0,
                totalCompleted,
                rank: idx + 1,
                statusText: `Sudah menyelesaikan ${totalCompleted} kuis`
            };
            fillActivity(container, activity);
        } catch {}
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
        overlayEl = document.createElement('div');
        overlayEl.className = 'profile-overlay';
        overlayEl.innerHTML = '<div id="profile-root" class="profile-root"></div>';
        document.body.appendChild(overlayEl);
        document.body.classList.add('body-no-scroll');
        const root = overlayEl.querySelector('#profile-root');
        if (root) {
            renderProfile(root);
            loadProfileData(root);
            bindLogout(root);
            const uname = getStored(USER_USERNAME_KEY);
            loadActivityData(root, uname);
        }

        requestAnimationFrame(() => {
            overlayEl.classList.add('show');
        });
    }

    function closeOverlay() {
        if (!overlayEl) return;
        overlayEl.classList.remove('show');
        document.body.classList.remove('body-no-scroll');
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

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('profile-root');
        if (root && document.body.classList.contains('page-profile')) {
            renderProfile(root);
            loadProfileData(root);
            bindLogout(root);
            const uname = getStored(USER_USERNAME_KEY);
            loadActivityData(root, uname);
        }
    });

    document.addEventListener('click', (e) => {
        if (!overlayEl) return;
        if (e.target === overlayEl) closeOverlay();
        if (e.target && e.target.closest && e.target.closest('#profile-close-btn')) closeOverlay();
    });
})();




