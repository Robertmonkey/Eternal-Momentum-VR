import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { SwarmLinkAI } from '../modules/agents/SwarmLinkAI.js';
import { state } from '../modules/state.js';

const ARENA_RADIUS = 50;

test('Swarm Link tail segments remain attached and on sphere', () => {
  const originalPos = state.player.position.clone();
  state.player.position.set(100, 0, 0); // keep player far to avoid damage logic
  const boss = new SwarmLinkAI();
  const start = new THREE.Vector3(0, ARENA_RADIUS, 0);
  boss.position.copy(start);
  boss.tailSegments.forEach(seg => seg.position.copy(start));

  // Move the head to a new position and update tail
  const newPos = new THREE.Vector3(ARENA_RADIUS, 0, 0);
  boss.position.copy(newPos);
  const initialDistance = boss.tailSegments[0].position.distanceTo(newPos);
  boss.update(16);

  const firstSeg = boss.tailSegments[0];
  assert.ok(firstSeg.position.distanceTo(newPos) < initialDistance,
    'first segment should move toward head');
  const worldPos = firstSeg.mesh.getWorldPosition(new THREE.Vector3());
  assert.ok(worldPos.distanceTo(firstSeg.position) < 1e-6, 'mesh should match segment position');
  assert.ok(Math.abs(firstSeg.position.length() - ARENA_RADIUS) < 1e-3, 'segment stays on sphere');

  state.player.position.copy(originalPos);
});
