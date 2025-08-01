import * as THREE from '../vendor/three.module.js';
import { getCamera, getScene } from './scene.js';
import { state, savePlayerState } from './state.js';
import { refreshPrimaryController } from './PlayerController.js';
import { AudioManager } from './audio.js';
import { bossData } from './bosses.js';
import { TALENT_GRID_CONFIG } from './talents.js';
import { purchaseTalent, applyAllTalentEffects } from './ascension.js';
import { holoMaterial, createTextSprite, updateTextSprite } from './UIManager.js';

let modalGroup;
let activeModalId = null;
const modals = {};
let confirmCallback;

function ensureGroup() {
    if (!modalGroup) {
        modalGroup = new THREE.Group();
        modalGroup.name = 'modalGroup';
        getScene().add(modalGroup);
    }
}

function createButton(label, onSelect, width = 0.5, height = 0.1) {
    const group = new THREE.Group();
    group.name = `button_${label}`;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(width, height), holoMaterial(0x111122, 0.8));
    bg.userData.onSelect = onSelect;
    const border = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.01, height + 0.01), holoMaterial(0x00ffff, 0.5));
    border.position.z = -0.001;
    const text = createTextSprite(label, 32);
    text.position.z = 0.002;
    group.add(bg, border, text);
    return group;
}

// Modal creation functions
function createHomeModal() {
    const modal = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), holoMaterial(0x141428, 0.9));
    modal.add(bg);

    const title = createTextSprite('ETERNAL MOMENTUM', 64);
    title.position.set(0, 0.25, 0.01);
    modal.add(title);

    const startBtn = createButton('AWAKEN', () => window.startGame(true), 0.8);
    startBtn.position.set(0, 0, 0.01);
    modal.add(startBtn);

    const continueBtn = createButton('CONTINUE MOMENTUM', () => window.startGame(false), 0.8);
    continueBtn.position.set(0, -0.15, 0.01);
    modal.add(continueBtn);
    
    const eraseBtn = createButton('SEVER TIMELINE', () => {
        showConfirm('SEVER TIMELINE?', 'All progress will be lost.', () => {
            localStorage.removeItem('eternalMomentumSave');
            window.location.reload();
        });
    }, 0.8);
    eraseBtn.position.set(0, -0.3, 0.01);
    modal.add(eraseBtn);

    modal.userData.refresh = () => {
        const hasSave = !!localStorage.getItem('eternalMomentumSave');
        startBtn.visible = !hasSave;
        continueBtn.visible = hasSave;
        eraseBtn.visible = hasSave;
    };
    return modal;
}

function createSettingsModal() {
    const modal = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), holoMaterial(0x141428, 0.9));
    modal.add(bg);

    const title = createTextSprite('Settings', 48);
    title.position.set(0, 0.4, 0.01);
    modal.add(title);

    // Handedness Toggle
    const handedBtn = createButton(`Handedness: ${state.settings.handedness}`, () => {
        state.settings.handedness = state.settings.handedness === 'right' ? 'left' : 'right';
        updateTextSprite(handedBtn.children[2], `Handedness: ${state.settings.handedness}`);
        savePlayerState();
        refreshPrimaryController();
    }, 0.6);
    handedBtn.position.set(0, 0.2, 0.01);
    modal.add(handedBtn);
    
    // Volume controls will be added here in a future step

    const homeBtn = createButton('Return to Home', () => {
        if(window.stop) window.stop();
        // This will transition back to the HTML home screen
        document.getElementById('vrContainer').style.display = 'none';
        document.getElementById('homeScreen').style.display = 'flex';
    }, 0.6);
    homeBtn.position.set(0, -0.2, 0.01);
    modal.add(homeBtn);

    const closeBtn = createButton('Close', () => hideModal(), 0.6);
    closeBtn.position.set(0, -0.4, 0.01);
    modal.add(closeBtn);
    
    return modal;
}

function createConfirmModal() {
    const modal = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), holoMaterial(0x141428, 0.95));
    modal.add(bg);

    const title = createTextSprite('CONFIRM', 48, '#ff4444');
    title.position.set(0, 0.15, 0.01);
    modal.add(title);
    
    const text = createTextSprite('This action cannot be undone.', 32);
    text.position.set(0, 0.05, 0.01);
    modal.add(text);
    
    const yesBtn = createButton('Confirm', () => {
        if (confirmCallback) confirmCallback();
        hideModal();
    }, 0.3);
    yesBtn.position.set(-0.2, -0.15, 0.01);
    modal.add(yesBtn);
    
    const noBtn = createButton('Cancel', () => hideModal(), 0.3);
    noBtn.position.set(0.2, -0.15, 0.01);
    modal.add(noBtn);
    
    modal.userData = { title, text };
    return modal;
}

// Stubs for other modals to be created
const createModalFunctions = {
    'home': createHomeModal,
    'settings': createSettingsModal,
    'confirm': createConfirmModal,
    // 'levelSelect': createStageSelectModal,
    // 'ascension': createAscensionModal,
    // 'cores': createCoresModal,
};

export function initModals() {
    ensureGroup();
}

export function showModal(id) {
    ensureGroup();
    const camera = getCamera();
    
    if (activeModalId && modals[activeModalId]) {
        modals[activeModalId].visible = false;
    }

    if (!modals[id]) {
        if (createModalFunctions[id]) {
            modals[id] = createModalFunctions[id]();
            modalGroup.add(modals[id]);
        } else {
            console.error(`Modal "${id}" does not exist.`);
            return;
        }
    }
    
    const modal = modals[id];
    activeModalId = id;
    
    const distance = 1.5;
    const position = new THREE.Vector3(0, 0, -distance);
    const cameraWorldPos = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPos);
    
    position.applyQuaternion(camera.quaternion);
    position.add(cameraWorldPos);
    
    modalGroup.position.copy(position);
    modalGroup.quaternion.copy(camera.quaternion);
    
    modal.visible = true;
    state.isPaused = true;
    AudioManager.playSfx('uiModalOpen');

    if (modal.userData.refresh) {
        modal.userData.refresh();
    }
}

export function hideModal() {
    if (activeModalId && modals[activeModalId]) {
        modals[activeModalId].visible = false;
        activeModalId = null;
        state.isPaused = false;
        AudioManager.playSfx('uiModalClose');
    }
}

export function showHomeMenu() {
    showModal('home');
}

export function showConfirm(title, text, onConfirm) {
    showModal('confirm');
    const modal = modals.confirm;
    if (modal) {
        updateTextSprite(modal.userData.title, title);
        updateTextSprite(modal.userData.text, text);
        confirmCallback = onConfirm;
    }
}

export function getModalObjects() {
    return Object.values(modals);
}
