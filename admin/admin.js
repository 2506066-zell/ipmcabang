(() => {
    const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzQfRpw3cbu_FOfiA4ftjv-9AcWklpSZieRJZeotvwVSc3lkXC6i3saKYtt4P0V9tVn/exec';

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
        results: [],
        connected: false,
        prefs: { tab: 'questions', search: '', status: 'all', set: 'all', category: 'all' },
        backend: 'vercel',
        adminToken: '',
    };
    let modalDirty = false;

    const els = {
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingText: document.getElementById('loading-text'),
        usernameInput: document.getElementById('admin-username'),
        passwordInput: document.getElementById('admin-password'),
        togglePasswordBtn: document.getElementById('toggle-admin-password'),
        connectBtn: document.getElementById('connect-btn'),
        connectVercelBtn: document.getElementById('connect-vercel-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        status: document.getElementById('status'),

        appCard: document.getElementById('app-card'),
        tabs: Array.from(document.querySelectorAll('.tab')),
        tabQuestions: document.getElementById('tab-questions'),
        tabResults: document.getElementById('tab-results'),

        searchInput: document.getElementById('search-input'),
        statusFilter: document.getElementById('status-filter'),
        quizSetFilter: document.getElementById('quiz-set-filter'),
        categoryFilter: document.getElementById('category-filter'),
        setChips: document.querySelectorAll('[data-set-chip]'),
        refreshQuestionsBtn: document.getElementById('refresh-questions-btn'),
        resetSetBtn: document.getElementById('reset-set-btn'),
        newQuestionBtn: document.getElementById('new-question-btn'),
        questionsTbody: document.getElementById('questions-tbody'),
        qPrev: document.getElementById('q-prev'),
        qNext: document.getElementById('q-next'),
        qPageInfo: document.getElementById('q-page-info'),

        refreshResultsBtn: document.getElementById('refresh-results-btn'),
        resultsTbody: document.getElementById('results-tbody'),
        rPrev: document.getElementById('r-prev'),
        rNext: document.getElementById('r-next'),
        rPageInfo: document.getElementById('r-page-info'),

        modal: document.getElementById('question-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        cancelBtn: document.getElementById('cancel-btn'),
        questionForm: document.getElementById('question-form'),
        savingIndicator: document.getElementById('saving-indicator'),

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
        formActions: document.querySelector('#question-form .actions'),
        backendMode: document.getElementById('backend-mode'),
        adminTokenInput: document.getElementById('admin-token-input'),
    };

    const paging = {
        qPage: 1,
        qSize: 10,
        rPage: 1,
        rSize: 10,
    };

    function setStatus(message, kind = '') {
        els.status.textContent = message || '';
        els.status.classList.remove('ok', 'error');
        if (kind === 'ok') els.status.classList.add('ok');
        if (kind === 'error') els.status.classList.add('error');
    }

    function showLoader(text = 'Memuat...') {
        if (els.loadingOverlay) {
            els.loadingText.textContent = text;
            els.loadingOverlay.classList.add('show');
        }
    }

    function hideLoader() {
        if (els.loadingOverlay) {
            els.loadingOverlay.classList.remove('show');
        }
    }

    async function fetchJson(url, init) {
        const response = await fetch(url, init);
        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            throw new Error('Server tidak mengirim JSON yang valid.');
        }

        if (!response.ok) {
            const message = data && data.message ? data.message : `HTTP ${response.status}`;
            throw new Error(message);
        }
        return data;
    }

    async function apiGet(params) {
        const url = new URL(state.apiUrl);
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            url.searchParams.set(key, String(value));
        });
        return await fetchJson(url.toString(), { method: 'GET' });
    }

    async function apiPost(body) {
        return await fetchJson(state.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(body || {}),
        });
    }

    async function apiGetVercel(path) {
        return await fetchJson(path, { method: 'GET' });
    }
    async function apiAdminVercel(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (state.adminToken) headers['Authorization'] = `Bearer ${state.adminToken}`;
        return await fetchJson(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function setConnected(connected) {
        state.connected = connected;
        els.appCard.classList.toggle('hidden', !connected);
        els.logoutBtn.classList.toggle('hidden', !connected);
    }

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

    function activateTab(tabName) {
        els.tabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        els.tabQuestions.classList.toggle('hidden', tabName !== 'questions');
        els.tabResults.classList.toggle('hidden', tabName !== 'results');
        state.prefs.tab = tabName;
        savePrefs();
    }

    function getFilteredQuestions() {
        const query = (els.searchInput.value || '').trim().toLowerCase();
        const status = String(els.statusFilter.value || 'all');
        let items = state.questions;
        if (query) items = items.filter(q => String(q.question || '').toLowerCase().includes(query));
        if (status === 'active') items = items.filter(q => q.active);
        if (status === 'inactive') items = items.filter(q => q.active === false);
        const setFilter = String(els.quizSetFilter?.value || 'all');
        if (setFilter !== 'all') items = items.filter(q => String(q.quiz_set || '') === setFilter);
        const catFilter = String(els.categoryFilter?.value || 'all');
        if (catFilter !== 'all') items = items.filter(q => String(q.category || '').toLowerCase() === catFilter.toLowerCase());
        return items;
    }

    function renderQuestions() {
        const all = getFilteredQuestions();
        const start = (paging.qPage - 1) * paging.qSize;
        const pageItems = all.slice(start, start + paging.qSize);
        const rows = pageItems.map(q => {
            const activeLabel = q.active ? 'Aktif' : 'Nonaktif';
            const activeClass = q.active ? 'active' : 'inactive';
            const setNum = Number(q.quiz_set || 1);
            const setLabel = setNum === 1 ? 'Mingguan' : (setNum === 2 ? 'Bulanan' : 'Per Bidang');
            return `
                <tr data-id="${escapeHtml(q.id)}" class="row-set-${setNum}">
                    <td data-label="ID">${escapeHtml(q.id)}</td>
                    <td data-label="Kuis"><span class="badge ${'badge-set-' + setNum}">${escapeHtml(setLabel)}</span></td>
                    <td data-label="Soal">
                    <div class="question-cell-content">
                        <div class="question-text">${escapeHtml(q.question)}</div>
                        <div class="question-options">
                            <span class="option"><b>A:</b> ${escapeHtml(q.options?.a || '')}</span>
                            <span class="option"><b>B:</b> ${escapeHtml(q.options?.b || '')}</span>
                            <span class="option"><b>C:</b> ${escapeHtml(q.options?.c || '')}</span>
                            <span class="option"><b>D:</b> ${escapeHtml(q.options?.d || '')}</span>
                        </div>
                    </div>
                </td>
                    <td data-label="Kategori"><span class="badge badge-category">${escapeHtml(q.category || '-')}</span></td>
                    <td data-label="Aktif"><span class="status-badge ${activeClass}">${activeLabel}</span></td>
                    <td data-label="Jawaban">${escapeHtml((q.correct_answer || '').toUpperCase())}</td>
                    <td data-label="Aksi">
                        <div class="actions">
                            <button class="btn btn-secondary" type="button" data-action="edit"><i class="fas fa-pen"></i> Edit</button>
                            <button class="btn btn-danger" type="button" data-action="delete"><i class="fas fa-trash"></i> Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        els.questionsTbody.innerHTML = rows.join('') || `<tr><td colspan="5" class="small">Belum ada soal.</td></tr>`;
        const totalPages = Math.max(1, Math.ceil(all.length / paging.qSize));
        els.qPageInfo.textContent = `Halaman ${paging.qPage} dari ${totalPages}`;
        els.qPrev.disabled = paging.qPage <= 1;
        els.qNext.disabled = paging.qPage >= totalPages;
    }

    function renderResults() {
        const start = (paging.rPage - 1) * paging.rSize;
        const pageItems = state.results.slice(start, start + paging.rSize);
        const rows = pageItems.map(r => `
            <tr>
                <td data-label="Waktu">${escapeHtml(r.timestamp || '')}</td>
                <td data-label="Nama">${escapeHtml(r.username || '')}</td>
                <td data-label="Skor">${escapeHtml(r.score ?? '')}${r.total ? ` / ${escapeHtml(r.total)}` : ''}</td>
                <td data-label="Persen">${escapeHtml(r.percent ?? '')}</td>
            </tr>
        `);
        els.resultsTbody.innerHTML = rows.join('') || `<tr><td colspan="4" class="small">Belum ada hasil.</td></tr>`;
        const totalPages = Math.max(1, Math.ceil(state.results.length / paging.rSize));
        els.rPageInfo.textContent = `Halaman ${paging.rPage} dari ${totalPages}`;
        els.rPrev.disabled = paging.rPage <= 1;
        els.rNext.disabled = paging.rPage >= totalPages;
    }

    function openModal(question) {
        const isEdit = Boolean(question && question.id);
        els.modalTitle.textContent = isEdit ? `Edit Soal #${question.id}` : 'Tambah Soal';

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

        els.modal.classList.remove('hidden');
        els.modal.setAttribute('aria-hidden', 'false');
        els.qQuestion.focus();
        modalDirty = false;
        if (window.NavigationGuard) NavigationGuard.clearDirty();
        if (!isEdit) loadDraft();
    }

    function closeModal() {
        els.modal.classList.add('hidden');
        els.modal.setAttribute('aria-hidden', 'true');
        els.questionForm.reset();
        els.qId.value = '';
        modalDirty = false;
        if (window.NavigationGuard) NavigationGuard.clearDirty();
    }

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
    function loadDraft() {
        try {
            const obj = JSON.parse(localStorage.getItem(STORAGE_KEYS.draft) || '{}');
            if (obj && typeof obj === 'object') {
                els.qQuestion.value = obj.q || els.qQuestion.value;
                els.qA.value = obj.a || els.qA.value;
                els.qB.value = obj.b || els.qB.value;
                els.qC.value = obj.c || els.qC.value;
                els.qD.value = obj.d || els.qD.value;
                if (obj.correct) els.qCorrect.value = obj.correct;
                if (obj.active !== undefined) els.qActive.value = obj.active ? 'true' : 'false';
                if (obj.category) els.qCategory.value = obj.category;
                if (obj.quiz_set) els.qQuizSet.value = String(obj.quiz_set);
            }
        } catch {}
    }
    function saveDraft() {
        try {
            const obj = {
                q: String(els.qQuestion.value||''),
                a: String(els.qA.value||''),
                b: String(els.qB.value||''),
                c: String(els.qC.value||''),
                d: String(els.qD.value||''),
                correct: String(els.qCorrect.value||''),
                active: String(els.qActive.value||'true') === 'true',
                category: String(els.qCategory?.value||''),
                quiz_set: Number(String(els.qQuizSet?.value||'1')),
            };
            localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(obj));
        } catch {}
    }
    function clearDraft() {
        try { localStorage.removeItem(STORAGE_KEYS.draft); } catch {}
    }

    async function loadQuestions() {
        setStatus('Memuat soal...', '');
        showLoader('Memuat Soal...');
        try {
            let questions;
            if (state.backend === 'vercel') {
                const data = await apiGetVercel('/api/questions');
                if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat soal.');
                questions = Array.isArray(data.questions) ? data.questions : [];
            } else {
                const data = await apiPost({ action: 'adminQuestions', session: state.session });
                if (!data) throw new Error('Respon server kosong.');
                if (data.status && data.status !== 'success') {
                    throw new Error(data.message || 'Gagal memuat soal.');
                }
                questions = Array.isArray(data.questions) ? data.questions : null;
                if (!questions) {
                    const hint = JSON.stringify(data).slice(0, 220);
                    throw new Error(`Format respon server tidak sesuai. Respon: ${hint}`);
                }
            }
            state.questions = questions;
            populateCategoryFilter();
            renderQuestions();
            setStatus(`Soal dimuat: ${state.questions.length}`, 'ok');
        } finally {
            hideLoader();
        }
    }

    function populateCategoryFilter() {
        if (!els.categoryFilter) return;
        const cats = Array.from(new Set(state.questions.map(q => String(q.category || '').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
        const current = String(els.categoryFilter.value || 'all');
        els.categoryFilter.innerHTML = '<option value="all">Semua Kategori</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        if (current && current !== 'all') {
            els.categoryFilter.value = current;
        }
    }

    async function loadResults() {
        setStatus('Memuat hasil...', '');
        showLoader('Memuat Hasil...');
        try {
            let results;
            if (state.backend === 'vercel') {
                const data = await apiGetVercel('/api/results');
                if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal memuat hasil.');
                results = Array.isArray(data.results) ? data.results : [];
                // normalisasi field timestamp
                results = results.map(r => ({ ...r, timestamp: r.ts || r.timestamp }));
            } else {
                const data = await apiPost({ action: 'adminResults', session: state.session });
                if (!data) throw new Error('Respon server kosong.');
                if (data.status && data.status !== 'success') {
                    throw new Error(data.message || 'Gagal memuat hasil.');
                }
                results = Array.isArray(data.results) ? data.results : null;
                if (!results) {
                    const hint = JSON.stringify(data).slice(0, 220);
                    throw new Error(`Format respon server tidak sesuai. Respon: ${hint}`);
                }
            }
            state.results = results;
            renderResults();
            setStatus(`Hasil dimuat: ${state.results.length}`, 'ok');
        } finally {
            hideLoader();
        }
    }

    async function login(username, password) {
        const data = await apiPost({ action: 'adminLogin', username, password });
        if (!data) throw new Error('Respon server kosong.');
        if (data.status !== 'success') {
            throw new Error(data.message || 'Login gagal.');
        }
        if (!data.session) throw new Error('Login sukses tapi session tidak ada.');
        state.session = String(data.session);
        sessionStorage.setItem(SESSION_KEYS.session, state.session);
    }

    async function connect() {
        setStatus('', '');
        els.connectBtn.disabled = true;
        showLoader('Menghubungkan...');

        try {
            state.apiUrl = DEFAULT_API_URL;
            const username = String(els.usernameInput.value || '').trim();
            const password = String(els.passwordInput.value || '');
            if (!username) throw new Error('Username wajib diisi.');
            if (!password) throw new Error('Password wajib diisi.');

            localStorage.setItem(STORAGE_KEYS.username, username);

            const health = await apiGet({ action: 'health' });
            if (!health) throw new Error('API tidak merespon health check.');
            if (health.status && health.status !== 'success') {
                throw new Error(health.message || 'API health check gagal.');
            }

            await login(username, password);
            await loadQuestions();
            setConnected(true);
            els.passwordInput.value = '';
        } finally {
            els.connectBtn.disabled = false;
            hideLoader();
        }
    }

    function logout() {
        state.session = '';
        sessionStorage.removeItem(SESSION_KEYS.session);
        els.passwordInput.value = '';
        setConnected(false);
        setStatus('Terputus.', '');
    }

    function getQuestionById(id) {
        return state.questions.find(q => String(q.id) === String(id));
    }

    async function upsertQuestion(formQuestion) {
        if (state.backend === 'vercel') {
            let data;
            if (formQuestion.id) {
                data = await apiAdminVercel('PUT', '/api/questions', formQuestion);
            } else {
                data = await apiAdminVercel('POST', '/api/questions', formQuestion);
            }
            if (!data || data.status !== 'success' || !data.question) throw new Error(data?.message || 'Gagal menyimpan soal.');
            const idx = state.questions.findIndex(q => String(q.id) === String(data.question.id));
            if (idx >= 0) { state.questions[idx] = data.question; } else { state.questions.unshift(data.question); }
            renderQuestions();
            setStatus('Soal tersimpan.', 'ok');
            return;
        }
        const data = await apiPost({ action: 'adminUpsertQuestion', session: state.session, question: formQuestion });
        if (!data || data.status !== 'success' || !data.question) throw new Error(data?.message || 'Gagal menyimpan soal.');
        const idx = state.questions.findIndex(q => String(q.id) === String(data.question.id));
        if (idx >= 0) { state.questions[idx] = data.question; } else { state.questions.unshift(data.question); }
        renderQuestions();
        setStatus('Soal tersimpan.', 'ok');
    }

    async function deleteQuestion(id) {
        if (state.backend === 'vercel') {
            const data = await apiAdminVercel('DELETE', `/api/questions?id=${encodeURIComponent(String(id))}`);
            if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menghapus soal.');
            state.questions = state.questions.filter(q => String(q.id) !== String(id));
            renderQuestions();
            setStatus('Soal dihapus.', 'ok');
            return;
        }
        const data = await apiPost({ action: 'adminDeleteQuestion', session: state.session, id });
        if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal menghapus soal.');
        state.questions = state.questions.filter(q => String(q.id) !== String(id));
        renderQuestions();
        setStatus('Soal dihapus.', 'ok');
    }

    function init() {
        els.usernameInput.value = localStorage.getItem(STORAGE_KEYS.username) || '';
        if (window.NavigationGuard) NavigationGuard.enable('Keluar dari halaman admin? Perubahan belum disimpan.');

        loadPrefs();
        if (els.searchInput) { els.searchInput.value = state.prefs.search || ''; }
        if (els.statusFilter) { els.statusFilter.value = state.prefs.status || 'all'; }
        if (els.quizSetFilter) { els.quizSetFilter.value = state.prefs.set || 'all'; }
        if (els.categoryFilter) { els.categoryFilter.value = state.prefs.category || 'all'; }

        if (els.backendMode) { els.backendMode.value = 'vercel'; }

        if (els.togglePasswordBtn) {
            els.togglePasswordBtn.addEventListener('click', () => {
                const isPwd = els.passwordInput.type === 'password';
                els.passwordInput.type = isPwd ? 'text' : 'password';
                els.togglePasswordBtn.innerHTML = isPwd ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            });
        }

        els.connectBtn.addEventListener('click', () => {
            connect().catch(err => {
                setConnected(false);
                setStatus(err.message || 'Gagal terhubung.', 'error');
            });
        });

        if (els.backendMode) {
            els.backendMode.addEventListener('change', () => {
                state.backend = String(els.backendMode.value || 'apps_script');
            });
        }
        if (els.connectVercelBtn) {
            els.connectVercelBtn.addEventListener('click', async () => {
                try {
                    state.backend = 'vercel';
                    state.adminToken = String(els.adminTokenInput?.value || '').trim();
                    setStatus('Menghubungkan Vercel...', '');
                    showLoader('Menghubungkan...');
                    const health = await apiGetVercel('/api/health');
                    if (!health || health.status !== 'success') throw new Error(health?.message || 'Health gagal');
                    await loadQuestions();
                    setConnected(true);
                } catch (e) {
                    setStatus(String(e.message||e), 'error');
                } finally {
                    hideLoader();
                }
            });
        }

        els.logoutBtn.addEventListener('click', () => {
            const ok = window.confirm('Keluar dari halaman admin? Perubahan belum disimpan.');
            if (!ok) return;
            if (window.NavigationGuard) NavigationGuard.disable();
            logout();
        });

        els.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const name = tab.dataset.tab;
                activateTab(name);
                if (name === 'results' && state.connected) {
                    loadResults().catch(err => setStatus(err.message || 'Gagal memuat hasil.', 'error'));
                }
            });
        });

        function debounce(fn, delay) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; }
        els.searchInput.addEventListener('input', debounce(() => { paging.qPage = 1; state.prefs.search = String(els.searchInput.value||''); savePrefs(); renderQuestions(); }, 250));
        if (els.statusFilter) els.statusFilter.addEventListener('change', () => { paging.qPage = 1; state.prefs.status = String(els.statusFilter.value||'all'); savePrefs(); renderQuestions(); });
        if (els.quizSetFilter) els.quizSetFilter.addEventListener('change', () => { paging.qPage = 1; state.prefs.set = String(els.quizSetFilter.value||'all'); savePrefs(); renderQuestions(); });
        if (els.categoryFilter) els.categoryFilter.addEventListener('change', () => { paging.qPage = 1; state.prefs.category = String(els.categoryFilter.value||'all'); savePrefs(); renderQuestions(); });
        if (els.setChips && els.setChips.length) els.setChips.forEach(btn => {
            btn.addEventListener('click', () => {
                els.setChips.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const v = btn.getAttribute('data-set-chip') || 'all';
                if (els.quizSetFilter) els.quizSetFilter.value = v;
                paging.qPage = 1;
                renderQuestions();
            });
        });
        if (els.qPrev) els.qPrev.addEventListener('click', () => { if (paging.qPage > 1) { paging.qPage--; renderQuestions(); } });
        if (els.qNext) els.qNext.addEventListener('click', () => { paging.qPage++; renderQuestions(); });
        if (els.rPrev) els.rPrev.addEventListener('click', () => { if (paging.rPage > 1) { paging.rPage--; renderResults(); } });
        if (els.rNext) els.rNext.addEventListener('click', () => { paging.rPage++; renderResults(); });
        els.refreshQuestionsBtn.addEventListener('click', () => loadQuestions().catch(err => setStatus(err.message || 'Gagal memuat soal.', 'error')));
        if (els.resetSetBtn) els.resetSetBtn.addEventListener('click', async () => {
            const setVal = String(els.quizSetFilter?.value || 'all');
            if (setVal === 'all') { alert('Pilih set tertentu untuk di-reset.'); return; }
            const ok = window.confirm(`Reset set kuis ${setVal}? Semua pengguna diizinkan mencoba lagi.`);
            if (!ok) return;
            try {
                setStatus('Mereset set...', '');
                showLoader('Mereset Set...');
                let data;
                if (state.backend === 'vercel') {
                    data = await apiAdminVercel('POST', '/api/resetSet', { quiz_set: Number(setVal) });
                } else {
                    data = await apiPost({ action: 'adminResetSet', session: state.session, quiz_set: Number(setVal) });
                }
                if (!data || data.status !== 'success') throw new Error(data?.message || 'Gagal mereset set');
                setStatus('Set direset. Pengguna dapat mencoba lagi.', 'ok');
            } catch (err) {
                setStatus(err.message || 'Gagal mereset set.', 'error');
            } finally { hideLoader(); }
        });
        els.refreshResultsBtn.addEventListener('click', () => loadResults().catch(err => setStatus(err.message || 'Gagal memuat hasil.', 'error')));

        els.newQuestionBtn.addEventListener('click', () => openModal(null));

        els.questionsTbody.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;
            const row = e.target.closest('tr[data-id]');
            if (!row) return;
            const id = row.getAttribute('data-id');
            const action = button.getAttribute('data-action');

            if (action === 'edit') {
                const question = getQuestionById(id);
                openModal(question);
                return;
            }

            if (action === 'delete') {
                const question = getQuestionById(id);
                const ok = window.confirm(`Hapus soal #${question?.id}?\n\n${question?.question || ''}`);
                if (!ok) return;

                setStatus('Menghapus...', '');
                showLoader('Menghapus Soal...');
                deleteQuestion(id)
                    .catch(err => setStatus(err.message || 'Gagal menghapus.', 'error'))
                    .finally(() => hideLoader());
            }
        });

        // Tap row to edit when not clicking action buttons
        els.questionsTbody.addEventListener('click', (e) => {
            if (e.target.closest('button[data-action]')) return;
            const row = e.target.closest('tr[data-id]');
            if (!row) return;
            const id = row.getAttribute('data-id');
            const question = getQuestionById(id);
            openModal(question);
        });

        els.modalCloseBtn.addEventListener('click', () => {
            if (modalDirty) {
                const ok = window.confirm('Tutup tanpa menyimpan perubahan?');
                if (!ok) return;
            }
            closeModal();
        });
        els.cancelBtn.addEventListener('click', () => {
            if (modalDirty) {
                const ok = window.confirm('Batalkan dan tutup tanpa menyimpan perubahan?');
                if (!ok) return;
            }
            closeModal();
        });
        els.modal.addEventListener('click', (e) => {
            if (e.target === els.modal) {
                return;
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !els.modal.classList.contains('hidden')) closeModal();
            if (e.ctrlKey && !els.modal.classList.contains('hidden')) return;
            if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); els.searchInput?.focus(); }
            if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); openModal(null); }
            if (e.ctrlKey && e.key.toLowerCase() === 'r') { e.preventDefault(); if (state.prefs.tab === 'questions') { loadQuestions().catch(err => setStatus(err.message || 'Gagal memuat soal.', 'error')); } else { loadResults().catch(err => setStatus(err.message || 'Gagal memuat hasil.', 'error')); } }
        });

        els.questionForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const idRaw = String(els.qId.value || '').trim();
            const id = idRaw ? Number(idRaw) : null;
            const question = String(els.qQuestion.value || '').trim();
            const a = String(els.qA.value || '').trim();
            const b = String(els.qB.value || '').trim();
            const c = String(els.qC.value || '').trim();
            const d = String(els.qD.value || '').trim();
            const correct = String(els.qCorrect.value || '').trim().toLowerCase();
            const active = String(els.qActive.value || 'true') === 'true';
            const category = String(els.qCategory?.value || '').trim();
            const quiz_set = Number(String(els.qQuizSet?.value || '1'));

            if (!question) {
                setStatus('Pertanyaan wajib diisi.', 'error');
                return;
            }
            if (!a || !b || !d) {
                setStatus('Opsi A, B, dan D wajib diisi.', 'error');
                return;
            }
            if (!['a', 'b', 'c', 'd'].includes(correct)) {
                setStatus('Jawaban benar harus A/B/C/D.', 'error');
                return;
            }

            const payload = {
                ...(id ? { id } : {}),
                question,
                options: { a, b, c, d },
                correct_answer: correct,
                active,
                ...(category ? { category } : {}),
                quiz_set,
            };

            els.saveBtn.disabled = true;
            setStatus('Menyimpan...', '');
            if (els.savingIndicator) els.savingIndicator.style.display = 'block';
            els.saveBtn.classList.add('loading');

            upsertQuestion(payload)
                .then(() => { clearDraft(); closeModal(); })
                .catch(err => setStatus(err.message || 'Gagal menyimpan.', 'error'))
                .finally(() => {
                    els.saveBtn.disabled = false;
                    if (els.savingIndicator) els.savingIndicator.style.display = 'none';
                    els.saveBtn.classList.remove('loading');
                });
        });

        if (els.saveAddBtn) {
            els.saveAddBtn.addEventListener('click', (e) => {
                e.preventDefault();
                els.saveAddBtn.disabled = true;
                const idRaw = String(els.qId.value || '').trim();
                const id = idRaw ? Number(idRaw) : null;
                const question = String(els.qQuestion.value || '').trim();
                const a = String(els.qA.value || '').trim();
                const b = String(els.qB.value || '').trim();
                const c = String(els.qC.value || '').trim();
                const d = String(els.qD.value || '').trim();
                const correct = String(els.qCorrect.value || '').trim().toLowerCase();
                const active = String(els.qActive.value || 'true') === 'true';
                const category = String(els.qCategory?.value || '').trim();
                const quiz_set = Number(String(els.qQuizSet?.value || '1'));

                if (!question || !a || !b || !d || !['a','b','c','d'].includes(correct)) { els.saveAddBtn.disabled = false; return; }

                const payload = { ...(id ? { id } : {}), question, options: { a, b, c, d }, correct_answer: correct, active, ...(category ? { category } : {}), quiz_set };
                setStatus('Menyimpan...', '');
                if (els.savingIndicator) els.savingIndicator.style.display = 'block';
                upsertQuestion(payload)
                    .then(() => { clearDraft(); els.questionForm.reset(); els.qId.value=''; modalDirty=false; if (window.NavigationGuard) NavigationGuard.clearDirty(); els.qQuestion.focus(); })
                    .catch(err => setStatus(err.message || 'Gagal menyimpan.', 'error'))
                    .finally(() => { els.saveAddBtn.disabled = false; if (els.savingIndicator) els.savingIndicator.style.display = 'none'; });
            });
        }

        const existingSession = String(sessionStorage.getItem(SESSION_KEYS.session) || '').trim();
        if (existingSession) {
            state.session = existingSession;
            state.apiUrl = DEFAULT_API_URL;
            const initialTab = state.prefs.tab || 'questions';
            activateTab(initialTab);
            const initialLoad = initialTab === 'results' ? loadResults() : loadQuestions();
            initialLoad
                .then(() => setConnected(true))
                .catch(() => logout());
        }
        ['input','change'].forEach(evt => {
            els.questionForm.addEventListener(evt, () => { modalDirty = true; if (window.NavigationGuard) NavigationGuard.markDirty(); saveDraft(); });
        });

        els.questionForm.addEventListener('focusin', () => { if (els.formActions) els.formActions.classList.add('fixed-actions'); });
        els.questionForm.addEventListener('focusout', () => { if (els.formActions) setTimeout(()=>els.formActions.classList.remove('fixed-actions'),150); });
    }

    init();
})();
