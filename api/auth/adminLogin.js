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
  json(res, 410, { status: 'error', message: 'Endpoint tidak digunakan. Pakai /api/auth/login atau /api/auth/promoteAdmin' });
};
