const assert = require('assert');

// Mock helpers
function fakeRes() {
  const headers = {};
  let code = 0;
  let body = '';
  return {
    setHeader(k, v) { headers[k] = v; },
    status(c) { code = c; return { send(b) { body = String(b || ''); }, json(b) { body = JSON.stringify(b); } }; },
    get result() { return { code, headers, body: body ? JSON.parse(body) : {} }; }
  };
}

function fakeReq(method, query, body, user) {
  return {
    method,
    query: query || {},
    body: body || {},
    user: user || { role: 'admin', username: 'admin_test' } // Mock auth middleware result
  };
}

// Mock DB
async function mockDb(mockData = {}) {
  const Module = require('module');
  const orig = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (id.endsWith('/_db') || id.endsWith('\\_db')) {
      return {
        query: async (strings, ...values) => {
            // Simple mock: return what's expected based on the query string content
            const q = strings[0].toLowerCase();
            if (q.includes('select') && q.includes('users')) return { rows: mockData.users || [] };
            if (q.includes('select') && q.includes('quiz_schedules')) return { rows: mockData.schedules || [] };
            if (q.includes('delete')) return { rowCount: 1 };
            if (q.includes('update')) return { rowCount: 1 };
            if (q.includes('insert')) return { rowCount: 1 };
            return { rows: [] };
        }
      };
    }
    // Mock requireAdminAuth middleware
    if (id.endsWith('auth_handler')) {
        return {
            requireAdminAuth: async (req) => {
                if (!req.user || req.user.role !== 'admin') throw new Error('Unauthorized');
                return true;
            }
        };
    }
    return orig.apply(this, arguments);
  };
  return () => { Module.prototype.require = orig; };
}

// Tests
async function testGetUsersExtended() {
  const restore = await mockDb({
      users: [
          { id: 1, username: 'u1', email: 'u1@test.com', role: 'user', total_quizzes: 2, avg_score: 80 }
      ]
  });
  
  try {
      // Clear cache to reload mocked modules
      delete require.cache[require.resolve('../api/admin_handler.js')];
      const handler = require('../api/admin_handler.js');
      
      const req = fakeReq('GET', { action: 'usersExtended' });
      const res = fakeRes();
      
      await handler(req, res);
      const r = res.result;
      
      assert.strictEqual(r.code, 200);
      assert.strictEqual(r.body.status, 'success');
      assert.strictEqual(r.body.users.length, 1);
      assert.strictEqual(r.body.users[0].username, 'u1');
      console.log('PASS: testGetUsersExtended');
  } finally {
      restore();
  }
}

async function testDeleteUser() {
    const restore = await mockDb();
    try {
        delete require.cache[require.resolve('../api/admin_handler.js')];
        const handler = require('../api/admin_handler.js');
        
        const req = fakeReq('POST', { action: 'deleteUser' }, { user_id: 99 });
        const res = fakeRes();
        
        await handler(req, res);
        const r = res.result;
        
        assert.strictEqual(r.code, 200);
        assert.strictEqual(r.body.status, 'success');
        console.log('PASS: testDeleteUser');
    } finally {
        restore();
    }
}

async function testUpdateSchedule() {
    const restore = await mockDb();
    try {
        delete require.cache[require.resolve('../api/admin_handler.js')];
        const handler = require('../api/admin_handler.js');
        
        const req = fakeReq('POST', { action: 'updateSchedule' }, { 
            title: 'Test Schedule', 
            start_time: '2025-01-01T00:00:00Z',
            end_time: '2025-01-02T00:00:00Z' 
        });
        const res = fakeRes();
        
        await handler(req, res);
        const r = res.result;
        
        assert.strictEqual(r.code, 200);
        assert.strictEqual(r.body.status, 'success');
        console.log('PASS: testUpdateSchedule');
    } finally {
        restore();
    }
}

// Main runner
async function main() {
    console.log('Running Admin Logic Tests...');
    try {
        await testGetUsersExtended();
        await testDeleteUser();
        await testUpdateSchedule();
        console.log('All admin tests passed!');
    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}

main();
