import test from 'node:test';
import assert from 'node:assert/strict';
import { BaseAgent } from '../modules/BaseAgent.js';
import { state } from '../modules/state.js';
import { initGameHelpers } from '../modules/gameHelpers.js';

initGameHelpers({ addEssence: amt => { state.player.essence += amt; } });

test('enemy death grants essence and removes from state', () => {
  state.player.essence = 0;
  state.enemies.length = 0;
  const enemy = new BaseAgent();
  state.enemies.push(enemy);
  enemy.die();
  assert.equal(state.player.essence, 20);
  assert.ok(!state.enemies.includes(enemy));
});

test('boss death grants more essence', () => {
  state.player.essence = 0;
  state.enemies.length = 0;
  const boss = new BaseAgent();
  boss.boss = true;
  state.enemies.push(boss);
  boss.die();
  assert.equal(state.player.essence, 300);
  assert.ok(!state.enemies.includes(boss));
});
