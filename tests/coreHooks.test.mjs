import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

// minimal DOM stubs
global.window = { gameHelpers: {} };
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const CoreManager = await import('../modules/CoreManager.js');
const { _setTestHooks } = CoreManager;
const { BaseAgent } = await import('../modules/BaseAgent.js');

let dealt = 0;
let death = 0;
_setTestHooks({
  onDamageDealt: () => { dealt++; },
  onEnemyDeath: () => { death++; }
});

const agent = new BaseAgent({ health: 5 });
agent.takeDamage(2, true);
assert.strictEqual(dealt, 1, 'damage dealt hook');
assert.strictEqual(death, 0, 'no death yet');
agent.takeDamage(3, true);
assert.strictEqual(death, 1, 'death hook');

console.log('core hooks test passed');
