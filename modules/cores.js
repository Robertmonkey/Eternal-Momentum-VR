import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import * as utils from './utils.js';
import { bossData } from './bosses.js';
import { showUnlockNotification } from './UIManager.js';
import { usePower } from './powers.js';
import { playerHasCore } from './helpers.js';
import { gameHelpers } from './gameHelpers.js';

const ARENA_RADIUS = 50;

/**
 * Activate the currently equipped core's active ability.
 */
export function activateCorePower() {
    const now = Date.now();
    const coreId = state.player.equippedAberrationCore;
    if (!coreId) return;

    const coreState = state.player.talent_states.core_states[coreId] = state.player.talent_states.core_states[coreId] || {};
    if (now < (coreState.cooldownUntil || 0)) {
        gameHelpers.play('talentError');
        return;
    }
    
    let abilityTriggered = false;

    switch (coreId) {
        case 'juggernaut': {
            coreState.cooldownUntil = now + 8000;
            gameHelpers.addStatusEffect('Stunned', '🛑', 1000);
            gameHelpers.addStatusEffect('Charging', '🔋', 2700);
            state.effects.push({
                type: 'player_charge_indicator',
                source: state.player,
                startTime: now,
                duration: 1000,
                radius: 2, // World units
            });
            gameHelpers.play('chargeUpSound');

            setTimeout(() => {
                if (state.gameOver) return;
                state.effects.push({
                    type: 'juggernaut_player_charge',
                    startTime: Date.now(),
                    duration: 1700,
                    direction: state.cursorDir.clone(),
                    hitEnemies: new Set(),
                    bouncesLeft: 2,
                });
                gameHelpers.play('chargeDashSound');
            }, 1000);
            abilityTriggered = true;
            break;
        }
        case 'architect': {
            coreState.cooldownUntil = now + 15000;
            gameHelpers.play('architectBuild');
            const ringRadius = 10; // World units
            const pillarCount = 16;
            const centerVec = state.player.position.clone().normalize();
            const basisA = new THREE.Vector3().crossVectors(centerVec, new THREE.Vector3(0, 1, 0)).normalize();
            const basisB = new THREE.Vector3().crossVectors(centerVec, basisA).normalize();

            for (let i = 0; i < pillarCount; i++) {
                const pAngle = (i / pillarCount) * 2 * Math.PI;
                const offset = basisA.clone().multiplyScalar(Math.cos(pAngle) * ringRadius)
                    .add(basisB.clone().multiplyScalar(Math.sin(pAngle) * ringRadius));
                const pillarPos = state.player.position.clone().add(offset).normalize().multiplyScalar(ARENA_RADIUS);
                
                state.effects.push({
                    type: 'architect_pillar',
                    position: pillarPos,
                    radius: 1, // World units
                    endTime: now + 10000,
                });
            }
            abilityTriggered = true;
            break;
        }
        case 'annihilator': {
          coreState.cooldownUntil = now + 25000;
          state.effects.push({ type: 'player_annihilation_beam', startTime: now, endTime: now + 4000 });
          gameHelpers.play('powerSirenSound');
          abilityTriggered = true;
          break;
        }
        case 'looper': {
          coreState.cooldownUntil = now + 10000;
          gameHelpers.addStatusEffect('Warping', '🌀', 1000);
          gameHelpers.addStatusEffect('Stunned', '🌀', 1000);
          state.effects.push({
            type: 'teleport_locus',
            startTime: now,
            duration: 1000,
            endTime: now + 1000,
          });
          gameHelpers.play('chargeUpSound');
          abilityTriggered = true;
          break;
        }
    }
}

/**
 * Apply all passive core behaviours every frame.
 */
