// --- Global Helper for Loader ---
window.showLoader = function(text) {
    try {
        if (window.AppLoader && typeof AppLoader.show === 'function') {
            AppLoader.show(text || 'Memuat...');
            return;
        }
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;z-index:9999';
            const p = document.createElement('p');
            p.id = 'loading-text';
            p.textContent = text || 'Memuat...';
            p.style.cssText = 'font-family:system-ui, sans-serif; color:#222;';
            overlay.appendChild(p);
            document.body.appendChild(overlay);
        } else {
            const t = document.getElementById('loading-text');
            if (t) t.textContent = text || 'Memuat...';
            overlay.style.display = 'flex';
        }
    } catch {}
};
window.hideLoader = function() {
    try {
        if (window.AppLoader && typeof AppLoader.hide === 'function') {
            AppLoader.hide();
            return;
        }
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    } catch {}
};

// --- Globals ---
let currentQuestionIndex = 0;
let userScore = 0;
let userAnswers = [];
let quizTimer;
let startTime;
let questionsData = [];
let currentQuizSet = 1;
let quizSeed = '';

// --- DOM Elements ---
const userInfoScreen = document.getElementById('user-info-screen');
const quizSetPicker = document.getElementById('quiz-set-picker');
const quizSetGrid = document.getElementById('quiz-set-grid');
const quizHeader = document.getElementById('quiz-header');
const quizBody = document.getElementById('quiz-body');
const nextBtn = document.getElementById('next-btn');

let countdownInterval;

// --- Quiz Logic ---

