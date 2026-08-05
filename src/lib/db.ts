import { Pool, QueryResult } from 'pg';

let _pool: Pool | null = null;

function getConnString(): string {
  const candidates = [
    process.env.IPM_DB_URL,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_PRISMA_URL,
    process.env.NEON_DATABASE_URL,
    process.env.SUPABASE_DB_URL,
  ].filter(Boolean) as string[];

  const withScheme = candidates.find((u) => /^postgres(ql)?:\/\//i.test(u));
  if (withScheme) return withScheme;

  const any = candidates[0] || '';
  if (any && /@/.test(any)) return `postgresql://${any}`;
  return any;
}

function requireEnv(): void {
  const url = getConnString();
  if (!url) {
    throw new Error(
      'Postgres connection string not configured. Set IPM_DB_URL, DATABASE_URL, or POSTGRES_URL.'
    );
  }
  if (!/^postgres(ql)?:\/\//i.test(url.trim())) {
    throw new Error('Invalid POSTGRES_URL format.');
  }
}

function getPool(): Pool {
  if (_pool) return _pool;

  const connectionString = getConnString();
  _pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10,
  });

  _pool.on('error', (err) => {
    console.error('Unexpected PG pool error:', err);
  });

  return _pool;
}

// Template literal tag for parameterized queries — safe from SQL injection
export async function query(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  requireEnv();
  const pool = getPool();

  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result: QueryResult = await pool.query(text, values as unknown[]);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(msg);

      const isRecoverable =
        msg.includes('connection') || msg.includes('timeout') || msg.includes('ECONNRESET');

      if (attempt < MAX_RETRIES && isRecoverable) {
        console.warn(`DB query failed (attempt ${attempt}/${MAX_RETRIES}). Retrying... Error: ${msg}`);
        await new Promise((res) => setTimeout(res, 500 * attempt));
        continue;
      }

      if (/relation\s+".*"\s+does\s+not\s+exist/i.test(msg)) {
        try {
          const { ensureSchema } = await import('./bootstrap');
          await ensureSchema();
          const result2 = await pool.query(text, values as unknown[]);
          return { rows: result2.rows, rowCount: result2.rowCount ?? 0 };
        } catch (e2: unknown) {
          const e2msg = e2 instanceof Error ? e2.message : String(e2);
          throw new Error(`Database schema error: ${e2msg}`);
        }
      }

      throw new Error(`Database error: ${msg}`);
    }
  }

  throw lastError!;
}

// For dynamic SQL (e.g., UPDATE with variable fields)
export async function rawQuery(
  text: string,
  params: unknown[] = []
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  requireEnv();
  const pool = getPool();
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result: QueryResult = await pool.query(text, params);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(msg);

      const isRecoverable =
        msg.includes('connection') || msg.includes('timeout') || msg.includes('ECONNRESET');
      if (attempt < MAX_RETRIES && isRecoverable) {
        await new Promise((res) => setTimeout(res, 500 * attempt));
        continue;
      }
      if (/relation\s+".*"\s+does\s+not\s+exist/i.test(msg)) {
        try {
          const { ensureSchema } = await import('./bootstrap');
          await ensureSchema();
          const result2 = await pool.query(text, params);
          return { rows: result2.rows, rowCount: result2.rowCount ?? 0 };
        } catch (e2: unknown) {
          const e2msg = e2 instanceof Error ? e2.message : String(e2);
          throw new Error(`Database schema error: ${e2msg}`);
        }
      }
      throw new Error(`Database error: ${msg}`);
    }
  }
  throw lastError!;
}

export function getConnHost(): string {
  const url = getConnString();
  const m = url.match(/@([^\/\?]+)(?:\/[\w-]+)?/);
  return m ? m[1] : '';
}
