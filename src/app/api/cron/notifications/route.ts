import { query, rawQuery } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth';
import { isCronAuthorized, errResponse, okResponse, normalizeUrl, cleanString } from '@/lib/utils';
import { sendToAll, sendToUsers, resolveNotificationImage } from '@/lib/push';

// POST /api/cron/notifications — runs on Vercel Cron (daily at 13:00 UTC+7)
export async function GET(req: Request): Promise<Response> {
  if (!isCronAuthorized(req)) {
    try { await requireAdminAuth(req); }
    catch { return errResponse('Unauthorized', 401); }
  }

  let sentCount = 0;
  let failedCount = 0;

  // 1. Process due scheduled notifications
  const due = (
    await query`
      SELECT * FROM scheduled_notifications
      WHERE status='pending' AND send_at <= NOW()
      ORDER BY send_at ASC
      LIMIT 50
    `
  ).rows;

  for (const item of due) {
    try {
      const target = { type: String(item.target_type || 'all'), value: item.target_value ? String(item.target_value) : null };
      const safeUrl = normalizeUrl(item.url);
      const userIds = target.type === 'all' ? null : (
        target.value
          ? (await query`SELECT id FROM users WHERE LOWER(pimpinan)=LOWER(${target.value}) AND (role='user' OR role IS NULL)`).rows.map((r) => Number(r.id))
          : []
      );

      const pushPayload = {
        title: String(item.title || 'Notifikasi IPM'),
        body: String(item.message || ''),
        url: safeUrl,
        image: resolveNotificationImage(safeUrl),
      };

      if (item.save_in_app !== false) {
        const msg = `${item.title} - ${item.message}`.trim();
        if (target.type === 'all') {
          await query`INSERT INTO notifications (user_id, message) SELECT id, ${msg} FROM users WHERE role='user' OR role IS NULL`;
        } else if (Array.isArray(userIds) && userIds.length) {
          await rawQuery('INSERT INTO notifications (user_id, message) SELECT id, $1 FROM users WHERE id = ANY($2::int[])', [msg, userIds]);
        }
      }

      const pushResult = target.type === 'all' || userIds === null
        ? await sendToAll(pushPayload)
        : (Array.isArray(userIds) && userIds.length ? await sendToUsers(userIds, pushPayload) : { sent: 0, failed: 0 });

      await query`UPDATE scheduled_notifications SET status='sent', sent_at=NOW(), error=NULL WHERE id=${item.id}`;
      sentCount += Number(pushResult.sent || 0);
    } catch (e) {
      await query`UPDATE scheduled_notifications SET status='failed', error=${String((e as Error).message || e)} WHERE id=${item.id}`;
      failedCount++;
    }
  }

  // 2. Cleanup old in-app notifications (> 7 days)
  const cleanup = await query`DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '7 days'`;

  return okResponse({
    due: due.length,
    sent: sentCount,
    failed: failedCount,
    removedOldNotifications: cleanup.rowCount || 0,
    processedAt: new Date().toISOString(),
  });
}
