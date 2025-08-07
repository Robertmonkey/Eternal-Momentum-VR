import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { GravityAI } from '../modules/agents/GravityAI.js';
import { state } from '../modules/state.js';

const ARENA_RADIUS = 50;

test('gravity wells remain stable at poles', () => {
  const original = state.player.position.clone();
  state.player.position.set(0, 0, 0);
  state.player.r = 1;
  const boss = new GravityAI();
  boss.position.set(0, 0, ARENA_RADIUS); // place at north pole
  boss.update(16);
  boss.wellObjects.children.forEach(mesh => {
    assert.ok(Number.isFinite(mesh.position.x), 'x should be finite');
    assert.ok(Math.abs(mesh.position.length() - ARENA_RADIUS) < 1e-3,
      'well should remain on arena radius');
  });
  state.player.position.copy(original);
});
