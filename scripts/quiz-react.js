const { useEffect, useMemo, useRef, useState } = React;
const e = React.createElement;

const API_URL = '/api';
const SESSION_KEY = 'ipmquiz_user_session';
const USERNAME_KEY = 'ipmquiz_user_username';
const STORAGE_PREFIX = 'ipm_gamified_v1';

const xpForLevel = (level) => 100 + level * 50;

const DEFAULT_SETTINGS = {
  enabled: true,
  timer_seconds: 20,
  xp_base: 10,
  streak_bonus: 2,
  streak_cap: 5,
  quest_daily_target: 3,
  quest_highscore_target: 2,
  highscore_percent: 80
};

const getDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const loadProfile = (username) => {
  const key = `${STORAGE_PREFIX}_${username || 'guest'}`;
  let data = null;
  try {
    data = JSON.parse(localStorage.getItem(key) || 'null');
  } catch (e) {}
  if (!data) {
    data = {
      xpTotal: 0,
      streak: 0,
      totalCompleted: 0,
      todayCount: 0,
      todayKey: getDateKey(),
      highScoreToday: 0,
      badges: [],
      completedSets: [],
      lastScore: null,
      lastPercent: null
    };
  }
  if (!Array.isArray(data.completedSets)) data.completedSets = [];
  const todayKey = getDateKey();
  if (data.todayKey !== todayKey) {
    data.todayKey = todayKey;
    data.todayCount = 0;
    data.highScoreToday = 0;
  }
  return data;
};

const saveProfile = (username, data) => {
  const key = `${STORAGE_PREFIX}_${username || 'guest'}`;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
};

const calcLevel = (xpTotal) => {
  let level = 1;
  let remaining = xpTotal;
  let next = xpForLevel(level);
  while (remaining >= next) {
    remaining -= next;
    level += 1;
    next = xpForLevel(level);
  }
  return { level, inLevel: remaining, next };
};

const normalizeOptions = (options) => {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.map((label, idx) => ({ key: String.fromCharCode(97 + idx), label }));
  }
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return normalizeOptions(parsed);
    } catch (e) {
      return [];
    }
  }
  if (typeof options === 'object') {
    return Object.keys(options).map((key) => ({ key, label: options[key] }));
  }
  return [];
};

const toast = (message, type = 'info') => {
  if (window.Toast && typeof window.Toast.show === 'function') {
    window.Toast.show(message, type);
  }
};

function useSession() {
  const [session, setSession] = useState('');
  const [username, setUsername] = useState('Pengguna');

  useEffect(() => {
    const storedSession = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || '';
    const storedUsername = sessionStorage.getItem(USERNAME_KEY) || localStorage.getItem(USERNAME_KEY) || 'Pengguna';
    if (!storedSession) {
      window.location.href = 'login.html';
      return;
    }
    setSession(storedSession);
    setUsername(storedUsername);
  }, []);

  return { session, username };
}

function useQuizSets() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextQuiz, setNextQuiz] = useState(null);

  const buildSetSummary = (rows) => {
    const map = {};
    rows.forEach((row) => {
      const setId = row.quiz_set;
      if (setId === null || typeof setId === 'undefined') return;
      if (!map[setId]) {
        map[setId] = { quiz_set: setId, count: 0 };
      }
      map[setId].count += 1;
    });
    return Object.keys(map)
      .map((key) => map[key])
      .sort((a, b) => Number(a.quiz_set) - Number(b.quiz_set));
  };

  const loadFallback = async () => {
    const res = await fetch(`${API_URL}/questions?size=200`);
    if (!res.ok) throw new Error('Gagal memuat kuis.');
    const data = await res.json();
    if (data && data.status === 'success') {
      const rows = Array.isArray(data.questions) ? data.questions : [];
      return buildSetSummary(rows);
    }
    if (Array.isArray(data)) {
      return buildSetSummary(data);
    }
    throw new Error((data && data.message) || 'Data kuis tidak valid');
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/questions?mode=summary`);
      if (!res.ok) throw new Error('Gagal memuat kuis.');
      const data = await res.json();
      if (data && data.status === 'success') {
        setSets(Array.isArray(data.sets) ? data.sets : []);
        setNextQuiz(data.next_quiz || null);
      } else {
        throw new Error((data && data.message) || 'Data kuis tidak valid');
      }
    } catch (e) {
      try {
        const fallbackSets = await loadFallback();
        setSets(fallbackSets);
        setNextQuiz(null);
        if (fallbackSets.length === 0) {
          const msg = 'Belum ada kuis aktif. Pastikan soal sudah diaktifkan oleh admin.';
          setError(msg);
          toast(msg, 'info');
        }
      } catch (fallbackError) {
        const message = (fallbackError && fallbackError.message) || (e && e.message) || 'Gagal memuat kuis.';
        setError(message);
        toast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);
  return { sets, loading, error, reload: load, nextQuiz };
}

function useGamificationSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/questions?mode=gamification`);
        if (!res.ok) throw new Error('Gagal memuat pengaturan gamifikasi.');
        const data = await res.json();
        if (!mounted) return;
        if (data && data.status === 'success' && data.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        }
      } catch (e) {}
    };
    load();
    return () => { mounted = false; };
  }, []);
  return settings;
}

