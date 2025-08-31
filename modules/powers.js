import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import * as utils from './utils.js';
import * as Cores from './cores.js';
import { gameHelpers } from './gameHelpers.js';
import { playerHasCore, applyPlayerHeal } from './helpers.js';
import { getPrimaryController } from './scene.js';
import { VR_PROJECTILE_SPEED_SCALE } from './config.js';

const ARENA_RADIUS = 50; // Should match the radius in scene.js

export const powers = {
  shield:{
    emoji:"🛡️",
    desc:"Blocks damage for a duration.",
    apply:() => {
      let duration = 6000;
      const talentRank = state.player.purchasedTalents.get('aegis-shield');
      if (talentRank) {
          duration += talentRank * 1500;
      }

      const startTime = Date.now();
      const shieldEndTime = startTime + duration;
      state.player.shield = true;
      state.player.shield_end_time = shieldEndTime;
      gameHelpers.addStatusEffect('Shield', '🛡️', duration);

      // Queue a visual effect handled by updateEffects3d()
      state.effects.push({ type: 'shield_activation', startTime, endTime: shieldEndTime });

      setTimeout(()=> {
          if(state.player.shield_end_time <= shieldEndTime){
              state.player.shield=false;
              if(state.player.purchasedTalents.has('aegis-retaliation')){
                  state.effects.push({ type: 'shockwave', caster: state.player, position: state.player.position.clone(), maxRadius: 15, speed: 60, damage: 0 });
                  gameHelpers.play('shockwaveSound');
              }
          }
      }, duration);
    }
  },
  heal:{emoji:"❤️",desc:"+30 HP",apply:()=>{
      applyPlayerHeal(30);
      gameHelpers.play('pickupSound');
      const now = Date.now();
      state.effects.push({ type: 'heal_sparkle', position: state.player.position.clone(), startTime: now, endTime: now + 800 });
  }},
  shockwave:{emoji:"💥",desc:"Expanding wave damages enemies.",apply:(options = {})=>{
      const { damageModifier = 1.0, origin = state.player } = options;
      let speed = 30;
      let radius = ARENA_RADIUS * 1.5;
      let damage = (((state.player.berserkUntil > Date.now()) ? 30 : 15) * state.player.talent_modifiers.damage_multiplier) * damageModifier;
      state.effects.push({ type: 'shockwave', caster: origin, position: origin.position.clone(), maxRadius: radius, speed: speed, startTime: Date.now(), hitEnemies: new Set(), damage: damage });
      gameHelpers.play('shockwaveSound');
  }},
  missile:{
    emoji:"🎯",
    desc:"AoE explosion damages nearby.",
    apply:(options = {})=>{
      const { damageModifier = 1.0, origin = state.player } = options;
      gameHelpers.play('shockwaveSound');
      let damage = (((state.player.berserkUntil > Date.now()) ? 20 : 10) * state.player.talent_modifiers.damage_multiplier) * damageModifier;
      let radius = 15; // World units
      const radiusTalentRank = state.player.purchasedTalents.get('stellar-detonation');
      if(radiusTalentRank) radius *= (1 + (radiusTalentRank * 0.15));

      const controller = getPrimaryController();
      const startPos = new THREE.Vector3();

      // Aim using the cursor direction so the fireball travels toward the
      // crosshair on the arena surface rather than shooting through the
      // sphere's centre.  Fallback to a forward direction if the cursor
      // vector is unavailable.
      const aimDir = state.cursorDir?.clone().normalize() || new THREE.Vector3();
      if (aimDir.lengthSq() === 0) aimDir.set(0, 0, -1);

      // Spawn the fireball from the controller tip when available; otherwise
      // start from the player's position.
      if (controller) {
          controller.getWorldPosition(startPos);
          startPos.add(aimDir.clone().multiplyScalar(0.1));
      } else {
          startPos.copy(origin.position);
      }

      // Direct the projectile toward the cursor's point on the arena.
      const targetPos = aimDir.clone().multiplyScalar(ARENA_RADIUS);
      const velocity = targetPos.clone().sub(startPos).normalize().multiplyScalar(VR_PROJECTILE_SPEED_SCALE);

      state.effects.push({
          type: 'fireball',
          caster: origin,
          position: startPos,
          velocity: velocity,
          target: targetPos,
          damage: damage,
          explodeRadius: radius
      });
      utils.triggerScreenShake(200, 8);

      if(state.player.purchasedTalents.has('homing-shrapnel')){
          const baseDir = state.cursorDir.clone();
          const normal = origin.position.clone().normalize();
          for(let i = 0; i < 3; i++) {
              const angleOffset = (i - 1) * 0.5; // radians
              const finalDir = utils.rotateAroundNormal(baseDir, normal, angleOffset);
              state.effects.push({
                  type: 'seeking_shrapnel',
                  position: origin.position.clone(),
                  velocity: finalDir.multiplyScalar(0.4),
                  r: 0.3, // World units
                  damage: 5 * state.player.talent_modifiers.damage_multiplier,
                  lifeEnd: Date.now() + 3000,
                  targetIndex: i
                });
          }
      }
    }
  },
  chain:{
    emoji:"⚡",
    desc:"Chain lightning hits multiple targets.",
    apply:(options = {})=>{
      const { damageModifier = 1.0, origin = state.player } = options;
      gameHelpers.play('chainSound');
      let chainCount = 6 + (state.player.purchasedTalents.get('arc-cascade') || 0);

      const targets = [];
      let currentTarget = origin;
      for (let i = 0; i < chainCount; i++) {
          let closest = null;
          let minDist = Infinity;
          state.enemies.forEach(e => {
              if (!e.isFriendly && !targets.includes(e)) {
                  const dist = e.position.distanceTo(currentTarget.position);
                  if (dist < minDist) {
                      minDist = dist;
                      closest = e;
                  }
              }
          });
          if (closest) {
              targets.push(closest);
              currentTarget = closest;
          } else { break; }
      }
      let damage = (((state.player.berserkUntil > Date.now()) ? 30 : 15) * state.player.talent_modifiers.damage_multiplier) * damageModifier;
      state.effects.push({ type: 'chain_lightning', targets: targets, caster: origin, damage: damage, startTime: Date.now(), durationPerLink: 80 });
    }
  },
  gravity:{
    emoji:"🌀",
    desc:"Pulls enemies towards the center.",
    apply:()=>{
        gameHelpers.play('gravitySound'); 
        state.gravityActive = true; 
        state.gravityEnd = Date.now() + 1000; 
        
        if (state.player.purchasedTalents.has('temporal-collapse')) {
            setTimeout(() => {
                if(state.gameOver) return;
                state.effects.push({ 
                    type: 'slow_zone', 
                    position: new THREE.Vector3(0,0,0), // Center of sphere
                    radius: 15, // World units
                    endTime: Date.now() + 4000 
                });
            }, 1000);
        }
    }
  },
  speed:{emoji:"🚀",desc:"Speed Boost for 5s",apply:()=>{
      state.player.speed *= 1.5; 
      gameHelpers.addStatusEffect('Speed Boost', '🚀', 5000); 
      setTimeout(() => { state.player.speed /= 1.5 }, 5000);
  }},
  freeze:{emoji:"🧊",desc:"Freeze enemies for 4s",apply:()=>{
      state.enemies.forEach(e=>{
          if (e.kind === 'fractal_horror' || e.isFriendly) return;
          if (e.frozen) return;
          e.frozen=true;
          e.wasFrozen = true;
          e.frozenUntil = Date.now() + 4000;
          
          if (playerHasCore('basilisk')) {
            e.petrifiedUntil = Date.now() + 3000;
          }
      });
  }},
  decoy:{emoji:"🔮",desc:"Decoy lasts 5s",apply:()=>{
    const isMobile = state.player.purchasedTalents.has('quantum-duplicate');
    
    const offset = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(5);
    const pos = state.player.position.clone().add(offset).normalize().multiplyScalar(ARENA_RADIUS);

    state.decoys.push({
        position: pos,
        r: 0.5,
        expires: Date.now() + 5000,
        isTaunting: true,
        isMobile: isMobile,
        hp: 1,
        fromCore: false
    });
    gameHelpers.play('magicDispelSound');
  }},
  stack:{emoji:"🧠",desc:"Double next power-up",apply:()=>{ state.stacked=true; gameHelpers.addStatusEffect('Stacked', '🧠', 60000); }},
  score: {emoji: "💎", desc: "Gain a large amount of Essence.", apply: () => { gameHelpers.addEssence(200 + state.player.level * 10); }},
  repulsion: {emoji: "🖐️", desc: "Creates a 5s push-away field.", apply: () => {
      const hasKineticOverload = state.player.purchasedTalents.has('kinetic-overload');
      state.effects.push({
          type: 'repulsion_field',
          position: state.player.position.clone(),
          radius: 15,
          startTime: Date.now(),
          endTime: Date.now() + 5000,
          isOverloaded: hasKineticOverload,
          hitEnemies: new Set()
      });
      gameHelpers.play('shockwaveSound');
  }},
  orbitalStrike: {emoji: "☄️", desc: "Calls 3 meteors on random enemies", apply:(options = {}) => {
      const { damageModifier = 1.0, origin = state.player } = options;
      const availableTargets = state.enemies.filter(e => !e.isFriendly);
      const tracking = state.player.purchasedTalents.has('targeting-algorithm');
      for (let i = 0; i < 3; i++) {
          if (availableTargets.length > 0) {
              const targetIndex = Math.floor(Math.random() * availableTargets.length);
              const target = availableTargets.splice(targetIndex, 1)[0];
              state.effects.push({
                  type: 'orbital_target',
                  target: target,
                  position: target.position.clone(),
                  startTime: Date.now(),
                  caster: origin,
                  damageModifier: damageModifier,
                  track: tracking
              });
            }
        }
    }},
  black_hole: {emoji: "⚫", desc: "Pulls and damages enemies for 4s", apply:(options = {}) => {
      const { damageModifier = 1.0, origin = state.player } = options;
      let damage = (((state.player.berserkUntil > Date.now()) ? 6 : 3) * state.player.talent_modifiers.damage_multiplier) * damageModifier;
      let radius = 11; // World units (~350px in the original game)
      const blackHoleEffect = {
          type: 'black_hole',
          position: state.cursorDir.clone().multiplyScalar(ARENA_RADIUS),
          radius: 1, maxRadius: radius,
          damageRate: 200, lastDamage: new Map(),
          startTime: Date.now(),
          duration: 4000,
          endTime: Date.now() + 4000,
          damage: damage,
          caster: origin
      };
      state.effects.push(blackHoleEffect);
      gameHelpers.play('gravitySound');

      if (playerHasCore('time_eater')) {
          setTimeout(() => {
              if (state.gameOver) return;
              if (state.effects.includes(blackHoleEffect)) {
                  state.effects.push({ type: 'dilation_field', position: blackHoleEffect.position.clone(), r: radius, endTime: Date.now() + 5000 });
              }
          }, 4000);
      }
  }},
  berserk: {emoji: "💢", desc: "8s: Deal 2x damage", apply:()=>{ state.player.berserkUntil = Date.now() + 8000; gameHelpers.addStatusEffect('Berserk', '💢', 8000); }},
  ricochetShot: {emoji: "🔄", desc: "Fires a shot that bounces 6 times", apply:(options = {}) => {
      const { damageModifier = 1.0, origin = state.player } = options;
      let bounceCount = 6;
      const damage = 10 * damageModifier;
      const velocity = state.cursorDir.clone().multiplyScalar(0.8);
      state.effects.push({
          type: 'ricochet_projectile',
          position: origin.position.clone(),
          velocity: velocity,
          r: 0.3,
          damage: damage,
          bounces: bounceCount,
          initialBounces: bounceCount,
          hitEnemies: new Set(),
          caster: origin
      });
    }},
  bulletNova: {emoji: "💫", desc: "Unleashes a spiral of bullets", apply:(options = {})=>{
      const { damageModifier = 1.0, origin = state.player } = options;
      const novaPulsar = state.player.purchasedTalents.has('nova-pulsar');
      state.effects.push({ type: 'nova_controller', startTime: Date.now(), duration: 2000, lastShot: 0, angle: Math.random() * Math.PI * 2, caster: origin, damageModifier: damageModifier, novaPulsar });
    }},
};

