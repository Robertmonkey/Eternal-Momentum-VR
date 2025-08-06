import * as THREE from '../vendor/three.module.js';
import { getCamera, getScene } from './scene.js';
import { state, savePlayerState, resetGame } from './state.js';
import { refreshPrimaryController, resetInputFlags } from './PlayerController.js';
import { AudioManager } from './audio.js';
import { bossData } from './bosses.js';
import { TALENT_GRID_CONFIG } from './talents.js';
import { purchaseTalent, isTalentVisible, getConstellationColorOfTalent } from './ascension.js';
import { holoMaterial, createTextSprite, updateTextSprite, getBgTexture, hideHud, showHud } from './UIManager.js';
import { gameHelpers } from './gameHelpers.js';
import { disposeGroupChildren, wrapText } from './helpers.js';
import { STAGE_CONFIG } from './config.js';

const RAF = typeof requestAnimationFrame === 'function'
  ? requestAnimationFrame
  : (fn) => setTimeout(() => fn(Date.now()), 16);
const CAF = typeof cancelAnimationFrame === 'function'
  ? cancelAnimationFrame
  : (id) => clearTimeout(id);

function enableTextScroll(sprite, visibleWidth, duration = 10000) {
  const fullWidth = sprite.scale.x;
  const overflow = fullWidth - visibleWidth;
  if (overflow <= 0) return;
  const baseX = sprite.position.x;
  let start = 0;
  let frameId;

  function step(now) {
    if (!sprite.userData.scrollActive) return;
    if (!start) start = now;
    const t = ((now - start) % duration) / duration;
    sprite.position.x = baseX - t * overflow;
    frameId = RAF(step);
  }

  sprite.userData.scrollStart = () => {
    if (sprite.userData.scrollActive) return;
    sprite.userData.scrollActive = true;
    start = 0;
    frameId = RAF(step);
  };

  sprite.userData.scrollStop = () => {
    sprite.userData.scrollActive = false;
    sprite.position.x = baseX;
    if (frameId) {
      CAF(frameId);
      frameId = null;
    }
  };
}

let modalGroup;
const modals = {};
let confirmCallback;

function getBossesForStage(stageNum) {
    const stageData = STAGE_CONFIG.find(s => s.stage === stageNum);
    return stageData ? stageData.bosses : [];
}

// --- UTILITY FUNCTIONS ---

function ensureGroup() {
    if (!modalGroup) {
        modalGroup = new THREE.Group();
        modalGroup.name = 'modalGroup';
        // Menus were difficult to read because they were tiny. Tripling the
        // scale here makes every modal roughly match the size of the 2D UI
        // without altering individual element proportions.
        modalGroup.scale.setScalar(3);
        const scene = getScene();
        if (scene) scene.add(modalGroup);
    }
}

function createButton(
    label,
    onSelect,
    width = 0.5,
    height = 0.1,
    color = 0x00ffff,
    bgColor = 0x111122,
    textColor,
    bgOpacity = 0.8,
    shape = 'rect',
    hoverScale = 1.05
) {
    const group = new THREE.Group();
    group.name = `button_${label.replace(/\s+/g, '_')}`;

    let bgGeom, borderGeom;
    if (shape === 'circle') {
        const radius = width / 2;
        bgGeom = new THREE.CircleGeometry(radius, 32);
        borderGeom = new THREE.CircleGeometry(radius + 0.005, 32);
    } else {
        bgGeom = new THREE.PlaneGeometry(width, height);
        borderGeom = new THREE.PlaneGeometry(width + 0.01, height + 0.01);
    }

    const bg = new THREE.Mesh(bgGeom, holoMaterial(bgColor, bgOpacity));
    // Button backgrounds need to draw after the modal panel so they aren't
    // hidden when depth testing is disabled. Raising the renderOrder keeps
    // them consistently on top of the container background.
    bg.renderOrder = 1;
    group.add(bg);

    const border = new THREE.Mesh(borderGeom, holoMaterial(color, 0.5));
    // Keep the border coplanar with the button face so it doesn't appear to
    // drift relative to the background when the player moves their head.
    border.position.z = 0.001;
    // Draw the border just above the button background but below the label so
    // its frame is always visible without fighting the face for depth.
    border.renderOrder = 1.1;
    group.add(border);

    const txtColor = textColor !== undefined ? textColor : color;
    const colorObj = new THREE.Color(txtColor);
    const text = createTextSprite(label.substring(0, 20), 32, colorObj.getStyle());
    text.material.color.set(colorObj);
    // Text needs the highest render order so it always appears above the
    // button face.
    text.renderOrder = 2;
    text.position.z = 0.002;
    group.add(text);

    // Interactive behaviour
    const setHover = hovered => {
        const intensity = hovered ? 1.5 : 1;
        bg.material.emissiveIntensity = intensity;
        border.material.emissiveIntensity = intensity;
        group.scale.setScalar(hovered ? hoverScale : 1);
        if (hovered) AudioManager.playSfx('uiHoverSound');
    };

    [bg, border, text].forEach(obj => {
        obj.userData.onSelect = onSelect;
        obj.userData.onHover = setHover;
    });

    return group;
}

