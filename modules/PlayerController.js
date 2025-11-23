import * as THREE from '../vendor/three.module.js';
import { getScene, getArena, getPrimaryController, getCamera } from './scene.js';
import { attachBossUI } from './UIManager.js';
import { moveTowards } from './movement3d.js';
import { state } from './state.js';
import { useOffensivePower, useDefensivePower } from './PowerManager.js';
import { useCoreActive } from './CoreManager.js';
import { getModalObjects } from './ModalManager.js';
import { getControllerMenuObjects } from './ControllerMenu.js';
import { gameHelpers } from './gameHelpers.js';
import { AssetManager } from './AssetManager.js';
import { MODEL_SCALE } from './config.js';

if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyQ') {
            useOffensivePower();
        } else if (e.code === 'KeyE') {
            useDefensivePower();
        }
    });
}

let avatar;
let targetPoint = new THREE.Vector3();
let raycaster;
let laser;
let crosshair;
let primaryController;

// Input state flags
let triggerDown = false;
let gripDown = false;
let triggerJustPressed = false;
let gripJustPressed = false;

const tempMatrix = new THREE.Matrix4();
let hoveredUi = null;
const assetManager = new AssetManager();
let lastUpdateTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
let activeDrag = null;

function resetAvatarPosition() {
    const arena = getArena();
    if (!arena || !avatar) return;
    const radius = arena.geometry.parameters.radius;
    const startPos = new THREE.Vector3(0, 0, radius);
    avatar.position.copy(startPos);
    state.player.position.copy(startPos);
    targetPoint.copy(startPos);
    if (laser) laser.scale.z = radius * 2;
    if (crosshair) crosshair.visible = false;
}

if (typeof window !== 'undefined') {
    window.addEventListener('gameReset', resetAvatarPosition);
}

function onSelectStart() {
    if (!triggerDown) triggerJustPressed = true;
    triggerDown = true;
}
function onSelectEnd() { triggerDown = false; }

function onSqueezeStart() {
    if (!gripDown) gripJustPressed = true;
    gripDown = true;
}
function onSqueezeEnd() { gripDown = false; }

export function resetInputFlags() {
    triggerDown = false;
    gripDown = false;
    triggerJustPressed = false;
    gripJustPressed = false;
}

export function refreshPrimaryController() {
    const newPrimary = getPrimaryController();
    if (newPrimary === primaryController) return;

    if (primaryController) {
        primaryController.removeEventListener('selectstart', onSelectStart);
        primaryController.removeEventListener('selectend', onSelectEnd);
        primaryController.removeEventListener('squeezestart', onSqueezeStart);
        primaryController.removeEventListener('squeezeend', onSqueezeEnd);
        if (laser) primaryController.remove(laser);
    }
    
    primaryController = newPrimary;
    
    if (primaryController) {
        primaryController.add(laser);
        primaryController.addEventListener('selectstart', onSelectStart);
        primaryController.addEventListener('selectend', onSelectEnd);
        primaryController.addEventListener('squeezestart', onSqueezeStart);
        primaryController.addEventListener('squeezeend', onSqueezeEnd);
        attachBossUI();
    }
}

export async function initPlayerController() {
    const scene = getScene();
    const arena = getArena();
    if (!scene || !arena) return;

    // Clean up any existing controller meshes so repeated calls do not
    // spawn duplicate avatars or laser pointers.  Explicitly null out
    // references so stale objects are eligible for garbage collection and
    // cannot accidentally be re-added to the scene elsewhere.
    if (avatar && avatar.parent) avatar.parent.remove(avatar);
    if (crosshair && crosshair.parent) crosshair.parent.remove(crosshair);
    if (laser && primaryController) primaryController.remove(laser);
    avatar = null;
    crosshair = null;
    laser = null;

    const radius = arena.geometry.parameters.radius;

    avatar = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 * MODEL_SCALE, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x3498db, emissive: 0x3498db })
    );
    avatar.name = 'playerAvatar';
    const startPos = new THREE.Vector3(0, 0, radius);
    avatar.position.copy(startPos);
    state.player.position.copy(startPos);
    targetPoint.copy(startPos);
    scene.add(avatar);

    const chTex = await assetManager.loadTexture("assets/cursors/crosshair.cur");
    chTex.magFilter = THREE.NearestFilter;
    const chMat = new THREE.SpriteMaterial({ map: chTex, depthTest: false, sizeAttenuation: false });
    crosshair = new THREE.Sprite(chMat);
    crosshair.scale.set(0.05, 0.05, 1);
    crosshair.visible = false;
    crosshair.name = "crosshair";
    scene.add(crosshair);

    raycaster = new THREE.Raycaster();

    const laserGeometry = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1) ]);
    laser = new THREE.Line(laserGeometry, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 }));
    laser.name = 'laserPointer';
    laser.scale.z = radius * 2;

    refreshPrimaryController();

    if (!state.cursorDir) state.cursorDir = new THREE.Vector3();
}

