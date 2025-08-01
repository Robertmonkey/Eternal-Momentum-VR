import * as THREE from '../vendor/three.module.js';
import { state, savePlayerState } from './state.js';
import { LEVELING_CONFIG, THEMATIC_UNLOCKS, SPAWN_WEIGHTS, STAGE_CONFIG } from './config.js';
import { powers } from './powers.js';
import { bossData } from './bosses.js';
import { showUnlockNotification, showBossBanner } from './UIManager.js';
import { AudioManager } from './audio.js';
import { initGameHelpers } from './gameHelpers.js';
import { getScene } from './scene.js';

// Import all your new 3D AI agent classes
import { AethelUmbraAI } from './agents/AethelUmbraAI.js';
import { AnnihilatorAI } from './agents/AnnihilatorAI.js';
import { ArchitectAI } from './agents/ArchitectAI.js';
import { BasiliskAI } from './agents/BasiliskAI.js';
import { CenturionAI } from './agents/CenturionAI.js';
import { EMPOverloadAI } from './agents/EMPOverloadAI.js';
import { EpochEnderAI } from './agents/EpochEnderAI.js';
import { FractalHorrorAI } from './agents/FractalHorrorAI.js';
import { GlitchAI } from './agents/GlitchAI.js';
import { GravityAI } from './agents/GravityAI.js';
import { HelixWeaverAI } from './agents/HelixWeaverAI.js';
import { JuggernautAI } from './agents/JuggernautAI.js';
import { LoopingEyeAI } from './agents/LoopingEyeAI.js';
import { MiasmaAI } from './agents/MiasmaAI.js';
import { MirrorMirageAI } from './agents/MirrorMirageAI.js';
import { ObeliskAI, ObeliskConduitAI } from './agents/ObeliskAI.js';
import { PantheonAI } from './agents/PantheonAI.js';
import { ParasiteAI } from './agents/ParasiteAI.js';
import { PuppeteerAI } from './agents/PuppeteerAI.js';
import { QuantumShadowAI } from './agents/QuantumShadowAI.js';
import { ReflectorAI } from './agents/ReflectorAI.js';
import { SentinelPairAI } from './agents/SentinelPairAI.js';
import { ShaperOfFateAI } from './agents/ShaperOfFateAI.js';
import { SingularityAI } from './agents/SingularityAI.js';
import { SplitterAI } from './agents/SplitterAI.js';
import { SwarmLinkAI } from './agents/SwarmLinkAI.js';
import { SyphonAI } from './agents/SyphonAI.js';
import { TemporalParadoxAI } from './agents/TemporalParadoxAI.js';
import { TimeEaterAI } from './agents/TimeEaterAI.js';
import { VampireAI } from './agents/VampireAI.js';
import { BaseAgent } from './BaseAgent.js';

const ARENA_RADIUS = 50;

// Map boss IDs to their 3D AI classes
const bossAIClassMap = {
    aethel_and_umbra: AethelUmbraAI, annihilator: AnnihilatorAI, architect: ArchitectAI,
    basilisk: BasiliskAI, centurion: CenturionAI, emp: EMPOverloadAI, epoch_ender: EpochEnderAI,
    fractal_horror: FractalHorrorAI, glitch: GlitchAI, gravity: GravityAI, helix_weaver: HelixWeaverAI,
    juggernaut: JuggernautAI, looper: LoopingEyeAI, miasma: MiasmaAI, mirror: MirrorMirageAI,
    obelisk: ObeliskAI, pantheon: PantheonAI, parasite: ParasiteAI, puppeteer: PuppeteerAI,
    quantum_shadow: QuantumShadowAI, reflector: ReflectorAI, sentinel_pair: SentinelPairAI,
    shaper_of_fate: ShaperOfFateAI, singularity: SingularityAI, splitter: SplitterAI,
    swarm: SwarmLinkAI, syphon: SyphonAI, temporal_paradox: TemporalParadoxAI,
    time_eater: TimeEaterAI, vampire: VampireAI
};

