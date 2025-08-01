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
        talent_modifiers: {
            damage_multiplier: 1.0,
            damage_taken_multiplier: 1.0,
            pickup_radius_bonus: 0,
            essence_gain_modifier: 1.0,
            power_spawn_rate_modifier: 1.0,
        },
        talent_states: {
            // Per-talent and per-core timers and flags are stored here
            phaseMomentum: { active: false, lastDamageTime: 0 },
            core_states: {}, // Will be reset in resetGame
        },
    },
    
    // VR-specific state
    settings: {
        handedness: 'right', // 'left' or 'right'
        musicVolume: 75,   // 0-100
        sfxVolume: 85,     // 0-100
    },
    cursorDir: new THREE.Vector3(0, 0, -1), // Direction of the controller pointer

    // Game world state
    enemies: [],
    pickups: [],
    effects: [],
    decoys: [],
    pathObstacles: [], // For enemy navigation
    
    // Game flow state
    currentStage: 1,
    bossActive: false,
    bossHasSpawnedThisRun: false,
    bossSpawnCooldownEnd: 0,
    gameOver: false,
    isPaused: true, // Start paused until the game begins
    offensiveInventory: [null, null, null],
    defensiveInventory: [null, null, null],
};

/**
 * Persists the player's essential progress and settings to localStorage.
 */
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
    settings: state.settings, // Save settings
  };
  localStorage.setItem('eternalMomentumSave', JSON.stringify(persistentData));
}

/**
 * Loads player progress and settings from localStorage.
 */
export function loadPlayerState() {
  const savedData = localStorage.getItem('eternalMomentumSave');
  if (savedData) {
    const parsedData = JSON.parse(savedData);
    
    // Load progress
    Object.assign(state.player, {
        ...parsedData,
        unlockedPowers: new Set(parsedData.unlockedPowers || []),
        purchasedTalents: new Map(parsedData.purchasedTalents || []),
        unlockedAberrationCores: new Set(parsedData.unlockedAberrationCores || []),
    });
    
    // Load settings, with defaults for safety
    if (parsedData.settings) {
        Object.assign(state.settings, parsedData.settings);
    }
  }
}

/**
 * Resets the game to a fresh state for the start of a run.
 */
export function resetGame() {
    state.player.position.set(0, 0, 0); // PlayerController will set the real starting position
    state.player.health = state.player.maxHealth;
    state.player.statusEffects = [];
    state.player.activePantheonBuffs = [];
    state.player.shield = false;
    state.player.berserkUntil = 0;
    state.player.stunnedUntil = 0;
    
    // Reset all core states to prevent cooldowns from carrying over
    state.player.talent_states.core_states = {};
    bossData.forEach(core => {
        if(core.id) state.player.talent_states.core_states[core.id] = {};
    });

    Object.assign(state, {
        enemies: [],
        pickups: [],
        effects: [],
        decoys: [],
        pathObstacles: [],
        offensiveInventory: [null, null, null],
        defensiveInventory: [null, null, null],
        bossActive: false,
        gameOver: false,
        bossHasSpawnedThisRun: false,
        bossSpawnCooldownEnd: 0,
        isPaused: false,
    });
}
