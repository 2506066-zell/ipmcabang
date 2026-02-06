const { sql } = require('@vercel/postgres');

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
    if (/404/.test(msg)) {
      throw new Error(`Database error: ${msg}. Periksa konfigurasi Vercel Postgres dan POSTGRES_URL di Project Settings.`);
    }
    throw new Error(`Database error: ${msg}`);
  }
}

module.exports = { sql, query };
