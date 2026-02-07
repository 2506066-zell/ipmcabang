(() => {
    const DEFAULT_API_URL = '/api';

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
        connected: false,
        prefs: { tab: 'dashboard', search: '', status: 'all', set: 'all', category: 'all' },
        backend: 'vercel',
        adminToken: '',
    };
    let modalDirty = false;

    // --- HELPER ---
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
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
            addScheduleBtn: document.getElementById('add-schedule-btn'),
            scheduleModalPanel: document.getElementById('schedule-modal-panel'),
            scheduleForm: document.getElementById('schedule-form'),
            scheduleDateFilter: document.getElementById('schedule-date-filter'),
            schId: document.getElementById('sch-id'),
            schTitle: document.getElementById('sch-title'),
            schDesc: document.getElementById('sch-desc'),
            schStart: document.getElementById('sch-start'),
            schEnd: document.getElementById('sch-end'),
            previewSchBtn: document.getElementById('preview-sch-btn'),
            previewPanel: document.getElementById('preview-panel'),
            previewBox: document.getElementById('preview-box'),
            
            // Global Reset
            resetSetSelect: document.getElementById('reset-set-select'),
            globalResetBtn: document.getElementById('global-reset-btn'),

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
            qCorrect: document.getElementById('q-correct'),
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
            try { data = await response.json(); } catch {}
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
        const body = { username: String(uname||'').trim(), password: String(pwd||'') };
        const data = await fetchJson(resolveApiUrl('/api/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!data || data.status !== 'success' || !data.session) throw new Error(data?.message || 'Login gagal');
        if (String(data.role||'') !== 'admin') throw new Error('Akun bukan admin');
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
        } catch {}
    }
    function savePrefs() {
        try { localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(state.prefs)); } catch {}
    }

    // --- NAVIGATION ---
    window.activateTab = function(tabName) {
        // Handle Sidebar & Bottom Nav active state
        const allNavs = [...(els.navItems || [])];
        allNavs.forEach(item => {
            if (item.dataset.tab === tabName) item.classList.add('active');
            else item.classList.remove('active');
        });
        
        // Hide all tabs
        ['dashboard', 'questions', 'results', 'users', 'logs', 'schedules'].forEach(t => {
            const el = document.getElementById(`tab-${t}`);
            if (el) el.classList.add('hidden');
        });
        
        // Show active tab
        const activeEl = document.getElementById(`tab-${tabName}`);
        if (activeEl) activeEl.classList.remove('hidden');
        
        // Update Title
        if (els.pageTitle) els.pageTitle.textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1);
        
        // Toggle FAB
        if (els.fabAdd) els.fabAdd.classList.toggle('hidden', tabName !== 'questions');
        
        state.prefs.tab = tabName;
        savePrefs();
        
        // Load Data
        if (tabName === 'dashboard') loadDashboard();
        if (tabName === 'questions' && state.questions.length === 0) loadQuestions();
        if (tabName === 'results' && state.results.length === 0) loadResults();
        if (tabName === 'users' && state.users.length === 0) loadUsers();
        if (tabName === 'logs' && state.logs.length === 0) loadLogs();
        if (tabName === 'schedules' && state.schedules.length === 0) loadSchedules();
    };

    // --- DASHBOARD LOGIC ---
    async function loadDashboard() {
        // Parallel fetch for stats
        try {
            const [usersData, questionsData, logsData, schedulesData, resultsData] = await Promise.all([
                apiAdminVercel('GET', '/api/admin/questions?action=usersExtended'),
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

    // --- QUESTIONS LOGIC ---
    async function loadCategories() {
        try {
            const data = await apiGetVercel('/api/questions?mode=categories');
            if (data && data.status === 'success') {
                state.categories = data.categories || [];
                renderCategoryFilter();
            }
        } catch {}
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
                const setLabel = setNum === 1 ? 'Kuis 1' : (setNum === 2 ? 'Kuis 2' : 'Kuis 3');
                const badgeClass = q.active ? 'badge-active' : 'badge-inactive';
                const activeLabel = q.active ? 'AKTIF' : 'NONAKTIF';
                
                return `
                <div class="list-item" data-id="${q.id}">
                    <div class="list-item-header">
                        <span class="item-badge" style="background:rgba(59, 130, 246, 0.15); color:var(--accent-secondary); border:1px solid rgba(59, 130, 246, 0.2);">${escapeHtml(setLabel)}</span>
                        <span class="item-badge ${badgeClass}">${activeLabel}</span>
                    </div>
                    <div class="item-title">${escapeHtml(q.question)}</div>
                    <div class="item-meta">
                        <span><i class="fas fa-tag"></i> ${escapeHtml(q.category || 'Umum')}</span>
                        <span><i class="fas fa-check-circle"></i> Kunci: ${escapeHtml((q.correct_answer||'').toUpperCase())}</span>
                    </div>
                    <div class="actions" style="margin-top:16px; display:flex; gap:12px;">
                        <button class="btn btn-secondary" style="flex:1; height:40px; font-size:0.9rem;" data-action="edit"><i class="fas fa-pen"></i> Edit</button>
                        <button class="btn btn-secondary" style="flex:1; height:40px; font-size:0.9rem; color:var(--accent-danger); border-color:rgba(239,68,68,0.3);" data-action="delete"><i class="fas fa-trash"></i> Hapus</button>
                    </div>
                </div>
                `;
            }).join('');
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
        let url = `/api/questions?page=${page}&size=${paging.qSize}`;
        if (q) url += `&search=${encodeURIComponent(q)}`;
        if (set && set !== 'all') url += `&set=${set}`;
        if (cat && cat !== 'all') url += `&category=${encodeURIComponent(cat)}`;

        try {
            const data = await apiGetVercel(url);
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
            const data = await apiAdminVercel('GET', '/api/admin/questions?action=usersExtended');
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
            const data = await apiAdminVercel('POST', '/api/admin/questions?action=deleteUser', { user_id: id });
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal hapus.');
            await loadUsers();
            setStatus('User dihapus.', 'ok');
        } catch (e) { alert('Error: ' + e.message); } finally { hideLoader(); }
    };

    window.handleResetAttempt = async (userId, quizSet) => {
        if (!confirm(`Reset attempt user ini untuk Kuis ${quizSet}? User bisa mengisi ulang.`)) return;
        showLoader('Mereset...');
        try {
            const data = await apiAdminVercel('POST', '/api/admin/questions?action=resetAttempt', { user_id: userId, quiz_set: quizSet });
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
    
    window.closeUserModal = () => {
        els.userModalPanel.classList.add('hidden');
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
            } catch {}
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
            const start = s.start_time ? new Date(s.start_time).toLocaleString() : '-';
            const end = s.end_time ? new Date(s.end_time).toLocaleString() : '-';
            const isActive = s.active; // Assuming active is boolean
            const statusClass = isActive ? 'status-active' : 'status-inactive';
            const statusText = isActive ? 'AKTIF' : 'NONAKTIF';

            return `
            <div class="schedule-card">
                <div class="schedule-status ${statusClass}">${statusText}</div>
                <div class="schedule-content">
                    <div class="schedule-title">${escapeHtml(s.title)}</div>
                    <div class="schedule-desc" style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                        ${escapeHtml(s.description || '-')}
                    </div>
                    <div class="schedule-time-grid">
                        <div class="time-row">
                            <i class="fas fa-play-circle"></i>
                            <span class="time-value">${start}</span>
                        </div>
                        <div class="time-row">
                            <i class="fas fa-stop-circle"></i>
                            <span class="time-value">${end}</span>
                        </div>
                    </div>
                    <div class="schedule-actions">
                        <button class="btn-schedule btn-edit" onclick="editSchedule(${s.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-schedule btn-delete" onclick="deleteSchedule(${s.id})">
                            <i class="fas fa-trash"></i> Hapus
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
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
        
        // Show Modal
        hideAllModalPanels();
        if (els.scheduleModalPanel) els.scheduleModalPanel.classList.remove('hidden');
        if (els.modalTitle) els.modalTitle.textContent = 'Edit Jadwal';
        showModalContainer();
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
            <div class="next-quiz-card" style="background:var(--card-bg); border-radius:12px; padding:20px; border:1px solid var(--border-color); color:var(--text-primary);">
                <div class="nq-header" style="display:flex; align-items:center; gap:8px; margin-bottom:12px; font-weight:bold; color:var(--accent-primary);">
                    <i class="fas fa-hourglass-half"></i> Kuis Berikutnya
                </div>
                <h3 style="font-size:1.2rem; margin-bottom:8px;">${escapeHtml(title)}</h3>
                <p style="opacity:0.8; margin-bottom:16px; font-size:0.9rem;">${escapeHtml(desc)}</p>
                <div class="nq-timer" style="display:flex; gap:8px; justify-content:center; margin-bottom:16px;">
                    <div style="background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:8px; text-align:center;"><span style="display:block; font-size:1.5rem; font-weight:bold;">01</span><small>Jam</small></div>
                    <div style="font-size:1.5rem; font-weight:bold; padding-top:4px;">:</div>
                    <div style="background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:8px; text-align:center;"><span style="display:block; font-size:1.5rem; font-weight:bold;">30</span><small>Mnt</small></div>
                    <div style="font-size:1.5rem; font-weight:bold; padding-top:4px;">:</div>
                    <div style="background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:8px; text-align:center;"><span style="display:block; font-size:1.5rem; font-weight:bold;">00</span><small>Dtk</small></div>
                </div>
            </div>`;
            
            if (els.previewBox) els.previewBox.innerHTML = html;
            if (els.previewPanel) els.previewPanel.classList.remove('hidden');
        });
    }

    window.closeScheduleModal = () => {
        const modal = document.getElementById('question-modal');
        if (modal) modal.classList.add('hidden');
        document.querySelector('.modal-tabs').classList.remove('hidden'); // Restore tabs
    };

    if (els.scheduleForm) {
        els.scheduleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = els.schId.value;
            const title = els.schTitle.value;
            const description = els.schDesc.value;
            const start = els.schStart.value;
            const end = els.schEnd.value;
            
            showLoader('Menyimpan...');
            try {
                const data = await apiAdminVercel('POST', '/api/admin/questions?action=updateSchedule', {
                    id: id ? Number(id) : undefined,
                    title,
                    description,
                    start_time: start ? new Date(start).toISOString() : null,
                    end_time: end ? new Date(end).toISOString() : null
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

    // --- HELPER: Modal Panel Switcher ---
    function showModalContainer() {
        if (els.modal) {
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
    function openModal(q = null) {
        hideAllModalPanels();
        if (els.questionForm) els.questionForm.classList.remove('hidden');
        const tabs = document.querySelector('.modal-tabs');
        if (tabs) tabs.classList.remove('hidden'); // Show tabs for questions

        if (q) {
            els.modalTitle.textContent = 'Edit Soal';
            els.qId.value = q.id;
            els.qQuestion.value = q.question;
            els.qA.value = q.options.a;
            els.qB.value = q.options.b;
            els.qC.value = q.options.c;
            els.qD.value = q.options.d;
            els.qCorrect.value = q.correct_answer || 'a';
            els.qActive.value = q.active ? 'true' : 'false';
            els.qCategory.value = q.category || 'Umum';
            els.qQuizSet.value = q.quiz_set || 1;
        } else {
            els.modalTitle.textContent = 'Tambah Soal';
            els.questionForm.reset();
            els.qId.value = '';
            els.qActive.value = 'true';
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
            } catch {}
        }
        showModalContainer();
        setTimeout(() => { if (els.qQuestion) els.qQuestion.style.height = els.qQuestion.scrollHeight + 'px'; }, 100);
    }

    function closeModal() {
        els.modal.classList.remove('active');
        els.modal.setAttribute('aria-hidden', 'true');
        els.questionForm.reset();
        els.qId.value = '';
    }

    async function handleSave(addMore = false) {
        if (!els.questionForm.checkValidity()) { els.questionForm.reportValidity(); return; }
        const id = els.qId.value;
        const payload = {
            id: id || undefined,
            question: els.qQuestion.value,
            options: { a: els.qA.value, b: els.qB.value, c: els.qC.value, d: els.qD.value },
            correct_answer: els.qCorrect.value,
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
        window.openMenuModal = () => els.menuModal.classList.remove('hidden');
        window.closeMenuModal = () => els.menuModal.classList.add('hidden');

        // FAB
        els.fabAdd?.addEventListener('click', () => openModal(null));

        // Question Actions
        els.questionsList?.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const item = btn.closest('.list-item');
            if (!item) return;
            const id = item.dataset.id;
            const q = state.questions.find(x => String(x.id) === String(id));
            if (btn.dataset.action === 'edit' && q) openModal(q);
            else if (btn.dataset.action === 'delete') handleDelete(id);
        });

        // Modal
        els.modalCloseBtn?.addEventListener('click', closeModal);
        els.saveBtn?.addEventListener('click', (e) => { e.preventDefault(); handleSave(false); });
        els.saveAddBtn?.addEventListener('click', (e) => { e.preventDefault(); handleSave(true); });

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
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();