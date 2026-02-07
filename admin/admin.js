(() => {
    const DEFAULT_API_URL = '/api';

    const STORAGE_KEYS = {
        username: 'ipmquiz_admin_username',
        prefs: 'ipmquiz_admin_prefs',
        draft: 'ipmquiz_admin_question_draft',
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
        users: [], // New state for users
        logs: [], // New state for logs
        connected: false,
        prefs: { tab: 'questions', search: '', status: 'all', set: 'all', category: 'all' },
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
            
            // Tabs & Nav
            tabQuestions: document.getElementById('tab-questions'),
            tabResults: document.getElementById('tab-results'),
            tabUsers: document.getElementById('tab-users'), // New tab
            bottomNav: document.getElementById('bottom-nav'),
            navItems: document.querySelectorAll('.nav-item'),
            navRefresh: document.getElementById('nav-refresh'),

            // Questions Toolbar
            searchInput: document.getElementById('search-input'),
            quizSetFilter: document.getElementById('quiz-set-filter'),
            categoryFilter: document.getElementById('category-filter'),
            
            // Questions List
            questionsList: document.getElementById('questions-list'),
            qPrev: document.getElementById('q-prev'),
            qNext: document.getElementById('q-next'),
            qPageInfo: document.getElementById('q-page-info'),
            fabAdd: document.getElementById('fab-add-question'),

            // Results List
            resultsList: document.getElementById('results-list'),
            refreshResultsBtn: document.getElementById('refresh-results-btn'),
            rPrev: document.getElementById('r-prev'),
            rNext: document.getElementById('r-next'),
            rPageInfo: document.getElementById('r-page-info'),

            // Users List (New)
            usersList: document.getElementById('users-list'),
            refreshUsersBtn: document.getElementById('refresh-users-btn'),

            // Logs List
            tabLogs: document.getElementById('tab-logs'),
            logsList: document.getElementById('logs-list'),
            refreshLogsBtn: document.getElementById('refresh-logs-btn'),

            // Modal
            modal: document.getElementById('question-modal'),
            modalTitle: document.getElementById('modal-title'),
            modalCloseBtn: document.getElementById('modal-close-btn'),
            questionForm: document.getElementById('question-form'),
            
            // Form Inputs
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
        };

        // Debug check
        if (!els.adminLoginBtn) console.error('[Admin] CRITICAL: Login button not found!');
        if (!els.usernameInput) console.error('[Admin] CRITICAL: Username input not found!');
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
        if (els.status) {
            els.status.textContent = msg;
            els.status.className = 'status ' + type;
            // Auto clear after 5s
            setTimeout(() => { 
                if (els.status && els.status.textContent === msg) {
                    els.status.textContent = ''; 
                }
            }, 5000);
        } else {
            if (type === 'error') alert(msg);
        }
    }

    async function fetchJson(url, init = {}) {
        // Ensure credentials (cookies) are sent
        if (!init.credentials) {
            init.credentials = 'include';
        }
        
        console.log(`[Admin] Fetching ${url}...`);
        const response = await fetch(url, init);
        const ct = response.headers.get('content-type');
        let data = null;
        if (ct && ct.includes('application/json')) {
            const text = await response.text();
            try { data = JSON.parse(text); } catch {}
        }
        
        if (!data) {
            const snippet = (await response.text()).slice(0, 100);
            throw new Error(`Respon bukan JSON. ${snippet ? 'Cuplikan: '+snippet : ''}`);
        }
        if (!response.ok) {
            const message = data && data.message ? data.message : `HTTP ${response.status}`;
            const err = new Error(message);
            err.status = response.status;
            throw err;
        }
        return data;
    }

    async function fetchJsonWithRetry(url, init, retries = 2, delay = 600) {
        try { return await fetchJson(url, init); }
        catch (e) {
            // Do not retry for client errors (4xx) except maybe 429
            if (e.message && (e.message.startsWith('HTTP 4') && !e.message.includes('429'))) {
                throw e;
            }
            if (retries <= 0) throw e;
            await new Promise(r => setTimeout(r, delay));
            return await fetchJsonWithRetry(url, init, retries - 1, delay * 1.5);
        }
    }

    function resolveApiUrl(path) {
        return path;
    }

    async function apiGetVercel(path) {
        return await fetchJsonWithRetry(resolveApiUrl(path), { method: 'GET' });
    }

    async function apiAdminVercel(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (state.adminToken) {
            headers['Authorization'] = `Bearer ${state.adminToken}`;
        } else if (state.session) {
            headers['Authorization'] = `Bearer ${state.session}`;
        }
        return await fetchJsonWithRetry(resolveApiUrl(path), { method, headers, body: body ? JSON.stringify(body) : undefined });
    }

    // --- AUTH ---
    async function loginVercel(uname, pwd) {
        const body = { username: String(uname||'').trim(), password: String(pwd||'') };
        const data = await fetchJson(resolveApiUrl('/api/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!data || data.status !== 'success' || !data.session) throw new Error(data?.message || 'Login gagal');
        if (String(data.role||'') !== 'admin') throw new Error('Akun bukan admin');
        state.session = String(data.session);
        sessionStorage.setItem('ipmquiz_admin_session', state.session);
        return data;
    }

    function setConnected(connected) {
        console.log(`[Admin] setConnected: ${connected}`);
        state.connected = connected;
        if (els.loginCard) els.loginCard.classList.toggle('hidden', connected);
        if (els.appCard) els.appCard.classList.toggle('hidden', !connected);
        if (els.bottomNav) els.bottomNav.classList.toggle('hidden', !connected);
        if (els.fabAdd) els.fabAdd.classList.toggle('hidden', !connected);
        
        if (connected) {
            activateTab(state.prefs.tab || 'questions');
            loadQuestions(); // Initial load
        }
    }

    // --- PREFS ---
    function loadPrefs() {
        try {
            const obj = JSON.parse(localStorage.getItem(STORAGE_KEYS.prefs) || '{}');
            if (obj && typeof obj === 'object') {
                state.prefs = { ...state.prefs, ...obj };
            }
        } catch {}
    }
    function savePrefs() {
        try { localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(state.prefs)); } catch {}
    }

    // --- NAVIGATION ---
    function activateTab(tabName) {
        if (els.navItems) {
            els.navItems.forEach(item => {
                const t = item.dataset.tab;
                if (t) {
                    const isActive = t === tabName;
                    item.classList.toggle('active', isActive);
                }
            });
        }
        
        if (els.tabQuestions) els.tabQuestions.classList.toggle('hidden', tabName !== 'questions');
        if (els.tabResults) els.tabResults.classList.toggle('hidden', tabName !== 'results');
        if (els.tabUsers) els.tabUsers.classList.toggle('hidden', tabName !== 'users');
        if (els.tabLogs) els.tabLogs.classList.toggle('hidden', tabName !== 'logs');
        
        // Toggle FAB: only show on questions tab
        if (els.fabAdd) els.fabAdd.classList.toggle('hidden', tabName !== 'questions');
        
        state.prefs.tab = tabName;
        savePrefs();
        
        if (tabName === 'questions' && state.questions.length === 0) loadQuestions();
        if (tabName === 'results' && state.results.length === 0) loadResults();
        if (tabName === 'users' && state.users.length === 0) loadUsers();
        if (tabName === 'logs' && state.logs.length === 0) loadLogs();
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
        const all = state.questions; // Current page items only

        if (all.length === 0) {
            els.questionsList.innerHTML = `<div class="card" style="text-align:center; padding:40px;">
                <p>Tidak ada soal ditemukan.</p>
            </div>`;
        } else {
            els.questionsList.innerHTML = all.map(q => {
                const setNum = Number(q.quiz_set || 1);
                const setLabel = setNum === 1 ? 'Kuis 1' : (setNum === 2 ? 'Kuis 2' : 'Kuis 3');
                const badgeClass = q.active ? 'badge-active' : 'badge-inactive';
                const activeLabel = q.active ? 'AKTIF' : 'NONAKTIF';
                
                return `
                <div class="list-item" data-id="${q.id}">
                    <div class="list-item-header">
                        <span class="item-badge" style="background:#3b82f6; color:#fff;">${escapeHtml(setLabel)}</span>
                        <span class="item-badge ${badgeClass}">${activeLabel}</span>
                    </div>
                    <div class="item-title">${escapeHtml(q.question)}</div>
                    <div class="item-meta">
                        <span><i class="fas fa-tag"></i> ${escapeHtml(q.category || 'Umum')}</span>
                        <span><i class="fas fa-check"></i> Jawaban: ${escapeHtml((q.correct_answer||'').toUpperCase())}</span>
                    </div>
                    <div class="actions" style="margin-top:12px; display:flex; gap:8px;">
                        <button class="btn btn-secondary" style="flex:1; height:36px; min-height:36px;" data-action="edit">
                            <i class="fas fa-pen"></i> Edit
                        </button>
                        <button class="btn btn-secondary" style="flex:1; height:36px; min-height:36px; color:var(--accent-danger); border-color:rgba(239,68,68,0.3);" data-action="delete">
                            <i class="fas fa-trash"></i> Hapus
                        </button>
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

    function renderSkeleton() {
        const skeletonHTML = Array(5).fill(0).map(() => `
            <div class="skeleton-card skeleton-pulse">
                <div style="margin-bottom:12px">
                    <div class="sk-badge"></div>
                    <div class="sk-badge" style="width:80px"></div>
                </div>
                <div class="sk-line sk-w-75"></div>
                <div class="sk-line sk-w-50"></div>
                <div style="display:flex; gap:8px; margin-top:16px">
                    <div class="sk-badge" style="width:100%"></div>
                    <div class="sk-badge" style="width:100%"></div>
                </div>
            </div>
        `).join('');
        els.questionsList.innerHTML = skeletonHTML;
    }

    async function loadQuestions(page = paging.qPage) {
        // Use skeleton if list is empty, otherwise overlay (or nothing if silent refresh)
        if (state.questions.length === 0 && page === 1) renderSkeleton();
        else showLoader('Memuat Soal...');
        
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
            
            // Only load categories on first load to avoid flickering, or if list empty
            if (state.categories.length === 0) loadCategories();

            renderQuestions();
        } catch (e) {
            console.error(e);
            if (state.questions.length === 0) {
                 els.questionsList.innerHTML = `<div class="card" style="text-align:center; color:var(--accent-danger)"><p>Gagal memuat data.</p><button class="btn btn-secondary" onclick="loadQuestions(1)">Coba Lagi</button></div>`;
            }
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
        } catch (e) {
            console.error(e);
        } finally {
            hideLoader();
        }
    }

    // --- USERS & ATTEMPT RESET LOGIC ---
    async function loadUsers() {
        showLoader('Memuat User...');
        try {
            const data = await apiAdminVercel('GET', '/api/admin/questions?action=usersStatus');
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat user.');
            state.users = data.users || [];
            renderUsers();
        } catch (e) {
            console.error(e);
            els.usersList.innerHTML = `<div class="card" style="text-align:center; color:var(--accent-danger)"><p>Gagal memuat data user: ${e.message}</p></div>`;
        } finally {
            hideLoader();
        }
    }

    function renderUsers() {
        if (state.users.length === 0) {
            els.usersList.innerHTML = `<div class="card" style="text-align:center"><p>Belum ada user.</p></div>`;
            return;
        }

        els.usersList.innerHTML = state.users.map(u => {
            // Render quiz status
            const quizSets = [1, 2, 3]; // Hardcoded for now, or get from config
            const statusHtml = quizSets.map(setId => {
                const attempt = u.attempts && u.attempts[setId];
                if (attempt) {
                    return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.05); padding:8px; border-radius:8px; margin-top:4px;">
                        <div>
                            <span style="font-weight:bold; font-size:0.9rem;">Kuis ${setId}</span>
                            <span style="font-size:0.8rem; color:green; margin-left:8px;">✅ Selesai (${attempt.score}/${attempt.total})</span>
                        </div>
                        <button class="btn btn-secondary" style="font-size:0.8rem; padding:4px 8px; color:var(--accent-danger); border-color:rgba(239,68,68,0.3);" onclick="handleResetAttempt(${u.id}, ${setId})">
                            Reset
                        </button>
                    </div>`;
                } else {
                    return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.02); padding:8px; border-radius:8px; margin-top:4px;">
                        <span style="font-weight:bold; font-size:0.9rem; color:#888;">Kuis ${setId}</span>
                        <span style="font-size:0.8rem; color:#888;">Belum Mengisi</span>
                    </div>`;
                }
            }).join('');

            return `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="item-title" style="font-size:1.1rem">${escapeHtml(u.username)}</span>
                    <span class="item-badge" style="background:${u.role === 'admin' ? 'purple' : '#ccc'}; color:#fff;">${escapeHtml(u.role)}</span>
                </div>
                <div style="font-size:0.9rem; color:#666; margin-bottom:8px;">${escapeHtml(u.nama_panjang || '-')}</div>
                <div style="margin-top:12px;">
                    <div style="font-size:0.85rem; font-weight:600; margin-bottom:4px; text-transform:uppercase; color:#888;">Status Kuis</div>
                    ${statusHtml}
                </div>
            </div>
            `;
        }).join('');
    }

    window.handleResetAttempt = async (userId, quizSet) => {
        if (!confirm(`Reset attempt user ini untuk Kuis ${quizSet}? User bisa mengisi ulang.`)) return;
        
        showLoader('Mereset...');
        try {
            const data = await apiAdminVercel('POST', '/api/admin/questions?action=resetAttempt', { user_id: userId, quiz_set: quizSet });
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal reset.');
            
            // Reload users to update UI
            await loadUsers();
            setStatus('Attempt berhasil direset.', 'ok');
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            hideLoader();
        }
    };

    // --- LOGS LOGIC ---
    async function loadLogs() {
        showLoader('Memuat Log...');
        try {
            const data = await apiAdminVercel('GET', '/api/admin/questions?action=activityLogs');
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat log.');
            state.logs = data.logs || [];
            renderLogs();
        } catch (e) {
            console.error(e);
            els.logsList.innerHTML = `<div class="card" style="text-align:center; color:var(--accent-danger)"><p>Gagal memuat log: ${e.message}</p></div>`;
        } finally {
            hideLoader();
        }
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
                <div class="item-meta">
                    <span><i class="fas fa-clock"></i> ${escapeHtml(l.created_at)}</span>
                </div>
            </div>
            `;
        }).join('');
    }

    // --- MODAL LOGIC ---
    function openModal(q = null) {
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
            
            // Restore draft if any
            try {
                const draft = localStorage.getItem(STORAGE_KEYS.draft);
                if (draft) {
                    const d = JSON.parse(draft);
                    if (d && Date.now() - d.ts < 24 * 60 * 60 * 1000) {
                        if (confirm('Lanjutkan edit soal terakhir?')) {
                            els.qQuestion.value = d.question || '';
                            els.qA.value = d.options?.a || '';
                            els.qB.value = d.options?.b || '';
                            els.qC.value = d.options?.c || '';
                            els.qD.value = d.options?.d || '';
                        } else {
                            localStorage.removeItem(STORAGE_KEYS.draft);
                        }
                    }
                }
            } catch {}
        }

        els.modal.classList.add('active');
        els.modal.setAttribute('aria-hidden', 'false');
        modalDirty = false;
        
        // Auto-resize textarea
        setTimeout(() => {
            if (els.qQuestion) {
                els.qQuestion.style.height = 'auto';
                els.qQuestion.style.height = els.qQuestion.scrollHeight + 'px';
            }
        }, 100);
    }

    function closeModal() {
        els.modal.classList.remove('active');
        els.modal.setAttribute('aria-hidden', 'true');
        try { els.modalCloseBtn && els.modalCloseBtn.blur(); } catch {}
        els.questionForm.reset();
        els.qId.value = '';
    }

    async function handleSave(addMore = false) {
        if (!els.questionForm.checkValidity()) {
            els.questionForm.reportValidity();
            return;
        }

        const id = els.qId.value;
        const isEdit = !!id;
        
        const payload = {
            id: isEdit ? id : undefined,
            question: els.qQuestion.value,
            options: {
                a: els.qA.value,
                b: els.qB.value,
                c: els.qC.value,
                d: els.qD.value
            },
            correct_answer: els.qCorrect.value,
            active: els.qActive.value === 'true',
            category: els.qCategory.value,
            quiz_set: Number(els.qQuizSet.value)
        };

        showLoader('Menyimpan...');
        try {
            const action = isEdit ? 'update' : 'create';
            const endpoint = `/api/admin/questions?action=${action}`;
            
            const data = await apiAdminVercel('POST', endpoint, payload);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menyimpan.');
            
            // Refresh local data
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
        } catch (e) {
            alert('Gagal menyimpan: ' + e.message);
        } finally {
            hideLoader();
        }
    }

    async function handleDelete(id) {
        if (!confirm('Yakin hapus soal ini?')) return;
        showLoader('Menghapus...');
        try {
            const endpoint = `/api/admin/questions?action=delete`;
            const payload = { id: id };

            const data = await apiAdminVercel('POST', endpoint, payload);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menghapus.');
            await loadQuestions(paging.qPage);
            setStatus('Soal dihapus.', 'ok');
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            hideLoader();
        }
    }

    // --- EVENT LISTENERS ---
    function initEvents() {
        console.log('[Admin] Attaching event listeners...');
        
        // Toggle Password
        els.togglePasswordBtn?.addEventListener('click', () => {
            const type = els.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            els.passwordInput.setAttribute('type', type);
            els.togglePasswordBtn.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });

        // Login
        if (els.adminLoginBtn) {
            els.adminLoginBtn.addEventListener('click', async () => {
                console.log('[Admin] Login button clicked');
                const u = els.usernameInput.value;
                const p = els.passwordInput.value;
                if (!u || !p) {
                    console.warn('[Admin] Login failed: Empty credentials');
                    return alert('Username dan Password wajib diisi');
                }
                
                showLoader('Login...');
                try {
                    console.log('[Admin] Sending login request...');
                    await loginVercel(u, p);
                    state.adminToken = els.adminTokenInput?.value || ''; // Optional override
                    console.log('[Admin] Login success');
                    setConnected(true);
                } catch (e) {
                    console.error('[Admin] Login error:', e);
                    setStatus(e.message, 'error');
                } finally {
                    hideLoader();
                }
            });
        } else {
            console.error('[Admin] CRITICAL: Admin login button not found in DOM');
        }

        // Logout
        els.logoutBtn?.addEventListener('click', () => {
            if (!confirm('Yakin ingin keluar?')) return;
            state.session = '';
            state.adminToken = '';
            sessionStorage.removeItem(SESSION_KEYS.session);
            setConnected(false);
            els.usernameInput.value = '';
            els.passwordInput.value = '';
        });

        // Nav
        els.bottomNav?.addEventListener('click', (e) => {
            const btn = e.target.closest('.nav-item');
            if (!btn) return;
            if (btn.id === 'nav-refresh') {
                if (state.prefs.tab === 'questions') loadQuestions();
                else if (state.prefs.tab === 'users') loadUsers();
                else loadResults();
            } else {
                activateTab(btn.dataset.tab);
            }
        });

        // FAB
        els.fabAdd?.addEventListener('click', () => openModal(null));

        // Question List Actions (Delegation)
        els.questionsList?.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const item = btn.closest('.list-item');
            if (!item) return;
            const id = item.dataset.id;
            const q = state.questions.find(x => String(x.id) === String(id));
            
            if (btn.dataset.action === 'edit') {
                if (q) openModal(q);
            } else if (btn.dataset.action === 'delete') {
                handleDelete(id);
            }
        });

        // Modal Close
        els.modalCloseBtn?.addEventListener('click', closeModal);

        // Form Save
        els.saveBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            handleSave(false);
        });
        els.saveAddBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            handleSave(true);
        });

        // Filters
        els.searchInput?.addEventListener('input', debounce(() => loadQuestions(1), 500));
        els.quizSetFilter?.addEventListener('change', () => loadQuestions(1));
        els.categoryFilter?.addEventListener('change', () => loadQuestions(1));

        // Paging
        els.qPrev?.addEventListener('click', () => { 
            if (paging.qPage > 1) loadQuestions(paging.qPage - 1);
        });
        els.qNext?.addEventListener('click', () => { 
            loadQuestions(paging.qPage + 1);
        });
        
        els.refreshResultsBtn?.addEventListener('click', loadResults);
        els.rPrev?.addEventListener('click', () => {
            if (paging.rPage > 1) { paging.rPage--; renderResults(); }
        });
        els.rNext?.addEventListener('click', () => {
            paging.rPage++; renderResults();
        });

        els.refreshUsersBtn?.addEventListener('click', loadUsers);
        els.refreshLogsBtn?.addEventListener('click', loadLogs);
    }

    // --- INIT ---
    async function prewarm() {
        try { await apiGetVercel('/api/dbHealth'); } catch {}
    }
    function init() {
        console.log('[Admin] Init...');
        initEls();
        loadPrefs();
        initEvents();
        prewarm();

        // Check Session
        const sess = sessionStorage.getItem(SESSION_KEYS.session);
        if (sess) {
            console.log('[Admin] Found existing session');
            state.session = sess;
            // Verify session validity or just assume logged in for UI
            // Better to try loading questions to verify
            setConnected(true);
        } else {
            console.log('[Admin] No session, showing login');
            setConnected(false);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
