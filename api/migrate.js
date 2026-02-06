const { query } = require('./db');
const { json } = require('./_util');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
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
    // ensure columns exist if table already created
    await query`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT`;
    await query`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    const qc = (await query`SELECT COUNT(*)::int AS c FROM questions`).rows[0]?.c || 0;
    if (qc === 0) {
      await query`INSERT INTO questions (question, options, correct_answer, active, category, quiz_set) VALUES (
        ${'Apa kepanjangan IPM?'}, ${ { a: 'Ikatan Pelajar Muhammadiyah', b: 'Ikatan Pemuda Muslim', c: 'Ikatan Pemuda Merdeka', d: 'Ikatan Pelajar Merdeka' } }, ${'a'}, ${true}, ${'Organisasi'}, ${1}
      )`;
      await query`INSERT INTO questions (question, options, correct_answer, active, category, quiz_set) VALUES (
        ${'Hari jadi IPM?'}, ${ { a: '5 Mei 1961', b: '5 Mei 1962', c: '5 Juni 1961', d: '5 Juni 1962' } }, ${'a'}, ${true}, ${'Sejarah'}, ${1}
      )`;
    }
    json(res, 200, { status: 'success' });
  } catch (e) {
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
