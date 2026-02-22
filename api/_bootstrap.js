const { query } = require('./_db');
const {
  DEFAULT_ORG_BIDANG,
  DEFAULT_ORG_MEMBERS,
  DEFAULT_ORG_PROGRAMS
} = require('./_organization_seed');

function normalizeMediaPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.endsWith('/')) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return raw;
  return `/${raw.replace(/^\.?\//, '')}`;
}

function normalizeStatus(value) {
  const s = String(value || '').trim().toLowerCase();
  if (s === 'rencana' || s === 'terlaksana' || s === 'draft') return s;
  return 'draft';
}

async function seedOrganizationData() {
  for (let i = 0; i < DEFAULT_ORG_BIDANG.length; i++) {
    const b = DEFAULT_ORG_BIDANG[i] || {};
    await query`
      INSERT INTO org_bidang (code, name, color, image_url, sort_order, is_core, is_active)
      VALUES (${String(b.id || '').trim()}, ${String(b.name || '').trim()}, ${String(b.color || '#4A7C5D').trim()}, ${normalizeMediaPath(b.image)}, ${i + 1}, ${true}, ${true})
      ON CONFLICT (code)
      DO UPDATE SET
        name = EXCLUDED.name,
        color = EXCLUDED.color,
        image_url = EXCLUDED.image_url,
        sort_order = EXCLUDED.sort_order,
        is_core = true,
        is_active = true,
        updated_at = NOW()
    `;
  }

  const bidangRows = (await query`SELECT id, code FROM org_bidang`).rows;
  const bidangMap = new Map(bidangRows.map(r => [String(r.code), Number(r.id)]));

  const membersCount = Number((await query`SELECT COUNT(*)::int AS c FROM org_members`).rows[0]?.c || 0);
  if (membersCount === 0) {
    const memberSort = new Map();
    for (const item of DEFAULT_ORG_MEMBERS) {
      const bidangCode = String(item?.bidangId || '').trim();
      const bidangId = bidangMap.get(bidangCode);
      if (!bidangId) continue;

      const sortOrder = (memberSort.get(bidangCode) || 0) + 1;
      memberSort.set(bidangCode, sortOrder);

      await query`
        INSERT INTO org_members (
          bidang_id, full_name, role_title, quote, photo_url, instagram_url, sort_order, is_active
        ) VALUES (
          ${bidangId},
          ${String(item?.name || '').trim()},
          ${String(item?.role || '').trim()},
          ${String(item?.quote || '').trim()},
          ${normalizeMediaPath(item?.photo)},
          ${String(item?.instagram || '').trim()},
          ${sortOrder},
          ${true}
        )
      `;
    }
  }

  const programCount = Number((await query`SELECT COUNT(*)::int AS c FROM org_programs`).rows[0]?.c || 0);
  if (programCount === 0) {
    const programSort = new Map();
    for (const item of DEFAULT_ORG_PROGRAMS) {
      const bidangCode = String(item?.bidangId || '').trim();
      const bidangId = bidangMap.get(bidangCode);
      if (!bidangId) continue;

      const sortOrder = (programSort.get(bidangCode) || 0) + 1;
      programSort.set(bidangCode, sortOrder);

      const title = String(item?.name || '').trim() || `Program Kerja Draft ${sortOrder}`;
      const description = String(item?.desc || '').trim();
      const status = normalizeStatus(item?.status);

      await query`
        INSERT INTO org_programs (
          bidang_id, title, description, status, sort_order, is_active
        ) VALUES (
          ${bidangId},
          ${title},
          ${description},
          ${status},
          ${sortOrder},
          ${true}
        )
      `;
    }
  }
}

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

  await query`CREATE TABLE IF NOT EXISTS feedback_messages (
    id SERIAL PRIMARY KEY,
    source_page TEXT DEFAULT 'struktur-organisasi',
    subject TEXT,
    sender_name TEXT,
    sender_contact TEXT,
    message TEXT NOT NULL,
    context_json JSONB,
    source_ip TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by INT REFERENCES users(id)
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

  await query`CREATE TABLE IF NOT EXISTS org_bidang (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#4A7C5D',
    image_url TEXT,
    sort_order INT DEFAULT 1,
    is_core BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;

  await query`CREATE TABLE IF NOT EXISTS org_members (
    id SERIAL PRIMARY KEY,
    bidang_id INT NOT NULL REFERENCES org_bidang(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    quote TEXT,
    photo_url TEXT,
    instagram_url TEXT,
    sort_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`;

  await query`CREATE TABLE IF NOT EXISTS org_programs (
    id SERIAL PRIMARY KEY,
    bidang_id INT NOT NULL REFERENCES org_bidang(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    sort_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
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
  await query`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS image_url TEXT`;
  await query`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#4A7C5D'`;
  await query`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 1`;
  await query`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT FALSE`;
  await query`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
  await query`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
  await query`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS quote TEXT`;
  await query`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS photo_url TEXT`;
  await query`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS instagram_url TEXT`;
  await query`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 1`;
  await query`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
  await query`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
  await query`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS description TEXT`;
  await query`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'`;
  await query`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 1`;
  await query`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
  await query`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
  await query`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS source_page TEXT DEFAULT 'struktur-organisasi'`;
  await query`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS subject TEXT`;
  await query`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS sender_name TEXT`;
  await query`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS sender_contact TEXT`;
  await query`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS message TEXT`;
  await query`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS context_json JSONB`;
  await query`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS source_ip TEXT`;
  await query`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open'`;
  await query`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP`;
  await query`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS resolved_by INT`;

  await seedOrganizationData();

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
  await query`CREATE INDEX IF NOT EXISTS idx_feedback_messages_status_created ON feedback_messages(status, created_at DESC)`;
  await query`CREATE INDEX IF NOT EXISTS idx_feedback_messages_created ON feedback_messages(created_at DESC)`;
  await query`CREATE INDEX IF NOT EXISTS idx_feedback_messages_source_ip_created ON feedback_messages(source_ip, created_at DESC)`;
  await query`CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status)`;
  await query`CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_send_at ON scheduled_notifications(send_at)`;
  await query`CREATE INDEX IF NOT EXISTS idx_org_bidang_sort ON org_bidang(sort_order, id)`;
  await query`CREATE INDEX IF NOT EXISTS idx_org_members_bidang_sort ON org_members(bidang_id, sort_order, id)`;
  await query`CREATE INDEX IF NOT EXISTS idx_org_programs_bidang_sort ON org_programs(bidang_id, sort_order, id)`;
}

module.exports = { ensureSchema };
