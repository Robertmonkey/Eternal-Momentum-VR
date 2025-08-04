import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { state } from '../modules/state.js';
import { updateEffects3d } from '../modules/projectilePhysics3d.js';

const ARENA_RADIUS = 50;

test('syphon core effect pulls nearby pickups', () => {
  // Reset state
  state.pickups = [{ position: new THREE.Vector3(0, 0, 10), r: 0.5 }];
  state.effects = [{
    type: 'syphon_cone',
    source: state.player,
    direction: new THREE.Vector3(0, 0, 1),
    startTime: Date.now() - 1000,
    endTime: Date.now() - 1,
  }];
  state.player.position = new THREE.Vector3(0, 0, 0);

  updateEffects3d(ARENA_RADIUS);

  assert.equal(state.effects.length, 0);
  assert.equal(state.pickups[0].isSeeking, true);
});

test('syphon cone from boss tracks player direction', () => {
  const boss = { position: new THREE.Vector3(0, 0, 0), boss: true };
  state.player.position = new THREE.Vector3(0, 0, -10);
  const effect = {
    type: 'syphon_cone',
    source: boss,
    direction: new THREE.Vector3(0, 0, 1),
    startTime: Date.now(),
    endTime: Date.now() + 1000,
  };
  state.effects = [effect];

  updateEffects3d(ARENA_RADIUS);

  const expected = state.player.position.clone().sub(boss.position).normalize();
  assert.ok(effect.direction.angleTo(expected) < 1e-6);
});
