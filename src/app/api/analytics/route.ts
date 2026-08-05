import { query, rawQuery } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth';
import { errResponse, okResponse, getSearchParams, cleanString, parseBody } from '@/lib/utils';

// GET /api/analytics
export async function GET(req: Request): Promise<Response> {
  try { await requireAdminAuth(req); } catch { return errResponse('Unauthorized', 401); }

  const params = getSearchParams(req);
  const action = params.get('action');

  if (action === 'activityLogs') {
    const limit = Math.min(100, Number(params.get('limit') || 20));
    const rows = (
      await query`
        SELECT al.id, al.action, al.details, al.created_at, u.username AS admin_username
        FROM activity_logs al
        LEFT JOIN users u ON u.id = al.admin_id
        ORDER BY al.created_at DESC
        LIMIT ${limit}
      `
    ).rows;
    return okResponse({ logs: rows });
  }

  if (action === 'quizStats') {
    const [totalResults, avgScore, bySet] = await Promise.all([
      query`SELECT COUNT(*)::int AS total FROM results`,
      query`SELECT COALESCE(AVG(score), 0)::float AS avg FROM results`,
      query`SELECT quiz_set, COUNT(*)::int AS count, COALESCE(AVG(score), 0)::float AS avg_score FROM results GROUP BY quiz_set ORDER BY quiz_set`,
    ]);
    return okResponse({
      total_results: totalResults.rows[0]?.total || 0,
      avg_score: avgScore.rows[0]?.avg || 0,
      by_set: bySet.rows,
    });
  }

  if (action === 'attendanceStats') {
    const rooms = (
      await query`
        SELECT r.id, r.pimpinan,
               COUNT(DISTINCT e.id)::int AS total_events,
               COUNT(DISTINCT CASE WHEN e.status='active' THEN e.id END)::int AS active_events,
               COUNT(DISTINCT rec.id)::int AS total_records
        FROM attendance_rooms r
        LEFT JOIN attendance_events e ON e.room_id = r.id
        LEFT JOIN attendance_records rec ON rec.event_id = e.id
        GROUP BY r.id
        ORDER BY r.pimpinan
      `
    ).rows;
    return okResponse({ rooms });
  }

  // General dashboard stats
  const [userCount, questionCount, materialCount, subscriptionCount] = await Promise.all([
    query`SELECT COUNT(*)::int AS c FROM users WHERE role='user' OR role IS NULL`,
    query`SELECT COUNT(*)::int AS c FROM questions WHERE active=true`,
    query`SELECT COUNT(*)::int AS c FROM materials WHERE active=true`,
    query`SELECT COUNT(*)::int AS c FROM push_subscriptions`,
  ]);

  return okResponse({
    users: userCount.rows[0]?.c || 0,
    questions: questionCount.rows[0]?.c || 0,
    materials: materialCount.rows[0]?.c || 0,
    push_subscribers: subscriptionCount.rows[0]?.c || 0,
  });
}
