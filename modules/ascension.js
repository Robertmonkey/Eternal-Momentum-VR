import { state, savePlayerState } from './state.js';
import { TALENT_GRID_CONFIG } from './talents.js';
import { AudioManager } from './audio.js';
import { updateHud } from './UIManager.js';

// Create a flat map of all talents for easy lookup
const allTalents = {};
Object.values(TALENT_GRID_CONFIG).forEach(constellation => {
    Object.keys(constellation).forEach(key => {
        if (key !== 'color') {
            allTalents[key] = constellation[key];
        }
    });
});

/**
 * Handles the logic of purchasing a talent.
 * @param {string} talentId The ID of the talent to purchase.
 */
export function purchaseTalent(talentId) {
    const talent = allTalents[talentId];
    if (!talent) return;

    const currentRank = state.player.purchasedTalents.get(talent.id) || 0;
    if (currentRank >= talent.maxRanks && !talent.isInfinite) return;

    let cost;
    if (talent.isInfinite) {
        cost = talent.costPerRank[0];
    } else {
        cost = talent.costPerRank[currentRank];
    }
    
    const prereqsMet = talent.prerequisites.every(p => {
        const prereqTalent = allTalents[p];
        if (!prereqTalent) return false;
        const ranksNeeded = prereqTalent.maxRanks;
        const currentPrereqRank = state.player.purchasedTalents.get(p) || 0;
        return currentPrereqRank >= ranksNeeded;
    });

    if (prereqsMet && state.player.ascensionPoints >= cost) {
        state.player.ascensionPoints -= cost;
        state.player.purchasedTalents.set(talent.id, currentRank + 1);
        
        AudioManager.playSfx('talentPurchase');
        
        applyAllTalentEffects();
        savePlayerState();
        updateHud();
    } else {
        AudioManager.playSfx('talentError');
        console.warn("Cannot purchase talent: Not enough AP or prerequisites not met.");
    }
}

/**
 * Applies all purchased talent effects to the player's stats.
 * This should be called after loading a save or purchasing a talent.
 */
export function applyAllTalentEffects() {
    // Reset all modifiers to their base values just like the original 2D game
    // before applying the bonuses from purchased talents.
    let baseMaxHealth = 100;
    let baseSpeed = 1.0;
    let baseDamageMultiplier = 1.0;
    let baseDamageTakenMultiplier = 1.0;
    let basePickupRadius = 0;
    let baseEssenceGain = 1.0;
    let basePowerSpawnRate = 1.0;
    let basePullResistance = 0;

    state.player.purchasedTalents.forEach((rank, id) => {
        switch (id) {
            case 'exo-weave-plating': {
                const values = [15, 20, 25];
                for (let i = 0; i < rank; i++) baseMaxHealth += values[i];
                break;
            }
            case 'solar-wind': {
                const values = [0.06, 0.06];
                for (let i = 0; i < rank; i++) baseSpeed += values[i];
                break;
            }
            case 'high-frequency-emitters': {
                const values = [0.05, 0.07];
                for (let i = 0; i < rank; i++) baseDamageMultiplier += values[i];
                break;
            }
            case 'resonance-magnet':
                basePickupRadius += rank * 75;
                break;
            case 'essence-conduit': {
                const values = [0.10, 0.15];
                for (let i = 0; i < rank; i++) baseEssenceGain += values[i];
                break;
            }
            case 'resonant-frequencies': {
                const values = [0.10, 0.10];
                for (let i = 0; i < rank; i++) basePowerSpawnRate += values[i];
                break;
            }
            // Endless talents
            case 'core-reinforcement':
                baseMaxHealth += rank * 5;
                break;
            case 'momentum-drive':
                baseSpeed += rank * 0.01;
                break;
            case 'weapon-calibration':
                baseDamageMultiplier += rank * 0.01;
                break;
        }
    });

    // Apply all calculated values to the state
    state.player.maxHealth = baseMaxHealth;
    state.player.speed = baseSpeed;
    state.player.talent_modifiers.damage_multiplier = baseDamageMultiplier;
    state.player.talent_modifiers.damage_taken_multiplier = baseDamageTakenMultiplier;
    state.player.talent_modifiers.pickup_radius_bonus = basePickupRadius;
    state.player.talent_modifiers.essence_gain_modifier = baseEssenceGain;
    state.player.talent_modifiers.power_spawn_rate_modifier = basePowerSpawnRate;
    state.player.talent_modifiers.pull_resistance_modifier = basePullResistance;

    // Reset dynamic talent states to match 2D behaviour
    state.player.talent_states.phaseMomentum.active = false;
    if (state.player.purchasedTalents.has('phase-momentum')) {
        state.player.talent_states.phaseMomentum.lastDamageTime = Date.now();
    }
    state.player.talent_states.reactivePlating.lastTrigger = 0;

    // After applying maxHealth modifiers ensure current health isn't higher
    state.player.health = Math.min(state.player.health, state.player.maxHealth);
}
/**
 * Returns the constellation color for a given talent.
 * @param {string} talentId
 * @returns {string}
 */
export function getConstellationColorOfTalent(talentId) {
    for (const key in TALENT_GRID_CONFIG) {
        if (TALENT_GRID_CONFIG[key][talentId]) {
            return TALENT_GRID_CONFIG[key].color || '#00ffff';
        }
    }
    return '#00ffff';
}

/**
 * Determines if a talent should be visible in the ascension grid.
 * @param {object} talent
 * @returns {boolean}
 */
export function isTalentVisible(talent) {
    if (!talent) return false;
    const unlocked = state.player.unlockedPowers;
    const powerUnlocked = !talent.powerPrerequisite ||
        (unlocked instanceof Set
            ? unlocked.has(talent.powerPrerequisite)
            : Array.isArray(unlocked)
                ? unlocked.includes(talent.powerPrerequisite)
                : false);
    if (!powerUnlocked) return false;

    const prereqs = talent.prerequisites || [];
    if (prereqs.length === 0) return true;

    const purchased = state.player.purchasedTalents && typeof state.player.purchasedTalents.get === 'function'
        ? state.player.purchasedTalents
        : new Map();

    return prereqs.every(prereqId => {
        const prereqTalent = allTalents[prereqId];
        if (!prereqTalent) return false;
        const needed = prereqTalent.maxRanks;
        const current = purchased.get(prereqId) || 0;
        return current >= needed;
    });
}
