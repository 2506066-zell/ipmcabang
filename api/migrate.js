const { query } = require('./_db');
const { json } = require('./_util');
const { ensureSchema } = require('./_bootstrap');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
    
    // Use the shared schema definition
    await ensureSchema();

    // Seeding logic remains here as it is specific to migration/initial setup
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

    // seed admin user from env if configured
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
    json(res, 200, { status: 'success' });
  } catch (e) {
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
