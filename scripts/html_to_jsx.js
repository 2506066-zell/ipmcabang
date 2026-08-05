const fs = require('fs');
const path = require('path');

const mappings = [
  { html: 'absen.html', tsx: 'src/app/absen/page.tsx', script: '<script src="/app/js/pages/absen.js" defer></script>' },
  { html: 'articles.html', tsx: 'src/app/articles/page.tsx', script: `<script src="/app/js/features/articles/article-renderer-shared.js" defer></script>
      <script type="module" dangerouslySetInnerHTML={{ __html: \`import { initPublicArticles } from '/app/js/features/articles/public-articles.js'; setTimeout(() => initPublicArticles(), 200);\` }}></script>` },
  { html: 'materi.html', tsx: 'src/app/materi/page.tsx', script: `<script src="/app/js/features/materials/public-materials.js" defer></script>` },
  { html: 'ranking.html', tsx: 'src/app/ranking/page.tsx', script: `<script src="/app/js/pages/ranking.js" defer></script>` },
  { html: 'discussions.html', tsx: 'src/app/diskusi/page.tsx', script: `<script src="/app/js/pages/discussions.js" defer></script>` },
  { html: 'struktur-organisasi.html', tsx: 'src/app/struktur/page.tsx', script: `<script src="/app/js/pages/struktur-organisasi.js" defer></script>` },
  { html: 'profile/index.html', tsx: 'src/app/profile/page.tsx', script: `<script src="/app/js/core/profile.js" defer></script>` },
  { html: 'help.html', tsx: 'src/app/bantuan/page.tsx', script: `` }
];

mappings.forEach(m => {
  const htmlPath = path.join(process.cwd(), '_temp_legacy_html', m.html);
  if (!fs.existsSync(htmlPath)) return;
  
  let rawHtml = fs.readFileSync(htmlPath, 'utf8');
  
  // Extract <main ...> ... </main>
  const mainMatch = rawHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (!mainMatch) return;
  
  let mainAttrs = rawHtml.match(/<main([^>]*)>/i)[1];
  let content = mainMatch[1];
  
  // Convert HTML to JSX
  let jsx = `<main${mainAttrs}>\n${content}\n</main>`;
  
  jsx = jsx.replace(/class=/g, 'className=');
  jsx = jsx.replace(/for=/g, 'htmlFor=');
  jsx = jsx.replace(/<img([^>]*?)(?<!\/)>/g, '<img$1 />');
  jsx = jsx.replace(/<input([^>]*?)(?<!\/)>/g, '<input$1 />');
  jsx = jsx.replace(/<br>/g, '<br />');
  jsx = jsx.replace(/<hr>/g, '<hr />');
  jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');
  
  // Basic inline style conversions
  jsx = jsx.replace(/style="display:\s*none;?"/g, "style={{ display: 'none' }}");
  jsx = jsx.replace(/style="padding-top:70px; padding-bottom:100px;"/g, "style={{ paddingTop: 70, paddingBottom: 100 }}");
  jsx = jsx.replace(/style="width:\s*(.*?);?"/g, "style={{ width: '$1' }}");
  jsx = jsx.replace(/style="color:\s*(.*?);?"/g, "style={{ color: '$1' }}");
  jsx = jsx.replace(/style="display:none"/g, "style={{ display: 'none' }}");
  jsx = jsx.replace(/style="display: none;"/g, "style={{ display: 'none' }}");
  jsx = jsx.replace(/onclick="([^"]*)"/g, "onClick={() => { /* $1 */ }}");

  // Fix unescaped < and {
  // jsx = jsx.replace(/</g, '{/* < */}')... (too complex, let's assume valid JSX or fix manually if build fails)
  
  const tsxPath = path.join(process.cwd(), m.tsx);
  if (!fs.existsSync(tsxPath)) {
    // create directory if not exists
    fs.mkdirSync(path.dirname(tsxPath), { recursive: true });
  }

  // Read existing TSX to get imports and metadata
  let existingTsx = '';
  if (fs.existsSync(tsxPath)) {
    existingTsx = fs.readFileSync(tsxPath, 'utf8');
  }

  const metadataMatch = existingTsx.match(/export const metadata.*?};/s);
  const metadataStr = metadataMatch ? metadataMatch[0] : `export const metadata = { title: 'IPM Panawuan' };`;

  // We need to keep any CSS links they might need
  const cssMatch = existingTsx.match(/<link rel="stylesheet"[^>]+>/g) || [];

  const newTsx = `import type { Metadata } from 'next';\n\n${metadataStr}\n\nexport default function Page() {\n  return (\n    <>\n      ${cssMatch.join('\n      ')}\n\n      ${jsx}\n\n      ${m.script}\n    </>\n  );\n}\n`;
  
  fs.writeFileSync(tsxPath, newTsx);
  console.log(`Updated ${m.tsx}`);
});