function Dashboard({ profile, questPop }) {
  const { level, inLevel, next } = calcLevel(profile.xpTotal || 0);
  const settings = profile.__settings || DEFAULT_SETTINGS;
  const progress = Math.min(100, Math.round((inLevel / next) * 100));
  const completedSets = Array.isArray(profile.completedSets) ? profile.completedSets : [];
  const quests = [
    {
      id: 'daily-3',
      label: `Selesaikan ${settings.quest_daily_target} kuis hari ini`,
      value: Math.min(profile.todayCount, settings.quest_daily_target),
      total: settings.quest_daily_target,
      done: profile.todayCount >= settings.quest_daily_target
    },
    {
      id: 'highscore-2',
      label: `Skor ${settings.highscore_percent}%+ sebanyak ${settings.quest_highscore_target}x`,
      value: Math.min(profile.highScoreToday || 0, settings.quest_highscore_target),
      total: settings.quest_highscore_target,
      done: (profile.highScoreToday || 0) >= settings.quest_highscore_target
    },
    {
      id: 'first-quiz',
      label: 'Selesaikan 1 kuis pertama',
      value: Math.min(profile.totalCompleted || 0, 1),
      total: 1,
      done: (profile.totalCompleted || 0) >= 1
    },
    {
      id: 'streak-3',
      label: 'Streak 3 jawaban benar beruntun',
      value: Math.min(profile.streak || 0, 3),
      total: 3,
      done: (profile.streak || 0) >= 3
    },
    {
      id: 'streak-5',
      label: 'Streak 5 jawaban benar beruntun',
      value: Math.min(profile.streak || 0, 5),
      total: 5,
      done: (profile.streak || 0) >= 5
    },
    {
      id: 'multi-set',
      label: 'Selesaikan 2 set kuis berbeda',
      value: Math.min(completedSets.length, 2),
      total: 2,
      done: completedSets.length >= 2
    }
  ];
  const allQuestsDone = quests.length ? quests.every(q => q.done) : false;
  const nextQuest = quests.find(q => !q.done) || (quests.length ? quests[quests.length - 1] : null);
  const questsToShow = nextQuest ? [nextQuest] : [];

  return e(
    'div',
    { className: 'quiz-grid' },
    e(
      'div',
      { className: 'quiz-card xp-card' },
      e('h3', null, `Level ${level}`),
      e('div', { className: 'xp-bar' }, e('span', { style: { width: `${progress}%` } })),
      e('div', { style: { fontSize: '0.85rem', color: '#64748b' } }, `${inLevel} XP / ${next} XP`),
      e('div', { className: 'streak-badge' }, e('i', { className: 'fas fa-bolt' }), ` Streak: ${profile.streak || 0}`),
      profile.lastPercent !== null
        ? e('div', { style: { fontSize: '0.85rem', color: '#0f172a' } }, `Skor terakhir: ${profile.lastPercent}%`)
        : null,
      e('a', { className: 'quiz-link', href: '/ranking.html' }, 'Lihat Ranking')
    ),
    e(
      'div',
      { className: 'quiz-card quest-card' },
      e('h3', null, 'Quest Aktif'),
      questPop ? e('div', { className: 'quest-pop', role: 'status' }, questPop) : null,
      questsToShow.map((q) => e(
        'div',
        { key: q.id, className: `quest-item ${q.done ? 'quest-done' : ''}` },
        e(
          'div',
          { className: 'quest-meta' },
          e('span', null, q.label),
          e('span', null, `${q.value} / ${q.total}`)
        ),
        e('div', { className: 'quest-bar' }, e('span', { style: { width: `${Math.min(100, Math.round((q.value / q.total) * 100))}%` } }))
      )),
      (!questsToShow.length && allQuestsDone)
        ? e('div', { className: 'quest-all-done' }, 'Semua quest selesai hari ini. Mantap!')
        : null,
      profile.badges && profile.badges.length > 0
        ? e(
          'div',
          { style: { marginTop: 10 } },
          profile.badges.map((b) => e('span', { key: b, className: 'badge-chip' }, e('i', { className: 'fas fa-medal' }), ` ${b}`))
        )
        : null
    )
  );
}

