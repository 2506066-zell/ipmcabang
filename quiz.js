document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    // Tambahkan di bagian atas file quiz.js
    let quizStartTime;
    const userInfoScreen = document.getElementById('user-info-screen');
    const usernameInput = document.getElementById('username');
    const userNameTextEl = document.getElementById('user-name-text');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    
    const quizBody = document.getElementById('quiz-body');
    const nextBtn = document.getElementById('next-btn');
    const quizHeader = document.getElementById('quiz-header');
    
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    
    const resultContainer = document.getElementById('result-container');
    const restartBtn = document.getElementById('restart-btn');
    const scoreText = document.getElementById('score-text');
    const scoreDetails = document.getElementById('score-details');

    // API and Data
    const API_URL = '/api';
    const USER_SESSION_KEY = 'ipmquiz_user_session';
    const USER_USERNAME_KEY = 'ipmquiz_user_username';

    const existingSession = String(sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '').trim();
    if (!existingSession) {
        window.location.href = 'login.html';
        return;
    }
    async function loadUserName() {
        try {
            const uname = String(sessionStorage.getItem('ipmquiz_user_username') || localStorage.getItem('ipmquiz_user_username') || '').trim();
            if (usernameInput) usernameInput.value = uname;
            if (userNameTextEl) userNameTextEl.textContent = uname || 'Tidak ditemukan';
        } catch {}
    }
    loadUserName();
    let questionsData = [];
    let allQuestionsData = [];
    let userAnswers = {};
    let currentQuestionIndex = 0;
    let selectedOption = null;
    let quizSeed = null;
    let currentQuizSet = 1;
    const quizSetPicker = document.getElementById('quiz-set-picker');
    const quizSetGrid = document.getElementById('quiz-set-grid');
    const ATTEMPT_INFO_KEY = 'ipmquiz_attempt_info';

    // --- Data Normalization ---
    function normalizeQuestionsResponse(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.questions)) return data.questions;
        if (Array.isArray(data.value)) return data.value;
        return [];
    }

    function showLoader(text = 'Memuat...') {
        if (loadingOverlay) {
            loadingText.textContent = text;
            loadingOverlay.classList.add('show');
        }
    }

    function hideLoader() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
    }

    // --- Quiz Initialization ---
    async function fetchQuestions() {
        showLoader('Mempersiapkan Soal...');
        await new Promise(r => requestAnimationFrame(r));
        nextBtn.style.display = 'none';
        quizHeader.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}/questions`);
            if (!response.ok) throw new Error('Gagal mengambil data soal dari server.');
            
            const payload = await response.json();
            questionsData = normalizeQuestionsResponse(payload);
            if (Array.isArray(questionsData)) {
                questionsData = questionsData.filter(q => q.active !== false);
            }
            
            if (!questionsData.length) {
                quizBody.style.display = 'block';
                quizBody.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🙂</div>
                        <h3>Soal belum tersedia</h3>
                        <p>Coba muat ulang beberapa saat lagi.</p>
                        <button id="empty-reload-quiz" class="login-button">Muat Ulang</button>
                    </div>
                `;
                const btn = document.getElementById('empty-reload-quiz');
                if (btn) btn.addEventListener('click', () => fetchQuestions());
                return;
            }
            quizBody.innerHTML = '';
            allQuestionsData = questionsData.slice();
            showSetPicker();

        } catch (error) {
            quizBody.style.display = 'block';
            quizBody.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Gagal memuat kuis</h3>
                    <p>${error.message}</p>
                    <button id="empty-reload-quiz" class="login-button">Muat Ulang</button>
                </div>`;
            const btn = document.getElementById('empty-reload-quiz');
            if (btn) btn.addEventListener('click', () => fetchQuestions());
            console.error(error);
        } finally {
            hideLoader();
        }
    }

    function showSetPicker() {
        userInfoScreen.style.display = 'none';
        if (quizSetPicker) quizSetPicker.style.display = 'block';
        if (quizSetGrid) {
            const counts = { 1: 0, 2: 0, 3: 0 };
            const source = allQuestionsData.length ? allQuestionsData : questionsData;
            source.forEach(q => { const s = Number(q.quiz_set || 1); if (counts[s] !== undefined) counts[s]++; });
            quizSetGrid.querySelectorAll('.set-card').forEach(btn => {
                const set = Number(btn.dataset.set || 1);
                const small = quizSetGrid.querySelector(`small[data-count="${set}"]`);
                if (small) small.textContent = `${counts[set] || 0} soal`;
                btn.disabled = (counts[set] || 0) === 0;
                btn.onclick = async () => {
                    currentQuizSet = set;
                    try {
                        const can = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({ action:'publicCanAttempt', session: existingSession, quiz_set: currentQuizSet }) });
                        const data = await can.json();
                        if (!can.ok || data.status !== 'success') {
                            alert(data.message || 'Anda sudah mencoba set ini.');
                            return;
                        }
                    } catch {}
                    const base = allQuestionsData.length ? allQuestionsData : questionsData;
                    const selected = base.filter(q => Number(q.quiz_set || 1) === set);
                    quizSeed = `${Date.now()}_${Math.floor(Math.random()*1e6)}`;
                    const srng = seededRandom(quizSeed);
                    const shuffled = shuffleArray(selected, srng).map(q => ({ ...q, options: shuffleOptions(q.options, srng) }));
                    questionsData = shuffled;
                    if (quizSetPicker) quizSetPicker.style.display = 'none';
                    startQuiz();
                };
            });
        }
    }

    // Back to set picker during quiz (disabled, no back button)

    // --- Quiz Flow ---
    function startQuiz() {
        // Attempt guard: simple cooldown and daily cap
        const uname = (usernameInput.value || '').trim();
        const info = getAttemptInfo(uname);
        const now = Date.now();
        const COOLDOWN_MS = 30 * 1000; // 30s cooldown
        const DAILY_LIMIT = 10; // max 10 attempts/day
        if (info && info.last && (now - info.last) < COOLDOWN_MS) {
            if (window.AppToast) AppToast.show('Tunggu sebentar sebelum mencoba lagi.');
            return;
        }
        if (info && sameDay(info.day, now) && info.count >= DAILY_LIMIT) {
            if (window.AppToast) AppToast.show('Batas percobaan harian tercapai.');
            return;
        }
        setAttemptInfo(uname, now);

        if (window.NavigationGuard) NavigationGuard.enable('Keluar dari kuis? Progres akan hilang.');
        if (window.NavigationGuard) NavigationGuard.markDirty();
        quizStartTime = now;
        currentQuestionIndex = 0;
        userAnswers = {};
        resultContainer.style.display = 'none';
        userInfoScreen.style.display = 'none';

        quizHeader.style.display = 'block';
        quizBody.style.display = 'block';
        nextBtn.style.display = 'flex';
        
        loadQuestion();
    }

    function loadQuestion() {
        selectedOption = null;
        nextBtn.disabled = true;
        nextBtn.classList.remove('enabled');

        const currentQuestion = questionsData[currentQuestionIndex];
        
        const oldCard = quizBody.querySelector('.question-card');
        if (oldCard) {
            oldCard.classList.add('slide-out');
            oldCard.addEventListener('animationend', () => renderNewQuestion(currentQuestion), { once: true });
        } else {
            renderNewQuestion(currentQuestion);
        }
    }
    
    function renderNewQuestion(questionData) {
        quizBody.innerHTML = '';

        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';


        const questionText = document.createElement('h2');
        questionText.className = 'question-text';
        questionText.textContent = questionData.question;

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';

        for (const key in questionData.options) {
            if (questionData.options[key]) {
                const optionCard = document.createElement('div');
                optionCard.className = 'option-card';
                optionCard.textContent = questionData.options[key];
                optionCard.dataset.optionKey = key;
                optionCard.addEventListener('click', () => selectOption(optionCard, questionData.id));
                optionsContainer.appendChild(optionCard);
            }
        }

        questionCard.appendChild(questionText);
        questionCard.appendChild(optionsContainer);
        
        questionCard.classList.add('slide-in');
        quizBody.appendChild(questionCard);

        updateProgress();
    }

    function selectOption(optionElement, questionId) {
        const allOptions = document.querySelectorAll('.option-card');
        allOptions.forEach(opt => opt.classList.remove('selected'));

        optionElement.classList.add('selected');
        selectedOption = optionElement;
        userAnswers[questionId] = optionElement.dataset.optionKey;
        logEvent('select_option', { questionId, option: optionElement.dataset.optionKey });

        nextBtn.disabled = false;
        nextBtn.classList.add('enabled');
    }

    function updateProgress() {
        const totalQuestions = questionsData.length;
        const progress = currentQuestionIndex + 1;
        
        progressText.textContent = `${progress}/${totalQuestions}`;
        progressBar.style.width = `${(progress / totalQuestions) * 100}%`;
    }

    async function submitAndShowResults() {
        showLoader('Mengirim Jawaban...');
        const username = usernameInput.value;
        const session = existingSession;
        const finished_at = Date.now();
        const time_spent = finished_at - quizStartTime; // ms

        try {
            const correctCount = questionsData.reduce((acc, q) => acc + (String(userAnswers[q.id]||'') === String(q.correct_answer||'') ? 1 : 0), 0);
            const postResponse = await fetch(`${API_URL}/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, score: correctCount, total: questionsData.length, percent: Math.round((correctCount / questionsData.length) * 100), time_spent, quiz_set: currentQuizSet, started_at: quizStartTime, finished_at }),
            });
            const result = await postResponse.json();
            if (!postResponse.ok || result.status !== 'success') {
                throw new Error(result.message || 'Gagal menyimpan hasil.');
            }
            
            displayDynamicResults(result);
            logEvent('submit_quiz', { percent: result.percent, score: result.score, total: result.total, time_spent });
            if (window.NavigationGuard) NavigationGuard.disable();

        } catch (error) {
            alert(`Gagal mengirim hasil: ${error.message}`);
        } finally {
            hideLoader();
        }
    }

    function displayDynamicResults(result) {
        quizBody.style.display = 'none';
        nextBtn.style.display = 'none';
        quizHeader.style.display = 'none';
        
        resultContainer.style.display = 'flex';
        resultContainer.classList.add('fade-in');

        const percent = typeof result.percent === 'number' ? result.percent : 0;
        scoreText.textContent = `${percent}%`;
        scoreDetails.textContent = `Kamu benar ${result.score} dari ${result.total} pertanyaan.`;
        
        createParticles();
    }
    
    function createParticles() {
        const particleContainer = resultContainer.querySelector('.particle-container');
        if (!particleContainer) return;
        particleContainer.innerHTML = '';
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 5}s`;
            particle.style.animationDuration = `${2 + Math.random() * 3}s`;
            particleContainer.appendChild(particle);
        }
    }

    // --- Event Listeners ---
    async function validateName() {
        const nama = usernameInput.value.trim().toLowerCase();
        try {
            const res = await fetch(`${API_URL}/users?username=${encodeURIComponent(nama)}`);
            const data = await res.json();
            return res.ok && data && data.status === 'success' && Array.isArray(data.users) && data.users.length > 0;
        } catch {
            return false;
        }
    }

    startQuizBtn.addEventListener('click', async () => {
        showLoader('Memeriksa akun...');
        startQuizBtn.disabled = true;
        try {
            const nameVal = usernameInput.value.trim();
            if (!nameVal) {
                alert('Harap masukkan nama sesuai database.');
                return;
            }
            const ok = await validateName();
            if (!ok) {
                alert('Nama tidak sesuai dengan data di sheet user.');
                return;
            }
            logEvent('start_quiz', {});
            await fetchQuestions();
        } finally {
            startQuizBtn.disabled = false;
            // fetchQuestions akan menutup loader di finally, tapi jika gagal awal kita tutup di sini
            hideLoader();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (nextBtn.disabled) return;

        if (currentQuestionIndex < questionsData.length - 1) {
            currentQuestionIndex++;
            loadQuestion();
            if (currentQuestionIndex === questionsData.length - 1) {
                nextBtn.innerHTML = '<i class="fas fa-check"></i>'; // Change to checkmark for last question
            }
        } else {
            submitAndShowResults();
        }
    });

    restartBtn.addEventListener('click', () => {
        // Reset to initial state
        resultContainer.style.display = 'none';
        userInfoScreen.style.display = 'block';
        usernameInput.value = '';
        nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
    });

    // ===== Helpers: seeded random, shuffle, attempts, analytics =====
    function seededRandom(seed) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < seed.length; i++) {
            h ^= seed.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return () => {
            h += 0x6D2B79F5;
            let t = Math.imul(h ^ (h >>> 15), 1 | h);
            t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffleArray(arr, rnd) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function shuffleOptions(opts, rnd) {
        if (!opts) return opts;
        const entries = Object.entries(opts).filter(([, v]) => v);
        const shuffled = shuffleArray(entries, rnd);
        const newOpts = {};
        shuffled.forEach(([k, v]) => { newOpts[k] = v; });
        return newOpts;
    }

    function sameDay(a, b) {
        const da = new Date(a), db = new Date(b);
        return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
    }
    function getAttemptInfo(username) {
        try {
            const obj = JSON.parse(localStorage.getItem(ATTEMPT_INFO_KEY) || '{}');
            return obj[username] || null;
        } catch { return null; }
    }
    function setAttemptInfo(username, ts) {
        try {
            const obj = JSON.parse(localStorage.getItem(ATTEMPT_INFO_KEY) || '{}');
            const prev = obj[username] || { count: 0, day: ts, last: 0 };
            obj[username] = {
                count: sameDay(prev.day, ts) ? (prev.count + 1) : 1,
                day: sameDay(prev.day, ts) ? prev.day : ts,
                last: ts,
            };
            localStorage.setItem(ATTEMPT_INFO_KEY, JSON.stringify(obj));
        } catch {}
    }

    async function logEvent(event, payload) {
        try {
            const username = usernameInput.value || '';
            const body = { action: 'logEvent', event, username, ts: Date.now(), payload };
            await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
        } catch {}
    }
});