function createModalContainer(width, height, title, options = {}) {
    const group = new THREE.Group();
    // Preserve the modal's unscaled dimensions so we can position the
    // container relative to the player's height when showing it.
    group.userData.width = width;
    group.userData.height = height;

    const {
        titleColor = '#eaf2ff',
        titleShadowColor = null,
        titleShadowBlur = 0,
        backgroundColor = 0x1e1e2f,
        backgroundOpacity = 0.95,
        borderColor = 0x00ffff,
        borderOpacity = 0.5,
        titleAlign = 'center'
    } = options;

    const bg = new THREE.Mesh(new THREE.PlaneGeometry(width, height), holoMaterial(backgroundColor, backgroundOpacity));
    bg.renderOrder = 0;
    group.add(bg);

    const tex = getBgTexture();
    if (tex) {
        const pattern = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.15,
            depthTest: false,
            depthWrite: false
        }));
        pattern.position.z = 0.001;
        pattern.renderOrder = 0.5;
        group.add(pattern);
    }

    if (borderOpacity > 0) {
        const borderGeom = new THREE.PlaneGeometry(width + 0.02, height + 0.02);
        const border = new THREE.Mesh(borderGeom, holoMaterial(borderColor, borderOpacity));
        // Place the border slightly in front of the background so its edge is
        // always visible and coplanar with the panel.
        border.position.z = 0.001;
        border.renderOrder = 1;
        group.add(border);
    }

    if (title) {
        const titleSprite = createTextSprite(title, 48, titleColor, titleAlign, titleShadowColor, titleShadowBlur);
        const margin = 0.1;
        let x = 0;
        if (titleAlign === 'left') {
            x = -width / 2 + margin + titleSprite.scale.x / 2;
        } else if (titleAlign === 'right') {
            x = width / 2 - margin - titleSprite.scale.x / 2;
        }
        titleSprite.position.set(x, height / 2 - 0.1, 0.01);
        titleSprite.userData.isTitle = true; // Mark this as the title sprite
        group.add(titleSprite);
    }
    return group;
}

/**
 * Adds a vertical scrollbar to a list within a modal.
 * The scrollbar appears only when the list height exceeds the view height.
 *
 * @param {THREE.Object3D} modal - The modal to attach the scrollbar to.
 * @param {THREE.Group} list - Group containing list items to scroll.
 * @param {Object} options
 * @param {number} options.itemHeight - Height of each list item.
 * @param {number} options.viewHeight - Visible height of the list.
 * @param {number} options.topOffset - Y offset of the first item.
 * @param {number} options.x - X position for the scrollbar components.
 * @param {('top'|'bottom')} [options.startAt='top'] - Initial scroll position.
 */
function addScrollBar(modal, list, { itemHeight, viewHeight, topOffset, x, startAt = 'top' }) {
    if (modal.userData.scrollGroup) {
        modal.remove(modal.userData.scrollGroup);
        modal.userData.scrollGroup = null;
    }

    const items = list.children;
    const totalItems = items.length;
    const totalHeight = itemHeight * totalItems;

    // Ensure items are positioned at baseline
    items.forEach((child, i) => {
        child.position.y = topOffset - i * itemHeight;
        child.visible = true;
    });

    if (totalHeight <= viewHeight) return; // No scroll needed

    const group = new THREE.Group();
    modal.userData.scrollGroup = group;
    modal.add(group);

    const top = list.position.y + topOffset;
    const bottom = top - viewHeight;

    const upBtn = createButton('▲', () => scrollBy(-itemHeight), 0.08, 0.08, 0x00ffff);
    upBtn.position.set(x, top + 0.05, 0.02);
    const downBtn = createButton('▼', () => scrollBy(itemHeight), 0.08, 0.08, 0x00ffff);
    downBtn.position.set(x, bottom - 0.05, 0.02);
    group.add(upBtn, downBtn);

    const trackHeight = viewHeight - 0.1;
    const track = new THREE.Mesh(new THREE.PlaneGeometry(0.04, trackHeight), holoMaterial(0x111122, 0.6));
    const handleHeight = Math.max(0.1, trackHeight * (viewHeight / totalHeight));
    const handle = new THREE.Mesh(new THREE.PlaneGeometry(0.04, handleHeight), holoMaterial(0x00ffff, 0.9));
    handle.position.z = 0.01;
    const trackGroup = new THREE.Group();
    trackGroup.add(track, handle);
    trackGroup.position.set(x, (top + bottom) / 2, 0.01);
    group.add(trackGroup);

    let offset = 0;
    const maxOffset = totalHeight - viewHeight;
    if (startAt === 'bottom') offset = maxOffset;

    function update() {
        items.forEach((child, i) => {
            const y = topOffset - i * itemHeight - offset;
            child.position.y = y;
            child.visible = y <= topOffset && y >= topOffset - viewHeight;
        });

        const ratio = offset / maxOffset;
        const range = trackHeight - handleHeight;
        handle.position.y = range / 2 - ratio * range;
    }

    function scrollBy(delta) {
        offset = Math.min(Math.max(offset + delta, 0), maxOffset);
        update();
    }

    update();
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
    // Match the 2D game's confirm dialog styling: magenta border and title,
    // red confirm button, and a bright magenta cancel button.
    const modal = createModalContainer(0.9, 0.5, 'CONFIRM', {
        titleColor: '#f000ff',
        borderColor: 0xf000ff,
        borderOpacity: 1,
    });
    modal.name = 'modal_confirm';

    const text = createTextSprite('This action cannot be undone.', 32);
    text.position.set(0, 0.05, 0.01);
    modal.add(text);

    const yesBtn = createButton('Confirm', () => {
        if (confirmCallback) confirmCallback();
        hideModal();
    }, 0.3, 0.1, 0xe74c3c, 0xc0392b, 0xffffff);
    yesBtn.position.set(-0.2, -0.15, 0.01);
    modal.add(yesBtn);

    const noBtn = createButton('Cancel', () => hideModal(), 0.3, 0.1, 0xf000ff, 0xf000ff, 0xffffff);
    noBtn.position.set(0.2, -0.15, 0.01);
    modal.add(noBtn);

    modal.userData = { titleSprite: modal.children.find(c => c.userData.isTitle), textSprite: text };
    return modal;
}

