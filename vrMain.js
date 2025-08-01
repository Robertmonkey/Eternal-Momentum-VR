import * as THREE from './vendor/three.module.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { initScene, getScene, getCamera, getRenderer } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud } from './modules/UIManager.js';
import { initModals, showHomeMenu } from './modules/ModalManager.js';
import { vrGameLoop } from './modules/vrGameLoop.js';
import { AudioManager } from './modules/audio.js';
import { state, loadPlayerState } from './modules/state.js';

let renderer;
let scene;
let camera;
let isRunning = false;
let vrContainer;

// Make startGame globally accessible for the home menu buttons
window.startGame = async function(resetSave = false) {
    if (resetSave) localStorage.removeItem('eternalMomentumSave');
    
    // Load state which might have been reset
    loadPlayerState();

    // Start the VR session
    try {
        const session = await navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor']
        });
        renderer.xr.setSession(session);
    } catch (e) {
        console.error("Failed to start XR session:", e);
    }
};

export function start() {
    if (isRunning) return;
    
    initScene();
    scene = getScene();
    camera = getCamera();
    renderer = getRenderer();

    vrContainer = document.getElementById('vrContainer');
    vrContainer.appendChild(renderer.domElement);
    vrContainer.appendChild(VRButton.createButton(renderer));
    
    renderer.xr.enabled = true;

    loadPlayerState();
    
    AudioManager.setup(camera);
    initPlayerController();
    initUI();
    initModals();

    renderer.xr.addEventListener('sessionstart', () => {
        isRunning = true;
        showHomeMenu(); // Show the main menu inside VR
    });

    renderer.xr.addEventListener('sessionend', () => {
        isRunning = false;
    });

    renderer.setAnimationLoop(render);
}

function render() {
    if (!renderer.xr.isPresenting) return;

    if (!state.isPaused) {
        vrGameLoop();
    }
    
    updatePlayerController();
    updateHud();

    renderer.render(getScene(), getCamera());
}

export function stop() {
    const session = renderer.xr.getSession();
    if (session) {
        session.end();
    }
    isRunning = false;
}
