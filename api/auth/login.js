const { query } = require('../db');
const { json, parseJsonBody } = require('../_util');
const crypto = require('crypto');

function scryptHash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
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
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const ip = String((req.headers['x-forwarded-for'] || '').toString().split(',')[0] || req.socket?.remoteAddress || 'unknown');

    if (!username || !password) return json(res, 400, { status: 'error', message: 'Username & password wajib' });

    if (await tooManyFailures(username, ip)) return json(res, 429, { status: 'error', message: 'Too many failed attempts. Try again later.' });

    const user = (await query`SELECT id, username, nama_panjang, pimpinan, password_salt, password_hash, role FROM users WHERE LOWER(username)=${username}`).rows[0];
    
    let success = false;
    if (user) {
      const hash = await scryptHash(password, user.password_salt || '');
      if (hash === user.password_hash) {
        success = true;
      }
    }

    await query`INSERT INTO login_attempts (username, ip, attempted_at, success) VALUES (${username}, ${ip}, ${new Date().toISOString()}, ${success})`;

    if (!success) return json(res, 401, { status: 'error', message: 'Username atau password salah' });

    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari
    const role = user.role || 'user';
    await query`INSERT INTO sessions (user_id, token, role, expires_at) VALUES (${user.id}, ${token}, ${role}, ${expires.toISOString()})`;
    json(res, 200, { status: 'success', session: token, username: user.username, nama_panjang: user.nama_panjang, role });
  } catch (e) {
    try { console.error('auth/login error:', e); } catch {}
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
