const assert = require('assert');

function fakeRes() {
  const headers = {};
  let code = 0;
  let body = '';
  return {
    setHeader(k, v) { headers[k] = v; },
    status(c) { code = c; return { send(b) { body = String(b || ''); }, json(b) { body = JSON.stringify(b || {}); } }; },
    get result() { return { code, headers, body: body ? JSON.parse(body) : {} }; }
  };
}

async function withMocks(run, opts = {}) {
  const Module = require('module');
  const orig = Module.prototype.require;
  const calls = [];

  Module.prototype.require = function(id) {
    if (id.endsWith('/_db') || id.endsWith('\\_db')) {
      return {
        query: async (strings, ...values) => {
          const sql = String(strings && strings[0] || '').trim();
          calls.push({ kind: 'query', sql, values });

          if (/SELECT u\.id, u\.username, u\.email/i.test(sql)) {
            return { rows: [{ id: 1, username: 'u1', email: 'u1@test.local', role: 'user', total_quizzes: 2, avg_score: 88.5 }] };
          }
          if (/INSERT INTO users/i.test(sql)) {
            return { rows: [{ id: 99, username: values[0] || 'newuser' }], rowCount: 1 };
          }
          if (/SELECT id, message, is_read, created_at FROM notifications/i.test(sql)) {
            return { rows: [] };
          }
          return { rows: [], rowCount: 1 };
        },
        rawQuery: async (sql) => {
          const text = String(sql || '');
          calls.push({ kind: 'rawQuery', sql: text, values: [] });
          if (/COUNT\(\*\)::int as total FROM questions/i.test(text)) {
            return { rows: [{ total: 2 }], rowCount: 1 };
          }
          if (/SELECT \* FROM questions/i.test(text)) {
            return { rows: [{ id: 1, question: 'Q1', active: true }, { id: 2, question: 'Q2', active: false }], rowCount: 2 };
          }
          return { rows: [], rowCount: 0 };
        }
      };
    }
    if (id.endsWith('/_auth') || id.endsWith('\\_auth')) {
      return {
        requireAdminAuth: async () => ({ id: 1, role: 'admin' }),
        getSessionUser: async () => opts.sessionUser || null
      };
    }
    return orig.apply(this, arguments);
  };

  try {
    await run(calls);
  } finally {
    Module.prototype.require = orig;
  }
}

async function testUsersExtended() {
  await withMocks(async () => {
    delete require.cache[require.resolve('../api/_handler_users.js')];
    const handler = require('../api/_handler_users.js');
    const res = fakeRes();
    await handler({ method: 'GET', query: { action: 'extended' }, headers: {} }, res);
    const r = res.result;
    assert.strictEqual(r.code, 200);
    assert.strictEqual(r.body.status, 'success');
    assert.strictEqual(Array.isArray(r.body.users), true);
  }, { sessionUser: { id: 1, username: 'admin', role: 'admin' } });
}

async function testUsersCreate() {
  await withMocks(async (calls) => {
    delete require.cache[require.resolve('../api/_handler_users.js')];
    const handler = require('../api/_handler_users.js');
    const res = fakeRes();
    await handler({
      method: 'POST',
      query: {},
      headers: {},
      body: { username: 'newuser', password: 'pass123', role: 'user' }
    }, res);
    const r = res.result;
    assert.strictEqual(r.code, 201);
    assert.strictEqual(r.body.status, 'success');

    const insertCall = calls.find(c => c.kind === 'query' && /INSERT INTO users/i.test(c.sql));
    assert.ok(insertCall, 'INSERT users query harus dipanggil');
    const salt = String(insertCall.values[1] || '');
    const hash = String(insertCall.values[2] || '');
    assert.ok(salt.length >= 16, 'Salt harus terisi');
    assert.ok(hash.length >= 64, 'Hash harus terisi');
  }, { sessionUser: { id: 1, username: 'admin', role: 'admin' } });
}

async function testAdminListQuestions() {
  await withMocks(async () => {
    delete require.cache[require.resolve('../api/_handler_admin.js')];
    const handler = require('../api/_handler_admin.js');
    const res = fakeRes();
    await handler({ method: 'GET', query: { action: 'listQuestions' }, headers: {}, body: {} }, res);
    const r = res.result;
    assert.strictEqual(r.code, 200);
    assert.strictEqual(r.body.status, 'success');
    assert.strictEqual(r.body.questions.length, 2);
  }, { sessionUser: { id: 1, username: 'admin', role: 'admin' } });
}

async function testScheduleValidation() {
  await withMocks(async () => {
    delete require.cache[require.resolve('../api/_handler_admin.js')];
    const handler = require('../api/_handler_admin.js');
    const res = fakeRes();
    await handler({
      method: 'POST',
      query: { action: 'updateSchedule' },
      headers: {},
      body: { title: 'Bad', start_time: '2026-01-03T00:00:00Z', end_time: '2026-01-02T00:00:00Z' }
    }, res);
    const r = res.result;
    assert.strictEqual(r.code, 400);
    assert.strictEqual(r.body.status, 'error');
  }, { sessionUser: { id: 1, username: 'admin', role: 'admin' } });
}

async function main() {
  const tests = [
    ['users extended returns aggregated list', testUsersExtended],
    ['users create stores hashed password', testUsersCreate],
    ['admin listQuestions includes active and inactive', testAdminListQuestions],
    ['schedule validation rejects invalid range', testScheduleValidation],
  ];

  let passed = 0;
  console.log('Running Admin Logic Tests...');
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log('PASS:', name);
      passed++;
    } catch (e) {
      console.error('FAIL:', name, e.message);
    }
  }

  console.log(`Result: ${passed}/${tests.length} passed`);
  if (passed !== tests.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
