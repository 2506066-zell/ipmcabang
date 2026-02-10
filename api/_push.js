const webpush = require('web-push');
const { query } = require('./_db');

function getVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@ipm.local';
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function initWebPush() {
  const vapid = getVapid();
  if (!vapid) return null;
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  return vapid;
}

async function saveSubscription({ endpoint, keys, user_id }) {
  if (!endpoint || !keys?.p256dh || !keys?.auth) return false;
  await query`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id)
    VALUES (${endpoint}, ${keys.p256dh}, ${keys.auth}, ${user_id || null})
    ON CONFLICT (endpoint)
    DO UPDATE SET p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth, user_id=EXCLUDED.user_id, updated_at=NOW()
  `;
  return true;
}

async function removeSubscription(endpoint) {
  if (!endpoint) return;
  await query`DELETE FROM push_subscriptions WHERE endpoint=${endpoint}`;
}

async function sendToSubscriptions(subs, payload) {
  const vapid = initWebPush();
  if (!vapid) return { sent: 0, failed: 0, error: 'VAPID missing' };
  const body = JSON.stringify(payload || {});
  let sent = 0;
  let failed = 0;
  for (const s of subs) {
    const sub = {
      endpoint: s.endpoint,
      keys: {
        p256dh: s.p256dh,
        auth: s.auth
      }
    };
    try {
      await webpush.sendNotification(sub, body);
      sent++;
    } catch (e) {
      failed++;
      if (e.statusCode === 404 || e.statusCode === 410) {
        await removeSubscription(s.endpoint);
      }
    }
  }
  return { sent, failed };
}

async function sendToUser(userId, payload) {
  if (!userId) return { sent: 0, failed: 0 };
  const subs = (await query`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=${userId}`).rows;
  if (!subs.length) return { sent: 0, failed: 0 };
  return await sendToSubscriptions(subs, payload);
}

async function sendToUsers(userIds, payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) return { sent: 0, failed: 0 };
  const { rawQuery } = require('./_db');
  const result = await rawQuery(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1::int[])',
    [userIds]
  );
  const subs = result.rows || [];
  if (!subs.length) return { sent: 0, failed: 0 };
  return await sendToSubscriptions(subs, payload);
}

async function sendToAll(payload) {
  const subs = (await query`SELECT endpoint, p256dh, auth FROM push_subscriptions`).rows;
  if (!subs.length) return { sent: 0, failed: 0 };
  return await sendToSubscriptions(subs, payload);
}

module.exports = {
  getVapid,
  initWebPush,
  saveSubscription,
  removeSubscription,
  sendToUser,
  sendToUsers,
  sendToAll
};
