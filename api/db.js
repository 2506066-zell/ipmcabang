const { Pool } = require('pg');
const { ensureSchema } = require('./_bootstrap');

let _pool = null;

function getConnString() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.SUPABASE_DB_URL,
    process.env.SUPABASE_POSTGRES_URL,
    process.env.SUPABASE_PGBOUNCER_URL,
  ].filter(Boolean);
  // Prefer ones with proper scheme
  const withScheme = candidates.find(u => /^postgres(ql)?:\/\//i.test(String(u)));
  if (withScheme) return withScheme;
  // Fallback: if we have something like user:pass@host:port/db, prepend scheme
  const any = candidates[0] || '';
  if (any && /@/.test(any)) return `postgresql://${any}`;
  return any;
}

function requireEnv() {
  const url = getConnString();
  if (!url) throw new Error('Postgres connection string not configured');
  const u = String(url).toLowerCase();
  if (!/^postgres(ql)?:\/\//.test(u)) throw new Error('Invalid POSTGRES_URL');
}

function getPool() {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: getConnString(), ssl: { rejectUnauthorized: false } });
  // Ensure SSL is enabled even if connection string doesn't specify it explicitly
  if (!_pool.options.ssl) {
    _pool.options.ssl = { rejectUnauthorized: false };
  }
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

function getConnHost() {
  const url = getConnString();
  const m = String(url).match(/@([^\/\?]+)(?:\/[\w-]+)?/);
  return m ? m[1] : '';
}

module.exports = { query, getConnHost };