function createStageSelectModal() {
    const width = 1.4;
    const height = 1.2;
    const modal = createModalContainer(width, height, 'SELECT STAGE');
    modal.name = 'modal_levelSelect';
    const listContainer = new THREE.Group();
    listContainer.position.y = -0.1;
    modal.add(listContainer);

    const loreCodexBtn = createButton(
        'LORE CODEX',
        () => showModal('lore'),
        0.4,
        0.08,
        0xff8800,
        0xff8800,
        0xff8800,
        0.25
    );
    // Tuck the button 5cm from the top-right edge to keep it inside the panel
    // bounds and mirror the 2D menu's margin.
    loreCodexBtn.position.set(width / 2 - 0.05 - 0.2, height / 2 - 0.05 - 0.04, 0.02);
    modal.add(loreCodexBtn);

    const arenaBtn = createButton("WEAVER'S ORRERY", () => { hideModal(); showModal('orrery'); }, 0.6, 0.1, 0x9b59b6);
    // Center the bottom buttons with equal 5cm side margins so they no longer
    // bleed past the container.
    const bottomY = -height / 2 + 0.1;
    arenaBtn.position.set(-width / 2 + 0.05 + 0.3, bottomY, 0.01);
    const frontierBtn = createButton('JUMP TO FRONTIER', () => {
        const stage = state.player.highestStageBeaten > 0 ? state.player.highestStageBeaten + 1 : 1;
        state.currentStage = stage;
        resetGame(bossData);
        hideModal();
    }, 0.6, 0.1, 0x00ffff, 0x00ffff, 0x1e1e2f);
    frontierBtn.position.set(width / 2 - 0.05 - 0.3, bottomY, 0.01);

    const closeBtn = createButton('Close', () => hideModal(), 0.5, 0.1, 0xf000ff);
    // Raise the close button so its bottom edge aligns with the modal's border.
    closeBtn.position.set(0, -height / 2 + 0.05, 0.01);

    modal.add(arenaBtn, frontierBtn, closeBtn);

    modal.userData.refresh = () => {
        disposeGroupChildren(listContainer);
        arenaBtn.visible = state.player.highestStageBeaten >= 30;
        const maxStage = state.player.highestStageBeaten + 1;
        for (let i = 1; i <= maxStage; i++) {
            const bossIds = getBossesForStage(i);
            if (!bossIds || bossIds.length === 0) continue;
            const bossNames = bossIds.map(id => {
                const b = bossData.find(x => x.id === id);
                return b ? b.name : 'Unknown';
            }).join(' & ');

            const startStage = () => {
                state.currentStage = i;
                resetGame(bossData);
                hideModal();
            };

            const rowWidth = width - 0.1;
            // Row background and border to mimic original stage-select item
            const row = createButton('', startStage, rowWidth, 0.12, 0x00ffff, 0x00ffff, 0x00ffff, 0.1);
            const bg = row.children[0];
            const border = row.children[1];
            border.material.opacity = 0.4; // match rgba border from 2D menu
            if (row.children[2]) row.children[2].visible = false; // hide default label

            const stageText = createTextSprite(`STAGE ${i}`, 32, '#00ffff', 'left');
            const leftEdge = -rowWidth / 2 + 0.02;
            stageText.position.set(leftEdge + stageText.scale.x / 2, 0.02, 0.01);
            const bossText = createTextSprite(bossNames, 24, '#eaf2ff', 'left');
            bossText.material.opacity = 0.8;
            bossText.position.set(leftEdge + bossText.scale.x / 2, -0.04, 0.01);
            enableTextScroll(bossText, rowWidth - 0.4);

            const handleHover = hovered => {
                bg.material.opacity = hovered ? 0.2 : 0.1;
                border.material.opacity = hovered ? 1 : 0.4;
                border.material.color.setHex(hovered ? 0xffffff : 0x00ffff);
                if (bossText.userData.scrollStart) {
                    hovered ? bossText.userData.scrollStart() : bossText.userData.scrollStop();
                }
            };

            [bg, border, stageText, bossText].forEach(obj => {
                obj.userData.onSelect = startStage;
                obj.userData.onHover = handleHover;
            });

            row.add(stageText, bossText);

            const createInfoButton = (icon, color, label, onClick) => {
                const btn = createButton(icon, onClick, 0.12, 0.12, color, color, 0xffffff, 0.2, 'circle');
                const btnBg = btn.children[0];
                const btnBorder = btn.children[1];
                btnBorder.material.opacity = 0.8;
                const tip = createTextSprite(label, 20, '#ffffff', 'center');
                tip.position.set(0, 0.1, 0.02);
                tip.visible = false;
                btn.add(tip);
                btn.userData.onHover = hovered => {
                    btnBg.material.opacity = hovered ? 0.4 : 0.2;
                    tip.visible = hovered;
                    handleHover(hovered);
                };
                return btn;
            };
            const mechBtn = createInfoButton('❔', 0xf1c40f, 'Mechanics', () => showBossInfo(bossIds, 'mechanics'));
            const loreBtn = createInfoButton('ℹ️', 0x9b59b6, 'Lore', () => showBossInfo(bossIds, 'lore'));
            const rightEdge = rowWidth / 2;
            const btnRadius = 0.06;
            const gap = 0.04;
            const loreX = rightEdge - (btnRadius + 0.02);
            const mechX = loreX - (btnRadius * 2 + gap);
            mechBtn.position.set(mechX, 0, 0.01);
            loreBtn.position.set(loreX, 0, 0.01);
            row.add(mechBtn, loreBtn);

            row.position.y = 0.4 - (i - 1) * 0.15;
            listContainer.add(row);
        }
        addScrollBar(modal, listContainer, { itemHeight: 0.15, viewHeight: 0.8, topOffset: 0.4, x: width / 2 - 0.05, startAt: 'bottom' });
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
        disposeGroupChildren(listContainer);
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
        addScrollBar(modal, listContainer, { itemHeight: 0.12, viewHeight: 0.8, topOffset: 0.5, x: 0.55 });
    };

    const footerY = -0.6;
    const unequipWidth = 0.8;
    const closeWidth = 0.6;

    const unequipBtn = createButton('UNEQUIP CORE', () => {
        if (state.player.equippedAberrationCore === null) return;
        const doUnequip = () => {
            state.player.equippedAberrationCore = null;
            savePlayerState();
            modal.userData.refresh();
            hideModal();
            if (!state.gameOver) resetGame(bossData);
        };
        if (!state.gameOver) {
            showConfirm(
                '|| DESTABILIZE TIMELINE? ||',
                'Attuning to nothing requires a full system recalibration.\nThe current timeline will collapse and the stage will restart.',
                doUnequip
            );
        } else {
            doUnequip();
        }
    }, unequipWidth, 0.1, 0xe74c3c, 0xc0392b, 0xffffff);
    unequipBtn.position.set(-0.6 + 0.1 + unequipWidth / 2, footerY, 0.01);

    const closeBtn = createButton('CLOSE', () => hideModal(), closeWidth, 0.1, 0xf000ff, 0xf000ff, 0xffffff);
    closeBtn.position.set(0.6 - 0.1 - closeWidth / 2, footerY, 0.01);
    modal.add(unequipBtn, closeBtn);

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

    const prevId = state.activeModalId;
    const prevModal = prevId ? modals[prevId] : null;
    if (prevModal) prevModal.visible = false;

    if (!modals[id]) {
        if (createModalFunctions[id]) {
            modals[id] = createModalFunctions[id]();
            modalGroup.add(modals[id]);
        } else {
            console.error(`Modal "${id}" creation function does not exist.`);
            if (prevModal) prevModal.visible = true;
            return;
        }
    }

    const modal = modals[id];

    const camera = getCamera();
    if (!camera) {
        console.warn('Cannot show modal before camera is ready.');
        if (prevModal) prevModal.visible = true;
        return;
    }

    // Place the modal group directly in front of the player and lift it so
    // the bottom of the menu is roughly at waist height for better
    // readability.
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
    modalGroup.position.copy(camera.position).addScaledVector(forward, 2);
    // Elevate menus so their bottoms sit around the player's waist height
    // rather than intersecting the floor. We derive the modal's height from
    // its unscaled dimensions and the group's scaling factor.
    const modalHeight = (modal?.userData?.height || 0) * modalGroup.scale.y;
    const waistOffset = 0.6; // approximate distance from head to waist in meters
    modalGroup.position.y = camera.position.y - waistOffset + modalHeight / 2;
    const lookTarget = camera.position.clone();
    lookTarget.y = modalGroup.position.y;
    modalGroup.lookAt(lookTarget);

    state.activeModalId = id;
    // Pause the game before heavy UI creation to avoid race conditions
    state.isPaused = true;
    resetInputFlags();
    state.uiInteractionCooldownUntil = Date.now() + 250;
    hideHud();
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

export function updateActiveModalTransform() {
    if (!modalGroup || !state.activeModalId) return;
    const camera = getCamera();
    if (!camera) return;
    const modal = modals[state.activeModalId];
    const forward = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(camera.quaternion)
        .setY(0)
        .normalize();
    modalGroup.position.copy(camera.position).addScaledVector(forward, 2);
    const modalHeight = (modal?.userData?.height || 0) * modalGroup.scale.y;
    const waistOffset = 0.6;
    modalGroup.position.y = camera.position.y - waistOffset + modalHeight / 2;
    const lookTarget = camera.position.clone();
    lookTarget.y = modalGroup.position.y;
    modalGroup.lookAt(lookTarget);
}

export function hideModal() {
    if (state.activeModalId && modals[state.activeModalId]) {
        const modal = modals[state.activeModalId];
        modal.traverse(obj => {
            if (obj.userData && obj.userData.scrollStop) obj.userData.scrollStop();
        });
        modal.visible = false;
        state.activeModalId = null;
        resetInputFlags();
        AudioManager.playSfx('uiModalClose');
        state.isPaused = false; // Unpause unless another condition requires it
        showHud();
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
    const width = 1.6;
    const height = 1.4;
    // Match the 2D game's cyan title, glow, and left-aligned header.
    const modal = createModalContainer(width, height, 'ASCENSION CONDUIT', {
        titleColor: '#00ffff',
        titleShadowColor: '#00ffff',
        titleShadowBlur: 10,
        titleAlign: 'left'
    });
    modal.name = 'modal_ascension';

    // Add a subtle cyan glow behind the container to mirror the 2D game's
    // box-shadow effect around the Ascension Conduit modal.
    const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(width + 0.2, height + 0.2),
        holoMaterial(0x00ffff, 0.15)
    );
    glow.position.z = -0.005;
    glow.renderOrder = -1;
    modal.add(glow);

    // Center the talent grid and keep a referenceable name for tests.
    const grid = new THREE.Group();
    grid.name = 'ascension_grid';
    modal.add(grid);

    const lines = new THREE.Group();
    lines.renderOrder = 0.5;
    grid.add(lines);

    function createApDisplay() {
        const group = new THREE.Group();
        // Match the 2D game's semi-transparent header box and cyan border.
        const bgHeight = 0.15;
        const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, bgHeight), holoMaterial(0x000000, 0.3));
        const border = new THREE.Mesh(new THREE.PlaneGeometry(1.02, bgHeight + 0.02), holoMaterial(0x00ffff, 0.4));
        border.position.z = 0.001;
        border.renderOrder = 1;

        // Use the same cyan/white pairing as the 2D header and tone the label
        // opacity down to 70% to mirror its semi-transparent styling.
        const label = createTextSprite('ASCENSION POINTS', 24, '#eaf2ff', 'left');
        label.material.opacity = 0.7;
        label.material.transparent = true;
        const value = createTextSprite(
            `${state.player.ascensionPoints}`,
            32,
            '#00ffff',
            'left',
            null,
            0,
            'bold'
        );

        const padding = 0.02;
        function updateLayout() {
            const labelWidth = label.scale.x;
            const valWidth = value.scale.x;
            const totalWidth = labelWidth + valWidth + padding * 3;

            // Resize the background and border to snugly wrap the content.
            bg.geometry.dispose();
            bg.geometry = new THREE.PlaneGeometry(totalWidth, bgHeight);
            border.geometry.dispose();
            border.geometry = new THREE.PlaneGeometry(totalWidth + 0.02, bgHeight + 0.02);

            const halfBg = totalWidth / 2;
            value.position.set(halfBg - padding - valWidth / 2, 0, 0.01);
            label.position.set(value.position.x - valWidth / 2 - padding - labelWidth / 2, 0, 0.01);

            group.userData.bgWidth = totalWidth;
        }

        group.add(bg, border, label, value);
        group.userData = { value, updateLayout, bgWidth: 0 };
        updateLayout();
        return group;
    }

    const apDisplay = createApDisplay();
    const headerY = height / 2 - 0.1;
    apDisplay.position.set(width / 2 - apDisplay.userData.bgWidth / 2 - 0.1, headerY, 0.01);
    modal.add(apDisplay);

    // Divider lines to mirror the 2D modal's header and footer borders.
    const headerDivider = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.01), holoMaterial(0x00ffff, 0.4));
    // Keep dividers nearly coplanar with the modal so they don't appear to
    // float above or sink behind the panel.
    headerDivider.position.set(0, 0.45, 0.001);
    headerDivider.renderOrder = 1;
    headerDivider.name = 'ascension_header_divider';
    modal.add(headerDivider);

    const footerDivider = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.01), holoMaterial(0x00ffff, 0.4));
    footerDivider.position.set(0, -0.45, 0.001);
    footerDivider.renderOrder = 1;
    footerDivider.name = 'ascension_footer_divider';
    modal.add(footerDivider);

    let tooltip;
    function createTalentTooltip() {
        const group = new THREE.Group();
        group.visible = false;
        // Match the 2D game's #101020 tooltip background and semi-transparent
        // cyan border.
        const bg = new THREE.Mesh(
            new THREE.PlaneGeometry(0.7, 0.3),
            holoMaterial(0x101020, 1)
        );
        const border = new THREE.Mesh(
            new THREE.PlaneGeometry(0.72, 0.32),
            holoMaterial(0x00ffff, 0.4)
        );
        border.position.z = -0.001;

        const icon = createTextSprite('', 28, '#ffffff', 'left');
        icon.position.set(-0.32, 0.06, 0.01);

        const name = createTextSprite('', 28, '#00ffff', 'left');
        name.position.set(-0.18, 0.06, 0.01);

        const desc = createTextSprite('', 24, '#eaf2ff', 'left');
        desc.position.set(-0.32, -0.02, 0.01);
        // Match the 2D tooltip's slightly dimmed description text.
        desc.material.opacity = 0.9;

        // Divider line and footer text mimic the 2D tooltip layout.
        const divider = new THREE.Mesh(
            new THREE.PlaneGeometry(0.66, 0.005),
            holoMaterial(0x00ffff, 0.4)
        );
        divider.position.set(0, -0.06, 0.01);
        divider.name = 'tooltip_footer_divider';

        // Separate rank and cost text like the 2D menu's flex layout and use
        // the same slightly transparent white tone.
        const rank = createTextSprite('', 24, '#eaf2ff', 'left');
        rank.position.set(-0.32, -0.11, 0.01);
        rank.material.opacity = 0.8;

        const cost = createTextSprite('', 24, '#eaf2ff', 'right');
        cost.position.set(0.32, -0.11, 0.01);
        cost.material.opacity = 0.8;

        group.add(bg, border, icon, name, desc, divider, rank, cost);
        group.userData = { icon, name, desc, rank, cost };
        return group;
    }

    modal.userData.refresh = () => {
        disposeGroupChildren(grid);
        grid.add(lines);
        disposeGroupChildren(lines);
        tooltip = createTalentTooltip();
        grid.add(tooltip);
        const positions = {};
        const allTalents = {};
        // The 2D game used a 16:9 talent grid nested inside the modal with
        // small horizontal padding.  Mirror that exact layout so constellations
        // line up with their original coordinates.
        const gridWidth = 1.55; // matches header/footer divider width
        const gridHeight = gridWidth * 9 / 16;
        const halfW = gridWidth / 2;
        const halfH = gridHeight / 2;

        Object.values(TALENT_GRID_CONFIG).forEach(con => {
            Object.keys(con).forEach(key => {
                if (key === 'color') return;
                const t = con[key];
                allTalents[key] = t;
                positions[t.id] = new THREE.Vector3(
                    (t.position.x / 100) * gridWidth - halfW,
                    halfH - (t.position.y / 100) * gridHeight,
                    0.01
                );
            });
        });

        const purchasedTalents =
            state.player.purchasedTalents && typeof state.player.purchasedTalents.get === 'function'
                ? state.player.purchasedTalents
                : new Map(state.player.purchasedTalents || []);
        if (purchasedTalents !== state.player.purchasedTalents) {
            state.player.purchasedTalents = purchasedTalents;
        }

        Object.values(TALENT_GRID_CONFIG).forEach(con => {
            Object.keys(con).forEach(key => {
                if (key === 'color') return;
                const t = con[key];
                const purchased = purchasedTalents.get(t.id) || 0;
                const isMax = !t.isInfinite && purchased >= t.maxRanks;
                const cost = t.isInfinite ? t.costPerRank[0] : t.costPerRank[purchased];
                const prereqsMet = t.prerequisites.every(p => {
                    const prereqTalent = allTalents[p];
                    if (!prereqTalent) return false;
                    const needed = prereqTalent.maxRanks;
                    const current = purchasedTalents.get(p) || 0;
                    return current >= needed;
                });
                const canPurchase = prereqsMet && state.player.ascensionPoints >= cost;

                if (purchasedTalents.has(t.id) || isTalentVisible(t)) {
                    let borderColor = 0xaaaaaa;
                    if (t.isNexus || t.isInfinite) {
                        borderColor = 0x00ff00;
                    } else if (isMax) {
                        borderColor = new THREE.Color(getConstellationColorOfTalent(t.id)).getHex();
                    } else if (canPurchase) {
                        borderColor = 0x00ff00;
                    }
                    const onSelect = () => {
                        if (!isMax && canPurchase) {
                            purchaseTalent(t.id);
                        } else if (!isMax && prereqsMet) {
                            AudioManager.playSfx('talentError');
                        } else {
                            AudioManager.playSfx('uiClickSound');
                        }
                        modal.userData.refresh();
                    };
                    const btn = createButton(
                        t.icon,
                        onSelect,
                        0.12,
                        0.12,
                        borderColor,
                        0x111122,
                        0xffffff,
                        0.8,
                        'circle',
                        1.15
                    );
                    btn.userData.talentId = t.id;
                    btn.position.copy(positions[t.id]);
                    const baseHover = btn.children[0].userData.onHover;
                    btn.userData.onHover = hovered => {
                        if (baseHover) baseHover(hovered);
                        if (hovered) {
                            AudioManager.playSfx('uiHoverSound');
                            const purchasedNow = purchasedTalents.get(t.id) || 0;
                            const isMaxNow = !t.isInfinite && purchasedNow >= t.maxRanks;
                            const costNow = t.isInfinite ? t.costPerRank[0] : t.costPerRank[purchasedNow];
                            const costText = isMaxNow ? 'MAXED' : `Cost: ${costNow} AP`;
                            const rankText =
                                t.maxRanks > 1
                                    ? `Rank: ${purchasedNow}/${t.isInfinite ? '∞' : t.maxRanks}`
                                    : 'Mastery';
                            updateTextSprite(tooltip.userData.icon, t.icon);
                            updateTextSprite(tooltip.userData.name, t.name);
                            updateTextSprite(tooltip.userData.desc, t.description(purchasedNow + 1, isMaxNow));
                            updateTextSprite(tooltip.userData.rank, rankText);
                            updateTextSprite(tooltip.userData.cost, costText);
                            const basePos = positions[t.id];
                            let offsetX = 0.3;
                            const xBoundary = halfW - 0.4;
                            if (basePos.x > xBoundary) offsetX = -0.3;
                            else if (basePos.x < -xBoundary) offsetX = 0.3;
                            let offsetY = 0.12;
                            const yBoundary = halfH - 0.2;
                            if (basePos.y > yBoundary) offsetY = -0.12;
                            tooltip.position.copy(basePos).add(new THREE.Vector3(offsetX, offsetY, 0));
                            tooltip.visible = true;
                        } else if (tooltip) {
                            tooltip.visible = false;
                        }
                    };
                    grid.add(btn);
                }
            });
        });

        Object.values(TALENT_GRID_CONFIG).forEach(con => {
            Object.keys(con).forEach(key => {
                if (key === 'color') return;
                const t = con[key];
                const end = positions[t.id];
                const powerUnlocked = !t.powerPrerequisite ||
                    (state.player.unlockedPowers && state.player.unlockedPowers.has(t.powerPrerequisite));
                t.prerequisites.forEach(pr => {
                    const start = positions[pr];
                    if (!start) return;
                    if (!powerUnlocked) return;
                    if (!purchasedTalents.has(pr) && pr !== 'core-nexus') return;
                    const prereq = allTalents[pr];
                    const nexusConnection = (t.isNexus || (prereq && prereq.isNexus));
                    let colorHex = 0xaaaaaa;
                    let width = 0.01;
                    if (nexusConnection) {
                        colorHex = 0x00ff00;
                        width = 0.015;
                    }
                    const needed = prereq ? prereq.maxRanks : 1;
                    const current = purchasedTalents.get(pr) || 0;
                    let opacity = 0.3;
                    if (current >= needed) {
                        opacity = 1.0;
                        if (!nexusConnection) {
                            colorHex = new THREE.Color(getConstellationColorOfTalent(pr)).getHex();
                        }
                    }
                    const mat = new THREE.LineBasicMaterial({
                        color: new THREE.Color(colorHex),
                        transparent: true,
                        opacity,
                        linewidth: width,
                        depthTest: false,
                        depthWrite: false
                    });
                    const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
                    lines.add(new THREE.Line(geom, mat));
                });
            });
        });

        updateTextSprite(apDisplay.userData.value, `${state.player.ascensionPoints}`);
        if (apDisplay.userData.updateLayout) {
            apDisplay.userData.updateLayout();
            apDisplay.position.x = width / 2 - apDisplay.userData.bgWidth / 2 - 0.1;
        }
    };

    const footerY = -height / 2 + 0.1;
    const closeWidth = 0.5;
    const clearWidth = 0.8;

    const closeBtn = createButton('CLOSE', () => hideModal(), closeWidth, 0.1, 0xf000ff, 0xf000ff, 0xffffff);
    closeBtn.position.set(width / 2 - 0.1 - closeWidth / 2, footerY, 0.01);
    modal.add(closeBtn);

    const clearBtn = createButton('ERASE TIMELINE', () => {
        showConfirm(
            '|| SEVER TIMELINE? ||',
            'All Ascension progress and unlocked powers will be lost to the void.\nThis action cannot be undone.',
            () => {
                localStorage.removeItem('eternalMomentumSave');
                window.location.reload();
            }
        );
    }, clearWidth, 0.1, 0xe74c3c, 0xc0392b, 0xffffff);
    clearBtn.position.set(-width / 2 + 0.1 + clearWidth / 2, footerY, 0.01);
    modal.add(clearBtn);

    return modal;
}

