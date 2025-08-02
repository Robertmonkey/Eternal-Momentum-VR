import * as THREE from '../vendor/three.module.js';
import { getCamera, getScene } from './scene.js';
import { state, savePlayerState, resetGame } from './state.js';
import { refreshPrimaryController, resetInputFlags } from './PlayerController.js';
import { AudioManager } from './audio.js';
import { bossData } from './bosses.js';
import { TALENT_GRID_CONFIG } from './talents.js';
import { purchaseTalent, applyAllTalentEffects } from './ascension.js';
import { holoMaterial, createTextSprite, updateTextSprite, getBgTexture } from './UIManager.js';
import { gameHelpers } from './gameHelpers.js';

let modalGroup;
const modals = {};
let confirmCallback;

// --- UTILITY FUNCTIONS ---

function ensureGroup() {
    if (!modalGroup) {
        modalGroup = new THREE.Group();
        modalGroup.name = 'modalGroup';
        const scene = getScene();
        if (scene) scene.add(modalGroup);
    }
}

function createButton(label, onSelect, width = 0.5, height = 0.1, color = 0x00ffff, bgColor = 0x111122, textColor) {
    const group = new THREE.Group();
    group.name = `button_${label.replace(/\s+/g, '_')}`;

    const bg = new THREE.Mesh(new THREE.PlaneGeometry(width, height), holoMaterial(bgColor, 0.8));
    const tex = getBgTexture();
    if (tex) { bg.material.map = tex; bg.material.needsUpdate = true; }

    const border = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.01, height + 0.01), holoMaterial(color, 0.5));
    border.position.z = -0.001;

    const txtColor = textColor !== undefined ? textColor : color;
    const colorObj = new THREE.Color(txtColor);
    const text = createTextSprite(label.substring(0, 20), 32, colorObj.getStyle());
    text.material.color.set(colorObj);
    text.position.z = 0.002;

    // Interactive behaviour
    const setHover = hovered => {
        const intensity = hovered ? 1.5 : 1;
        bg.material.emissiveIntensity = intensity;
        border.material.emissiveIntensity = intensity;
        group.scale.setScalar(hovered ? 1.05 : 1);
    };

    [bg, border, text].forEach(obj => {
        obj.userData.onSelect = onSelect;
        obj.userData.onHover = setHover;
    });

    group.add(bg, border, text);
    return group;
}

function createModalContainer(width, height, title) {
    const group = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(width, height), holoMaterial(0x1e1e2f, 0.95));
    const tex = getBgTexture();
    if (tex) { bg.material.map = tex; bg.material.needsUpdate = true; }
    const border = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.02, height + 0.02), holoMaterial(0x00ffff, 0.5));
    border.position.z = -0.001;
    group.add(bg, border);

    if (title) {
        const titleSprite = createTextSprite(title, 48);
        titleSprite.position.set(0, height / 2 - 0.1, 0.01);
        titleSprite.userData.isTitle = true; // Mark this as the title sprite
        group.add(titleSprite);
    }
    return group;
}

// --- MODAL CREATION FUNCTIONS ---

function createHomeModal() {
    const modal = createModalContainer(1.2, 0.8, 'ETERNAL MOMENTUM');
    modal.name = 'modal_home';
    modal.userData.titleSprite = modal.children.find(c => c.userData.isTitle);

    const startBtn = createButton('AWAKEN', () => window.startGame(true), 0.8, 0.1, 0x00ffff);
    startBtn.position.set(0, 0, 0.01);
    modal.add(startBtn);

    const continueBtn = createButton('CONTINUE MOMENTUM', () => window.startGame(false), 0.8, 0.1, 0x00ffff);
    continueBtn.position.set(0, -0.15, 0.01);
    modal.add(continueBtn);

    const eraseBtn = createButton('SEVER TIMELINE', () => {
        showConfirm('SEVER TIMELINE?', 'All progress will be lost.', () => {
            localStorage.removeItem('eternalMomentumSave');
            window.location.reload();
        });
    }, 0.8, 0.1, 0xe74c3c);
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
    modal.name = 'modal_settings';

    const handedBtn = createButton(`Handedness: ${state.settings.handedness}`, () => {
        state.settings.handedness = state.settings.handedness === 'right' ? 'left' : 'right';
        updateTextSprite(handedBtn.children.find(c => c.type === 'Sprite'), `Handedness: ${state.settings.handedness}`);
        savePlayerState();
        refreshPrimaryController();
    }, 0.6);
    handedBtn.position.set(0, 0.2, 0.01);
    modal.add(handedBtn);
    
    const musicLabel = createTextSprite('Music Volume: (WIP)', 32);
    musicLabel.position.set(0, 0, 0.01);
    modal.add(musicLabel);

    const sfxLabel = createTextSprite('SFX Volume: (WIP)', 32);
    sfxLabel.position.set(0, -0.1, 0.01);
    modal.add(sfxLabel);

    const closeBtn = createButton('Close', () => hideModal(), 0.6, 0.1, 0xf000ff);
    closeBtn.position.set(0, -0.4, 0.01);
    modal.add(closeBtn);
    
    return modal;
}

