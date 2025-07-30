import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import { getScene, getArena } from './scene.js';
import { updateEnemies3d } from './enemyAI3d.js';
import { updateProjectiles3d, setProjectileGroup } from './projectilePhysics3d.js';
import { uvToSpherePos } from './utils.js';

let enemyGroup;
let projectileGroup;

export function initVrGameLoop() {
  const scene = getScene();
  if (!scene || enemyGroup) return;
  enemyGroup = new THREE.Group();
  enemyGroup.name = 'enemyGroup';
  scene.add(enemyGroup);

  projectileGroup = new THREE.Group();
  projectileGroup.name = 'projectileGroup';
  scene.add(projectileGroup);
  setProjectileGroup(projectileGroup);
}

export function getProjectileGroup(){
  return projectileGroup;
}

export function updateVrGameLoop() {
  const arena = getArena();
  const scene = getScene();
  if (!arena || !scene) return;

  const radius = arena.geometry.parameters.radius;
  const width = 2048; // legacy canvas width
  const height = 1024; // legacy canvas height

  const playerPos = uvToSpherePos(state.player.x / width, state.player.y / height, radius);

  updateEnemies3d(playerPos, radius, width, height);
  updateProjectiles3d(radius, width, height);

  state.enemies.forEach(e => {
    if (!e.mesh) {
      const geo = new THREE.SphereGeometry(e.r || 5, 8, 8);
      const color = e.boss ? 0xff4444 : 0xffff00;
      const mat = new THREE.MeshStandardMaterial({ color });
      e.mesh = new THREE.Mesh(geo, mat);
      enemyGroup.add(e.mesh);
    }
    const pos = uvToSpherePos(e.x / width, e.y / height, radius);
    e.mesh.position.copy(pos);
  });
}

