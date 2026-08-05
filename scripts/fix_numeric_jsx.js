const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const replace = (regex, replacement) => {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      changed = true;
    }
  };

  replace(/maxLength="(\d+)"/g, 'maxLength={$1}');
  replace(/rows="(\d+)"/g, 'rows={$1}');

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed numeric attributes in', filePath);
  }
}

const pages = [
  'absen', 'articles', 'materi', 'ranking', 'diskusi', 'struktur', 'profile', 'bantuan'
];

pages.forEach(p => {
  processFile(path.join(process.cwd(), 'src/app', p, 'page.tsx'));
});
