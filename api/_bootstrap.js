const { query } = require('./db');

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

module.exports = { ensureSchema };
