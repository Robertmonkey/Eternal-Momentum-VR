import * as THREE from '../vendor/three.module.js';
import { getScene, getArena, getPrimaryController, getCamera } from './scene.js';
import { moveTowards } from './movement3d.js';
import { spherePosToUv, uvToSpherePos } from './utils.js';
import { state } from './state.js';
import { useOffensivePower, useDefensivePower } from './PowerManager.js';
import { useCoreActive } from './CoreManager.js';
import { getUIRoot } from './UIManager.js';
import { getModalObjects } from './ModalManager.js';
import { getControllerMenu } from './ControllerMenu.js';
import { gameHelpers } from './gameHelpers.js';

let avatar;
let targetPoint = new THREE.Vector3();
let raycaster;
let laser;
let crosshair;
let primaryController;
let triggerDown = false;
let gripDown = false;
const tempMatrix = new THREE.Matrix4();
let hoveredUi = null;

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
  primaryController = getPrimaryController();

  if (primaryController) {
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    laser = new THREE.Line(geometry, material);
    laser.name = 'laserPointer';
    laser.scale.z = radius * 2;
    primaryController.add(laser);

    primaryController.addEventListener('selectstart', () => {
      triggerDown = true;
      handleInput();
    });
    primaryController.addEventListener('selectend', () => {
      triggerDown = false;
    });
    primaryController.addEventListener('squeezestart', () => {
      gripDown = true;
      handleInput();
    });
    primaryController.addEventListener('squeezeend', () => {
      gripDown = false;
    });
  }

  // Initialize shared cursor direction in state if not already set
  if (!state.cursorDir || !state.cursorDir.isVector3) {
    state.cursorDir = new THREE.Vector3();
  }
}

function handleInput() {
  if (triggerDown && gripDown) {
    useCoreActive(gameHelpers);
    return;
  }

  if (triggerDown) {
    useOffensivePower();
  } else if (gripDown) {
    useDefensivePower();
  }
}

export function updatePlayerController() {
  if (!primaryController || !raycaster) return;
  raycaster.camera = getCamera();
  const arena = getArena();
  const radius = arena.geometry.parameters.radius;

  tempMatrix.identity().extractRotation(primaryController.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(primaryController.matrixWorld);
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
    if (hoveredUi !== uiHit.object) {
      if (hoveredUi && hoveredUi.userData && typeof hoveredUi.userData.onBlur === 'function') {
        hoveredUi.userData.onBlur();
      }
      hoveredUi = uiHit.object;
      if (hoveredUi.userData && typeof hoveredUi.userData.onHover === 'function') {
        hoveredUi.userData.onHover();
      }
    }
    if (triggerDown && hoveredUi.userData && typeof hoveredUi.userData.onSelect === 'function') {
      hoveredUi.userData.onSelect();
    }
    return;
  } else if (hoveredUi) {
    if (hoveredUi.userData && typeof hoveredUi.userData.onBlur === 'function') {
      hoveredUi.userData.onBlur();
    }
    hoveredUi = null;
  }

  const hit = raycaster.intersectObject(arena, false)[0];
  if (hit) {
    targetPoint.copy(hit.point);
    state.cursorDir.copy(hit.point).sub(avatar.position).normalize();
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
