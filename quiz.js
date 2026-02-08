// --- Loader System ---
window.showLoader = function (text) {
    text = text || 'Memuat...';

    // Check for AppLoader (WebView context)
    if (window.AppLoader && typeof AppLoader.show === 'function') {
        AppLoader.show(text);
        // We still show ours as fallback/overlay if AppLoader is transparent or non-blocking? 
        // Actually, usually AppLoader is native. Let's stick to valid check.
        // return; 
    }

    let overlay = document.getElementById('custom-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner-custom"></div>
            <div class="loading-text-custom">${text}</div>
        `;
        document.body.appendChild(overlay);
    } else {
        overlay.querySelector('.loading-text-custom').textContent = text;
    }

    // Force reflow
    void overlay.offsetWidth;
    overlay.classList.add('visible');
};

window.hideLoader = function () {
    if (window.AppLoader && typeof AppLoader.hide === 'function') {
        AppLoader.hide();
    }

    const overlay = document.getElementById('custom-loading-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        // Remove after transition
        setTimeout(() => {
            if (overlay && !overlay.classList.contains('visible')) {
                // keep in DOM for perf, just hidden by CSS opacity/pointer-events
            }
        }, 300);
    }
};

// --- Quiz Initialization ---
async function fetchQuestions() {
    showLoader('Mempersiapkan Soal...');
    await new Promise(r => requestAnimationFrame(r));
    nextBtn.style.display = 'none';
    quizHeader.style.display = 'none';

    try {
        // Fetch summary first
        // FIX: Ensure correct endpoint path construction. API_URL is '/api'.
        // So URL becomes '/api/questions?mode=summary'.
        const response = await fetch(`${API_URL}/questions?mode=summary`);

        // Handle non-JSON response (e.g., 404 HTML)
        const ct = response.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Server Error: ${response.status} ${response.statusText} (Response is not JSON)`);
        }

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const payload = await response.json();
        const sets = payload.sets || [];

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

// --- DYNAMIC SCHEDULE LOGIC ---
function showSetPicker(summarySets) {
    userInfoScreen.style.display = 'none';
    if (quizSetPicker) quizSetPicker.style.display = 'block';

    // Fetch Schedules relative to sets
    fetch(`${API_URL}/questions?mode=schedules`)
        .then(r => r.json())
        .then(data => {
            const schedules = data.schedules || [];
            console.log('[Quiz] Loaded schedules:', schedules);
            updateSetCards(summarySets, schedules);
            renderHeroCountdown(schedules);
            renderNextQuizSection(schedules); // NEW: Render next-quiz-section

            // Start Global Timer for Countdowns
            if (window.setTimerInterval) clearInterval(window.setTimerInterval);
            window.setTimerInterval = setInterval(() => {
                updateSetCards(summarySets, schedules, true); // Update time only
                updateHeroCountdown(schedules); // Update flip clock
                updateNextQuizTimer(schedules); // NEW: Update next-quiz timer
            }, 1000);
        })
        .catch(err => {
            console.error('Failed to load schedules', err);
            updateSetCards(summarySets, [], false); // Fallback
        });
}

// --- NEXT QUIZ SECTION ---
function renderNextQuizSection(schedules) {
    const section = document.getElementById('next-quiz-section');
    if (!section) return;

    const now = Date.now();

    // Find upcoming or active schedule
    let target = null;
    let isActive = false;

    // First check for active schedules
    const activeSchedule = schedules.find(s => {
        const start = new Date(s.start_time).getTime();
        const end = s.end_time ? new Date(s.end_time).getTime() : Infinity;
        return now >= start && now < end;
    });

    if (activeSchedule) {
        target = activeSchedule;
        isActive = true;
    } else {
        // Find next upcoming
        const upcoming = schedules
            .filter(s => new Date(s.start_time).getTime() > now)
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
        if (upcoming) target = upcoming;
    }

    if (!target) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    const titleEl = document.getElementById('nq-title');
    const subtextEl = document.getElementById('nq-subtext');

    if (titleEl) titleEl.textContent = target.title || 'Kuis Ramadan';

    if (subtextEl) {
        if (isActive) {
            subtextEl.textContent = 'Event sedang berlangsung, selamat berjuang!';
        } else {
            subtextEl.textContent = 'Akan segera dimulai, persiapkan dirimu';
        }
    }

    // Store target for timer updates
    window._nextQuizTarget = { target, isActive };

    updateNextQuizTimer(schedules);
}

