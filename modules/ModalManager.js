import * as THREE from '../vendor/three.module.js';
import { getCamera, getScene } from './scene.js';
import { state, savePlayerState, resetGame } from './state.js';
import { refreshPrimaryController } from './PlayerController.js';
import { AudioManager } from './audio.js';
import { bossData } from './bosses.js';
import { TALENT_GRID_CONFIG } from './talents.js';
import { purchaseTalent, applyAllTalentEffects } from './ascension.js';
import { holoMaterial, createTextSprite, updateTextSprite } from './UIManager.js';
import { gameHelpers } from './gameHelpers.js';

let modalGroup;
let activeModalId = null;
const modals = {};
let confirmCallback;

// --- UTILITY FUNCTIONS ---

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
    const text = createTextSprite(label.substring(0, 20), 32); // Truncate long labels
    text.position.z = 0.002;
    group.add(bg, border, text);
    return group;
}

function createModalContainer(width, height, title) {
    const group = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(width, height), holoMaterial(0x141428, 0.95));
    const border = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.02, height + 0.02), holoMaterial(0x00ffff, 0.5));
    border.position.z = -0.001;
    group.add(bg, border);

    if (title) {
        const titleSprite = createTextSprite(title, 48);
        titleSprite.position.set(0, height / 2 - 0.1, 0.01);
        group.add(titleSprite);
    }
    return group;
}

// --- MODAL CREATION FUNCTIONS ---

function createHomeModal() {
    const modal = createModalContainer(1.2, 0.8, 'ETERNAL MOMENTUM');
    
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
    const modal = createModalContainer(0.8, 1.0, 'Settings');

    const handedBtn = createButton(`Handedness: ${state.settings.handedness}`, () => {
        state.settings.handedness = state.settings.handedness === 'right' ? 'left' : 'right';
        updateTextSprite(handedBtn.children[2], `Handedness: ${state.settings.handedness}`);
        savePlayerState();
        refreshPrimaryController();
    }, 0.6);
    handedBtn.position.set(0, 0.2, 0.01);
    modal.add(handedBtn);
    
    // Placeholder for volume controls
    const musicLabel = createTextSprite('Music Volume: (WIP)', 32);
    musicLabel.position.set(0, 0, 0.01);
    modal.add(musicLabel);
    const sfxLabel = createTextSprite('SFX Volume: (WIP)', 32);
    sfxLabel.position.set(0, -0.1, 0.01);
    modal.add(sfxLabel);

    const closeBtn = createButton('Close', () => hideModal(), 0.6);
    closeBtn.position.set(0, -0.4, 0.01);
    modal.add(closeBtn);
    
    return modal;
}

function createConfirmModal() {
    const modal = createModalContainer(0.9, 0.5, 'CONFIRM');
    
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
    
    modal.userData = { title: modal.children.find(c => c.type === 'Sprite'), text };
    return modal;
}

function createStageSelectModal() {
    const modal = createModalContainer(1.4, 1.2, 'SELECT STAGE');
    const listContainer = new THREE.Group();
    listContainer.position.y = -0.1;
    modal.add(listContainer);

    modal.userData.refresh = () => {
        listContainer.children.forEach(child => child.removeFromParent());
        listContainer.clear();

        const maxStage = state.player.highestStageBeaten + 1;
        for (let i = 1; i <= Math.min(maxStage, 30); i++) {
            const stageInfo = bossData.find(b => b.unlock_level === (i * 5 - 5) + 10); // Approximate mapping
            if (!stageInfo) continue;
            
            const row = createButton(`${i}: ${stageInfo.name}`, () => {
                state.currentStage = i;
                resetGame();
                hideModal();
            }, 1.0);
            row.position.y = 0.4 - (i-1) * 0.12;
            listContainer.add(row);
        }
    };
    
    const closeBtn = createButton('Close', () => hideModal(), 0.6);
    closeBtn.position.set(0, -0.5, 0.01);
    modal.add(closeBtn);

    return modal;
}

function createCoresModal() {
    const modal = createModalContainer(1.2, 1.4, 'ABERRATION CORES');
    const listContainer = new THREE.Group();
    listContainer.position.y = -0.2;
    modal.add(listContainer);

    modal.userData.refresh = () => {
        listContainer.clear();
        const unlockedCores = bossData.filter(b => b.core_desc && state.player.unlockedAberrationCores.has(b.id));
        
        unlockedCores.forEach((core, i) => {
            const btn = createButton(core.name, () => {
                state.player.equippedAberrationCore = core.id;
                savePlayerState();
                modal.userData.refresh(); // Re-render to show selection
            }, 1.0);
            btn.position.y = 0.5 - i * 0.12;
            if (state.player.equippedAberrationCore === core.id) {
                // Highlight the selected core
                btn.children[0].material.color.set(0x00ff00);
            }
            listContainer.add(btn);
        });
    };

    const closeBtn = createButton('Close', () => hideModal(), 0.6);
    closeBtn.position.set(0, -0.6, 0.01);
    modal.add(closeBtn);

    return modal;
}


// --- API ---

const createModalFunctions = {
    'home': createHomeModal,
    'settings': createSettingsModal,
    'confirm': createConfirmModal,
    'levelSelect': createStageSelectModal,
    'cores': createCoresModal,
    // Stubs for other complex modals
    'ascension': () => createModalContainer(1.6, 1.4, 'ASCENSION CONDUIT (WIP)'),
    'lore': () => createModalContainer(1.2, 1.2, 'LORE CODEX (WIP)'),
    'bossInfo': () => createModalContainer(1.0, 0.8, 'BOSS INFO (WIP)'),
    'orrery': () => createModalContainer(1.6, 1.2, "WEAVER'S ORRERY (WIP)"),
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
            console.error(`Modal "${id}" creation function does not exist.`);
            return;
        }
    }
    
    const modal = modals[id];
    activeModalId = id;
    
    const distance = 1.5;
    const cameraWorldPos = new THREE.Vector3();
    const cameraWorldQuat = new THREE.Quaternion();
    camera.getWorldPosition(cameraWorldPos);
    camera.getWorldQuaternion(cameraWorldQuat);
    
    const offset = new THREE.Vector3(0, 0, -distance);
    offset.applyQuaternion(cameraWorldQuat);
    
    modalGroup.position.copy(cameraWorldPos).add(offset);
    modalGroup.quaternion.copy(cameraWorldQuat);
    
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
