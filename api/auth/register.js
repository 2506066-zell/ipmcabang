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
    const nama_panjang = body.nama_panjang ? String(body.nama_panjang) : null;
    const pimpinan = body.pimpinan ? String(body.pimpinan) : null;
    if (!username || !password) return json(res, 400, { status: 'error', message: 'Username & password wajib' });
    const existing = (await query`SELECT id FROM users WHERE LOWER(username)=${username}`).rows[0];
    if (existing) return json(res, 409, { status: 'error', message: 'Username sudah terpakai' });
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scryptHash(password, salt);
    const ins = await query`INSERT INTO users (username, nama_panjang, pimpinan, password_salt, password_hash) VALUES (${username}, ${nama_panjang}, ${pimpinan}, ${salt}, ${hash}) RETURNING id, username, nama_panjang, pimpinan`;
    json(res, 201, { status: 'success', user: ins.rows[0] });
  } catch (e) {
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
