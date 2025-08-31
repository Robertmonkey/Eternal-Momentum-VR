// Projectile physics helpers for the VR build.
// Import three.js directly rather than relying on a global THREE namespace.
import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';
import { getRenderer, getScene } from './scene.js';
import { VR_PROJECTILE_SPEED_SCALE } from './config.js';
import { usePower } from './powers.js';
import { gameHelpers } from './gameHelpers.js';

let projectileGroup = null;

/**
 * Provide a THREE.Group that newly spawned projectile meshes will be
 * attached to. This is expected to be created by the main VR loop.
 * @param {THREE.Group} group
 */
export function setProjectileGroup(group){
  projectileGroup = group;
}

// Use a standard Map so we can iterate over stored data when cleaning up.
// WeakMap would prevent iteration and caused runtime errors.
const dataMap = new Map();
const projectileTypes = new Set([
  'nova_bullet',
  'ricochet_projectile',
  'seeking_shrapnel',
  'helix_bolt',
  'player_fragment',
  'fireball'
]);

function canDamage(caster, target){
  return !(caster && caster.boss && target.boss);
}

export function updateProjectiles3d(radius = 50, width, height, deltaMs = 16){
  const deltaFactor = deltaMs / 16;
  if(width === undefined || height === undefined){
    const renderer = getRenderer && getRenderer();
    if(renderer && renderer.domElement){
      width = renderer.domElement.width;
      height = renderer.domElement.height;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }
  }
  state.effects.forEach(p=>{
    if(!projectileTypes.has(p.type)) return;
    let mesh = dataMap.get(p);

    if(!p.position){
      const pos = uvToSpherePos((p.x || 0)/width, (p.y || 0)/height, radius);
      p.position = pos;
      const next = uvToSpherePos(
        ((p.x || 0) + (p.dx || 0)) / width,
        ((p.y || 0) + (p.dy || 0)) / height,
        radius
      );
      p.velocity = next.sub(pos).multiplyScalar(VR_PROJECTILE_SPEED_SCALE);
      delete p.dx; delete p.dy;
    }

    // Ensure velocity exists so that later physics steps don't throw if an
    // effect was created without an explicit vector.
    if(!(p.velocity instanceof THREE.Vector3)){
      p.velocity = new THREE.Vector3();
    }

    if(!mesh){
      const geom = new THREE.SphereGeometry(radius * 0.02, 6, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
      if(p.type === 'fireball') {
        mat.color.set(0xff5500);
        mat.emissive = new THREE.Color(0xff2200);
      }
      mesh = new THREE.Mesh(geom, mat);
      if(projectileGroup) projectileGroup.add(mesh);
      dataMap.set(p, mesh);
    }

    if(p.type === 'seeking_shrapnel' || p.type === 'player_fragment'){
      const enemies = Array.isArray(state.enemies) ? state.enemies.filter(e => !e.isFriendly && e.position) : [];
      if(enemies.length){
        const sorted = enemies.slice().sort((a,b)=>
          a.position.distanceTo(p.position) - b.position.distanceTo(p.position));
        const target = sorted[p.targetIndex] || sorted[0];
        if(target){
          const desired = target.position.clone().sub(p.position).normalize();
          const tangent = new THREE.Vector3().crossVectors(p.position, desired)
            .cross(p.position).normalize();
          const speed = p.velocity.length();
          p.velocity.lerp(tangent.multiplyScalar(speed), 0.1);
        }
      }
    }

    const stepVel = p.velocity.clone().multiplyScalar(deltaFactor);
    if(p.type !== 'fireball') {
      p.position.add(stepVel);
      const clamped = p.position.clone().normalize().multiplyScalar(radius);
      p.position.copy(clamped);
      const uv = spherePosToUv(clamped, radius);
      p.x = uv.u * width;
      p.y = uv.v * height;
    } else {
      p.position.add(stepVel);
      const clamped = p.position.clone().normalize().multiplyScalar(radius);
      const uv = spherePosToUv(clamped, radius);
      p.x = uv.u * width;
      p.y = uv.v * height;
    }
    if(mesh){
      mesh.position.copy(p.position);
    }
  });

  // Clean up meshes for any projectiles that no longer exist
  dataMap.forEach((mesh, p) => {
    if(!state.effects.includes(p)){
      if(mesh && projectileGroup) projectileGroup.remove(mesh);
      if(mesh && mesh.geometry) mesh.geometry.dispose();
      if(mesh && mesh.material) mesh.material.dispose();
      dataMap.delete(p);
    }
  });
}

export function updateEffects3d(radius = 50, deltaMs = 16){
  const deltaFactor = deltaMs / 16;
  const now = Date.now();
  for(let i = state.effects.length - 1; i >= 0; i--){
    const ef = state.effects[i];
    switch(ef.type){
      case 'orbital_target':{
        if(ef.track && ef.target && ef.target.alive){
          ef.position.copy(ef.target.position);
        }
        if(now - ef.startTime > 1500){
          if(ef.target && ef.target.alive && canDamage(ef.caster, ef.target)){
            ef.target.takeDamage(25 * (ef.damageModifier || 1), ef.caster === state.player);
          }
          state.effects.splice(i,1);
          state.effects.push({ type:'shockwave', caster: ef.caster, position: ef.position.clone(), radius:0, maxRadius:5, speed:20, startTime: now, hitEnemies:new Set(), damage:10 * state.player.talent_modifiers.damage_multiplier });
        }
        break;
      }
      case 'nova_controller':{
        if(now > ef.startTime + (ef.duration||2000)){ state.effects.splice(i,1); break; }
        if(!ef.lastShot) ef.lastShot = 0;
        if(now - ef.lastShot > 50){
          ef.lastShot = now;
          const caster = ef.caster || state.player;
          const speed = 1;
          let angles = [ef.angle || 0];
          if(ef.novaPulsar && caster === state.player){
            angles = [ef.angle, ef.angle + Math.PI * 2/3, ef.angle - Math.PI*2/3];
          }
          angles.forEach(a=>{
            state.effects.push({ type:'nova_bullet', position: caster.position.clone(), velocity: new THREE.Vector3(Math.cos(a),0,Math.sin(a)).normalize().multiplyScalar(speed), r: ef.r || 0.4, damage:(ef.damage||6)*(ef.damageModifier||1), caster });
          });
          ef.angle = (ef.angle || 0) + 0.5;
        }
        break;
      }
      case 'nova_bullet':{
        ef.position.add(ef.velocity.clone().multiplyScalar(deltaFactor));
        if(ef.position.length() > radius*1.2){ state.effects.splice(i,1); break; }
        state.enemies.forEach(e=>{
          if(e.alive && e.position.distanceTo(ef.position) < (e.r||0.5)+ef.r){
            if(canDamage(ef.caster, e)){
              e.takeDamage(ef.damage, ef.caster===state.player);
            }
            state.effects.splice(i,1);
          }
        });
        break;
      }
      case 'fireball':{
        const step = ef.velocity.clone().multiplyScalar(deltaFactor);
        const toTarget = ef.target.clone().sub(ef.position);
        if (toTarget.length() <= step.length()) {
          ef.position.copy(ef.target);
          state.effects.splice(i,1);
          state.effects.push({
            type:'shockwave',
            caster: ef.caster,
            position: ef.target.clone(),
            radius:0,
            maxRadius: ef.explodeRadius,
            speed:70,
            startTime: now,
            hitEnemies:new Set(),
            damage: ef.damage,
            color: new THREE.Color(0xff9944)
          });
          break;
        }
        ef.position.add(step);
        break;
      }
      case 'boss_ability':{
        if(ef.owner && ef.owner.alive){
          ef.mesh.position.copy(ef.owner.position);
        }
        if(ef.mesh){
          const t = ef.duration > 0 ? Math.min(1, (now - ef.startTime) / ef.duration) : 1;
          ef.mesh.rotation.y += 0.01 * deltaFactor * (ef.stage || 1);
          ef.mesh.rotation.x += 0.005 * deltaFactor * ((ef.stage || 1) - 1);
          const scale = 1 + 0.4 * ((ef.stage || 1) - 1) + 0.15 * Math.sin(t * Math.PI * 2);
          ef.mesh.scale.setScalar(scale);
          ef.mesh.traverse(child => {
            if(child.material && typeof child.material.opacity === 'number'){
              child.material.opacity = 0.7 * (1 - t);
            }
          });
        }
        if(now - ef.startTime > ef.duration){
          if(ef.mesh){
            const scene = getScene && getScene();
            if(scene) scene.remove(ef.mesh);
            if(ef.mesh.geometry) ef.mesh.geometry.dispose();
            if(ef.mesh.material) ef.mesh.material.dispose();
          }
          state.effects.splice(i,1);
        }
        break;
      }
      case 'ricochet_projectile':{
        ef.position.add(ef.velocity.clone().multiplyScalar(deltaFactor));
        const dist = ef.position.length();
        if(dist > radius){
          const normal = ef.position.clone().normalize();
          ef.position.clampLength(0,radius);
          ef.velocity.reflect(normal);
          ef.bounces--; 
          if(state.player.purchasedTalents.has('unstable-payload')){
            const done = ef.initialBounces - ef.bounces;
            ef.r = 0.3 + done*0.1;
            ef.damage += 5;
          }
        }
        state.enemies.forEach(e=>{ if(!e.alive) return; if(ef.position.distanceTo(e.position) < (e.r||0.5)+ef.r && !ef.hitEnemies.has(e)){ if(canDamage(ef.caster, e)){ e.takeDamage(ef.damage, ef.caster===state.player); } ef.hitEnemies.add(e); ef.velocity.reflect(e.position.clone().sub(ef.position).normalize()); ef.bounces--; }});
        if(ef.bounces <=0){ state.effects.splice(i,1); }
        break;
      }
      case 'shockwave':{
        if(!ef.mesh){
          const geom = new THREE.SphereGeometry(1, 16, 16);
          const mat = new THREE.MeshBasicMaterial({
            color: ef.color || 0xffffff,
            transparent: true,
            opacity: 0.3,
            wireframe: true
          });
          ef.mesh = new THREE.Mesh(geom, mat);
          if(projectileGroup) projectileGroup.add(ef.mesh);
        }

        ef.radius += ef.speed * 0.05 * deltaFactor;
        if(ef.mesh){
          ef.mesh.position.copy(ef.position);
          ef.mesh.scale.setScalar(Math.max(ef.radius, 0.001));
        }

        state.enemies.forEach(e=>{
          if(!e || !e.position) return;
          if(e.alive === false) return;
          if(ef.hitEnemies.has(e)) return;
          if(e.position.distanceTo(ef.position) < ef.radius + (e.r||0.5)){
            if(canDamage(ef.caster, e)){
              e.takeDamage(ef.damage, ef.caster===state.player);
            }
            const dir = e.position.clone().sub(ef.position).normalize();
            e.position.add(dir.multiplyScalar(0.5));
            ef.hitEnemies.add(e);
          }
        });

        if(ef.radius >= ef.maxRadius){
          if(ef.mesh){
            if(projectileGroup) projectileGroup.remove(ef.mesh);
            ef.mesh.geometry.dispose();
            ef.mesh.material.dispose();
          }
          state.effects.splice(i,1);
        }
        break;
      }
      case 'black_hole':{
        if(!ef.mesh){
          const geom = new THREE.SphereGeometry(1, 16, 16);
          const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
          ef.mesh = new THREE.Mesh(geom, mat);
          if(projectileGroup) projectileGroup.add(ef.mesh);
        }
        if(ef.mesh){
          ef.mesh.position.copy(ef.position);
          const scale = 0.5 + Math.min(1, (now - ef.startTime) / ef.duration);
          ef.mesh.scale.setScalar(scale);
        }

        const progress = Math.min(1, (now - ef.startTime) / ef.duration);
        const pullRadius = ef.maxRadius * progress;
        state.enemies.forEach(e => {
          if(!e.alive) return;
          const d = e.position.distanceTo(ef.position);
          if(d < pullRadius){
            let pull = e.boss ? 0.03 : 0.1;
            pull *= deltaFactor;
            e.position.add(ef.position.clone().sub(e.position).multiplyScalar(pull));
            if(state.player.purchasedTalents.has('unstable-singularity') && d < ef.radius && now - (ef.lastDamage.get(e)||0) > ef.damageRate){
              if(canDamage(ef.caster, e)){
                e.takeDamage(ef.damage, ef.caster===state.player);
              }
              ef.lastDamage.set(e, now);
            }
          }
        });
        if(ef.caster !== state.player){
          const pd = state.player.position.distanceTo(ef.position);
          if(pd < pullRadius){
            const pullPlayer = 0.08 * deltaFactor;
            state.player.position.add(ef.position.clone().sub(state.player.position).multiplyScalar(pullPlayer));
            state.player.position.normalize().multiplyScalar(radius);
          }
        }
        if(now > ef.endTime){
          if(ef.mesh){
            if(projectileGroup) projectileGroup.remove(ef.mesh);
            ef.mesh.geometry.dispose();
            ef.mesh.material.dispose();
          }
          state.effects.splice(i,1);
          if(state.player.purchasedTalents.has('unstable-singularity')) state.effects.push({ type:'shockwave', caster: ef.caster, position: ef.position.clone(), radius:0, maxRadius:10, speed:30, startTime: now, hitEnemies:new Set(), damage:25*state.player.talent_modifiers.damage_multiplier });
        }
        break;
      }
      case 'syphon_cone':{
        const total = ef.endTime - (ef.startTime || (ef.startTime = now));
        const remaining = ef.endTime - now;
        const coneAngle = ef.coneAngle || Math.PI / 4;
        const coneLength = radius * 1.5;
        if(!ef.mesh){
          const geom = new THREE.ConeGeometry(coneLength * Math.tan(coneAngle/2), coneLength, 16, 1, true, -coneAngle/2, coneAngle);
          const mat = new THREE.MeshBasicMaterial({ color: 0x9b59b6, transparent: true, opacity: 0, side: THREE.DoubleSide });
          ef.mesh = new THREE.Mesh(geom, mat);
          if(projectileGroup) projectileGroup.add(ef.mesh);
        }
        if(remaining > 0){
          if(ef.source && ef.source.boss && remaining > 250){
            ef.direction = state.player.position.clone().sub(ef.source.position).normalize();
          }
          ef.mesh.position.copy(ef.source.position.clone().add(ef.direction.clone().multiplyScalar(coneLength/2)));
          ef.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), ef.direction);
          const progress = total > 0 ? (total - remaining) / total : 1;
          ef.mesh.material.opacity = 0.4 * progress;
        } else {
          if(ef.mesh){
            if(projectileGroup) projectileGroup.remove(ef.mesh);
            ef.mesh.geometry.dispose();
            ef.mesh.material.dispose();
          }
          if(ef.source === state.player){
            state.pickups.forEach(p => {
              if(p.position && p.position.distanceTo(state.player.position) < radius * 0.4){
                p.isSeeking = true;
              }
            });
          }
          state.effects.splice(i,1);
        }
        break;
      }
      case 'heal_sparkle':{
        if(!ef.mesh){
          const geom = new THREE.IcosahedronGeometry(0.3, 1);
          const mat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff00,
            transparent: true,
            opacity: 0.9
          });
          ef.mesh = new THREE.Mesh(geom, mat);
          if(projectileGroup) projectileGroup.add(ef.mesh);
        }
        if(ef.mesh){
          ef.mesh.position.copy(ef.position);
          const total = ef.endTime - ef.startTime;
          const progress = total > 0 ? (now - ef.startTime) / total : 1;
          ef.mesh.scale.setScalar(1 + progress * 2);
          ef.mesh.rotation.x += 0.05 * deltaFactor;
          ef.mesh.rotation.y += 0.08 * deltaFactor;
          ef.mesh.material.opacity = 0.9 * Math.max(0, 1 - progress);
          ef.mesh.material.emissiveIntensity = 1 + progress;
        }
        if(now > ef.endTime){
          if(ef.mesh){
            if(projectileGroup) projectileGroup.remove(ef.mesh);
            ef.mesh.geometry.dispose();
            ef.mesh.material.dispose();
          }
          state.effects.splice(i,1);
        }
        break;
      }
      case 'shield_activation':{
        if(!ef.mesh){
          const geom = new THREE.SphereGeometry(state.player.r * 1.4, 32, 32);
          const mat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x0088ff,
            transparent: true,
            opacity: 0.4,
            wireframe: true
          });
          ef.mesh = new THREE.Mesh(geom, mat);
          if(projectileGroup) projectileGroup.add(ef.mesh);
        }
        if(ef.mesh){
          ef.mesh.position.copy(state.player.position);
          const total = ef.endTime - ef.startTime;
          const progress = total > 0 ? (now - ef.startTime) / total : 1;
          const pulse = 1 + 0.2 * Math.sin(progress * Math.PI * 4);
          ef.mesh.scale.setScalar(pulse);
          ef.mesh.rotation.y += 0.01 * deltaFactor;
          ef.mesh.material.opacity = 0.4 * Math.max(0, 1 - progress);
          ef.mesh.material.emissiveIntensity = 0.8 + 0.4 * Math.sin(progress * Math.PI * 2);
        }
        if(now > ef.endTime || !state.player.shield){
          if(ef.mesh){
            if(projectileGroup) projectileGroup.remove(ef.mesh);
            ef.mesh.geometry.dispose();
            ef.mesh.material.dispose();
          }
          state.effects.splice(i,1);
        }
        break;
      }
      case 'paradox_player_echo':{
        if(now - ef.startTime >= 1000){
          const prevDir = state.cursorDir.clone();
          state.cursorDir.copy(ef.cursorDir);
          const origin = { position: ef.position.clone() };
          usePower(ef.powerKey, true, { origin, damageModifier: 0.5 });
          state.cursorDir.copy(prevDir);
          gameHelpers.play && gameHelpers.play('mirrorSwap');
          state.effects.splice(i,1);
        }
        break;
      }
      case 'chain_lightning':{
        const linkIndex = Math.floor((now - ef.startTime)/(ef.durationPerLink||80));
        if(linkIndex >= ef.targets.length){
          if(ef.beams){
            ef.beams.forEach(b=>{
              if(projectileGroup) projectileGroup.remove(b);
              b.geometry.dispose();
              b.material.dispose();
            });
          }
          state.effects.splice(i,1);
          break;
        }

        if(!ef.beams) ef.beams = [];
        const fromOrigin = ef.caster && ef.caster.position ? ef.caster.position : state.player.position;
        for(let j=0;j<=linkIndex;j++){
          const from = (j===0 ? fromOrigin : ef.targets[j-1].position);
          const to = ef.targets[j];
          if(!to || !to.alive) continue;

          let beam = ef.beams[j];
          const points = [from.clone(), to.position.clone()];
          if(!beam){
            const geom = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({ color: 0x99ccff, transparent: true, opacity: 0.8 });
            beam = new THREE.Line(geom, mat);
            if(projectileGroup) projectileGroup.add(beam);
            ef.beams[j] = beam;
          } else {
            beam.geometry.setFromPoints(points);
          }

          if(!ef.links) ef.links = new Set();
          if(!ef.links.has(to)){
            if(canDamage(ef.caster, to)){
              to.takeDamage(ef.damage, ef.caster===state.player);
            }
            ef.links.add(to);
            if(j===ef.targets.length-1 && state.player.purchasedTalents.has('volatile-finish')){
              state.effects.push({ type:'shockwave', caster: ef.caster, position: to.position.clone(), radius:0, maxRadius:5, speed:40, startTime: now, hitEnemies:new Set(), damage:15*state.player.talent_modifiers.damage_multiplier });
            }
          }
        }

        for(let j = linkIndex+1; j < ef.beams.length; j++){
          const beam = ef.beams[j];
          if(beam){
            if(projectileGroup) projectileGroup.remove(beam);
            beam.geometry.dispose();
            beam.material.dispose();
          }
        }
        ef.beams.length = linkIndex+1;
        break;
      }
      case 'repulsion_field':{
        if(now > ef.endTime){
          if(ef.mesh){
            if(projectileGroup) projectileGroup.remove(ef.mesh);
            ef.mesh.geometry.dispose();
            ef.mesh.material.dispose();
          }
          state.effects.splice(i,1);
          break;
        }
        if(!ef.mesh){
          const geom = new THREE.SphereGeometry(ef.radius, 16, 16);
          const mat = new THREE.MeshBasicMaterial({ color: ef.isOverloaded ? 0x00ffff : 0xffffff, transparent: true, opacity: 0.2, wireframe: true });
          ef.mesh = new THREE.Mesh(geom, mat);
          if(projectileGroup) projectileGroup.add(ef.mesh);
        }
        ef.position.copy(state.player.position);
        if(ef.mesh){
          ef.mesh.position.copy(ef.position);
          const total = ef.endTime - ef.startTime;
          const progress = total > 0 ? (ef.endTime - now) / total : 0;
          let baseOpacity = 0.4 * Math.max(0, progress);
          if(ef.isOverloaded && now < ef.startTime + 2000){
            baseOpacity = 0.8 * Math.max(0, 1 - (now - ef.startTime)/2000);
          }
          ef.mesh.material.opacity = baseOpacity;
        }
        state.enemies.forEach(e=>{
          if(e.isFriendly || !e.position) return;
          const dist = e.position.distanceTo(ef.position);
          if(dist < ef.radius + (e.r||0.5)){
            const dir = e.position.clone().sub(ef.position).normalize();
            if(ef.isOverloaded && now < ef.startTime + 2000 && !ef.hitEnemies.has(e)){
              e.position.add(dir.clone().multiplyScalar(20));
              ef.hitEnemies.add(e);
            }
            e.position.add(dir.multiplyScalar(5 * deltaFactor));
          }
        });
        break;
      }
      case 'small_freeze':{
        state.enemies.forEach(e => {
          if(!e.isFriendly && e.alive && !e.frozen && e.position.distanceTo(ef.position) < ef.radius){
            if(Math.random() < 0.5){
              e.frozen = true;
              e.wasFrozen = true;
              e.frozenUntil = now + 1000;
              if (state.player.equippedAberrationCore === 'basilisk' || state.player.activePantheonBuffs.some(b => b.coreId === 'basilisk')) {
                e.petrifiedUntil = now + 1000;
              }
            }
          }
        });
        state.effects.splice(i,1);
        break;
      }
    }
  }
}
