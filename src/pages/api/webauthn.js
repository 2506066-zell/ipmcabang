const handler = require('./_handler_webauthn');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