export function applyCoreTickEffects() {
    const now = Date.now();

    // Pantheon rotation
    if (playerHasCore('pantheon')) {
        const pantheonState = state.player.talent_states.core_states.pantheon;
        if (now > (pantheonState.lastCycleTime || 0) + 10000) {
            pantheonState.lastCycleTime = now;
            const unlockedCores = Array.from(state.player.unlockedAberrationCores);
            const activeBuffIds = state.player.activePantheonBuffs.map(b => b.coreId);
            const availablePool = unlockedCores.filter(id => id !== 'pantheon' && !activeBuffIds.includes(id));
            if (availablePool.length > 0) {
                const newCoreId = availablePool[Math.floor(Math.random() * availablePool.length)];
                const coreData = bossData.find(b => b.id === newCoreId);
                state.player.activePantheonBuffs.push({ coreId: newCoreId, endTime: now + 30000 });
                showUnlockNotification(`Pantheon Attuned: ${coreData.name}`, 'Aspect Gained');
                gameHelpers.play('shaperAttune');
            }
        }
    }
    state.player.activePantheonBuffs = state.player.activePantheonBuffs.filter(buff => now < buff.endTime);

    // Vampire passive regen
    if (playerHasCore('vampire') && now - state.player.talent_states.phaseMomentum.lastDamageTime > 5000) {
        if (state.player.health < state.player.maxHealth) {
            state.player.health = Math.min(state.player.maxHealth, state.player.health + (0.02 * state.player.maxHealth / 60)); // Heal per frame
        }
    }

    // Swarm passive tail
    if (playerHasCore('swarm')) {
        const swarmState = state.player.talent_states.core_states.swarm;
        if (!swarmState.tail) swarmState.tail = [];
        let leadSegmentPos = state.player.position;
        swarmState.tail.forEach(segmentPos => {
            segmentPos.lerp(leadSegmentPos, 0.2);
            leadSegmentPos = segmentPos;
            state.enemies.forEach(e => {
                if (!e.isFriendly && e.position.distanceTo(segmentPos) < e.r + 0.4) {
                    e.hp -= 0.2 * state.player.talent_modifiers.damage_multiplier;
                }
            });
        });
    }

    // Gravity passive pulse
    if (playerHasCore('gravity')) {
        const gravityState = state.player.talent_states.core_states.gravity;
        if (now > (gravityState.lastPulseTime || 0) + 5000) {
            gravityState.lastPulseTime = now;
            state.effects.push({ 
                type: 'player_pull_pulse', 
                position: state.player.position.clone(), 
                maxRadius: 30, // World units
                startTime: now, 
                duration: 500 
            });
            gameHelpers.play('gravitySound');
        }
    }
    
    // Epoch Ender history tracking
    if (playerHasCore('epoch_ender')) {
        const epochState = state.player.talent_states.core_states.epoch_ender;
        if (!epochState.history) epochState.history = [];
        if (!epochState.lastSnapshotTime || now > epochState.lastSnapshotTime + 200) {
            epochState.lastSnapshotTime = now;
            epochState.history.unshift({ position: state.player.position.clone(), health: state.player.health });
            if (epochState.history.length > 30) epochState.history.pop();
        }
    }
}

/**
 * Handle core effects that trigger when an enemy dies.
 */
