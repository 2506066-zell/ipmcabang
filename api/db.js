const { Pool } = require('pg');
const { ensureSchema } = require('./_bootstrap');

let _pool = null;

function requireEnv() {
  const url = process.env.POSTGRES_URL || '';
  if (!url) throw new Error('POSTGRES_URL not configured');
  const u = String(url).toLowerCase();
  if (!u.startsWith('postgres://') && !u.startsWith('postgresql://')) throw new Error('Invalid POSTGRES_URL');
}

function getPool() {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
  return _pool;
}

function buildParameterizedQuery(strings, values) {
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }
  return text;
}

async function query(strings, ...values) {
  requireEnv();
  const pool = getPool();
  const text = buildParameterizedQuery(strings, values);
  try {
    const result = await pool.query(text, values);
    return { rows: result.rows };
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    if (/relation\s+".*"\s+does\s+not\s+exist/i.test(msg)) {
      try {
        await ensureSchema();
        const result2 = await pool.query(text, values);
        return { rows: result2.rows };
      } catch (e2) {
        const m2 = (e2 && e2.message) ? e2.message : String(e2);
        throw new Error(`Database error: ${m2}`);
      }
    }
    throw new Error(`Database error: ${msg}`);
  }
}

module.exports = { query };
