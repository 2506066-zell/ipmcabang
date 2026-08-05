const fs = require('fs');
const path = require('path');

const apiDir = path.join(process.cwd(), 'src', 'pages', 'api');

const endpoints = [
  { handler: '_handler_articles.js', route: 'articles.js' },
  { handler: '_handler_questions.js', route: 'questions.js' }, // Note: we have /api/admin/questions in app router, this will be /api/questions for public
  { handler: '_handler_attendance.js', route: 'attendance.js' },
  { handler: '_handler_discussions.js', route: 'discussions.js' },
  { handler: '_handler_feedback.js', route: 'feedback.js' },
  { handler: '_handler_forms.js', route: 'forms.js' },
  { handler: '_handler_materials.js', route: 'materials.js' },
  { handler: '_handler_organization.js', route: 'organization.js' },
  { handler: '_handler_pkdtm1.js', route: 'pkdtm1.js' },
  { handler: '_handler_results.js', route: 'results.js' },
  { handler: '_handler_webauthn.js', route: 'webauthn.js' },
  // upload.js, events.js, article-share.js are already properly named, just need wrappers if they used module.exports
];

endpoints.forEach(({ handler, route }) => {
  const content = `const handler = require('./${handler.replace('.js', '')}');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
`;
  fs.writeFileSync(path.join(apiDir, route), content);
  console.log(`Created wrapper for ${route}`);
});

// Also create wrappers for the ones that don't have _handler prefix but are needed
const others = ['events.js', 'upload.js', 'article-share.js', 'article-share-image.js', 'pkdtm1-share.js', 'pkdtm1-share-image.js'];
others.forEach(file => {
  const oldPath = path.join(apiDir, file);
  const tempPath = path.join(apiDir, '_' + file);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, tempPath);
    const content = `const handler = require('./_${file.replace('.js', '')}');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
`;
    fs.writeFileSync(oldPath, content);
    console.log(`Created wrapper for ${file}`);
  }
});
