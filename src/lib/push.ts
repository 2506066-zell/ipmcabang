import webpush from 'web-push';
import { query, rawQuery } from './db';

const PUSH_SEND_CONCURRENCY = Math.max(1, Number(process.env.PUSH_SEND_CONCURRENCY || 20));
const PUSH_TTL_SECONDS = Math.max(30, Number(process.env.PUSH_TTL_SECONDS || 300));
const PUSH_TIMEOUT_MS = Math.max(3000, Number(process.env.PUSH_TIMEOUT_MS || 10000));

export const APP_NAME = 'PC IPM Panawuan';
const DEFAULT_ICON = '/app/media/brand/ipm-logo.png';
const DEFAULT_BADGE = '/icons/icon-192-maskable.png';

export const REMINDER_IMAGES = {
  quiz: '/app/media/notifications/reminder-quiz.png',
  form: '/app/media/notifications/reminder-forms.png',
  attendance: '/app/media/notifications/reminder-attendance.png',
  materials: '/app/media/notifications/reminder-materials.png',
  discussions: '/app/media/notifications/reminder-discussions.png',
  general: '/app/media/notifications/reminder-home.png',
} as const;

export interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  image?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  useLargeImage?: boolean;
  renotify?: boolean;
  requireInteraction?: boolean;
  vibrate?: number[];
  timestamp?: number;
  [key: string]: unknown;
}

interface PushResult {
  sent: number;
  failed: number;
  error?: string;
}

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function getVapid(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@ipm.local';
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function initWebPush(): VapidConfig | null {
  const vapid = getVapid();
  if (!vapid) return null;
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  return vapid;
}

function withBranding(payload: PushPayload): PushPayload {
  const next = { ...payload };
  if (!next.title) next.title = APP_NAME;
  if (!next.icon) next.icon = DEFAULT_ICON;
  if (!next.badge) next.badge = DEFAULT_BADGE;
  if (!next.image && next.useLargeImage !== false) next.image = REMINDER_IMAGES.general;
  if (!next.tag) next.tag = 'ipm-general';
  if (next.renotify === undefined) next.renotify = false;
  if (next.requireInteraction === undefined) next.requireInteraction = false;
  if (!Array.isArray(next.vibrate)) next.vibrate = [180, 60, 180];
  if (!next.timestamp) next.timestamp = Date.now();
  next.appName = APP_NAME;
  next.trustLabel = next.trustLabel || 'Sumber resmi PC IPM Panawuan';
  return next;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendToSubscriptions(subs: SubscriptionRow[], payload: PushPayload): Promise<PushResult> {
  const vapid = initWebPush();
  if (!vapid) {
    console.error('Push Notification: VAPID keys missing from environment variables.');
    return { sent: 0, failed: 0, error: 'Konfigurasi VAPID Keys belum lengkap.' };
  }

  const body = JSON.stringify(withBranding(payload));
  let sent = 0;
  let failed = 0;
  let index = 0;
  const workerCount = Math.min(PUSH_SEND_CONCURRENCY, subs.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const i = index++;
      if (i >= subs.length) return;
      const s = subs[i];
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: PUSH_TTL_SECONDS, urgency: 'high' as const }
        );
        sent++;
      } catch (e: unknown) {
        failed++;
        // Remove expired/invalid subscriptions
        const statusCode = (e as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscription(s.endpoint);
        }
      }
    }
  });

  await Promise.all(workers);
  return { sent, failed };
}

export async function saveSubscription(options: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  user_id?: number | null;
}): Promise<boolean> {
  const { endpoint, keys, user_id } = options;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return false;
  await query`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id)
    VALUES (${endpoint}, ${keys.p256dh}, ${keys.auth}, ${user_id ?? null})
    ON CONFLICT (endpoint)
    DO UPDATE SET
      p256dh=EXCLUDED.p256dh,
      auth=EXCLUDED.auth,
      user_id=COALESCE(EXCLUDED.user_id, push_subscriptions.user_id),
      updated_at=NOW()
  `;
  return true;
}

export async function removeSubscription(endpoint: string): Promise<void> {
  if (!endpoint) return;
  await query`DELETE FROM push_subscriptions WHERE endpoint=${endpoint}`;
}

export async function sendToUser(userId: number, payload: PushPayload): Promise<PushResult> {
  if (!userId) return { sent: 0, failed: 0 };
  const subs = (
    await query`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=${userId}`
  ).rows as unknown as SubscriptionRow[];
  if (!subs.length) return { sent: 0, failed: 0 };
  return sendToSubscriptions(subs, payload);
}

export async function sendToUsers(userIds: number[], payload: PushPayload): Promise<PushResult> {
  if (!userIds.length) return { sent: 0, failed: 0 };
  const result = await rawQuery(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1::int[])',
    [userIds]
  );
  const subs = result.rows as unknown as SubscriptionRow[];
  if (!subs.length) return { sent: 0, failed: 0 };
  return sendToSubscriptions(subs, payload);
}

export async function sendToAll(payload: PushPayload): Promise<PushResult> {
  const subs = (
    await query`SELECT endpoint, p256dh, auth FROM push_subscriptions`
  ).rows as unknown as SubscriptionRow[];
  if (!subs.length) return { sent: 0, failed: 0 };
  return sendToSubscriptions(subs, payload);
}

export function resolveNotificationImage(url: string): string {
  const path = url.toLowerCase();
  if (path.includes('quiz')) return REMINDER_IMAGES.quiz;
  if (path.includes('form')) return REMINDER_IMAGES.form;
  if (path.includes('absen')) return REMINDER_IMAGES.attendance;
  if (path.includes('materi')) return REMINDER_IMAGES.materials;
  if (path.includes('diskusi') || path.includes('discussion')) return REMINDER_IMAGES.discussions;
  return REMINDER_IMAGES.general;
}
