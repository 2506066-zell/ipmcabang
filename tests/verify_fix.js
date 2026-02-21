const assert = require('assert');

// Mock helpers
function fakeRes() {
    let code = 0;
    let body = '';
    return {
        setHeader(k, v) { },
        status(c) { code = c; return { send(b) { body = String(b || ''); } }; },
        get result() { return { code, body: body ? JSON.parse(body) : {} }; }
    };
}

async function mockDb() {
    const Module = require('module');
    const orig = Module.prototype.require;
    Module.prototype.require = function (id) {
        if (id.endsWith('/_db') || id.endsWith('\\_db')) {
            return {
                rawQuery: async () => ({
                    rows: [
                        { id: 1, question: 'Q1', active: true },
                        { id: 2, question: 'Q2', active: false } // Inactive question
                    ]
                }),
                query: async () => ({ rows: [] })
            };
        }
        if (id.endsWith('/_auth') || id.endsWith('\\_auth')) {
            return {
                requireAdminAuth: async () => ({ id: 1, role: 'admin' }),
                getSessionUser: async () => ({ id: 1, role: 'admin' })
            };
        }
        return orig.apply(this, arguments);
    };
    return () => { Module.prototype.require = orig; };
}

async function testListQuestionsIncludeInactive() {
    console.log('Testing handleListQuestions...');
    const restore = await mockDb();

    try {
        // Clear cache to usage mocked DB
        delete require.cache[require.resolve('../api/_handler_admin.js')];
        const handler = require('../api/_handler_admin.js');

        const res = fakeRes();
        // Action: listQuestions
        const req = {
            method: 'GET',
            query: { action: 'listQuestions' }, // In switch(action) using req.query.action
            headers: { host: 'localhost' },
            body: '{}'
        };

        await handler(req, res);

        const r = res.result;
        console.log('Response Code:', r.code);
        console.log('Response Body:', JSON.stringify(r.body));

        assert.strictEqual(r.code, 200);
        assert.strictEqual(r.body.status, 'success');
        assert.strictEqual(r.body.questions.length, 2);
        assert.strictEqual(r.body.questions[1].active, false);

        console.log('PASS: Admin sees inactive questions');
    } catch (e) {
        console.error('FAIL:', e);
        throw e;
    } finally {
        restore();
    }
}

testListQuestionsIncludeInactive();
