const { sql } = require('@vercel/postgres');

function requireEnv() {
  const url = process.env.POSTGRES_URL || '';
  if (!url) throw new Error('POSTGRES_URL not configured');
}

async function query(strings, ...values) {
  requireEnv();
  return await sql(strings, ...values);
}

module.exports = { sql, query };
