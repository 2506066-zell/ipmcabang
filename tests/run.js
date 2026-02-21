const assert = require('assert');

function fakeRes() {
  const headers = {};
  let code = 0;
  let body = '';
  return {
    setHeader(k, v) { headers[k] = v; },
    status(c) { code = c; return { send(b) { body = String(b || ''); } }; },
    get result() { return { code, headers, body: body ? JSON.parse(body) : {} }; }
  };
}

async function withMockedRouterHandlers(run) {
  const Module = require('module');
  const orig = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (id.endsWith('/_handler_auth') || id.endsWith('\\_handler_auth')) {
      return async (req, res) => res.status(200).send(JSON.stringify({ status: 'success', route: 'auth', action: req.query?.action || '' }));
    }
    if (id.endsWith('/_handler_admin') || id.endsWith('\\_handler_admin')) {
      return async (req, res) => res.status(200).send(JSON.stringify({ status: 'success', route: 'admin' }));
    }
    if (id.endsWith('/_handler_articles') || id.endsWith('\\_handler_articles')) {
      return async (req, res) => res.status(200).send(JSON.stringify({ status: 'success', route: 'articles' }));
    }
    if (id.endsWith('/_handler_materials') || id.endsWith('\\_handler_materials')) {
      return async (req, res) => res.status(200).send(JSON.stringify({ status: 'success', route: 'materials' }));
    }
    if (id.endsWith('/_handler_questions') || id.endsWith('\\_handler_questions')) {
      return async (req, res) => res.status(200).send(JSON.stringify({ status: 'success', route: 'questions' }));
    }
    if (id.endsWith('/_handler_results') || id.endsWith('\\_handler_results')) {
      return async (req, res) => res.status(200).send(JSON.stringify({ status: 'success', route: 'results' }));
    }
    if (id.endsWith('/_handler_users') || id.endsWith('\\_handler_users')) {
      return async (req, res) => res.status(200).send(JSON.stringify({ status: 'success', route: 'users' }));
    }
    if (id.endsWith('/_handler_push') || id.endsWith('\\_handler_push')) {
      return async (req, res) => res.status(200).send(JSON.stringify({ status: 'success', route: 'push' }));
    }
    return orig.apply(this, arguments);
  };
  try {
    await run();
  } finally {
    Module.prototype.require = orig;
  }
}

async function testUtilJson() {
  const { json } = require('../api/_util');
  const res = fakeRes();
  json(res, 200, { ok: true });
  const r = res.result;
  assert.strictEqual(r.code, 200);
  assert.strictEqual(r.headers['Content-Type'], 'application/json');
  assert.ok(typeof r.headers['ETag'] === 'string' && r.headers['ETag'].length > 0);
  assert.strictEqual(r.body.ok, true);
}

async function testIndexUsesQuerySegmentRewrite() {
  await withMockedRouterHandlers(async () => {
    delete require.cache[require.resolve('../api/index')];
    const handler = require('../api/index');
    const res = fakeRes();
    await handler(
      {
        method: 'POST',
        url: '/api/index?segment=auth&action=login',
        query: { segment: 'auth', action: 'login' },
        headers: { host: 'localhost' }
      },
      res
    );
    const r = res.result;
    assert.strictEqual(r.code, 200);
    assert.strictEqual(r.body.route, 'auth');
    assert.strictEqual(r.body.action, 'login');
  });
}

async function testIndexUnknownRoute404() {
  await withMockedRouterHandlers(async () => {
    delete require.cache[require.resolve('../api/index')];
    const handler = require('../api/index');
    const res = fakeRes();
    await handler(
      {
        method: 'POST',
        url: '/api/index?segment=unknown',
        query: { segment: 'unknown' },
        headers: { host: 'localhost' }
      },
      res
    );
    const r = res.result;
    assert.strictEqual(r.code, 404);
    assert.strictEqual(r.body.status, 'error');
  });
}

async function testAuthUnknownAction404() {
  const handler = require('../api/_handler_auth');
  const res = fakeRes();
  await handler({ method: 'POST', query: { action: 'nope' }, headers: {}, body: '{}' }, res);
  const r = res.result;
  assert.strictEqual(r.code, 404);
  assert.strictEqual(r.body.status, 'error');
}

async function testAuthLoginMissingFields400() {
  const handler = require('../api/_handler_auth');
  const res = fakeRes();
  await handler({ method: 'POST', query: { action: 'login' }, headers: {}, body: JSON.stringify({}) }, res);
  const r = res.result;
  assert.strictEqual(r.code, 400);
  assert.strictEqual(r.body.status, 'error');
}

async function testUploadRequiresAdminAuth() {
  const handler = require('../api/upload');
  const res = {
    headers: {},
    statusCode: 0,
    body: '',
    setHeader(k, v) { this.headers[k] = v; },
    end(b) { this.body = String(b || ''); }
  };
  await handler({ method: 'POST', headers: {}, body: '' }, res);
  assert.strictEqual(res.statusCode, 401);
  const payload = JSON.parse(res.body || '{}');
  assert.strictEqual(payload.status, 'error');
}

async function testUsersListRequiresSession() {
  const handler = require('../api/_handler_users');
  const res = fakeRes();
  await handler({ method: 'GET', query: { username: 'someone' }, headers: {}, body: '{}' }, res);
  const r = res.result;
  assert.strictEqual(r.code, 401);
  assert.strictEqual(r.body.status, 'error');
}

async function main() {
  const tests = [
    ['_util.json sets headers and body', testUtilJson],
    ['index supports vercel query segment rewrite', testIndexUsesQuerySegmentRewrite],
    ['index unknown segment returns 404', testIndexUnknownRoute404],
    ['auth unknown action returns 404', testAuthUnknownAction404],
    ['auth login missing fields returns 400', testAuthLoginMissingFields400],
    ['upload requires admin auth', testUploadRequiresAdminAuth],
    ['users endpoint requires session', testUsersListRequiresSession],
  ];

  let passed = 0;
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
