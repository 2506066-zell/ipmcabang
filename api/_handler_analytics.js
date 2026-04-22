const crypto = require('crypto');
const { query } = require('./_db');
const { json, parseJsonBody } = require('./_util');
const { ensureSchema } = require('./_bootstrap');
const { requireAdminAuth, getSessionUser } = require('./_auth');

function getClientIp(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.socket?.remoteAddress || '').trim() || '';
}

function hashIp(ip) {
  const salt = String(process.env.ANALYTICS_SALT || 'ipm-panawuan-analytics-v1');
  if (!ip) return null;
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

function isBotUserAgent(ua) {
  const s = String(ua || '').toLowerCase();
  if (!s) return false;
  return /(bot|spider|crawler|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|bingpreview|preview)/i.test(s);
}

function sanitizeText(value, maxLen = 400) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function normalizePath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '/';
  // Avoid accidentally storing full URLs.
  try {
    const url = new URL(raw, 'http://local.app');
    return sanitizeText(`${url.pathname}${url.search}` || '/', 500);
  } catch {
    return sanitizeText(raw.startsWith('/') ? raw : `/${raw}`, 500);
  }
}

async function handleTrack(req, res) {
  // Respect DNT when present.
  const dnt = String(req.headers?.dnt || '').trim();
  if (dnt === '1') return json(res, 204, { ok: true, skipped: 'dnt' });

  const ua = sanitizeText(req.headers?.['user-agent'], 600);
  if (isBotUserAgent(ua)) return json(res, 204, { ok: true, skipped: 'bot' });

  const user = await getSessionUser(req);
  const body = parseJsonBody(req) || {};

  const eventName = sanitizeText(body.event_name || body.event || 'pageview', 80).toLowerCase();
  const path = normalizePath(body.path || body.pathname || '/');
  const title = sanitizeText(body.title || '', 200) || null;
  const referrer = sanitizeText(body.referrer || '', 500) || null;
  const sessionId = sanitizeText(body.session_id || '', 120) || null;

  const ipHash = hashIp(getClientIp(req));
  const props = body.props && typeof body.props === 'object' ? body.props : {};

  await query`
    INSERT INTO analytics_events (event_name, path, title, referrer, user_id, session_id, ip_hash, ua, props, created_at)
    VALUES (${eventName}, ${path}, ${title}, ${referrer}, ${user ? Number(user.id) : null}, ${sessionId}, ${ipHash}, ${ua || null}, ${props}, NOW())
  `;

  return json(res, 200, { status: 'success' });
}

function parseDays(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), 1), 365);
}

async function handleAdminSummary(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const days = parseDays(req.query?.days, 30);
  const rows = (
    await query`
      SELECT
        COUNT(*)::int AS events,
        COUNT(*) FILTER (WHERE event_name='pageview')::int AS pageviews,
        COUNT(DISTINCT ip_hash)::int AS unique_visitors,
        COUNT(DISTINCT session_id)::int AS sessions
      FROM analytics_events
      WHERE created_at >= NOW() - (${days} || ' days')::interval
    `
  ).rows[0];

  const topPages = (
    await query`
      SELECT path, COUNT(*)::int AS pageviews
      FROM analytics_events
      WHERE created_at >= NOW() - (${days} || ' days')::interval
        AND event_name='pageview'
      GROUP BY path
      ORDER BY pageviews DESC, path ASC
      LIMIT 12
    `
  ).rows;

  const daily = (
    await query`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
             COUNT(*) FILTER (WHERE event_name='pageview')::int AS pageviews,
             COUNT(DISTINCT ip_hash)::int AS visitors
      FROM analytics_events
      WHERE created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY 1
      ORDER BY day ASC
    `
  ).rows;

  return json(res, 200, {
    status: 'success',
    summary: {
      days,
      pageviews: Number(rows?.pageviews || 0),
      sessions: Number(rows?.sessions || 0),
      unique_visitors: Number(rows?.unique_visitors || 0),
      events: Number(rows?.events || 0)
    },
    top_pages: topPages.map((r) => ({ path: r.path, pageviews: Number(r.pageviews || 0) })),
    daily: daily.map((r) => ({ day: r.day, pageviews: Number(r.pageviews || 0), visitors: Number(r.visitors || 0) }))
  });
}

module.exports = async (req, res) => {
  await ensureSchema();
  req.query = req.query || {};
  const action = String(req.query.action || '').trim();
  const pathname = new URL(req.url || '/api/analytics', `http://${req.headers?.host || 'localhost'}`).pathname;
  const isAdminRoute = pathname.includes('/api/admin/analytics');

  if (!isAdminRoute) {
    if (req.method === 'POST' && action === 'track') return await handleTrack(req, res);
    return json(res, 404, { status: 'error', message: `Unknown action: ${action || 'none'}` });
  }

  if (req.method === 'GET' && action === 'summary') return await handleAdminSummary(req, res);
  return json(res, 404, { status: 'error', message: `Unknown action: ${action || 'none'}` });
};

