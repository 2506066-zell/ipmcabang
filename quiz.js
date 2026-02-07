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
    // Clear previous state
    nextBtn.style.display = 'none';
    quizHeader.style.display = 'none';

    // Timeout logic for robustness
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const response = await fetch(`${API_URL}/questions?mode=summary`, { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' } 
        });
        
        clearTimeout(timeoutId);

        const ct = response.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) {
            throw new Error(`Server Error: ${response.status} (Invalid Content-Type)`);
        }

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const payload = await response.json();
        const sets = payload.sets || [];
        
        // Handle Next Quiz Info (REST Source - Primary)
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
        clearTimeout(timeoutId);
        console.error('Fetch Questions Error:', error);
        
        quizBody.style.display = 'block';
        quizBody.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Gagal memuat kuis</h3>
                <p>${error.name === 'AbortError' ? 'Koneksi lambat (Timeout)' : error.message}</p>
                <button id="empty-reload-quiz" class="login-button">Muat Ulang</button>
            </div>`;
        const btn = document.getElementById('empty-reload-quiz');
        if (btn) btn.addEventListener('click', () => fetchQuestions());
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
    if (!section || !info) {
        if (section) section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    if (info.title) document.getElementById('nq-title').textContent = info.title;
    if (info.topic) document.getElementById('nq-topic').textContent = info.topic; // Changed: Just the topic text
    
    if (info.countdown_target) {
        startCountdown(new Date(info.countdown_target).getTime());
    }
}

function startCountdown(targetTime) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    // Cached DOM elements
    const els = {
        d: document.getElementById('timer-d'),
        h: document.getElementById('timer-h'),
        m: document.getElementById('timer-m'),
        s: document.getElementById('timer-s'),
        topic: document.getElementById('nq-topic')
    };

    let prevSec = -1;

    function update() {
        const now = Date.now();
        const diff = targetTime - now;
        
        if (diff <= 0) {
            clearInterval(countdownInterval);
            ['d','h','m','s'].forEach(k => els[k].textContent = '00');
            
            // Subtle pulse for ended state
            if (els.topic) {
                els.topic.textContent = "Kuis telah dimulai! Silakan refresh.";
                els.topic.style.color = 'var(--accent-success)';
                els.topic.style.fontWeight = 'bold';
                els.topic.style.animation = 'pulseText 2s infinite';
            }
            return;
        }
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        // Update DOM with leading zeros
        if (els.d) els.d.textContent = String(d).padStart(2, '0');
        if (els.h) els.h.textContent = String(h).padStart(2, '0');
        if (els.m) els.m.textContent = String(m).padStart(2, '0');
        
        if (els.s) {
            const sStr = String(s).padStart(2, '0');
            if (els.s.textContent !== sStr) {
                els.s.textContent = sStr;
                // Subtle Animation per second
                els.s.parentElement.animate([
                    { transform: 'scale(0.96)', opacity: 0.8 },
                    { transform: 'scale(1)', opacity: 1 }
                ], { duration: 200, easing: 'ease-out' });
            }
        }
    }
    
    update();
    countdownInterval = setInterval(update, 1000);
}

function initSSE() {
    if (!window.EventSource) return;
    
    let evtSource;
    const connect = () => {
        console.log('SSE: Connecting...');
        evtSource = new EventSource('/api/events');
        
        evtSource.onopen = () => {
            console.log('SSE: Connected');
        };
        
        evtSource.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'schedule_update') {
                    console.log('SSE: Schedule Update', msg.data);
                    if (msg.data) {
                        initNextQuiz(msg.data);
                        if (window.Toast) Toast.show('Info kuis diperbarui', 'info');
                    } else {
                        const section = document.getElementById('next-quiz-section');
                        if (section) section.style.display = 'none';
                    }
                }
            } catch (err) { console.error('SSE Parse Error', err); }
        };
        
        evtSource.onerror = (err) => {
            console.error('SSE Error', err);
            evtSource.close();
            // Retry after 10s
            setTimeout(connect, 10000);
        };
    };
    
    connect();
}

// --- SSE & Countdown ---
function initNextQuiz(data) {
    const section = document.getElementById('next-quiz-section');
    if (!section || !data) return;
    
    // Update Text
    document.getElementById('nq-title').textContent = data.title || 'Event Mendatang';
    document.getElementById('nq-topic').textContent = data.topic ? `Topik: ${data.topic}` : '';
    section.style.display = 'block';
    
    // Start Countdown
    startCountdown(data.countdown_target);
}

function startCountdown(targetDateStr) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    const target = new Date(targetDateStr).getTime();
    const els = {
        h: document.getElementById('timer-h'),
        m: document.getElementById('timer-m'),
        s: document.getElementById('timer-s')
    };
    
    if (!els.h || !els.m || !els.s) return;
    
    const update = () => {
        const now = Date.now();
        const diff = target - now;
        
        if (diff <= 0) {
            clearInterval(countdownInterval);
            els.h.textContent = '00';
            els.m.textContent = '00';
            els.s.textContent = '00';
            // Refresh quiz if time arrived
            if (diff > -5000) fetchQuestions(); // Refresh only if just happened
            return;
        }
        
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        els.h.textContent = String(h).padStart(2, '0');
        els.m.textContent = String(m).padStart(2, '0');
        els.s.textContent = String(s).padStart(2, '0');
    };
    
    update();
    countdownInterval = setInterval(update, 1000);
}

function initSSE() {
    if (!window.EventSource) return;
    
    const connect = () => {
        const source = new EventSource('/api/events'); // Use direct path handled by Vercel
        
        source.onmessage = (e) => {
            // Heartbeat or simple message
        };
        
        source.addEventListener('schedule_update', (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data) {
                    initNextQuiz(data);
                    if (window.Toast) Toast.show('Jadwal kuis diperbarui!', 'info');
                } else {
                    document.getElementById('next-quiz-section').style.display = 'none';
                }
            } catch {}
        });
        
        source.onerror = () => {
            source.close();
            setTimeout(connect, 10000);
        };
    };
    
    connect();
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
};

// --- Reset Logic ---
window.resetQuiz = function() {
    if (!questionsData || !questionsData.length) return;
    
    // Konfirmasi dialog untuk mencegah reset tidak disengaja
    if (!confirm('Apakah Anda yakin ingin mengulang kuis dari awal? Semua jawaban saat ini akan dihapus.')) return;
    
    // Logika menghapus semua jawaban yang tersimpan, skor, dan progres
    currentQuestionIndex = 0;
    userScore = 0;
    userAnswers = [];
    startTime = Date.now(); // Reset timer juga
    
    // UI Update
    if (window.Toast) Toast.show('Kuis direset. Selamat mengerjakan ulang!', 'info');
    
    // Pengalihan kembali ke bagian awal (nomor 1)
    renderQuestion();
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
        const res = await fetch(`${API_URL}/users?action=notifications`);
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
                await fetch(`${API_URL}/users?action=markNotificationsRead`, { method: 'POST' });
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

    const resetBtn = document.getElementById('reset-quiz-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (typeof window.resetQuiz === 'function') window.resetQuiz();
        });
    }

    checkNotifications();
    initSSE();
});
