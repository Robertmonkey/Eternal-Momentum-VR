import * as THREE from '../vendor/three.module.js';
import { initControllerMenu } from './ControllerMenu.js';
import { setProjectileGroup } from './projectilePhysics3d.js';

let scene, camera, renderer, arena, leftController, rightController, playerRig;
let skyMaterial, starMaterial, platformMaterial, ringMaterial, stars, ring, platform;
let visualClock = 0;
const ARENA_RADIUS = 50;

function createSkyMaterial() {
    return new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
            topColor: { value: new THREE.Color(0x111a35) },
            bottomColor: { value: new THREE.Color(0x05070f) },
            auroraColor: { value: new THREE.Color(0x4ae2ff) },
            glowStrength: { value: 1.4 },
            time: { value: 0 }
        },
        vertexShader: `varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform vec3 auroraColor; uniform float glowStrength; uniform float time; varying vec2 vUv;\nfloat hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }\nfloat noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); float a = hash(i); float b = hash(i + vec2(1.0, 0.0)); float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0)); vec2 u = f * f * (3.0 - 2.0 * f); return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y; }\nfloat fbm(vec2 p){ float v = 0.0; float amp = 0.55; float freq = 1.0; for(int i = 0; i < 4; i++){ v += noise(p * freq) * amp; freq *= 2.1; amp *= 0.55; } return v; }\nvoid main() {\n  float t = smoothstep(0.0, 1.0, vUv.y);\n  vec3 base = mix(bottomColor, topColor, pow(t, glowStrength));\n  float vignette = smoothstep(1.0, 0.32, length(vUv - 0.5));\n  vec2 swirl = vUv * 3.2 + vec2(time * 0.025, -time * 0.018);\n  float aurora = fbm(swirl + vec2(0.0, sin(time * 0.12) * 0.4));\n  aurora = smoothstep(0.35, 0.82, aurora);\n  float haze = fbm(swirl * 0.55 + time * 0.02);\n  vec3 color = mix(base * (0.6 + 0.2 * haze), base, vignette);\n  color += (aurora * 0.7 + haze * 0.3) * auroraColor * 0.7;\n  gl_FragColor = vec4(color, 1.0);\n}`
    });
}

function createStarMaterial() {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            time: { value: 0 },
            tintA: { value: new THREE.Color(0x8dd6ff) },
            tintB: { value: new THREE.Color(0xff6bce) }
        },
        vertexShader: `attribute float size; varying float vSize;\nvoid main(){ vSize = size; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * (280.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }`,
        fragmentShader: `uniform float time; uniform vec3 tintA; uniform vec3 tintB; varying float vSize;\nvoid main(){ vec2 uv = gl_PointCoord - vec2(0.5); float dist = length(uv); float sparkle = 0.65 + 0.35 * sin(time * 1.7 + vSize * 0.5); float halo = smoothstep(0.45, 0.05, dist); float star = pow(max(0.0, 1.0 - dist * 2.2), 2.5); vec3 color = mix(tintA, tintB, 0.35 + 0.35 * sin(time * 0.2 + vSize * 0.1)); float alpha = (halo * 0.9 + star) * sparkle; gl_FragColor = vec4(color * alpha, alpha); }`
    });
}

function createPlatformMaterial() {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
            time: { value: 0 },
            innerColor: { value: new THREE.Color(0x00ffff) },
            outerColor: { value: new THREE.Color(0x002b55) }
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float time; uniform vec3 innerColor; uniform vec3 outerColor; varying vec2 vUv;\nvoid main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); float vignette = smoothstep(1.0, 0.5, r); float pulse = sin(time * 1.5 + r * 10.0); float ripple = smoothstep(0.32, 0.3, abs(0.62 - r + 0.02 * sin(time * 0.8))); vec3 color = mix(outerColor, innerColor, 0.55 + 0.35 * vignette); color += innerColor * ripple * 0.8; float alpha = (1.0 - r) * 0.6 * vignette + ripple * 0.25 + pulse * 0.05; gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.7)); }`
    });
}

function createRingMaterial() {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
            time: { value: 0 },
            color: { value: new THREE.Color(0x00ffff) }
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float time; uniform vec3 color; varying vec2 vUv;\nvoid main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); float glow = smoothstep(0.9, 0.6, r); float wave = 0.5 + 0.5 * sin(time * 2.0 + r * 12.0); float alpha = glow * (0.35 + 0.35 * wave); gl_FragColor = vec4(color * (0.8 + 0.4 * wave), alpha); }`
    });
}

export function initScene() {
    scene = new THREE.Scene();
    const skyGeo = new THREE.SphereGeometry(1000, 64, 64);
    skyMaterial = createSkyMaterial();
    const sky = new THREE.Mesh(skyGeo, skyMaterial);
    scene.add(sky);

    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.25, Math.random() - 0.5).normalize();
        const distance = 940 + Math.random() * 80;
        const idx = i * 3;
        starPositions[idx] = dir.x * distance;
        starPositions[idx + 1] = dir.y * distance;
        starPositions[idx + 2] = dir.z * distance;
        starSizes[i] = 6.5 + Math.random() * 10;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    starMaterial = createStarMaterial();
    stars = new THREE.Points(starGeo, starMaterial);
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
        opacity: 0.04,
        depthWrite: false
    });
    arena = new THREE.Mesh(arenaGeometry, arenaMaterial);
    arena.name = 'arena';
    scene.add(arena);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);

    const platformRadius = ARENA_RADIUS * 0.1;
    const platformGeometry = new THREE.CircleGeometry(platformRadius, 48);
    platformMaterial = createPlatformMaterial();
    platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.rotation.x = -Math.PI / 2;
    scene.add(platform);

    const ringGeometry = new THREE.RingGeometry(platformRadius * 0.98, platformRadius * 1.12, 64, 1);
    ringMaterial = createRingMaterial();
    ring = new THREE.Mesh(ringGeometry, ringMaterial);
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

export function updateSceneVisuals(deltaMs = 16) {
    const deltaSeconds = deltaMs / 1000;
    visualClock += deltaSeconds;

    if (skyMaterial) {
        skyMaterial.uniforms.time.value = visualClock;
        skyMaterial.uniforms.glowStrength.value = 1.35 + Math.sin(visualClock * 0.4) * 0.08;
    }
    if (starMaterial) {
        starMaterial.uniforms.time.value = visualClock;
    }
    if (platformMaterial) {
        platformMaterial.uniforms.time.value = visualClock;
    }
    if (ringMaterial) {
        ringMaterial.uniforms.time.value = visualClock;
    }
    if (ring) {
        ring.rotation.z += deltaSeconds * 0.6;
    }
    if (stars) {
        stars.rotation.y += deltaSeconds * 0.015;
    }
    if (arena?.material) {
        arena.material.opacity = 0.03 + Math.abs(Math.sin(visualClock * 0.45)) * 0.05;
    }
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
