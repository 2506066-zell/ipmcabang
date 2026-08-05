const fs = require('fs');
const path = require('path');

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;

      // Replace '../api/' with '../src/pages/api/'
      if (content.includes("require('../api/")) {
        content = content.replace(/require\('\.\.\/api\//g, "require('../src/pages/api/");
        changed = true;
      }
      
      // Replace '../../api/' with '../../src/pages/api/'
      if (content.includes("require('../../api/")) {
        content = content.replace(/require\('\.\.\/\.\.\/api\//g, "require('../../src/pages/api/");
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated paths in ${filePath}`);
      }
    }
  });
}

processDir(path.join(process.cwd(), 'controllers'));
processDir(path.join(process.cwd(), 'models'));
