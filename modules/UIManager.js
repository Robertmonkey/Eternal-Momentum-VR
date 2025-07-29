import * as THREE from '../vendor/three.module.js';
import { getCamera } from './scene.js';

let uiGroup;
let hudMesh;

export function initUI() {
  const camera = getCamera();
  if (!camera || uiGroup) return;

  uiGroup = new THREE.Group();
  uiGroup.name = 'uiGroup';
  camera.add(uiGroup);

  createCommandBar();
}

function createCommandBar() {
  const radius = 1.2;      // distance from camera
  const height = 0.3;
  const arc = Math.PI / 2; // 90 degree curve
  const segs = 24;

  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    segs,
    1,
    true,
    -arc / 2,
    arc
  );
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));

  const material = new THREE.MeshBasicMaterial({
    color: 0x141428,
    opacity: 0.9,
    transparent: true,
    side: THREE.DoubleSide
  });

  hudMesh = new THREE.Mesh(geometry, material);
  hudMesh.name = 'hudContainer';
  hudMesh.position.set(0, -0.4, -radius);
  uiGroup.add(hudMesh);
}

export function getUIRoot() {
  return uiGroup;
}

export function getHudMesh() {
  return hudMesh;
}
