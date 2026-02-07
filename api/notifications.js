const { query } = require('./_db');
const { json, cacheHeaders } = require('./_util');
const { getSessionUser } = require('./_auth');

module.exports = async (req, res) => {
    try {
        const user = await getSessionUser(req);
        if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });
        
        if (req.method === 'GET') {
            const notifs = (await query`SELECT id, message, is_read, created_at FROM notifications WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 20`).rows;
            return json(res, 200, { status: 'success', notifications: notifs }, cacheHeaders(0));
        }
        
        if (req.method === 'POST') {
            // Mark read
            const action = req.query.action;
            if (action === 'markRead') {
                await query`UPDATE notifications SET is_read=TRUE WHERE user_id=${user.id}`;
                return json(res, 200, { status: 'success' });
            }
        }
        
        return json(res, 405, { status: 'error', message: 'Method not allowed' });
    } catch (e) {
        return json(res, 500, { status: 'error', message: String(e.message || e) });
    }
};
