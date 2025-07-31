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

state.effects.push({ type: 'nova_bullet', x: width/2, y: height/2, dx: 0, dy: -50 });

updateProjectiles3d(radius, width, height);

const proj = state.effects[0];
assert.ok(proj.position instanceof THREE.Vector3, 'position vector set');
assert.ok(proj.velocity instanceof THREE.Vector3, 'velocity vector set');
const start = proj.position.clone();

updateProjectiles3d(radius, width, height);
assert.ok(!proj.position.equals(start), 'projectile moved');

console.log('projectilePhysics3d test passed');
