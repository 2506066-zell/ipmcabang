const { useEffect, useMemo, useRef, useState } = React;

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

const questionCache = new Map();

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

function Dashboard({ profile, questPop, questPulse }) {
  const { level, inLevel, next } = calcLevel(profile.xpTotal || 0);
  const settings = profile.__settings || DEFAULT_SETTINGS;
  const progress = Math.min(100, Math.round((inLevel / next) * 100));
  const completedSets = Array.isArray(profile.completedSets) ? profile.completedSets : [];
  const quests = useMemo(() => ([
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
  ]), [settings, profile.todayCount, profile.highScoreToday, profile.totalCompleted, profile.streak, completedSets.length]);

  const activeQuest = useMemo(() => quests.find(q => !q.done) || quests[quests.length - 1], [quests]);

  return (
    <div className="quiz-side-by-side">
      <div className="quiz-card quiz-side-card xp-card">
        <h3>Level {level}</h3>
        <div className="xp-bar"><span style={{ width: `${progress}%` }} /></div>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{inLevel} XP / {next} XP</div>
        <div className="streak-badge"><i className="fas fa-bolt"></i> Streak: {profile.streak || 0}</div>
        {profile.lastPercent !== null && (
          <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>Skor terakhir: {profile.lastPercent}%</div>
        )}
        <a className="quiz-link" href="/ranking.html">Lihat Ranking</a>
      </div>
      <div className={`quiz-card quiz-side-card quest-card ${questPulse ? 'is-celebrating' : ''}`}>
        <h3>Quest Aktif</h3>
        {questPop && (
          <div className="quest-pop" role="status">{questPop}</div>
        )}
      {activeQuest ? (
        <div key={activeQuest.id} className={`quest-item is-single ${activeQuest.done ? 'quest-done' : ''}`}>
          <div className="quest-meta">
            <span>{activeQuest.label}</span>
            <span>{activeQuest.value} / {activeQuest.total}</span>
          </div>
          <div className="quest-bar">
            <span style={{ width: `${Math.min(100, Math.round((activeQuest.value / activeQuest.total) * 100))}%` }} />
          </div>
        </div>
      ) : (
          <div className="quest-item is-single">
            <div className="quest-meta">
              <span>Semua quest selesai hari ini</span>
              <span>100%</span>
            </div>
            <div className="quest-bar">
              <span style={{ width: '100%' }} />
          </div>
        </div>
      )}
      <div className="quest-hint">Tip: pilih set kuis untuk menyelesaikan quest hari ini.</div>
      {profile.badges && profile.badges.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {profile.badges.map((b) => (
            <span key={b} className="badge-chip"><i className="fas fa-medal"></i> {b}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizList({ sets, loading, error, onSelect, onReload, completedSets }) {
  const completed = new Set(Array.isArray(completedSets) ? completedSets : []);
  return (
    <div className="quiz-card">
      <h3>Daftar Kuis</h3>
      {loading && (
        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Memuat daftar kuis...</div>
      )}
      {error && (
        <div style={{ fontSize: '0.9rem', color: '#b91c1c', marginBottom: 8 }}>
          {error}
        </div>
      )}
      <div className="quiz-list">
        {sets.map((s) => {
          const isDone = completed.has(s.quiz_set);
          return (
            <button
              key={s.quiz_set}
              type="button"
              className={`quiz-tile ${isDone ? 'is-locked' : ''}`}
              onClick={() => onSelect(s.quiz_set)}
              disabled={isDone}
              aria-disabled={isDone}
            >
              <div style={{ fontWeight: 700 }}>Kuis Set {s.quiz_set}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {s.count || 0} soal {isDone ? '- Sudah dikerjakan' : ''}
              </div>
              {isDone && <span className="quiz-tile-badge">Selesai</span>}
            </button>
          );
        })}
      </div>
      {sets.length === 0 && (
        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Belum ada kuis aktif. Pastikan soal sudah diaktifkan oleh admin.
        </div>
      )}
      {completed.size > 0 && (
        <div className="quiz-info-note">
          Set yang sudah selesai tidak bisa diulang. Pilih set lain untuk lanjut.
        </div>
      )}
      {onReload && (
        <button className="quiz-option" style={{ marginTop: 10 }} onClick={onReload}>
          Muat Ulang
        </button>
      )}
    </div>
  );
}

function QuizQuestion({
  quizSet,
  onExit,
  onFinish,
  onImmediateReward,
  timerSeconds,
  xpBurst,
  soundOn,
  onToggleSound,
  onSound,
  streak,
  streakPulse,
  initialProgress,
  onProgress
}) {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(initialProgress && typeof initialProgress.index === 'number' ? initialProgress.index : 0);
  const [selected, setSelected] = useState(null);
  const [timer, setTimer] = useState(timerSeconds || 20);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState((initialProgress && initialProgress.answers) || {});
  const [feedback, setFeedback] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackTone, setFeedbackTone] = useState('neutral');
  const [hasCorrect, setHasCorrect] = useState(false);
  const [animate, setAnimate] = useState(false);
  const startedAt = useRef((initialProgress && initialProgress.startedAt) || Date.now());
  const confettiRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (questionCache.has(quizSet)) {
          const cached = questionCache.get(quizSet);
          if (!mounted) return;
          setQuestions(cached);
          setHasCorrect(cached.some(q => !!q.correct));
        } else {
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
          questionCache.set(quizSet, normalized);
          if (!mounted) return;
          setQuestions(normalized);
          setHasCorrect(normalized.some(q => !!q.correct));
        }
        setIndex((initialProgress && typeof initialProgress.index === 'number') ? initialProgress.index : 0);
        setAnswers((initialProgress && initialProgress.answers) || {});
        setSelected(null);
        startedAt.current = (initialProgress && initialProgress.startedAt) || Date.now();
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

  useEffect(() => {
    if (typeof onProgress !== 'function') return;
    onProgress({ index, answers, startedAt: startedAt.current });
  }, [index, answers, onProgress]);

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
    if (q.correct) {
      isCorrect = String(chosenKey).toLowerCase() === String(q.correct).toLowerCase();
      setFeedback(isCorrect ? 'correct' : 'wrong');
      setFeedbackText(isCorrect ? 'Jawaban benar! XP bertambah.' : 'Belum tepat, coba fokus di soal berikutnya.');
      setFeedbackTone(isCorrect ? 'positive' : 'negative');
      onImmediateReward(isCorrect);
      if (onSound) onSound(isCorrect ? 'correct' : 'wrong');
      if (isCorrect) spawnConfetti();
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
          hasCorrect
        });
      }
    }, 700);
  };

  if (loading) {
    return (
      <div className="quiz-card quiz-question">
        <div>Memuat soal...</div>
      </div>
    );
  }

  const q = questions[index];
  if (!q) {
    return (
      <div className="quiz-card quiz-question">
        <div>Soal tidak ditemukan.</div>
        <button className="quiz-option" onClick={onExit}>Kembali</button>
      </div>
    );
  }

  const isUrgent = timer <= 10;
  const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;

  return (
    <div className={`quiz-card quiz-question${animate ? ' animate' : ''}${isUrgent ? ' is-urgent' : ''}`}>
      <div className="quiz-question-header">
        <div className="quiz-question-title">
          <span className="quiz-floating-icon" aria-hidden="true"><i className="fas fa-pen-to-square"></i></span>
          <div className="quiz-question-meta">
            <strong>Soal {index + 1} / {questions.length}</strong>
            <div className={`streak-avatar ${streakPulse ? 'pulse' : ''}`}>
              <i className="fas fa-fire"></i>
              <span>{streak || 0}</span>
            </div>
          </div>
        </div>
        <div className="quiz-header-actions">
          <button
            type="button"
            className={`quiz-sound-toggle ${soundOn ? '' : 'muted'}`}
            aria-label={soundOn ? 'Matikan suara' : 'Aktifkan suara'}
            onClick={onToggleSound}
          >
            <i className={`fas ${soundOn ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
          </button>
          <span className={`quiz-timer${isUrgent ? ' is-urgent' : ''}`}><i className="fas fa-clock"></i> {timer}s</span>
        </div>
      </div>
      <div className="quiz-progress-wrap" aria-hidden="true">
        <div className="quiz-progress">
          <span style={{ width: `${progress}%` }} />
          <span className="quiz-progress-dot" style={{ left: `${progress}%` }} />
        </div>
      </div>
      {xpBurst && (
        <div className="xp-burst" key={xpBurst.id}>+{xpBurst.value} XP</div>
      )}
      <div className="confetti-layer" ref={confettiRef} aria-hidden="true"></div>
      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{q.question}</div>
      <div className="quiz-options">
        {q.options.map((opt) => {
          const isCorrect = feedback === 'correct' && opt.key === selected;
          const isWrong = feedback === 'wrong' && opt.key === selected;
          return (
            <button
              key={opt.key}
              className={`quiz-option${selected === opt.key && !feedback ? ' is-selected' : ''}${isCorrect ? ' correct' : ''}${isWrong ? ' wrong' : ''}`}
              onClick={() => handleAnswer(opt.key)}
            >
              <strong style={{ marginRight: 8 }}>{opt.key.toUpperCase()}</strong>
              {opt.label}
            </button>
          );
        })}
      </div>
      {!!feedbackText && (
        <div className={`quiz-feedback ${feedbackTone}`}>
          {feedbackText}
        </div>
      )}
    </div>
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
      parts.push(`${String(days).padStart(2, '0')}d`);
      parts.push(`${String(hours).padStart(2, '0')}h`);
      parts.push(`${String(minutes).padStart(2, '0')}m`);
      parts.push(`${String(seconds).padStart(2, '0')}s`);
      setTimeLeft(parts.join(' '));
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [nextQuiz]);

  if (!nextQuiz || !nextQuiz.title) return null;

  return (
    <div className="quiz-countdown-bar">
      <div className="quiz-countdown-meta">
        <div className="quiz-countdown-badge"><i className="fas fa-bolt"></i> Update Kuis</div>
        <div className="quiz-countdown-title">
          <strong>{nextQuiz.title}</strong>
          {timeLeft && <span className="quiz-timer-pill">{timeLeft}</span>}
        </div>
        <div className="quiz-countdown-headline">Quiz level berikutnya segera dimulai.</div>
        {nextQuiz.topic && <div className="quiz-countdown-note">Topik: {nextQuiz.topic}</div>}
        {!nextQuiz.topic && <div className="quiz-countdown-note">Persiapkan diri, kuis dimulai sebentar lagi.</div>}
      </div>
    </div>
  );
}

function QuizResult({ summary, onClose }) {
  if (!summary) return null;
  return (
    <div className="quiz-result-card">
      <div style={{ fontWeight: 700 }}>Ringkasan Hasil</div>
      <div className="quiz-result-grid">
        <div className="quiz-result-stat positive">
          <span>Benar</span>
          <strong>{summary.correct}</strong>
        </div>
        <div className="quiz-result-stat negative">
          <span>Salah</span>
          <strong>{summary.wrong}</strong>
        </div>
        <div className="quiz-result-stat">
          <span>Total Soal</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="quiz-result-stat">
          <span>Skor</span>
          <strong>{summary.percent}%</strong>
        </div>
      </div>
      <div className="quiz-result-actions">
        <button className="quiz-result-button primary" onClick={onClose}>Selesai</button>
        <button className="quiz-result-button" onClick={onClose}>Tutup Ringkasan</button>
      </div>
    </div>
  );
}

function App() {
  const { session, username } = useSession();
  const { sets, loading, error, reload, nextQuiz } = useQuizSets();
  const settings = useGamificationSettings();
  const [profile, setProfile] = useState(loadProfile('guest'));
  const [activeSet, setActiveSet] = useState(null);
  const [pulse, setPulse] = useState({ xp: false, streak: false, quest: false, badge: false });
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('ipm_quiz_sound') !== 'off');
  const [xpBurst, setXpBurst] = useState(null);
  const [streakPulse, setStreakPulse] = useState(false);
  const [questPop, setQuestPop] = useState('');
  const [resultSummary, setResultSummary] = useState(null);
  const progressCacheRef = useRef({});
  const completedSetsRef = useRef([]);

  useEffect(() => {
    if (!username) return;
    const data = loadProfile(username);
    setProfile(data);
  }, [username]);

  useEffect(() => {
    completedSetsRef.current = Array.isArray(profile.completedSets) ? profile.completedSets : [];
  }, [profile.completedSets]);

  useEffect(() => {
    document.body.classList.toggle('quiz-focus', !!activeSet);
  }, [activeSet]);

  useEffect(() => {
    if (!window.history || !window.history.replaceState) return;
    if (activeSet) {
      window.history.pushState({ view: 'quiz-set', set: activeSet }, '', window.location.href);
    } else {
      window.history.replaceState({ view: 'overview' }, '', window.location.href);
    }
  }, [activeSet]);

  useEffect(() => {
    const onPopState = (event) => {
      const state = event.state || {};
      if (state.view === 'quiz-set' && state.set) {
        if (completedSetsRef.current.includes(state.set)) {
          toast('Set kuis ini sudah selesai. Pilih set lain.', 'info');
          setActiveSet(null);
          return;
        }
        setActiveSet(state.set);
        return;
      }
      setActiveSet(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);



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

  const finishQuiz = async ({ answers, finalAnswer, total, startedAt, hasCorrect }) => {
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
        correct: score,
        wrong: Math.max(0, totalScore - score),
        total: totalScore,
        percent
      });
      toast('Set kuis selesai. Kamu tidak bisa mengulang set ini.', 'success');
      if (activeSet) {
        progressCacheRef.current[activeSet] = null;
      }
      setActiveSet(null);
    } catch (e) {
      toast(e.message || 'Gagal menyimpan hasil.', 'error');
    }
  };

  return (
    <div className="quiz-shell">
      {!activeSet && (
        <div className="quiz-shell-top">
          <NextQuizCountdown nextQuiz={nextQuiz} />
          <div className={`quiz-dashboard ${pulse.xp ? 'pulse-xp' : ''} ${pulse.streak ? 'pulse-streak' : ''} ${pulse.quest ? 'pulse-quest' : ''} ${pulse.badge ? 'pulse-badge' : ''}`}>
            <Dashboard profile={{ ...profile, __settings: settings }} questPop={questPop} questPulse={pulse.quest} />
          </div>
        </div>
      )}
      <div className="quiz-main">
        {!activeSet && resultSummary && (
          <QuizResult summary={resultSummary} onClose={() => setResultSummary(null)} />
        )}
        {!activeSet && <QuizList
          sets={sets}
          loading={loading}
          error={error}
          completedSets={profile.completedSets}
          onSelect={(set) => {
            if (profile.completedSets && profile.completedSets.includes(set)) {
              toast('Set kuis ini sudah selesai. Pilih set lain.', 'info');
              return;
            }
            setResultSummary(null);
            setActiveSet(set);
            const anchor = document.querySelector('.quiz-shell-top');
            if (anchor && anchor.scrollIntoView) {
              anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          onReload={reload}
        />}
        {activeSet && (
          <div className="quiz-modal" role="dialog" aria-modal="true" aria-label="Kuis">
            <div className="quiz-modal-overlay"></div>
            <div className="quiz-modal-card">
              <button
                type="button"
                className="quiz-modal-close"
                onClick={() => setActiveSet(null)}
                aria-label="Kembali ke set kuis"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <QuizQuestion
                quizSet={activeSet}
                onExit={() => setActiveSet(null)}
                onFinish={finishQuiz}
                onImmediateReward={handleImmediateReward}
                timerSeconds={settings.timer_seconds}
                xpBurst={xpBurst}
                soundOn={soundOn}
                onToggleSound={toggleSound}
                onSound={playSound}
                streak={profile.streak || 0}
                streakPulse={streakPulse}
                initialProgress={progressCacheRef.current[activeSet] || null}
                onProgress={(progress) => {
                  if (!activeSet) return;
                  progressCacheRef.current[activeSet] = progress;
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<App />);

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('quiz-instructions-toggle');
  const body = document.getElementById('quiz-instructions-body');
  if (!toggle || !body) return;
  toggle.addEventListener('click', () => {
    body.classList.toggle('collapsed');
    toggle.classList.toggle('collapsed');
  });
});


