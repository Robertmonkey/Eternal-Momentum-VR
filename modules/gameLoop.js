import * as THREE from '../vendor/three.module.js';
import { state, savePlayerState } from './state.js';
import { LEVELING_CONFIG, THEMATIC_UNLOCKS, SPAWN_WEIGHTS, STAGE_CONFIG } from './config.js';
import { powers } from './powers.js';
import { bossData } from './bosses.js';
import { showUnlockNotification, showBossBanner } from './UIManager.js';
import * as utils from './utils.js';
import { AudioManager } from './audio.js';
import { playerHasCore } from './helpers.js';
import { initGameHelpers } from './gameHelpers.js';

const ARENA_RADIUS = 50; // Should match the radius in scene.js

// --- Audio Helpers ---
function play(soundId) { AudioManager.playSfx(soundId); }
function playLooping(soundId) { AudioManager.playLoopingSfx(soundId); }
function stopLoopingSfx(soundId) { AudioManager.stopLoopingSfx(soundId); }

// --- Game Logic Helpers ---
const gameHelpers = {
    addStatusEffect,
    spawnEnemy,
    spawnPickup,
    play,
    stopLoopingSfx,
    playLooping,
    addEssence,
};
initGameHelpers(gameHelpers);


export function addStatusEffect(name, emoji, duration) {
    const now = Date.now();
    if (['Stunned', 'Petrified', 'Charging', 'Warping'].includes(name)) {
        state.player.stunnedUntil = Math.max(state.player.stunnedUntil, now + duration);
    }

    const existing = state.player.statusEffects.find(e => e.name === name);
    if (existing) {
        if (name === 'Conduit Charge') {
            existing.count = Math.min(3, (existing.count || 1) + 1);
            existing.emoji = '⚡'.repeat(existing.count);
        }
        existing.endTime = now + duration;
        return;
    }
    const effect = { name, emoji, startTime: now, endTime: now + duration };
    if (name === 'Conduit Charge') effect.count = 1;
    state.player.statusEffects.push(effect);
}

export function handleThematicUnlock(stageJustCleared) {
    const unlockLevel = stageJustCleared + 1;
    const unlockData = THEMATIC_UNLOCKS[unlockLevel];
    if (!unlockData) return;
    
    const unlocks = Array.isArray(unlockData) ? unlockData : [unlockData];
    unlocks.forEach(unlock => {
        if (unlock.type === 'power' && !state.player.unlockedPowers.has(unlock.id)) {
            state.player.unlockedPowers.add(unlock.id);
            showUnlockNotification(`Power Unlocked: ${powers[unlock.id].emoji} ${powers[unlock.id].desc}`);
        } else if (unlock.type === 'bonus') {
            state.player.ascensionPoints += unlock.value;
            showUnlockNotification(`Bonus: +${unlock.value} Ascension Points!`);
        }
    });
}

function handleCoreUnlocks(newLevel) {
    const coreData = bossData.find(b => b.unlock_level === newLevel);
    if (coreData && !state.player.unlockedAberrationCores.has(coreData.id)) {
        state.player.unlockedAberrationCores.add(coreData.id);
        showUnlockNotification(`Aberration Core Unlocked: ${coreData.name}`, 'New Attunement Possible');
        play('finalBossPhaseSound');
    }
}

function levelUp() {
    state.player.level++;
    state.player.essence -= state.player.essenceToNextLevel;
    state.player.essenceToNextLevel = LEVELING_CONFIG.BASE_XP + (state.player.level - 1) * LEVELING_CONFIG.ADDITIONAL_XP_PER_LEVEL;
    state.player.ascensionPoints += 1;
    
    showUnlockNotification(`Level ${state.player.level}`, 'Level Up!');
    if (state.player.level === 10 && state.player.unlockedAberrationCores.size === 0) {
        showUnlockNotification("SYSTEM ONLINE", "Aberration Core Socket Unlocked");
    }
    handleCoreUnlocks(state.player.level);
    savePlayerState();
}

export function addEssence(amount) {
    if (state.gameOver) return;
    state.player.essence += Math.floor(amount * state.player.talent_modifiers.essence_gain_modifier);
    while (state.player.essence >= state.player.essenceToNextLevel) {
        levelUp();
    }
}

function getSafeSpawnLocation() {
    // Returns a random point on the sphere, opposite the player
    const spawnPos = state.player.position.clone().negate();
    const randomRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        (Math.random() - 0.5) * Math.PI * 0.5,
        (Math.random() - 0.5) * Math.PI * 0.5,
        0
    ));
    spawnPos.applyQuaternion(randomRotation);
    return spawnPos.normalize().multiplyScalar(ARENA_RADIUS);
}

export function getBossesForStage(stageNum) {
    if (stageNum <= 30) {
        const stageData = STAGE_CONFIG.find(s => s.stage === stageNum);
        return stageData ? stageData.bosses : [];
    }
    // Procedural stage generation for stages > 30 can be added here
    return ['splitter']; // Fallback
}

export function spawnBossesForStage(stageNum) {
    const bossIds = state.customOrreryBosses?.length > 0 ? state.customOrreryBosses : getBossesForStage(stageNum);
    if (bossIds && bossIds.length > 0) {
        bossIds.forEach(bossId => {
            spawnEnemy(true, bossId);
        });
    } else {
        console.error(`No boss configuration found for stage ${stageNum}`);
    }
}

export function spawnEnemy(isBoss = false, bossId = null) {
    const pos = getSafeSpawnLocation();
    
    const enemy = {
        position: pos,
        velocity: new THREE.Vector3(),
        r: isBoss ? 2 : 0.5, // World units
        hp: isBoss ? 200 : 20,
        maxHP: isBoss ? 200 : 20,
        boss: isBoss,
        id: bossId || 'minion',
        instanceId: THREE.MathUtils.generateUUID(),
        // ... other default enemy properties
    };

    if (isBoss) {
        const bossTemplate = bossData.find(b => b.id === bossId);
        if (!bossTemplate) {
            console.error(`Boss data not found for id: ${bossId}`);
            return null;
        }
        Object.assign(enemy, bossTemplate); // Apply boss-specific properties
        
        // Scale HP based on stage
        const difficultyIndex = state.currentStage - 1;
        const scalingFactor = 12;
        const finalHp = enemy.maxHP + (Math.pow(difficultyIndex, 1.5) * scalingFactor);
        enemy.maxHP = Math.round(finalHp);
        enemy.hp = enemy.maxHP;

        if (enemy.init) {
            enemy.init(enemy, state, spawnEnemy);
        }
        
        if (!state.bossActive) {
            showBossBanner(enemy.name);
            AudioManager.playSfx('bossSpawnSound');
        }
        state.bossActive = true;
    }
    
    state.enemies.push(enemy);
    return enemy;
}

export function spawnPickup() {
    const available = [...state.player.unlockedPowers];
    if (available.length === 0) return;
    
    const types = [];
    available.forEach(type => {
        const weight = SPAWN_WEIGHTS[type] || 1;
        for (let i = 0; i < weight; i++) types.push(type);
    });
    
    const type = types[Math.floor(Math.random() * types.length)];
    let life = 10000;
    if (state.player.purchasedTalents.has('temporal-anomaly')) {
        life *= 1.25;
    }
    
    const pickupPos = new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS);
    
    state.pickups.push({
        position: pickupPos,
        r: 0.5, // World units
        type,
        emoji: powers[type]?.emoji || '?',
        lifeEnd: Date.now() + life,
    });
}
