import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };


const { EpochEnderAI } = await import('../modules/agents/EpochEnderAI.js');

const boss = new EpochEnderAI(1);
const origPos = boss.position.clone();
const origHp = boss.health;

boss.damageWindow = 101;
boss.update(0.016, null, {}, { play: () => {} });

assert.ok(boss.rewindCooldown > Date.now(), 'rewind cooldown set');
assert.ok(boss.position.equals(origPos), 'position rewound');
assert.strictEqual(boss.health, origHp, 'health restored');
console.log('epoch ender AI test passed');
