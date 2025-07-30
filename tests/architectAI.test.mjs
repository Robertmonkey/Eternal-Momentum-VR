import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

const { ArchitectAI } = await import('../modules/agents/ArchitectAI.js');

const boss = new ArchitectAI(1);

boss.spawnWalls();
assert.strictEqual(boss.walls.length, 3, 'spawnWalls creates 3 walls');

boss.clearWalls();
assert.strictEqual(boss.walls.length, 0, 'clearWalls removes walls');

boss.update(4, {});
assert.strictEqual(boss.state, 'ATTACKING', 'state transitions after summon');

boss.update(8, {});
assert.strictEqual(boss.state, 'SUMMONING', 'state loops back after attack');

console.log('architect AI test passed');
