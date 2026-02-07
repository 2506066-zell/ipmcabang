const { Pool } = require('pg');
const crypto = require('crypto');

// --- Database Logic (from db.js & _bootstrap.js) ---

let _pool = null;

function getConnString() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
  ].filter(Boolean);
  const withScheme = candidates.find(u => /^postgres(ql)?:\/\//i.test(String(u)));
  if (withScheme) return withScheme;
  const any = candidates[0] || '';
  if (any && /@/.test(any)) return `postgresql://${any}`;
  return any;
}

function requireEnv() {
  const url = getConnString();
  if (!url) throw new Error('Postgres connection string not configured');
  const u = String(url).trim().toLowerCase();
  if (!/^postgres(ql)?:\/\//.test(u)) throw new Error('Invalid POSTGRES_URL');
}

function getPool() {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: getConnString(), ssl: { rejectUnauthorized: false } });
  if (!_pool.options.ssl) {
    _pool.options.ssl = { rejectUnauthorized: false };
  }
  return _pool;
}

async function ensureSchema() {
  await query`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    nama_panjang TEXT,
    pimpinan TEXT,
    password_salt TEXT,
    password_hash TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await query`CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    category TEXT,
    quiz_set INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await query`CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    username TEXT,
    user_id INT REFERENCES users(id),
    score INT,
    total INT,
    percent INT,
    time_spent BIGINT,
    quiz_set INT,
    started_at BIGINT,
    finished_at BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await query`CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
  )`;
  await query`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT`;
  await query`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
}

function buildParameterizedQuery(strings, values) {
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }
  return text;
}

async function query(strings, ...values) {
  requireEnv();
  const pool = getPool();
  const text = buildParameterizedQuery(strings, values);
  try {
    const result = await pool.query(text, values);
    return { rows: result.rows };
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    if (/relation\s+".*"\s+does\s+not\s+exist/i.test(msg)) {
      try {
        await ensureSchema();
        const result2 = await pool.query(text, values);
        return { rows: result2.rows };
      } catch (e2) {
        const m2 = (e2 && e2.message) ? e2.message : String(e2);
        throw new Error(`Database error: ${m2}`);
      }
    }
    throw new Error(`Database error: ${msg}`);
  }
}

// --- Utility Logic (from _util.js) ---

function json(res, status, data, headers) {
  const body = JSON.stringify(data ?? {});
  const etag = crypto.createHash('sha1').update(body).digest('hex');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('ETag', etag);
  if (headers) Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.status(status).send(body);
}

function cacheHeaders(seconds) {
  const s = Number(seconds || 60);
  return { 'Cache-Control': `public, s-maxage=${s}, stale-while-revalidate=${s * 5}` };
}

function parseJsonBody(req) {
  const b = req && req.body !== undefined ? req.body : {};
  if (typeof b === 'string') {
    try { return JSON.parse(b || '{}'); } catch { return {}; }
  }
  return b || {};
}

// --- Auth Logic (from _auth.js) ---

async function requireAdminAuth(req) {
    const adminSecret = String(process.env.ADMIN_SECRET || '').trim();
    if (!adminSecret) throw new Error('ADMIN_SECRET not configured');
    const h = String(req.headers['authorization'] || '');
    if (!h.toLowerCase().startsWith('bearer ')) throw new Error('Missing bearer token');
    const token = h.slice(7).trim();
    if (token !== adminSecret) throw new Error('Invalid admin token');
}


// --- Handlers (from users.js, questions.js, etc.) ---

async function usersHandler(req, res) {
  const list = async () => {
    const uname = req.query.username ? String(req.query.username).trim().toLowerCase() : '';
    const rows = uname
      ? (await query`SELECT id, username, nama_panjang, pimpinan, created_at FROM users WHERE LOWER(username)=${uname} ORDER BY id DESC`).rows
      : (await query`SELECT id, username, nama_panjang, pimpinan, created_at FROM users ORDER BY id DESC`).rows;
    json(res, 200, { status: 'success', users: rows }, cacheHeaders(60));
  };

  const create = async () => {
    try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
    const b = parseJsonBody(req);
    const username = String(b.username || '').trim();
    const nama = String(b.nama_panjang || '').trim();
    const pimpinan = String(b.pimpinan || '').trim();
    if (!username) return json(res, 400, { status: 'error', message: 'Invalid payload' });
    const ins = await query`INSERT INTO users (username, nama_panjang, pimpinan) VALUES (${username}, ${nama}, ${pimpinan}) RETURNING id, username, nama_panjang, pimpinan, created_at`;
    json(res, 201, { status: 'success', user: ins.rows[0] });
  };

  const update = async () => {
    try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
    const b = parseJsonBody(req);
    const id = Number(b.id || 0);
    if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
    const prev = (await query`SELECT * FROM users WHERE id=${id}`).rows[0];
    if (!prev) return json(res, 404, { status: 'error', message: 'Not found' });
    const username = b.username !== undefined ? String(b.username) : undefined;
    const nama = b.nama_panjang !== undefined ? String(b.nama_panjang) : undefined;
    const pimpinan = b.pimpinan !== undefined ? String(b.pimpinan) : undefined;
    const upd = await query`UPDATE users SET username=${username ?? prev.username}, nama_panjang=${nama ?? prev.nama_panjang}, pimpinan=${pimpinan ?? prev.pimpinan} WHERE id=${id} RETURNING id, username, nama_panjang, pimpinan, created_at`;
    json(res, 200, { status: 'success', user: upd.rows[0] });
  };

  const remove = async () => {
    try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
    const id = Number(req.query.id || 0);
    if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
    await query`DELETE FROM users WHERE id=${id}`;
    json(res, 200, { status: 'success' });
  };

  if (req.method === 'GET') return list();
  if (req.method === 'POST') {
    const b = parseJsonBody(req);
    if (b && b.id) return update();
    return create();
  }
  if (req.method === 'PUT') return update();
  if (req.method === 'DELETE') return remove();
  json(res, 405, { status: 'error', message: 'Method not allowed' });
}

