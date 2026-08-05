import { saveSubscription, removeSubscription, getVapid } from '@/lib/push';
import { getSessionUserStrict } from '@/lib/auth';
import { errResponse, okResponse, parseBody, getSearchParams } from '@/lib/utils';

// GET /api/push?action=vapidPublicKey
export async function GET(req: Request): Promise<Response> {
  const params = getSearchParams(req);
  const action = params.get('action');

  if (action === 'vapidPublicKey') {
    const vapid = getVapid();
    if (!vapid) return errResponse('Push notifications not configured', 503);
    return okResponse({ publicKey: vapid.publicKey });
  }

  return errResponse('Unknown action', 404);
}

// POST /api/push — subscribe or unsubscribe
export async function POST(req: Request): Promise<Response> {
  const user = await getSessionUserStrict(req);
  const params = getSearchParams(req);
  const action = params.get('action');

  const body = await parseBody<{
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  }>(req);

  if (action === 'unsubscribe') {
    if (body.endpoint) await removeSubscription(body.endpoint);
    return okResponse();
  }

  // Default: subscribe
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return errResponse('endpoint, p256dh, auth wajib diisi');
  }

  await saveSubscription({
    endpoint: body.endpoint,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    user_id: user?.id ?? null,
  });

  return okResponse();
}
