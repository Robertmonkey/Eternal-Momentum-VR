import assert from 'assert';
import * as THREE from 'three';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { state, resetGame } = await import('../modules/state.js');
const { updateEnemies3d } = await import('../modules/enemyAI3d.js');
const { uvToSpherePos } = await import('../modules/utils.js');

resetGame(false);

const radius = 1;
const width = 2048;
const height = 1024;

state.player.position.copy(uvToSpherePos(0.5, 0, radius));
const startPos = uvToSpherePos(0, 0.25, radius);
state.enemies.push({ position: startPos.clone(), speed: 1 });

updateEnemies3d(radius, width, height);

const enemy = state.enemies[0];
assert(!enemy.position.equals(startPos), 'enemy position updated');

console.log('enemyAI3d test passed');