function createConfirmModal() {
    const modal = createModalContainer(0.9, 0.5, 'CONFIRM');
    modal.name = 'modal_confirm';
    
    const text = createTextSprite('This action cannot be undone.', 32);
    text.position.set(0, 0.05, 0.01);
    modal.add(text);
    
    const yesBtn = createButton('Confirm', () => {
        if (confirmCallback) confirmCallback();
        hideModal();
    }, 0.3, 0.1, 0xe74c3c);
    yesBtn.position.set(-0.2, -0.15, 0.01);
    modal.add(yesBtn);
    
    const noBtn = createButton('Cancel', () => hideModal(), 0.3, 0.1, 0xf000ff);
    noBtn.position.set(0.2, -0.15, 0.01);
    modal.add(noBtn);
    
    modal.userData = { titleSprite: modal.children.find(c => c.userData.isTitle), textSprite: text };
    return modal;
}

function createStageSelectModal() {
    const modal = createModalContainer(1.4, 1.2, 'SELECT STAGE');
    modal.name = 'modal_levelSelect';
    const listContainer = new THREE.Group();
    listContainer.position.y = -0.1;
    modal.add(listContainer);

    const loreCodexBtn = createButton('LORE CODEX', () => showModal('lore'), 0.4, 0.08, 0xff8800);
    loreCodexBtn.position.set(0.5, 0.5, 0.02);
    modal.add(loreCodexBtn);

    const arenaBtn = createButton("WEAVER'S ORRERY", () => { hideModal(); showModal('orrery'); }, 0.6, 0.1, 0x9b59b6);
    arenaBtn.position.set(-0.45, -0.5, 0.01);
    const frontierBtn = createButton('JUMP TO FRONTIER', () => {
        const stage = state.player.highestStageBeaten > 0 ? state.player.highestStageBeaten + 1 : 1;
        state.currentStage = stage;
        resetGame(bossData);
        hideModal();
    }, 0.6, 0.1, 0x00ffff, 0x00ffff, 0x1e1e2f);
    frontierBtn.position.set(0.45, -0.5, 0.01);

    const closeBtn = createButton('Close', () => hideModal(), 0.5, 0.1, 0xf000ff);
    closeBtn.position.set(0, -0.65, 0.01);

    modal.add(arenaBtn, frontierBtn, closeBtn);

    modal.userData.refresh = () => {
        listContainer.clear();
        arenaBtn.visible = state.player.highestStageBeaten >= 30;
        const maxStage = state.player.highestStageBeaten + 1;
        for (let i = 1; i <= Math.min(maxStage, 30); i++) {
            const bossIds = bossData.filter(b => b.unlock_level === (i * 5 - 5) + 10).map(b => b.id);
            if (!bossIds.length) continue;
            const bossNames = bossIds.map(id => {
                const b = bossData.find(x => x.id === id);
                return b ? b.name : 'Unknown';
            }).join(' & ');

            const row = new THREE.Group();
            const stageBtn = createButton(`STAGE ${i}`, () => {
                state.currentStage = i;
                resetGame(bossData);
                hideModal();
            }, 0.6);
            row.add(stageBtn);

            const nameSprite = createTextSprite(bossNames, 28);
            nameSprite.position.set(-0.2, -0.07, 0.01);
            row.add(nameSprite);

            const mechBtn = createButton('❔', () => showBossInfo(bossIds, 'mechanics'), 0.12, 0.12, 0xf1c40f);
            mechBtn.position.set(0.4, 0.02, 0.01);
            const loreBtn = createButton('ℹ️', () => showBossInfo(bossIds, 'lore'), 0.12, 0.12, 0x9b59b6);
            loreBtn.position.set(0.4, -0.08, 0.01);
            row.add(mechBtn, loreBtn);

            row.position.y = 0.4 - (i - 1) * 0.15;
            listContainer.add(row);
        }
    };

    return modal;
}

