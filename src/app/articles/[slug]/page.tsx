import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

// Dynamic metadata for article pages (good for SEO)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://ipmpanawuan.or.id'}/api/articles?slug=${slug}`, {
      next: { revalidate: 3600 }, // 1 hour cache
    });
    const data = await res.json();
    const article = data.article;
    if (article) {
      return {
        title: `${article.title} | PC IPM Panawuan`,
        description: article.excerpt || article.title,
        openGraph: {
          title: article.title,
          description: article.excerpt || '',
          images: article.thumbnail_url ? [{ url: article.thumbnail_url }] : [],
          type: 'article',
        },
      };
    }
  } catch { /* noop */ }
  return { title: 'Artikel | PC IPM Panawuan' };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;

  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/article-enhancements.css" />
      <link rel="stylesheet" href="/app/css/editorial.css" />
      <div id="article-detail-app" data-slug={slug}>
        <div style={{ padding: '24px 16px', maxWidth: 720, margin: '0 auto' }}>
          <div className="skeleton" style={{ height: 40, width: '70%', marginBottom: 16 }}></div>
          <div className="skeleton" style={{ height: 240, marginBottom: 24 }}></div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: 20, marginBottom: 12 }}></div>
          ))}
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ARTICLE_SLUG = ${JSON.stringify(slug)};`,
        }}
      />
      <script src="/app/js/pages/article-detail.js" defer></script>
    </>
  );
}
