import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }) };

const { state, resetGame } = await import('../modules/state.js');
const { updateProjectiles3d } = await import('../modules/projectilePhysics3d.js');
const { uvToSpherePos } = await import('../modules/utils.js');

resetGame(false);
const radius = 1;
const width = 2048;
const height = 1024;

const startPos = uvToSpherePos(0.5, 0.5, radius);
const enemyPos = uvToSpherePos(0.55, 0.55, radius);

state.effects.push({
  type: 'seeking_shrapnel',
  position: startPos.clone(),
  velocity: new THREE.Vector3(0, 0.05, 0)
});

state.enemies.push({ position: enemyPos.clone(), r: 10, isFriendly: false, hp: 10 });

const proj = state.effects[0];
const targetDir = enemyPos.clone().sub(startPos).normalize();
const initialDot = proj.velocity.clone().normalize().dot(targetDir);

updateProjectiles3d(radius, width, height);

const newDot = proj.velocity.clone().normalize().dot(targetDir);
assert(newDot > initialDot, 'projectile turned toward target');

console.log('homing projectile test passed');