function createCoresModal() {
    const modal = createModalContainer(1.2, 1.4, 'ABERRATION CORES');
    modal.name = 'modal_cores';
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
                modal.userData.refresh();
            }, 1.0, 0.1, core.color ? new THREE.Color(core.color).getHex() : 0x00ffff, 0x111122);
            btn.position.y = 0.5 - i * 0.12;
            btn.children[0].material.color.set(core.color || '#ffffff');
            btn.children[0].material.emissive.set(core.color || '#ffffff');
            btn.children[1].material.color.set(core.color || '#ffffff');
            if (state.player.equippedAberrationCore === core.id) {
                btn.scale.setScalar(1.1);
                btn.children[1].material.color.set(0x00ff00);
            }
            listContainer.add(btn);
        });
    };

    const closeBtn = createButton('Close', () => hideModal(), 0.6, 0.1, 0xf000ff);
    closeBtn.position.set(0, -0.6, 0.01);
    modal.add(closeBtn);

    return modal;
}

// --- API ---

const createModalFunctions = {
    "home": createHomeModal,
    "settings": createSettingsModal,
    "confirm": createConfirmModal,
    "levelSelect": createStageSelectModal,
    "cores": createCoresModal,
    "ascension": createAscensionModal,
    "lore": createLoreModal,
    "bossInfo": createBossInfoModal,
    "orrery": createOrreryModal,
    "gameOver": createGameOverModal,
};

export function initModals() {
    ensureGroup();
}

