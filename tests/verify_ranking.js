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

// Mock DB
async function mockDb(questionsMock, usersMock, resultsMock) {
    const Module = require('module');
    const orig = Module.prototype.require;
    Module.prototype.require = function (id) {
        if (id.endsWith('/_db') || id.endsWith('\\_db')) {
            return {
                rawQuery: async () => ({ rows: resultsMock || [] }), // For ranking list
                query: async (strings, ...values) => {
                    const q = strings[0].trim();
                    // SELECT id, correct_answer FROM questions
                    if (q.startsWith('SELECT id, correct_answer')) return { rows: questionsMock };
                    // SELECT u.id, u.username FROM sessions
                    if (q.startsWith('SELECT u.id')) return { rows: [usersMock] };
                    // SELECT id FROM results (idempotency)
                    if (q.startsWith('SELECT id FROM results')) return { rows: [] };
                    // INSERT
                    if (q.startsWith('INSERT INTO results')) return { rows: [{ id: 999 }] };
                    return { rows: [] };
                }
            };
        }
        if (id.endsWith('/_util') || id.endsWith('\\_util')) {
            return {
                parseJsonBody: (r) => r.body,
                json: (res, code, data) => res.status(code).send(JSON.stringify(data)),
                cacheHeaders: () => ({})
            };
        }
        return orig.apply(this, arguments);
    };
    return () => { Module.prototype.require = orig; };
}

async function testScoreCalculation() {
    console.log('Testing Server-Side Scoring...');

    // Mock Data
    const questions = [
        { id: 1, correct_answer: 'a' },
        { id: 2, correct_answer: 'b' }
    ];
    const user = { id: 1, username: 'tester' };

    const restore = await mockDb(questions, user, []);

    try {
        delete require.cache[require.resolve('../api/results.js')];
        const handler = require('../api/results.js');

        // Scenario 1: perfect score
        {
            const res = fakeRes();
            const req = {
                method: 'POST',
                body: {
                    session: 'valid-token',
                    quiz_set: 1,
                    answers: { '1': 'a', '2': 'b' } // Both correct
                }
            };

            await handler(req, res);
            const r = res.result;
            console.log('Scenario 1 (Perfect):', r.body);
            assert.strictEqual(r.code, 201);
            assert.strictEqual(r.body.score, 2);
            assert.strictEqual(r.body.percent, 100);
        }

        // Scenario 2: partial score
        {
            const res = fakeRes();
            const req = {
                method: 'POST',
                body: {
                    session: 'valid-token',
                    quiz_set: 1,
                    answers: { '1': 'a', '2': 'c' } // One wrong
                }
            };

            await handler(req, res);
            const r = res.result;
            console.log('Scenario 2 (Partial):', r.body);
            assert.strictEqual(r.code, 201);
            assert.strictEqual(r.body.score, 1);
            assert.strictEqual(r.body.percent, 50);
        }

        console.log('PASS: Score calculation verified');
    } catch (e) {
        console.error('FAIL:', e);
        throw e;
    } finally {
        restore();
    }
}

async function testRankingListReturnsAll() {
    console.log('Testing Ranking List...');

    // Mock Results (Multiple attempts for same user)
    const mockResults = [
        { id: 1, username: 'UserA', score: 100 },
        { id: 2, username: 'UserA', score: 50 }, // Should NOT be hidden
        { id: 3, username: 'UserB', score: 80 }
    ];

    const restore = await mockDb([], {}, mockResults);

    try {
        delete require.cache[require.resolve('../api/results.js')];
        const handler = require('../api/results.js');

        const res = fakeRes();
        const req = { method: 'GET', query: {} };

        await handler(req, res);
        const r = res.result;

        console.log('Ranking Results:', r.body.results.length);
        assert.strictEqual(r.body.results.length, 3); // Must be 3, not filtered to 2

        console.log('PASS: Ranking returns all attempts');
    } catch (e) {
        console.error('FAIL:', e);
        throw e;
    } finally {
        restore();
    }
}

(async () => {
    await testScoreCalculation();
    await testRankingListReturnsAll();
})();