function handleInput() {
    if ((triggerJustPressed && gripDown) || (gripJustPressed && triggerDown)) {
        useCoreActive(gameHelpers);
    } else if (triggerJustPressed) {
        useOffensivePower();
    } else if (gripJustPressed) {
        useDefensivePower();
    }
}

export function updatePlayerController() {
    // Controllers can appear after the session starts; keep trying to bind
    // until one is available.
    if (!primaryController) refreshPrimaryController();
    if (!primaryController || !raycaster) return;

    const camera = getCamera();
    if (!camera) return;
    // Needed for raycasting against sprites and other UI elements
    raycaster.camera = camera;

    const arena = getArena();
    const radius = arena.geometry.parameters.radius;

    tempMatrix.identity().extractRotation(primaryController.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(primaryController.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const modalUI = getModalObjects().filter(m => m && m.visible);
    const controllerUI = getControllerMenuObjects().filter(Boolean);
    const allUI = [...modalUI, ...controllerUI];

    const uiHits = raycaster.intersectObjects(allUI, true);
    const uiHit = uiHits[0];

    if (uiHit) {
        // When the pointer intersects any UI element, lock the movement target
        // to the current avatar position so the player does not drift toward
        // menus or panels. Previously this safeguard only applied to
        // interactive elements, allowing passive surfaces to trigger unwanted
        // movement toward the arena behind them.
        if (avatar) targetPoint.copy(avatar.position);
        laser.scale.z = uiHit.distance;
        if (crosshair) {
            crosshair.visible = true;
            crosshair.position.copy(uiHit.point);
            crosshair.lookAt(camera.position);
            crosshair.scale.set(0.06, 0.06, 1);
        }

        if (hoveredUi !== uiHit.object) {
            if (hoveredUi && hoveredUi.userData.onHover) hoveredUi.userData.onHover(false);
            hoveredUi = uiHit.object;
            if (hoveredUi.userData.onHover) hoveredUi.userData.onHover(true);
            if (hoveredUi.userData.onHover || hoveredUi.userData.onSelect) {
                gameHelpers.play('uiHoverSound');
            }
        }

        if (triggerJustPressed) {
            if (uiHit.object.userData.onDragStart) {
                uiHit.object.userData.onDragStart(uiHit, raycaster);
                activeDrag = uiHit.object;
            } else if (uiHit.object.userData.onSelect) {
                if (Date.now() > state.uiInteractionCooldownUntil) {
                    uiHit.object.userData.onSelect();
                    gameHelpers.play('uiClickSound');
                }
            }
        }
    } else if (activeDrag) {
        if (hoveredUi && hoveredUi.userData.onHover) hoveredUi.userData.onHover(false);
        hoveredUi = null;
        if (avatar) targetPoint.copy(avatar.position);
        laser.scale.z = radius * 2;
        if (crosshair) crosshair.visible = false;
    } else if (!state.isPaused) {
        if (hoveredUi && hoveredUi.userData.onHover) hoveredUi.userData.onHover(false);
        hoveredUi = null;
        const arenaHit = raycaster.intersectObject(arena, false)[0];
        if (arenaHit) {
            targetPoint.copy(arenaHit.point);
            state.cursorDir.copy(arenaHit.point).normalize();
            laser.scale.z = arenaHit.distance;

            if (crosshair) {
                crosshair.visible = true;
                crosshair.position.copy(arenaHit.point);
                crosshair.lookAt(camera.position);
            }
            handleInput();
        } else {
            laser.scale.z = radius * 2;
            if (crosshair) crosshair.visible = false;
        }
    } else {
        // When paused and not hitting UI, hide crosshair
        if (hoveredUi && hoveredUi.userData.onHover) hoveredUi.userData.onHover(false);
        hoveredUi = null;
        laser.scale.z = radius * 2;
        if (crosshair) crosshair.visible = false;
    }
    
    if (activeDrag) {
        if (triggerDown) {
            if (activeDrag.userData.onDragMove) activeDrag.userData.onDragMove(raycaster);
        } else {
            if (activeDrag.userData.onDragEnd) activeDrag.userData.onDragEnd();
            activeDrag = null;
        }
    }

    triggerJustPressed = false;
    gripJustPressed = false;

    if (!state.isPaused && state.player.stunnedUntil < Date.now()) {
        const speedMult = state.player.talent_states.phaseMomentum.active ? 1.1 : 1.0;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const delta = now - lastUpdateTime;
        lastUpdateTime = now;
        moveTowards(avatar.position, targetPoint, state.player.speed * speedMult, radius, delta);
        state.player.position.copy(avatar.position);
    }
    
    avatar.lookAt(0, avatar.position.y, 0);
}

export function getAvatar() {
    return avatar;
}

export { resetAvatarPosition as resetPlayerAvatar };
