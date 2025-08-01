import { state, savePlayerState } from './state.js';
import { spawnEnemy, spawnPickup, spawnBossesForStage, handleThematicUnlock } from './gameLoop.js';
import { updateEnemies3d } from './enemyAI3d.js';
import { updateProjectiles3d, updateEffects3d } from './projectilePhysics3d.js';
import { updatePickups3d } from './pickupPhysics3d.js';
import * as CoreManager from './CoreManager.js';
import { AudioManager } from './audio.js';
import { showUnlockNotification } from './UIManager.js';
import { gameHelpers } from './gameHelpers.js';

function updatePhaseMomentum() {
    const rank = state.player.purchasedTalents.get('phase-momentum');
    const pmState = state.player.talent_states.phaseMomentum;
    if (!rank) {
        pmState.active = false;
        return;
    }
    const now = Date.now();
    if (now - pmState.lastDamageTime > 8000) {
        pmState.active = true;
    }
}

let lastSpawnTime = 0;
let lastPowerUpTime = 0;

function handleLevelProgression() {
    const now = Date.now();
    
    if (!state.bossHasSpawnedThisRun) {
        state.bossSpawnCooldownEnd = now + 3000;
        state.bossHasSpawnedThisRun = true;
    }
    
    if (!state.bossActive && now > state.bossSpawnCooldownEnd && state.bossSpawnCooldownEnd > 0) {
        state.bossSpawnCooldownEnd = 0;
        spawnBossesForStage(state.currentStage);
    }
}

function handleEnemyAndPowerSpawning() {
    const now = Date.now();
    if (!state.bossActive) return;

    if (now - lastSpawnTime > 4000) {
        if (state.enemies.filter(e => !e.boss).length < 15) {
            spawnEnemy(false);
        }
        lastSpawnTime = now;
    }

    const spawnInterval = 6000 / state.player.talent_modifiers.power_spawn_rate_modifier;
    if (now - lastPowerUpTime > spawnInterval) {
        spawnPickup();
        lastPowerUpTime = now;
    }
}

function handleBossDefeat() {
    if (state.enemies.filter(e => e.boss).length === 0) {
        state.bossActive = false;
        AudioManager.playSfx('bossDefeatSound');
        
        if (state.currentStage > state.player.highestStageBeaten) {
            state.player.highestStageBeaten = state.currentStage;
            state.player.ascensionPoints += 1;
            showUnlockNotification(`Stage Cleared! +1 AP`, `Stage ${state.currentStage + 1} Unlocked`);
        }

        handleThematicUnlock(state.currentStage);
        state.currentStage++;
        savePlayerState();

        state.bossSpawnCooldownEnd = Date.now() + 5000;
        state.bossHasSpawnedThisRun = false;
    }
}

export function vrGameLoop() {
    if (state.gameOver) return;

    handleLevelProgression();
    handleEnemyAndPowerSpawning();

    updatePhaseMomentum();

    updateEnemies3d();
    updateEffects3d();
    updateProjectiles3d();
    updatePickups3d();

    if (state.bossActive) {
        handleBossDefeat();
    }
    
    CoreManager.applyCorePassives(gameHelpers);

    if (state.player.health <= 0) {
        if (!CoreManager.onFatalDamage(null, gameHelpers)) {
            state.gameOver = true;
            AudioManager.playSfx('systemErrorSound');
        }
    }
}
