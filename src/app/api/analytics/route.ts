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

// POST /api/analytics?action=track
export async function POST(req: Request): Promise<Response> {
  const params = getSearchParams(req);
  if (params.get('action') === 'track') {
    const dnt = req.headers.get('dnt') || '';
    if (dnt === '1') return new Response(null, { status: 204 });

    const body = await parseBody(req);
    const eventName = cleanString(body.event_name || body.event || 'pageview').toLowerCase();
    const path = cleanString(body.path || body.pathname || '/');
    const title = cleanString(body.title || '') || null;
    const referrer = cleanString(body.referrer || '') || null;
    const sessionId = cleanString(body.session_id || '') || null;
    
    // Simplistic tracking insert (without ip hashing to save time, or we can use a static hash for now)
    const ua = cleanString(req.headers.get('user-agent') || '');
    if (ua.match(/(bot|spider|crawler|slurp|whatsapp|telegrambot|discordbot)/i)) {
      return new Response(null, { status: 204 });
    }

    try {
      await query`
        INSERT INTO analytics_events (event_name, path, title, referrer, session_id, ua, props, created_at)
        VALUES (${eventName}, ${path}, ${title}, ${referrer}, ${sessionId}, ${ua}, ${JSON.stringify(body.props || {})}, NOW())
      `;
    } catch (e) {
      console.warn('Analytics track error:', e);
    }
    
    return okResponse({ status: 'success' });
  }
  
  return errResponse('Unknown action', 404);
}
