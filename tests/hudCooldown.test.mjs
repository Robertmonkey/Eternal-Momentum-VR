import assert from 'assert';
import fs from 'fs';

const uiSrc = fs.readFileSync('./modules/UIManager.js', 'utf8');
assert(uiSrc.includes('coreCooldown'), 'coreCooldown overlay exists');
assert(uiSrc.includes('coreCooldown.scale.y = progress'), 'cooldown scale updated');
console.log('hud cooldown test passed');
