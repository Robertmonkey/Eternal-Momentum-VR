// BaseAgent.js - foundational 3D agent class
// Import a local copy of three.js instead of relying on a global THREE
import * as THREE from '../vendor/three.module.js';
import * as CoreManager from './CoreManager.js';
import { state } from './state.js';
import { gameHelpers as globalGameHelpers } from './gameHelpers.js';
import { createBossModel } from './bossModelFactory.js';
import { spawnBossAbilityEffect } from './bossAbilityEffects.js';
import { notifyAgentDamaged } from './agentAnimations.js';

export class BaseAgent extends THREE.Group {
  constructor(options = {}) {
    super();
    const { health = 1, model = null, color = null, radius = 0.65, kind = null } = options;
    // Store the agent's base collision radius so the game loop can scale it
    // uniformly. Having a defined radius ensures accurate hit detection for
    // both default sphere agents and those using custom models.
    this.r = radius;
    this.kind = kind;
    this.maxHealth = health;
    this.maxHP = health;
    this.health = health;
    this.alive = true;
    if (model) {
      this.add(model);
      this.model = model;
    } else {
      const autoModel = createBossModel(kind, color, radius);
      if (autoModel) {
        this.add(autoModel);
        this.model = autoModel;
      } else if (color !== null) {
        const material = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.5,
        });
        const geometry = new THREE.SphereGeometry(radius, 32, 16);
        this.model = new THREE.Mesh(geometry, material);
        this.add(this.model);
      }
    }
  }

  update(/* delta, player */) {
    // subclasses override
  }

  takeDamage(amount = 0, fromPlayer = false, gameHelpers = null) {
    if (!this.alive) return;
    if (!gameHelpers) gameHelpers = {};
    if (amount > 0) notifyAgentDamaged(this, amount);
    if (this.petrifiedUntil && this.petrifiedUntil > Date.now()) {
      amount *= 1.2;
    }
    this.health -= amount;
    if (fromPlayer) {
      CoreManager.onDamageDealt(this, gameHelpers);
    }
    if (this.health <= 0) this.die(gameHelpers);
  }

  die(gameHelpers = null) {
    if (!gameHelpers) gameHelpers = globalGameHelpers;
    this.alive = false;
    if (gameHelpers && typeof gameHelpers.addEssence === 'function') {
      gameHelpers.addEssence(this.boss ? 300 : 20);
    }
    CoreManager.onEnemyDeath(this, gameHelpers);
    const idx = state.enemies.indexOf(this);
    if (idx !== -1) state.enemies.splice(idx, 1);
    if (this.parent) this.parent.remove(this);
  }

  triggerAbilityAnimation(stageOffset = 0, duration = 1000) {
    const stage = (this.bossIndex || 1) + stageOffset;
    spawnBossAbilityEffect(this, stage, duration);
  }
}
