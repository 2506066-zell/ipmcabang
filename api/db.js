const { sql } = require('@vercel/postgres');
const { ensureSchema } = require('./_bootstrap');

function requireEnv() {
  const url = process.env.POSTGRES_URL || '';
  if (!url) throw new Error('POSTGRES_URL not configured');
  const u = String(url).toLowerCase();
  if (!u.includes('postgres://')) throw new Error('Invalid POSTGRES_URL');
}

async function query(strings, ...values) {
  requireEnv();
  try {
    return await sql(strings, ...values);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    if (/relation\s+".*"\s+does\s+not\s+exist/i.test(msg)) {
      try {
        await ensureSchema();
        return await sql(strings, ...values);
      } catch (e2) {
        const m2 = (e2 && e2.message) ? e2.message : String(e2);
        throw new Error(`Database error: ${m2}`);
      }
    }
    if (/404/.test(msg)) {
      throw new Error(`Database error: ${msg}. Periksa konfigurasi Vercel Postgres dan POSTGRES_URL di Project Settings.`);
    }
    throw new Error(`Database error: ${msg}`);
  }
}

module.exports = { sql, query };