export function handleCoreOnEnemyDeath(enemy) {
    const now = Date.now();
    if (enemy.isFriendly) return;

    if (playerHasCore('splitter')) {
        const splitterState = state.player.talent_states.core_states.splitter;
        if (!enemy.boss && now > (splitterState.cooldownUntil || 0)) {
            splitterState.cooldownUntil = now + 500;
            for (let i = 0; i < 3; i++) {
                const randomDir = new THREE.Vector3().randomDirection();
                state.effects.push({
                    type: 'player_fragment',
                    position: enemy.position.clone(),
                    velocity: randomDir.multiplyScalar(0.4),
                    r: 0.5,
                    damage: 8 * state.player.talent_modifiers.damage_multiplier,
                    lifeEnd: now + 4000,
                    targetIndex: i
                });
            }
            gameHelpers.play('splitterOnDeath');
        }
    }

    const cryoRank = state.player.purchasedTalents.get('cryo-shatter');
    if (cryoRank && enemy.wasFrozen) {
        const chance = cryoRank === 1 ? 0.25 : 0.5;
        if (Math.random() < chance) {
            state.effects.push({
                type: 'shockwave',
                caster: state.player,
                position: enemy.position.clone(),
                maxRadius: 15,
                speed: 50,
                startTime: now,
                hitEnemies: new Set(),
                damage: 5 * state.player.talent_modifiers.damage_multiplier,
                color: new THREE.Color(0x00c8ff)
            });

            if (state.player.purchasedTalents.has('glacial-propagation')) {
                state.effects.push({
                    type: 'small_freeze',
                    position: enemy.position.clone(),
                    radius: 15,
                    endTime: now + 200
                });
            }
        }
    }

    if (state.player.purchasedTalents.has('thermal-runaway') && state.player.berserkUntil > now) {
        state.player.berserkUntil += 100;
    }

    const scavRank = state.player.purchasedTalents.get('power-scavenger');
    if (scavRank && Math.random() < (scavRank === 1 ? 0.01 : 0.025)) {
        state.pickups.push({
            position: enemy.position.clone(),
            r: 0.5,
            type: 'score',
            emoji: '💎',
            lifeEnd: Date.now() + 10000,
        });
    }
    if (playerHasCore('swarm')) {
        const swarmState = state.player.talent_states.core_states.swarm;
        if (!swarmState.tail) swarmState.tail = [];
        swarmState.enemiesForNextSegment = (swarmState.enemiesForNextSegment || 0) + 1;
        if (swarmState.enemiesForNextSegment >= 2 && swarmState.tail.length < 50) {
            swarmState.enemiesForNextSegment = 0;
            const lastSegmentPos = swarmState.tail.length > 0 ? swarmState.tail[swarmState.tail.length - 1] : state.player.position;
            swarmState.tail.push(lastSegmentPos.clone());
        }
    }
}

/**
 * Handle core effects when the player takes damage. Returns modified damage.
 */
export function handleCoreOnPlayerDamage(damage, source, gameHelpers = {}) {
    let damageTaken = damage;
    if (playerHasCore('mirror_mirage') && damageTaken > 0) {
        const coreDecoys = state.decoys.filter(d => d.fromCore);
        if (coreDecoys.length < 3) {
            const offset = new THREE.Vector3().randomDirection().multiplyScalar(2);
            const decoyPos = state.player.position.clone().add(offset).normalize().multiplyScalar(ARENA_RADIUS);
            state.decoys.push({
                position: decoyPos,
                r: 0.5,
                fromCore: true,
                isTaunting: false,
                lastTauntTime: Date.now(),
                nextTauntTime: Date.now() + 4000 + Math.random() * 3000,
                tauntDuration: 2000,
                tauntEndTime: Date.now(),
            });
            gameHelpers.play('mirrorSwap');
        }
    }

    // Reset Phase Momentum on any damage taken
    if (damageTaken > 0) {
        const pmState = state.player.talent_states.phaseMomentum;
        pmState.lastDamageTime = Date.now();
        pmState.active = false;

        if (state.player.purchasedTalents.has('reactive-plating')) {
            const rpState = state.player.talent_states.reactivePlating;
            const now = Date.now();
            if (now - rpState.lastTrigger > 5000 && Math.random() < 0.25) {
                rpState.lastTrigger = now;
                state.enemies.forEach(e => {
                    if (!e.isFriendly && e.position) {
                        const dir = e.position.clone().sub(state.player.position).normalize();
                        e.position.add(dir.multiplyScalar(1));
                    }
                });
                state.effects.push({ type: 'shockwave', caster: state.player, position: state.player.position.clone(), radius: 0, maxRadius: 10, speed: 40, startTime: now, hitEnemies: new Set(), damage: 0 });
                if (gameHelpers.play) gameHelpers.play('shockwaveSound');
            }
        }
    }

    return damageTaken;
}

