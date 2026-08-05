const handler = require('./_article-share-image');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
