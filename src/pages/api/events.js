const handler = require('./_events');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