function updateNextQuizTimer(schedules) {
    const timerD = document.getElementById('timer-d');
    const timerH = document.getElementById('timer-h');
    const timerM = document.getElementById('timer-m');
    const timerS = document.getElementById('timer-s');
    if (!timerH || !timerM || !timerS) return;

    const stored = window._nextQuizTarget;
    if (!stored || !stored.target) return;

    const { target, isActive } = stored;
    const now = Date.now();

    let diff = 0;
    if (isActive) {
        const end = target.end_time ? new Date(target.end_time).getTime() : Infinity;
        diff = Math.max(0, end - now);
    } else {
        const start = new Date(target.start_time).getTime();
        diff = Math.max(0, start - now);
    }

    const totalSeconds = Math.floor(diff / 1000);
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (timerD) timerD.textContent = String(d).padStart(2, '0');
    timerH.textContent = String(h).padStart(2, '0');
    timerM.textContent = String(m).padStart(2, '0');
    timerS.textContent = String(s).padStart(2, '0');
}

// --- FLIP CLOCK HERO ---
function renderHeroCountdown(schedules) {
    const heroEl = document.getElementById('hero-countdown');
    if (!heroEl) return;

    // Find the most relevant schedule to show in Hero
    // Priority: Active & Ending Soon > Active > Coming Soon
    const now = Date.now();
    let target = null;
    let mode = ''; // 'start' or 'end'

    const activeSch = schedules.find(s => {
        const start = new Date(s.start_time).getTime();
        const end = s.end_time ? new Date(s.end_time).getTime() : Infinity;
        return now >= start && now < end;
    });

    if (activeSch) {
        target = activeSch;
        mode = 'end';
    } else {
        // Find next upcoming
        const upcoming = schedules.filter(s => new Date(s.start_time).getTime() > now).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
        if (upcoming) {
            target = upcoming;
            mode = 'start';
        }
    }

    if (!target) {
        heroEl.style.display = 'none';
        return;
    }

    heroEl.style.display = 'flex';
    document.getElementById('countdown-title').textContent = mode === 'start' ? `Segera Hadir: ${target.title}` : `Sedang Berlangsung: ${target.title}`;

    // Initial Render of Clock Face
    const clockEl = document.getElementById('countdown-clock');
    clockEl.innerHTML = `
        ${createFlipUnit('Hari', 'days')}
        ${createFlipUnit('Jam', 'hours')}
        ${createFlipUnit('Menit', 'minutes')}
        ${createFlipUnit('Detik', 'seconds')}
    `;

    updateHeroCountdown(schedules);
}

function createFlipUnit(label, id) {
    return `
        <div class="flip-unit">
            <div class="flip-card" id="flip-${id}">00</div>
            <div class="flip-label">${label}</div>
        </div>
    `;
}

