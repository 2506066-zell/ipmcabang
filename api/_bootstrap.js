const { query } = require('./_db');

async function ensureSchema() {
  await query`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    nama_panjang TEXT,
    pimpinan TEXT,
    password_salt TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'user',
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
    role TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
  )`;
  await query`CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    username TEXT,
    ip TEXT,
    attempted_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE
  )`;

  await query`CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES users(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`;

  await query`CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  )`;

  await query`CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    content TEXT,
    author TEXT,
    image TEXT,
    publish_date TIMESTAMP DEFAULT NOW(),
    views INT DEFAULT 0,
    category TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`;

  await query`CREATE TABLE IF NOT EXISTS quiz_schedules (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;

  await query`CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    file_type TEXT, -- pdf, ebook, doc, etc
    file_url TEXT,
    thumbnail TEXT,
    category TEXT,
    author TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;

  await query`CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
  )`;

  await query`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;

  await query`CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id SERIAL PRIMARY KEY,
    title TEXT,
    message TEXT,
    url TEXT,
    target_type TEXT DEFAULT 'all',
    target_value TEXT,
    save_in_app BOOLEAN DEFAULT TRUE,
    send_at TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'pending',
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    error TEXT
  )`;

  // Alter tables to ensure new columns exist (idempotent)
  await query`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
  await query`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT`;
  await query`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  await query`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`;
  await query`ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE`;
  await query`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS role TEXT`;

  // Ensure description column exists for quiz_schedules
  await query`ALTER TABLE quiz_schedules ADD COLUMN IF NOT EXISTS description TEXT`;
  await query`ALTER TABLE quiz_schedules ADD COLUMN IF NOT EXISTS show_in_quiz BOOLEAN DEFAULT TRUE`;
  await query`ALTER TABLE quiz_schedules ADD COLUMN IF NOT EXISTS show_in_notif BOOLEAN DEFAULT FALSE`;

  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS title TEXT`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS message TEXT`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS url TEXT`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all'`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS target_value TEXT`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS save_in_app BOOLEAN DEFAULT TRUE`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS send_at TIMESTAMP`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS created_by INT`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP`;
  await query`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS error TEXT`;

  // Create Indexes for Performance
  await query`CREATE INDEX IF NOT EXISTS idx_questions_quiz_set ON questions(quiz_set)`;
  await query`CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category)`;
  await query`CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id)`;
  await query`CREATE INDEX IF NOT EXISTS idx_results_quiz_set ON results(quiz_set)`;
  await query`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
  await query`CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC)`;
  await query`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`;
  await query`CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(active)`;
  await query`CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)`;
  await query`CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status)`;
  await query`CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_send_at ON scheduled_notifications(send_at)`;
}

module.exports = { ensureSchema };
