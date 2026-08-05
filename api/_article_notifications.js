const { query } = require('./_db');
const { sendToAll } = require('./_push');

const ARTICLE_FALLBACK_IMAGE = '/ipm%20(2).png';

function getOrigin(req) {
  const proto = String(req?.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildArticleUrl(article) {
  const slug = String(article?.slug || '').trim();
  if (slug) return `/articles/${encodeURIComponent(slug)}`;
  return `/articles?id=${encodeURIComponent(article?.id || '')}`;
}

function buildArticleImageUrl(article, req) {
  const origin = getOrigin(req);
  const slug = String(article?.slug || '').trim();
  if (slug && origin) return `${origin}/api/article-share-image/${encodeURIComponent(slug)}.jpg`;
  if (slug) return `/api/article-share-image/${encodeURIComponent(slug)}.jpg`;
  return origin ? `${origin}${ARTICLE_FALLBACK_IMAGE}` : ARTICLE_FALLBACK_IMAGE;
}

function buildArticleBody(article) {
  const category = String(article?.category || '').trim();
  const summary = stripHtml(article?.summary || article?.excerpt || article?.content || '').slice(0, 140);
  if (summary) return summary;
  if (category) return `Bacaan terbaru kategori ${category} sudah tersedia.`;
  return 'Baca artikel terbaru dari PC IPM Panawuan sekarang.';
}

async function saveInAppArticleNotification(message) {
  if (!message) return 0;
  await query`
    INSERT INTO notifications (user_id, message)
    SELECT id, ${message}
    FROM users
    WHERE role='user' OR role IS NULL
  `;
  return 1;
}

async function hasArticleBeenNotified(articleId) {
  if (!articleId) return false;
  const row = (await query`SELECT id FROM article_notification_logs WHERE article_id=${Number(articleId)} LIMIT 1`).rows[0];
  return !!row;
}

async function recordArticleNotification(article, pushResult) {
  await query`
    INSERT INTO article_notification_logs (article_id, title_snapshot, push_sent, push_failed, notified_at, created_at)
    VALUES (
      ${Number(article.id)},
      ${String(article.title || '').trim()},
      ${Number(pushResult?.sent || 0)},
      ${Number(pushResult?.failed || 0)},
      NOW(),
      NOW()
    )
    ON CONFLICT (article_id)
    DO NOTHING
  `;
}

async function notifyPublishedArticle(article, req) {
  if (!article?.id) return { status: 'skipped', reason: 'missing-article' };

  const publishedAt = new Date(article.publish_date || article.created_at || Date.now());
  if (Number.isNaN(publishedAt.getTime())) return { status: 'skipped', reason: 'invalid-publish-date' };
  if (publishedAt.getTime() > Date.now()) return { status: 'skipped', reason: 'future-publish-date' };
  if (await hasArticleBeenNotified(article.id)) return { status: 'skipped', reason: 'already-notified' };

  const title = `Artikel baru: ${String(article.title || 'Artikel terbaru').trim()}`;
  const body = buildArticleBody(article);
  const url = buildArticleUrl(article);
  const image = buildArticleImageUrl(article, req);
  const message = `${title} - ${body}`;

  await saveInAppArticleNotification(message);
  const pushResult = await sendToAll({
    title,
    body,
    url,
    image,
    tag: `article-${Number(article.id)}`,
    renotify: false,
    context: 'Artikel terbit resmi di kanal informasi PC IPM Panawuan',
    trustLabel: 'Konten resmi organisasi'
  });
  await recordArticleNotification(article, pushResult);

  try {
    await query`
      INSERT INTO activity_logs (admin_id, action, details)
      VALUES (${null}, 'AUTO_ARTICLE_NOTIFICATION', ${{ article_id: article.id, title: article.title, push_sent: Number(pushResult?.sent || 0), push_failed: Number(pushResult?.failed || 0) }})
    `;
  } catch {}

  return {
    status: 'sent',
    article_id: Number(article.id),
    push_sent: Number(pushResult?.sent || 0),
    push_failed: Number(pushResult?.failed || 0),
    url,
    image
  };
}

async function processPendingArticleNotifications(req) {
  const rows = (await query`
    SELECT a.*
    FROM articles a
    LEFT JOIN article_notification_logs anl ON anl.article_id = a.id
    WHERE anl.id IS NULL
      AND COALESCE(a.publish_date, a.created_at, NOW()) <= NOW()
    ORDER BY COALESCE(a.publish_date, a.created_at, NOW()) DESC
    LIMIT 10
  `).rows;

  let sent = 0;
  let failed = 0;

  for (const article of rows) {
    try {
      const result = await notifyPublishedArticle(article, req);
      if (result.status === 'sent') {
        sent += Number(result.push_sent || 0);
        failed += Number(result.push_failed || 0);
      }
    } catch {
      failed += 1;
    }
  }

  return { pending: rows.length, sent, failed };
}

module.exports = {
  buildArticleUrl,
  buildArticleImageUrl,
  notifyPublishedArticle,
  processPendingArticleNotifications
};
