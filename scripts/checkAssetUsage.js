const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync('Eternal-Momentum-OLD GAME/index.html','utf8');
const oldAssets = Array.from(indexHtml.matchAll(/assets\/([A-Za-z0-9_\-]+)\.[a-z0-9]+/g)).map(m => m[1]);
const assetNames = [...new Set(oldAssets)];

function searchDir(dir, fileFilter) {
  let results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      if (file === 'Eternal-Momentum-OLD GAME' || file === '.git' || file === 'node_modules') continue;
      results = results.concat(searchDir(p, fileFilter));
    } else if (fileFilter(p)) {
      results.push(p);
    }
  }
  return results;
}

const sourceFiles = searchDir('.', p => p.endsWith('.js') || p.endsWith('.html') || p.endsWith('.css'));

let missing = [];
for (const name of assetNames) {
  const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  let found = false;
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file,'utf8');
    if (regex.test(content)) { found = true; break; }
  }
  if (!found) missing.push(name);
}

if (missing.length) {
  console.log('Missing assets:', missing.join(', '));
  process.exit(1);
} else {
  console.log('All old assets referenced in code.');
}
