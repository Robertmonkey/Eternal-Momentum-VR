import * as THREE from '../vendor/three.module.js';

let scene, camera, renderer, playerRig;
let controllers = [];

export function initScene(container = document.body) {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  renderer.xr.addEventListener('sessionstart', () => {
    console.log('WebXR session started');
  });
  renderer.xr.addEventListener('sessionend', () => {
    console.log('WebXR session ended');
  });

  playerRig = new THREE.Group();
  playerRig.name = 'playerRig';
  playerRig.add(camera);
  scene.add(playerRig);

  controllers[0] = renderer.xr.getController(0);
  controllers[1] = renderer.xr.getController(1);
  playerRig.add(controllers[0]);
  playerRig.add(controllers[1]);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(3, 3, 2);
  scene.add(dir);

  window.addEventListener('resize', onWindowResize);

  return { scene, camera, renderer, playerRig };
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function getPlayerRig() { return playerRig; }
export function getControllers() { return controllers; }