function QuizList({ sets, loading, error, onSelect, onReload }) {
  return e(
    'div',
    { className: 'quiz-card' },
    e('h3', null, 'Daftar Kuis'),
    loading ? e('div', { style: { fontSize: '0.9rem', color: '#64748b' } }, 'Memuat daftar kuis...') : null,
    error ? e('div', { style: { fontSize: '0.9rem', color: '#b91c1c', marginBottom: 8 } }, error) : null,
    e(
      'div',
      { className: 'quiz-list' },
      sets.map((s) => e(
        'div',
        { key: s.quiz_set, className: 'quiz-tile', onClick: () => onSelect(s.quiz_set) },
        e('div', { style: { fontWeight: 700 } }, `Kuis Set ${s.quiz_set}`),
        e(
          'div',
          { style: { fontSize: '0.8rem', color: '#64748b' } },
          `${s.count || 0} soal${s.attempted ? ' - Sudah dikerjakan' : ''}`
        )
      ))
    ),
    sets.length === 0
      ? e('div', { style: { fontSize: '0.9rem', color: '#64748b' } }, 'Belum ada kuis aktif. Pastikan soal sudah diaktifkan oleh admin.')
      : null,
    onReload
      ? e('button', { className: 'quiz-option', style: { marginTop: 10 }, onClick: onReload }, 'Muat Ulang')
      : null
  );
}

