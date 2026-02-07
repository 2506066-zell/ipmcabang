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

    // --- ELEMENTS ---
    const els = {
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

    const paging = {
        qPage: 1,
        qSize: 10,
        rPage: 1,
        rSize: 10,
    };

    // --- UTILS ---
    function setStatus(message, kind = '') {
        if (!els.status) return;
        els.status.textContent = message || '';
        els.status.className = 'status ' + (kind || '');
    }

    function showLoader(text = 'Memuat...') {
        if (els.loadingOverlay) {
            if (els.loadingText) els.loadingText.textContent = text;
            els.loadingOverlay.classList.remove('hidden');
        }
    }

    function hideLoader() {
        if (els.loadingOverlay) {
            els.loadingOverlay.classList.add('hidden');
        }
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    // --- API ---
    async function fetchJson(url, init) {
        const response = await fetch(url, init);
        const ct = String(response.headers.get('Content-Type') || '');
        const text = await response.text();
        let data = null;
        if (ct.includes('application/json')) {
            try { data = text ? JSON.parse(text) : null; } catch { /* fallthrough */ }
        }
        if (!ct.includes('application/json') || data === null) {
            const snippet = (text || '').slice(0, 180).replace(/\s+/g,' ').trim();
            throw new Error(`Respon bukan JSON. ${snippet ? 'Cuplikan: '+snippet : ''}`);
        }
        if (!response.ok) {
            const message = data && data.message ? data.message : `HTTP ${response.status}`;
            throw new Error(message);
        }
        return data;
    }
    async function fetchJsonWithRetry(url, init, retries = 2, delay = 600) {
        try { return await fetchJson(url, init); }
        catch (e) {
            if (retries <= 0) throw e;
            await new Promise(r => setTimeout(r, delay));
            return await fetchJsonWithRetry(url, init, retries - 1, delay * 1.5);
        }
    }

    function resolveApiUrl(path) {
        // Since we are same-origin on Vercel, just return path
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
        state.connected = connected;
        els.loginCard.classList.toggle('hidden', connected);
        els.appCard.classList.toggle('hidden', !connected);
        els.bottomNav.classList.toggle('hidden', !connected);
        els.fabAdd.classList.toggle('hidden', !connected);
        
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
        els.navItems.forEach(item => {
            const t = item.dataset.tab;
            if (t) {
                const isActive = t === tabName;
                item.classList.toggle('active', isActive);
            }
        });
        
        els.tabQuestions.classList.toggle('hidden', tabName !== 'questions');
        els.tabResults.classList.toggle('hidden', tabName !== 'results');
        
        // Toggle FAB: only show on questions tab
        els.fabAdd.classList.toggle('hidden', tabName !== 'questions');
        
        state.prefs.tab = tabName;
        savePrefs();
        
        if (tabName === 'questions' && state.questions.length === 0) loadQuestions();
        if (tabName === 'results' && state.results.length === 0) loadResults();
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
        els.qPageInfo.textContent = `Hal ${paging.qPage} / ${totalPages} (Total ${state.totalQuestions})`;
        els.qPrev.disabled = paging.qPage <= 1;
        els.qNext.disabled = paging.qPage >= totalPages;
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
            alert('Error: ' + e.message);
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
        els.rPageInfo.textContent = `Hal ${paging.rPage} / ${totalPages}`;
        els.rPrev.disabled = paging.rPage <= 1;
        els.rNext.disabled = paging.rPage >= totalPages;
    }

    async function loadResults() {
        showLoader('Memuat Hasil...');
        try {
            const data = await apiGetVercel('/api/results');
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat hasil.');
            state.results = (Array.isArray(data.results) ? data.results : []).map(r => ({ ...r, timestamp: r.ts || r.timestamp }));
            renderResults();
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            hideLoader();
        }
    }

    // --- MODAL LOGIC ---
    function switchModalView(view) {
        const tabs = document.querySelectorAll('.modal-tab');
        tabs.forEach(t => t.classList.toggle('active', t.dataset.view === view));
        
        const form = document.getElementById('question-form');
        const preview = document.getElementById('preview-panel');
        
        if (view === 'preview') {
            renderPreview();
            form.classList.add('hidden');
            preview.classList.remove('hidden');
        } else {
            form.classList.remove('hidden');
            preview.classList.add('hidden');
        }
    }

    function renderPreview() {
        const q = els.qQuestion.value;
        const opts = {
            a: els.qA.value,
            b: els.qB.value,
            c: els.qC.value,
            d: els.qD.value
        };
        const correct = els.qCorrect.value;
        const cat = els.qCategory.value || 'Umum';
        const set = els.qQuizSet.value || '1';
        
        // Update Badges
        document.getElementById('prev-set').textContent = `Kuis ${set}`;
        document.getElementById('prev-cat').textContent = cat;
        
        // Update Question (Allow HTML)
        // Note: In production, sanitize this! But this is admin panel.
        document.getElementById('prev-question').innerHTML = q.replace(/\n/g, '<br>');
        
        // Update Options
        const container = document.getElementById('prev-options');
        container.innerHTML = ['a','b','c','d'].map(k => {
            const val = opts[k];
            if (!val) return '';
            const isCorrect = k === correct;
            const letter = k.toUpperCase();
            return `
            <div class="preview-opt ${isCorrect ? 'correct' : ''}">
                <span style="font-weight:bold; margin-right:8px;">${letter}.</span> ${escapeHtml(val)}
            </div>
            `;
        }).join('');
        
        document.getElementById('prev-key').textContent = correct.toUpperCase();
        document.querySelector('.preview-correct').classList.remove('hidden');
    }

    // --- MODAL & FORM ---
    function openModal(question) {
        const isEdit = Boolean(question && question.id);
        els.modalTitle.textContent = isEdit ? `Edit Soal #${question.id}` : 'Tambah Soal';
        
        // Reset View to Edit
        switchModalView('edit');
        
        els.qId.value = isEdit ? String(question.id) : '';
        els.qQuestion.value = question?.question || '';
        els.qA.value = question?.options?.a || '';
        els.qB.value = question?.options?.b || '';
        els.qC.value = question?.options?.c || '';
        els.qD.value = question?.options?.d || '';
        els.qCorrect.value = question?.correct_answer || 'a';
        els.qActive.value = question?.active === false ? 'false' : 'true';
        if (els.qQuizSet) els.qQuizSet.value = String(question?.quiz_set || '1');
        if (els.qCategory) els.qCategory.value = question?.category || '';

        // Auto-fill from draft if adding new
        if (!isEdit) {
            try {
                const draft = localStorage.getItem(STORAGE_KEYS.draft);
                if (draft) {
                    const d = JSON.parse(draft);
                    // Check if draft has meaningful content
                    if (d.question || d.options?.a) {
                        if (confirm('Ada draf soal yang belum disimpan. Pulihkan?')) {
                            els.qQuestion.value = d.question || '';
                            els.qA.value = d.options?.a || '';
                            els.qB.value = d.options?.b || '';
                            els.qC.value = d.options?.c || '';
                            els.qD.value = d.options?.d || '';
                            els.qCorrect.value = d.correct_answer || 'a';
                            if (d.category) els.qCategory.value = d.category;
                            if (d.quiz_set) els.qQuizSet.value = d.quiz_set;
                        } else {
                            // User rejected draft, maybe clear it? 
                            // Better keep it until they explicitly save something else, or clear it.
                            // For now, let's just ignore it.
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
            els.qQuestion.style.height = 'auto';
            els.qQuestion.style.height = els.qQuestion.scrollHeight + 'px';
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
            // Unified endpoint: /api/questions
            // If isEdit (has id), backend handles update. If no id, backend handles create.
            // Both use POST in the current implementation of questions.js logic:
            // if (req.method === 'POST') { if (b.id) update... else create... }
            const endpoint = '/api/questions';
            const data = await apiAdminVercel('POST', endpoint, payload);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menyimpan.');
            
            // Refresh local data
            await loadQuestions(paging.qPage); // Reload current page
            
            localStorage.removeItem(STORAGE_KEYS.draft); // Clear draft on success

            if (addMore) {
                // Clear form but keep some defaults like category/set
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
            // Use DELETE method on /api/questions with id param
            const data = await apiAdminVercel('DELETE', `/api/questions?id=${id}`);
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
        // Toggle Password
        els.togglePasswordBtn?.addEventListener('click', () => {
            const type = els.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            els.passwordInput.setAttribute('type', type);
            els.togglePasswordBtn.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });

        // Login
        els.adminLoginBtn?.addEventListener('click', async () => {
            const u = els.usernameInput.value;
            const p = els.passwordInput.value;
            if (!u || !p) return alert('Username dan Password wajib diisi');
            
            showLoader('Login...');
            try {
                await loginVercel(u, p);
                state.adminToken = els.adminTokenInput?.value || ''; // Optional override
                setConnected(true);
            } catch (e) {
                setStatus(e.message, 'error');
            } finally {
                hideLoader();
            }
        });

        // Logout
        els.logoutBtn?.addEventListener('click', () => {
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

        // Modal Tabs
        document.querySelectorAll('.modal-tab').forEach(t => {
            t.addEventListener('click', () => {
                switchModalView(t.dataset.view);
            });
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
            const totalPages = Math.max(1, Math.ceil(state.totalQuestions / paging.qSize));
            if (paging.qPage < totalPages) loadQuestions(paging.qPage + 1);
        });
        els.rPrev?.addEventListener('click', () => { if(paging.rPage > 1) { paging.rPage--; renderResults(); }});
        els.rNext?.addEventListener('click', () => { paging.rPage++; renderResults(); });

        // Expandable Textarea
        document.querySelectorAll('.input-expandable').forEach(el => {
            el.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        });

        // Rich Text Toolbar
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent form submit or focus loss quirks
                const tag = btn.dataset.tag;
                const textarea = els.qQuestion;
                
                // Ensure we have the latest value and focus
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                
                let newText;
                
                if (tag === 'br') {
                    newText = text.substring(0, start) + '<br>' + text.substring(end);
                    textarea.value = newText;
                    textarea.selectionStart = textarea.selectionEnd = start + 4;
                } else {
                    const selected = text.substring(start, end);
                    // Toggle check could be complex, for now just wrap
                    newText = text.substring(0, start) + `<${tag}>${selected}</${tag}>` + text.substring(end);
                    textarea.value = newText;
                    // Move cursor to end of inserted tag
                    // Or if text was selected, keep selection around it?
                    // Let's just put cursor after the closing tag
                    textarea.selectionStart = textarea.selectionEnd = start + tag.length * 2 + 5 + selected.length;
                }
                
                textarea.focus();
                textarea.dispatchEvent(new Event('input')); // Trigger auto-expand & auto-save
            });
        });

        // Auto-save Draft
        const saveDraft = () => {
            if (els.qId.value) return; // Don't save drafts for edits
            const draft = {
                question: els.qQuestion.value,
                options: {
                    a: els.qA.value,
                    b: els.qB.value,
                    c: els.qC.value,
                    d: els.qD.value
                },
                correct_answer: els.qCorrect.value,
                category: els.qCategory.value,
                quiz_set: els.qQuizSet.value
            };
            localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(draft));
        };
        
        [els.qQuestion, els.qA, els.qB, els.qC, els.qD, els.qCorrect, els.qCategory, els.qQuizSet].forEach(el => {
            el?.addEventListener('input', saveDraft);
            el?.addEventListener('change', saveDraft);
        });

        // Swipe Gestures
        let touchStartX = 0;
        let touchStartY = 0;
        const swipeThreshold = 50;

        els.appCard?.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        els.appCard?.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
        }, { passive: true });

        function handleSwipe(sx, sy, ex, ey) {
            const dx = sx - ex;
            const dy = sy - ey;
            
            // Horizontal swipe detection (ignore if vertical scroll is dominant)
            if (Math.abs(dx) > swipeThreshold && Math.abs(dy) < Math.abs(dx) * 0.8) {
                if (dx > 0) {
                    // Swiped Left -> Next Tab (Questions -> Results)
                    if (state.prefs.tab === 'questions') activateTab('results');
                } else {
                    // Swiped Right -> Prev Tab (Results -> Questions)
                    if (state.prefs.tab === 'results') activateTab('questions');
                }
            }
        }
    }

    // --- INIT ---
    async function prewarm() {
        try { await apiGetVercel('/api/dbHealth'); } catch {}
    }
    function init() {
        loadPrefs();
        initEvents();
        prewarm();

        // Check Session
        const sess = sessionStorage.getItem(SESSION_KEYS.session);
        if (sess) {
            state.session = sess;
            // Verify session validity or just assume logged in for UI
            // Better to try loading questions to verify
            setConnected(true);
        } else {
            setConnected(false);
        }
    }

    init();
})();
