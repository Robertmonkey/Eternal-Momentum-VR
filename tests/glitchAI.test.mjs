import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { GlitchAI } = await import('../modules/agents/GlitchAI.js');

const boss = new GlitchAI(1);
const playerState = { controlsInverted:false };
let zoneAdded = false;
const helpers = { addGlitchZone:() => { zoneAdded = true; }, play:()=>{} };

boss.timer = 3.1;
const before = boss.position.clone();
boss.update(0.016, helpers, playerState);
assert.ok(zoneAdded, 'glitch zone added');
assert.ok(!boss.position.equals(before), 'boss teleported');
assert.ok(playerState.controlsInverted, 'controls inverted');
console.log('glitch AI test passed');