function QuizQuestion({ quizSet, onExit, onFinish, onImmediateReward, timerSeconds, xpBurst, soundOn, onToggleSound, onSound, streak, streakPulse }) {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [timer, setTimer] = useState(timerSeconds || 20);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackTone, setFeedbackTone] = useState('neutral');
  const [hasCorrect, setHasCorrect] = useState(false);
  const [animate, setAnimate] = useState(false);
  const startedAt = useRef(Date.now());
  const confettiRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/questions?set=${quizSet}`);
        if (!res.ok) throw new Error('Gagal memuat soal.');
        const data = await res.json();
        const rows = Array.isArray(data.questions) ? data.questions : (Array.isArray(data) ? data : []);
        const normalized = rows.map((q) => ({
          id: q.id,
          question: q.question || q.question_text,
          options: normalizeOptions(q.options),
          correct: q.correct_answer || q.correct_option || q.correct || null
        }));
        if (!mounted) return;
        setQuestions(normalized);
        setHasCorrect(normalized.some(q => !!q.correct));
        setIndex(0);
        setAnswers({});
        setCorrectCount(0);
        setWrongCount(0);
        setSelected(null);
        startedAt.current = Date.now();
      } catch (e) {
        toast(e.message || 'Gagal memuat soal', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [quizSet]);

  useEffect(() => {
    if (!questions[index]) return;
    setTimer(timerSeconds || 20);
    setFeedback(null);
    setFeedbackText('');
    setFeedbackTone('neutral');
    setSelected(null);
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 360);
    return () => clearTimeout(t);
  }, [index, questions, timerSeconds]);

  useEffect(() => {
    if (loading || !questions[index]) return;
    if (timer <= 0) {
      handleAnswer(null);
      return;
    }
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer, loading, index, questions]);

  const spawnConfetti = () => {
    const host = confettiRef.current;
    if (!host) return;
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
    for (let i = 0; i < 12; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.setProperty('--x', `${Math.random() * 100}%`);
      piece.style.setProperty('--delay', `${Math.random() * 120}ms`);
      piece.style.setProperty('--dur', `${500 + Math.random() * 400}ms`);
      piece.style.backgroundColor = colors[i % colors.length];
      host.appendChild(piece);
      piece.addEventListener('animationend', () => piece.remove());
    }
  };

  const handleAnswer = (choice) => {
    const q = questions[index];
    if (!q || selected !== null) return;
    const chosenKey = choice || '';
    setSelected(chosenKey);
    setAnswers(prev => ({ ...prev, [q.id]: chosenKey }));

    let isCorrect = null;
    let correctInc = 0;
    let wrongInc = 0;
    if (q.correct) {
      isCorrect = String(chosenKey).toLowerCase() === String(q.correct).toLowerCase();
      setFeedback(isCorrect ? 'correct' : 'wrong');
      setFeedbackText(isCorrect ? 'Jawaban benar! XP bertambah.' : 'Belum tepat, coba fokus di soal berikutnya.');
      setFeedbackTone(isCorrect ? 'positive' : 'negative');
      onImmediateReward(isCorrect);
      if (onSound) onSound(isCorrect ? 'correct' : 'wrong');
      if (isCorrect) spawnConfetti();
      if (isCorrect) {
        correctInc = 1;
        setCorrectCount(c => c + 1);
      } else {
        wrongInc = 1;
        setWrongCount(c => c + 1);
      }
    } else {
      setFeedback('saved');
      setFeedbackText('Jawaban tersimpan, penilaian dihitung setelah selesai.');
      setFeedbackTone('neutral');
    }

    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex(i => i + 1);
      } else {
        onFinish({
          answers,
          finalAnswer: { [q.id]: chosenKey },
          total: questions.length,
          startedAt: startedAt.current,
          hasCorrect,
          correctCount: correctCount + correctInc,
          wrongCount: wrongCount + wrongInc
        });
      }
    }, 700);
  };

  if (loading) {
    return e('div', { className: 'quiz-card quiz-question' }, e('div', null, 'Memuat soal...'));
  }

  const q = questions[index];
  if (!q) {
    return e(
      'div',
      { className: 'quiz-card quiz-question' },
      e('div', null, 'Soal tidak ditemukan.'),
      e('button', { className: 'quiz-option', onClick: onExit }, 'Kembali')
    );
  }

  const isUrgent = timer <= 10;
  const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;

  return e(
    'div',
    { className: `quiz-card quiz-question${animate ? ' animate' : ''}${isUrgent ? ' is-urgent' : ''}` },
    e(
      'div',
      { className: 'quiz-question-header' },
      e(
        'div',
        { className: 'quiz-question-title' },
        e('span', { className: 'quiz-floating-icon', 'aria-hidden': 'true' }, e('i', { className: 'fas fa-pen-to-square' })),
        e(
          'div',
          { className: 'quiz-question-meta' },
          e('strong', null, `Soal ${index + 1} / ${questions.length}`),
          e(
            'div',
            { className: `streak-avatar ${streakPulse ? 'pulse' : ''}` },
            e('i', { className: 'fas fa-fire' }),
            e('span', null, streak || 0)
          )
        )
      ),
      e(
        'div',
        { className: 'quiz-header-actions' },
        e(
          'button',
          {
            type: 'button',
            className: `quiz-sound-toggle ${soundOn ? '' : 'muted'}`,
            'aria-label': soundOn ? 'Matikan suara' : 'Aktifkan suara',
            onClick: onToggleSound
          },
          e('i', { className: `fas ${soundOn ? 'fa-volume-up' : 'fa-volume-mute'}` })
        ),
        e('span', { className: `quiz-timer${isUrgent ? ' is-urgent' : ''}` }, e('i', { className: 'fas fa-clock' }), ` ${timer}s`)
      )
    ),
    e(
      'div',
      { className: 'quiz-progress', 'aria-hidden': 'true' },
      e('span', { style: { width: `${progress}%` } }),
      e('span', { className: 'quiz-progress-dot', style: { left: `${progress}%` } })
    ),
    xpBurst ? e('div', { className: 'xp-burst', key: xpBurst.id }, `+${xpBurst.value} XP`) : null,
    e('div', { className: 'confetti-layer', ref: confettiRef, 'aria-hidden': 'true' }),
    e('div', { style: { fontSize: '1.1rem', fontWeight: 600 } }, q.question),
    e(
      'div',
      { className: 'quiz-options' },
      q.options.map((opt) => {
        const isCorrect = feedback === 'correct' && opt.key === selected;
        const isWrong = feedback === 'wrong' && opt.key === selected;
        return e(
          'button',
          {
            key: opt.key,
            className: `quiz-option${isCorrect ? ' correct' : ''}${isWrong ? ' wrong' : ''}`,
            onClick: () => handleAnswer(opt.key)
          },
          e('strong', { style: { marginRight: 8 } }, opt.key.toUpperCase()),
          opt.label
        );
      })
    ),
    feedbackText ? e('div', { className: `quiz-feedback ${feedbackTone}` }, feedbackText) : null
  );
}

function NextQuizCountdown({ nextQuiz }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!nextQuiz || !nextQuiz.countdown_target) {
      setTimeLeft('');
      return undefined;
    }

    const update = () => {
      const target = new Date(nextQuiz.countdown_target).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);
      if (!diff) {
        setTimeLeft('Mulai sekarang');
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const parts = [];
      if (days) parts.push(`${days}h`);
      parts.push(`${String(hours).padStart(2, '0')}j`);
      parts.push(`${String(minutes).padStart(2, '0')}m`);
      parts.push(`${String(seconds).padStart(2, '0')}d`);
      setTimeLeft(parts.join(' '));
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [nextQuiz]);

  if (!nextQuiz || !nextQuiz.title) return null;

  return e(
    'div',
    { className: 'quiz-top-grid' },
    e(
      'div',
      { className: 'quiz-top-card' },
      e('div', { className: 'quiz-top-label' }, 'Kuis Berikutnya'),
      e('div', { className: 'quiz-top-title' }, nextQuiz.title),
      nextQuiz.topic ? e('div', { className: 'quiz-top-subtitle' }, nextQuiz.topic) : null,
      timeLeft ? e('div', { className: 'quiz-top-countdown' }, timeLeft) : null
    )
  );
}

function QuizResultSummary({ summary, onClose }) {
  if (!summary) return null;
  return e(
    'div',
    { className: 'quiz-card quiz-result-card' },
    e(
      'div',
      { className: 'quiz-result-header' },
      e(
        'div',
        null,
        e('div', { className: 'quiz-result-title' }, 'Hasil Kuis'),
        e('div', { className: 'quiz-result-sub' }, `Skor ${summary.score} / ${summary.total} • ${summary.percent}%`)
      ),
      e('button', { className: 'quiz-result-close', type: 'button', onClick: onClose, 'aria-label': 'Tutup hasil' }, 'Tutup')
    ),
    e(
      'div',
      { className: 'quiz-result-metrics' },
      e('div', { className: 'result-metric correct' },
        e('span', { className: 'metric-icon' }, e('i', { className: 'fas fa-check' })),
        e('div', null, e('div', { className: 'metric-label' }, 'Benar'), e('div', { className: 'metric-value' }, summary.correct))
      ),
      e('div', { className: 'result-metric wrong' },
        e('span', { className: 'metric-icon' }, e('i', { className: 'fas fa-xmark' })),
        e('div', null, e('div', { className: 'metric-label' }, 'Salah'), e('div', { className: 'metric-value' }, summary.wrong))
      ),
      e('div', { className: 'result-metric time' },
        e('span', { className: 'metric-icon' }, e('i', { className: 'fas fa-stopwatch' })),
        e('div', null, e('div', { className: 'metric-label' }, 'Waktu'), e('div', { className: 'metric-value' }, `${summary.timeSpent}s`))
      )
    ),
    e('div', { className: 'quiz-result-hint' }, 'Mantap! Jawaban sudah dinilai. Kamu bisa pilih set lain atau ulangi.')
  );
}

function App() {
  const { session, username } = useSession();
  const { sets, loading, error, reload, nextQuiz } = useQuizSets();
  const settings = useGamificationSettings();
  const [profile, setProfile] = useState(loadProfile('guest'));
  const [activeSet, setActiveSet] = useState(null);
  const [resultSummary, setResultSummary] = useState(null);
  const [pulse, setPulse] = useState({ xp: false, streak: false, quest: false, badge: false });
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('ipm_quiz_sound') !== 'off');
  const [xpBurst, setXpBurst] = useState(null);
  const [streakPulse, setStreakPulse] = useState(false);
  const [questPop, setQuestPop] = useState('');

  useEffect(() => {
    if (!username) return;
    const data = loadProfile(username);
    setProfile(data);
  }, [username]);

  const updateProfile = (updater) => {
    setProfile((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      next.__settings = settings;
      saveProfile(username, next);
      return next;
    });
  };

  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ipm_quiz_sound', next ? 'on' : 'off');
      } catch (e) {}
      return next;
    });
  };

  const playSound = (type) => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = window.__quizAudioCtx || new AudioCtx();
      window.__quizAudioCtx = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = type === 'correct' ? 880 : 220;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + (type === 'correct' ? 0.08 : 0.12));
    } catch (e) {}
  };

  const playHaptic = (type) => {
    try {
      if (!navigator || typeof navigator.vibrate !== 'function') return;
      if (type === 'correct') navigator.vibrate(18);
      if (type === 'wrong') navigator.vibrate([20, 20, 20]);
    } catch (e) {}
  };

  const handleImmediateReward = (isCorrect) => {
    const prevStreak = profile.streak || 0;
    const bonus = Math.min(prevStreak, settings.streak_cap) * settings.streak_bonus;
    const xpGain = isCorrect ? settings.xp_base + bonus : 0;

    updateProfile((prev) => {
      const next = { ...prev };
      if (isCorrect === true) {
        next.xpTotal = (prev.xpTotal || 0) + settings.xp_base + bonus;
        next.streak = (prev.streak || 0) + 1;
      } else if (isCorrect === false) {
        next.streak = 0;
      }
      return next;
    });

    if (isCorrect === true) {
      setPulse((p) => ({ ...p, xp: true, streak: true }));
      setTimeout(() => setPulse((p) => ({ ...p, xp: false, streak: false })), 450);
      setXpBurst({ value: xpGain, id: Date.now() });
      setTimeout(() => setXpBurst(null), 900);
      setStreakPulse(true);
      setTimeout(() => setStreakPulse(false), 500);
      playHaptic('correct');
    }

    if (isCorrect === true) {
      toast(`+${xpGain} XP - Streak ${prevStreak + 1}`, 'success');
      if (prevStreak + 1 === 3) toast('Quest selesai: Streak 3 jawaban benar!', 'success');
      if (prevStreak + 1 === 5) toast('Quest selesai: Streak 5 jawaban benar!', 'success');
    } else if (isCorrect === false) {
      setStreakPulse(false);
      playHaptic('wrong');
      toast('Streak direset. Tetap semangat!', 'info');
    }
  };

  const finishQuiz = async ({ answers, finalAnswer, total, startedAt, hasCorrect, correctCount, wrongCount }) => {
    const mergedAnswers = { ...answers, ...finalAnswer };
    const timeSpent = Math.floor((Date.now() - startedAt) / 1000);
    try {
      const res = await fetch(`${API_URL}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          answers: mergedAnswers,
          time_spent: timeSpent,
          quiz_set: activeSet
        })
      });
      if (!res.ok) throw new Error('Gagal menyimpan hasil.');
      const data = await res.json();
      if (data.status !== 'success') throw new Error(data.message || 'Gagal menyimpan hasil.');

      const score = data.score || 0;
      const totalScore = data.total || total;
      const percent = data.percent !== undefined ? data.percent : Math.round((score / totalScore) * 100);

      let unlockedBadges = [];
      let completedQuest = [];

      updateProfile((prev) => {
        const next = { ...prev };
        const prevBadges = new Set(next.badges || []);
        const prevTotalCompleted = next.totalCompleted || 0;
        const prevSets = Array.isArray(next.completedSets) ? next.completedSets.slice() : [];
        const extraXp = Math.round(percent / 2) + score * 2;
        next.xpTotal = (next.xpTotal || 0) + extraXp;
        next.totalCompleted = (next.totalCompleted || 0) + 1;
        next.todayCount = (next.todayCount || 0) + 1;
        next.lastScore = score;
        next.lastPercent = percent;

        if (percent >= settings.highscore_percent) {
          next.highScoreToday = (next.highScoreToday || 0) + 1;
        }

        if (!hasCorrect) {
          if (score === totalScore) {
            next.streak = (next.streak || 0) + 1;
          } else {
            next.streak = 0;
          }
        }

        const setNum = Number(activeSet || 0);
        if (setNum) {
          const setList = new Set(prevSets);
          setList.add(setNum);
          next.completedSets = Array.from(setList);
        }

        const badges = new Set(next.badges || []);
        if (next.todayCount >= settings.quest_daily_target) {
          badges.add('Harian');
          if (!prevBadges.has('Harian')) completedQuest.push(`Selesaikan ${settings.quest_daily_target} kuis hari ini`);
        }
        if ((next.highScoreToday || 0) >= settings.quest_highscore_target) {
          badges.add('Konsisten');
          if (!prevBadges.has('Konsisten')) completedQuest.push(`Skor ${settings.highscore_percent}%+ sebanyak ${settings.quest_highscore_target}x`);
        }
        next.badges = Array.from(badges);
        unlockedBadges = next.badges.filter(b => !prevBadges.has(b));

        if (prevTotalCompleted === 0) completedQuest.push('Selesaikan 1 kuis pertama');
        if (prevSets.length < 2 && next.completedSets.length >= 2) completedQuest.push('Selesaikan 2 set kuis berbeda');
        return next;
      });

      toast('Hasil tersimpan! XP bertambah.', 'success');
      if (completedQuest.length) {
        completedQuest.forEach(q => toast(`Quest selesai: ${q}`, 'success'));
        setQuestPop(completedQuest[0]);
        setTimeout(() => setQuestPop(''), 2000);
        setPulse((p) => ({ ...p, quest: true }));
        setTimeout(() => setPulse((p) => ({ ...p, quest: false })), 500);
      }
      if (unlockedBadges.length) {
        unlockedBadges.forEach(b => toast(`Badge terbuka: ${b}`, 'success'));
        setPulse((p) => ({ ...p, badge: true }));
        setTimeout(() => setPulse((p) => ({ ...p, badge: false })), 500);
      }
      setResultSummary({
        score,
        total: totalScore,
        percent,
        correct: typeof correctCount === 'number' ? correctCount : score,
        wrong: typeof wrongCount === 'number' ? wrongCount : Math.max(0, totalScore - score),
        timeSpent
      });
      setActiveSet(null);
    } catch (e) {
      toast(e.message || 'Gagal menyimpan hasil.', 'error');
    }
  };

  return e(
    'div',
    { className: 'quiz-shell' },
    e(
      'div',
      { className: 'quiz-header-area' },
      e(NextQuizCountdown, { nextQuiz }),
      e(
        'div',
        { className: `quiz-dashboard ${pulse.xp ? 'pulse-xp' : ''} ${pulse.streak ? 'pulse-streak' : ''} ${pulse.quest ? 'pulse-quest' : ''} ${pulse.badge ? 'pulse-badge' : ''}` },
        e(Dashboard, { profile: { ...profile, __settings: settings }, questPop })
      )
    ),
    e(
      'div',
      { className: 'quiz-main' },
      resultSummary ? e(QuizResultSummary, { summary: resultSummary, onClose: () => setResultSummary(null) }) : null,
      !activeSet ? e(QuizList, {
        sets,
        loading,
        error,
        onSelect: (setId) => { setActiveSet(setId); setResultSummary(null); },
        onReload: reload
      }) : null,
      activeSet ? e(QuizQuestion, {
        quizSet: activeSet,
        onExit: () => setActiveSet(null),
        onFinish: finishQuiz,
        onImmediateReward: handleImmediateReward,
        timerSeconds: settings.timer_seconds,
        xpBurst,
        soundOn,
        onToggleSound: toggleSound,
        onSound: playSound,
        streak: profile.streak || 0,
        streakPulse
      }) : null
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(e(App));

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('quiz-instructions-toggle');
  const body = document.getElementById('quiz-instructions-body');
  if (!toggle || !body) return;
  if (window.innerWidth <= 768) {
    body.classList.add('collapsed');
    toggle.classList.add('collapsed');
  }
  toggle.addEventListener('click', () => {
    body.classList.toggle('collapsed');
    toggle.classList.toggle('collapsed');
  });
});
