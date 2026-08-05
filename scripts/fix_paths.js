const fs = require('fs');
const path = require('path');

const apiDir = path.join(process.cwd(), 'src', 'pages', 'api');

const files = fs.readdirSync(apiDir);
files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(apiDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    if (content.includes("require('../controllers")) {
      content = content.replace(/require\('\.\.\/controllers/g, "require('../../../controllers");
      changed = true;
    }
    if (content.includes("require('../models")) {
      content = content.replace(/require\('\.\.\/models/g, "require('../../../models");
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated paths in ${file}`);
    }
  }
});
