module.exports=[35716,(T,E,t)=>{let{Pool:a}=T.r(55168),e=null;function i(){let T=[process.env.IPM_DB_URL,process.env.DATABASE_URL,process.env.POSTGRES_URL,process.env.POSTGRES_URL_NON_POOLING,process.env.POSTGRES_PRISMA_URL,process.env.POSTGRES_URL_NO_SSL,process.env.NEON_DATABASE_URL,process.env.NEON_POSTGRES_URL,process.env.SUPABASE_DB_URL,process.env.SUPABASE_POSTGRES_URL,process.env.SUPABASE_PGBOUNCER_URL].filter(Boolean),E=T.find(T=>/^postgres(ql)?:\/\//i.test(String(T)));if(E)return E;let t=T[0]||"";return t&&/@/.test(t)?`postgresql://${t}`:t}function s(){let T=i();if(!T)throw Error("Postgres connection string not configured. Please set one of: IPM_DB_URL, DATABASE_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING, POSTGRES_PRISMA_URL, NEON_DATABASE_URL, or SUPABASE_DB_URL.");let E=String(T).trim().toLowerCase();if(!/^postgres(ql)?:\/\//.test(E))throw Error("Invalid POSTGRES_URL format.")}function A(){return e?e:((e=new a({connectionString:i(),ssl:{rejectUnauthorized:!1},connectionTimeoutMillis:5e3,idleTimeoutMillis:3e4,max:10})).on("error",(T,E)=>{console.error("Unexpected error on idle client",T)}),e)}E.exports={query:async function E(t,...a){let e;s();let i=A(),r=function(T,E){let t="";for(let a=0;a<T.length;a++)t+=T[a],a<E.length&&(t+=`$${a+1}`);return t}(t,a);for(let E=1;E<=3;E++)try{let T=await i.query(r,a);return{rows:T.rows,rowCount:T.rowCount}}catch(A){e=A;let t=A&&A.message?A.message:String(A),s=t.includes("connection")||t.includes("timeout")||t.includes("ECONNRESET");if(E<3&&s){console.warn(`Database query failed (attempt ${E}/3). Retrying... Error: ${t}`),await new Promise(T=>setTimeout(T,500*E));continue}if(/relation\s+".*"\s+does\s+not\s+exist/i.test(t))try{console.log("Table not found, attempting to ensure schema...");let{ensureSchema:E}=T.r(44285);await E();let t=await i.query(r,a);return{rows:t.rows,rowCount:t.rowCount}}catch(T){throw Error(`Database schema error: ${T.message||T}`)}throw Error(`Database error: ${t}`)}throw e},getConnHost:function(){let T=String(i()).match(/@([^\/\?]+)(?:\/[\w-]+)?/);return T?T[1]:""},rawQuery:async function(E,t=[]){let a;s();let e=A();for(let i=1;i<=3;i++)try{let T=await e.query(E,t);return{rows:T.rows,rowCount:T.rowCount}}catch(r){a=r;let s=r&&r.message?r.message:String(r),A=s.includes("connection")||s.includes("timeout")||s.includes("ECONNRESET");if(i<3&&A){await new Promise(T=>setTimeout(T,500*i));continue}if(/relation\s+".*"\s+does\s+not\s+exist/i.test(s))try{let{ensureSchema:a}=T.r(44285);await a();let i=await e.query(E,t);return{rows:i.rows,rowCount:i.rowCount}}catch(T){throw Error(`Database schema error: ${T.message||T}`)}throw Error(`Database error: ${s}`)}throw a}}},44285,(T,E,t)=>{let{query:a}=T.r(35716),{DEFAULT_ORG_BIDANG:e,DEFAULT_ORG_MEMBERS:i,DEFAULT_ORG_PROGRAMS:s}=T.r(14534);function A(T){let E=String(T||"").trim();return!E||E.endsWith("/")?"":/^https?:\/\//i.test(E)||E.startsWith("/")?E:`/${E.replace(/^\.?\//,"")}`}async function r(){for(let T=0;T<e.length;T++){let E=e[T]||{};await a`
      INSERT INTO org_bidang (code, name, color, image_url, sort_order, is_core, is_active)
      VALUES (${String(E.id||"").trim()}, ${String(E.name||"").trim()}, ${String(E.color||"#4A7C5D").trim()}, ${A(E.image)}, ${T+1}, ${!0}, ${!0})
      ON CONFLICT (code)
      DO UPDATE SET
        name = EXCLUDED.name,
        color = EXCLUDED.color,
        image_url = EXCLUDED.image_url,
        sort_order = EXCLUDED.sort_order,
        is_core = true,
        is_active = true,
        updated_at = NOW()
    `}let T=new Map((await a`SELECT id, code FROM org_bidang`).rows.map(T=>[String(T.code),Number(T.id)]));console.log("[Seeder] Menghapus duplikat org_members..."),await a(`
    DELETE FROM org_members 
    WHERE id NOT IN (
      SELECT MIN(id) 
      FROM org_members 
      GROUP BY full_name, bidang_id
    )
  `);try{await a("ALTER TABLE org_members ADD CONSTRAINT unique_member_identity UNIQUE (full_name, bidang_id)")}catch(T){}let E=new Map;for(let t of i){let e=String(t?.bidangId||"").trim(),i=T.get(e);if(!i)continue;let s=(E.get(e)||0)+1;E.set(e,s),await a`
      INSERT INTO org_members (
        bidang_id, full_name, role_title, quote, photo_url, instagram_url, sort_order, is_active
      ) VALUES (
        ${i},
        ${String(t?.name||"").trim()},
        ${String(t?.role||"").trim()},
        ${String(t?.quote||"").trim()},
        ${A(t?.photo)},
        ${String(t?.instagram||"").trim()},
        ${s},
        true
      )
      ON CONFLICT (full_name, bidang_id) DO NOTHING
    `}if(0===Number((await a`SELECT COUNT(*)::int AS c FROM org_programs`).rows[0]?.c||0)){let E=new Map;for(let t of s){let e=String(t?.bidangId||"").trim(),i=T.get(e);if(!i)continue;let s=(E.get(e)||0)+1;E.set(e,s);let A=String(t?.name||"").trim()||`Program Kerja Draft ${s}`,r=String(t?.desc||"").trim(),L=function(T){let E=String(T||"").trim().toLowerCase();return"rencana"===E||"terlaksana"===E||"draft"===E?E:"draft"}(t?.status);await a`
        INSERT INTO org_programs (
          bidang_id, title, description, status, sort_order, is_active
        ) VALUES (
          ${i},
          ${A},
          ${r},
          ${L},
          ${s},
          ${!0}
        )
      `}}}E.exports={ensureSchema:async function(){await a`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    nama_panjang TEXT,
    pimpinan TEXT,
    password_salt TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    category TEXT,
    quiz_set INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS results (
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
  )`,await a`CREATE TABLE IF NOT EXISTS ranking_monthly_archive (
    id SERIAL PRIMARY KEY,
    ym TEXT NOT NULL,
    rank_position INT NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    username_snapshot TEXT NOT NULL,
    pimpinan_snapshot TEXT,
    score INT DEFAULT 0,
    total INT DEFAULT 0,
    percent INT DEFAULT 0,
    time_spent BIGINT DEFAULT 0,
    quiz_set INT,
    result_created_at TIMESTAMP,
    archived_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (ym, rank_position)
  )`,await a`CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    role TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
  )`,await a`CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    username TEXT,
    ip TEXT,
    attempted_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE
  )`,await a`CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES users(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    title TEXT DEFAULT 'Notifikasi',
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- success, warning, info, danger
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  )`;try{await a`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Notifikasi'`,await a`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info'`,await a`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT`}catch(T){console.log("Migration notifications skipped or already done")}await a`CREATE TABLE IF NOT EXISTS feedback_messages (
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
  )`,await a`CREATE TABLE IF NOT EXISTS articles (
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
  )`,await a`CREATE TABLE IF NOT EXISTS quiz_schedules (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS materials (
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
  )`,await a`CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS user_authenticators (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    transports TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
  )`,await a`CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id SERIAL PRIMARY KEY,
    user_id TEXT, -- Can be IP or UUID for registration; or username/id for login
    challenge TEXT NOT NULL,
    purpose TEXT NOT NULL, -- 'registration' or 'authentication'
    created_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS scheduled_notifications (
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
  )`,await a`CREATE TABLE IF NOT EXISTS org_bidang (
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
  )`,await a`CREATE TABLE IF NOT EXISTS org_members (
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
  )`,await a`CREATE TABLE IF NOT EXISTS org_programs (
    id SERIAL PRIMARY KEY,
    bidang_id INT NOT NULL REFERENCES org_bidang(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    sort_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS discussions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'Umum',
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS discussion_replies (
    id SERIAL PRIMARY KEY,
    discussion_id INT REFERENCES discussions(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS org_program_upvotes (
    program_id INT REFERENCES org_programs(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (program_id, user_id)
  )`,await a`CREATE TABLE IF NOT EXISTS org_program_comments (
    id SERIAL PRIMARY KEY,
    program_id INT REFERENCES org_programs(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS attendance_rooms (
    id SERIAL PRIMARY KEY,
    pimpinan TEXT UNIQUE NOT NULL,
    room_code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS attendance_events (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL REFERENCES attendance_rooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
  )`,await a`CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES attendance_events(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    org_member_id INT REFERENCES org_members(id) ON DELETE SET NULL,
    attendee_name_snapshot TEXT,
    attendance_status TEXT NOT NULL,
    photo_url TEXT,
    check_in_at TIMESTAMP,
    submitted_by_admin BOOLEAN DEFAULT FALSE,
    submitted_by INT REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (event_id, user_id)
  )`,await a`CREATE TABLE IF NOT EXISTS attendance_room_sessions (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL REFERENCES attendance_rooms(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (room_id, user_id)
  )`,await a`CREATE TABLE IF NOT EXISTS form_templates (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'pretest',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    allow_multiple BOOLEAN DEFAULT FALSE,
    theme_variant TEXT DEFAULT 'aurora-premium',
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS form_fields (
    id SERIAL PRIMARY KEY,
    form_id INT NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'short_text',
    required BOOLEAN DEFAULT FALSE,
    placeholder TEXT,
    options_json JSONB DEFAULT '[]'::jsonb,
    sort_order INT DEFAULT 1,
    focus_inbox BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS form_submissions (
    id SERIAL PRIMARY KEY,
    form_id INT NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submitter_name TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    submitted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (form_id, user_id)
  )`,await a`CREATE TABLE IF NOT EXISTS form_answers (
    id SERIAL PRIMARY KEY,
    submission_id INT NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    field_id INT NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_json JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (submission_id, field_id)
  )`,await a`CREATE TABLE IF NOT EXISTS form_submission_workflow (
    id SERIAL PRIMARY KEY,
    form_id INT NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id INT NOT NULL,
    workflow_status TEXT NOT NULL DEFAULT 'unread',
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (form_id, item_type, item_id)
  )`,await a`CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_name TEXT NOT NULL,
    path TEXT NOT NULL,
    title TEXT,
    referrer TEXT,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT,
    ip_hash TEXT,
    ua TEXT,
    country TEXT,
    props JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
  )`,await a`CREATE TABLE IF NOT EXISTS quiz_reminder_logs (
    id SERIAL PRIMARY KEY,
    schedule_id INT NOT NULL REFERENCES quiz_schedules(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (schedule_id, user_id, reminder_type)
  )`,await a`CREATE TABLE IF NOT EXISTS article_notification_logs (
    id SERIAL PRIMARY KEY,
    article_id INT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    title_snapshot TEXT,
    push_sent INT DEFAULT 0,
    push_failed INT DEFAULT 0,
    notified_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (article_id)
  )`,await a`CREATE TABLE IF NOT EXISTS daily_digest_logs (
    id SERIAL PRIMARY KEY,
    digest_type TEXT NOT NULL DEFAULT 'public_daily',
    digest_date DATE NOT NULL,
    title_snapshot TEXT,
    body_snapshot TEXT,
    target_url TEXT,
    push_sent INT DEFAULT 0,
    push_failed INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (digest_type, digest_date)
  )`,await a`CREATE TABLE IF NOT EXISTS org_program_notification_logs (
    id SERIAL PRIMARY KEY,
    program_id INT NOT NULL REFERENCES org_programs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    title_snapshot TEXT,
    body_snapshot TEXT,
    target_url TEXT,
    push_sent INT DEFAULT 0,
    push_failed INT DEFAULT 0,
    notified_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (program_id, event_type, payload_hash)
  )`,await a`CREATE TABLE IF NOT EXISTS registrations_pkdtm1 (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    asal_pimpinan TEXT NOT NULL,
    sertifikat_url TEXT NOT NULL,
    foto_url TEXT NOT NULL,
    motivasi_url TEXT NOT NULL,
    kta_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id)
  )`,await a`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`,await a`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT`,await a`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`,await a`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`,await a`ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE`,await a`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS role TEXT`,await a`ALTER TABLE quiz_schedules ADD COLUMN IF NOT EXISTS description TEXT`,await a`ALTER TABLE quiz_schedules ADD COLUMN IF NOT EXISTS show_in_quiz BOOLEAN DEFAULT TRUE`,await a`ALTER TABLE quiz_schedules ADD COLUMN IF NOT EXISTS show_in_notif BOOLEAN DEFAULT FALSE`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS title TEXT`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS message TEXT`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS url TEXT`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all'`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS target_value TEXT`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS save_in_app BOOLEAN DEFAULT TRUE`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS send_at TIMESTAMP`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS created_by INT`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP`,await a`ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS error TEXT`,await a`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS image_url TEXT`,await a`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#4A7C5D'`,await a`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 1`,await a`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT FALSE`,await a`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,await a`ALTER TABLE org_bidang ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS quote TEXT`,await a`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS photo_url TEXT`,await a`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS instagram_url TEXT`,await a`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 1`,await a`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,await a`ALTER TABLE org_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS description TEXT`,await a`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'`,await a`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 1`,await a`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS progress_percent INT DEFAULT 0`,await a`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS upvote_count INT DEFAULT 0`,await a`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,await a`ALTER TABLE org_programs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS source_page TEXT DEFAULT 'struktur-organisasi'`,await a`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS subject TEXT`,await a`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS sender_name TEXT`,await a`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS sender_contact TEXT`,await a`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS message TEXT`,await a`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS context_json JSONB`,await a`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS source_ip TEXT`,await a`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open'`,await a`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP`,await a`ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS resolved_by INT`,await a`ALTER TABLE attendance_rooms ADD COLUMN IF NOT EXISTS room_code TEXT`,await a`ALTER TABLE attendance_rooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,await a`ALTER TABLE attendance_rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE attendance_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE attendance_events ADD COLUMN IF NOT EXISTS description TEXT`,await a`ALTER TABLE attendance_events ADD COLUMN IF NOT EXISTS event_date DATE`,await a`ALTER TABLE attendance_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`,await a`ALTER TABLE attendance_events ADD COLUMN IF NOT EXISTS created_by INT`,await a`ALTER TABLE attendance_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE attendance_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE attendance_events ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP`,await a`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS attendance_status TEXT`,await a`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS photo_url TEXT`,await a`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP`,await a`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS submitted_by_admin BOOLEAN DEFAULT FALSE`,await a`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS submitted_by INT`,await a`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS org_member_id INT`,await a`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS attendee_name_snapshot TEXT`,await a`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS note TEXT`,await a`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE attendance_records ALTER COLUMN user_id DROP NOT NULL`,await a`ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_event_id_user_id_key`,await a`ALTER TABLE attendance_room_sessions ADD COLUMN IF NOT EXISTS access_token TEXT`,await a`ALTER TABLE attendance_room_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP`,await a`ALTER TABLE attendance_room_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE attendance_room_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS description TEXT`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'pretest'`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS allow_multiple BOOLEAN DEFAULT FALSE`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS theme_variant TEXT DEFAULT 'aurora-premium'`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS version INT DEFAULT 1`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS target_participants INT DEFAULT 0`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS start_at TIMESTAMP`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS end_at TIMESTAMP`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS created_by INT`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT FALSE`,await a`ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS placeholder TEXT`,await a`ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS options_json JSONB DEFAULT '[]'::jsonb`,await a`ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS answer_key_text TEXT`,await a`ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS score_weight INT DEFAULT 1`,await a`ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 1`,await a`ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS focus_inbox BOOLEAN DEFAULT FALSE`,await a`ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;try{await a`ALTER TABLE form_templates ADD CONSTRAINT chk_form_templates_version CHECK (version >= 1 AND version <= 99)`}catch(T){}try{await a`ALTER TABLE form_templates ADD CONSTRAINT chk_form_templates_target_participants CHECK (target_participants >= 0 AND target_participants <= 100000)`}catch(T){}try{await a`ALTER TABLE form_fields ADD CONSTRAINT chk_form_fields_score_weight CHECK (score_weight >= 0 AND score_weight <= 100)`}catch(T){}await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted'`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS submitter_name TEXT`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_code TEXT`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS confidentiality_level TEXT DEFAULT 'internal'`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS retention_years INT DEFAULT 2`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_status TEXT DEFAULT 'active_archive'`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_note TEXT`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_due_at TIMESTAMP`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_updated_by INT`,await a`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS archive_updated_at TIMESTAMP DEFAULT NOW()`;try{await a`ALTER TABLE form_submissions ADD CONSTRAINT chk_form_submissions_confidentiality CHECK (confidentiality_level IN ('internal', 'restricted', 'secret'))`}catch(T){}try{await a`ALTER TABLE form_submissions ADD CONSTRAINT chk_form_submissions_archive_status CHECK (archive_status IN ('active_archive', 'inactive_archive', 'destroy_scheduled'))`}catch(T){}try{await a`ALTER TABLE form_submissions ADD CONSTRAINT chk_form_submissions_retention_years CHECK (retention_years >= 1 AND retention_years <= 25)`}catch(T){}await a`ALTER TABLE form_answers ADD COLUMN IF NOT EXISTS answer_text TEXT`,await a`ALTER TABLE form_answers ADD COLUMN IF NOT EXISTS answer_json JSONB`,await a`ALTER TABLE form_answers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE form_answers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE form_submission_workflow ADD COLUMN IF NOT EXISTS form_id INT`,await a`ALTER TABLE form_submission_workflow ADD COLUMN IF NOT EXISTS item_type TEXT`,await a`ALTER TABLE form_submission_workflow ADD COLUMN IF NOT EXISTS item_id INT`,await a`ALTER TABLE form_submission_workflow ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'unread'`,await a`ALTER TABLE form_submission_workflow ADD COLUMN IF NOT EXISTS updated_by INT`,await a`ALTER TABLE form_submission_workflow ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_name TEXT`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS path TEXT`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS title TEXT`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS referrer TEXT`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS user_id INT`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id TEXT`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS ip_hash TEXT`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS ua TEXT`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS country TEXT`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS props JSONB DEFAULT '{}'::jsonb`,await a`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE quiz_reminder_logs ADD COLUMN IF NOT EXISTS schedule_id INT`,await a`ALTER TABLE quiz_reminder_logs ADD COLUMN IF NOT EXISTS user_id INT`,await a`ALTER TABLE quiz_reminder_logs ADD COLUMN IF NOT EXISTS reminder_type TEXT`,await a`ALTER TABLE quiz_reminder_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE article_notification_logs ADD COLUMN IF NOT EXISTS article_id INT`,await a`ALTER TABLE article_notification_logs ADD COLUMN IF NOT EXISTS title_snapshot TEXT`,await a`ALTER TABLE article_notification_logs ADD COLUMN IF NOT EXISTS push_sent INT DEFAULT 0`,await a`ALTER TABLE article_notification_logs ADD COLUMN IF NOT EXISTS push_failed INT DEFAULT 0`,await a`ALTER TABLE article_notification_logs ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE article_notification_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE daily_digest_logs ADD COLUMN IF NOT EXISTS digest_type TEXT DEFAULT 'public_daily'`,await a`ALTER TABLE daily_digest_logs ADD COLUMN IF NOT EXISTS digest_date DATE`,await a`ALTER TABLE daily_digest_logs ADD COLUMN IF NOT EXISTS title_snapshot TEXT`,await a`ALTER TABLE daily_digest_logs ADD COLUMN IF NOT EXISTS body_snapshot TEXT`,await a`ALTER TABLE daily_digest_logs ADD COLUMN IF NOT EXISTS target_url TEXT`,await a`ALTER TABLE daily_digest_logs ADD COLUMN IF NOT EXISTS push_sent INT DEFAULT 0`,await a`ALTER TABLE daily_digest_logs ADD COLUMN IF NOT EXISTS push_failed INT DEFAULT 0`,await a`ALTER TABLE daily_digest_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE org_program_notification_logs ADD COLUMN IF NOT EXISTS event_type TEXT`,await a`ALTER TABLE org_program_notification_logs ADD COLUMN IF NOT EXISTS payload_hash TEXT`,await a`ALTER TABLE org_program_notification_logs ADD COLUMN IF NOT EXISTS title_snapshot TEXT`,await a`ALTER TABLE org_program_notification_logs ADD COLUMN IF NOT EXISTS body_snapshot TEXT`,await a`ALTER TABLE org_program_notification_logs ADD COLUMN IF NOT EXISTS target_url TEXT`,await a`ALTER TABLE org_program_notification_logs ADD COLUMN IF NOT EXISTS push_sent INT DEFAULT 0`,await a`ALTER TABLE org_program_notification_logs ADD COLUMN IF NOT EXISTS push_failed INT DEFAULT 0`,await a`ALTER TABLE org_program_notification_logs ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE org_program_notification_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS nama TEXT`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS asal_pimpinan TEXT`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS sertifikat_url TEXT`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS foto_url TEXT`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS motivasi_url TEXT`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS kta_url TEXT`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS admin_note TEXT`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS reviewed_by INT`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS essay_url TEXT`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS essay_submitted_at TIMESTAMP`,await a`ALTER TABLE registrations_pkdtm1 ADD COLUMN IF NOT EXISTS surat_mandat_url TEXT`,await r(),await a`CREATE INDEX IF NOT EXISTS idx_questions_quiz_set ON questions(quiz_set)`,await a`CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category)`,await a`CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id)`,await a`CREATE INDEX IF NOT EXISTS idx_results_quiz_set ON results(quiz_set)`,await a`CREATE INDEX IF NOT EXISTS idx_ranking_monthly_archive_ym ON ranking_monthly_archive(ym DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_ranking_monthly_archive_user_id ON ranking_monthly_archive(user_id)`,await a`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`,await a`CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,await a`CREATE INDEX IF NOT EXISTS idx_materials_active ON materials(active)`,await a`CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)`,await a`CREATE INDEX IF NOT EXISTS idx_feedback_messages_status_created ON feedback_messages(status, created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_feedback_messages_created ON feedback_messages(created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_feedback_messages_source_ip_created ON feedback_messages(source_ip, created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status)`,await a`CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_send_at ON scheduled_notifications(send_at)`,await a`CREATE INDEX IF NOT EXISTS idx_org_bidang_sort ON org_bidang(sort_order, id)`,await a`CREATE INDEX IF NOT EXISTS idx_org_members_bidang_sort ON org_members(bidang_id, sort_order, id)`,await a`CREATE INDEX IF NOT EXISTS idx_org_programs_bidang_sort ON org_programs(bidang_id, sort_order, id)`,await a`CREATE INDEX IF NOT EXISTS idx_attendance_events_room_date ON attendance_events(room_id, event_date DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_attendance_events_status_date ON attendance_events(status, event_date DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_attendance_records_event ON attendance_records(event_id, updated_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON attendance_records(user_id, updated_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_attendance_records_org_member ON attendance_records(org_member_id, updated_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_attendance_sessions_user_room ON attendance_room_sessions(user_id, room_id)`,await a`CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_records_event_user_account_unique ON attendance_records(event_id, user_id) WHERE user_id IS NOT NULL AND org_member_id IS NULL`,await a`CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_records_event_org_member_unique ON attendance_records(event_id, org_member_id) WHERE org_member_id IS NOT NULL`,await a`CREATE INDEX IF NOT EXISTS idx_form_templates_status_type ON form_templates(status, type, updated_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_form_fields_form_sort ON form_fields(form_id, sort_order, id)`,await a`CREATE INDEX IF NOT EXISTS idx_form_submissions_form_submitted ON form_submissions(form_id, submitted_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_form_submissions_user_submitted ON form_submissions(user_id, submitted_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_form_submissions_archive_status ON form_submissions(archive_status, archive_updated_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_form_submissions_archive_due_at ON form_submissions(archive_due_at)`,await a`CREATE INDEX IF NOT EXISTS idx_form_submissions_archive_code ON form_submissions(archive_code)`,await a`CREATE INDEX IF NOT EXISTS idx_form_answers_submission ON form_answers(submission_id)`,await a`CREATE INDEX IF NOT EXISTS idx_form_workflow_form_item ON form_submission_workflow(form_id, item_type, item_id)`,await a`CREATE INDEX IF NOT EXISTS idx_form_workflow_status_updated ON form_submission_workflow(workflow_status, updated_at DESC)`,await a`CREATE UNIQUE INDEX IF NOT EXISTS idx_form_workflow_unique_form_item ON form_submission_workflow(form_id, item_type, item_id)`,await a`CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_analytics_events_path_created ON analytics_events(path, created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created ON analytics_events(event_name, created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_quiz_reminder_logs_schedule_type ON quiz_reminder_logs(schedule_id, reminder_type, created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_quiz_reminder_logs_user_created ON quiz_reminder_logs(user_id, created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_article_notification_logs_notified_at ON article_notification_logs(notified_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_daily_digest_logs_date ON daily_digest_logs(digest_date DESC, created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_org_program_notification_logs_program_created ON org_program_notification_logs(program_id, created_at DESC)`,await a`CREATE INDEX IF NOT EXISTS idx_pkdtm1_user ON registrations_pkdtm1(user_id)`,await a`CREATE INDEX IF NOT EXISTS idx_pkdtm1_status_created ON registrations_pkdtm1(status, created_at DESC)`}}}];

//# sourceMappingURL=src_pages_api_06cfhfj._.js.map