async function questionsHandler(req, res) {
    const list = async () => {
        const set = req.query.set ? Number(req.query.set) : null;
        const category = req.query.category ? String(req.query.category).trim() : '';
        const page = req.query.page ? Number(req.query.page) : null;
        const size = req.query.size ? Number(req.query.size) : null;
        if (!page || !size) {
            if (set && category) {
            const rows = (await query`SELECT * FROM questions WHERE quiz_set=${set} AND LOWER(category)=${category.toLowerCase()} ORDER BY id DESC`).rows;
            return json(res, 200, { status: 'success', questions: rows }, cacheHeaders(60));
            }
            if (set) {
            const rows = (await query`SELECT * FROM questions WHERE quiz_set=${set} ORDER BY id DESC`).rows;
            return json(res, 200, { status: 'success', questions: rows }, cacheHeaders(60));
            }
            if (category) {
            const rows = (await query`SELECT * FROM questions WHERE LOWER(category)=${category.toLowerCase()} ORDER BY id DESC`).rows;
            return json(res, 200, { status: 'success', questions: rows }, cacheHeaders(60));
            }
            const rows = (await query`SELECT * FROM questions ORDER BY id DESC`).rows;
            return json(res, 200, { status: 'success', questions: rows }, cacheHeaders(60));
        }
        const limit = Math.max(1, Math.min(500, size));
        const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
        let rows;
        if (set && category) {
            rows = (await query`SELECT * FROM questions WHERE quiz_set=${set} AND LOWER(category)=${category.toLowerCase()} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).rows;
        } else if (set) {
            rows = (await query`SELECT * FROM questions WHERE quiz_set=${set} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).rows;
        } else if (category) {
            rows = (await query`SELECT * FROM questions WHERE LOWER(category)=${category.toLowerCase()} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).rows;
        } else {
            rows = (await query`SELECT * FROM questions ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).rows;
        }
        json(res, 200, { status: 'success', questions: rows, page: Math.max(1, page), size: limit }, cacheHeaders(60));
    };

    const create = async () => {
        try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
        const b = parseJsonBody(req);
        const q = String(b.question || '').trim();
        const options = b.options || {};
        const correct = String(b.correct_answer || '').trim();
        const active = Boolean(b.active !== false);
        const category = b.category ? String(b.category) : null;
        const quiz_set = Number(b.quiz_set || 1);
        if (!q || !options.a || !options.b || !options.d) return json(res, 400, { status: 'error', message: 'Opsi A, B, D dan pertanyaan wajib diisi' });
        if (!['a','b','c','d'].includes(correct)) return json(res, 400, { status: 'error', message: 'Jawaban benar harus A/B/C/D' });
        const ins = await query`INSERT INTO questions (question, options, correct_answer, active, category, quiz_set) VALUES (${q}, ${options}, ${correct}, ${active}, ${category}, ${quiz_set}) RETURNING *`;
        json(res, 201, { status: 'success', question: ins.rows[0] });
    };

    const update = async () => {
        try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
        const b = parseJsonBody(req);
        const id = Number(b.id || 0);
        if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
        const q = b.question !== undefined ? String(b.question) : undefined;
        const options = b.options !== undefined ? b.options : undefined;
        const correct = b.correct_answer !== undefined ? String(b.correct_answer) : undefined;
        const active = b.active !== undefined ? Boolean(b.active) : undefined;
        const category = b.category !== undefined ? String(b.category) : undefined;
        const quiz_set = b.quiz_set !== undefined ? Number(b.quiz_set) : undefined;
        const prev = (await query`SELECT * FROM questions WHERE id=${id}`).rows[0];
        if (!prev) return json(res, 404, { status: 'error', message: 'Not found' });
        const upd = await query`UPDATE questions SET question=${q ?? prev.question}, options=${options ?? prev.options}, correct_answer=${correct ?? prev.correct_answer}, active=${active ?? prev.active}, category=${category ?? prev.category}, quiz_set=${quiz_set ?? prev.quiz_set} WHERE id=${id} RETURNING *`;
        json(res, 200, { status: 'success', question: upd.rows[0] });
    };

    const remove = async () => {
        try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
        const id = Number(req.query.id || 0);
        if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
        await query`DELETE FROM questions WHERE id=${id}`;
        json(res, 200, { status: 'success' });
    };

    if (req.method === 'GET') return list();
    if (req.method === 'POST') {
        const b = parseJsonBody(req);
        if (b && b.id) return update();
        return create();
    }
    if (req.method === 'PUT') return update();
    if (req.method === 'DELETE') return remove();
    json(res, 405, { status: 'error', message: 'Method not allowed' });
}