async function fetchQuestions() {
    showLoader('Mempersiapkan Soal...');
    await new Promise(r => requestAnimationFrame(r));
    nextBtn.style.display = 'none';
    quizHeader.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/questions?mode=summary`);
        
        const ct = response.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) {
            throw new Error(`Server Error: ${response.status}`);
        }

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const payload = await response.json();
        const sets = payload.sets || [];
        
        // Handle Next Quiz Info
        if (payload.next_quiz) {
            initNextQuiz(payload.next_quiz);
        }

        // Handle Top Scores
        if (payload.top_scores && Array.isArray(payload.top_scores)) {
            renderTopScores(payload.top_scores);
        }
        
        if (!sets.length) {
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
        showSetPicker(sets);

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

function showSetPicker(summarySets) {
    userInfoScreen.style.display = 'none';
    if (quizSetPicker) quizSetPicker.style.display = 'block';
    
    // Notification
    if (window.Toast) Toast.show('Silakan pilih topik kuis untuk memulai.', 'info');

    if (quizSetGrid) {
        // Map data for easier access
        const setsData = {};
        summarySets.forEach(s => {
            setsData[s.quiz_set] = s;
        });

        quizSetGrid.querySelectorAll('.set-card').forEach(btn => {
            const setNum = Number(btn.dataset.set || 1);
            const data = setsData[setNum];
            const count = data ? data.count : 0;
            const attempted = data ? data.attempted : false;
            const topScore = data ? data.top_score : null;
            
            // Update Count
            const small = btn.querySelector('small');
            if (small) small.textContent = `${count} soal`;
            
            // Handle Attempted Status
            if (attempted) {
                btn.classList.add('attempted');
                btn.dataset.attempted = 'true';
            } else {
                btn.classList.remove('attempted');
                btn.dataset.attempted = 'false';
            }

            // Handle Top Score Display
            // Remove existing top score info if any
            const existingTop = btn.querySelector('.top-score-info');
            if (existingTop) existingTop.remove();

            if (topScore) {
                const badge = document.createElement('div');
                badge.className = 'top-score-info';
                badge.innerHTML = `<i class="fas fa-crown"></i> ${topScore.username} (${Math.round((topScore.score/topScore.total)*100)}%)`;
                btn.appendChild(badge);
            }
            
            btn.disabled = count === 0;
            
            // Click Handler
            btn.onclick = async () => {
                // If attempted, show modal
                if (btn.dataset.attempted === 'true') {
                    openAttemptModal();
                    return;
                }

                currentQuizSet = setNum;
                try {
                    showLoader('Mengunduh Soal...');
                    const qRes = await fetch(`${API_URL}/questions?set=${setNum}`);
                    if (!qRes.ok) throw new Error('Gagal mengunduh soal.');
                    const qPayload = await qRes.json();
                    let qData = normalizeQuestionsResponse(qPayload);
                    qData = qData.filter(q => q.active !== false);

                    if (!qData.length) {
                        if (window.Toast) Toast.show('Set kuis ini kosong.', 'error');
                        else alert('Set ini kosong.');
                        hideLoader();
                        return;
                    }

                    // Prepare quiz
                    quizSeed = `${Date.now()}_${Math.floor(Math.random()*1e6)}`;
                    const srng = seededRandom(quizSeed);
                    // Shuffle questions and options
                    const shuffled = shuffleArray(qData, srng).map(q => ({ ...q, options: shuffleOptions(q.options, srng) }));
                    questionsData = shuffled;
                    
                    if (quizSetPicker) quizSetPicker.style.display = 'none';
                    hideLoader();
                    startQuiz();

                } catch (e) {
                    console.error(e);
                    if (window.Toast) Toast.show('Gagal: ' + e.message, 'error');
                    else alert('Terjadi kesalahan: ' + e.message);
                    hideLoader();
                }
            };
        });
    }
}

// --- Next Quiz & Modal Logic ---

function initNextQuiz(info) {
    const section = document.getElementById('next-quiz-section');
    if (!section || !info) return;
    
    section.style.display = 'block';
    
    if (info.title) document.getElementById('nq-title').textContent = info.title;
    if (info.topic) document.getElementById('nq-topic').textContent = `Topik: ${info.topic}`;
    
    if (info.countdown_target) {
        startCountdown(new Date(info.countdown_target).getTime());
    }
}

function startCountdown(targetTime) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    function update() {
        const now = Date.now();
        const diff = targetTime - now;
        
        if (diff <= 0) {
            clearInterval(countdownInterval);
            document.getElementById('timer-h').textContent = '00';
            document.getElementById('timer-m').textContent = '00';
            document.getElementById('timer-s').textContent = '00';
            return;
        }
        
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('timer-h').textContent = String(h).padStart(2, '0');
        document.getElementById('timer-m').textContent = String(m).padStart(2, '0');
        document.getElementById('timer-s').textContent = String(s).padStart(2, '0');
    }
    
    update();
    countdownInterval = setInterval(update, 1000);
}

window.toggleRemind = function() {
    const btn = document.getElementById('remind-btn');
    if (!btn) return;
    
    const isActive = btn.classList.contains('active');
    if (isActive) {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="far fa-bell"></i> Ingatkan Saya';
        if (window.Toast) Toast.show('Pengingat dimatikan.', 'info');
    } else {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-bell"></i> Pengingat Aktif';
        if (window.Toast) Toast.show('Anda akan diingatkan saat kuis dimulai!', 'success');
    }
};

function renderTopScores(scores) {
    const section = document.getElementById('top-scores-section');
    const grid = document.getElementById('top-scores-grid');
    if (!section || !grid) return;

    if (!scores || scores.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    grid.innerHTML = scores.slice(0, 5).map((s, i) => {
        const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''));
        return `
        <div style="background:var(--card-bg); padding:10px; border-radius:8px; border:1px solid var(--border-color); text-align:center; font-size:0.9rem;">
            <div style="font-weight:bold; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${medal} ${s.username}
            </div>
            <div style="color:var(--accent-primary); font-weight:bold;">${Math.round(s.score)}%</div>
            <div style="font-size:0.75rem; color:#888;">${s.quiz_title || 'Kuis'}</div>
        </div>
        `;
    }).join('');
}

window.openAttemptModal = function() {
    const modal = document.getElementById('attempt-modal');
    if (modal) {
        modal.setAttribute('aria-hidden', 'false');
        // Prevent scrolling on body
        document.body.style.overflow = 'hidden';
    }
};

window.closeAttemptModal = function() {
    const modal = document.getElementById('attempt-modal');
    if (modal) {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
};

function startQuiz() {
    if (!questionsData || !questionsData.length) {
        alert('Data soal tidak ditemukan.');
        return;
    }
    
    currentQuestionIndex = 0;
    userScore = 0;
    userAnswers = [];
    startTime = Date.now();
    
    // Hide other screens
    userInfoScreen.style.display = 'none';
    if (quizSetPicker) quizSetPicker.style.display = 'none';
    document.getElementById('result-container').style.display = 'none';
    
    // Show quiz UI
    quizHeader.style.display = 'flex';
    quizBody.style.display = 'block';
    nextBtn.style.display = 'flex';
    
    if (window.Toast) Toast.show(`Mulai! ${questionsData.length} soal siap.`, 'success');

    renderQuestion();
}

function renderQuestion() {
    const q = questionsData[currentQuestionIndex];
    const total = questionsData.length;
    
    // --- Theme Transition ---
    const themes = ['theme-blue', 'theme-green', 'theme-yellow', 'theme-red', 'theme-purple'];
    const themeIndex = Math.floor(currentQuestionIndex / 5) % themes.length;
    document.body.className = 'page-quiz ' + themes[themeIndex];

    // --- Progress Bar ---
    document.getElementById('progress-text').textContent = `Soal ${currentQuestionIndex + 1} dari ${total}`;
    const pct = ((currentQuestionIndex + 1) / total) * 100;
    document.getElementById('progress-bar').style.width = `${pct}%`;
    
    // Render question HTML with optimized animation class
    // We use 'question-enter' for the entry animation
    quizBody.innerHTML = `
        <div class="question-card question-enter">
            <h3 class="question-text">${q.question}</h3>
            <div class="options-container">
                ${['a','b','c','d'].map(key => {
                    const val = q.options[key];
                    if (!val) return '';
                    return `
                    <button class="option-card" data-key="${key}" onclick="handleAnswer('${key}')">
                        <span>${key.toUpperCase()}</span>&nbsp;<span>${val}</span>
                    </button>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    nextBtn.disabled = true;
    nextBtn.onclick = nextQuestion;
}

window.handleAnswer = function(key) {
    const q = questionsData[currentQuestionIndex];
    const btns = document.querySelectorAll('.option-card');
    btns.forEach(b => {
        b.classList.remove('selected');
        if (b.dataset.key === key) b.classList.add('selected');
    });
    userAnswers[currentQuestionIndex] = key;
    nextBtn.disabled = false;
    
    // Optional: Subtle feedback that answer is selected
    // if (window.Toast) Toast.show('Jawaban dipilih', 'info');
};

async function nextQuestion() {
    if (currentQuestionIndex < questionsData.length - 1) {
        // Smooth Transition Logic
        const currentCard = document.querySelector('.question-card');
        if (currentCard) {
            // Remove enter class to avoid conflict
            currentCard.classList.remove('question-enter');
            // Add exit class (triggers slideOutLeft)
            currentCard.classList.add('question-exit');
            
            // Wait for animation duration (matches CSS 400ms)
            await new Promise(r => setTimeout(r, 400));
        }

        currentQuestionIndex++;
        renderQuestion();
    } else {
        finishQuiz();
    }
}

async function finishQuiz() {
    // Calculate score
    let score = 0;
    questionsData.forEach((q, i) => {
        if (userAnswers[i] === q.correct_answer) score++;
    });
    
    const total = questionsData.length;
    const percent = Math.round((score / total) * 100);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // Submit result
    if (window.isSubmitting) return; // Guard
    window.isSubmitting = true;
    showLoader('Mengirim jawaban...');
    
    try {
        const response = await fetch(API_URL + '/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session: existingSession,
                score,
                total,
                time_spent: timeSpent,
                quiz_set: currentQuizSet
            })
        });

        const ct = response.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            try { localStorage.removeItem('ipm_ranking_cache'); } catch {}
            
            if (window.Toast) Toast.show(`Kuis Selesai! Skor: ${percent}%`, 'success');

            // Show result UI
            quizHeader.style.display = 'none';
            quizBody.style.display = 'none';
            nextBtn.style.display = 'none';
            
            const resDiv = document.getElementById('result-container');
            resDiv.style.display = 'block';
            document.getElementById('score-text').textContent = `${percent}%`;
            document.getElementById('score-details').textContent = `Benar ${score} dari ${total} soal`;
            
            const restartBtn = document.getElementById('restart-btn');
            if (restartBtn) restartBtn.onclick = () => window.location.reload();
        } else {
            throw new Error(data.message || 'Gagal menyimpan hasil.');
        }

    } catch (e) {
        console.error(e);
        if (window.Toast) Toast.show('Gagal menyimpan: ' + e.message, 'error');
        else alert('Gagal menyimpan hasil: ' + e.message);
        window.isSubmitting = false; 
    } finally {
        hideLoader();
    }
}

// --- Helpers ---
function normalizeQuestionsResponse(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.questions)) return payload.questions;
    return [];
}

function seededRandom(seed) {
    let value = 0;
    for(let i=0; i<seed.length; i++) value += seed.charCodeAt(i);
    return function() {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    };
}

function shuffleArray(array, rng) {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(rng() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function shuffleOptions(options, rng) {
    return options; 
}

// --- Notifications ---
async function checkNotifications() {
    try {
        const res = await fetch(`${API_URL}/notifications`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.notifications && data.notifications.length > 0) {
            const unread = data.notifications.filter(n => !n.is_read);
            if (unread.length > 0) {
                // Show latest unread notification
                unread.forEach(n => {
                     if (window.Toast) Toast.show(n.message, 'info');
                });
                // Mark all as read
                await fetch(`${API_URL}/notifications?action=markRead`, { method: 'POST' });
            }
        }
    } catch {}
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Define Globals
    window.API_URL = '/api';
    const USER_SESSION_KEY = 'ipmquiz_user_session';
    const USER_USERNAME_KEY = 'ipmquiz_user_username';
    window.existingSession = sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '';
    
    if (!window.existingSession) {
        window.location.href = 'login.html';
        return;
    }
    
    const username = sessionStorage.getItem(USER_USERNAME_KEY) || localStorage.getItem(USER_USERNAME_KEY) || 'Pengguna';
    
    const nameText = document.getElementById('user-name-text');
    if (nameText) nameText.textContent = username;
    
    const nameInput = document.getElementById('username');
    if (nameInput) nameInput.value = username;
    
    const startBtn = document.getElementById('start-quiz-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            fetchQuestions();
        });
    }

    checkNotifications();
});