function createLoreModal() {
    const modal = createModalContainer(1.2, 1.2, 'ETERNAL MOMENTUM');
    modal.name = 'modal_lore';

    const list = new THREE.Group();
    list.position.y = -0.1;
    modal.add(list);

    const sections = [
        {
            heading: 'The Unraveling',
            text:
                "Reality is not a single thread, but an infinite, shimmering tapestry of timelines. This tapestry is fraying. A formless, silent entropy named the Unraveling consumes existence, timeline by timeline. It is a cosmic error causing reality to decohere into paradox and chaos. As each world's fundamental laws are overwritten, its echoes are twisted into monstrous Aberrations—nightmarish amalgamations of what once was."
        },
        {
            heading: 'The Conduit',
            text:
                "Amidst the universal decay, you exist. You are the Conduit, an impossible being capable of maintaining a stable presence across fracturing realities. Your consciousness is imbued with Eternal Momentum—an innate, unyielding drive to push forward, to resist the decay, and to preserve the flickering embers of spacetime. By defeating Aberrations, you reclaim lost fragments of reality's source code, integrating them into your own being through the Ascension Conduit to grow stronger."
        },
        {
            heading: 'Power-ups: Echoes of Stability',
            text:
                'The pickups you find scattered across the battlefield are not mere tools; they are concentrated fragments of stable realities that have not yet fully succumbed to the Unraveling. Each one is a memory of a physical law or a powerful concept—the unbreakable defense of a Shield, the impossible speed of a Momentum Drive, the focused devastation of a Missile. By absorbing them, you temporarily impose these stable concepts onto your own existence.'
        },
        {
            heading: 'Aberration Cores: Controlled Chaos',
            text:
                "As you gain power and experience, you learn to do more than just defeat Aberrations—you learn to resonate with their very essence. The Aberration Cores are stabilized fragments of their paradoxical existence, which you can attune to your own matrix. Equipping a Core forges a symbiotic link, granting you a fraction of an Aberration's unique power. It is a dangerous and powerful process: wielding the logic of chaos as a weapon against itself."
        },
        {
            heading: 'The Mission',
            text:
                "Your journey is a desperate pilgrimage through the collapsing remnants of countless worlds. Each \"stage\" is a pocket of spacetime you temporarily stabilize through sheer force of will. The Ascension Conduit is your means of survival and growth.\nBy defeating Aberrations, you are not merely destroying them; you are reclaiming lost fragments of reality's source code. By integrating these fragments into your own being through the Conduit, you grow stronger, turning the weapons of your enemy into the keys to your salvation."
        },
        {
            heading: "The Weaver's Orrery",
            text:
                "The Weaver's Orrery is your greatest tool. A mysterious device left by a precursor race, it allows you to manipulate the Echoes of Creation—the residual energy left by powerful Aberrations.\nWith the Orrery, you can forge custom timelines, simulating encounters against the multiverse's most dangerous threats. This is not mere practice; it is a way to hone your skills and prepare for the ultimate confrontation against the silent, all-consuming heart of the Unraveling."
        },
        {
            heading: '',
            text: 'You are the final anchor in a storm of nonexistence. Hold the line. Maintain your momentum.'
        }
    ];

    const lines = [];
    sections.forEach(sec => {
        if (sec.heading) {
            lines.push({ text: sec.heading, color: '#9b59b6' });
        }
        const wrapped = wrapText(sec.text, 60).split('\n');
        wrapped.forEach(l => lines.push({ text: l, color: '#eaf2ff' }));
        lines.push({ text: '', color: '#eaf2ff' });
    });

    const leftMargin = -modal.userData.width / 2 + 0.05;
    lines.forEach(line => {
        const sprite = createTextSprite(line.text || ' ', 32, line.color, 'left');
        // Offset by half the sprite width so the text's left edge lines up with
        // the modal's inner margin instead of rendering outside the container.
        sprite.position.x = leftMargin + sprite.scale.x / 2;
        list.add(sprite);
    });

    addScrollBar(modal, list, { itemHeight: 0.06, viewHeight: 0.9, topOffset: 0.45, x: 0.55 });

    const closeBtn = createButton('Close', () => showModal('levelSelect'), 0.6, 0.1, 0xf000ff);
    closeBtn.position.set(0, -0.55, 0.01);
    modal.add(closeBtn);
    return modal;
}

