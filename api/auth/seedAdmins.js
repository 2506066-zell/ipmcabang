const { query } = require('../_db');
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
    const admins = Array.isArray(body.admins) ? body.admins : [];
    if (!admins.length) return json(res, 400, { status: 'error', message: 'Payload kosong' });
    const cntRow = (await query`SELECT COUNT(*)::int AS c FROM users WHERE role='admin'`).rows[0];
    const c = typeof cntRow?.c === 'number' ? cntRow.c : Number(cntRow?.c || 0);
    if (c > 0) return json(res, 403, { status: 'error', message: 'Admin sudah ada' });
    const created = [];
    for (const item of admins) {
      const username = String(item?.username || '').trim().toLowerCase();
      const password = String(item?.password || '');
      if (!username || !password) continue;
      let user = (await query`SELECT id, username, password_salt, password_hash, role FROM users WHERE LOWER(username)=${username}`).rows[0];
      if (!user) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = await scryptHash(password, salt);
        const ins = await query`INSERT INTO users (username, password_salt, password_hash, role) VALUES (${username}, ${salt}, ${hash}, ${'admin'}) RETURNING id, username`;
        user = ins.rows[0];
      } else {
        const hash = await scryptHash(password, user.password_salt || '');
        if (hash !== user.password_hash) {
          return json(res, 401, { status: 'error', message: `Password salah untuk ${username}` });
        }
        if (String(user.role || '') !== 'admin') {
          await query`UPDATE users SET role=${'admin'} WHERE id=${user.id}`;
        }
      }
      const token = crypto.randomBytes(24).toString('hex');
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await query`INSERT INTO sessions (user_id, token, role, expires_at) VALUES (${user.id}, ${token}, ${'admin'}, ${expires.toISOString()})`;
      created.push({ username, session: token });
    }
    json(res, 200, { status: 'success', accounts: created });
  } catch (e) {
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
