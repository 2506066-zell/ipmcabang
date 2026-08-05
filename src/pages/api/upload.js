const handler = require('./_upload');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
