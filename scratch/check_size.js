const fs = require('fs');
const path = require('path');
// Since I don't have sharp or canvas in the node environment usually, I can't easily re-encode.
// But I can check the file size.
const size = fs.statSync('d:\\cabang\\pkdtm1-banner-v3.png').size;
console.log('Current size:', size);