async function resultsHandler(req, res) {
    const list = async () => {
        const page = req.query.page ? Number(req.query.page) : 1;
        const size = req.query.size ? Number(req.query.size) : 200;
        const limit = Math.max(1, Math.min(500, size));
        const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
        const rows = (await query`SELECT created_at AS ts, username, score, total, percent FROM results ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).rows;
        json(res, 200, { status: 'success', results: rows, page: Math.max(1, page), size: limit }, cacheHeaders(30));
    };

    const create = async () => {
        const b = parseJsonBody(req);
        const session = String(b.session || '').trim();
        const score = Number(b.score || 0);
        const total = Number(b.total || 0);
        const percent = Math.max(0, Math.min(100, Math.round((total ? (score / total) : 0) * 100)));
        const time_spent = Number(b.time_spent || 0);
        const quiz_set = Number(b.quiz_set || 1);
        const started_at = Number(b.started_at || Date.now());
        const finished_at = Number(b.finished_at || Date.now());
        if (!session) return json(res, 401, { status: 'error', message: 'Unauthorized' });
        const userRow = (await query`SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${session} AND s.expires_at > NOW()`).rows[0];
        if (!userRow) return json(res, 401, { status: 'error', message: 'Unauthorized' });
        const COOLDOWN_MS = 30 * 1000;
        const last = (await query`SELECT finished_at FROM results WHERE user_id=${userRow.id} ORDER BY id DESC LIMIT 1`).rows[0];
        if (last && Number(last.finished_at || 0) > 0) {
            const delta = finished_at - Number(last.finished_at);
            if (delta >= 0 && delta < COOLDOWN_MS) {
            return json(res, 429, { status: 'error', message: 'Terlalu cepat. Coba lagi beberapa saat.' });
            }
        }
        const dailyCount = Number((await query`SELECT COUNT(*)::int AS c FROM results WHERE user_id=${userRow.id} AND created_at::date = NOW()::date`).rows[0]?.c || 0);
        const DAILY_LIMIT = 10;
        if (dailyCount >= DAILY_LIMIT) {
            return json(res, 429, { status: 'error', message: 'Batas percobaan harian tercapai.' });
        }
        const ins = await query`INSERT INTO results (username, user_id, score, total, percent, time_spent, quiz_set, started_at, finished_at) VALUES (${userRow.username}, ${userRow.id}, ${score}, ${total}, ${percent}, ${time_spent}, ${quiz_set}, ${started_at}, ${finished_at}) RETURNING id`;
        json(res, 201, { status: 'success', id: ins.rows[0].id, score, total, percent });
    };

    const purge = async () => {
        try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
        await query`DELETE FROM results`;
        json(res, 200, { status: 'success' });
    };

    if (req.method === 'GET') return list();
    if (req.method === 'POST') return create();
    if (req.method === 'DELETE') return purge();
    json(res, 405, { status: 'error', message: 'Method not allowed' });
}

async function resetSetHandler(req, res) {
    if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
    try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
    const body = parseJsonBody(req);
    const quiz_set = Number(body.quiz_set || 0);
    if (!quiz_set) return json(res, 400, { status: 'error', message: 'Missing quiz_set' });
    await query`DELETE FROM results WHERE quiz_set=${quiz_set}`;
    json(res, 200, { status: 'success' });
}


// --- Main Router ---

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/users')) {
      return await usersHandler(req, res);
    }
    if (url.pathname.startsWith('/api/questions')) {
      return await questionsHandler(req, res);
    }
    if (url.pathname.startsWith('/api/results')) {
      return await resultsHandler(req, res);
    }
    if (url.pathname.startsWith('/api/reset-set')) {
      return await resetSetHandler(req, res);
    }
    // Health check and other root-level API calls can go here
    if (url.pathname === '/api' || url.pathname === '/api/') {
        return json(res, 200, { status: 'ok', message: 'API is running' });
    }
    return json(res, 404, { status: 'error', message: 'Not Found' });
  } catch (e) {
    console.error('Unhandled API error:', e);
    json(res, 500, { status: 'error', message: 'Internal Server Error' });
  }
};