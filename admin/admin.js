(() => {
    const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzQfRpw3cbu_FOfiA4ftjv-9AcWklpSZieRJZeotvwVSc3lkXC6i3saKYtt4P0V9tVn/exec';

    const STORAGE_KEYS = {
        username: 'ipmquiz_admin_username',
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
    };

    const els = {
        usernameInput: document.getElementById('admin-username'),
        passwordInput: document.getElementById('admin-password'),
        connectBtn: document.getElementById('connect-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        status: document.getElementById('status'),

        appCard: document.getElementById('app-card'),
        tabs: Array.from(document.querySelectorAll('.tab')),
        tabQuestions: document.getElementById('tab-questions'),
        tabResults: document.getElementById('tab-results'),

        searchInput: document.getElementById('search-input'),
        refreshQuestionsBtn: document.getElementById('refresh-questions-btn'),
        newQuestionBtn: document.getElementById('new-question-btn'),
        questionsTbody: document.getElementById('questions-tbody'),

        refreshResultsBtn: document.getElementById('refresh-results-btn'),
        resultsTbody: document.getElementById('results-tbody'),

        modal: document.getElementById('question-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        cancelBtn: document.getElementById('cancel-btn'),
        questionForm: document.getElementById('question-form'),

        qId: document.getElementById('q-id'),
        qQuestion: document.getElementById('q-question'),
        qA: document.getElementById('q-a'),
        qB: document.getElementById('q-b'),
        qC: document.getElementById('q-c'),
        qD: document.getElementById('q-d'),
        qCorrect: document.getElementById('q-correct'),
        qActive: document.getElementById('q-active'),

        saveBtn: document.getElementById('save-btn'),
    };

    function setStatus(message, kind = '') {
        els.status.textContent = message || '';
        els.status.classList.remove('ok', 'error');
        if (kind === 'ok') els.status.classList.add('ok');
        if (kind === 'error') els.status.classList.add('error');
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

    function activateTab(tabName) {
        els.tabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        els.tabQuestions.classList.toggle('hidden', tabName !== 'questions');
        els.tabResults.classList.toggle('hidden', tabName !== 'results');
    }

    function renderQuestions() {
        const query = (els.searchInput.value || '').trim().toLowerCase();
        const items = query
            ? state.questions.filter(q => String(q.question || '').toLowerCase().includes(query))
            : state.questions;

        const rows = items.map(q => {
            const active = q.active ? 'on' : 'off';
            const activeLabel = q.active ? 'Aktif' : 'Nonaktif';
            return `
                <tr data-id="${escapeHtml(q.id)}">
                    <td>${escapeHtml(q.id)}</td>
                    <td>
                        <div>${escapeHtml(q.question)}</div>
                        <div class="small">A: ${escapeHtml(q.options?.a || '')} • B: ${escapeHtml(q.options?.b || '')} • C: ${escapeHtml(q.options?.c || '')} • D: ${escapeHtml(q.options?.d || '')}</div>
                    </td>
                    <td><span class="badge ${active}">${activeLabel}</span></td>
                    <td>${escapeHtml((q.correct_answer || '').toUpperCase())}</td>
                    <td>
                        <div class="row-actions">
                            <button class="btn btn-secondary" type="button" data-action="edit"><i class="fas fa-pen"></i> Edit</button>
                            <button class="btn btn-danger" type="button" data-action="delete"><i class="fas fa-trash"></i> Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        els.questionsTbody.innerHTML = rows.join('') || `
            <tr><td colspan="5" class="small">Belum ada soal.</td></tr>
        `;
    }

    function renderResults() {
        const rows = state.results.map(r => `
            <tr>
                <td>${escapeHtml(r.timestamp || '')}</td>
                <td>${escapeHtml(r.username || '')}</td>
                <td>${escapeHtml(r.score ?? '')}${r.total ? ` / ${escapeHtml(r.total)}` : ''}</td>
                <td>${escapeHtml(r.percent ?? '')}</td>
            </tr>
        `);
        els.resultsTbody.innerHTML = rows.join('') || `
            <tr><td colspan="4" class="small">Belum ada hasil.</td></tr>
        `;
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

        els.modal.classList.remove('hidden');
        els.modal.setAttribute('aria-hidden', 'false');
        els.qQuestion.focus();
    }

    function closeModal() {
        els.modal.classList.add('hidden');
        els.modal.setAttribute('aria-hidden', 'true');
        els.questionForm.reset();
        els.qId.value = '';
    }

    async function loadQuestions() {
        setStatus('Memuat soal...', '');
        const data = await apiPost({ action: 'adminQuestions', session: state.session });
        if (!data) throw new Error('Respon server kosong.');
        if (data.status && data.status !== 'success') {
            throw new Error(data.message || 'Gagal memuat soal.');
        }
        const questions = Array.isArray(data.questions) ? data.questions : null;
        if (!questions) {
            const hint = JSON.stringify(data).slice(0, 220);
            throw new Error(`Format respon server tidak sesuai. Respon: ${hint}`);
        }
        state.questions = questions;
        renderQuestions();
        setStatus(`Soal dimuat: ${state.questions.length}`, 'ok');
    }

    async function loadResults() {
        setStatus('Memuat hasil...', '');
        const data = await apiPost({ action: 'adminResults', session: state.session });
        if (!data) throw new Error('Respon server kosong.');
        if (data.status && data.status !== 'success') {
            throw new Error(data.message || 'Gagal memuat hasil.');
        }
        const results = Array.isArray(data.results) ? data.results : null;
        if (!results) {
            const hint = JSON.stringify(data).slice(0, 220);
            throw new Error(`Format respon server tidak sesuai. Respon: ${hint}`);
        }
        state.results = results;
        renderResults();
        setStatus(`Hasil dimuat: ${state.results.length}`, 'ok');
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
        const data = await apiPost({
            action: 'adminUpsertQuestion',
            session: state.session,
            question: formQuestion,
        });
        if (!data || data.status !== 'success' || !data.question) {
            throw new Error(data?.message || 'Gagal menyimpan soal.');
        }
        const idx = state.questions.findIndex(q => String(q.id) === String(data.question.id));
        if (idx >= 0) {
            state.questions[idx] = data.question;
        } else {
            state.questions.unshift(data.question);
        }
        renderQuestions();
        setStatus('Soal tersimpan.', 'ok');
    }

    async function deleteQuestion(id) {
        const data = await apiPost({
            action: 'adminDeleteQuestion',
            session: state.session,
            id: id,
        });
        if (!data || data.status !== 'success') {
            throw new Error(data?.message || 'Gagal menghapus soal.');
        }
        state.questions = state.questions.filter(q => String(q.id) !== String(id));
        renderQuestions();
        setStatus('Soal dihapus.', 'ok');
    }

    function init() {
        els.usernameInput.value = localStorage.getItem(STORAGE_KEYS.username) || '';

        els.connectBtn.addEventListener('click', () => {
            connect().catch(err => {
                setConnected(false);
                setStatus(err.message || 'Gagal terhubung.', 'error');
            });
        });

        els.logoutBtn.addEventListener('click', () => logout());

        els.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const name = tab.dataset.tab;
                activateTab(name);
                if (name === 'results' && state.connected) {
                    loadResults().catch(err => setStatus(err.message || 'Gagal memuat hasil.', 'error'));
                }
            });
        });

        els.searchInput.addEventListener('input', () => renderQuestions());
        els.refreshQuestionsBtn.addEventListener('click', () => loadQuestions().catch(err => setStatus(err.message || 'Gagal memuat soal.', 'error')));
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
                deleteQuestion(id).catch(err => setStatus(err.message || 'Gagal menghapus.', 'error'));
            }
        });

        els.modalCloseBtn.addEventListener('click', () => closeModal());
        els.cancelBtn.addEventListener('click', () => closeModal());
        els.modal.addEventListener('click', (e) => {
            if (e.target === els.modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !els.modal.classList.contains('hidden')) closeModal();
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
            };

            els.saveBtn.disabled = true;
            setStatus('Menyimpan...', '');

            upsertQuestion(payload)
                .then(() => closeModal())
                .catch(err => setStatus(err.message || 'Gagal menyimpan.', 'error'))
                .finally(() => {
                    els.saveBtn.disabled = false;
                });
        });

        const existingSession = String(sessionStorage.getItem(SESSION_KEYS.session) || '').trim();
        if (existingSession) {
            state.session = existingSession;
            state.apiUrl = DEFAULT_API_URL;
            loadQuestions()
                .then(() => setConnected(true))
                .catch(() => logout());
        }
    }

    init();
})();
