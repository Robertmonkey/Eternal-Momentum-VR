import * as THREE from '../vendor/three.module.js';
import { initControllerMenu } from './ControllerMenu.js';
import { setProjectileGroup } from './projectilePhysics3d.js';

let scene, camera, renderer, arena, leftController, rightController, playerRig;
const ARENA_RADIUS = 50;

export function initScene() {
    scene = new THREE.Scene();
    const skyGeo = new THREE.SphereGeometry(1000, 64, 64);
    const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
            topColor: { value: new THREE.Color(0x111a35) },
            bottomColor: { value: new THREE.Color(0x05070f) },
            glowStrength: { value: 1.4 }
        },
        vertexShader: `varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float glowStrength; varying vec2 vUv;\nvoid main() {\n  float t = smoothstep(0.0, 1.0, vUv.y);\n  vec3 base = mix(bottomColor, topColor, pow(t, glowStrength));\n  float vignette = smoothstep(1.0, 0.3, length(vUv - 0.5));\n  vec3 color = mix(base * 0.6, base, vignette);\n  gl_FragColor = vec4(color, 1.0);\n}`
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    const starColor = new THREE.Color(0x8dd6ff);
    for (let i = 0; i < starCount; i++) {
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.25, Math.random() - 0.5).normalize();
        const distance = 940 + Math.random() * 80;
        const idx = i * 3;
        starPositions[idx] = dir.x * distance;
        starPositions[idx + 1] = dir.y * distance;
        starPositions[idx + 2] = dir.z * distance;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
        color: starColor,
        size: 1.5,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.75
    });
    const stars = new THREE.Points(starGeo, starMat);
    stars.name = 'cosmicStars';
    scene.add(stars);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const arenaGeometry = new THREE.SphereGeometry(ARENA_RADIUS, 64, 32);
    const arenaMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        side: THREE.BackSide,
        metalness: 0.1,
        roughness: 0.8,
        transparent: true,
        opacity: 0,
        depthWrite: false
    });
    arena = new THREE.Mesh(arenaGeometry, arenaMaterial);
    arena.name = 'arena';
    scene.add(arena);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);

    const platformRadius = ARENA_RADIUS * 0.1;
    const platformGeometry = new THREE.CircleGeometry(platformRadius, 6);
    const platformMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.rotation.x = -Math.PI / 2;
    scene.add(platform);

    const ringGeometry = new THREE.RingGeometry(platformRadius * 0.98, platformRadius, 6);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);

    const projectileGroup = new THREE.Group();
    scene.add(projectileGroup);
    setProjectileGroup(projectileGroup);
    
    playerRig = new THREE.Group();
    playerRig.position.set(0, 1.6, 0);
    playerRig.add(camera);
    scene.add(playerRig);

    const controller1 = renderer.xr.getController(0);
    const controller2 = renderer.xr.getController(1);
    playerRig.add(controller1);
    playerRig.add(controller2);

    const assign = (controller, evt) => {
        const hand = evt?.data?.handedness;
        if (hand === 'left') {
            leftController = controller;
        } else if (hand === 'right') {
            rightController = controller;
        }
        initControllerMenu();
    };
    const clear = controller => {
        if (controller === leftController) leftController = null;
        if (controller === rightController) rightController = null;
    };

    controller1.addEventListener('connected', e => assign(controller1, e));
    controller2.addEventListener('connected', e => assign(controller2, e));
    controller1.addEventListener('disconnected', () => clear(controller1));
    controller2.addEventListener('disconnected', () => clear(controller2));

    initControllerMenu();
}

// Getters for other modules
export const getScene = () => scene;
export const getCamera = () => camera;
export const getRenderer = () => renderer;
export const getArena = () => arena;
// Always keep the pointer on the right controller when available and
// reserve the left controller for the hand menu. Gracefully fall back to
// whichever controller exists on platforms that only expose a single hand.
export const getPrimaryController = () => {
  if (rightController) return rightController;
  if (leftController) return leftController;
  return null;
};

export const getSecondaryController = () => {
  if (leftController) return leftController;
  if (rightController) return rightController;
  return null;
};
