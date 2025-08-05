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
    // Reset all modifiers to their base values before recalculating
    state.player.maxHealth = 100;
    state.player.speed = 1.0;
    state.player.talent_modifiers.damage_multiplier = 1.0;
    state.player.talent_modifiers.damage_taken_multiplier = 1.0;
    state.player.talent_modifiers.pickup_radius_bonus = 0;
    state.player.talent_modifiers.essence_gain_modifier = 1.0;
    state.player.talent_modifiers.power_spawn_rate_modifier = 1.0;

    state.player.purchasedTalents.forEach((rank, id) => {
        const talent = allTalents[id];
        if (!talent) return;
        
        // This is a simplified application based on your talents.js file.
        // It directly modifies the state properties.
        switch (id) {
            case 'exo-weave-plating':
                const healthValues = [15, 20, 25];
                for (let i = 0; i < rank; i++) state.player.maxHealth += healthValues[i];
                break;
            case 'solar-wind':
                state.player.speed += rank * 0.06;
                break;
            case 'high-frequency-emitters':
                const damageValues = [0.05, 0.07];
                for (let i = 0; i < rank; i++) state.player.talent_modifiers.damage_multiplier += damageValues[i];
                break;
            case 'resonance-magnet':
                // NOTE: This pixel value should be converted to world units where it's used
                state.player.talent_modifiers.pickup_radius_bonus += rank * 75;
                break;
            case 'essence-conduit':
                 const essenceValues = [0.10, 0.15];
                for (let i = 0; i < rank; i++) state.player.talent_modifiers.essence_gain_modifier += essenceValues[i];
                break;
            case 'resonant-frequencies':
                state.player.talent_modifiers.power_spawn_rate_modifier += rank * 0.10;
                break;
            case 'core-reinforcement':
                state.player.maxHealth += rank * 5;
                break;
            case 'momentum-drive':
                state.player.speed += rank * 0.01;
                break;
            case 'weapon-calibration':
                state.player.talent_modifiers.damage_multiplier += rank * 0.01;
                break;
        }
    });

    // Reset dynamic talent states
    state.player.talent_states.phaseMomentum.active = false;
    if (state.player.purchasedTalents.has('phase-momentum')) {
        state.player.talent_states.phaseMomentum.lastDamageTime = Date.now();
    }
    state.player.talent_states.reactivePlating.lastTrigger = 0;

    // After applying all maxHealth modifiers, ensure current health isn't higher.
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
    const unlockedPowers = state.player.unlockedPowers || new Set();
    const powerUnlocked = !talent.powerPrerequisite ||
        unlockedPowers.has(talent.powerPrerequisite);
    if (!powerUnlocked) {
        return false;
    }

    if (talent.prerequisites.length === 0) {
        return true;
    }

    return talent.prerequisites.every(prereqId => {
        const prereqTalent = allTalents[prereqId];
        if (!prereqTalent) return false;
        const ranksNeeded = prereqTalent.maxRanks;
        const currentRank = state.player.purchasedTalents.get(prereqId) || 0;
        return currentRank >= ranksNeeded;
    });
}