function createBossInfoModal() {
    const width = 1.2;
    const height = 1.0;
    const modal = createModalContainer(width, height, 'BOSS INFO');
    modal.name = 'modal_bossInfo';

    // Left-align wrapped lore text and bump the font size for readability.
    const content = createTextSprite('', 32, '#eaf2ff', 'left');
    content.position.set(-0.55, 0.35, 0.01);
    content.userData.maxWidth = 1.1; // Store for wrapText updates
    modal.add(content);

    const closeBtn = createButton('✖', () => hideModal(), 0.12, 0.12, 0xf000ff);
    // Keep the close button inset from the top-right corner so it doesn't
    // bleed beyond the modal's bounds.
    closeBtn.position.set(width / 2 - 0.05 - 0.06, height / 2 - 0.05 - 0.06, 0.02);
    modal.add(closeBtn);

    modal.userData.contentSprite = content;
    modal.userData.titleSprite = modal.children.find(c => c.userData.isTitle);
    return modal;
}

function createGameOverModal() {
    // Mirror the horizontal layout of the 2D game's game over menu by making
    // the container wider and arranging the buttons in a single row.
    const modal = createModalContainer(1.4, 1.0, 'TIMELINE COLLAPSED', {
        titleColor: '#e74c3c',
        titleShadowColor: '#e74c3c',
        titleShadowBlur: 15,
        backgroundColor: 0x000000,
        backgroundOpacity: 0.8,
        borderOpacity: 0
    });
    modal.name = 'modal_gameOver';

    const btnWidth = 0.3;
    const gap = 0.04;
    const totalWidth = btnWidth * 4 + gap * 3;
    // Center the button row and keep a small margin so no button spills past
    // the container edge.
    const startX = -totalWidth / 2 + btnWidth / 2;
    const y = -0.2;

    const restartBtn = createButton('Restart Stage', () => {
        resetGame(bossData);
        // Resetting the game would occasionally swap controller hands. Make
        // sure the primary controller is re-evaluated after a restart.
        refreshPrimaryController();
        hideModal();
    }, btnWidth, 0.1, 0x00ffff, 0x00ffff, 0xffffff, 0.2);
    restartBtn.position.set(startX, y, 0.01);
    // Shrink the label slightly so it doesn't spill past the button frame.
    const restartText = restartBtn.children.find(c => c.userData?.text !== undefined);
    if (restartText) restartText.scale.multiplyScalar(0.9);
    modal.add(restartBtn);

    const ascBtn = createButton('Ascension Conduit', () => {
        hideModal();
        showModal('ascension');
    }, btnWidth, 0.1, 0xff8800, 0xff8800, 0xffffff, 0.2);
    ascBtn.position.set(startX + (btnWidth + gap), y, 0.01);
    modal.add(ascBtn);

    const coreBtn = createButton('Aberration Cores', () => {
        hideModal();
        showModal('cores');
    }, btnWidth, 0.1, 0x00ff00, 0x00ff00, 0xffffff, 0.2);
    coreBtn.position.set(startX + 2 * (btnWidth + gap), y, 0.01);
    modal.add(coreBtn);

    const stageBtn = createButton('Stage Select', () => {
        hideModal();
        showModal('levelSelect');
    }, btnWidth, 0.1, 0x9b59b6, 0x9b59b6, 0xffffff, 0.2);
    stageBtn.position.set(startX + 3 * (btnWidth + gap), y, 0.01);
    modal.add(stageBtn);

    return modal;
}

