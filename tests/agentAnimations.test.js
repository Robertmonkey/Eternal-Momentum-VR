import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

const { BaseAgent } = await import('../modules/BaseAgent.js');
const { updateAgentAnimation, notifyAgentDamaged, resetAgentAnimation } = await import('../modules/agentAnimations.js');

test('updateAgentAnimation applies idle bob, spin, and scale pulses', () => {
  const material = new THREE.MeshStandardMaterial({
    color: 0x4488ff,
    emissive: 0x001133,
    emissiveIntensity: 0.3,
  });
  const model = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), material);
  const agent = new BaseAgent({ model, radius: 1 });
  agent.position.set(0, 0, 50);

  const startPosZ = model.position.z;
  const startRotY = model.rotation.y;
  const startScaleX = model.scale.x;

  for (let i = 0; i < 10; i++) {
    updateAgentAnimation(agent, 16);
  }

  assert.ok(Math.abs(model.position.z - startPosZ) > 1e-4, 'agent bobbed along surface normal');
  assert.notEqual(model.rotation.y, startRotY, 'model spun around vertical axis');
  assert.ok(Math.abs(model.scale.x - startScaleX) > 1e-4, 'scale pulsed to mimic breathing');
});

test('notifyAgentDamaged triggers flash that fades back to base materials', () => {
  const material = new THREE.MeshStandardMaterial({
    color: 0xaa2222,
    emissive: 0x220000,
    emissiveIntensity: 0.4,
  });
  const model = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), material);
  const agent = new BaseAgent({ model, radius: 1 });
  agent.position.set(0, 0, 50);

  const baseIntensity = material.emissiveIntensity;
  updateAgentAnimation(agent, 16);
  const baseColor = material.color.getHex();

  notifyAgentDamaged(agent, 5);
  updateAgentAnimation(agent, 16);
  const flashIntensity = material.emissiveIntensity;
  const flashColor = material.color.getHex();

  assert(flashIntensity > baseIntensity, 'emissive boosted during damage flash');
  assert.notEqual(flashColor, baseColor, 'damage flash tints the color toward white');

  for (let i = 0; i < 80; i++) {
    updateAgentAnimation(agent, 32);
  }

  assert(flashIntensity - material.emissiveIntensity > 0.05, 'flash intensity decays over time');
  assert.equal(material.color.getHex(), baseColor, 'base color restored after flash');

  resetAgentAnimation(agent);
  assert.equal(material.emissiveIntensity, baseIntensity, 'reset returns emissive intensity to base');
});
