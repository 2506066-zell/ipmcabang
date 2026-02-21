(() => {
    const DEFAULT_API_URL = '/api';
    const MODULE_VER = '15';

    const STORAGE_KEYS = {
        username: 'ipmquiz_admin_username',
        prefs: 'ipmquiz_admin_prefs',
        draft: 'ipmquiz_admin_question_draft',
        theme: 'ipmquiz_admin_theme'
    };

    const SESSION_KEYS = {
        session: 'ipmquiz_admin_session',
    };

    const state = {
        apiUrl: DEFAULT_API_URL,
        session: '',
        questions: [],
        totalQuestions: 0,
        categories: [],
        results: [],
        users: [],
        logs: [],
        schedules: [],
        pimpinanOptions: [],
        connected: false,
        prefs: { tab: 'dashboard', search: '', status: 'all', set: 'all', category: 'all' },
        backend: 'vercel',
        adminToken: '',
    };
    let modalDirty = false;

    const uiBack = (() => {
        const state = { current: null, closers: {} };

        const register = (name, closeFn) => {
            if (!name || typeof closeFn !== 'function') return;
            state.closers[name] = closeFn;
        };

        const open = (name) => {
            if (!name || !window.history || !window.history.pushState) return;
            if (state.current === name) return;
            if (state.current && state.closers[state.current]) {
                state.closers[state.current](true);
            }
            state.current = name;
            window.history.pushState({ __ui: name }, '', window.location.href);
        };

        const isActive = (name) => state.current === name;

        const requestClose = (name) => {
            if (!name) return;
            if (isActive(name) && window.history && window.history.state && window.history.state.__ui === name) {
                window.history.back();
                return;
            }
            if (state.closers[name]) state.closers[name](true);
            if (state.current === name) state.current = null;
        };

        window.addEventListener('popstate', () => {
            if (!state.current) return;
            const closeFn = state.closers[state.current];
            if (closeFn) closeFn(true);
            state.current = null;
        });

        return { register, open, requestClose, isActive };
    })();

    window.__uiBack = uiBack;

    // --- HELPER ---
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- ELEMENTS ---
    let els = {};

    function initEls() {
        if (!document.body) { console.warn('Body not ready'); return; }
        console.log('[Admin] Initializing DOM elements...');
        els = {
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: document.getElementById('loading-text'),
            themeToggle: document.getElementById('theme-toggle'),

            // Layout
            sidebar: document.getElementById('sidebar'),
            sidebarNav: document.querySelector('.sidebar-nav'),
            sidebarLogout: document.getElementById('sidebar-logout'),
            pageTitle: document.getElementById('page-title'),
            pageContextLabel: document.getElementById('page-context-label'),
            pageContextDesc: document.getElementById('page-context-desc'),
            sectionLastUpdated: document.getElementById('section-last-updated'),

            // Login
            loginCard: document.getElementById('login-card'),
            usernameInput: document.getElementById('admin-username'),
            passwordInput: document.getElementById('admin-password'),
            togglePasswordBtn: document.getElementById('toggle-admin-password'),
            adminLoginBtn: document.getElementById('admin-login-btn'),
            status: document.getElementById('status'),
            adminTokenInput: document.getElementById('admin-token-input'),

            // App
            appCard: document.getElementById('app-card'),
            logoutBtn: document.getElementById('logout-btn'),

            // Tabs
            tabDashboard: document.getElementById('tab-dashboard'),
            tabQuestions: document.getElementById('tab-questions'),
            tabResults: document.getElementById('tab-results'),
            tabUsers: document.getElementById('tab-users'),
            tabLogs: document.getElementById('tab-logs'),
            tabSchedules: document.getElementById('tab-schedules'),

            bottomNav: document.getElementById('bottom-nav'),
            navItems: document.querySelectorAll('.nav-item'),

            // Dashboard
            statUsers: document.getElementById('stat-users'),
            statQuizzes: document.getElementById('stat-quizzes'),
            statQuestions: document.getElementById('stat-questions'),
            statSchedules: document.getElementById('stat-schedules'),
            dashboardLogsList: document.getElementById('dashboard-logs-list'),

            // Questions
            searchInput: document.getElementById('search-input'),
            quizSetFilter: document.getElementById('quiz-set-filter'),
            categoryFilter: document.getElementById('category-filter'),
            questionsList: document.getElementById('questions-list'),
            qPrev: document.getElementById('q-prev'),
            qNext: document.getElementById('q-next'),
            qPageInfo: document.getElementById('q-page-info'),
            fabAdd: document.getElementById('fab-add-question'),

            // Results
            resultsList: document.getElementById('results-list'),
            refreshResultsBtn: document.getElementById('refresh-results-btn'),
            rPrev: document.getElementById('r-prev'),
            rNext: document.getElementById('r-next'),
            rPageInfo: document.getElementById('r-page-info'),

            // Users
            usersList: document.getElementById('users-list'),
            refreshUsersBtn: document.getElementById('refresh-users-btn'),
            userSearchInput: document.getElementById('user-search-input'),
            userSortSelect: document.getElementById('user-sort-select'),
            userStatusFilter: document.getElementById('user-status-filter'),
            addUserBtn: document.getElementById('add-user-btn'),

            // User Modal
            userModalPanel: document.getElementById('user-modal-panel'),
            userForm: document.getElementById('user-form'),
            usrId: document.getElementById('usr-id'),
            usrUsername: document.getElementById('usr-username'),
            usrEmail: document.getElementById('usr-email'),
            usrPassword: document.getElementById('usr-password'),
            usrRole: document.getElementById('usr-role'),
            usrActive: document.getElementById('usr-active'),

            // Logs
            logsList: document.getElementById('logs-list'),
            refreshLogsBtn: document.getElementById('refresh-logs-btn'),

            // Schedules
            schedulesList: document.getElementById('schedules-list'),
            scheduleModalPanel: document.getElementById('schedule-modal-panel'),
            scheduleForm: document.getElementById('schedule-form'),
            scheduleDateFilter: document.getElementById('schedule-date-filter'),
            schId: document.getElementById('sch-id'),
            schTitle: document.getElementById('sch-title'),
            schDesc: document.getElementById('sch-desc'),
            schStart: document.getElementById('sch-start'),
            schEnd: document.getElementById('sch-end'),
            schShowQuiz: document.getElementById('sch-show-quiz'),
            schShowNotif: document.getElementById('sch-show-notif'),
            addScheduleBtn: document.getElementById('add-schedule-btn'),
            previewSchBtn: document.getElementById('preview-sch-btn'),
            previewPanel: document.getElementById('schedule-preview-panel'),

            previewBox: document.getElementById('schedule-preview-box'),

            // Global Reset
            resetSetSelect: document.getElementById('reset-set-select'),
            globalResetBtn: document.getElementById('global-reset-btn'),

            // Gamification
            gmEnabled: document.getElementById('gm-enabled'),
            gmTimer: document.getElementById('gm-timer'),
            gmXpBase: document.getElementById('gm-xp-base'),
            gmStreakBonus: document.getElementById('gm-streak-bonus'),
            gmStreakCap: document.getElementById('gm-streak-cap'),
            gmQuestDaily: document.getElementById('gm-quest-daily'),
            gmQuestHighscore: document.getElementById('gm-quest-highscore'),
            gmHighscorePercent: document.getElementById('gm-highscore-percent'),
            gmSaveBtn: document.getElementById('gm-save-btn'),
            gmStatus: document.getElementById('gm-status'),

            // Pimpinan Options
            pimpinanInput: document.getElementById('pimpinan-input'),
            pimpinanAddBtn: document.getElementById('pimpinan-add-btn'),
            pimpinanList: document.getElementById('pimpinan-list'),
            pimpinanSaveBtn: document.getElementById('pimpinan-save-btn'),
            pimpinanStatus: document.getElementById('pimpinan-status'),

            // Admin Notify
            notifyForm: document.getElementById('notify-form'),
            notifyTitle: document.getElementById('notify-title'),
            notifyMessage: document.getElementById('notify-message'),
            notifyUrl: document.getElementById('notify-url'),
            notifyTarget: document.getElementById('notify-target'),
            notifySchedule: document.getElementById('notify-schedule'),
            notifySave: document.getElementById('notify-save'),
            notifyStatus: document.getElementById('notify-status'),
            notifySendBtn: document.getElementById('notify-send-btn'),
            notifyScheduleList: document.getElementById('notify-schedule-list'),
            notifyScheduleReload: document.getElementById('notify-schedule-reload'),
            notifyScheduleRun: document.getElementById('notify-schedule-run'),
            notifyPreviewBtn: document.getElementById('notify-preview-btn'),
            notifyPreviewBox: document.getElementById('notify-preview-box'),

            // Question Modal
            modal: document.getElementById('question-modal'),
            modalTitle: document.getElementById('modal-title'),
            modalCloseBtn: document.getElementById('modal-close-btn'),
            questionForm: document.getElementById('question-form'),

            // Form Inputs (Question)
            qId: document.getElementById('q-id'),
            qQuestion: document.getElementById('q-question'),
            qA: document.getElementById('q-a'),
            qB: document.getElementById('q-b'),
            qC: document.getElementById('q-c'),
            qD: document.getElementById('q-d'),
            // qCorrect: document.getElementById('q-correct'), // Removed in new design
            qActive: document.getElementById('q-active'),
            qQuizSet: document.getElementById('q-quizset'),
            qCategory: document.getElementById('q-category'),

            saveBtn: document.getElementById('save-btn'),
            saveAddBtn: document.getElementById('save-add-btn'),

            // Mobile Menu
            menuModal: document.getElementById('menu-modal'),
            navMore: document.getElementById('nav-more'),
            menuThemeToggle: document.getElementById('menu-theme-toggle'),
            menuLogoutBtn: document.getElementById('menu-logout-btn')
        };
    }

    const paging = {
        qPage: 1,
        qSize: 20,
        rPage: 1,
        rSize: 20
    };

    // --- API ---
    function showLoader(text) {
        if (els.loadingText) els.loadingText.textContent = text || 'Memuat...';
        if (els.loadingOverlay) els.loadingOverlay.classList.remove('hidden');
    }
    function hideLoader() {
        if (els.loadingOverlay) els.loadingOverlay.classList.add('hidden');
    }
    function setStatus(msg, type = 'info') {
        console.log(`[Admin] Status: ${msg} (${type})`);

        // Use Toast if available
        if (window.Toast) {
            const t = type === 'ok' ? 'success' : type;
            window.Toast.show(msg, t);
        }

        // Fallback or specific login status
        if (els.status) {
            els.status.textContent = msg;
            els.status.className = 'status ' + type;
            setTimeout(() => {
                if (els.status && els.status.textContent === msg) {
                    els.status.textContent = '';
                }
            }, 5000);
        }
    }

    async function fetchJson(url, init = {}) {
        if (!init.credentials) init.credentials = 'include';
        const response = await fetch(url, init);
        const ct = response.headers.get('content-type');
        let data = null;
        if (ct && ct.includes('application/json')) {
            try { data = await response.json(); } catch { }
        }
        if (!data) throw new Error('Respon bukan JSON');
        if (!response.ok) {
            const msg = data.message || `HTTP ${response.status}`;
            const err = new Error(msg);
            err.status = response.status;
            throw err;
        }
        return data;
    }

    async function fetchJsonWithRetry(url, init, retries = 2, delay = 600) {
        try { return await fetchJson(url, init); }
        catch (e) {
            if (e.message && (e.message.startsWith('HTTP 4') && !e.message.includes('429'))) throw e;
            if (retries <= 0) throw e;
            await new Promise(r => setTimeout(r, delay));
            return await fetchJsonWithRetry(url, init, retries - 1, delay * 1.5);
        }
    }

    function resolveApiUrl(path) { return path; }

    async function apiGetVercel(path) {
        return await fetchJsonWithRetry(resolveApiUrl(path), { method: 'GET' });
    }

    async function apiAdminVercel(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (state.adminToken) headers['Authorization'] = `Bearer ${state.adminToken}`;
        else if (state.session) headers['Authorization'] = `Bearer ${state.session}`;
        return await fetchJsonWithRetry(resolveApiUrl(path), { method, headers, body: body ? JSON.stringify(body) : undefined });
    }

    // --- AUTH ---
    async function loginVercel(uname, pwd) {
        const body = { username: String(uname || '').trim(), password: String(pwd || '') };
        const data = await fetchJson(resolveApiUrl('/api/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!data || data.status !== 'success' || !data.session) throw new Error(data?.message || 'Login gagal');
        if (String(data.role || '') !== 'admin') throw new Error('Akun bukan admin');
        state.session = String(data.session);
        sessionStorage.setItem(SESSION_KEYS.session, state.session);
        return data;
    }

    function setConnected(connected) {
        state.connected = connected;
        if (els.loginCard) els.loginCard.classList.toggle('hidden', connected);
        if (els.appCard) els.appCard.classList.toggle('hidden', !connected);
        if (els.bottomNav) els.bottomNav.classList.toggle('hidden', !connected);
        if (els.fabAdd) els.fabAdd.classList.toggle('hidden', !connected);
        if (els.sidebar) els.sidebar.classList.toggle('hidden-mobile', !connected); // Desktop sidebar

        if (connected) {
            activateTab(state.prefs.tab || 'dashboard');
        }
    }

    // --- THEME ---
    function initTheme() {
        const stored = localStorage.getItem(STORAGE_KEYS.theme);
        if (stored === 'light') {
            document.body.classList.add('light-mode');
            updateThemeIcons(true);
        } else {
            updateThemeIcons(false);
        }
    }

    function toggleTheme() {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem(STORAGE_KEYS.theme, isLight ? 'light' : 'dark');
        updateThemeIcons(isLight);
    }

    function updateThemeIcons(isLight) {
        const iconClass = isLight ? 'fas fa-sun' : 'fas fa-moon';
        if (els.themeToggle) els.themeToggle.querySelector('i').className = iconClass;
        if (els.menuThemeToggle) els.menuThemeToggle.querySelector('i').className = iconClass;
    }

    // --- PREFS ---
    function loadPrefs() {
        try {
            const obj = JSON.parse(localStorage.getItem(STORAGE_KEYS.prefs) || '{}');
            if (obj && typeof obj === 'object') state.prefs = { ...state.prefs, ...obj };
        } catch { }
    }
    function savePrefs() {
        try { localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(state.prefs)); } catch { }
    }

    const TAB_META = {
        dashboard: {
            label: 'Overview',
            title: 'Dashboard Operasional',
            desc: 'Pantau metrik utama, aktivitas terbaru, dan akses cepat ke operasi inti.'
        },
        questions: {
            label: 'Assessment Ops',
            title: 'Bank Soal',
            desc: 'Kelola kualitas soal, kategori, dan set kuis yang dipublikasikan.'
        },
        results: {
            label: 'Assessment Ops',
            title: 'Hasil Assessment',
            desc: 'Evaluasi performa user dan validasi hasil kuis.'
        },
        users: {
            label: 'User & Comms',
            title: 'User & Komunikasi',
            desc: 'Atur data user dan kirim broadcast notifikasi secara terkontrol.'
        },
        logs: {
            label: 'System',
            title: 'Audit Log',
            desc: 'Lacak aktivitas admin untuk kebutuhan jejak audit.'
        },
        schedules: {
            label: 'System',
            title: 'Konfigurasi Sistem',
            desc: 'Atur jadwal kuis, gamifikasi, konfigurasi form, dan aksi berisiko.'
        },
        articles: {
            label: 'Content Ops',
            title: 'Manajemen Artikel',
            desc: 'Kelola publikasi artikel dan workflow konten utama.'
        },
        materials: {
            label: 'Content Ops',
            title: 'Manajemen Materi',
            desc: 'Kelola materi belajar agar rapi dan mudah ditemukan.'
        },
        organization: {
            label: 'Content Ops',
            title: 'Struktur Organisasi',
            desc: 'Kelola anggota dan program kerja tiap bidang dari satu panel admin.'
        }
    };

    function updateHeaderContext(tabName) {
        const meta = TAB_META[tabName] || {
            label: 'Admin',
            title: tabName,
            desc: 'Kelola operasional admin.'
        };
        if (els.pageContextLabel) els.pageContextLabel.textContent = meta.label;
        if (els.pageTitle) els.pageTitle.textContent = meta.title;
        if (els.pageContextDesc) els.pageContextDesc.textContent = meta.desc;
    }

    function markSectionUpdated() {
        if (!els.sectionLastUpdated) return;
        const stamp = new Date().toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        els.sectionLastUpdated.textContent = `Diperbarui: ${stamp}`;
    }

    // --- NAVIGATION ---
    window.activateTab = function (tabName) {
        // Handle Sidebar & Bottom Nav active state
        const allNavs = [...(els.navItems || [])];
        allNavs.forEach(item => {
            if (item.dataset.tab === tabName) item.classList.add('active');
            else item.classList.remove('active');
        });

        // Hide all tabs
        ['dashboard', 'questions', 'results', 'users', 'logs', 'schedules', 'articles', 'materials', 'organization'].forEach(t => {
            const el = document.getElementById(`tab-${t}`);
            if (el) el.classList.add('hidden');
        });

        // Show active tab
        const activeEl = document.getElementById(`tab-${tabName}`);
        if (activeEl) activeEl.classList.remove('hidden');

        // Update header context
        updateHeaderContext(tabName);
        markSectionUpdated();

        // Toggle FAB
        if (els.fabAdd) els.fabAdd.classList.toggle('hidden', tabName !== 'questions');

        state.prefs.tab = tabName;
        savePrefs();

        // Load Data
        if (tabName === 'dashboard') {
            loadDashboard();
        }
        if (tabName === 'questions' && state.questions.length === 0) loadQuestions();
        if (tabName === 'results' && state.results.length === 0) loadResults();
        if (tabName === 'users' && state.users.length === 0) loadUsers();
        if (tabName === 'users') {
            loadNotifySchedules();
            loadPimpinanOptions();
        }
        if (tabName === 'logs' && state.logs.length === 0) loadLogs();
        if (tabName === 'schedules') loadSchedules();
        if (tabName === 'schedules') loadGamificationSettings();
        if (tabName === 'schedules') loadPimpinanOptions();

        // Dynamic Import for Articles
        if (tabName === 'articles') {
            console.log('[Admin] Loading articles module...');
            import(`./articles.js?v=${MODULE_VER}`).then(mod => {
                if (!state.articlesInitialized) {
                    mod.initArticles(state, els, { apiGetVercel, apiAdminVercel, fetchJsonWithRetry, debounce });
                    state.articlesInitialized = true;
                }
            }).catch(err => console.error('[Admin] Failed to load articles module:', err));
        }

        // Dynamic Import for Materials
        if (tabName === 'materials') {
            console.log('[Admin] Loading materials module...');
            import(`./materials.js?v=${MODULE_VER}`).then(mod => {
                if (!state.materialsInitialized) {
                    mod.initMaterials(state, els, { apiGetVercel, apiAdminVercel, fetchJsonWithRetry, debounce });
                    state.materialsInitialized = true;
                }
            }).catch(err => console.error('[Admin] Failed to load materials module:', err));
        }

        if (tabName === 'organization') {
            console.log('[Admin] Loading organization module...');
            import(`./organization.js?v=${MODULE_VER}`).then(mod => {
                if (!state.organizationInitialized) {
                    mod.initOrganization(state, els, {
                        apiGetVercel,
                        apiAdminVercel,
                        fetchJsonWithRetry,
                        debounce,
                        escapeHtml,
                        showLoader,
                        hideLoader,
                        setStatus
                    });
                    state.organizationInitialized = true;
                }
            }).catch(err => console.error('[Admin] Failed to load organization module:', err));
        }
    };

    // --- DASHBOARD LOGIC ---
    async function loadDashboard() {
        // Parallel fetch for stats
        try {
            const [usersData, questionsData, logsData, schedulesData, resultsData] = await Promise.all([
                apiAdminVercel('GET', '/api/admin/users?action=extended'),
                apiGetVercel('/api/questions?size=1'), // Just to get total count
                apiAdminVercel('GET', '/api/admin/questions?action=activityLogs'),
                apiAdminVercel('GET', '/api/admin/questions?action=schedules'),
                apiGetVercel('/api/results')
            ]);

            // Users Stat
            if (els.statUsers) els.statUsers.textContent = usersData.users ? usersData.users.length : 0;

            // Questions Stat
            if (els.statQuestions) els.statQuestions.textContent = questionsData.total || 0;

            // Schedules Stat (Active)
            const activeSchedules = (schedulesData.schedules || []).filter(s => s.active).length;
            if (els.statSchedules) els.statSchedules.textContent = activeSchedules;

            // Quizzes Finished Stat
            const finished = resultsData.results ? resultsData.results.length : 0;
            if (els.statQuizzes) els.statQuizzes.textContent = finished;

            // Recent Activity
            if (els.dashboardLogsList) {
                const recentLogs = (logsData.logs || []).slice(0, 5);
                els.dashboardLogsList.innerHTML = recentLogs.map(l => `
                    <div class="list-item" style="padding:12px;">
                        <div style="font-weight:600; font-size:0.9rem;">${escapeHtml(l.action)}</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(l.admin_name)} - ${new Date(l.created_at).toLocaleString()}</div>
                    </div>
                `).join('');
            }

        } catch (e) {
            console.error('Dashboard load error:', e);
        }
    }

    async function loadGamificationSettings() {
        if (!els.gmEnabled) return;
        try {
            const data = await apiAdminVercel('GET', '/api/admin/questions?action=gamificationGet');
            if (!data || data.status !== 'success') return;
            const s = data.settings || {};
            els.gmEnabled.value = String(s.enabled !== false);
            els.gmTimer.value = s.timer_seconds ?? 20;
            els.gmXpBase.value = s.xp_base ?? 10;
            els.gmStreakBonus.value = s.streak_bonus ?? 2;
            els.gmStreakCap.value = s.streak_cap ?? 5;
            els.gmQuestDaily.value = s.quest_daily_target ?? 3;
            els.gmQuestHighscore.value = s.quest_highscore_target ?? 2;
            els.gmHighscorePercent.value = s.highscore_percent ?? 80;
        } catch (e) {
            console.error('Failed to load gamification settings', e);
        }
    }

    async function saveGamificationSettings() {
        if (!els.gmSaveBtn) return;
        const payload = {
            enabled: els.gmEnabled.value === 'true',
            timer_seconds: Number(els.gmTimer.value || 20),
            xp_base: Number(els.gmXpBase.value || 10),
            streak_bonus: Number(els.gmStreakBonus.value || 2),
            streak_cap: Number(els.gmStreakCap.value || 5),
            quest_daily_target: Number(els.gmQuestDaily.value || 3),
            quest_highscore_target: Number(els.gmQuestHighscore.value || 2),
            highscore_percent: Number(els.gmHighscorePercent.value || 80)
        };

        showLoader('Menyimpan pengaturan...');
        try {
            const data = await apiAdminVercel('POST', '/api/admin/questions?action=gamificationSave', payload);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menyimpan');
            setStatus('Pengaturan gamifikasi disimpan.', 'ok');
            if (els.gmStatus) {
                els.gmStatus.textContent = 'Tersimpan';
                els.gmStatus.className = 'status ok';
            }
            await loadGamificationSettings();
        } catch (e) {
            console.error('Save gamification failed:', e);
            setStatus(e.message || 'Gagal menyimpan', 'error');
            if (els.gmStatus) {
                els.gmStatus.textContent = e.message || 'Gagal menyimpan';
                els.gmStatus.className = 'status error';
            }
    } finally {
        hideLoader();
    }
}

    // --- PIMPINAN OPTIONS ---
    function renderPimpinanOptions() {
        if (!els.pimpinanList) return;
        if (!Array.isArray(state.pimpinanOptions) || state.pimpinanOptions.length === 0) {
            els.pimpinanList.innerHTML = '<span class="small" style="color:var(--text-muted)">Belum ada pilihan.</span>';
            return;
        }
        els.pimpinanList.innerHTML = state.pimpinanOptions.map((item, idx) => `
            <span class="pimpinan-chip" data-index="${idx}">
                ${escapeHtml(item)}
                <button type="button" class="chip-remove" data-index="${idx}" aria-label="Hapus">×</button>
            </span>
        `).join('');
    }


    function renderNotifyTargets() {
        if (!els.notifyTarget) return;
        const options = Array.isArray(state.pimpinanOptions) ? state.pimpinanOptions : [];
        const current = els.notifyTarget.value;
        const items = [
            { value: 'all', label: 'Semua User' },
            ...options.map(opt => ({ value: `pimpinan:${opt}`, label: opt }))
        ];
        els.notifyTarget.innerHTML = items.map(item => `
            <option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>
        `).join('');
        if (current) {
            els.notifyTarget.value = current;
        }
    }


    function formatScheduleDate(value) {
        if (!value) return '-';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function renderNotifyScheduleList(items) {
        if (!els.notifyScheduleList) return;
        if (!Array.isArray(items) || items.length === 0) {
            els.notifyScheduleList.innerHTML = '<div class="small muted">Belum ada jadwal notifikasi.</div>';
            return;
        }
        els.notifyScheduleList.innerHTML = items.map(item => {
            const status = String(item.status || 'pending');
            const statusLabel = status === 'sent' ? 'Terkirim' : (status === 'failed' ? 'Gagal' : 'Menunggu');
            const targetLabel = item.target_type === 'pimpinan'
                ? `Pimpinan: ${escapeHtml(item.target_value || '-')}`
                : 'Semua User';
            const timeLabel = formatScheduleDate(item.send_at);
            const deleteBtn = status === 'pending'
                ? `<button type="button" class="btn btn-xs btn-secondary notify-schedule-delete" data-id="${item.id}">Hapus</button>`
                : '';
            return `
                <div class="notify-schedule-item">
                    <div class="notify-schedule-main">
                        <div class="notify-schedule-title">${escapeHtml(item.title || 'Notifikasi')}</div>
                        <div class="notify-schedule-meta">${targetLabel} - ${timeLabel}</div>
                    </div>
                    <div class="notify-schedule-actions">
                        <span class="notify-status ${status}">${statusLabel}</span>
                        ${deleteBtn}
                    </div>
                </div>
            `;
        }).join('');
    }

    async function loadNotifySchedules() {
        if (!els.notifyScheduleList) return;
        try {
            const data = await apiAdminVercel('GET', '/api/admin/questions?action=listScheduledNotifications');
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat jadwal');
            renderNotifyScheduleList(data.items || []);
        } catch (e) {
            console.error('Load scheduled notifications failed:', e);
            els.notifyScheduleList.innerHTML = '<div class="small muted">Gagal memuat jadwal notifikasi.</div>';
        }
    }

    async function loadPimpinanOptions() {
        if (!els.pimpinanList && !els.notifyTarget) return;
        try {
            const data = await apiAdminVercel('GET', '/api/admin/questions?action=pimpinanGet');
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat pilihan');
            state.pimpinanOptions = Array.isArray(data.options) ? data.options : [];
            renderPimpinanOptions();
            renderNotifyTargets();
        } catch (e) {
            console.error('Failed to load pimpinan options', e);
            if (els.pimpinanStatus) {
                els.pimpinanStatus.textContent = e.message || 'Gagal memuat';
                els.pimpinanStatus.className = 'status error';
            }
        }
    }

    async function savePimpinanOptions() {
        if (!els.pimpinanSaveBtn) return;
        showLoader('Menyimpan pilihan...');
        try {
            const data = await apiAdminVercel('POST', '/api/admin/questions?action=pimpinanSave', { options: state.pimpinanOptions });
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menyimpan');
            state.pimpinanOptions = Array.isArray(data.options) ? data.options : [];
            renderPimpinanOptions();
            renderNotifyTargets();
            if (els.pimpinanStatus) {
                els.pimpinanStatus.textContent = 'Tersimpan';
                els.pimpinanStatus.className = 'status ok';
            }
            setStatus('Pilihan asal pimpinan disimpan.', 'ok');
        } catch (e) {
            console.error('Save pimpinan options failed:', e);
            if (els.pimpinanStatus) {
                els.pimpinanStatus.textContent = e.message || 'Gagal menyimpan';
                els.pimpinanStatus.className = 'status error';
            }
            setStatus(e.message || 'Gagal menyimpan', 'error');
        } finally {
            hideLoader();
        }
    }

    // --- QUESTIONS LOGIC ---
    async function loadCategories() {
        try {
            const data = await apiGetVercel('/api/questions?mode=categories');
            if (data && data.status === 'success') {
                state.categories = data.categories || [];
                renderCategoryFilter();
            }
        } catch { }
    }

    function renderCategoryFilter() {
        if (!els.categoryFilter) return;
        const current = String(els.categoryFilter.value || 'all');
        els.categoryFilter.innerHTML = '<option value="all">Semua Kategori</option>' + state.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        if (current && current !== 'all') els.categoryFilter.value = current;
    }

    function renderQuestions() {
        const all = state.questions;
        if (all.length === 0) {
            els.questionsList.innerHTML = `<div class="card" style="text-align:center; padding:40px;"><p>Tidak ada soal ditemukan.</p></div>`;
        } else {
            els.questionsList.innerHTML = all.map(q => {
                const setNum = Number(q.quiz_set || 1);
                let setLabel = 'Kuis 3';
                if (setNum === 1) setLabel = 'Kuis 1';
                else if (setNum === 2) setLabel = 'Kuis 2';
                else if (setNum === 4) setLabel = 'Kuis 4';
                const isActive = q.active;
                const statusColor = isActive ? 'var(--accent-success)' : 'var(--text-muted)';
                const statusText = isActive ? 'AKTIF' : 'NONAKTIF';

                // Parse options if string (legacy)
                let opts = q.options;
                if (typeof opts === 'string') {
                    try { opts = JSON.parse(opts); } catch { opts = { a: '-', b: '-', c: '-', d: '-' }; }
                }

                return `
                <div class="q-card" data-id="${q.id}">
                    <div class="q-card-header">
                        <span class="q-set-badge">${escapeHtml(setLabel)}</span>
                        
                        <!-- Toggle Switch -->
                        <label class="toggle-switch">
                            <input type="checkbox" ${isActive ? 'checked' : ''} data-action="toggle-status">
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <p class="q-text">${escapeHtml(q.question)}</p>
                    
                    <div class="q-options-grid">
                        ${['a', 'b', 'c', 'd'].map(k => {
                    const isKey = (q.correct_answer || '').toLowerCase() === k;
                    const cls = isKey ? 'q-opt correct' : 'q-opt';
                    return `
                            <div class="${cls}">
                                <div class="q-opt-key">${k.toUpperCase()}</div>
                                <div class="q-opt-val">${escapeHtml(opts[k] || '')}</div>
                            </div>
                            `;
                }).join('')}
                    </div>

                    <div class="q-actions">
                        <button class="q-btn q-btn-edit" data-action="edit">
                            <i class="fas fa-pen"></i> Edit
                        </button>
                        <button class="q-btn q-btn-del" data-action="delete">
                            <i class="fas fa-trash"></i> Hapus
                        </button>
                    </div>
                </div>
                `;
            }).join('');

            // Re-attach event listeners to new buttons
            // REMOVED: Loop attachment to prevent double binding. 
            // We rely on delegation in initEvents() -> els.questionsList.addEventListener
        }
        // Pagination
        const totalPages = Math.max(1, Math.ceil(state.totalQuestions / paging.qSize));
        if (els.qPageInfo) els.qPageInfo.textContent = `Hal ${paging.qPage} / ${totalPages} (Total ${state.totalQuestions})`;
        if (els.qPrev) els.qPrev.disabled = paging.qPage <= 1;
        if (els.qNext) els.qNext.disabled = paging.qPage >= totalPages;
    }

    async function loadQuestions(page = paging.qPage) {
        showLoader('Memuat Soal...');
        const q = (els.searchInput.value || '').trim();
        const set = els.quizSetFilter.value;
        const cat = els.categoryFilter.value;

        // Use admin_handler with action=listQuestions
        let url = `/api/admin/questions?action=listQuestions&page=${page}&size=${paging.qSize}`;

        if (q) url += `&search=${encodeURIComponent(q)}`;
        if (set && set !== 'all') url += `&set=${set}`;
        if (cat && cat !== 'all') url += `&category=${encodeURIComponent(cat)}`;

        try {
            // using apiAdminVercel to auto-attach token
            const data = await apiAdminVercel('GET', url);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat soal.');
            state.questions = Array.isArray(data.questions) ? data.questions : [];
            state.totalQuestions = data.total || 0;
            paging.qPage = data.page || 1;
            if (state.categories.length === 0) loadCategories();
            renderQuestions();
        } catch (e) {
            console.error(e);
            if (state.questions.length === 0) els.questionsList.innerHTML = `<div class="card" style="text-align:center; color:var(--accent-danger)"><p>Gagal memuat data.</p><button class="btn btn-secondary" onclick="loadQuestions(1)">Coba Lagi</button></div>`;
        } finally {
            hideLoader();
        }
    }

    // --- RESULTS LOGIC ---
    function renderResults() {
        const start = (paging.rPage - 1) * paging.rSize;
        const pageItems = state.results.slice(start, start + paging.rSize);
        if (pageItems.length === 0) {
            els.resultsList.innerHTML = `<div class="card" style="text-align:center"><p>Belum ada hasil.</p></div>`;
        } else {
            els.resultsList.innerHTML = pageItems.map(r => `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="item-title" style="font-size:1rem">${escapeHtml(r.username || 'Anonim')}</span>
                    <span class="item-badge" style="background:var(--accent-primary); color:#000;">${escapeHtml(r.score)} / ${escapeHtml(r.total)}</span>
                </div>
                <div class="item-meta">
                    <span><i class="fas fa-clock"></i> ${escapeHtml(r.timestamp || r.ts)}</span>
                    <span><i class="fas fa-percent"></i> ${escapeHtml(r.percent)}%</span>
                </div>
            </div>
            `).join('');
        }
        const totalPages = Math.max(1, Math.ceil(state.results.length / paging.rSize));
        if (els.rPageInfo) els.rPageInfo.textContent = `Hal ${paging.rPage} / ${totalPages}`;
        if (els.rPrev) els.rPrev.disabled = paging.rPage <= 1;
        if (els.rNext) els.rNext.disabled = paging.rPage >= totalPages;
    }

    async function loadResults() {
        showLoader('Memuat Hasil...');
        try {
            const data = await apiGetVercel('/api/results');
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat hasil.');
            state.results = (Array.isArray(data.results) ? data.results : []).map(r => ({ ...r, timestamp: r.ts || r.timestamp }));
            renderResults();
        } catch (e) { console.error(e); } finally { hideLoader(); }
    }

    // --- USERS LOGIC ---
    async function loadUsers() {
        showLoader('Memuat User...');
        try {
            const data = await apiAdminVercel('GET', '/api/admin/users?action=extended');
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat user.');
            state.users = data.users || [];
            renderUsers();
        } catch (e) {
            console.error('Error loading users:', e);
            if (els.usersList) {
                els.usersList.innerHTML = `<div class="card" style="text-align:center; color:var(--accent-danger)"><p>Gagal memuat data user: ${e.message}</p></div>`;
            }
        } finally {
            hideLoader();
        }
    }

    function renderUsers() {
        if (!els.usersList) return;
        let users = [...state.users];

        // Filter Search
        const q = (els.userSearchInput?.value || '').toLowerCase();
        if (q) {
            users = users.filter(u =>
                (u.username && u.username.toLowerCase().includes(q)) ||
                (u.nama_panjang && u.nama_panjang.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q))
            );
        }

        // Filter Status
        const status = els.userStatusFilter?.value || 'all';
        if (status === 'active') users = users.filter(u => u.active);
        if (status === 'inactive') users = users.filter(u => !u.active);

        // Sort
        const sort = els.userSortSelect?.value || 'newest';
        users.sort((a, b) => {
            if (sort === 'score_desc') return (b.avg_score || 0) - (a.avg_score || 0);
            if (sort === 'score_asc') return (a.avg_score || 0) - (b.avg_score || 0);
            if (sort === 'quiz_desc') return (b.total_quizzes || 0) - (a.total_quizzes || 0);
            return new Date(b.created_at) - new Date(a.created_at);
        });

        if (users.length === 0) {
            els.usersList.innerHTML = `<div class="card" style="text-align:center"><p>User tidak ditemukan.</p></div>`;
            return;
        }

        els.usersList.innerHTML = users.map(u => {
            const activeBadge = u.active ?
                `<span class="item-badge badge-active">AKTIF</span>` :
                `<span class="item-badge badge-inactive">NONAKTIF</span>`;

            return `
            <div class="list-item">
                <div class="list-item-header">
                    <div>
                        <span class="item-title" style="font-size:1.1rem; margin-right:8px;">${escapeHtml(u.username)}</span>
                        ${activeBadge}
                    </div>
                    <span class="item-badge" style="background:${u.role === 'admin' ? 'purple' : '#ccc'}; color:#fff;">${escapeHtml(u.role)}</span>
                </div>
                <div style="font-size:0.9rem; color:#666; margin-bottom:8px;">${escapeHtml(u.nama_panjang || '-')}</div>
                <div style="font-size:0.85rem; color:#888; margin-bottom:12px;">
                    <div><i class="fas fa-envelope"></i> ${escapeHtml(u.email || '-')}</div>
                    <div><i class="fas fa-calendar"></i> Bergabung: ${new Date(u.created_at).toLocaleDateString()}</div>
                    <div><i class="fas fa-check-circle"></i> Kuis Selesai: ${u.total_quizzes}</div>
                    <div><i class="fas fa-star"></i> Rata-rata Skor: ${Math.round(u.avg_score)}%</div>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                    <button class="btn btn-secondary" style="font-size:0.8rem; flex:1;" onclick="handleResetAttempt(${u.id}, 1)">Reset Kuis 1</button>
                    <button class="btn btn-secondary" style="font-size:0.8rem; flex:1;" onclick="handleResetAttempt(${u.id}, 2)">Reset Kuis 2</button>
                    <button class="btn btn-secondary" style="font-size:0.8rem; flex:1;" onclick="handleResetAttempt(${u.id}, 3)">Reset Kuis 3</button>
                    <button class="btn btn-secondary" style="font-size:0.8rem; flex:1;" onclick="handleResetAttempt(${u.id}, 4)">Reset Kuis 4</button>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-secondary" style="font-size:0.8rem; flex:1;" onclick="openUserModal(${u.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-secondary" style="font-size:0.8rem; flex:1; color:var(--accent-danger); border-color:rgba(239,68,68,0.3);" onclick="handleDeleteUser(${u.id})">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            </div>
            `;
        }).join('');
    }

    // User Actions
    window.handleDeleteUser = async (id) => {
        if (!confirm('Yakin hapus user ini? Semua data kuis mereka akan hilang.')) return;
        showLoader('Menghapus...');
        try {
            const data = await apiAdminVercel('DELETE', `/api/admin/users?id=${id}`);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal hapus.');
            await loadUsers();
            setStatus('User dihapus.', 'ok');
        } catch (e) { alert('Error: ' + e.message); } finally { hideLoader(); }
    };

    window.handleResetAttempt = async (userId, quizSet) => {
        if (!confirm(`Reset attempt user ini untuk Kuis ${quizSet}? User bisa mengisi ulang.`)) return;
        showLoader('Mereset...');
        try {
            const data = await apiAdminVercel('POST', '/api/admin/users?action=resetAttempt', { user_id: userId, quiz_set: quizSet });
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal reset.');
            await loadUsers();
            setStatus('Attempt berhasil direset.', 'ok');
        } catch (e) { alert('Error: ' + e.message); } finally { hideLoader(); }
    };

    // User Modal
    window.openUserModal = (id = null) => {
        hideAllModalPanels();
        els.userModalPanel.classList.remove('hidden');
        showModalContainer();
        uiBack.open('admin-user');

        if (id) {
            const u = state.users.find(x => x.id === id);
            els.usrId.value = u.id;
            els.usrUsername.value = u.username;
            els.usrEmail.value = u.email || '';
            els.usrPassword.value = ''; // Don't show hash
            els.usrRole.value = u.role;
            els.usrActive.value = u.active ? 'true' : 'false';
        } else {
            els.userForm.reset();
            els.usrId.value = '';
            els.usrRole.value = 'user';
            els.usrActive.value = 'true';
        }
    };

    window.closeUserModal = (fromPop) => {
        hideAllModalPanels();
        if (els.modal) {
            els.modal.classList.remove('active');
            els.modal.setAttribute('aria-hidden', 'true');
        }
        if (!fromPop) uiBack.requestClose('admin-user');
    };

    els.userForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = els.usrId.value;
        const payload = {
            id: id,
            username: els.usrUsername.value,
            email: els.usrEmail.value,
            role: els.usrRole.value,
            active: els.usrActive.value === 'true',
            password: els.usrPassword.value // Optional
        };

        showLoader('Menyimpan User...');
        try {
            const action = id ? 'updateUser' : 'createUser';
            const data = await apiAdminVercel('POST', `/api/admin/questions?action=${action}`, payload);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal simpan user.');
            await loadUsers();
            closeUserModal();
            setStatus('User tersimpan.', 'ok');
        } catch (e) { alert('Error: ' + e.message); } finally { hideLoader(); }
    });

    els.addUserBtn?.addEventListener('click', () => openUserModal(null));

    // --- LOGS ---
    async function loadLogs() {
        showLoader('Memuat Log...');
        try {
            const data = await apiAdminVercel('GET', '/api/admin/questions?action=activityLogs');
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat log.');
            state.logs = data.logs || [];
            renderLogs();
        } catch (e) { console.error(e); } finally { hideLoader(); }
    }

    function renderLogs() {
        if (state.logs.length === 0) {
            els.logsList.innerHTML = `<div class="card" style="text-align:center"><p>Belum ada aktivitas.</p></div>`;
            return;
        }
        els.logsList.innerHTML = state.logs.map(l => {
            let detailsStr = '';
            try {
                if (typeof l.details === 'object') detailsStr = JSON.stringify(l.details, null, 2);
                else detailsStr = String(l.details);
            } catch { }
            return `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="item-title" style="font-size:1rem">${escapeHtml(l.action)}</span>
                    <span class="item-badge" style="background:#666; color:#fff;">${escapeHtml(l.admin_name || 'Admin')}</span>
                </div>
                <div style="font-size:0.85rem; color:#444; margin:4px 0; font-family:monospace; background:#f5f5f5; padding:4px; border-radius:4px; overflow-x:auto;">${escapeHtml(detailsStr)}</div>
                <div class="item-meta"><span><i class="fas fa-clock"></i> ${escapeHtml(l.created_at)}</span></div>
            </div>`;
        }).join('');
    }

    // --- SCHEDULES LOGIC ---
    async function loadSchedules() {
        showLoader('Memuat Jadwal...');
        try {
            const data = await apiAdminVercel('GET', '/api/admin/questions?action=schedules');
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat jadwal.');
            state.schedules = data.schedules || [];
            renderSchedules();
        } catch (e) { console.error(e); } finally { hideLoader(); }
    }

    function renderSchedules() {
        let schedules = [...state.schedules];

        // Date Filter
        const dateFilter = els.scheduleDateFilter?.value;
        if (dateFilter) {
            const filterDate = new Date(dateFilter).toDateString();
            schedules = schedules.filter(s => {
                if (!s.start_time) return false;
                return new Date(s.start_time).toDateString() === filterDate;
            });
        }

        if (schedules.length === 0) {
            els.schedulesList.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align:center; padding:40px;"><p>Belum ada jadwal kuis.</p></div>`;
            return;
        }

        els.schedulesList.innerHTML = schedules.map(s => {
            const start = s.start_time ? new Date(s.start_time).toLocaleString() : '';
            const end = s.end_time ? new Date(s.end_time).toLocaleString() : '';
            const now = Date.now();
            const startTime = s.start_time ? new Date(s.start_time).getTime() : 0;
            const endTime = s.end_time ? new Date(s.end_time).getTime() : 0;

            // Calculate initial countdown
            let cdText = "00 : 00 : 00 : 00";
            if (startTime > now) {
                // Future
                const diff = startTime - now;
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const sec = Math.floor((diff % (1000 * 60)) / 1000);
                cdText = `${String(d).padStart(2, '0')} : ${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(sec).padStart(2, '0')}`;
            } else if (endTime > now) {
                // Active
                cdText = "SEDANG BERLANGSUNG";
            } else {
                // Ended
                cdText = "SELESAI";
            }

            return `
            <div class="schedule-card-new" data-id="${s.id}" data-target="${startTime}">
                <div class="sc-header">
                    <input type="text" class="sc-title-edit" value="${escapeHtml(s.title)}" readonly onclick="editSchedule(${s.id})">
                    <div class="sc-countdown-preview">${cdText}</div>
                </div>
                <div class="sc-body">
                    <textarea class="sc-desc-edit" readonly onclick="editSchedule(${s.id})">${escapeHtml(s.description || '')}</textarea>
                    <div class="sc-time-range">
                        <span class="sc-time-label">WAKTU MULAI - SELESAI</span>
                        <div style="color:var(--text-primary); font-size:0.9rem;">
                            ${start} <span style="color:var(--text-secondary); margin:0 8px;">s/d</span> ${end}
                        </div>
                    </div>
                </div>
                <div class="sc-footer">
                    <button class="sc-btn sc-btn-del" onclick="deleteSchedule(${s.id})">Hapus</button>
                    <button class="sc-btn sc-btn-save" onclick="editSchedule(${s.id})">Edit Detail</button>
                </div>
            </div>`;
        }).join('');

        // Start Live Countdown Interval for Admin
        if (window.adminCdInterval) clearInterval(window.adminCdInterval);
        window.adminCdInterval = setInterval(() => {
            document.querySelectorAll('.schedule-card-new').forEach(card => {
                const target = Number(card.dataset.target);
                const preview = card.querySelector('.sc-countdown-preview');
                if (!target || !preview) return;

                const now = Date.now();
                if (target <= now) {
                    if (preview.textContent.includes(':')) preview.textContent = "SEDANG BERLANGSUNG";
                    return;
                }

                const diff = target - now;
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const sec = Math.floor((diff % (1000 * 60)) / 1000);
                preview.textContent = `${String(d).padStart(2, '0')} : ${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(sec).padStart(2, '0')}`;
            });
        }, 1000);
    }

    window.editSchedule = (id) => {
        const s = state.schedules.find(x => x.id === id);
        if (!s) return;
        els.schId.value = s.id;
        els.schTitle.value = s.title;
        els.schDesc.value = s.description || '';
        const toLocalISO = (d) => {
            if (!d) return '';
            const dt = new Date(d);
            dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
            return dt.toISOString().slice(0, 16);
        };
        els.schStart.value = toLocalISO(s.start_time);
        els.schEnd.value = toLocalISO(s.end_time);
        if (els.schShowQuiz) els.schShowQuiz.checked = s.show_in_quiz !== false;
        if (els.schShowNotif) els.schShowNotif.checked = !!s.show_in_notif;

        // Show Modal
        hideAllModalPanels();
        if (els.scheduleModalPanel) els.scheduleModalPanel.classList.remove('hidden');
        if (els.modalTitle) els.modalTitle.textContent = 'Edit Jadwal';
        showModalContainer();
        uiBack.open('admin-schedule');
    };

    window.deleteSchedule = async (id) => {
        if (!confirm('Yakin ingin menghapus jadwal ini?')) return;
        showLoader('Menghapus...');
        try {
            const data = await apiAdminVercel('POST', '/api/admin/questions?action=deleteSchedule', { id });
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menghapus.');
            setStatus('Jadwal dihapus', 'success');
            loadSchedules();
        } catch (e) {
            setStatus(e.message, 'error');
        } finally {
            hideLoader();
        }
    };

    // Admin Preview Logic (Mirrors quiz.js)
    function renderAdminPreview(schedules) {
        const titleEl = document.getElementById('admin-countdown-title');
        const clockEl = document.getElementById('admin-countdown-clock');
        if (!titleEl || !clockEl) return;

        // Reset
        titleEl.textContent = "Tidak ada event aktif/akan datang";
        clockEl.innerHTML = `<div style="font-size:0.9rem; color:#999;">(Menunggu Jadwal)</div>`;

        const now = Date.now();
        let target = null;
        let mode = '';

        // Active?
        const activeSch = schedules.find(s => {
            const start = new Date(s.start_time).getTime();
            const end = s.end_time ? new Date(s.end_time).getTime() : Infinity;
            return now >= start && now < end;
        });

        if (activeSch) {
            target = activeSch;
            mode = 'end';
        } else {
            // Next?
            const upcoming = schedules.filter(s => new Date(s.start_time).getTime() > now).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
            if (upcoming) {
                target = upcoming;
                mode = 'start';
            }
        }

        if (!target) return;

        titleEl.textContent = mode === 'start' ? `Segera Hadir: ${target.title}` : `Sedang Berlangsung: ${target.title}`;

        // Render Units
        clockEl.innerHTML = `
            ${createFlipUnitAdmin('Hari', 'd')}
            ${createFlipUnitAdmin('Jam', 'h')}
            ${createFlipUnitAdmin('Menit', 'm')}
            ${createFlipUnitAdmin('Detik', 's')}
        `;

        // Start Update Loop for Admin (clear previous if any)
        if (window.adminPreviewInterval) clearInterval(window.adminPreviewInterval);

        const update = () => {
            const now = Date.now();
            let diff = 0;
            if (mode === 'end') {
                const end = target.end_time ? new Date(target.end_time).getTime() : Infinity;
                diff = Math.max(0, end - now);
            } else {
                diff = Math.max(0, new Date(target.start_time).getTime() - now);
            }

            const s = Math.floor(diff / 1000);
            const d = Math.floor(s / 86400);
            const h = Math.floor((s % 86400) / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;

            updateFlipCardAdmin('d', d);
            updateFlipCardAdmin('h', h);
            updateFlipCardAdmin('m', m);
            updateFlipCardAdmin('s', sec);
        };

        update();
        window.adminPreviewInterval = setInterval(update, 1000);
    }

    function createFlipUnitAdmin(label, id) {
        return `
            <div class="flip-unit">
                <div class="flip-card" id="admin-flip-${id}">00</div>
                <div class="flip-label" style="font-size:0.6rem">${label}</div>
            </div>
        `;
    }

    function updateFlipCardAdmin(id, val) {
        const el = document.getElementById(`admin-flip-${id}`);
        if (el) el.innerText = String(val).padStart(2, '0');
    }

    function renderScheduleItem(s) {
        const start = s.start_time ? new Date(s.start_time).toLocaleString() : '';
        const end = s.end_time ? new Date(s.end_time).toLocaleString() : '';
        const now = Date.now();
        const startTime = s.start_time ? new Date(s.start_time).getTime() : 0;
        const endTime = s.end_time ? new Date(s.end_time).getTime() : 0;

        // Calculate initial countdown
        let cdText = "00 : 00 : 00 : 00";
        if (startTime > now) {
            // Future
            const diff = startTime - now;
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const sec = Math.floor((diff % (1000 * 60)) / 1000);
            cdText = `${String(d).padStart(2, '0')} : ${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(sec).padStart(2, '0')}`;
        } else if (endTime > now) {
            // Active
            cdText = "SEDANG BERLANGSUNG";
        } else {
            // Ended
            cdText = "SELESAI";
        }

        return `
        <div class="schedule-card-new" data-id="${s.id}" data-target="${startTime}">
            <div class="sc-header">
                <input type="text" class="sc-title-edit" value="${escapeHtml(s.title)}" readonly onclick="editSchedule(${s.id})">
                <div class="sc-countdown-preview">${cdText}</div>
            </div>
            <div class="sc-body">
                <textarea class="sc-desc-edit" readonly onclick="editSchedule(${s.id})">${escapeHtml(s.description || '')}</textarea>
                <div class="sc-time-range">
                    <span class="sc-time-label">WAKTU MULAI - SELESAI</span>
                    <div style="color:var(--text-primary); font-size:0.9rem;">
                        ${start} <span style="color:var(--text-secondary); margin:0 8px;">s/d</span> ${end}
                    </div>
                </div>
            </div>
            <div class="sc-footer">
                <button class="sc-btn sc-btn-del" onclick="deleteSchedule(${s.id})">Hapus</button>
                <button class="sc-btn sc-btn-save" onclick="editSchedule(${s.id})">Edit Detail</button>
            </div>
        </div>`;
    }

    // Add Schedule Button Logic
    if (els.addScheduleBtn) {
        els.addScheduleBtn.addEventListener('click', () => {
            els.schId.value = '';
            els.schTitle.value = '';
            els.schDesc.value = '';
            els.schStart.value = '';
            els.schEnd.value = '';

            const modal = document.getElementById('question-modal');
            if (modal) {
                modal.classList.remove('hidden');
                document.querySelectorAll('.modal-content > form, .modal-content > div').forEach(el => el.classList.add('hidden'));
                document.querySelector('.modal-tabs').classList.add('hidden');
                if (els.scheduleModalPanel) els.scheduleModalPanel.classList.remove('hidden');
                if (els.modalTitle) els.modalTitle.textContent = 'Tambah Jadwal';
            }
        });
    }

    // Preview Logic
    if (els.previewSchBtn) {
        els.previewSchBtn.addEventListener('click', () => {
            const title = els.schTitle.value || 'Judul Contoh';
            const desc = els.schDesc.value || 'Deskripsi singkat tentang kuis yang akan datang...';
            const start = els.schStart.value ? new Date(els.schStart.value).getTime() : Date.now() + 3600000;

            // Mock render next quiz card
            const html = `
            <div class="next-quiz-card">
                <div class="nq-header">
                    <i class="fas fa-hourglass-half"></i> Kuis Berikutnya
                </div>
                <h3 style="font-size:1.2rem; margin-bottom:8px;">${escapeHtml(title)}</h3>
                <p style="opacity:0.8; margin-bottom:12px; font-size:0.9rem;">${escapeHtml(desc)}</p>
                
                <div class="nq-timer-grid">
                    <div class="timer-unit">
                        <span class="timer-val">01</span>
                        <span class="timer-label">HARI</span>
                    </div>
                    <div class="timer-sep">:</div>
                    <div class="timer-unit">
                        <span class="timer-val">12</span>
                        <span class="timer-label">JAM</span>
                    </div>
                    <div class="timer-sep">:</div>
                    <div class="timer-unit">
                        <span class="timer-val">30</span>
                        <span class="timer-label">MENIT</span>
                    </div>
                    <div class="timer-sep">:</div>
                    <div class="timer-unit">
                        <span class="timer-val">00</span>
                        <span class="timer-label">DETIK</span>
                    </div>
                </div>
            </div>`;

            if (els.previewBox) els.previewBox.innerHTML = html;
            if (els.previewPanel) els.previewPanel.classList.remove('hidden');
        });
    }

    window.closeScheduleModal = (fromPop) => {
        hideAllModalPanels();
        if (els.modal) {
            els.modal.classList.remove('active');
            els.modal.setAttribute('aria-hidden', 'true');
        }
        const tabs = document.querySelector('.modal-tabs');
        if (tabs) tabs.classList.remove('hidden'); // Restore tabs
        if (!fromPop) uiBack.requestClose('admin-schedule');
    };

    // --- HELPER: Modal Panel Switcher ---
    function showModalContainer() {
        if (els.modal) {
            els.modal.classList.remove('hidden');
            els.modal.classList.add('active');
            els.modal.setAttribute('aria-hidden', 'false');
        }
    }

    function hideAllModalPanels() {
        if (els.userModalPanel) els.userModalPanel.classList.add('hidden');
        if (els.scheduleModalPanel) els.scheduleModalPanel.classList.add('hidden');
        if (els.questionForm) {
            // questionForm is a form element, so we can't just hide it if it's the main container?
            // In my new HTML, question-form wraps modal-body.
            // I should hide the form itself.
            els.questionForm.classList.add('hidden');
        }
        // Also hide tabs if not question
        const tabs = document.querySelector('.modal-tabs');
        if (tabs) tabs.classList.add('hidden');

        const preview = document.getElementById('preview-panel');
        if (preview) preview.classList.add('hidden');
    }

    // --- MODAL QUESTION LOGIC ---
    window.openQuestionModal = (q = null) => {
        hideAllModalPanels();
        if (els.questionForm) els.questionForm.classList.remove('hidden');

        // Hide tabs for cleaner ergonomic form
        const tabs = document.querySelector('.modal-tabs');
        if (tabs) tabs.classList.add('hidden');

        if (q) {
            els.modalTitle.textContent = 'Edit Soal';
            els.qId.value = q.id;
            els.qQuestion.value = q.question;
            els.qA.value = q.options.a;
            els.qB.value = q.options.b;
            els.qC.value = q.options.c;
            els.qD.value = q.options.d;

            // Set radio for correct answer
            const radios = document.querySelectorAll('input[name="correct_answer"]');
            radios.forEach(r => { r.checked = (r.value === q.correct_answer); });

            els.qActive.value = q.active ? 'true' : 'false';
            els.qCategory.value = q.category || 'Umum';
            els.qQuizSet.value = q.quiz_set || 1;
        } else {
            els.modalTitle.textContent = 'Tambah Soal';
            els.questionForm.reset();
            els.qId.value = '';
            els.qActive.value = 'true';
            document.getElementById('radio-a').checked = true; // Default A

            // Restore draft logic...
            try {
                const draft = localStorage.getItem(STORAGE_KEYS.draft);
                if (draft) {
                    const d = JSON.parse(draft);
                    if (d && Date.now() - d.ts < 24 * 60 * 60 * 1000 && confirm('Lanjutkan edit soal terakhir?')) {
                        els.qQuestion.value = d.question || '';
                        els.qA.value = d.options?.a || '';
                        els.qB.value = d.options?.b || '';
                        els.qC.value = d.options?.c || '';
                        els.qD.value = d.options?.d || '';
                    } else localStorage.removeItem(STORAGE_KEYS.draft);
                }
            } catch { }
        }
        showModalContainer();
        uiBack.open('admin-question');
    };

    function closeModal(fromPop) {
        hideAllModalPanels();
        if (els.modal) {
            els.modal.classList.remove('active');
            els.modal.setAttribute('aria-hidden', 'true');
        }
        els.questionForm.reset();
        els.qId.value = '';
        if (!fromPop) uiBack.requestClose('admin-question');
    }
    window.closeQuestionModal = closeModal;

    async function handleSave(addMore = false) {
        if (!els.questionForm.checkValidity()) { els.questionForm.reportValidity(); return; }
        const id = els.qId.value;

        // Get correct answer from radio
        const selectedRadio = document.querySelector('input[name="correct_answer"]:checked');
        const correctVal = selectedRadio ? selectedRadio.value : 'a';

        const payload = {
            id: id || undefined,
            question: els.qQuestion.value,
            options: { a: els.qA.value, b: els.qB.value, c: els.qC.value, d: els.qD.value },
            correct_answer: correctVal,
            active: els.qActive.value === 'true',
            category: els.qCategory.value,
            quiz_set: Number(els.qQuizSet.value)
        };

        const btn = addMore ? els.saveAddBtn : els.saveBtn;
        if (btn) btn.classList.add('loading');
        showLoader('Menyimpan...');

        try {
            const action = id ? 'update' : 'create';
            const data = await apiAdminVercel('POST', `/api/admin/questions?action=${action}`, payload);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menyimpan.');
            await loadQuestions(paging.qPage);
            localStorage.removeItem(STORAGE_KEYS.draft);
            if (addMore) {
                const cat = els.qCategory.value;
                const set = els.qQuizSet.value;
                els.questionForm.reset();
                els.qCategory.value = cat;
                els.qQuizSet.value = set;
                els.qActive.value = 'true';
                els.qId.value = '';
                document.getElementById('radio-a').checked = true;
                els.modalTitle.textContent = 'Tambah Soal';
                setStatus('Soal tersimpan. Silakan tambah lagi.', 'ok');
            } else {
                closeModal();
                setStatus('Soal berhasil disimpan.', 'ok');
            }
        } catch (e) { alert('Gagal menyimpan: ' + e.message); }
        finally {
            hideLoader();
            if (btn) btn.classList.remove('loading');
        }
    }

    async function handleDelete(id) {
        if (!confirm('Yakin hapus soal ini?')) return;
        showLoader('Menghapus...');
        try {
            const data = await apiAdminVercel('POST', `/api/admin/questions?action=delete`, { id: id });
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menghapus.');
            await loadQuestions(paging.qPage);
            setStatus('Soal dihapus.', 'ok');
        } catch (e) { setStatus('Error: ' + e.message, 'error'); } finally { hideLoader(); }
    }

    async function handleToggleStatus(id, currentStatus) {
        // Toggle the boolean
        const newStatus = !currentStatus;

        // Optimistic UI Update (optional, but good for perceived speed)
        // Note: For now we'll wait for server response to be safe, or show loader.
        showLoader('Mengupdate Status...');

        try {
            // We use the 'update' action but only send the fields we want to change
            // However, the backend might expect full object or we need a specific 'toggle' action.
            // Let's check api/admin_handler.js. Usually 'update' merges or replaces.
            // If 'update' replaces, we need full data. If we don't have full data handy (we do in state), we can use it.

            const q = state.questions.find(x => x.id === id);
            if (!q) throw new Error('Soal tidak ditemukan di state lokal.');

            const payload = {
                id: q.id,
                question: q.question,
                options: q.options,
                correct_answer: q.correct_answer,
                category: q.category,
                quiz_set: q.quiz_set,
                active: newStatus // The only change
            };

            const data = await apiAdminVercel('POST', `/api/admin/questions?action=update`, payload);

            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal update status.');

            // Update local state and re-render to reflect change
            q.active = newStatus;
            renderQuestions(); // Re-render the grid
            setStatus(`Status soal diubah ke ${newStatus ? 'AKTIF' : 'NONAKTIF'}`, 'ok');

        } catch (e) {
            setStatus('Error: ' + e.message, 'error');
        } finally {
            hideLoader();
        }
    }

    // --- EVENT LISTENERS ---
    function initEvents() {
        // Auth
        els.togglePasswordBtn?.addEventListener('click', () => {
            const type = els.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            els.passwordInput.setAttribute('type', type);
            els.togglePasswordBtn.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
        els.adminLoginBtn?.addEventListener('click', async () => {
            const u = els.usernameInput.value;
            const p = els.passwordInput.value;
            if (!u || !p) return alert('Username dan Password wajib diisi');
            showLoader('Login...');
            try {
                await loginVercel(u, p);
                state.adminToken = els.adminTokenInput?.value || '';
                setConnected(true);
            } catch (e) { setStatus(e.message, 'error'); } finally { hideLoader(); }
        });

        // Logout
        const logout = () => {
            if (!confirm('Yakin ingin keluar?')) return;
            state.session = '';
            state.adminToken = '';
            sessionStorage.removeItem(SESSION_KEYS.session);
            setConnected(false);
            els.usernameInput.value = '';
            els.passwordInput.value = '';
        };
        els.logoutBtn?.addEventListener('click', logout);
        els.sidebarLogout?.addEventListener('click', logout);
        els.menuLogoutBtn?.addEventListener('click', logout);

        // Nav
        const handleNav = (tab) => activateTab(tab);
        els.bottomNav?.addEventListener('click', (e) => {
            const btn = e.target.closest('.nav-item');
            if (btn && btn.dataset.tab) handleNav(btn.dataset.tab);
            if (btn && btn.id === 'nav-more') window.openMenuModal();
        });

        els.sidebarNav?.addEventListener('click', (e) => {
            const btn = e.target.closest('.nav-item');
            if (btn && btn.dataset.tab) handleNav(btn.dataset.tab);
        });

        // Theme
        els.themeToggle?.addEventListener('click', toggleTheme);
        els.menuThemeToggle?.addEventListener('click', () => { toggleTheme(); closeMenuModal(); });

        // Mobile Menu
        window.openMenuModal = () => {
            if (!els.menuModal) return;
            els.menuModal.classList.remove('hidden');
            els.menuModal.classList.add('active');
            els.menuModal.setAttribute('aria-hidden', 'false');
            uiBack.open('admin-menu');
        };
        window.closeMenuModal = (fromPop) => {
            if (!els.menuModal) return;
            els.menuModal.classList.remove('active');
            els.menuModal.setAttribute('aria-hidden', 'true');
            if (!fromPop) uiBack.requestClose('admin-menu');
        };
        uiBack.register('admin-menu', window.closeMenuModal);

        // FAB
        els.fabAdd?.addEventListener('click', () => window.openQuestionModal(null));

        // Question Actions
        els.questionsList?.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const item = btn.closest('.q-card'); // Updated selector for new card design
            if (!item) return;
            const id = Number(item.dataset.id);
            const q = state.questions.find(x => x.id === id);

            if (btn.dataset.action === 'edit' && q) window.openQuestionModal(q);
            else if (btn.dataset.action === 'delete') handleDelete(id);
        });
        els.questionsList?.addEventListener('change', (e) => {
            const input = e.target.closest('input[data-action="toggle-status"]');
            if (!input) return;
            const item = input.closest('.q-card');
            if (!item) return;
            const id = Number(item.dataset.id);
            const q = state.questions.find(x => x.id === id);
            if (!q) return;
            handleToggleStatus(id, q.active);
        });

        // Modal
        els.modalCloseBtn?.addEventListener('click', closeModal);
        els.saveBtn?.addEventListener('click', (e) => { e.preventDefault(); handleSave(false); });
        els.saveAddBtn?.addEventListener('click', (e) => { e.preventDefault(); handleSave(true); });
        uiBack.register('admin-question', closeModal);
        uiBack.register('admin-user', window.closeUserModal);
        uiBack.register('admin-schedule', window.closeScheduleModal);

        // Filters
        els.searchInput?.addEventListener('input', debounce(() => loadQuestions(1), 500));
        els.quizSetFilter?.addEventListener('change', () => loadQuestions(1));
        els.categoryFilter?.addEventListener('change', () => loadQuestions(1));

        // Pagination
        els.qPrev?.addEventListener('click', () => { if (paging.qPage > 1) loadQuestions(paging.qPage - 1); });
        els.qNext?.addEventListener('click', () => loadQuestions(paging.qPage + 1));
        els.refreshResultsBtn?.addEventListener('click', loadResults);
        els.rPrev?.addEventListener('click', () => { if (paging.rPage > 1) { paging.rPage--; renderResults(); } });
        els.rNext?.addEventListener('click', () => { paging.rPage++; renderResults(); });

        // Users
        els.refreshUsersBtn?.addEventListener('click', loadUsers);
        els.userSearchInput?.addEventListener('input', debounce(() => renderUsers(), 300));
        els.userSortSelect?.addEventListener('change', () => renderUsers());
        els.userStatusFilter?.addEventListener('change', () => renderUsers());
        els.refreshLogsBtn?.addEventListener('click', loadLogs);


        // Admin Broadcast Notification
        if (els.notifyForm) {
            els.notifyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = String(els.notifyTitle?.value || '').trim();
                const message = String(els.notifyMessage?.value || '').trim();
                const url = String(els.notifyUrl?.value || '').trim() || '/';
                const save = !!(els.notifySave && els.notifySave.checked);
                const target = String(els.notifyTarget?.value || 'all');
                const scheduleAtRaw = String(els.notifySchedule?.value || '').trim();

                if (!title && !message) {
                    if (els.notifyStatus) els.notifyStatus.textContent = 'Judul atau pesan wajib diisi.';
                    return;
                }

                let scheduleIso = '';
                if (scheduleAtRaw) {
                    const dt = new Date(scheduleAtRaw);
                    if (Number.isNaN(dt.getTime())) {
                        if (els.notifyStatus) els.notifyStatus.textContent = 'Waktu jadwal tidak valid.';
                        return;
                    }
                    scheduleIso = dt.toISOString();
                }

                if (els.notifySendBtn) {
                    els.notifySendBtn.disabled = true;
                    els.notifySendBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${scheduleIso ? 'Menjadwalkan...' : 'Mengirim...'}`;
                }
                if (els.notifyStatus) els.notifyStatus.textContent = scheduleIso ? 'Menyimpan jadwal notifikasi...' : 'Mengirim notifikasi...';

                try {
                    const payload = { title, message, url, save, target };
                    if (scheduleIso) {
                        payload.schedule_at = scheduleIso;
                        await apiAdminVercel('POST', '/api/admin/questions?action=scheduleNotification', payload);
                        if (els.notifyStatus) els.notifyStatus.textContent = 'Jadwal notifikasi tersimpan.';
                        if (window.Toast) Toast.show('Notifikasi dijadwalkan', 'success');
                        loadNotifySchedules();
                    } else {
                        await apiAdminVercel('POST', '/api/admin/questions?action=broadcastNotification', payload);
                        if (els.notifyStatus) els.notifyStatus.textContent = 'Notifikasi berhasil dikirim.';
                        if (window.Toast) Toast.show('Notifikasi terkirim', 'success');
                    }
                    if (els.notifyTitle) els.notifyTitle.value = '';
                    if (els.notifyMessage) els.notifyMessage.value = '';
                    if (els.notifyUrl) els.notifyUrl.value = '';
                    if (els.notifySchedule) els.notifySchedule.value = '';
                } catch (e) {
                    if (els.notifyStatus) els.notifyStatus.textContent = `Gagal: ${e.message || 'Error'}`;
                    if (window.Toast) Toast.show('Gagal mengirim notifikasi', 'error');
                } finally {
                    if (els.notifySendBtn) {
                        els.notifySendBtn.disabled = false;
                        els.notifySendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim';
                    }
                }
            });
        }

        els.notifyScheduleReload?.addEventListener('click', (e) => {
            e.preventDefault();
            loadNotifySchedules();
        });

        const renderNotifyPreview = () => {
            if (!els.notifyPreviewBox) return;
            const title = String(els.notifyTitle?.value || '').trim() || 'Notifikasi IPM';
            const message = String(els.notifyMessage?.value || '').trim() || 'Contoh isi notifikasi akan tampil di sini.';
            const targetLabel = els.notifyTarget?.value?.startsWith('pimpinan:') ? 'Grup Pimpinan' : 'Semua User';
            const now = new Date();
            const timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            els.notifyPreviewBox.innerHTML = `
                <div class="lockscreen-preview">
                    <div class="lockscreen-meta">
                        <span class="lockscreen-app">PC IPM Panawuan</span>
                        <span class="lockscreen-time">${timeLabel}</span>
                    </div>
                    <div class="lockscreen-card">
                        <div class="lockscreen-title">${escapeHtml(title)}</div>
                        <div class="lockscreen-body">${escapeHtml(message)}</div>
                        <div class="lockscreen-footer">${escapeHtml(targetLabel)}</div>
                    </div>
                </div>
            `;
        };

        els.notifyPreviewBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            renderNotifyPreview();
            els.notifyPreviewBox?.classList.toggle('hidden');
        });

        els.notifyScheduleRun?.addEventListener('click', async (e) => {
            e.preventDefault();
            if (els.notifyStatus) els.notifyStatus.textContent = 'Menjalankan jadwal...';
            try {
                const data = await apiAdminVercel('GET', '/api/admin/questions?action=runScheduledNotifications');
                if (els.notifyStatus) {
                    const sent = data?.sent ?? 0;
                    const failed = data?.failed ?? 0;
                    els.notifyStatus.textContent = `Jadwal dijalankan. Terkirim: ${sent}, Gagal: ${failed}`;
                }
                if (window.Toast) Toast.show('Jadwal dijalankan', 'success');
                loadNotifySchedules();
            } catch (err) {
                if (els.notifyStatus) els.notifyStatus.textContent = `Gagal: ${err.message || 'Error'}`;
                if (window.Toast) Toast.show('Gagal menjalankan jadwal', 'error');
            }
        });

        els.notifyScheduleList?.addEventListener('click', async (e) => {
            const btn = e.target.closest('.notify-schedule-delete');
            if (!btn) return;
            const id = Number(btn.dataset.id || 0);
            if (!id) return;
            try {
                await apiAdminVercel('POST', '/api/admin/questions?action=deleteScheduledNotification', { id });
                if (window.Toast) Toast.show('Jadwal dihapus', 'success');
                loadNotifySchedules();
            } catch (err) {
                if (window.Toast) Toast.show('Gagal menghapus jadwal', 'error');
            }
        });

        // Schedules
        els.addScheduleBtn?.addEventListener('click', () => {
            els.scheduleForm.reset();
            els.schId.value = '';
            if (els.schShowQuiz) els.schShowQuiz.checked = true;
            if (els.schShowNotif) els.schShowNotif.checked = false;
            // Set default dates if needed
            // const now = new Date();
            // const nextHour = new Date(now.getTime() + 60*60*1000);
            // els.schStart.value = nextHour.toISOString().slice(0,16);

            document.getElementById('modal-title').textContent = 'Tambah Jadwal Event';
            hideAllModalPanels();
            if (els.scheduleModalPanel) els.scheduleModalPanel.classList.remove('hidden');
            showModalContainer();
            uiBack.open('admin-schedule');
        });

        if (els.scheduleForm) {
            els.scheduleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = els.schId.value;
                const title = els.schTitle.value;
                const description = els.schDesc.value;
                const start = els.schStart.value;
                const end = els.schEnd.value;
                const showInQuiz = els.schShowQuiz ? els.schShowQuiz.checked : true;
                const showInNotif = els.schShowNotif ? els.schShowNotif.checked : false;

                showLoader('Menyimpan...');
                try {
                    const data = await apiAdminVercel('POST', '/api/admin/questions?action=updateSchedule', {
                        id: id ? Number(id) : undefined,
                        title,
                        description,
                        start_time: start ? new Date(start).toISOString() : null,
                        end_time: end ? new Date(end).toISOString() : null,
                        show_in_quiz: showInQuiz,
                        show_in_notif: showInNotif
                    });

                    if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menyimpan.');
                    setStatus('Jadwal tersimpan', 'success');
                    window.closeScheduleModal();
                    loadSchedules();
                } catch (e) {
                    setStatus(e.message, 'error');
                } finally {
                    hideLoader();
                }
            });

            // PREVIEW BUTTON IN MODAL
            document.getElementById('preview-sch-btn')?.addEventListener('click', () => {
                const title = els.schTitle.value || 'Judul Event';
                const start = els.schStart.value ? new Date(els.schStart.value).getTime() : Date.now() + 3600000;
                const end = els.schEnd.value ? new Date(els.schEnd.value).getTime() : Date.now() + 7200000;
                const now = Date.now();

                let mode = 'start';
                let diff = 0;
                let label = '';

                if (now >= start && now < end) {
                    mode = 'end';
                    diff = end - now;
                    label = `Sedang Berlangsung: ${title}`;
                } else if (now < start) {
                    mode = 'start';
                    diff = start - now;
                    label = `Segera Hadir: ${title}`;
                } else {
                    label = `Event Selesai: ${title}`;
                    diff = 0;
                }

                // Show in a mini-popup or alert?
                // The HTML has a #preview-panel overlay already for questions, let's reuse/adapt it or just show alert for now to keep it simple?
                // Actually admin.html has a specific #preview-panel inside #schedule-modal-panel!
                // Let's use that.

                const panel = document.querySelector('#schedule-modal-panel #schedule-preview-panel');
                const box = document.querySelector('#schedule-modal-panel #schedule-preview-box');
                if (panel && box) {
                    panel.classList.remove('hidden');

                    // Simple Static Preview Generation
                    const s = Math.floor(diff / 1000);
                    const d = Math.floor(s / 86400);
                    const h = Math.floor((s % 86400) / 3600);
                    const m = Math.floor((s % 3600) / 60);
                    const sec = s % 60;

                    box.innerHTML = `
                        <div class="hero-countdown-container" style="background:transparent; zoom:0.8;">
                             <div class="hero-countdown-title" style="color:white;">${label}</div>
                             <div class="flip-clock">
                                <div class="flip-unit"><div class="flip-card">${String(d).padStart(2, '0')}</div><div class="flip-label" style="color:#ddd">Hari</div></div>
                                <div class="flip-unit"><div class="flip-card">${String(h).padStart(2, '0')}</div><div class="flip-label" style="color:#ddd">Jam</div></div>
                                <div class="flip-unit"><div class="flip-card">${String(m).padStart(2, '0')}</div><div class="flip-label" style="color:#ddd">Menit</div></div>
                                <div class="flip-unit"><div class="flip-card">${String(sec).padStart(2, '0')}</div><div class="flip-label" style="color:#ddd">Detik</div></div>
                             </div>
                             <div style="margin-top:20px; color:#ccc; font-size:0.9rem;">
                                *Preview ini adalah simulasi tampilan saat ini.
                             </div>
                        </div>
                    `;
                }
            });
        }

        els.scheduleDateFilter?.addEventListener('change', renderSchedules);

        els.globalResetBtn?.addEventListener('click', async () => {
            const set = els.resetSetSelect.value;
            if (!confirm(`PERINGATAN KERAS:\nAnda akan menghapus SEMUA data jawaban user untuk Kuis Set ${set}.\nKetik "RESET" untuk konfirmasi.`)) return;
            const verification = prompt('Ketik "RESET" untuk melanjutkan:');
            if (verification !== 'RESET') return alert('Batal.');
            showLoader('Mereset Global...');
            try {
                const data = await apiAdminVercel('POST', '/api/admin/questions?action=resetSet', { quiz_set: set });
                if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal reset.');
                setStatus(`Kuis Set ${set} berhasil direset total.`, 'ok');
            } catch (e) { alert('Error: ' + e.message); } finally { hideLoader(); }
        });

        // Gamification Save
        els.gmSaveBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            saveGamificationSettings();
        });

        const addPimpinan = () => {
            if (!els.pimpinanInput) return;
            const value = String(els.pimpinanInput.value || '').trim();
            if (!value) return;
            const exists = state.pimpinanOptions.some(item => item.toLowerCase() === value.toLowerCase());
            if (exists) {
                if (els.pimpinanStatus) {
                    els.pimpinanStatus.textContent = 'Pilihan sudah ada.';
                    els.pimpinanStatus.className = 'status warning';
                }
                return;
            }
            state.pimpinanOptions.push(value);
            els.pimpinanInput.value = '';
            renderPimpinanOptions();
            renderNotifyTargets();
            if (els.pimpinanStatus) {
                els.pimpinanStatus.textContent = '';
                els.pimpinanStatus.className = 'status';
            }
        };

        els.pimpinanAddBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            addPimpinan();
        });
        els.pimpinanInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addPimpinan();
            }
        });
        els.pimpinanList?.addEventListener('click', (e) => {
            const btn = e.target.closest('.chip-remove');
            if (!btn) return;
            const idx = Number(btn.dataset.index);
            if (Number.isNaN(idx)) return;
            state.pimpinanOptions.splice(idx, 1);
            renderPimpinanOptions();
            renderNotifyTargets();
        });
        els.pimpinanSaveBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            savePimpinanOptions();
        });
    }

    // --- INIT ---
    function init() {
        console.log('[Admin] Init...');
        initEls();
        loadPrefs();
        initTheme();
        initEvents();

        const sess = sessionStorage.getItem(SESSION_KEYS.session);
        if (sess) {
            state.session = sess;
            setConnected(true);
        } else {
            setConnected(false);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { try { init(); } catch (e) { console.error('Init failed', e); } });
    } else {
        try { init(); } catch (e) { console.error('Init failed', e); }
    }
})();