/**
 * Handle core effects when player collides with an enemy.
 */
export function handleCoreOnCollision(enemy) {
    if (playerHasCore('glitch') && !enemy.boss && !enemy.isFriendly && Math.random() < 0.25) {
        enemy.hp = 0;
        gameHelpers.spawnPickup();
        gameHelpers.play('glitchSound');
    }
}

/**
 * Handle core effects when player deals damage.
 */
export function handleCoreOnDamageDealt(target) {
    if (playerHasCore('vampire') && Math.random() < 0.10) {
        state.pickups.push({
            position: target.position.clone(),
            r: 0.4, // World units
            type: 'custom', emoji: '🩸',
            lifeEnd: Date.now() + 8000,
            isSeeking: true,
            customApply: () => {
                state.player.health = Math.min(state.player.maxHealth, state.player.health + (state.player.maxHealth * 0.20));
                gameHelpers.play('vampireHeal');
            },
        });
    }
}

/**
 * Handle core effects when the player's shield breaks.
 */
export function handleCoreOnShieldBreak() {
    if (playerHasCore('emp')) {
        state.effects = state.effects.filter(ef => ef.type !== 'nova_bullet' && ef.type !== 'helix_bolt');
        gameHelpers.play('empDischarge');
    }
}

/**
 * Handle core effects that might prevent fatal damage.
 * @returns {boolean} True if death was prevented.
 */
export function handleCoreOnFatalDamage() {
    const now = Date.now();
    if (playerHasCore('epoch_ender')) {
        const epochState = state.player.talent_states.core_states.epoch_ender;
        if (now > (epochState.cooldownUntil || 0)) {
            const rewindState = epochState.history ? epochState.history[0] : null;
            if (rewindState) {
                state.player.position.copy(rewindState.position);
                state.player.health = rewindState.health;
                epochState.cooldownUntil = now + 120000;
                gameHelpers.play('timeRewind');
                return true; // Death was prevented
            }
        }
    }
    if (state.player.purchasedTalents.has('contingency-protocol') && !state.player.contingencyUsed) {
        state.player.contingencyUsed = true;
        state.player.health = 1;
        state.player.shield = true;
        const end = now + 3000;
        state.player.shield_end_time = end;
        gameHelpers.addStatusEffect('Contingency Protocol', '💔', 3000);
        setTimeout(() => {
            if (state.player.shield_end_time <= end) {
                state.player.shield = false;
            }
        }, 3000);
        return true;
    }
    return false; // Death was not prevented
}

/**
 * Handle core effects upon picking up a power-up.
 */
export function handleCoreOnPickup() {
    if (playerHasCore('obelisk')) {
        const existing = state.player.statusEffects.find(e => e.name === 'Conduit Charge');
        if (!existing || existing.count < 3) {
            gameHelpers.addStatusEffect('Conduit Charge', '⚡', 999999);
        }
    }
}

/**
 * Handle core effects when trying to use an empty power slot.
 */
export function handleCoreOnEmptySlot() {
    if (playerHasCore('syphon')) {
        const now = Date.now();
        const syphonState = state.player.talent_states.core_states.syphon;
        if (now < (syphonState.cooldownUntil || 0)) return false;
        syphonState.cooldownUntil = now + 1000;
        
        state.effects.push({
          type: 'syphon_cone',
          startTime: now,
          endTime: now + 1000,
          source: state.player,
          direction: state.cursorDir.clone(),
        });
        gameHelpers.play('syphonFire');
        return true;
    }
    return false;
}

/**
 * Handle core effects when a defensive power is used.
 */
export function handleCoreOnDefensivePower() {
    if (playerHasCore('reflector')) {
        gameHelpers.addStatusEffect('Reflective Ward', '🛡️', 2000);
    }
    if (playerHasCore('quantum_shadow')) {
        gameHelpers.addStatusEffect('Phased', '👻', 2000);
        gameHelpers.play('phaseShiftSound');
    }
}
