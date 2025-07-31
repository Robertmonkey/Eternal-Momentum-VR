import assert from 'assert';
import fs from 'fs';

const src = fs.readFileSync('./modules/UIManager.js', 'utf8');
assert(src.includes("updateTextSprite(coreIcon, '◎', color)"), 'core icon colored');
console.log('core icon display test passed');
