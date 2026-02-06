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
    const API_URL = 'https://script.google.com/macros/s/AKfycbzQfRpw3cbu_FOfiA4ftjv-9AcWklpSZieRJZeotvwVSc3lkXC6i3saKYtt4P0V9tVn/exec';
    const USER_SESSION_KEY = 'ipmquiz_user_session';
    const USER_USERNAME_KEY = 'ipmquiz_user_username';

    const existingSession = String(sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '').trim();
    if (!existingSession) {
        window.location.href = 'login.html';
        return;
    }
    async function loadUserName() {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'publicMe', session: existingSession })
            });
            const data = await res.json();
            if (res.ok && data && data.status === 'success') {
                const nama = String(data.user?.nama_panjang || '');
                if (usernameInput) usernameInput.value = nama;
                if (userNameTextEl) userNameTextEl.textContent = nama || 'Tidak ditemukan';
            }
        } catch {}
    }
    loadUserName();
    let questionsData = [];
    let userAnswers = {};
    let currentQuestionIndex = 0;
    let selectedOption = null;

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
        nextBtn.style.display = 'none';
        quizHeader.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}?action=questions`);
            if (!response.ok) throw new Error('Gagal mengambil data soal dari server.');
            
            const payload = await response.json();
            questionsData = normalizeQuestionsResponse(payload);
            
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
            startQuiz();

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

    // --- Quiz Flow ---
    function startQuiz() {
        quizStartTime = Date.now(); // START the timer
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
        const time_spent = Date.now() - quizStartTime; // Calculate duration in milliseconds

        try {
            const postResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'submitQuiz', username, answers: userAnswers, time_spent }),
            });
            
            const result = await postResponse.json();
            if (!postResponse.ok || result.status !== 'success') {
                throw new Error(result.message || 'Gagal menyimpan hasil.');
            }
            
            displayDynamicResults(result);

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
        const nama = usernameInput.value.trim();
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'publicValidateName', session: existingSession, nama_panjang: nama })
            });
            const data = await res.json();
            return res.ok && data && data.status === 'success';
        } catch {
            return false;
        }
    }

    startQuizBtn.addEventListener('click', async () => {
        if (usernameInput.value.trim() === '') {
            alert('Harap masukkan nama sesuai database.');
            return;
        }
        const ok = await validateName();
        if (!ok) {
            alert('Nama tidak sesuai dengan data di sheet user.');
            return;
        }
        fetchQuestions();
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
});