export function showModal(id) {
    ensureGroup();

    if (state.activeModalId && modals[state.activeModalId]) {
        modals[state.activeModalId].visible = false;
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
    state.activeModalId = id;
    
    const camera = getCamera();
    if (!camera) {
        console.warn('Cannot show modal before camera is ready.');
        return;
    }
    const distance = 1.5;
    const cameraWorldPos = new THREE.Vector3();
    const cameraWorldQuat = new THREE.Quaternion();
    camera.getWorldPosition(cameraWorldPos);
    camera.getWorldQuaternion(cameraWorldQuat);
    
    const offset = new THREE.Vector3(0, 0, -distance);
    offset.applyQuaternion(cameraWorldQuat);
    
    modalGroup.position.copy(cameraWorldPos).add(offset);
    modalGroup.quaternion.copy(cameraWorldQuat);

    // Pause the game before heavy UI creation to avoid race conditions
    state.isPaused = true;
    resetInputFlags();
    modal.visible = true;
    AudioManager.playSfx('uiModalOpen');

    if (modal.userData.refresh) {
        // Defer refresh to the next frame so the paused state takes effect
        requestAnimationFrame(() => {
            if (state.activeModalId === id) {
                modal.userData.refresh();
            }
        });
    }
}

export function hideModal() {
    if (state.activeModalId && modals[state.activeModalId]) {
        modals[state.activeModalId].visible = false;
        state.activeModalId = null;
        // Defer unpausing to allow another modal to open within the same frame
        requestAnimationFrame(() => {
            if (!state.activeModalId) {
                state.isPaused = false;
            }
        });
        resetInputFlags();
        AudioManager.playSfx('uiModalClose');
    }
}

export function showHomeMenu() {
    showModal('home');
}

export function showConfirm(title, text, onConfirm) {
    showModal('confirm');
    const modal = modals.confirm;
    if (modal && modal.userData.titleSprite && modal.userData.textSprite) {
        updateTextSprite(modal.userData.titleSprite, title);
        updateTextSprite(modal.userData.textSprite, text);
        confirmCallback = onConfirm;
    }
}

export function getModalObjects() {
    return Object.values(modals);
}

export function getModalByName(id) {
    return modals[id];
}

function createAscensionModal() {
    const modal = createModalContainer(1.6, 1.4, 'ASCENSION CONDUIT');
    modal.name = 'modal_ascension';
    const grid = new THREE.Group();
    grid.position.y = -0.1;
    modal.add(grid);

    const lines = new THREE.Group();
    grid.add(lines);

    const infoName = createTextSprite('', 32);
    infoName.position.set(0, 0.6, 0.01);
    const infoDesc = createTextSprite('', 24);
    infoDesc.position.set(0, 0.52, 0.01);
    const infoFooter = createTextSprite('', 24, '#cccccc');
    infoFooter.position.set(0, 0.46, 0.01);
    modal.add(infoName, infoDesc, infoFooter);

    const apLabel = createTextSprite('ASCENSION POINTS', 28, '#00ffff');
    apLabel.position.set(0, 0.7, 0.01);
    const apValue = createTextSprite(`${state.player.ascensionPoints}`, 36, '#00ffff');
    apValue.position.set(0, 0.65, 0.01);
    modal.add(apLabel, apValue);

    modal.userData.refresh = () => {
        grid.clear();
        lines.clear();
        const positions = {};
        const allTalents = {};
        Object.values(TALENT_GRID_CONFIG).forEach(con => {
            Object.keys(con).forEach(key => {
                if (key === 'color') return;
                allTalents[key] = con[key];
            });
        });
        Object.values(TALENT_GRID_CONFIG).forEach(con => {
            Object.keys(con).forEach(key => {
                if (key === 'color') return;
                const t = con[key];
                const btn = createButton(t.icon, () => { purchaseTalent(t.id); modal.userData.refresh(); }, 0.12, 0.12);
                const pos = new THREE.Vector3((t.position.x / 50 - 1) * 0.7, (1 - t.position.y / 50) * 0.6, 0.01);
                btn.position.copy(pos);
                btn.userData.onHover = hovered => {
                    if (hovered) {
                        const purchased = state.player.purchasedTalents.get(t.id) || 0;
                        const isMax = !t.isInfinite && purchased >= t.maxRanks;
                        let cost;
                        if (isMax) cost = 'MAXED';
                        else if (t.isInfinite) cost = `${t.costPerRank[0]} AP`;
                        else cost = `${t.costPerRank[purchased]} AP`;
                        updateTextSprite(infoName, t.name);
                        updateTextSprite(infoDesc, t.description(purchased + 1, isMax));
                        updateTextSprite(infoFooter, `Rank: ${purchased}/${t.isInfinite ? '∞' : t.maxRanks}  Cost: ${cost}`);
                    }
                };
                grid.add(btn);
                positions[t.id] = pos.clone();
            });
        });

        Object.values(TALENT_GRID_CONFIG).forEach(con => {
            const baseColor = new THREE.Color(con.color || '#00ffff');
            Object.keys(con).forEach(key => {
                if (key === 'color') return;
                const t = con[key];
                const end = positions[t.id];
                t.prerequisites.forEach(pr => {
                    const start = positions[pr];
                    if (!start) return;
                    const prereq = allTalents[pr];
                    const nexusConnection = (t.isNexus || (prereq && prereq.isNexus));
                    let color = baseColor;
                    let width = 0.01;
                    if (nexusConnection) {
                        color = new THREE.Color(0x00ff00);
                        width = 0.015;
                    }
                    const currentRank = state.player.purchasedTalents.get(pr) || 0;
                    const needed = prereq ? prereq.maxRanks : 1;
                    const opacity = currentRank >= needed ? 1.0 : 0.3;
                    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: width });
                    const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
                    lines.add(new THREE.Line(geom, mat));
                });
            });
        });

        updateTextSprite(apValue, `${state.player.ascensionPoints}`);
    };

    const closeBtn = createButton('Close', () => hideModal(), 0.6, 0.1, 0xf000ff);
    closeBtn.position.set(0, -0.6, 0.01);
    modal.add(closeBtn);
    return modal;
}

