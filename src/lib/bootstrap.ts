import { query } from './db';

export async function ensureSchema(): Promise<void> {
  try {
    // 1. Users & Sessions
    await query`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(80) UNIQUE NOT NULL,
        password_salt VARCHAR(64) NOT NULL,
        password_hash VARCHAR(128) NOT NULL,
        email VARCHAR(200),
        nama_panjang VARCHAR(160),
        pimpinan VARCHAR(80),
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(128) UNIQUE NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(80),
        ip VARCHAR(45),
        attempted_at TIMESTAMPTZ DEFAULT NOW(),
        success BOOLEAN DEFAULT FALSE
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS scheduled_notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200),
        message TEXT NOT NULL,
        url VARCHAR(500) DEFAULT '/',
        target_type VARCHAR(50) DEFAULT 'all',
        target_value VARCHAR(100),
        save_in_app BOOLEAN DEFAULT TRUE,
        send_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        error TEXT,
        sent_at TIMESTAMPTZ,
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        admin_id INT REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 2. Questions & Results
    await query`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer VARCHAR(1) NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        category VARCHAR(100),
        quiz_set INT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS results (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        quiz_set INT DEFAULT 1,
        score INT NOT NULL,
        total INT NOT NULL,
        answers JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 3. Materials & Articles
    await query`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        file_type VARCHAR(50) DEFAULT 'pdf',
        file_url TEXT NOT NULL,
        thumbnail TEXT,
        category VARCHAR(100) DEFAULT 'Umum',
        author VARCHAR(160),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        thumbnail_url TEXT,
        author_id INT REFERENCES users(id) ON DELETE SET NULL,
        author_name VARCHAR(160),
        published BOOLEAN DEFAULT TRUE,
        category VARCHAR(100) DEFAULT 'Berita',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 4. Organization
    await query`
      CREATE TABLE IF NOT EXISTS org_bidang (
        id SERIAL PRIMARY KEY,
        code VARCHAR(80) UNIQUE NOT NULL,
        name VARCHAR(160) NOT NULL,
        color VARCHAR(20) DEFAULT '#1a6b3c',
        image_url TEXT,
        sort_order INT DEFAULT 1,
        is_core BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS org_members (
        id SERIAL PRIMARY KEY,
        bidang_id INT REFERENCES org_bidang(id) ON DELETE CASCADE,
        full_name VARCHAR(160) NOT NULL,
        role_title VARCHAR(160) NOT NULL,
        quote TEXT,
        photo_url TEXT,
        instagram_url VARCHAR(255),
        sort_order INT DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS org_programs (
        id SERIAL PRIMARY KEY,
        bidang_id INT REFERENCES org_bidang(id) ON DELETE CASCADE,
        title VARCHAR(180) NOT NULL,
        description TEXT,
        status VARCHAR(30) DEFAULT 'draft',
        sort_order INT DEFAULT 1,
        progress_percent INT DEFAULT 0,
        upvote_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS org_program_upvotes (
        program_id INT REFERENCES org_programs(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (program_id, user_id)
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS org_program_comments (
        id SERIAL PRIMARY KEY,
        program_id INT REFERENCES org_programs(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 5. Attendance
    await query`
      CREATE TABLE IF NOT EXISTS attendance_rooms (
        id SERIAL PRIMARY KEY,
        pimpinan VARCHAR(160) NOT NULL,
        room_code VARCHAR(80) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        identity_mode VARCHAR(50) DEFAULT 'account_identity',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS attendance_events (
        id SERIAL PRIMARY KEY,
        room_id INT REFERENCES attendance_rooms(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        event_date TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'active',
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        closed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await query`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id SERIAL PRIMARY KEY,
        event_id INT REFERENCES attendance_events(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        org_member_id INT REFERENCES org_members(id) ON DELETE SET NULL,
        attendee_name_snapshot VARCHAR(160),
        attendance_status VARCHAR(20) DEFAULT 'hadir',
        photo_url TEXT,
        check_in_at TIMESTAMPTZ DEFAULT NOW(),
        submitted_by_admin BOOLEAN DEFAULT FALSE,
        submitted_by INT REFERENCES users(id) ON DELETE SET NULL,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
  } catch (e) {
    console.error('Schema bootstrap error:', e);
  }
}
