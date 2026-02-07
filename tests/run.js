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
async function testIndexInvalidMethod() {
  const handler = require('../api/index');
  const res = fakeRes();
  await handler({ method: 'GET', body: '{}' }, res);
  const r = res.result;
  assert.strictEqual(r.code, 405);
  assert.strictEqual(r.body.status, 'error');
}
async function mockDb() {
  const Module = require('module');
  const orig = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (id.endsWith('/_db') || id.endsWith('\\_db')) {
      return {
        query: async () => ({ rows: [{ c: 0 }] })
      };
    }
    return orig.apply(this, arguments);
  };
  return () => { Module.prototype.require = orig; };
}
async function testAdminLoginAuthConfigRequired() {
  const restore = await mockDb();
  delete require.cache[require.resolve('../api/auth/adminLogin.js')];
  const handler = require('../api/auth/adminLogin.js');
  const res = fakeRes();
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
  await handler({ method:'POST', headers:{}, body: JSON.stringify({ username:'x', password:'y' }) }, res);
  const r = res.result;
  assert.strictEqual(r.code, 500);
  assert.strictEqual(r.body.status, 'error');
  restore();
}
async function testAdminLoginWrongCreds() {
  const restore = await mockDb();
  delete require.cache[require.resolve('../api/auth/adminLogin.js')];
  const handler = require('../api/auth/adminLogin.js');
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'secret';
  const res = fakeRes();
  await handler({ method:'POST', headers:{}, body: JSON.stringify({ username:'wrong', password:'creds' }) }, res);
  const r = res.result;
  assert.strictEqual(r.code, 401);
  assert.strictEqual(r.body.status, 'error');
  restore();
}
async function testAdminLoginSuccess() {
  const restore = await mockDb();
  delete require.cache[require.resolve('../api/auth/adminLogin.js')];
  const handler = require('../api/auth/adminLogin.js');
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'secret';
  const res = fakeRes();
  await handler({ method:'POST', headers:{}, body: JSON.stringify({ username:'admin', password:'secret' }) }, res);
  const r = res.result;
  assert.strictEqual(r.code, 200);
  assert.strictEqual(r.body.status, 'success');
  assert.ok(typeof r.body.session === 'string' && r.body.session.length > 0);
  restore();
}
async function main() {
  const tests = [
    ['_util.json sets headers and body', testUtilJson],
    ['index invalid method 405', testIndexInvalidMethod],
    ['adminLogin requires admin env', testAdminLoginAuthConfigRequired],
    ['adminLogin wrong creds', testAdminLoginWrongCreds],
    ['adminLogin success', testAdminLoginSuccess],
  ];
  let passed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('PASS:', name); passed++; }
    catch (e) { console.error('FAIL:', name, e.message); }
  }
  console.log(`Result: ${passed}/${tests.length} passed`);
  if (passed !== tests.length) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
