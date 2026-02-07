const { query } = require('../_db');
const { json, parseJsonBody } = require('../_util');
const crypto = require('crypto');

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

async function tooManyFailures(username, ip) {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const row = (await query`SELECT COUNT(*)::int AS c FROM login_attempts WHERE success=false AND attempted_at > ${since} AND (LOWER(username)=${String(username||'').toLowerCase()} OR ip=${ip})`).rows[0];
  const c = typeof row?.c === 'number' ? row.c : Number(row?.c || 0);
  return c >= 5;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
    const body = parseJsonBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const ip = String((req.headers['x-forwarded-for'] || '').toString().split(',')[0] || req.socket?.remoteAddress || 'unknown');

    const ADMIN_USERNAME = String((process.env.ADMIN_USERNAME || '')).trim();
    const ADMIN_PASSWORD = String((process.env.ADMIN_PASSWORD || '')).trim();
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return json(res, 500, { status: 'error', message: 'Admin credentials not configured' });

    if (await tooManyFailures(username, ip)) return json(res, 429, { status: 'error', message: 'Too many failed attempts. Try again later.' });

    const okUser = timingSafeEqual(username, ADMIN_USERNAME);
    const okPass = timingSafeEqual(password, ADMIN_PASSWORD);
    const success = okUser && okPass;
    await query`INSERT INTO login_attempts (username, ip, attempted_at, success) VALUES (${username.toLowerCase()}, ${ip}, ${new Date().toISOString()}, ${success})`;
    if (!success) return json(res, 401, { status: 'error', message: 'Invalid credentials' });

    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari
    await query`INSERT INTO sessions (user_id, token, role, expires_at) VALUES (${null}, ${token}, ${'admin'}, ${expires.toISOString()})`;
    json(res, 200, { status: 'success', session: token, role: 'admin' });
  } catch (e) {
    try { console.error('auth/adminLogin error:', e); } catch {}
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
