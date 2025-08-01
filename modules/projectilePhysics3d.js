// Projectile physics helpers for the VR build.
// Import three.js directly rather than relying on a global THREE namespace.
import * as THREE from '../vendor/three.module.js';
import { state } from './state.js';
import { uvToSpherePos, spherePosToUv } from './utils.js';
import { getRenderer } from './scene.js';
import { VR_PROJECTILE_SPEED_SCALE } from './config.js';

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
  'player_fragment'
]);

function canDamage(caster, target){
  return !(caster && caster.boss && target.boss);
}

export function updateProjectiles3d(radius = 50, width, height){
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

    if(!mesh){
      const geom = new THREE.SphereGeometry(radius * 0.02, 6, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
      mesh = new THREE.Mesh(geom, mat);
      if(projectileGroup) projectileGroup.add(mesh);
      dataMap.set(p, mesh);
    }

    if(p.type === 'seeking_shrapnel' || p.type === 'player_fragment'){
      const enemies = state.enemies.filter(e => !e.isFriendly && e.position);
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

    p.position.add(p.velocity).normalize().multiplyScalar(radius);
    const uv = spherePosToUv(p.position, radius);
    p.x = uv.u * width;
    p.y = uv.v * height;
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

export function updateEffects3d(radius = 50){
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
        ef.position.add(ef.velocity);
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
      case 'ricochet_projectile':{
        ef.position.add(ef.velocity);
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
        ef.radius += ef.speed * 0.05;
        state.enemies.forEach(e=>{ if(e.alive && !ef.hitEnemies.has(e) && e.position.distanceTo(ef.position) < ef.radius + (e.r||0.5)){ if(canDamage(ef.caster, e)){ e.takeDamage(ef.damage, ef.caster===state.player); } const dir = e.position.clone().sub(ef.position).normalize(); e.position.add(dir.multiplyScalar(0.5)); ef.hitEnemies.add(e); }});
        if(ef.radius >= ef.maxRadius){ state.effects.splice(i,1); }
        break;
      }
      case 'black_hole':{
        const progress = Math.min(1, (now - ef.startTime) / ef.duration);
        const pullRadius = ef.maxRadius * progress;
        state.enemies.forEach(e=>{ if(!e.alive) return; const d = e.position.distanceTo(ef.position); if(d < pullRadius){ const pull = e.boss ? 0.02 : 0.05; e.position.add(ef.position.clone().sub(e.position).multiplyScalar(pull)); if(state.player.purchasedTalents.has('unstable-singularity') && d < ef.radius && now - (ef.lastDamage.get(e)||0) > ef.damageRate){ if(canDamage(ef.caster, e)){ e.takeDamage(ef.damage, ef.caster===state.player); } ef.lastDamage.set(e, now); } }});
        if(now > ef.endTime){ state.effects.splice(i,1); if(state.player.purchasedTalents.has('unstable-singularity')) state.effects.push({ type:'shockwave', caster: ef.caster, position: ef.position.clone(), radius:0, maxRadius:10, speed:30, startTime: now, hitEnemies:new Set(), damage:25*state.player.talent_modifiers.damage_multiplier }); }
        break;
      }
      case 'chain_lightning':{
        const linkIndex = Math.floor((now - ef.startTime)/(ef.durationPerLink||80));
        if(linkIndex >= ef.targets.length){ state.effects.splice(i,1); break; }
        for(let j=0;j<=linkIndex;j++){
          const to = ef.targets[j];
          if(!to || !to.alive) continue;
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