function createOrreryModal() {
    const width = 1.6;
    const height = 1.2;
    const modal = createModalContainer(width, height, "THE WEAVER'S ORRERY");
    modal.name = 'modal_orrery';

    const costs = { 1: 2, 2: 5, 3: 8 };
    let totalEchoes = 0;
    if (state.player.highestStageBeaten >= 30) {
        totalEchoes += 10 + (state.player.highestStageBeaten - 30);
        if (state.player.highestStageBeaten >= 50) totalEchoes += 15;
        if (state.player.highestStageBeaten >= 70) totalEchoes += 20;
        if (state.player.highestStageBeaten >= 90) totalEchoes += 25;
    }
    let selectedBosses = [];
    let currentCost = 0;

    const list = new THREE.Group();
    list.position.set(-0.6, 0.4, 0.01);
    modal.add(list);

    const selection = new THREE.Group();
    selection.position.set(0.25, 0.2, 0.01);
    modal.add(selection);

    const echoLabel = createTextSprite('ECHOES OF CREATION', 24, '#eaf2ff', 'left');
    const echoValue = createTextSprite(`${totalEchoes}`, 32, '#00ffff', 'left');
    echoLabel.position.set(width/2 - echoLabel.scale.x - echoValue.scale.x - 0.2, height/2 - 0.1, 0.01);
    echoValue.position.set(width/2 - 0.1 - echoValue.scale.x/2, height/2 - 0.1, 0.01);
    modal.add(echoLabel, echoValue);

    const costLabel = createTextSprite('ECHOES SPENT:', 24, '#eaf2ff', 'left');
    const costValue = createTextSprite('0', 32, '#00ffff', 'left');
    costLabel.position.set(0.25, -0.1, 0.01);
    costValue.position.set(0.25, -0.2, 0.01);
    modal.add(costLabel, costValue);

    function refresh() {
        updateTextSprite(echoValue, `${totalEchoes - currentCost}`);
        updateTextSprite(costValue, `${currentCost}`);

        disposeGroupChildren(list);
        const bosses = bossData.filter(b => b.difficulty_tier).sort((a,b) => a.difficulty_tier - b.difficulty_tier);
        bosses.forEach((b, i) => {
            const cost = costs[b.difficulty_tier] || 2;
            const btn = createButton(`${b.name} (${cost})`, () => {
                const canAfford = (totalEchoes - currentCost) >= cost;
                if (!canAfford) {
                    AudioManager.playSfx('talentError');
                    return;
                }
                selectedBosses.push(b.id);
                currentCost += cost;
                refresh();
            }, 1.0, 0.1, b.color ? new THREE.Color(b.color).getHex() : 0x00ffff, 0x111122);
            btn.position.set(0, -i * 0.12, 0.01);
            list.add(btn);
        });
        addScrollBar(modal, list, { itemHeight: 0.12, viewHeight: 0.8, topOffset: 0, x: -0.05 });

        disposeGroupChildren(selection);
        selectedBosses.forEach((id, idx) => {
            const boss = bossData.find(b => b.id === id);
            const icon = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), holoMaterial(boss.color || 0xffffff, 1));
            icon.position.set(idx * 0.12, 0, 0.01);
            icon.userData.onSelect = () => {
                AudioManager.playSfx('uiClickSound');
                selectedBosses.splice(idx, 1);
                currentCost -= costs[boss.difficulty_tier] || 2;
                refresh();
            };
            selection.add(icon);
        });
        updateStartButton();
    }

    const footerY = -height / 2 + 0.1;
    const clearBtn = createButton('CLEAR ROSTER', () => {
        selectedBosses = [];
        currentCost = 0;
        refresh();
    }, 0.5, 0.1, 0xe74c3c, 0xc0392b, 0xffffff);
    clearBtn.position.set(-width / 2 + 0.1 + 0.25, footerY, 0.01);

    const startBtn = createButton('FORGE TIMELINE', () => {
        if (selectedBosses.length === 0) return;
        state.customOrreryBosses = [...selectedBosses];
        state.currentStage = 999;
        hideModal();
        resetGame(bossData);
    }, 0.4, 0.1, 0x00ffff, 0x00ffff, 0x1e1e2f);
    startBtn.position.set(0, footerY, 0.01);

    function updateStartButton() {
        const active = selectedBosses.length > 0;
        const color = active ? 0x00ffff : 0x555555;
        startBtn.children[0].material.color.set(color);
        startBtn.children[0].material.emissive.set(color);
        startBtn.children[1].material.color.set(color);
        startBtn.children[2].material.color.set(color);
    }

    const closeBtn = createButton('CLOSE', () => hideModal(), 0.4, 0.1, 0xf000ff, 0xf000ff, 0xffffff);
    closeBtn.position.set(width / 2 - 0.1 - 0.2, footerY, 0.01);

    modal.add(clearBtn, startBtn, closeBtn);
    modal.userData.refresh = refresh;
    refresh();
    return modal;
}


export function showBossInfo(bossIds, type = 'mechanics') {
    showModal('bossInfo');
    const modal = modals.bossInfo;
    if (!modal) return;
    const bosses = bossIds.map(id => bossData.find(b => b.id === id)).filter(b => b);
    if (bosses.length === 0) return;
    const title = bosses.map(b => b.name).join(' & ');
    const content = bosses
        .map(b => wrapText(type === 'lore' ? b.lore : b.mechanics_desc, 60))
        .join('\n\n');
    if (modal.userData.titleSprite) updateTextSprite(modal.userData.titleSprite, title);
    if (modal.userData.contentSprite) {
        updateTextSprite(modal.userData.contentSprite, content);
        const sprite = modal.userData.contentSprite;
        // Position so text starts at the top-left corner of the modal
        const width = sprite.scale.x;
        const height = sprite.scale.y;
        sprite.position.set(-width / 2, height / 2, sprite.position.z);
    }
}
