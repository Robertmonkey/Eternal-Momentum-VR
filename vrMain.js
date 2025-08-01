import * as THREE from './vendor/three.module.js';
import { initScene, getScene, getRenderer, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud, showHud } from './modules/UIManager.js';
import { initModals } from './modules/ModalManager.js';
import { vrGameLoop } from './modules/vrGameLoop.js';
import { Telemetry } from './modules/telemetry.js';
import { state, resetGame } from './modules/state.js';
import { applyAllTalentEffects } from './modules/ascension.js'; // Corrected import
import { AudioManager } from './modules/audio.js';

let renderer;

function render(timestamp, frame) {
    // The render loop only runs when a VR session is active.
    if (!renderer.xr.isPresenting) return;

    Telemetry.recordFrame();
    updatePlayerController();
    
    if (!state.isPaused) {
        vrGameLoop();
    }
    
    updateHud();
    renderer.render(getScene(), getCamera());
}

export async function launchVR(initialStage = 1) {
    // 1. Initialize all 3D/VR components
    initScene();
    renderer = getRenderer();
    document.getElementById('vrContainer').appendChild(renderer.domElement);
    renderer.xr.enabled = true;
    
    // We must set up the audio manager here to get the listener for the session
    AudioManager.setup(getCamera());

    // 2. Initialize game systems
    await initPlayerController();
    initUI();
    initModals();
    
    // 3. Set up game state for the run
    resetGame();
    state.currentStage = initialStage;
    state.isPaused = false;

    // 4. Create a VR button and programmatically click it to start the session
    const vrButton = document.createElement('button');
    vrButton.style.display = 'none'; // Keep it hidden
    document.body.appendChild(vrButton);

    vrButton.onclick = async () => {
        try {
            const session = await navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor']
            });
            renderer.xr.setSession(session);
            
            // This is the crucial part: setAnimationLoop is called *after* the session is successfully set.
            renderer.setAnimationLoop(render);
            showHud();

            session.addEventListener('end', () => {
                window.location.reload();
            });

        } catch (e) {
            console.error("Failed to start VR session:", e);
            alert("Could not start VR. Please ensure your headset is ready and try again.");
            homeScreen.style.display = 'flex';
        }
    };
    
    // Trigger the session request
    vrButton.click();
}
