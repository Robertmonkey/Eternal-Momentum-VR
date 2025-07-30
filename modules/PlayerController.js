import * as THREE from '../vendor/three.module.js';
import { getScene, getArena, getControllers, getCamera } from './scene.js';
import { moveTowards } from './movement3d.js';
import { spherePosToUv, uvToSpherePos } from './utils.js';
import { state } from './state.js';
import { usePower } from './powers.js';
import { activateCorePower } from './cores.js';
import { getUIRoot } from './UIManager.js';
import { getModalObjects } from './ModalManager.js';
import { getControllerMenu } from './ControllerMenu.js';

let avatar;
let targetPoint = new THREE.Vector3();
let raycaster;
let laser;
let crosshair;
let rightController;
let triggerDown = false;
let gripDown = false;
const tempMatrix = new THREE.Matrix4();

export function initPlayerController() {
  const scene = getScene();
  const arena = getArena();
  if (!scene || !arena) return;

  const radius = arena.geometry.parameters.radius;
  avatar = new THREE.Mesh(
    new THREE.SphereGeometry(5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x3498db })
  );
  avatar.name = 'playerAvatar';
  avatar.position.copy(uvToSpherePos(0.5, 0, radius));
  state.player.position.copy(avatar.position);
  scene.add(avatar);

  const chGeo = new THREE.RingGeometry(0.2, 0.25, 16);
  const chMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide });
  crosshair = new THREE.Mesh(chGeo, chMat);
  crosshair.visible = false;
  crosshair.name = 'crosshair';
  scene.add(crosshair);

  raycaster = new THREE.Raycaster();
  raycaster.camera = getCamera();
  rightController = getControllers()[0];

  if (rightController) {
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    laser = new THREE.Line(geometry, material);
    laser.name = 'laserPointer';
    laser.scale.z = radius * 2;
    rightController.add(laser);

    rightController.addEventListener('selectstart', () => {
      triggerDown = true;
      handleInput();
    });
    rightController.addEventListener('selectend', () => {
      triggerDown = false;
    });
    rightController.addEventListener('squeezestart', () => {
      gripDown = true;
      handleInput();
    });
    rightController.addEventListener('squeezeend', () => {
      gripDown = false;
    });
  }

  // Initialize shared cursor position in state if not already set
  if (!state.mousePosition) {
    state.mousePosition = { x: 0, y: 0 };
  }
}

function handleInput() {
  if (triggerDown && gripDown) {
    activateCorePower(state.mousePosition.x, state.mousePosition.y, window.gameHelpers);
    return;
  }

  if (triggerDown) {
    const key = state.offensiveInventory[0];
    if (key) usePower(key);
  } else if (gripDown) {
    const key = state.defensiveInventory[0];
    if (key) usePower(key);
  }
}

export function updatePlayerController() {
  if (!rightController || !raycaster) return;
  raycaster.camera = getCamera();
  const arena = getArena();
  const radius = arena.geometry.parameters.radius;

  tempMatrix.identity().extractRotation(rightController.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(rightController.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  // Check UI interactions first
  let uiHit = null;
  const uiRoot = getUIRoot();
  if (uiRoot) {
    const uiHits = raycaster.intersectObjects(uiRoot.children, true);
    if (uiHits.length) uiHit = uiHits[0];
  }
  if (!uiHit) {
    const menu = getControllerMenu();
    if (menu) {
      const menuHits = raycaster.intersectObjects(menu.children, true);
      if (menuHits.length) uiHit = menuHits[0];
    }
  }
  if (!uiHit) {
    const modalHits = raycaster.intersectObjects(getModalObjects(), true);
    if (modalHits.length) uiHit = modalHits[0];
  }

  if (uiHit) {
    if (triggerDown && uiHit.object.userData && typeof uiHit.object.userData.onSelect === 'function') {
      uiHit.object.userData.onSelect();
    }
    return;
  }

  const hit = raycaster.intersectObject(arena, false)[0];
  if (hit) {
    targetPoint.copy(hit.point);
    const uv = spherePosToUv(targetPoint, radius);
    state.mousePosition.x = uv.u * 2048;
    state.mousePosition.y = uv.v * 1024;
    if (crosshair) {
      crosshair.visible = true;
      crosshair.position.copy(hit.point);
      crosshair.lookAt(getCamera().position);
    }
  }
  else if (crosshair) {
    crosshair.visible = false;
  }

  moveTowards(avatar.position, targetPoint, state.player.speed, radius);
  state.player.position.copy(avatar.position);
}

export function getAvatar() {
  return avatar;
}
export function getTargetPoint() {
  return targetPoint;
}
