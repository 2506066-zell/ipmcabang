const crypto = require('crypto');
const { query } = require('./_db');
const { sendToAll } = require('./_push');

const PROGRAM_FALLBACK_IMAGE = '/app/media/notifications/reminder-home.png';

function cleanText(value, max = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeImageUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return PROGRAM_FALLBACK_IMAGE;
  if (/^data:image\//i.test(value)) return value;
  if (/^(https?:)?\/\//i.test(value)) return value;
  if (value.startsWith('/')) return value;
  return `/${value.replace(/^\.?\//, '')}`;
}

function buildProgramPrompt(program, eventType) {
  const status = String(program?.status || 'draft').trim().toLowerCase();
  if (eventType === 'create') {
    return 'Apa yang perlu didiskusikan lebih dulu, dan kritik apa yang bisa membuat program ini lebih relevan?';
  }
  if (status === 'terlaksana') {
    return 'Bagian mana yang paling berdampak, dan apa yang perlu dievaluasi atau dikritisi untuk tindak lanjutnya?';
  }
  if (status === 'rencana') {
    return 'Apa yang perlu dipersiapkan, dan sisi mana yang perlu dikritisi agar pelaksanaannya lebih realistis?';
  }
  return 'Apa masukan awal yang perlu dibahas bersama, dan apa yang masih perlu diperjelas dari program ini?';
}

function buildProgramNotificationPayload({ program, bidang, eventType }) {
  const bidangName = cleanText(bidang?.name || 'Bidang IPM', 80);
  const bidangCode = cleanText(bidang?.code || '', 80);
  const titleText = cleanText(program?.title || 'Program kerja', 84);
  const eventLabel = eventType === 'create' ? 'Program kerja baru' : 'Pembaruan program kerja';
  const prompt = buildProgramPrompt(program, eventType);
  const description = cleanText(program?.description || '', 110);
  const body = [
    `${eventLabel}: ${titleText}.`,
    description ? description : `${bidangName} sedang membuka ruang masukan untuk program ini.`,
    prompt
  ].join(' ');
  const focus = String(program?.status || '').trim().toLowerCase() === 'terlaksana' ? 'feedback' : 'discussion';
  const params = new URLSearchParams();
  if (bidangCode) params.set('bidang', bidangCode);
  if (program?.id) params.set('program', String(Number(program.id)));
  params.set('segment', 'program');
  params.set('focus', focus);
  params.set('source', 'program-reminder');

  return {
    title: `${eventLabel}: ${titleText}`,
    body,
    url: `/struktur-organisasi.html?${params.toString()}`,
    image: normalizeImageUrl(bidang?.image_url),
    tag: `org-program-${Number(program?.id || 0)}-${eventType}`,
    renotify: false,
    context: `${bidangName} membuka ruang diskusi dan kritik untuk program kerja ini`,
    trustLabel: 'Program kerja resmi organisasi',
    summary: focus === 'feedback' ? 'feedback' : 'discussion'
  };
}

function buildPayloadHash(payload) {
  return crypto
    .createHash('sha1')
    .update(JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      image: payload.image,
      summary: payload.summary
    }))
    .digest('hex');
}

async function hasProgramNotificationBeenSent(programId, eventType, payloadHash) {
  if (!programId || !eventType || !payloadHash) return false;
  const row = (await query`
    SELECT id
    FROM org_program_notification_logs
    WHERE program_id=${Number(programId)}
      AND event_type=${String(eventType)}
      AND payload_hash=${String(payloadHash)}
    LIMIT 1
  `).rows[0];
  return !!row;
}

async function saveProgramInAppNotification(message) {
  if (!message) return;
  await query`
    INSERT INTO notifications (user_id, message)
    SELECT id, ${message}
    FROM users
    WHERE role='user' OR role IS NULL
  `;
}

async function recordProgramNotification(programId, eventType, payloadHash, payload, pushResult) {
  await query`
    INSERT INTO org_program_notification_logs (
      program_id, event_type, payload_hash, title_snapshot, body_snapshot, target_url,
      push_sent, push_failed, notified_at, created_at
    ) VALUES (
      ${Number(programId)},
      ${String(eventType)},
      ${String(payloadHash)},
      ${payload.title},
      ${payload.body},
      ${payload.url},
      ${Number(pushResult?.sent || 0)},
      ${Number(pushResult?.failed || 0)},
      NOW(),
      NOW()
    )
  `;
}

async function notifyOrganizationProgram({ program, bidang, eventType, adminId = null }) {
  if (!program?.id || !bidang?.id) return { status: 'skipped', reason: 'missing-program-context' };

  const payload = buildProgramNotificationPayload({ program, bidang, eventType });
  const payloadHash = buildPayloadHash(payload);
  if (await hasProgramNotificationBeenSent(program.id, eventType, payloadHash)) {
    return { status: 'skipped', reason: 'already-notified', payload };
  }

  await saveProgramInAppNotification(`${payload.title} - ${payload.body}`);
  const pushResult = await sendToAll(payload);
  await recordProgramNotification(program.id, eventType, payloadHash, payload, pushResult);

  try {
    await query`
      INSERT INTO activity_logs (admin_id, action, details)
      VALUES (
        ${adminId},
        'AUTO_ORG_PROGRAM_NOTIFICATION',
        ${{ program_id: Number(program.id), bidang_id: Number(bidang.id), event_type: eventType, push_sent: Number(pushResult?.sent || 0), push_failed: Number(pushResult?.failed || 0), summary: payload.summary }}
      )
    `;
  } catch {}

  return {
    status: 'sent',
    payload,
    push_sent: Number(pushResult?.sent || 0),
    push_failed: Number(pushResult?.failed || 0)
  };
}

module.exports = {
  buildProgramNotificationPayload,
  notifyOrganizationProgram
};
