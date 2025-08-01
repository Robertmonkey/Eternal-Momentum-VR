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
import { AethelUmbraAI } from './agents/AethelUmbraAI.js';
import { ObeliskAI, ObeliskConduitAI } from './agents/ObeliskAI.js';

const ARENA_RADIUS = 50; // Should match the radius in scene.js

// --- Game Logic Helpers ---
const gameHelpers = {
    addStatusEffect,
    spawnEnemy,
    spawnPickup,
    play: (id) => AudioManager.playSfx(id),
    playLooping: (id) => AudioManager.playLoopingSfx(id),
    stopLoopingSfx: (id) => AudioManager.stopLoopingSfx(id),
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
        gameHelpers.play('finalBossPhaseSound');
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
    const playerDir = state.player.position.clone().normalize();
    const spawnDir = playerDir.negate();
    
    // Add a random offset so they don't all spawn at the exact same point
    const randomOffset = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    spawnDir.add(randomOffset.multiplyScalar(0.5)).normalize();

    return spawnDir.multiplyScalar(ARENA_RADIUS);
}

export function getBossesForStage(stageNum) {
    const stageData = STAGE_CONFIG.find(s => s.stage === stageNum);
    return stageData ? stageData.bosses : [];
}

export function spawnBossesForStage(stageNum) {
    const bossIds = state.customOrreryBosses?.length > 0 ? state.customOrreryBosses : getBossesForStage(stageNum);
    
    if (bossIds && bossIds.length > 0) {
        bossIds.forEach(bossId => {
            spawnEnemy(true, bossId);
        });
        
        if (!state.bossActive) {
            const firstBossData = bossData.find(b => b.id === bossIds[0]);
            showBossBanner(firstBossData ? firstBossData.name : 'Aberration Detected');
            AudioManager.playSfx('bossSpawnSound');
        }
        state.bossActive = true;

    } else {
        console.error(`No boss configuration found for stage ${stageNum}`);
    }
}

export function spawnEnemy(isBoss = false, bossId = null) {
    const position = getSafeSpawnLocation();
    
    let enemy;
    // Special handling for duo/complex bosses
    if (bossId === 'aethel_and_umbra') {
        const roleA = Math.random() < 0.5 ? 'Aethel' : 'Umbra';
        const roleB = roleA === 'Aethel' ? 'Umbra' : 'Aethel';
        const partnerA = new AethelUmbraAI(roleA);
        const partnerB = new AethelUmbraAI(roleB, partnerA);
        partnerA.partner = partnerB;
        state.enemies.push(partnerA, partnerB);
        return; // Exit early as we've spawned both
    } else if (bossId === 'obelisk') {
        enemy = new ObeliskAI();
        state.enemies.push(enemy);
        // Spawn its conduits
        const conduitTypes = [{ type: 'gravity', color: 0x9b59b6 }, { type: 'explosion', color: 0xe74c3c }, { type: 'lightning', color: 0xf1c40f }];
        for(let i = 0; i < 3; i++) {
            const conduit = new ObeliskConduitAI(enemy, conduitTypes[i].type, conduitTypes[i].color, (i / 3) * Math.PI * 2);
            state.enemies.push(conduit);
        }
        return;
    }
    
    if (isBoss) {
        // Dynamically find the correct AI class
        const bossTemplate = bossData.find(b => b.id === bossId);
        if (!bossTemplate) { console.error(`Boss data for ${bossId} not found.`); return; }
        // This is a simplified lookup; a real implementation might use a map.
        const AIs = state.bossAIModules; // Assuming these are loaded into state
        const AIClass = AIs[bossId];
        if (AIClass) {
            enemy = new AIClass();
        } else { // Fallback for simple enemies
             enemy = { position, r: 2, hp: 200, maxHP: 200, boss: true, id: bossId, model: null };
        }
    } else {
        // Create a generic minion
        enemy = {
            position,
            r: 0.5,
            hp: 20,
            maxHP: 20,
            boss: false,
            id: 'minion',
            isFriendly: false,
            model: null, // The renderer will assign a default model
            update: function(delta) { // Simple chase logic
                const direction = state.player.position.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(0.5 * delta));
                this.position.normalize().multiplyScalar(ARENA_RADIUS);
            }
        };
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
    
    const pickupPos = new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS);
    
    state.pickups.push({
        position: pickupPos,
        r: 0.5,
        type,
        emoji: powers[type]?.emoji || '?',
        lifeEnd: Date.now() + life,
    });
}