function updateHeroCountdown(schedules) {
    const heroEl = document.getElementById('hero-countdown');
    if (!heroEl || heroEl.style.display === 'none') return;

    // Re-evaluate target (same logic as render, optimized)
    const now = Date.now();
    let target = null;
    let isUrgent = false;

    // We store the target ID on the element to avoid flickering if switching targets? 
    // For now, simpler: just find best fit.
    const activeSch = schedules.find(s => {
        const start = new Date(s.start_time).getTime();
        const end = s.end_time ? new Date(s.end_time).getTime() : Infinity;
        return now >= start && now < end;
    });

    let diff = 0;
    if (activeSch) {
        const end = activeSch.end_time ? new Date(activeSch.end_time).getTime() : Infinity;
        diff = Math.max(0, end - now);
        if (diff < 3600000) isUrgent = true; // < 1 hour
    } else {
        const upcoming = schedules.filter(s => new Date(s.start_time).getTime() > now).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
        if (upcoming) {
            diff = Math.max(0, new Date(upcoming.start_time).getTime() - now);
        } else {
            heroEl.style.display = 'none'; // No more schedules
            return;
        }
    }

    if (isUrgent) heroEl.classList.add('urgent');
    else heroEl.classList.remove('urgent');

    const s = Math.floor(diff / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    updateFlipCard('days', d);
    updateFlipCard('hours', h);
    updateFlipCard('minutes', m);
    updateFlipCard('seconds', sec);
}

function updateFlipCard(id, val) {
    const el = document.getElementById(`flip-${id}`);
    if (!el) return;
    const current = el.innerText;
    const next = String(val).padStart(2, '0');
    if (current !== next) {
        el.innerText = next;
        // Trigger generic animation if we added one
        // el.classList.remove('flip');
        // void el.offsetWidth;
        // el.classList.add('flip');
    }
}

function updateSetCards(summarySets, schedules, timeOnly = false) {
    if (!quizSetGrid) return;

    const counts = {};
    summarySets.forEach(s => counts[s.quiz_set] = s.count);

    quizSetGrid.querySelectorAll('.set-card').forEach(btn => {
        const set = Number(btn.dataset.set || 1);
        const count = counts[set] || 0;

        // Find Schedule for this Set (Basic keyword matching)
        // Keywords: "Mingguan" -> 1, "Event" -> 2, "Bidang" -> 3
        let schedule = null;
        const keywords = { 1: 'mingguan', 2: 'event', 3: 'bidang' };

        // Try to find specific schedule
        schedule = schedules.find(s => s.title.toLowerCase().includes(keywords[set] || 'xyz'));

        // Status determination
        const now = Date.now();
        let status = 'active'; // default if no schedule
        let label = 'Tersedia';
        let subLabel = `${count} soal`;
        let colorClass = 'status-available';
        let isLocked = false;

        if (schedule) {
            const start = schedule.start_time ? new Date(schedule.start_time).getTime() : 0;
            const end = schedule.end_time ? new Date(schedule.end_time).getTime() : null;

            if (start > now) {
                status = 'coming_soon';
                isLocked = true;
                const diff = start - now;
                label = `<div>Mulai dalam:</div><div class="countdown-timer">${formatFullDuration(diff)}</div>`;
                colorClass = 'status-locked';
            } else if (end && end < now) {
                status = 'ended';
                label = 'Kuis telah berakhir';
                colorClass = 'status-ended';
            } else if (end && end > now) {
                status = 'ending_soon';
                const diff = end - now;
                label = `<div>Berakhir dalam:</div><div class="countdown-timer text-urgent">${formatFullDuration(diff)}</div>`;
                colorClass = 'status-closing';
                if (diff < 3600000) colorClass += ' urgent'; // < 1 hour
            }
        }

        if (count === 0) {
            status = 'empty';
            label = 'Belum ada soal';
            isLocked = true;
            colorClass = 'status-empty';
        }

        // Render (only if not time-only update, or update label specifically)
        // We ALWAYS update label for countdowns if element exists
        let badge = btn.querySelector('.set-status-badge');
        if (!badge && !timeOnly) {
            badge = document.createElement('div');
            badge.className = 'set-status-badge';
            const span = btn.querySelector('span');
            if (span) span.after(badge); else btn.appendChild(badge);
        }

        if (badge) {
            // Only update class if not time-only to avoid flicker, OR update always? 
            // Updating class always is safer for "urgent" transitions.
            badge.className = `set-status-badge ${colorClass}`;
            // Use innerHTML for multiline support
            badge.innerHTML = `${getIconForStatus(status)} <span>${label}</span>`;
        }

        const small = btn.querySelector('small');
        if (small && !timeOnly) {
            // ... existing small update logic ...
            if (status === 'active' || status === 'ending_soon') {
                small.innerHTML = `🔥 ${count} Soal &middot; Aktif`;
                small.className = 'small active-text';
            } else {
                small.innerHTML = `${count} Soal`;
                small.className = 'small';
            }
        }

        btn.disabled = isLocked;

        if (!timeOnly) {
            // Attach Click Event once
            btn.onclick = async () => {
                if (isLocked) return;
                currentQuizSet = set;
                handleSetSelection(set, count);
            };
        }
    });
}

function formatFullDuration(ms) {
    if (ms <= 0) return "00 bln 00 hr 00 jam 00 mnt 00 dtk";

    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor((ms / (1000 * 60 * 60 * 24)) % 30);
    const months = Math.floor((ms / (1000 * 60 * 60 * 24 * 30)));

    let parts = [];
    if (months > 0) parts.push(`<b>${months}</b> bln`);
    if (days > 0 || months > 0) parts.push(`<b>${days}</b> hr`);
    parts.push(`<b>${String(hours).padStart(2, '0')}</b> jam`);
    parts.push(`<b>${String(minutes).padStart(2, '0')}</b> mnt`);
    parts.push(`<b>${String(seconds).padStart(2, '0')}</b> dtk`);

    return parts.join(' ');
}

function formatDuration(ms) {
    // Legacy support or short version if needed
    return formatFullDuration(ms);
}

function getIconForStatus(s) {
    if (s === 'coming_soon') return '<i class="fas fa-clock"></i>';
    if (s === 'ending_soon') return '<i class="fas fa-hourglass-half"></i>';
    if (s === 'ended') return '<i class="fas fa-flag-checkered"></i>';
    if (s === 'empty') return '<i class="fas fa-ban"></i>';
    return '<i class="fas fa-check-circle"></i>';
}

async function handleSetSelection(set, count) {
    try {
        showLoader('Mengunduh Soal...');
        const qRes = await fetch(`${API_URL}/questions?set=${set}`);
        if (!qRes.ok) throw new Error('Gagal mengunduh soal.');
        const qPayload = await qRes.json();
        let qData = normalizeQuestionsResponse(qPayload);
        qData = qData.filter(q => q.active !== false);

        if (!qData.length) {
            alert('Set ini kosong.');
            hideLoader();
            return;
        }

        quizSeed = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
        const srng = seededRandom(quizSeed);
        const shuffled = shuffleArray(qData, srng).map(q => ({
            ...q,
            optionOrder: shuffleArray(['a', 'b', 'c', 'd'], srng)
        }));
        questionsData = shuffled;

        if (quizSetPicker) quizSetPicker.style.display = 'none';
        hideLoader();
        startQuiz();

    } catch (e) {
        console.error(e);
        alert('Terjadi kesalahan saat memulai kuis: ' + e.message);
        hideLoader();
    }
}

// --- MISSING LOGIC IMPLEMENTATION ---

// Globals
let currentQuestionIndex = 0;
let userScore = 0;
let userAnswers = [];
let quizTimer;
let startTime;
let questionsData = [];
let currentQuizSet = 1;
let quizSeed = '';

// DOM Elements
const userInfoScreen = document.getElementById('user-info-screen');
const quizSetPicker = document.getElementById('quiz-set-picker');
const quizSetGrid = document.getElementById('quiz-set-grid');
const quizHeader = document.getElementById('quiz-header');
const quizBody = document.getElementById('quiz-body');
const nextBtn = document.getElementById('next-btn');

document.getElementById('result-container').style.display = 'none';

function startQuiz() {
    // Reset state
    currentQuestionIndex = 0;
    userScore = 0;
    userAnswers = [];
    startTime = Date.now();

    // Show quiz UI
    quizHeader.style.display = 'flex';
    quizBody.style.display = 'block';
    nextBtn.style.display = 'flex';

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
    // Use (currentQuestionIndex + 1) to show current progress including the one being viewed
    const pct = ((currentQuestionIndex + 1) / total) * 100;
    document.getElementById('progress-bar').style.width = `${pct}%`;

    // Render question HTML with optimized animation class
    quizBody.innerHTML = `
        <div class="question-card slide-in">
            <h3 class="question-text">${q.question}</h3>
            <div class="options-container">
                ${(q.optionOrder || ['a', 'b', 'c', 'd']).map(key => {
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

    // Button State
    if (currentQuestionIndex === total - 1) {
        nextBtn.innerHTML = '<i class="fas fa-check"></i> Kirim';
        nextBtn.classList.add('btn-finish'); // Optional styling hook
    } else {
        nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
        nextBtn.classList.remove('btn-finish');
    }

    nextBtn.disabled = true;
    nextBtn.onclick = nextQuestion;
}

// Animation Control
window.toggleAnimation = function (paused) {
    document.body.style.setProperty('--anim-play-state', paused ? 'paused' : 'running');
    const cards = document.querySelectorAll('.question-card, .option-card, .loading-logo');
    cards.forEach(el => {
        el.style.animationPlayState = paused ? 'paused' : 'running';
        el.style.transition = paused ? 'none' : '';
    });
};

window.handleAnswer = function (key) {
    const q = questionsData[currentQuestionIndex];
    const btns = document.querySelectorAll('.option-card');
    btns.forEach(b => {
        b.classList.remove('selected');
        if (b.dataset.key === key) b.classList.add('selected');
    });
    userAnswers[currentQuestionIndex] = key;
    nextBtn.disabled = false;
};

function nextQuestion() {
    if (currentQuestionIndex < questionsData.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        finishQuiz();
    }
}

async function finishQuiz() {
    // Collect answers
    const answersPayload = {};
    questionsData.forEach((q, i) => {
        // Map userAnswers array (indexed by i) to question ID
        if (userAnswers[i]) {
            answersPayload[q.id] = userAnswers[i];
        }
    });

    // We strictly rely on server side scoring now
    // Client side calc is removed/ignored

    const total = questionsData.length;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    // Submit result
    // Submit result
    if (window.isSubmitting) return; // Guard
    window.isSubmitting = true;

    // UX: Loading State
    nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    nextBtn.disabled = true;

    // Optional: Toast "Mengirim..."
    if (window.Toast) window.Toast.show('Mengirim jawaban...', 'info');

    try {
        const response = await fetch(API_URL + '/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session: existingSession,
                answers: answersPayload,
                time_spent: timeSpent,
                quiz_set: currentQuizSet
            })
        });

        // Check for non-JSON response
        const ct = response.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Server Error: ${response.status} (Not JSON)`);
        }

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            try { localStorage.removeItem('ipm_ranking_cache'); } catch { }

            if (window.Toast) window.Toast.show('Jawaban berhasil dikirim! 🎉', 'success');

            // Show result UI with Server Data
            quizHeader.style.display = 'none';
            quizBody.style.display = 'none';
            nextBtn.style.display = 'none';

            const resDiv = document.getElementById('result-container');
            resDiv.style.display = 'block';

            // Animation for Result
            resDiv.classList.add('slide-in');

            // Use server returned score/percent
            const serverScore = data.score || 0;
            const serverTotal = data.total || total;
            const serverPercent = data.percent !== undefined ? data.percent : Math.round((serverScore / serverTotal) * 100);

            const scoreText = document.getElementById('score-text');
            const scoreDetail = document.getElementById('score-details');

            // Animate Score Counter
            let currentP = 0;
            const targetP = serverPercent;
            const interval = setInterval(() => {
                if (currentP >= targetP) {
                    clearInterval(interval);
                    scoreText.textContent = `${targetP}%`;
                } else {
                    currentP++;
                    scoreText.textContent = `${currentP}%`;
                }
            }, 20);

            scoreDetail.textContent = `Benar ${serverScore} dari ${serverTotal} soal`;

            // Setup Buttons
            const restartBtn = document.getElementById('restart-btn');
            if (restartBtn) restartBtn.onclick = () => window.location.reload();

            // UX: Scroll to result
            resDiv.scrollIntoView({ behavior: 'smooth' });

        } else {
            throw new Error(data.message || 'Gagal menyimpan hasil.');
        }

    } catch (e) {
        console.error(e);
        if (window.Toast) window.Toast.show('Gagal: ' + e.message, 'error');
        else alert('Gagal menyimpan hasil: ' + e.message);

        // UX: Restore button state on error
        nextBtn.innerHTML = '<i class="fas fa-check"></i> Kirim Ulang';
        nextBtn.disabled = false;

        window.isSubmitting = false;
    } finally {
        // hideLoader(); // We removed showLoader call above to use Button Loading instead
    }
}

function normalizeQuestionsResponse(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.questions)) return payload.questions;
    return [];
}

function seededRandom(seed) {
    let value = 0;
    for (let i = 0; i < seed.length; i++) value += seed.charCodeAt(i);
    return function () {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    };
}

function shuffleArray(array, rng) {
    let currentIndex = array.length, randomIndex;
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

// --- DOMContentLoaded Logic ---
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

    // Update UI
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
});
