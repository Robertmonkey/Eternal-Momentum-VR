import * as THREE from './vendor/three.module.js';
import { VRButton } from './vendor/addons/webxr/VRButton.js';
import { initScene, getScene, getRenderer, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud, showHud } from './modules/UIManager.js';
import { initModals, showModal } from './modules/ModalManager.js';
import { vrGameLoop } from './modules/vrGameLoop.js';
import { Telemetry } from './modules/telemetry.js';
import { state, resetGame } from './modules/state.js';
import { applyAllTalentEffects } from './modules/ascension.js';
import { AudioManager } from './modules/audio.js';
import { bossData } from './modules/bosses.js'; // Import bossData here

let renderer;

function render(timestamp, frame) {
    if (!renderer.xr.isPresenting) return;

    Telemetry.recordFrame();
    updatePlayerController();

    if (!state.isPaused) {
        vrGameLoop();
    }

    if (state.gameOver && !state.isPaused) {
        showModal('gameOver');
    }

    updateHud();
    renderer.render(getScene(), getCamera());
}

export async function launchVR(initialStage = 1) {
    initScene();
    renderer = getRenderer();
    document.getElementById('vrContainer').appendChild(renderer.domElement);
    renderer.xr.enabled = true;

    await initPlayerController();
    initUI();
    initModals();
    AudioManager.setup(getCamera());
    
    // Pass bossData to resetGame to prevent the crash
    resetGame(bossData);
    state.currentStage = initialStage;
    state.isPaused = false;

    // Use the official VRButton logic to handle the session request
    const button = VRButton.createButton(renderer);

    // Hide the button and programmatically click it to start the session
    button.style.display = 'none';
    document.body.appendChild(button);
    
    renderer.xr.addEventListener('sessionstart', () => {
        showHud();
        renderer.setAnimationLoop(render);
    });

    renderer.xr.addEventListener('sessionend', () => {
        window.location.reload();
    });

    button.click();
}
