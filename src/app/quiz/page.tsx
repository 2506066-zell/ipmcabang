import type { Metadata } from 'next';

export const metadata: Metadata = { 
  title: 'Quiz Kader Pintar | PC IPM Panawuan',
  description: 'Tantangan kuis IPM yang cepat dan seru. Adu skor dengan temanmu dan buktikan siapa paling paham.'
};

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <link rel="stylesheet" href="/app/css/quiz-react.css" />
      
      <div className="quiz-page" style={{ paddingTop: '80px', minHeight: '100vh', background: '#f8fafc' }}>
        <div className="quiz-page-inner">
          <section className="quiz-banner">
            <div className="quiz-instructions">
              <button className="quiz-instructions-toggle" id="quiz-instructions-toggle" type="button" onClick={() => {
                const body = document.getElementById('quiz-instructions-body');
                const toggle = document.getElementById('quiz-instructions-toggle');
                if (body && toggle) {
                  body.classList.toggle('collapsed');
                  toggle.classList.toggle('collapsed');
                }
              }}>
                <span className="quiz-instructions-title">Cara Kerja Kuis</span>
                <i className="fas fa-chevron-down"></i>
              </button>
              <div className="quiz-instructions-body collapsed" id="quiz-instructions-body">
                <ul className="quiz-instructions-list">
                  <li>Pilih set kuis lalu jawab semua soal.</li>
                  <li>Jawaban benar memberi XP dan menaikkan streak.</li>
                  <li>Timer berjalan per soal, fokus dan cepat menjawab.</li>
                  <li>Skor akhir dihitung server dan muncul setelah selesai.</li>
                </ul>
              </div>
            </div>
          </section>
          
          <section className="quiz-content">
            <div id="app" className="quiz-react-root">
              <div className="quiz-fallback" style={{ textAlign: 'center', padding: '2rem' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1a6b3c' }}></i>
                <p>Memuat kuis interaktif...</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <script src="/scripts/vendor/react.production.min.js" defer></script>
      <script src="/scripts/vendor/react-dom.production.min.js" defer></script>
      <script src="/scripts/vendor/babel.min.js" defer></script>
      <script type="text/babel" src="/app/js/features/quiz/quiz-react.js" defer></script>
    </>
  );
}
