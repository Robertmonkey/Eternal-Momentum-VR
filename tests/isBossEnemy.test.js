import test from 'node:test';
import assert from 'node:assert/strict';
import { isBossEnemy } from '../modules/UIManager.js';
import { bossData } from '../modules/bosses.js';

test('isBossEnemy matches by kind', () => {
  const enemy = { kind: bossData[0].id };
  assert.equal(isBossEnemy(enemy), true);
});

test('isBossEnemy matches by id', () => {
  const enemy = { id: bossData[1].id };
  assert.equal(isBossEnemy(enemy), true);
});

test('isBossEnemy rejects normal enemy', () => {
  const enemy = { id: 'not_a_boss' };
  assert.equal(isBossEnemy(enemy), false);
});
