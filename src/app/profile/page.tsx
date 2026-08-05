import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Profil Kader | PC IPM Panawuan' };

export default function Page() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />

      <main className="main-content profile-main" style={{ paddingTop: 70, paddingBottom: 100 }}>

        <div id="profile-root" className="profile-root"></div>
    
</main>

      <script src="/app/js/core/profile.js" defer></script>
    </>
  );
}
