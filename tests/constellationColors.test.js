import test from 'node:test';
import assert from 'node:assert/strict';
import { getConstellationColorOfTalent } from '../modules/ascension.js';

// Ensure constellation colors resolve to concrete hex values so VR menu
// mirrors the original 2D color coding.
test('constellation colors resolve CSS variables', () => {
  assert.equal(getConstellationColorOfTalent('exo-weave-plating'), '#00ffff');
  assert.equal(getConstellationColorOfTalent('high-frequency-emitters'), '#ff8800');
});
