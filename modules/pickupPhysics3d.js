import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import { powers } from './powers.js';
import { gameHelpers } from './gameHelpers.js';
import * as CoreManager from './CoreManager.js';
import { addPowerToInventory } from './PowerManager.js';
import { createTextSprite } from './UIManager.js';
import { getScene, getCamera } from './scene.js';
import { applyPlayerHeal } from './helpers.js';

const ARENA_RADIUS = 50; // Should match arena radius in scene.js

const meshMap = new Map();
const WHITE = new THREE.Color(0xffffff);

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
    const spriteSize = pickup.r * 2000;
    const sprite = createTextSprite(pickup.emoji || powers[pickup.type]?.emoji || '?', spriteSize);
    sprite.position.set(0, 0, pickup.r + 0.05);
    group.add(sphere, sprite);
    const scene = getScene();
    if(scene) scene.add(group);
    meshMap.set(pickup, {
        group,
        sphere,
        sprite,
        baseSphereScale: sphere.scale.clone(),
        baseSpriteScale: sprite.scale.clone(),
        baseEmissive: typeof material.emissiveIntensity === 'number' ? material.emissiveIntensity : 0,
        baseColor: material.color ? material.color.clone() : null,
        animation: null
    });
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
        if(!data.animation){
            data.animation = {
                phase: Math.random() * Math.PI * 2,
                speed: 0.002 + Math.random() * 0.0015,
                height: Math.max(0.25, p.r * 0.8),
                lastTime: now
            };
        }
        const anim = data.animation;
        const elapsed = anim.lastTime ? now - anim.lastTime : 16;
        const delta = Math.min(120, Math.max(1, elapsed));
        anim.lastTime = now;
        anim.phase = (anim.phase + anim.speed * delta) % (Math.PI * 2);

        const normal = p.position.clone().normalize();
        const bobOffset = normal.multiplyScalar(Math.sin(anim.phase) * anim.height);
        data.group.position.copy(p.position.clone().add(bobOffset));
        data.group.rotation.y += delta * 0.0015;

        if (data.sphere && data.baseSphereScale) {
            const pulse = 1 + Math.sin(anim.phase * 2) * 0.18;
            data.sphere.scale.set(
                data.baseSphereScale.x * pulse,
                data.baseSphereScale.y * pulse,
                data.baseSphereScale.z * pulse
            );
            if (data.baseColor && data.sphere.material?.color) {
                data.sphere.material.color.copy(data.baseColor);
                data.sphere.material.color.lerp(WHITE, Math.max(0, Math.sin(anim.phase + Math.PI / 2)) * 0.2);
            }
            if (typeof data.baseEmissive === 'number' && typeof data.sphere.material?.emissiveIntensity === 'number') {
                const glow = data.baseEmissive + Math.max(0, Math.sin(anim.phase * 1.5)) * 0.6;
                data.sphere.material.emissiveIntensity = glow;
            }
        }
        if (data.sprite && data.baseSpriteScale) {
            const spritePulse = 1 + Math.sin(anim.phase * 2 + Math.PI / 3) * 0.12;
            data.sprite.scale.set(
                data.baseSpriteScale.x * spritePulse,
                data.baseSpriteScale.y * spritePulse,
                data.baseSpriteScale.z * spritePulse
            );
        }
        const cam = getCamera();
        if (cam) data.sprite.lookAt(cam.position);
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
                applyPlayerHeal(state.player.maxHealth * 0.02);
            }
            CoreManager.onPickup();
            if(p.customApply){
                p.customApply();
            }else{
                addPowerToInventory(p.type);
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