function createLoreModal() {
    const modal = createModalContainer(1.2, 1.2, 'LORE CODEX');
    modal.name = 'modal_lore';
    const list = new THREE.Group();
    list.position.y = 0.4;
    modal.add(list);

    modal.userData.refresh = () => {
        list.clear();
        const bosses = bossData.filter(b => b.lore);
        bosses.forEach((b, i) => {
            const btn = createButton(b.name, () => showBossInfo([b.id], 'lore'), 1.0);
            btn.position.set(0, 0.4 - i * 0.12, 0.01);
            list.add(btn);
        });
    };

    const closeBtn = createButton('Close', () => hideModal(), 0.6, 0.1, 0xf000ff);
    closeBtn.position.set(0, -0.5, 0.01);
    modal.add(closeBtn);
    return modal;
}

function createBossInfoModal() {
    const modal = createModalContainer(1.2, 1.0, 'BOSS INFO');
    modal.name = 'modal_bossInfo';
    const content = createTextSprite('', 32);
    content.position.set(0, 0.1, 0.01);
    modal.add(content);
    const closeBtn = createButton('Close', () => hideModal(), 0.6, 0.1, 0xf000ff);
    closeBtn.position.set(0, -0.4, 0.01);
    modal.add(closeBtn);
    modal.userData.contentSprite = content;
    modal.userData.titleSprite = modal.children.find(c => c.userData.isTitle);
    return modal;
}

function createGameOverModal() {
    const modal = createModalContainer(1.2, 1.0, 'TIMELINE COLLAPSED');
    modal.name = 'modal_gameOver';

    const restartBtn = createButton('Restart Stage', () => {
        resetGame(bossData);
        hideModal();
    }, 0.8, 0.1, 0x00ffff);
    restartBtn.position.set(0, 0.2, 0.01);
    modal.add(restartBtn);

    const ascBtn = createButton('Ascension Conduit', () => { hideModal(); showModal('ascension'); }, 0.8, 0.1, 0xff8800);
    ascBtn.position.set(0, 0.05, 0.01);
    modal.add(ascBtn);

    const coreBtn = createButton('Aberration Cores', () => { hideModal(); showModal('cores'); }, 0.8, 0.1, 0x00ff00);
    coreBtn.position.set(0, -0.1, 0.01);
    modal.add(coreBtn);

    const stageBtn = createButton('Stage Select', () => { hideModal(); showModal('levelSelect'); }, 0.8, 0.1, 0x9b59b6);
    stageBtn.position.set(0, -0.25, 0.01);
    modal.add(stageBtn);

    return modal;
}

function createOrreryModal() {
    const modal = createModalContainer(1.6, 1.2, "WEAVER'S ORRERY");
    modal.name = 'modal_orrery';
    const list = new THREE.Group();
    list.position.y = 0.4;
    modal.add(list);

    modal.userData.refresh = () => {
        list.clear();
        const costs = {1:2,2:5,3:8};
        bossData.filter(b=>b.difficulty_tier).forEach((b,i)=>{
            const cost = costs[b.difficulty_tier] || 2;
            const btn = createButton(`${b.name} (${cost})`, () => showBossInfo([b.id], 'mechanics'), 1.2);
            btn.position.set(0, 0.4 - i*0.12, 0.01);
            list.add(btn);
        });
    };

    const closeBtn = createButton('Close', () => hideModal(), 0.6, 0.1, 0xf000ff);
    closeBtn.position.set(0, -0.5, 0.01);
    modal.add(closeBtn);
    return modal;
}


export function showBossInfo(bossIds, type = 'mechanics') {
    showModal('bossInfo');
    const modal = modals.bossInfo;
    if (!modal) return;
    const bosses = bossIds.map(id => bossData.find(b => b.id === id)).filter(b => b);
    if (bosses.length === 0) return;
    const title = bosses.map(b => b.name).join(' & ');
    const content = bosses.map(b => type === 'lore' ? b.lore : b.mechanics_desc).join('\n\n');
    if (modal.userData.titleSprite) updateTextSprite(modal.userData.titleSprite, title);
    if (modal.userData.contentSprite) updateTextSprite(modal.userData.contentSprite, content);
}
