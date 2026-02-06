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

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
    const body = parseJsonBody(req);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!username || !password) return json(res, 400, { status: 'error', message: 'Username & password wajib' });
    const user = (await query`SELECT id, username, nama_panjang, pimpinan, password_salt, password_hash, role FROM users WHERE LOWER(username)=${username}`).rows[0];
    if (!user) return json(res, 401, { status: 'error', message: 'Username atau password salah' });
    const hash = await scryptHash(password, user.password_salt || '');
    if (hash !== user.password_hash) return json(res, 401, { status: 'error', message: 'Username atau password salah' });
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari
    const role = user.role || 'user';
    await query`INSERT INTO sessions (user_id, token, role, expires_at) VALUES (${user.id}, ${token}, ${role}, ${expires.toISOString()})`;
    json(res, 200, { status: 'success', session: token, username: user.username, nama_panjang: user.nama_panjang, role });
  } catch (e) {
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
