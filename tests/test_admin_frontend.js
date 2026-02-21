const fs = require('fs');
const path = require('path');
const assert = require('assert');

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

function mustContain(content, pattern, label) {
  assert.ok(content.includes(pattern), `Missing expected pattern: ${label}`);
}

function mustNotContain(content, pattern, label) {
  assert.ok(!content.includes(pattern), `Unexpected pattern present: ${label}`);
}

function main() {
  console.log('Running Frontend Contract Tests...');

  const adminJs = read('admin/admin.js');
  const materialsJs = read('admin/materials.js');

  mustContain(adminJs, "/api/auth/login", 'admin login endpoint');
  mustContain(adminJs, "/api/admin/questions?action=updateSchedule", 'schedule update endpoint');
  mustContain(adminJs, "/api/admin/users?action=extended", 'users extended endpoint');
  mustContain(adminJs, "init.credentials = 'include';", 'fetch uses cookie credentials');

  mustContain(materialsJs, "xhr.open('POST', '/api/upload')", 'materials upload endpoint');
  mustNotContain(materialsJs, "|| 'dummy'", 'legacy dummy auth token fallback');

  console.log('PASS: Frontend endpoint contracts are valid');
}

try {
  main();
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
