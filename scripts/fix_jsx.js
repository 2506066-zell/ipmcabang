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

  // style="display: none" -> style={{ display: 'none' }}
  replace(/style="display:\s*none;?"/g, "style={{ display: 'none' }}");
  
  // catch any remaining style="prop: val"
  // this is a bit dangerous, but mostly we have simple styles like style="color: red"
  const styleRegex = /style="([^"]+)"/g;
  let match;
  while ((match = styleRegex.exec(content)) !== null) {
    const rawStyle = match[1];
    if (rawStyle.includes('display: none')) continue; // already handled
    
    // convert css string to object (naive)
    const props = rawStyle.split(';').filter(s => s.trim().length > 0);
    const objStr = props.map(p => {
      const parts = p.split(':');
      if (parts.length !== 2) return '';
      let key = parts[0].trim();
      let val = parts[1].trim();
      // camelcase key
      key = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      return `${key}: '${val}'`;
    }).filter(s => s.length > 0).join(', ');
    
    content = content.replace(match[0], `style={{ ${objStr} }}`);
    changed = true;
  }

  // React property camelCasing
  replace(/autoplay/g, "autoPlay");
  replace(/playsinline/g, "playsInline");
  replace(/maxlength/g, "maxLength");
  replace(/tabindex="([^"]+)"/g, "tabIndex={parseInt('$1')}");

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed JSX in', filePath);
  }
}

const pages = [
  'absen', 'articles', 'materi', 'ranking', 'diskusi', 'struktur', 'profile', 'bantuan'
];

pages.forEach(p => {
  processFile(path.join(process.cwd(), 'src/app', p, 'page.tsx'));
});
