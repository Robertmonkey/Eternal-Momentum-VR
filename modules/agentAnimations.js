import * as THREE from '../vendor/three.module.js';

const WHITE = new THREE.Color(0xffffff);
const UP = new THREE.Vector3(0, 1, 0);

function findPrimaryModel(agent) {
  if (!agent) return null;
  if (agent.model) return agent.model;
  let fallback = null;
  agent.traverse?.((child) => {
    if (fallback || child === agent) return;
    if (child.isMesh || child.isGroup) fallback = child;
  });
  if (fallback) agent.model = fallback;
  return fallback;
}

function buildMaterialCache(model) {
  const cache = new Map();
  if (!model || !model.traverse) return cache;
  model.traverse(child => {
    if (!child.isMesh || !child.material) return;
    const material = child.material;
    cache.set(child.uuid, {
      emissiveIntensity: typeof material.emissiveIntensity === 'number' ? material.emissiveIntensity : 0,
      color: material.color ? material.color.clone() : null,
      emissive: material.emissive ? material.emissive.clone() : null,
    });
  });
  return cache;
}

function createAnimationState(agent) {
  const model = findPrimaryModel(agent);
  if (!model) return null;
  const radius = Math.max(0.5, agent?.r || 1);
  return {
    idlePhase: Math.random() * Math.PI * 2,
    idleSpeed: 0.0015 + Math.random() * 0.0008,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: 0.001 + Math.random() * 0.001,
    scalePhase: Math.random() * Math.PI * 2,
    tiltPhase: Math.random() * Math.PI * 2,
    floatAmplitude: Math.min(2.5, radius * 0.22),
    scaleAmplitude: Math.min(0.25, 0.06 + radius * 0.012),
    tiltAmplitude: 0.2,
    glowBase: 0.1 + radius * 0.015,
    glowAmplitude: 0.25 + radius * 0.02,
    hitFlash: 0,
    hitFlashMax: 260,
    hitFlashBoost: 0.85,
    basePosition: model.position.clone(),
    baseRotation: model.rotation ? model.rotation.clone() : new THREE.Euler(),
    baseScale: model.scale ? model.scale.clone() : new THREE.Vector3(1, 1, 1),
    materialCache: buildMaterialCache(model),
    tempNormal: new THREE.Vector3(),
  };
}

function ensureAnimationState(agent) {
  if (!agent) return null;
  if (!agent.animationState) {
    agent.animationState = createAnimationState(agent);
  }
  return agent.animationState;
}

export function updateAgentAnimation(agent, deltaMs = 16) {
  const model = findPrimaryModel(agent);
  if (!model) return;
  const anim = ensureAnimationState(agent);
  if (!anim) return;

  anim.idlePhase = (anim.idlePhase + anim.idleSpeed * deltaMs) % (Math.PI * 2);
  anim.spin = (anim.spin + anim.spinSpeed * deltaMs) % (Math.PI * 2);
  const scalePulse = 1 + Math.sin(anim.idlePhase * 1.7 + anim.scalePhase) * anim.scaleAmplitude;
  const secondaryPulse = 1 + Math.sin(anim.idlePhase * 1.2 + anim.scalePhase + Math.PI / 4) * anim.scaleAmplitude * 0.8;

  if (model.scale) {
    model.scale.set(
      anim.baseScale.x * scalePulse,
      anim.baseScale.y * secondaryPulse,
      anim.baseScale.z * scalePulse,
    );
  }

  const normal = agent?.position?.lengthSq?.() > 0
    ? anim.tempNormal.copy(agent.position).normalize()
    : anim.tempNormal.copy(UP);
  const floatOffset = normal.multiplyScalar(anim.floatAmplitude * Math.sin(anim.idlePhase + anim.tiltPhase));
  model.position.copy(anim.basePosition).add(floatOffset);

  const tilt = Math.sin(anim.idlePhase * 0.6 + anim.tiltPhase) * anim.tiltAmplitude;
  model.rotation.set(
    anim.baseRotation.x + tilt,
    anim.baseRotation.y + anim.spin,
    anim.baseRotation.z + tilt * 0.4,
  );

  const idleGlow = anim.glowBase + Math.max(0, Math.sin(anim.idlePhase * 1.4 + anim.scalePhase)) * anim.glowAmplitude;
  if (anim.hitFlash > 0) {
    anim.hitFlash = Math.max(0, anim.hitFlash - deltaMs);
  }
  const flashRatio = anim.hitFlash > 0 ? anim.hitFlash / anim.hitFlashMax : 0;
  const totalGlow = idleGlow + flashRatio * anim.hitFlashBoost;

  model.traverse(child => {
    if (!child.isMesh || !child.material) return;
    const cache = anim.materialCache.get(child.uuid);
    if (!cache) return;
    const material = child.material;
    if (typeof material.emissiveIntensity === 'number') {
      material.emissiveIntensity = cache.emissiveIntensity + totalGlow;
    }
    if (cache.emissive && material.emissive) {
      material.emissive.copy(cache.emissive);
      if (flashRatio > 0) {
        material.emissive.lerp(WHITE, flashRatio * 0.6);
      }
    }
    if (cache.color && material.color) {
      material.color.copy(cache.color);
      if (flashRatio > 0) {
        material.color.lerp(WHITE, flashRatio * 0.35);
      }
    }
  });
}

export function notifyAgentDamaged(agent, severity = 1) {
  const model = findPrimaryModel(agent);
  if (!model) return;
  const anim = ensureAnimationState(agent);
  if (!anim) return;
  const magnitude = Math.max(0.1, severity);
  anim.hitFlash = Math.min(anim.hitFlashMax, anim.hitFlash + magnitude * 18);
}

export function resetAgentAnimation(agent) {
  const anim = agent?.animationState;
  const model = findPrimaryModel(agent);
  if (!anim || !model) return;
  if (model.scale) {
    model.scale.copy(anim.baseScale);
  }
  model.position.copy(anim.basePosition);
  model.rotation.copy(anim.baseRotation);
  model.traverse(child => {
    if (!child.isMesh || !child.material) return;
    const cache = anim.materialCache.get(child.uuid);
    if (!cache) return;
    const material = child.material;
    if (typeof material.emissiveIntensity === 'number') {
      material.emissiveIntensity = cache.emissiveIntensity;
    }
    if (cache.emissive && material.emissive) {
      material.emissive.copy(cache.emissive);
    }
    if (cache.color && material.color) {
      material.color.copy(cache.color);
    }
  });
  anim.hitFlash = 0;
}
