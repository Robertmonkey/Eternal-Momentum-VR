import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { AnnihilatorAI } = await import('../modules/agents/AnnihilatorAI.js');

const boss = new AnnihilatorAI(1);
boss.position.set(0,0,0);
const player = { position: new THREE.Vector3(1,0,0), health: 1000, alive: true };

// trigger charging
boss.timer = 12.1;
boss.update(0.016, player, { play:()=>{} });
assert.strictEqual(boss.state, 'CHARGING', 'boss started charging');

boss.timer = 4.1;
boss.update(0.016, player, { play:()=>{} });
assert.strictEqual(boss.state, 'IDLE', 'boss fired beam');
assert.ok(player.health < 1000, 'player damaged');
console.log('annihilator AI test passed');
