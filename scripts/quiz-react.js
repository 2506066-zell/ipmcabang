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

function useLeaderboard() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let timer = null;
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/results`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'success') return;
        const results = Array.isArray(data.results) ? data.results.slice() : [];
        results.sort((a, b) => (b.score || 0) - (a.score || 0));
        setItems(results.slice(0, 5));
      } catch (e) {}
      timer = setTimeout(fetchData, 30000);
    };
    fetchData();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);
  return items;
}

function useQuizSets() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      } else {
        throw new Error((data && data.message) || 'Data kuis tidak valid');
      }
    } catch (e) {
      try {
        const fallbackSets = await loadFallback();
        setSets(fallbackSets);
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
  return { sets, loading, error, reload: load };
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

function Dashboard({ profile, username, leaderboard }) {
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

  return (
    <div className="quiz-grid">
      <div className="quiz-card xp-card">
        <h3>Level {level}</h3>
        <div className="xp-bar"><span style={{ width: `${progress}%` }} /></div>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{inLevel} XP / {next} XP</div>
        <div className="streak-badge"><i className="fas fa-bolt"></i> Streak: {profile.streak || 0}</div>
        {profile.lastPercent !== null && (
          <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>Skor terakhir: {profile.lastPercent}%</div>
        )}
      </div>
      <div className="quiz-card">
        <h3>Quest Aktif</h3>
        {quests.map(q => (
          <div key={q.id} className={`quest-item ${q.done ? 'quest-done' : ''}`}>
            <div className="quest-meta">
              <span>{q.label}</span>
              <span>{q.value} / {q.total}</span>
            </div>
            <div className="quest-bar">
              <span style={{ width: `${Math.min(100, Math.round((q.value / q.total) * 100))}%` }} />
            </div>
          </div>
        ))}
        {profile.badges && profile.badges.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {profile.badges.map((b) => (
              <span key={b} className="badge-chip"><i className="fas fa-medal"></i> {b}</span>
            ))}
          </div>
        )}
      </div>
      <div className="quiz-card">
        <h3>Leaderboard</h3>
        {leaderboard.length === 0 && (
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Belum ada data.</div>
        )}
        {leaderboard.map((p, i) => (
          <div key={`${p.username}-${i}`} className={`leaderboard-item ${p.username === username ? 'active' : ''}`}>
            <span>#{i + 1} {p.username || 'Pengguna'}</span>
            <span>{p.score || 0} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuizList({ sets, loading, error, onSelect, onReload }) {
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
        {sets.map((s) => (
          <div key={s.quiz_set} className="quiz-tile" onClick={() => onSelect(s.quiz_set)}>
            <div style={{ fontWeight: 700 }}>Kuis Set {s.quiz_set}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {s.count || 0} soal {s.attempted ? '- Sudah dikerjakan' : ''}
            </div>
          </div>
        ))}
      </div>
      {sets.length === 0 && (
        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Belum ada kuis aktif. Pastikan soal sudah diaktifkan oleh admin.
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

function QuizQuestion({ quizSet, onExit, onFinish, onImmediateReward, timerSeconds }) {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [timer, setTimer] = useState(timerSeconds || 20);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackTone, setFeedbackTone] = useState('neutral');
  const [hasCorrect, setHasCorrect] = useState(false);
  const startedAt = useRef(Date.now());

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

  return (
    <div className="quiz-card quiz-question">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>Soal {index + 1} / {questions.length}</strong>
        <span><i className="fas fa-clock"></i> {timer}s</span>
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{q.question}</div>
      <div className="quiz-options">
        {q.options.map((opt) => {
          const isCorrect = feedback === 'correct' && opt.key === selected;
          const isWrong = feedback === 'wrong' && opt.key === selected;
          return (
            <button
              key={opt.key}
              className={`quiz-option${isCorrect ? ' correct' : ''}${isWrong ? ' wrong' : ''}`}
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

function App() {
  const { session, username } = useSession();
  const leaderboard = useLeaderboard();
  const { sets, loading, error, reload } = useQuizSets();
  const settings = useGamificationSettings();
  const [profile, setProfile] = useState(loadProfile('guest'));
  const [activeSet, setActiveSet] = useState(null);
  const [pulse, setPulse] = useState({ xp: false, streak: false, quest: false, badge: false });

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
    }

    if (isCorrect === true) {
      toast(`+${xpGain} XP • Streak ${prevStreak + 1}`, 'success');
      if (prevStreak + 1 === 3) toast('Quest selesai: Streak 3 jawaban benar!', 'success');
      if (prevStreak + 1 === 5) toast('Quest selesai: Streak 5 jawaban benar!', 'success');
    } else if (isCorrect === false) {
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
        setPulse((p) => ({ ...p, quest: true }));
        setTimeout(() => setPulse((p) => ({ ...p, quest: false })), 500);
      }
      if (unlockedBadges.length) {
        unlockedBadges.forEach(b => toast(`Badge terbuka: ${b}`, 'success'));
        setPulse((p) => ({ ...p, badge: true }));
        setTimeout(() => setPulse((p) => ({ ...p, badge: false })), 500);
      }
      setActiveSet(null);
    } catch (e) {
      toast(e.message || 'Gagal menyimpan hasil.', 'error');
    }
  };

  return (
    <div className="quiz-shell">
      <div className={`quiz-dashboard ${pulse.xp ? 'pulse-xp' : ''} ${pulse.streak ? 'pulse-streak' : ''} ${pulse.quest ? 'pulse-quest' : ''} ${pulse.badge ? 'pulse-badge' : ''}`}>
        <Dashboard profile={{ ...profile, __settings: settings }} username={username} leaderboard={leaderboard} />
      </div>
      {!activeSet && <QuizList sets={sets} loading={loading} error={error} onSelect={setActiveSet} onReload={reload} />}
      {activeSet && (
        <QuizQuestion
          quizSet={activeSet}
          onExit={() => setActiveSet(null)}
          onFinish={finishQuiz}
          onImmediateReward={handleImmediateReward}
          timerSeconds={settings.timer_seconds}
        />
      )}
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

