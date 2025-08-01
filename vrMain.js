import * as THREE from './vendor/three.module.js';
import { initScene, getScene, getRenderer, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud, showHud } from './modules/UIManager.js';
import { initModals } from './modules/ModalManager.js';
import { vrGameLoop } from './modules/vrGameLoop.js';
import { Telemetry } from './modules/telemetry.js';
import { state, resetGame } from './modules/state.js';
import { AudioManager } from './modules/audio.js';

let renderer;

function render(timestamp, frame) {
    if (!frame) return;

    Telemetry.recordFrame();
    updatePlayerController();
    
    if (!state.isPaused) {
        vrGameLoop();
    }
    
    updateHud();
    renderer.render(getScene(), getCamera());
}

export async function launchVR(initialStage = 1) {
    // Initialize all 3D/VR components
    initScene();
    renderer = getRenderer();
    document.getElementById('vrContainer').appendChild(renderer.domElement);
    renderer.xr.enabled = true;

    // Initialize game systems
    await initPlayerController();
    initUI();
    initModals();
    AudioManager.setup(getCamera()); // Setup AudioManager with the camera's listener
    
    // Set the starting stage
    state.currentStage = initialStage;
    resetGame();
    state.isPaused = false; // Start the game immediately
    
    // Programmatically request the VR session
    try {
        const session = await navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor']
        });
        renderer.xr.setSession(session);
        
        session.addEventListener('end', () => {
            window.location.reload(); // Reload the page when the user exits VR
        });
        
        showHud();
        renderer.setAnimationLoop(render);

    } catch (e) {
        console.error("Failed to start VR session:", e);
        alert("Could not initialize VR. Please ensure your device is supported and ready.");
    }
}
