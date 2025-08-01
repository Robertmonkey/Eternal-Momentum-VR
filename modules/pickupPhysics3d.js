import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import { offensivePowers, powers, usePower } from './powers.js';
import { gameHelpers } from './gameHelpers.js';
import * as CoreManager from './CoreManager.js';
import { createTextSprite } from './UIManager.js';
import { getScene, getCamera } from './scene.js';

const ARENA_RADIUS = 50; // Should match arena radius in scene.js

const meshMap = new Map();

function createMesh(pickup){
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.4
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(pickup.r, 16, 16), material);
    const sprite = createTextSprite(pickup.emoji || powers[pickup.type]?.emoji || '?', 48);
    sprite.position.set(0, 0, pickup.r + 0.05);
    group.add(sphere, sprite);
    const scene = getScene();
    if(scene) scene.add(group);
    meshMap.set(pickup, { group, sphere, sprite });
}

function removeMesh(pickup){
    const data = meshMap.get(pickup);
    if(!data) return;
    const scene = getScene();
    if(scene) scene.remove(data.group);
    data.group.traverse(obj => {
        if(obj.material){
            if(obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
        }
        if(obj.geometry) obj.geometry.dispose();
    });
    meshMap.delete(pickup);
}

export function updatePickups3d(radius = ARENA_RADIUS){
    const playerPos = state.player.position.clone();
    for(let i = state.pickups.length - 1; i >= 0; i--){
        const p = state.pickups[i];
        const now = Date.now();
        if(p.lifeEnd && now > p.lifeEnd){
            removeMesh(p);
            state.pickups.splice(i,1);
            continue;
        }
        if(!meshMap.has(p)) createMesh(p);
        const data = meshMap.get(p);
        const dist = p.position.distanceTo(playerPos);
        const pickupRadius = 5 + state.player.talent_modifiers.pickup_radius_bonus * 0.05;
        if(p.isSeeking || dist < pickupRadius){
            const speed = p.isSeeking ? 2.0 : 0.8;
            const dir = playerPos.clone().sub(p.position).normalize();
            p.position.add(dir.multiplyScalar(speed * 0.05)).normalize().multiplyScalar(radius);
        }
        data.group.position.copy(p.position);
        data.group.rotation.y += 0.03;
        data.sprite.lookAt(getCamera().position);
        if(dist < state.player.r + p.r){
            gameHelpers.play('pickupSound');
            if(p.type === 'rune_of_fate'){
                gameHelpers.addStatusEffect("Shaper's Boon", '⭐', 999999);
                state.player.talent_modifiers.damage_multiplier *= 1.05;
                state.player.talent_modifiers.pickup_radius_bonus += 20;
                gameHelpers.play('shaperAttune');
                removeMesh(p);
                state.pickups.splice(i,1);
                continue;
            }
            if(state.player.purchasedTalents.has('essence-weaving')){
                state.player.health = Math.min(state.player.maxHealth, state.player.health + state.player.maxHealth * 0.02);
            }
            CoreManager.onPickup();
            if(p.customApply){
                p.customApply();
            }else{
                const isOff = offensivePowers.includes(p.type);
                const inv = isOff ? state.offensiveInventory : state.defensiveInventory;
                const maxSlots = isOff ? state.player.unlockedOffensiveSlots : state.player.unlockedDefensiveSlots;
                const idx = inv.indexOf(null);
                if(idx !== -1 && idx < maxSlots){
                    inv[idx] = p.type;
                }else if(state.player.purchasedTalents.has('overload-protocol')){
                    gameHelpers.addStatusEffect('Auto-Used', powers[p.type]?.emoji || '?', 2000);
                    usePower(p.type, true);
                }
            }
            removeMesh(p);
            state.pickups.splice(i,1);
        }
    }
    meshMap.forEach((data, pickup) => {
        if(!state.pickups.includes(pickup)){
            removeMesh(pickup);
        }
    });
}
