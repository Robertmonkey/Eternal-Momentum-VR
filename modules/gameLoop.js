// modules/gameLoop.js
import { state, savePlayerState } from './state.js';
import { LEVELING_CONFIG, THEMATIC_UNLOCKS, SPAWN_WEIGHTS, STAGE_CONFIG } from './config.js';
import { powers, offensivePowers, usePower } from './powers.js';
import { bossData } from './bosses.js';
import { updateUI, showBossBanner, showUnlockNotification } from './ui.js';
import * as utils from './utils.js';
import { uvToSpherePos } from './utils.js';
import * as THREE from '../vendor/three.module.js';
import { AudioManager } from './audio.js';
import * as Cores from './cores.js';
import { getArena } from './scene.js';
import { updateEnemies3d } from './enemyAI3d.js';
import { updateProjectiles3d } from './projectilePhysics3d.js';
import { initGameHelpers } from './gameHelpers.js';

const missingStageWarned = new Set();

const SCREEN_WIDTH = 2048;
const SCREEN_HEIGHT = 1024;

// --- Helper Function ---
function playerHasCore(coreId) {
    if (state.player.equippedAberrationCore === coreId) return true;
    return state.player.activePantheonBuffs.some(buff => buff.coreId === coreId);
}

// --- Audio Helpers ---
function play(soundId) { AudioManager.playSfx(soundId); }
function playLooping(soundId) { AudioManager.playLoopingSfx(soundId); }
function stopLoopingSfx(soundId) { AudioManager.stopLoopingSfx(soundId); }
function stopAllLoopingSounds() {
    AudioManager.stopLoopingSfx('beamHumSound');
    AudioManager.stopLoopingSfx('wallShrink');
    AudioManager.stopLoopingSfx('obeliskHum');
    AudioManager.stopLoopingSfx('paradoxTrailHum');
    AudioManager.stopLoopingSfx('dilationField');
}

// --- Game Logic Helpers ---
const spawnParticlesCallback = (x, y, c, n, spd, life, r) => utils.spawnParticles(state.particles, x, y, c, n, spd, life, r);
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
    // Setting stunnedUntil is the key to stopping player movement
    if (name === 'Stunned' || name === 'Petrified' || name === 'Charging' || name === 'Warping') {
        state.player.stunnedUntil = Math.max(state.player.stunnedUntil, now + duration);
    }
    if (name === 'Stunned' || name === 'Petrified' || name === 'Slowed' || name === 'Epoch-Slow') {
        const isBerserk = state.player.berserkUntil > now;
        const hasTalent = state.player.purchasedTalents.has('unstoppable-frenzy');
        if (isBerserk && hasTalent) return;
    }
    const existing = state.player.statusEffects.find(e => e.name === name);
    if(existing) {
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
    for (const unlock of unlocks) {
        const isAlreadyUnlocked = unlock.type === 'power' && state.player.unlockedPowers.has(unlock.id);
        if (isAlreadyUnlocked) continue;
        if (unlock.type === 'power') {
            state.player.unlockedPowers.add(unlock.id);
            const powerName = powers[unlock.id]?.desc || unlock.id;
            showUnlockNotification(`Power Unlocked: ${powers[unlock.id].emoji} ${powerName}`);
        } else if (unlock.type === 'slot') {
            if (unlock.id === 'queueSlot1') {
                if (state.player.unlockedOffensiveSlots < 2) state.player.unlockedOffensiveSlots++;
                if (state.player.unlockedDefensiveSlots < 2) state.player.unlockedDefensiveSlots++;
            } else if (unlock.id === 'queueSlot2') {
                if (state.player.unlockedOffensiveSlots < 3) state.player.unlockedOffensiveSlots++;
                if (state.player.unlockedDefensiveSlots < 3) state.player.unlockedDefensiveSlots++;
            }
            showUnlockNotification(`Inventory Slot Unlocked!`);
        } else if (unlock.type === 'bonus') {
            state.player.ascensionPoints += unlock.value;
            showUnlockNotification(`Bonus: +${unlock.value} Ascension Points!`);
        }
    }
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
    utils.spawnParticles(state.particles, state.player.x, state.player.y, '#00ffff', 80, 6, 50, 5);
    showUnlockNotification(`Level ${state.player.level}`, 'Level Up!');
    if (state.player.level === 10 && state.player.unlockedAberrationCores.size === 0) {
        showUnlockNotification("SYSTEM ONLINE", "Aberration Core Socket Unlocked");
    }
    handleCoreUnlocks(state.player.level);
    savePlayerState();
}

