const { query } = require('./_db');
const { json, parseJsonBody } = require('./_util');
const crypto = require('crypto');

// --- Helpers ---
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

// --- Handlers ---

async function handleLogin(req, res) {
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
  return json(res, 200, { status: 'success', session: token, username: user.username, nama_panjang: user.nama_panjang, role });
}

async function handleRegister(req, res) {
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
  return json(res, 201, { status: 'success', user: ins.rows[0] });
}

async function handlePromoteAdmin(req, res) {
  if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
  const body = parseJsonBody(req);
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!username || !password) return json(res, 400, { status: 'error', message: 'Username & password wajib' });
  const cntRow = (await query`SELECT COUNT(*)::int AS c FROM users WHERE role='admin'`).rows[0];
  const c = typeof cntRow?.c === 'number' ? cntRow.c : Number(cntRow?.c || 0);
  if (c > 0) return json(res, 403, { status: 'error', message: 'Admin sudah ada' });
  const user = (await query`SELECT id, username, password_salt, password_hash FROM users WHERE LOWER(username)=${username}`).rows[0];
  if (!user) return json(res, 404, { status: 'error', message: 'User tidak ditemukan' });
  const hash = await scryptHash(password, user.password_salt || '');
  if (hash !== user.password_hash) return json(res, 401, { status: 'error', message: 'Password salah' });
  await query`UPDATE users SET role=${'admin'} WHERE id=${user.id}`;
  const token = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query`INSERT INTO sessions (user_id, token, role, expires_at) VALUES (${user.id}, ${token}, ${'admin'}, ${expires.toISOString()})`;
  return json(res, 200, { status: 'success', session: token, username: user.username, role: 'admin' });
}

async function handleSeedAdmins(req, res) {
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
  return json(res, 200, { status: 'success', accounts: created });
}

// --- Main Handler ---

module.exports = async (req, res) => {
  try {
    const action = req.query.action;
    
    switch (action) {
      case 'login':
        return await handleLogin(req, res);
      case 'register':
        return await handleRegister(req, res);
      case 'promoteAdmin':
        return await handlePromoteAdmin(req, res);
      case 'seedAdmins':
        return await handleSeedAdmins(req, res);
      case 'adminLogin':
        return json(res, 410, { status: 'error', message: 'Endpoint tidak digunakan. Pakai /api/auth/login atau /api/auth/promoteAdmin' });
      default:
        return json(res, 404, { status: 'error', message: `Unknown action: ${action}` });
    }
  } catch (e) {
    try { console.error(`auth_handler error (${req.query.action}):`, e); } catch {}
    return json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
