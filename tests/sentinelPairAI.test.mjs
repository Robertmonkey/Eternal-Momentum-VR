import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { SentinelPairAI } = await import('../modules/agents/SentinelPairAI.js');

const a = new SentinelPairAI(1);
const b = new SentinelPairAI(1);
a.partner = b;
b.partner = a;
a.position.set(-0.1, 0, 0);
b.position.set(0.1, 0, 0);
const player = { position: new THREE.Vector3(0,0,0), health:10, r:0.05 };

// simulate update with player in between to trigger damage
a.update(0.1, player, { drawBeam:()=>{} });
assert.ok(player.health < 10, 'beam damaged player');
// damage sharing
a.takeDamage(5, {});
assert.strictEqual(b.health, a.health, 'damage shared');
console.log('sentinel pair AI test passed');
