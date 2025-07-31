import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { MirrorMirageAI } = await import('../modules/agents/MirrorMirageAI.js');

global.setTimeout = fn => { fn(); return 0; };

const boss = new MirrorMirageAI(1);
let swapped = false;
boss.teleportAll = () => { swapped = true; };
boss.swapTimer = 9.6;
boss.update(0.5, {});
assert.ok(swapped, 'teleport called after timer');

const decoyIndex = boss.realIndex === 1 ? 2 : 1;
const decoy = boss.clones[decoyIndex];
const before = decoy.position.clone();
const hpBefore = boss.health;

boss.hitClone(decoy, 5, {});
assert.strictEqual(boss.health, hpBefore, 'decoy hit does not damage boss');
assert.ok(!before.equals(decoy.position), 'decoy repositioned');

const real = boss.clones[boss.realIndex];
boss.hitClone(real, 5, {});
assert.strictEqual(boss.health, hpBefore - 5, 'real clone takes damage');

console.log('mirror mirage AI test passed');
