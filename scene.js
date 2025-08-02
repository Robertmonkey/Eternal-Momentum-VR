import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import { initControllerMenu } from './ControllerMenu.js';

let scene, camera, renderer, arena, grid, primaryController, secondaryController, playerRig;
const ARENA_RADIUS = 50;

export function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const arenaGeometry = new THREE.SphereGeometry(ARENA_RADIUS, 64, 32);
    const arenaMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333, side: THREE.BackSide, metalness: 0.1, roughness: 0.8
    });
    arena = new THREE.Mesh(arenaGeometry, arenaMaterial);
    arena.name = 'arena';
    scene.add(arena);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);

    const gridSize = ARENA_RADIUS * 0.4;
    grid = new THREE.GridHelper(gridSize, 10, 0x00ffff, 0x00ffff);
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);

    const ringGeometry = new THREE.RingGeometry(gridSize * 0.98, gridSize, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    
    playerRig = new THREE.Group();
    playerRig.position.set(0, 1.6, 0);
    playerRig.add(camera);
    scene.add(playerRig);
    
    primaryController = renderer.xr.getController(0);
    secondaryController = renderer.xr.getController(1);
    playerRig.add(primaryController);
    playerRig.add(secondaryController);

    initControllerMenu();
}

// Getters for other modules
export const getScene = () => scene;
export const getCamera = () => camera;
export const getRenderer = () => renderer;
export const getArena = () => arena;
export const getGrid = () => grid;
export const getPrimaryController = () => state.settings.handedness === 'right' ? primaryController : secondaryController;
export const getSecondaryController = () => state.settings.handedness === 'right' ? secondaryController : primaryController;
