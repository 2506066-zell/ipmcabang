const { sql } = require('@vercel/postgres');

function requireEnv() {
  const url = process.env.POSTGRES_URL || '';
  if (!url) throw new Error('POSTGRES_URL not configured');
}

async function query(strings, ...values) {
  requireEnv();
  try {
    return await sql(strings, ...values);
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    throw new Error(`Database error: ${msg}`);
  }
}

module.exports = { sql, query };
