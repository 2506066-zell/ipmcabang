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
    user: user || { id: 1, role: 'admin', username: 'admin_test' } // Mock auth middleware result with ID
  };
}

// Mock DB
async function mockDb(mockData = {}) {
  const Module = require('module');
  const orig = Module.prototype.require;
  
  // Track calls
  const calls = {
    query: [],
    rawQuery: []
  };

  Module.prototype.require = function(id) {
    if (id.endsWith('/_db') || id.endsWith('\\_db')) {
      return {
        query: async (strings, ...values) => {
            const sql = strings[0] || '';
            calls.query.push({ sql, values });
            
            // Simple mock logic
            const q = sql.toLowerCase();
            if (q.includes('select') && q.includes('users')) return { rows: mockData.users || [] };
            if (q.includes('select') && q.includes('quiz_schedules')) return { rows: mockData.schedules || [] };
            if (q.includes('insert') && q.includes('users')) {
                // Check unique constraint mock
                if (mockData.existingUsernames && values[0] && mockData.existingUsernames.includes(values[0])) {
                    throw new Error('unique constraint violation');
                }
                return { rowCount: 1, rows: [{ id: 101 }] };
            }
            if (q.includes('delete')) return { rowCount: 1 };
            if (q.includes('update')) return { rowCount: 1 };
            if (q.includes('insert')) return { rowCount: 1 };
            return { rows: [] };
        },
        rawQuery: async (sql, params) => {
            calls.rawQuery.push({ sql, params });
            return { rowCount: 1, rows: [{ id: 101 }] };
        }
      };
    }
    // Mock requireAdminAuth middleware
    if (id.endsWith('auth_handler') || id.endsWith('_auth')) {
        return {
            requireAdminAuth: async (req) => {
                if (!req.user || req.user.role !== 'admin') throw new Error('Unauthorized');
                return req.user;
            }
        };
    }
    return orig.apply(this, arguments);
  };
  return { 
      restore: () => { Module.prototype.require = orig; },
      calls
  };
}

// Tests
async function testGetUsersExtended() {
  const { restore } = await mockDb({
      users: [
          { id: 1, username: 'u1', email: 'u1@test.com', role: 'user', total_quizzes: 2, avg_score: 80 }
      ]
  });
  
  try {
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
    const { restore, calls } = await mockDb();
    try {
        delete require.cache[require.resolve('../api/admin_handler.js')];
        const handler = require('../api/admin_handler.js');
        
        const req = fakeReq('POST', { action: 'deleteUser' }, { user_id: 99 });
        const res = fakeRes();
        
        await handler(req, res);
        const r = res.result;
        
        assert.strictEqual(r.code, 200);
        assert.strictEqual(r.body.status, 'success');
        
        // Verify delete called
        const deleteCalls = calls.query.filter(c => c.sql.includes('DELETE FROM users'));
        assert.ok(deleteCalls.length > 0, 'Should execute DELETE query');
        
        console.log('PASS: testDeleteUser');
    } finally {
        restore();
    }
}

async function testCreateUser() {
    const { restore, calls } = await mockDb();
    try {
        delete require.cache[require.resolve('../api/admin_handler.js')];
        const handler = require('../api/admin_handler.js');
        
        const req = fakeReq('POST', { action: 'createUser' }, { 
            username: 'newuser', 
            password: 'password123',
            email: 'new@test.com',
            role: 'user'
        });
        const res = fakeRes();
        
        await handler(req, res);
        const r = res.result;
        
        assert.strictEqual(r.code, 201);
        assert.strictEqual(r.body.status, 'success');
        
        // Verify insert called
        const insertCalls = calls.query.filter(c => c.sql.includes('INSERT INTO users'));
        assert.ok(insertCalls.length > 0);
        assert.strictEqual(insertCalls[0].values[0], 'newuser');
        
        console.log('PASS: testCreateUser');
    } finally {
        restore();
    }
}

async function testCreateUserDuplicate() {
    const { restore } = await mockDb({ existingUsernames: ['dupuser'] });
    try {
        delete require.cache[require.resolve('../api/admin_handler.js')];
        const handler = require('../api/admin_handler.js');
        
        const req = fakeReq('POST', { action: 'createUser' }, { 
            username: 'dupuser', 
            password: 'password123'
        });
        const res = fakeRes();
        
        await handler(req, res);
        const r = res.result;
        
        assert.strictEqual(r.code, 400);
        assert.ok(r.body.message.includes('Username sudah digunakan'));
        
        console.log('PASS: testCreateUserDuplicate');
    } finally {
        restore();
    }
}

async function testUpdateUser() {
    const { restore, calls } = await mockDb();
    try {
        delete require.cache[require.resolve('../api/admin_handler.js')];
        const handler = require('../api/admin_handler.js');
        
        const req = fakeReq('POST', { action: 'updateUser' }, { 
            id: 50,
            username: 'updated_user',
            active: false
        });
        const res = fakeRes();
        
        await handler(req, res);
        const r = res.result;
        
        assert.strictEqual(r.code, 200);
        
        // Verify rawQuery called
        assert.ok(calls.rawQuery.length > 0);
        const sql = calls.rawQuery[0].sql;
        assert.ok(sql.includes('UPDATE users SET'));
        assert.ok(sql.includes('username = $1'));
        assert.ok(sql.includes('active = $2'));
        
        console.log('PASS: testUpdateUser');
    } finally {
        restore();
    }
}

async function testUpdateSchedule() {
    const { restore, calls } = await mockDb();
    try {
        delete require.cache[require.resolve('../api/admin_handler.js')];
        const handler = require('../api/admin_handler.js');
        
        // Test Update (with ID)
        const req = fakeReq('POST', { action: 'updateSchedule' }, { 
            id: 10,
            title: 'Test Schedule', 
            start_time: '2025-01-01T00:00:00Z',
            end_time: '2025-01-02T00:00:00Z' 
        });
        const res = fakeRes();
        
        await handler(req, res);
        const r = res.result;
        
        assert.strictEqual(r.code, 200);
        assert.strictEqual(r.body.status, 'success');
        
        const updateCalls = calls.query.filter(c => c.sql.includes('UPDATE quiz_schedules'));
        assert.ok(updateCalls.length > 0);
        
        console.log('PASS: testUpdateSchedule');
    } finally {
        restore();
    }
}

async function testUpdateScheduleValidation() {
    const { restore } = await mockDb();
    try {
        delete require.cache[require.resolve('../api/admin_handler.js')];
        const handler = require('../api/admin_handler.js');
        
        // Test Invalid Date Range
        const req = fakeReq('POST', { action: 'updateSchedule' }, { 
            title: 'Bad Schedule', 
            start_time: '2025-01-02T00:00:00Z',
            end_time: '2025-01-01T00:00:00Z' 
        });
        const res = fakeRes();
        
        await handler(req, res);
        const r = res.result;
        
        assert.strictEqual(r.code, 400);
        assert.ok(r.body.message.includes('Waktu selesai harus setelah waktu mulai'));
        
        console.log('PASS: testUpdateScheduleValidation');
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
        await testCreateUser();
        await testCreateUserDuplicate();
        await testUpdateUser();
        await testUpdateSchedule();
        await testUpdateScheduleValidation();
        console.log('All admin tests passed!');
    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}

main();
