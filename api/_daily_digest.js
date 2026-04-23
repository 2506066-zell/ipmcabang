const { query } = require('./_db');
const { sendToAll } = require('./_push');

const REMINDER_IMAGES = {
  quiz: '/app/media/notifications/reminder-quiz.png',
  form: '/app/media/notifications/reminder-forms.png',
  attendance: '/app/media/notifications/reminder-attendance.png',
  materials: '/app/media/notifications/reminder-materials.png',
  discussions: '/app/media/notifications/reminder-discussions.png',
  general: '/app/media/notifications/reminder-home.png'
};

function cleanText(value, max = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildArticlePath(article) {
  const slug = cleanText(article?.slug, 180);
  if (slug) return `/articles/${encodeURIComponent(slug)}`;
  return '/articles';
}

function buildArticleReminderImage(article) {
  const raw = String(article?.image || '').trim();
  if (/^data:image\//i.test(raw)) return raw;
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return raw;
  const slug = cleanText(article?.slug, 180);
  if (slug) return `/api/article-share-image/${encodeURIComponent(slug)}.jpg`;
  return REMINDER_IMAGES.general;
}

async function hasDigestBeenSentToday() {
  const row = (await query`
    SELECT id
    FROM daily_digest_logs
    WHERE digest_type='public_daily'
      AND digest_date=CURRENT_DATE
    LIMIT 1
  `).rows[0];
  return !!row;
}

async function getDigestSources() {
  const [quizRow, formRow, attendanceRow, articleRow, materialRow, discussionRow] = await Promise.all([
    query`
      SELECT id, title, description, start_time, end_time
      FROM quiz_schedules
      WHERE active=true
        AND show_in_notif=true
        AND start_time <= NOW()
        AND (end_time IS NULL OR end_time >= NOW())
      ORDER BY start_time ASC
      LIMIT 1
    `,
    query`
      SELECT id, title, slug, type, description, updated_at, start_at, end_at
      FROM form_templates
      WHERE status='published'
        AND (start_at IS NULL OR start_at <= NOW())
        AND (end_at IS NULL OR end_at >= NOW())
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `,
    query`
      SELECT COUNT(*)::int AS count
      FROM attendance_events
      WHERE status='active'
        AND event_date=CURRENT_DATE
    `,
    query`
      SELECT id, title, slug, category, image, publish_date, created_at, content
      FROM articles
      WHERE COALESCE(publish_date, created_at, NOW()) <= NOW()
      ORDER BY COALESCE(publish_date, created_at, NOW()) DESC
      LIMIT 1
    `,
    query`
      SELECT id, title, description, file_type, category, updated_at
      FROM materials
      WHERE active=true
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `,
    query`
      SELECT id, title, content, category, updated_at, created_at
      FROM discussions
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `
  ]);

  return {
    quiz: quizRow.rows[0] || null,
    form: formRow.rows[0] || null,
    attendanceCount: Number(attendanceRow.rows[0]?.count || 0),
    article: articleRow.rows[0] || null,
    material: materialRow.rows[0] || null,
    discussion: discussionRow.rows[0] || null
  };
}

function pickFreshContentTarget(sources) {
  const candidates = [];
  if (sources.article) {
    candidates.push({
      type: 'article',
      ts: new Date(sources.article.publish_date || sources.article.created_at || Date.now()).getTime(),
      data: sources.article
    });
  }
  if (sources.material) {
    candidates.push({
      type: 'material',
      ts: new Date(sources.material.updated_at || Date.now()).getTime(),
      data: sources.material
    });
  }
  if (sources.discussion) {
    candidates.push({
      type: 'discussion',
      ts: new Date(sources.discussion.updated_at || sources.discussion.created_at || Date.now()).getTime(),
      data: sources.discussion
    });
  }
  candidates.sort((a, b) => b.ts - a.ts);
  return candidates[0] || null;
}

function buildDailyReminderPayload(sources) {
  const chips = [];
  if (sources.quiz) chips.push('quiz aktif');
  if (sources.form) chips.push('form siap diisi');
  if (sources.attendanceCount > 0) chips.push(`${sources.attendanceCount} absensi aktif`);
  if (sources.article) chips.push('artikel terbaru');
  if (sources.material) chips.push('ebook perpustakaan');
  if (sources.discussion) chips.push('diskusi terbaru');

  if (sources.quiz) {
    return {
      title: 'Reminder IPM malam ini',
      body: `Quiz sedang aktif. Buka aplikasi malam ini dan cek ${chips.slice(0, 3).join(', ')} yang tersedia.`.replace(/\s+/g, ' ').trim(),
      url: '/quiz-gamified.html?source=daily-digest',
      summary: 'quiz',
      image: REMINDER_IMAGES.quiz,
      context: 'Ringkasan aktivitas malam ini dari fitur quiz IPM'
    };
  }

  if (sources.form) {
    const typeLabel = sources.form.type === 'posttest' ? 'posttest' : 'pretest';
    return {
      title: 'Reminder IPM malam ini',
      body: `${typeLabel.toUpperCase()} "${cleanText(sources.form.title, 64)}" sudah tersedia. Buka aplikasi malam ini untuk mengisinya.`.replace(/\s+/g, ' ').trim(),
      url: `/forms.html?source=daily-digest&slug=${encodeURIComponent(cleanText(sources.form.slug, 180))}`,
      summary: 'form',
      image: REMINDER_IMAGES.form,
      context: 'Pengingat formulir resmi yang siap diisi malam ini'
    };
  }

  if (sources.attendanceCount > 0) {
    return {
      title: 'Reminder IPM malam ini',
      body: `${sources.attendanceCount} room absensi masih aktif. Cek agenda dan pastikan status kehadiranmu malam ini.`,
      url: '/absen.html?source=daily-digest',
      summary: 'attendance',
      image: REMINDER_IMAGES.attendance,
      context: 'Informasi kehadiran resmi yang masih aktif di aplikasi IPM'
    };
  }

  if (sources.article) {
    const freshTarget = pickFreshContentTarget(sources);
    if (freshTarget?.type === 'material') {
      const fileType = cleanText(freshTarget.data.file_type, 20).toLowerCase();
      const readingLabel = fileType === 'ebook' ? 'E-book terbaru' : 'Materi perpustakaan terbaru';
      return {
        title: 'Reminder IPM malam ini',
        body: `${readingLabel} "${cleanText(freshTarget.data.title, 72)}" siap dibuka. Luangkan waktu malam ini untuk membaca.`,
        url: '/materi.html?source=daily-digest',
        summary: 'materials',
        image: REMINDER_IMAGES.materials,
        context: 'Koleksi perpustakaan digital yang direkomendasikan malam ini'
      };
    }

    if (freshTarget?.type === 'discussion') {
      const category = cleanText(freshTarget.data.category, 32);
      return {
        title: 'Reminder IPM malam ini',
        body: `${category ? `${category} · ` : ''}"${cleanText(freshTarget.data.title, 72)}" sedang dibahas. Masuk ke diskusi malam ini untuk ikut menanggapi.`,
        url: '/discussions.html?source=daily-digest',
        summary: 'discussions',
        image: REMINDER_IMAGES.discussions,
        context: 'Topik diskusi resmi yang sedang ramai dibahas malam ini'
      };
    }

    const category = cleanText(sources.article.category, 40);
    const teaser = cleanText(stripHtml(sources.article.content), 84);
    return {
      title: 'Reminder IPM malam ini',
      body: `${category ? `${category} · ` : ''}${teaser || `Baca "${cleanText(sources.article.title, 72)}" di aplikasi IPM malam ini.`}`,
      url: `${buildArticlePath(sources.article)}?source=daily-digest`,
      summary: 'article',
      image: buildArticleReminderImage(sources.article),
      context: 'Artikel pilihan resmi yang direkomendasikan malam ini'
    };
  }

  if (sources.material) {
    return {
      title: 'Reminder IPM malam ini',
      body: `"${cleanText(sources.material.title, 72)}" tersedia untuk dibaca. Buka perpustakaan malam ini dan lanjutkan bacaanmu.`,
      url: '/materi.html?source=daily-digest',
      summary: 'materials',
      image: REMINDER_IMAGES.materials,
      context: 'Koleksi perpustakaan digital yang siap dibuka malam ini'
    };
  }

  if (sources.discussion) {
    return {
      title: 'Reminder IPM malam ini',
      body: `"${cleanText(sources.discussion.title, 72)}" bisa kamu baca malam ini. Masuk ke diskusi untuk mengikuti percakapan terbaru.`,
      url: '/discussions.html?source=daily-digest',
      summary: 'discussions',
      image: REMINDER_IMAGES.discussions,
      context: 'Percakapan komunitas IPM yang patut kamu ikuti malam ini'
    };
  }

  return {
    title: 'Reminder IPM malam ini',
    body: 'Buka aplikasi IPM malam ini untuk cek artikel, quiz, form, dan info organisasi terbaru.',
    url: '/?source=daily-digest',
    summary: 'general',
    image: REMINDER_IMAGES.general,
    context: 'Ringkasan aktivitas resmi dari aplikasi PC IPM Panawuan'
  };
}

async function saveDigestInAppNotification(message) {
  await query`
    INSERT INTO notifications (user_id, message)
    SELECT id, ${message}
    FROM users
    WHERE role='user' OR role IS NULL
  `;
}

async function recordDigest(payload, pushResult) {
  await query`
    INSERT INTO daily_digest_logs (digest_type, digest_date, title_snapshot, body_snapshot, target_url, push_sent, push_failed, created_at)
    VALUES (
      'public_daily',
      CURRENT_DATE,
      ${payload.title},
      ${payload.body},
      ${payload.url},
      ${Number(pushResult?.sent || 0)},
      ${Number(pushResult?.failed || 0)},
      NOW()
    )
    ON CONFLICT (digest_type, digest_date) DO NOTHING
  `;
}

async function processDailyDigestNotifications() {
  if (await hasDigestBeenSentToday()) {
    return { sent: 0, failed: 0, skipped: true, reason: 'already-sent' };
  }

  const sources = await getDigestSources();
  const payload = buildDailyReminderPayload(sources);
  const message = `${payload.title} - ${payload.body}`;

  await saveDigestInAppNotification(message);
  const pushResult = await sendToAll({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    image: payload.image,
    tag: `daily-digest-${new Date().toISOString().slice(0, 10)}`,
    renotify: false,
    context: payload.context || 'Reminder harian resmi dari aplikasi PC IPM Panawuan',
    trustLabel: 'Disusun otomatis oleh sistem'
  });

  await recordDigest(payload, pushResult);

  try {
    await query`
      INSERT INTO activity_logs (admin_id, action, details)
      VALUES (${null}, 'AUTO_DAILY_DIGEST', ${{ summary: payload.summary, title: payload.title, url: payload.url, push_sent: Number(pushResult?.sent || 0), push_failed: Number(pushResult?.failed || 0) }})
    `;
  } catch {}

  return {
    sent: Number(pushResult?.sent || 0),
    failed: Number(pushResult?.failed || 0),
    skipped: false,
    summary: payload.summary,
    title: payload.title,
    url: payload.url
  };
}

module.exports = {
  processDailyDigestNotifications,
  buildDailyReminderPayload
};
