import fs from 'fs';
import path from 'path';

const testFiles = fs.readdirSync('./tests')
  .filter(f => f.endsWith('.test.mjs') && f !== 'all.test.mjs' && f !== 'webxrIntegration.test.mjs');

testFiles.forEach(file => {
  test(file, async () => {
    await import(path.resolve('./tests', file));
  });
});