const gameHelpers = {
    addStatusEffect, spawnEnemy, spawnPickup,
    play: (id, obj) => AudioManager.playSfx(id, obj),
    playLooping: (id, obj) => AudioManager.playLoopingSfx(id, obj),
    stopLoopingSfx: (id) => AudioManager.stopLoopingSfx(id),
    addEssence,
};
initGameHelpers(gameHelpers);


export function addStatusEffect(name, emoji, duration) {
    const now = Date.now();
    const preventCrowdControl = state.player.purchasedTalents.has('unstoppable-frenzy') && state.player.berserkUntil > now;
    if (['Stunned', 'Petrified', 'Charging', 'Warping'].includes(name)) {
        if (!preventCrowdControl) {
            state.player.stunnedUntil = Math.max(state.player.stunnedUntil, now + duration);
        } else {
            return;
        }
    } else if (name === 'Slowed' && preventCrowdControl) {
        return;
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
    for (const unlock of unlocks) {
        if (unlock.type === 'power' && !state.player.unlockedPowers.has(unlock.id)) {
            state.player.unlockedPowers.add(unlock.id);
            const powerName = powers[unlock.id]?.desc || unlock.id;
            showUnlockNotification(`Power Unlocked: ${powers[unlock.id].emoji} ${powerName}`);
        } else if (unlock.type === 'slot') {
             // Logic for unlocking slots...
        } else if (unlock.type === 'bonus') {
            state.player.ascensionPoints += unlock.value;
            showUnlockNotification(`Bonus: +${unlock.value} Ascension Points!`);
        }
    }
}

function levelUp() {
    state.player.level++;
    state.player.essence -= state.player.essenceToNextLevel;
    state.player.essenceToNextLevel = LEVELING_CONFIG.BASE_XP + (state.player.level - 1) * LEVELING_CONFIG.ADDITIONAL_XP_PER_LEVEL;
    state.player.ascensionPoints += 1;
    showUnlockNotification(`Level ${state.player.level}`, 'Level Up!');
    savePlayerState();
}

export function addEssence(amount) {
    if (state.gameOver) return;
    let modifiedAmount = Math.floor(amount * state.player.talent_modifiers.essence_gain_modifier);

    const transmuteRank = state.player.purchasedTalents.get('essence-transmutation');
    if (transmuteRank) {
        const essenceBefore = state.player.essence % 50;
        let gainedHP = Math.floor((essenceBefore + modifiedAmount) / 50);
        if (gainedHP > 0) {
            const caps = [1.5, 2.5, 3.0];
            const cap = state.player.baseMaxHealth * caps[transmuteRank - 1];
            if (state.player.maxHealth + gainedHP > cap) {
                gainedHP = Math.floor(cap - state.player.maxHealth);
            }
            if (gainedHP > 0) {
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
    const randomAngle = Math.random() * Math.PI * 2;
    const randomY = (Math.random() - 0.5) * 0.8; // Spawn in a band around the equator
    const pos = new THREE.Vector3(Math.cos(randomAngle), randomY, Math.sin(randomAngle)).normalize();
    
    // Ensure spawn is away from player
    if (pos.distanceTo(state.player.position) < ARENA_RADIUS * 0.5) {
        pos.negate();
    }
    return pos.multiplyScalar(ARENA_RADIUS);
}

export function getBossesForStage(stageNum) {
    const stageData = STAGE_CONFIG.find(s => s.stage === stageNum);
    return stageData ? stageData.bosses : [];
}

export function spawnBossesForStage(stageNum) {
    const bossIds = state.customOrreryBosses?.length > 0 ? state.customOrreryBosses : getBossesForStage(stageNum);
    if (bossIds && bossIds.length > 0) {
        bossIds.forEach(id => spawnEnemy(true, id));
        if (!state.bossActive) {
            const firstBossData = bossData.find(b => b.id === bossIds[0]);
            showBossBanner(firstBossData ? firstBossData.name : 'Aberration Detected');
            AudioManager.playSfx('bossSpawnSound');
        }
        state.bossActive = true;
    }
}

export function spawnEnemy(isBoss = false, bossId = null) {
    const scene = getScene();
    if (!scene) {
        console.error("Scene not available for spawning enemy.");
        return null;
    }
    
    let enemy;
    const AIClass = isBoss ? bossAIClassMap[bossId] : null;

    if (isBoss && AIClass) {
        // Special multi-part boss spawns need to be added to scene individually
        if (bossId === 'aethel_and_umbra') {
            const partnerA = new AethelUmbraAI('Aethel');
            const partnerB = new AethelUmbraAI('Umbra', partnerA);
            partnerA.partner = partnerB;
            partnerA.position.copy(getSafeSpawnLocation());
            partnerB.position.copy(getSafeSpawnLocation());
            partnerA.boss = true;
            partnerB.boss = true;
            state.enemies.push(partnerA, partnerB);
            scene.add(partnerA, partnerB); // Add BOTH to scene
            return partnerA;
        }
        if (bossId === 'sentinel_pair') {
            const sentinelA = new SentinelPairAI();
            const sentinelB = new SentinelPairAI(sentinelA);
            sentinelA.position.copy(getSafeSpawnLocation());
            sentinelB.position.copy(getSafeSpawnLocation());
            sentinelA.boss = true;
            sentinelB.boss = true;
            state.enemies.push(sentinelA, sentinelB);
            scene.add(sentinelA, sentinelB); // Add BOTH to scene
            return sentinelA;
        }
        if (bossId === 'obelisk') {
            const obelisk = new ObeliskAI();
            obelisk.boss = true;
            state.enemies.push(obelisk);
            scene.add(obelisk); // Add Obelisk to scene
            const conduitTypes = [{ type: 'gravity', color: 0x9b59b6 }, { type: 'explosion', color: 0xe74c3c }, { type: 'lightning', color: 0xf1c40f }];
            for(let i = 0; i < 3; i++) {
                const conduit = new ObeliskConduitAI(obelisk, conduitTypes[i].type, conduitTypes[i].color, (i / 3) * Math.PI * 2);
                conduit.boss = true;
                state.enemies.push(conduit);
                scene.add(conduit); // Add EACH conduit to scene
            }
            return obelisk;
        }
        // Standard single boss spawn
        enemy = new AIClass();
        enemy.boss = true;
    } else if (!isBoss) {
        const minionGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const minionMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, emissive: 0xc0392b, emissiveIntensity: 0.3 });
        const minionModel = new THREE.Mesh(minionGeo, minionMat);
        enemy = new BaseAgent({ health: 20, model: minionModel });
        enemy.kind = 'minion';
        enemy.speed = 2.0;
        enemy.boss = false;
        enemy.isFriendly = false;
        enemy.update = function(delta) {
            if (!this.alive) return;
            const direction = state.player.position.clone().sub(this.position).normalize();
            this.position.add(direction.multiplyScalar(this.speed * delta));
            this.position.normalize().multiplyScalar(ARENA_RADIUS);
        };
    } else {
        console.error(`AI Class for boss ID "${bossId}" not found!`);
        return null;
    }

    enemy.position.copy(getSafeSpawnLocation());
    state.enemies.push(enemy);
    scene.add(enemy); // ** THE CRITICAL FIX: Add the enemy's 3D object to the scene **
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
    const anomalyRank = state.player.purchasedTalents.get('temporal-anomaly');
    if (anomalyRank) life *= 1 + (anomalyRank === 1 ? 0.25 : 0.5);
    
    const pickupPos = new THREE.Vector3().randomDirection().multiplyScalar(ARENA_RADIUS);
    
    state.pickups.push({
        position: pickupPos,
        r: 0.5,
        type,
        emoji: powers[type]?.emoji || '?',
        lifeEnd: Date.now() + life,
    });
}
