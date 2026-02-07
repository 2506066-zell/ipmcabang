const { query, getConnHost } = require('./_db');
const { json, cacheHeaders } = require('./_util');
const { ensureSchema } = require('./_bootstrap');
const { requireAdminAuth } = require('./_auth');

// --- Handlers ---

async function handleDbHealth(req, res) {
  if (req.method !== 'GET') return json(res, 405, { status: 'error', message: 'Method not allowed' });
  const now = (await query`SELECT NOW() AS now`).rows[0]?.now;
  const host = getConnHost();
  return json(res, 200, { status: 'success', db: 'ok', host, now });
}

async function handleHealth(req, res) {
  return json(res, 200, { status: 'success', ok: true, ts: Date.now() }, cacheHeaders(10));
}

async function handleMigrate(req, res) {
  if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
  
  await ensureSchema();

  const qcRaw = (await query`SELECT COUNT(*)::int AS c FROM questions`).rows[0]?.c;
  const qc = typeof qcRaw === 'number' ? qcRaw : Number(qcRaw || 0);
  if (qc === 0) {
    await query`INSERT INTO questions (question, options, correct_answer, active, category, quiz_set) VALUES (
      ${'Apa kepanjangan IPM?'}, ${ { a: 'Ikatan Pelajar Muhammadiyah', b: 'Ikatan Pemuda Muslim', c: 'Ikatan Pemuda Merdeka', d: 'Ikatan Pelajar Merdeka' } }, ${'a'}, ${true}, ${'Organisasi'}, ${1}
    )`;
    await query`INSERT INTO questions (question, options, correct_answer, active, category, quiz_set) VALUES (
      ${'Hari jadi IPM?'}, ${ { a: '5 Mei 1961', b: '5 Mei 1962', c: '5 Juni 1961', d: '5 Juni 1962' } }, ${'a'}, ${true}, ${'Sejarah'}, ${1}
    )`;
  }

  const adminU = String((process.env.ADMIN_USERNAME || '')).trim().toLowerCase();
  const adminP = String((process.env.ADMIN_PASSWORD || ''));
  if (adminU && adminP) {
    const exists = (await query`SELECT id FROM users WHERE LOWER(username)=${adminU}`).rows[0];
    if (!exists) {
      const crypto = require('crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      const dk = crypto.scryptSync(adminP, salt, 64);
      const hash = dk.toString('hex');
      await query`INSERT INTO users (username, nama_panjang, pimpinan, password_salt, password_hash, role) VALUES (${adminU}, ${'Administrator'}, ${'IPM'}, ${salt}, ${hash}, ${'admin'})`;
    }
  }
  return json(res, 200, { status: 'success' });
}

async function handleResetSet(req, res) {
  if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
  try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
  const body = JSON.parse(req.body || '{}');
  const quiz_set = Number(body.quiz_set || 0);
  if (!quiz_set) return json(res, 400, { status: 'error', message: 'Missing quiz_set' });
  await query`DELETE FROM results WHERE quiz_set=${quiz_set}`;
  return json(res, 200, { status: 'success' });
}

// --- Main Handler ---

module.exports = async (req, res) => {
  try {
    const action = req.query.action;
    
    switch (action) {
      case 'dbHealth':
        return await handleDbHealth(req, res);
      case 'health':
        return await handleHealth(req, res);
      case 'migrate':
        return await handleMigrate(req, res);
      case 'resetSet':
        return await handleResetSet(req, res);
      default:
        return json(res, 404, { status: 'error', message: `Unknown action: ${action}` });
    }
  } catch (e) {
    try { console.error(`system_handler error (${req.query.action}):`, e); } catch {}
    return json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
