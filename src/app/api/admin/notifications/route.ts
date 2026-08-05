import { query, rawQuery } from '@/lib/db';
import { requireAdminAuth, getSessionUserStrict } from '@/lib/auth';
import { errResponse, okResponse, parseBody, getSearchParams, cleanString, normalizeUrl } from '@/lib/utils';
import { sendToAll, sendToUsers, resolveNotificationImage, REMINDER_IMAGES } from '@/lib/push';

// ── Notification Target ──────────────────────────────────────────────────────

interface NotifTarget {
  type: 'all' | 'pimpinan';
  value: string | null;
  label: string;
}

function parseTarget(rawTarget: unknown): NotifTarget {
  const raw = String(rawTarget || 'all').trim();
  if (!raw || raw === 'all') return { type: 'all', value: null, label: 'Semua User' };
  if (raw.startsWith('pimpinan:')) {
    const value = raw.slice('pimpinan:'.length).trim();
    return { type: 'pimpinan', value: value || null, label: value || 'Pimpinan' };
  }
  return { type: 'pimpinan', value: raw, label: raw };
}

async function getTargetUserIds(target: NotifTarget): Promise<number[] | null> {
  if (!target || target.type === 'all') return null; // null = all
  if (!target.value) return [];
  const rows = (
    await query`
      SELECT id FROM users
      WHERE LOWER(pimpinan)=LOWER(${target.value})
        AND (role='user' OR role IS NULL)
    `
  ).rows;
  return rows.map((r) => Number(r.id));
}

async function saveInAppNotifications(message: string, target: NotifTarget, userIds: number[] | null): Promise<void> {
  if (!message) return;
  if (!target || target.type === 'all') {
    await query`INSERT INTO notifications (user_id, message) SELECT id, ${message} FROM users WHERE role='user' OR role IS NULL`;
    return;
  }
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  await rawQuery('INSERT INTO notifications (user_id, message) SELECT id, $1 FROM users WHERE id = ANY($2::int[])', [message, userIds]);
}

async function sendNotificationToTarget(opts: { title: string; message: string; url: string; save: boolean; target: NotifTarget }) {
  const { title, message, url, save, target } = opts;
  const msg = title && message ? `${title} - ${message}` : message || title || '';
  const safeUrl = normalizeUrl(url);
  const userIds = await getTargetUserIds(target);

  if (save !== false) await saveInAppNotifications(msg, target, userIds);

  const pushPayload = { title: title || 'Notifikasi IPM', body: message || title || 'Ada pembaruan baru.', url: safeUrl, image: resolveNotificationImage(safeUrl) };
  const pushResult = target.type === 'all' || userIds === null
    ? await sendToAll(pushPayload)
    : (userIds.length > 0 ? await sendToUsers(userIds, pushPayload) : { sent: 0, failed: 0 });

  return { userCount: Array.isArray(userIds) ? userIds.length : 'all', ...pushResult };
}

// ── GET /api/admin/notifications ─────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  try { await requireAdminAuth(req); } catch { return errResponse('Unauthorized', 401); }

  const params = getSearchParams(req);
  const action = params.get('action');

  if (action === 'list') {
    const rows = (
      await query`SELECT * FROM scheduled_notifications ORDER BY send_at ASC LIMIT 100`
    ).rows;
    return okResponse({ items: rows });
  }

  // Debug info
  const { getVapid } = await import('@/lib/push');
  const vapid = getVapid();
  const subStats = (await query`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE user_id IS NOT NULL)::int AS linked_users FROM push_subscriptions`).rows[0];

  return okResponse({
    vapid: vapid ? { configured: true, subject: vapid.subject } : { configured: false },
    subscriptions: subStats,
  });
}

// ── POST /api/admin/notifications ────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  let adminId: number;
  try { const admin = await requireAdminAuth(req); adminId = admin.id; }
  catch { return errResponse('Unauthorized', 401); }

  const params = getSearchParams(req);
  const action = params.get('action');
  const body = await parseBody<Record<string, unknown>>(req);

  if (action === 'broadcast') {
    const title = cleanString(body.title, 200);
    const message = cleanString(body.message, 500);
    const url = normalizeUrl(body.url || '/');
    const save = body.save !== false;
    const target = parseTarget(body.target);

    if (!title && !message) return errResponse('Judul atau pesan wajib diisi');

    const result = await sendNotificationToTarget({ title, message, url, save, target });

    try {
      await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'BROADCAST_NOTIFICATION', ${{ title, message, url, target }})`;
    } catch { /* noop */ }

    return okResponse({ result });
  }

  if (action === 'schedule') {
    const title = cleanString(body.title, 200);
    const message = cleanString(body.message, 500);
    const url = normalizeUrl(body.url || '/');
    const save = body.save !== false;
    const target = parseTarget(body.target);
    const sendAtRaw = cleanString(body.schedule_at || body.send_at, 50);

    if (!title && !message) return errResponse('Judul atau pesan wajib diisi');
    if (!sendAtRaw) return errResponse('Waktu jadwal wajib diisi');

    const sendAt = new Date(sendAtRaw);
    if (isNaN(sendAt.getTime())) return errResponse('Format waktu tidak valid');
    if (sendAt.getTime() <= Date.now()) return errResponse('Waktu jadwal harus di masa depan');

    const result = await query`
      INSERT INTO scheduled_notifications (title, message, url, target_type, target_value, save_in_app, send_at, created_by)
      VALUES (${title}, ${message}, ${url}, ${target.type}, ${target.value}, ${save}, ${sendAt.toISOString()}, ${adminId})
      RETURNING *
    `;
    return okResponse({ scheduled: result.rows[0] });
  }

  if (action === 'deleteScheduled') {
    const id = Number(body.id || 0);
    if (!id) return errResponse('ID tidak valid');
    await query`DELETE FROM scheduled_notifications WHERE id=${id} AND status='pending'`;
    return okResponse();
  }

  return errResponse('Unknown action', 404);
}
