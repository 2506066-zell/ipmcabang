const { query } = require('./_db');
const { sendToAll } = require('./_push');

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

function buildDigestPayload(sources) {
  const chips = [];
  if (sources.quiz) chips.push('quiz aktif');
  if (sources.form) chips.push('form siap diisi');
  if (sources.attendanceCount > 0) chips.push(`${sources.attendanceCount} absensi aktif`);
  if (sources.article) chips.push('artikel terbaru');
  if (sources.material) chips.push('ebook perpustakaan');
  if (sources.discussion) chips.push('diskusi terbaru');

  if (sources.quiz) {
    return {
      title: 'Pengingat hari ini: quiz sedang aktif',
      body: `Buka aplikasi sekarang. ${chips.slice(0, 3).join(', ')} tersedia hari ini.`.replace(/\s+/g, ' ').trim(),
      url: '/quiz-gamified.html?source=daily-digest',
      summary: 'quiz'
    };
  }

  if (sources.form) {
    const typeLabel = sources.form.type === 'posttest' ? 'posttest' : 'pretest';
    return {
      title: `Pengingat hari ini: ${typeLabel} siap diisi`,
      body: `Form "${cleanText(sources.form.title, 64)}" sudah tersedia. ${chips.slice(0, 3).join(', ')} juga bisa kamu cek.`.replace(/\s+/g, ' ').trim(),
      url: `/forms.html?source=daily-digest&slug=${encodeURIComponent(cleanText(sources.form.slug, 180))}`,
      summary: 'form'
    };
  }

  if (sources.attendanceCount > 0) {
    return {
      title: 'Pengingat hari ini: absensi sedang berjalan',
      body: `${sources.attendanceCount} room absensi aktif hari ini. Buka aplikasi untuk cek agenda dan status kehadiranmu.`,
      url: '/absen.html?source=daily-digest',
      summary: 'attendance'
    };
  }

  if (sources.article) {
    const freshTarget = pickFreshContentTarget(sources);
    if (freshTarget?.type === 'material') {
      const fileType = cleanText(freshTarget.data.file_type, 20).toLowerCase();
      const readingLabel = fileType === 'ebook' ? 'E-book terbaru' : 'Materi perpustakaan terbaru';
      return {
        title: `${readingLabel} siap dibuka`,
        body: `"${cleanText(freshTarget.data.title, 72)}" tersedia di perpustakaan digital. Luangkan waktu untuk membaca materi hari ini.`,
        url: '/materi.html?source=daily-digest',
        summary: 'materials'
      };
    }

    if (freshTarget?.type === 'discussion') {
      const category = cleanText(freshTarget.data.category, 32);
      return {
        title: 'Ruang diskusi memiliki topik baru',
        body: `${category ? `${category} · ` : ''}"${cleanText(freshTarget.data.title, 72)}" sedang dibahas. Buka diskusi untuk membaca atau memberi tanggapan.`,
        url: '/discussions.html?source=daily-digest',
        summary: 'discussions'
      };
    }

    const category = cleanText(sources.article.category, 40);
    const teaser = cleanText(stripHtml(sources.article.content), 84);
    return {
      title: 'Artikel terbaru sudah terbit',
      body: `${category ? `${category} · ` : ''}${teaser || `Baca "${cleanText(sources.article.title, 72)}" di aplikasi IPM hari ini.`}`,
      url: `${buildArticlePath(sources.article)}?source=daily-digest`,
      summary: 'article'
    };
  }

  if (sources.material) {
    return {
      title: 'Perpustakaan digital siap dibuka',
      body: `"${cleanText(sources.material.title, 72)}" tersedia untuk dibaca. Buka perpustakaan dan lanjutkan bacaanmu hari ini.`,
      url: '/materi.html?source=daily-digest',
      summary: 'materials'
    };
  }

  if (sources.discussion) {
    return {
      title: 'Ruang diskusi menunggu partisipasimu',
      body: `"${cleanText(sources.discussion.title, 72)}" bisa kamu baca hari ini. Masuk ke diskusi untuk mengikuti percakapan terbaru.`,
      url: '/discussions.html?source=daily-digest',
      summary: 'discussions'
    };
  }

  return {
    title: 'Cek aplikasi IPM hari ini',
    body: 'Lihat artikel, quiz, form, dan informasi organisasi terbaru dalam satu aplikasi.',
    url: '/?source=daily-digest',
    summary: 'general'
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
  const payload = buildDigestPayload(sources);
  const message = `${payload.title} - ${payload.body}`;

  await saveDigestInAppNotification(message);
  const pushResult = await sendToAll({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: `daily-digest-${new Date().toISOString().slice(0, 10)}`,
    renotify: false
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
  processDailyDigestNotifications
};
