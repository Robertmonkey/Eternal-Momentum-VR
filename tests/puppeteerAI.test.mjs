import assert from 'assert';
import * as THREE from '../vendor/three.module.js';

global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ getContext: () => ({}) })
};

const { PuppeteerAI } = await import('../modules/agents/PuppeteerAI.js');

const boss = new PuppeteerAI(1);
const enemies = [
  { boss:false, isPuppet:false, position:new THREE.Vector3(1,0,0) },
  { boss:false, isPuppet:false, position:new THREE.Vector3(-1,0,0) }
];

boss.timer = 4.1;
boss.update(0.016, enemies, { play:()=>{}, spawnLightning:()=>{} });
const puppeted = enemies.some(e => e.isPuppet);
assert.ok(puppeted, 'enemy converted');
console.log('puppeteer AI test passed');
