import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Artikel | PC IPM Panawuan',
  description: 'Kumpulan artikel, opini, dan pemikiran dari kader IPM Panawuan.',
};

export default function ArticlesPage() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/article-enhancements.css" />
      <div id="articles-app">
        {/* Skeleton loading state */}
        <div style={{ padding: '24px 16px', maxWidth: 900, margin: '0 auto' }}>
          <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: 24 }}></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, marginBottom: 16 }}></div>
          ))}
        </div>
      </div>
      <script src="/app/js/pages/articles.js" defer></script>
    </>
  );
}
