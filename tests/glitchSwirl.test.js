import test from 'node:test';
import assert from 'node:assert/strict';
import { GlitchAI } from '../modules/agents/GlitchAI.js';
import { initGameHelpers } from '../modules/gameHelpers.js';

// Ensure the Glitch enemy is composed of multiple cubes that animate
// independently of any WebXR context.

test('glitch enemy animates swirling cubes', () => {
  // Provide a minimal gameHelpers implementation to avoid side effects
  initGameHelpers({ play: () => {} });

  const glitch = new GlitchAI();
  // Prevent an immediate teleport during the test
  glitch.lastTeleportTime = Date.now();

  // The Glitch model should be a group with several cube children
  assert.ok(glitch.cubeGroup, 'has cube group');
  assert.ok(glitch.cubeGroup.children.length > 1, 'multiple cubes present');

  const initialRotationY = glitch.cubeGroup.rotation.y;
  glitch.update(16); // advance a single frame
  assert.notEqual(glitch.cubeGroup.rotation.y, initialRotationY, 'rotation updated');
});
