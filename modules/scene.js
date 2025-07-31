import * as THREE from '../vendor/three.module.js';

let scene, camera, renderer, playerRig;
let arena, platform;
let controllers = [];

export function initScene(container = document.body) {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  // Enable preserveDrawingBuffer so html2canvas can capture the WebGL canvas
  // without throwing a warning.
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  // Avoid noisy console logs in production builds
  renderer.xr.addEventListener('sessionstart', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('WebXR session started');
    }
  });
  renderer.xr.addEventListener('sessionend', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('WebXR session ended');
    }
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
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(3, 3, 2);
  scene.add(dir);

  // --- Environment Implementation (S02) ---
  const arenaGeo = new THREE.SphereGeometry(500, 32, 32);
  const arenaTexture = new THREE.TextureLoader().load('assets/bg.png');
  arenaTexture.colorSpace = THREE.SRGBColorSpace;
  const arenaMat = new THREE.MeshStandardMaterial({
    map: arenaTexture,
    side: THREE.BackSide
  });
  arena = new THREE.Mesh(arenaGeo, arenaMat);
  arena.name = 'arena';
  scene.add(arena);

  // Replace the old opaque cylinder with a thin neon grid disc so the
  // player can see through the platform and shoot underneath.
  const platformGroup = new THREE.Group();
  const ringGeo = new THREE.RingGeometry(9.5, 10, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    opacity: 0.4,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  platformGroup.add(ring);

  const gridHelper = new THREE.GridHelper(20, 20, 0x00ffff, 0x004444);
  gridHelper.rotation.x = Math.PI / 2;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.25;
  platformGroup.add(gridHelper);

  platformGroup.name = 'platform';
  platformGroup.position.set(0, 0, 0);
  platform = platformGroup;
  scene.add(platformGroup);

  window.addEventListener('resize', onWindowResize);

  return { scene, camera, renderer, playerRig, arena, platform };
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
export function getArena() { return arena; }
export function getPlatform() { return platform; }
