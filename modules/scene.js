import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';

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
        color: 0x333333,
        side: THREE.BackSide,
        metalness: 0.1,
        roughness: 0.8
    });
    arena = new THREE.Mesh(arenaGeometry, arenaMaterial);
    arena.name = 'arena';
    scene.add(arena);

    // FR-01: Correct lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);

    // FR-01: Correct floor grid
    const gridGeometry = new THREE.RingGeometry(ARENA_RADIUS * 0.15, ARENA_RADIUS * 0.2, 64);
    const gridMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        wireframe: true,
        transparent: true,
        opacity: 0.4
    });
    grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.name = 'floorGrid';
    grid.rotation.x = -Math.PI / 2; // **FIX**: Makes the grid horizontal
    grid.position.y = 0; // At player's feet
    scene.add(grid);
    
    // Player Rig to hold camera and controllers
    playerRig = new THREE.Group();
    playerRig.position.set(0, 1.6, 0); // Player height
    playerRig.add(camera);
    scene.add(playerRig);
    
    primaryController = renderer.xr.getController(0);
    secondaryController = renderer.xr.getController(1);
    playerRig.add(primaryController);
    playerRig.add(secondaryController);
}

// Getters for other modules
export const getScene = () => scene;
export const getCamera = () => camera;
export const getRenderer = () => renderer;
export const getArena = () => arena;
export const getGrid = () => grid;
export const getPrimaryController = () => state.settings.handedness === 'right' ? primaryController : secondaryController;
export const getSecondaryController = () => state.settings.handedness === 'right' ? secondaryController : primaryController;
