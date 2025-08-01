import * as THREE from '../vendor/three.module.js';
import { LEVELING_CONFIG } from './config.js';

// The central state object. All game logic reads from and writes to this.
export const state = {
    // Player and input state
    player: {
        position: new THREE.Vector3(0, 1.6, 0), // Player's 3D position
        r: 0.5, // Player's 3D radius
        speed: 1.0,
        baseMaxHealth: 100,
        maxHealth: 100,
        health: 100,
        shield: false,
        shield_end_time: 0,
        stunnedUntil: 0,
        berserkUntil: 0,
        statusEffects: [],
        level: 1,
        essence: 0,
        essenceToNextLevel: LEVELING_CONFIG.BASE_XP,
        ascensionPoints: 0,
        unlockedPowers: new Set(['heal', 'missile']),
        purchasedTalents: new Map(),
        highestStageBeaten: 0,
        unlockedOffensiveSlots: 1,
        unlockedDefensiveSlots: 1,
        unlockedAberrationCores: new Set(),
        equippedAberrationCore: null,
        activePantheonBuffs: [],
        preordinanceUsed: false,
        contingencyUsed: false,
        talent_modifiers: {
            damage_multiplier: 1.0,
            damage_taken_multiplier: 1.0,
            pickup_radius_bonus: 0,
            essence_gain_modifier: 1.0,
            power_spawn_rate_modifier: 1.0,
        },
        talent_states: {
            phaseMomentum: { active: false, lastDamageTime: 0 },
            core_states: {},
        },
    },
    
    // VR-specific state
    settings: {
        handedness: 'left',
        musicVolume: 75,
        sfxVolume: 85,
    },
    cursorDir: new THREE.Vector3(0, 0, -1),

    // Game world state
    enemies: [],
    pickups: [],
    effects: [],
    decoys: [],
    particles: [],
    pathObstacles: [],

    // Arena run flags
    stacked: false,
    arenaMode: false,
    gravityActive: false,
    gravityEnd: 0,
    customOrreryBosses: [],
    
    // Game flow state
    currentStage: 1,
    bossActive: false,
    bossHasSpawnedThisRun: false,
    bossSpawnCooldownEnd: 0,
    gameOver: false,
    isPaused: true,
    offensiveInventory: [null, null, null],
    defensiveInventory: [null, null, null],
};

export function savePlayerState() {
  const persistentData = {
    level: state.player.level,
    essence: state.player.essence,
    essenceToNextLevel: state.player.essenceToNextLevel,
    ascensionPoints: state.player.ascensionPoints,
    unlockedPowers: [...state.player.unlockedPowers],
    purchasedTalents: [...state.player.purchasedTalents],
    highestStageBeaten: state.player.highestStageBeaten,
    unlockedOffensiveSlots: state.player.unlockedOffensiveSlots,
    unlockedDefensiveSlots: state.player.unlockedDefensiveSlots,
    unlockedAberrationCores: [...state.player.unlockedAberrationCores],
    equippedAberrationCore: state.player.equippedAberrationCore,
    preordinanceUsed: state.player.preordinanceUsed,
    contingencyUsed: state.player.contingencyUsed,
    settings: state.settings,
  };
  localStorage.setItem('eternalMomentumSave', JSON.stringify(persistentData));
}

export function loadPlayerState() {
  const savedData = localStorage.getItem('eternalMomentumSave');
  if (savedData) {
    const parsedData = JSON.parse(savedData);
    Object.assign(state.player, {
        ...parsedData,
        unlockedPowers: new Set(parsedData.unlockedPowers || []),
        purchasedTalents: new Map(parsedData.purchasedTalents || []),
        unlockedAberrationCores: new Set(parsedData.unlockedAberrationCores || []),
        preordinanceUsed: parsedData.preordinanceUsed || false,
        contingencyUsed: parsedData.contingencyUsed || false,
    });
    if (parsedData.settings) {
        Object.assign(state.settings, parsedData.settings);
    }
  }
}

export function resetGame(bossData) { // Now accepts bossData to avoid circular dependency
    state.player.position.set(0, 0, 0);
    state.player.health = state.player.maxHealth;
    state.player.statusEffects = [];
    state.player.activePantheonBuffs = [];
    state.player.shield = false;
    state.player.berserkUntil = 0;
    state.player.stunnedUntil = 0;
    state.player.preordinanceUsed = false;
    state.player.contingencyUsed = false;
    
    state.player.talent_states.core_states = {};
    if (bossData) { // Safely initialize core states
        bossData.forEach(core => {
            if(core.id) state.player.talent_states.core_states[core.id] = {};
        });
    }

    Object.assign(state, {
        enemies: [],
        pickups: [],
        effects: [],
        decoys: [],
        particles: [],
        pathObstacles: [],
        offensiveInventory: [null, null, null],
        defensiveInventory: [null, null, null],
        stacked: false,
        arenaMode: false,
        gravityActive: false,
        gravityEnd: 0,
        customOrreryBosses: [],
        bossActive: false,
        gameOver: false,
        bossHasSpawnedThisRun: false,
        bossSpawnCooldownEnd: 0,
        isPaused: false,
    });
}
