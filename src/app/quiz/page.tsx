import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Quiz Kader Pintar | PC IPM Panawuan' };

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/quiz-react.css" /><link rel="stylesheet" href="/app/css/quiz-enhancements.css" />
      <div id="app-root">
        {/* Quiz Kader Pintar page — content loaded by quiz-gamified.html JS */}
        <div id="page-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', color: '#718096' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
            <p>Memuat halaman...</p>
          </div>
        </div>
      </div>
      <script src="/app/js/pages/quiz.js" defer></script>
    </>
  );
}
