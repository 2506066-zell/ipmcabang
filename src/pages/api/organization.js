const handler = require('./_handler_organization');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