export function addEssence(amount) {
    if (state.gameOver) return;
    let modifiedAmount = Math.floor(amount * state.player.talent_modifiers.essence_gain_modifier);
    
    const rank = state.player.purchasedTalents.get('essence-transmutation');
    if (rank) {
        const essenceBefore = state.player.essence % 50;
        let gainedHP = Math.floor((essenceBefore + modifiedAmount) / 50);
        if (gainedHP > 0) {
            const caps = [1.5, 2.5, 3.0];
            const cap = state.player.baseMaxHealth * caps[rank - 1];
            if (state.player.maxHealth + gainedHP > cap) {
                gainedHP = Math.floor(cap - state.player.maxHealth);
            }
            if(gainedHP > 0){
                state.player.maxHealth += gainedHP;
                state.player.health += gainedHP;
            }
        }
    }

    state.player.essence += modifiedAmount;
    while (state.player.essence >= state.player.essenceToNextLevel) {
        levelUp();
    }
}

function getSafeSpawnLocation() {
    const edgeMargin = 100;
    let x, y;
    const side = Math.floor(Math.random() * 4);
    switch (side) {
        case 0: x = Math.random() * SCREEN_WIDTH; y = -edgeMargin; break;
        case 1: x = Math.random() * SCREEN_WIDTH; y = SCREEN_HEIGHT + edgeMargin; break;
        case 2: x = -edgeMargin; y = Math.random() * SCREEN_HEIGHT; break;
        case 3: x = SCREEN_WIDTH + edgeMargin; y = Math.random() * SCREEN_HEIGHT; break;
    }
    return { x, y };
}

export function getBossesForStage(stageNum) {
    if (stageNum <= 30) {
        const stageData = STAGE_CONFIG.find(s => s.stage === stageNum);
        return stageData ? stageData.bosses : [];
    }
    const proceduralBossData = bossData.filter(b => b.difficulty_tier);
    const bossPools = {
        tier1: proceduralBossData.filter(b => b.difficulty_tier === 1),
        tier2: proceduralBossData.filter(b => b.difficulty_tier === 2),
        tier3: proceduralBossData.filter(b => b.difficulty_tier === 3)
    };
    let difficultyBudget = Math.floor((stageNum - 31) / 2) + 4;
    const bossesToSpawn = new Set();
    const keystoneBossIndex = (stageNum - 31) % proceduralBossData.length;
    const keystoneBoss = proceduralBossData[keystoneBossIndex];
    if (keystoneBoss) {
        bossesToSpawn.add(keystoneBoss.id);
        difficultyBudget -= keystoneBoss.difficulty_tier;
    }
    const availableTiers = [bossPools.tier3, bossPools.tier2, bossPools.tier1].filter(pool => pool.length > 0);
    let emergencyBreak = 0;
    while (difficultyBudget > 0 && emergencyBreak < 10) {
        let bossSelectedInLoop = false;
        for (const pool of availableTiers) {
            const tierCost = pool[0].difficulty_tier;
            if (difficultyBudget >= tierCost) {
                let candidateBoss = null;
                for (let i = 0; i < pool.length; i++) {
                    const bossIndex = (stageNum + bossesToSpawn.size + i) % pool.length;
                    if (!bossesToSpawn.has(pool[bossIndex].id)) {
                        candidateBoss = pool[bossIndex];
                        break;
                    }
                }
                if (candidateBoss) {
                    bossesToSpawn.add(candidateBoss.id);
                    difficultyBudget -= tierCost;
                    bossSelectedInLoop = true;
                    break;
                }
            }
        }
        if (!bossSelectedInLoop) break;
        emergencyBreak++;
    }
    return Array.from(bossesToSpawn);
}

