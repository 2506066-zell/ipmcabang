const { Pool } = require('pg');

let _pool = null;

function getConnString() {
  const candidates = [
    process.env.IPM_DB_URL, // Custom override
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
  if (!url) throw new Error('Postgres connection string not configured. Please check DATABASE_URL or POSTGRES_URL env vars.');
  const u = String(url).trim().toLowerCase();
  if (!/^postgres(ql)?:\/\//.test(u)) throw new Error('Invalid POSTGRES_URL format.');
}

function getPool() {
  if (_pool) return _pool;
  
  const connectionString = getConnString();
  const config = {
    connectionString,
    ssl: { rejectUnauthorized: false }, // Necessary for Neon/Vercel Postgres
    connectionTimeoutMillis: 5000, // Fail fast after 5s
    idleTimeoutMillis: 30000,      // Close idle clients after 30s
    max: 10                        // Max clients in pool
  };

  _pool = new Pool(config);

  // Pool error handling
  _pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit process in serverless environment, just log it
  });

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
  
  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await pool.query(text, values);
      return { rows: result.rows };
    } catch (err) {
      lastError = err;
      const msg = (err && err.message) ? err.message : String(err);
      
      // Check for specific recoverable errors
      const isRecoverable = 
        msg.includes('connection') || 
        msg.includes('timeout') || 
        msg.includes('ECONNRESET');

      if (attempt < MAX_RETRIES && isRecoverable) {
        console.warn(`Database query failed (attempt ${attempt}/${MAX_RETRIES}). Retrying... Error: ${msg}`);
        await new Promise(res => setTimeout(res, 500 * attempt)); // Exponential backoff
        continue;
      }

      // Handle missing table/schema by trying to bootstrap
      if (/relation\s+".*"\s+does\s+not\s+exist/i.test(msg)) {
         try {
           console.log('Table not found, attempting to ensure schema...');
           // Circular dependency workaround: require here
           const { ensureSchema } = require('./_bootstrap');
           await ensureSchema();
           
           // Retry query once after schema creation
           const result2 = await pool.query(text, values);
           return { rows: result2.rows };
         } catch (e2) {
           throw new Error(`Database schema error: ${e2.message || e2}`);
         }
      }

      throw new Error(`Database error: ${msg}`);
    }
  }
  throw lastError;
}

function getConnHost() {
  const url = getConnString();
  const m = String(url).match(/@([^\/\?]+)(?:\/[\w-]+)?/);
  return m ? m[1] : '';
}

module.exports = { query, getConnHost };