export const offensivePowers = ['shockwave', 'missile', 'chain', 'orbitalStrike', 'ricochetShot', 'bulletNova', 'black_hole'];

export function usePower(powerKey, isFreeCast = false, options = {}){
  const power = powers[powerKey];
  if (!power) return;

  const { play, addStatusEffect } = gameHelpers;
  const queueType = offensivePowers.includes(powerKey) ? 'offensive' : 'defensive';

  const applyArgs = [options];
  
  if (queueType === 'offensive' && playerHasCore('temporal_paradox')) {
      const echoEffect = { 
          type: 'paradox_player_echo', 
          position: state.player.position.clone(), 
          powerKey: powerKey,
          cursorDir: state.cursorDir.clone(),
          startTime: Date.now()
      };
      state.effects.push(echoEffect);
      play('phaseShiftSound');
  }

  if (queueType === 'defensive') {
      Cores.handleCoreOnDefensivePower(powerKey, gameHelpers);
  }

  let stackedEffect = state.stacked;
  if (!isFreeCast && !stackedEffect && state.player.purchasedTalents.has('preordinance') && !state.player.preordinanceUsed) {
      stackedEffect = true;
      state.player.preordinanceUsed = true;
      addStatusEffect('Preordained', '🎲', 2000);
  }

  power.apply(...applyArgs);
  if (queueType === 'offensive' && gameHelpers.pulseControllers) {
      gameHelpers.pulseControllers(25, 0.7);
      setTimeout(() => gameHelpers.pulseControllers(35, 0.4), 40);
  }

  if (stackedEffect && powerKey !== 'stack') {
      power.apply(...applyArgs);
      if (queueType === 'offensive' && gameHelpers.pulseControllers) {
          gameHelpers.pulseControllers(25, 0.7);
          setTimeout(() => gameHelpers.pulseControllers(35, 0.4), 40);
      }
      if(state.stacked) {
          state.stacked = false;
          state.player.statusEffects = state.player.statusEffects.filter(e => e.name !== 'Stacked');
      }
  }
  
  if (!isFreeCast && powerKey !== 'stack' && playerHasCore('singularity') && Math.random() < 0.05) {
      setTimeout(() => {
           if (state.gameOver) return;
           power.apply(...applyArgs);
           addStatusEffect('Duplicated', '✨', 2000);
           play('shaperAttune');
      }, 150);
  }
}
