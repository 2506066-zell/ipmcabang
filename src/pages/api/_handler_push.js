const { json, parseJsonBody } = require('./_util');
const { getSessionUser, requireAdminAuth } = require('./_auth');
const { getVapid, saveSubscription, removeSubscription, sendToAll, sendToUser } = require('./_push');

function normalizeNotificationUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '/';
  if (/^(javascript|data|vbscript):/i.test(raw)) return '/';
  const looksLikeDomain = /^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(raw);
  const candidate = (/^https?:\/\//i.test(raw) || raw.startsWith('/'))
    ? raw
    : (looksLikeDomain ? `https://${raw}` : raw);
  try {
    if (/^https?:\/\//i.test(candidate)) return new URL(candidate).href;
    const parsed = new URL(candidate, 'http://local.app');
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  } catch {
    const cleaned = raw.replace(/^\.?\//, '').trim();
    return cleaned ? `/${cleaned}` : '/';
  }
}

module.exports = async (req, res) => {
  try {
    const action = req.query.action || '';

    if (req.method === 'GET' && action === 'publicKey') {
      const vapid = getVapid();
      if (!vapid) return json(res, 200, { status: 'disabled', publicKey: null, message: 'VAPID not configured' });
      return json(res, 200, { status: 'success', publicKey: vapid.publicKey });
    }

    if (req.method === 'POST' && action === 'subscribe') {
      const user = await getSessionUser(req);
      const body = parseJsonBody(req) || {};
      const sub = body.subscription || body;
      if (!sub || !sub.endpoint) return json(res, 400, { status: 'error', message: 'Invalid subscription' });
      await saveSubscription({ endpoint: sub.endpoint, keys: sub.keys, user_id: user ? user.id : null });
      return json(res, 200, { status: 'success' });
    }

    if (req.method === 'POST' && action === 'unsubscribe') {
      const body = parseJsonBody(req) || {};
      const endpoint = body.endpoint || body.subscription?.endpoint;
      if (!endpoint) return json(res, 400, { status: 'error', message: 'Endpoint required' });
      await removeSubscription(endpoint);
      return json(res, 200, { status: 'success' });
    }

    if (req.method === 'POST' && action === 'broadcast') {
      try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
      const body = parseJsonBody(req) || {};
      const payload = {
        title: body.title || 'Notifikasi IPM',
        body: body.body || 'Ada pembaruan baru.',
        url: normalizeNotificationUrl(body.url || '/')
      };
      const result = await sendToAll(payload);
      return json(res, 200, { status: 'success', result });
    }

    if (req.method === 'POST' && action === 'notifyUser') {
      try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
      const body = parseJsonBody(req) || {};
      const userId = Number(body.user_id || 0);
      if (!userId) return json(res, 400, { status: 'error', message: 'user_id required' });
      const payload = {
        title: body.title || 'Notifikasi IPM',
        body: body.body || 'Ada pembaruan baru.',
        url: normalizeNotificationUrl(body.url || '/')
      };
      const result = await sendToUser(userId, payload);
      return json(res, 200, { status: 'success', result });
    }

    return json(res, 405, { status: 'error', message: 'Method not allowed' });
  } catch (e) {
    return json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