export function spawnBossesForStage(stageNum) {
    let bossIdsToSpawn = state.arenaMode && state.customOrreryBosses.length > 0
        ? state.customOrreryBosses
        : getBossesForStage(stageNum);
    if (bossIdsToSpawn && bossIdsToSpawn.length > 0) {
        bossIdsToSpawn.forEach(bossId => {
            spawnEnemy(true, bossId, getSafeSpawnLocation());
        });
        if (playerHasCore('centurion')) {
            const corners = [
                {x: 100, y: 100}, {x: SCREEN_WIDTH - 100, y: 100},
                {x: 100, y: SCREEN_HEIGHT - 100}, {x: SCREEN_WIDTH - 100, y: SCREEN_HEIGHT - 100}
            ];
            corners.forEach(pos => {
                state.effects.push({ type: 'containment_pylon', x: pos.x, y: pos.y, r: 25, endTime: Infinity });
            });
            play('architectBuild');
        }
    } else {
        if (!missingStageWarned.has(stageNum)) {
            console.error(`No boss configuration found for stage ${stageNum}`);
            missingStageWarned.add(stageNum);
        }
    }
}

export function spawnEnemy(isBoss = false, bossId = null, location = null) {
    const u = (location ? location.x : Math.random() * SCREEN_WIDTH) / SCREEN_WIDTH;
    const v = (location ? location.y : Math.random() * SCREEN_HEIGHT) / SCREEN_HEIGHT;
    const pos = uvToSpherePos(u, v, 1);
    const e = {
        position: pos.clone(),
        r: isBoss ? 50 : 15,
        hp: isBoss ? 200 : 1,
        maxHP: isBoss ? 200 : 1,
        boss: isBoss,
        frozen: false,
        targetBosses: false,
        instanceId: Date.now() + Math.random(),
    };
    if (isBoss) {
        const bd = bossData.find(b => b.id === bossId);
        if (!bd) { console.error("Boss data not found for id", bossId); return null; }
        Object.assign(e, bd);
        const baseHp = bd.maxHP || 200;
        let difficultyIndex = state.arenaMode
            ? state.customOrreryBosses.reduce((sum, bId) => sum + (bossData.find(b => b.id === bId)?.difficulty_tier || 0), 0) * 2.5
            : (state.currentStage - 1);
        const scalingFactor = 12;
        const finalHp = baseHp + (Math.pow(difficultyIndex, 1.5) * scalingFactor);
        e.maxHP = Math.round(finalHp);
        e.hp = e.maxHP;
        state.enemies.push(e);
        if (bd.init) bd.init(e, state, spawnEnemy, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
        if (!state.bossActive) {
            const stageInfo = STAGE_CONFIG.find(s => s.stage === state.currentStage);
            let bannerName = state.arenaMode ? "Forged Timeline" : (stageInfo?.displayName || e.name || "Custom Encounter");
            showBossBanner({ name: bannerName });
            AudioManager.playSfx('bossSpawnSound');
            AudioManager.crossfadeToNextTrack();
        }
        state.bossActive = true;
    } else {
        state.enemies.push(e);
    }
    return e;
}

export function spawnPickup() {
    if (playerHasCore('shaper_of_fate') && state.player.talent_states.core_states.shaper_of_fate?.isDisabled) return;
    const available = [...state.player.unlockedPowers];
    if (available.length === 0) return;
    const types = [];
    for (const type of available) {
        const weight = SPAWN_WEIGHTS[type] || 1;
        for (let i = 0; i < weight; i++) types.push(type);
    }
    const type = types[Math.floor(Math.random() * types.length)];
    let life = 10000;
    const anomalyRank = state.player.purchasedTalents.get('temporal-anomaly');
    if (anomalyRank) life *= (1 + [0.25, 0.5][anomalyRank - 1]);
    state.pickups.push({
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        r: 12, type, vx: 0, vy: 0,
        lifeEnd: Date.now() + life
    });
}

export function gameTick() {
  const arena = getArena();
  if (!arena) return true;
  const radius = arena.geometry.parameters.radius;
  updateEnemies3d(radius, SCREEN_WIDTH, SCREEN_HEIGHT);
  updateProjectiles3d(radius, SCREEN_WIDTH, SCREEN_HEIGHT);
  return true;
}
