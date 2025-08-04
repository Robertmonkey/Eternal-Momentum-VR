// modules/utils.js
//
// Utility drawing and particle helpers.  This file is a near verbatim
// reproduction of the upstream project's utils.js but with additional
// helper functions to draw rings and fog used by the redesigned
// aberration core system.  Having these helpers in one place keeps
// rendering logic encapsulated and easier to maintain.

// Previous versions relied on a global THREE namespace. The helpers now import
// the bundled three.js module directly so they can be used in unit tests and in
// builds without exposing THREE globally.
import * as THREE from '../vendor/three.module.js';
import { getRenderer } from './scene.js';

let screenShakeEnd = 0;
let screenShakeMagnitude = 0;

export function drawCircle(ctx, x, y, r, c) {
  if (r <= 0) return; // Safeguard to prevent negative radius errors
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

export function drawCrystal(ctx, x, y, size, color) {
  const sides = 6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + size * Math.cos(0), y + size * Math.sin(0));
  for (let i = 1; i <= sides; i++) {
    const angle = i * 2 * Math.PI / sides;
    const modSize = (i % 2 === 0) ? size : size * 0.6;
    ctx.lineTo(x + modSize * Math.cos(angle), y + modSize * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws a player‑shaped circle on a 2D canvas using the player's 3D position.
 *
 * The player's {@link THREE.Vector3} `position` is projected onto the canvas
 * via {@link toCanvasPos} to ensure all rendering originates from the
 * canonical 3D state.
 *
 * @param {CanvasRenderingContext2D} ctx - Rendering context.
 * @param {{position:THREE.Vector3,r:number}} player - Player object with
 *   world-space position and radius.
 * @param {string} color - Fill style for the player representation.
 */
export function drawPlayer(ctx, player, color) {
  const { x, y } = toCanvasPos(
    player.position,
    ctx.canvas.width,
    ctx.canvas.height
  );
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, player.r, 0, 2 * Math.PI);
  ctx.fill();
}

/**
 * Draws a shadow cone from a source point, occluded by a shadow‑casting
 * object.  Used for the player's Annihilator core effect.
 */
export function drawShadowCone(ctx, sourceX, sourceY, shadowCaster, color) {
  const distToCaster = Math.hypot(shadowCaster.x - sourceX, shadowCaster.y - sourceY);
  const safeRadius = shadowCaster.r * 1.5;
  if (distToCaster <= safeRadius) return; // Source is inside the caster's safe zone
  const angleToCaster = Math.atan2(shadowCaster.y - sourceY, shadowCaster.x - sourceX);
  const angleToTangent = Math.asin(safeRadius / distToCaster);
  const angle1 = angleToCaster - angleToTangent;
  const angle2 = angleToCaster + angleToTangent;
  const t1x = shadowCaster.x + safeRadius * Math.cos(angle1);
  const t1y = shadowCaster.y + safeRadius * Math.sin(angle1);
  const t2x = shadowCaster.x + safeRadius * Math.cos(angle2);
  const t2y = shadowCaster.y + safeRadius * Math.sin(angle2);
  const maxDist = Math.hypot(ctx.canvas.width, ctx.canvas.height) * 2;
  const p1x = t1x + maxDist * (t1x - sourceX) / distToCaster;
  const p1y = t1y + maxDist * (t1y - sourceY) / distToCaster;
  const p2x = t2x + maxDist * (t2x - sourceX) / distToCaster;
  const p2y = t2y + maxDist * (t2y - sourceY) / distToCaster;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(t1x, t1y);
  ctx.lineTo(p1x, p1y);
  ctx.lineTo(p2x, p2y);
  ctx.lineTo(t2x, t2y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Determines whether a point lies within the shadow cast by an object.
 */
export function isPointInShadow(shadowCaster, point, sourceX, sourceY) {
  const distToCaster = Math.hypot(shadowCaster.x - sourceX, shadowCaster.y - sourceY);
  const safeRadius = shadowCaster.r * 1.5;
  if (distToCaster <= safeRadius) return false;
  const angleToCaster = Math.atan2(shadowCaster.y - sourceY, shadowCaster.x - sourceX);
  const angleToTangent = Math.asin(safeRadius / distToCaster);
  const pointAngle = Math.atan2(point.y - sourceY, point.x - sourceX);
  let angleDiff = (pointAngle - angleToCaster);
  while (angleDiff <= -Math.PI) angleDiff += 2 * Math.PI;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  return Math.abs(angleDiff) < angleToTangent && Math.hypot(point.x - sourceX, point.y - sourceY) > distToCaster;
}

export function spawnParticles(particles, x, y, c, n, spd, life, r = 3) {
  const u = ((x / 2048) - 0.5 + 1) % 1;
  const v = y / 1024;
  const center = uvToSpherePos(u, v, 1);
  const basisA = new THREE.Vector3(center.z, 0, -center.x).normalize();
  const basisB = new THREE.Vector3().crossVectors(center, basisA).normalize();
  const speed = (spd / 2048) * 2 * Math.PI;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 2 * Math.PI;
    const dir = basisA.clone().multiplyScalar(Math.cos(a))
      .add(basisB.clone().multiplyScalar(Math.sin(a)))
      .multiplyScalar(speed * (0.5 + Math.random() * 0.5));
    particles.push({
      position: new THREE.Vector3().copy(center),
      velocity: dir,
      r,
      color: c,
      life,
      maxLife: life,
    });
  }
}

export function updateParticles(ctx, particles) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.position.add(p.velocity);
    p.life--;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    if (p.r > 0) {
      const { x, y } = toCanvasPos(p.position, ctx.canvas.width, ctx.canvas.height);
      ctx.arc(x, y, p.r, 0, 2 * Math.PI);
      ctx.fill();
    }
    if (p.life <= 0) particles.splice(i, 1);
  }
  ctx.globalAlpha = 1;
}

export function triggerScreenShake(duration, magnitude) {
  screenShakeEnd = Date.now() + duration;
  screenShakeMagnitude = magnitude;
}

export function applyScreenShake(ctx) {
  if (Date.now() < screenShakeEnd) {
    const x = (Math.random() - 0.5) * screenShakeMagnitude;
    const y = (Math.random() - 0.5) * screenShakeMagnitude;
    ctx.translate(x, y);
  }
}

export function drawLightning(ctx, x1, y1, x2, y2, color, width = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  const w = Number.isFinite(width) ? Math.max(0, width) : 0;
  ctx.lineWidth = Math.random() * w + 1;
  ctx.globalAlpha = Math.random() * 0.5 + 0.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const dx = x2 - x1,
    dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const segments = Math.floor(dist / 15);
  const perpAngle = Math.atan2(dy, dx) + Math.PI / 2;
  for (let i = 1; i < segments; i++) {
    const pos = i / segments;
    const offset = (Math.random() - 0.5) * dist * 0.15;
    ctx.lineTo(
      x1 + dx * pos + Math.cos(perpAngle) * offset,
      y1 + dy * pos + Math.sin(perpAngle) * offset,
    );
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function randomInRange(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return NaN;
  if (min > max) [min, max] = [max, min];
  if (min === max) return min;
  return Math.random() * (max - min) + min;
}

export function lineCircleCollision(x1, y1, x2, y2, cx, cy, r) {
  if (r <= 0) return false;
  r = Math.max(0, r);
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len === 0) return Math.hypot(cx - x1, cy - y1) <= r; // Handle case where line is a point
  const dot = (((cx - x1) * (x2 - x1)) + ((cy - y1) * (y2 - y1))) / Math.pow(len, 2);
  const closestX = x1 + dot * (x2 - x1);
  const closestY = y1 + dot * (y2 - y1);
  const onSegment = () => {
    return (
      closestX >= Math.min(x1, x2) - 1e-6 &&
      closestX <= Math.max(x1, x2) + 1e-6 &&
      closestY >= Math.min(y1, y2) - 1e-6 &&
      closestY <= Math.max(y1, y2) + 1e-6
    );
  };
  if (!onSegment()) {
    const dist1 = Math.hypot(cx - x1, cy - y1);
    const dist2 = Math.hypot(cx - x2, cy - y2);
    return dist1 <= r || dist2 <= r;
  }
  const dist = Math.hypot(cx - closestX, cy - closestY);
  return dist <= r;
}

/* -------------------------------------------------------------------------- */
/* Additional helpers                             */
/*
 * These helpers provide higher level drawing primitives used by the new
 * aberration core effects.  Rings are used for gravity pulses, while fog
 * overlays are used for the miasma gas effect.  Keeping them here allows
 * gameLoop.js to remain focused on logic rather than drawing details.
 */

/**
 * Draw an annulus (ring) with separate inner and outer radii.  Useful for
 * representing expanding pulses.  An optional alpha value can be used to
 * fade the ring over time.
 */
export function drawRing(ctx, x, y, innerR, outerR, color, alpha = 1.0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, Math.PI * 2);
  ctx.arc(x, y, innerR, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a full‑screen fog overlay.  The colour and alpha determine the
 * appearance of the fog.  This helper is used by the miasma effect to
 * tint the screen when the player or enemies are affected.
 */
export function drawFog(ctx, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3D Coordinate Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a 2D UV coordinate from the canvas to a 3D point on the inner
 * surface of the gameplay sphere.
 *
 * @param {number} u - Horizontal coordinate in the range [0,1].
 * @param {number} v - Vertical coordinate in the range [0,1].
 * @param {number} [radius=1] - Sphere radius. Defaults to 1 for normalised
 *   output.  Multiply the resulting vector by your desired radius.
 */
export function uvToSpherePos(u, v, radius = 1) {
  const theta = u * 2 * Math.PI;
  const phi = v * Math.PI;
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

/**
 * Convert a position on the gameplay sphere back to UV coordinates.
 *
 * @param {THREE.Vector3} vec - Vector on the sphere's surface.
 * @param {number} [radius=1] - Radius that was used for the sphere.
 * @returns {{u:number,v:number}}
 */
export function spherePosToUv(vec, radius = 1) {
  const r = vec.length();
  if (r === 0) return { u: 0, v: 0 };
  const theta = Math.atan2(vec.z, vec.x); // -PI..PI
  const phi = Math.acos(vec.y / r);       // 0..PI
  const u = (theta + Math.PI) / (2 * Math.PI);
  const v = phi / Math.PI;
  return { u, v };
}

/**
 * Convert a 3D position on the gameplay sphere to pixel coordinates.
 *
 * @param {THREE.Vector3} vec - Vector on the sphere's surface.
 * @param {number} [width=2048] - Canvas width in pixels.
 * @param {number} [height=1024] - Canvas height in pixels.
 * @returns {{x:number,y:number}}
 */
export function toCanvasPos(vec, width = 2048, height = 1024) {
  const { u, v } = spherePosToUv(vec.clone().normalize(), 1);
  return { x: u * width, y: v * height };
}

/**
 * Rotate a direction vector around a normal by the given angle.
 *
 * @param {THREE.Vector3} dir - Tangent direction to rotate.
 * @param {THREE.Vector3} normal - Normal vector defining the rotation axis.
 * @param {number} angle - Angle in radians.
 * @returns {THREE.Vector3} Rotated direction vector.
 */
export function rotateAroundNormal(dir, normal, angle){
  const q = new THREE.Quaternion();
  q.setFromAxisAngle(normal.clone().normalize(), angle);
  return dir.clone().applyQuaternion(q);
}

/**
 * Convert a distance in screen pixels to an angular arc length on the sphere.
 *
 * @param {number} pixels - Pixel distance.
 * @param {number} [width=2048] - Canvas width in pixels.
 * @returns {number} Angle in radians representing the same arc on the sphere.
 */
export function pixelsToArc(pixels, width = 2048){
  if (!Number.isFinite(pixels) || !Number.isFinite(width) || width === 0) return 0;
  return (pixels / width) * 2 * Math.PI;
}

/**
 * Safely add an event listener if the element exists.
 * @param {EventTarget|null} el
 * @param {string} type
 * @param {Function} handler
 * @param {Object} [options]
 */
export function safeAddEventListener(el, type, handler, options){
  if(!el || typeof el.addEventListener !== 'function') return false;
  if(typeof handler !== 'function') return false;
  el.addEventListener(type, handler, options ?? false);
  return true;
}

/**
 * Capture a DOM element to a THREE.CanvasTexture using html2canvas.
 * The element is temporarily styled for rendering via the 'is-rendering' class.
 * @param {HTMLElement} el
 * @returns {Promise<THREE.CanvasTexture|null>}
 */
export async function captureElementToTexture(el){
  if(!el || typeof html2canvas === 'undefined') return null;
  el.classList.add('is-rendering');

  // Hide the WebGL canvas during capture to avoid html2canvas warnings
  const renderer = getRenderer && getRenderer();
  const renderCanvas = renderer ? renderer.domElement : null;
  const prevDisplay = renderCanvas ? renderCanvas.style.display : null;
  if(renderCanvas) renderCanvas.style.display = 'none';

  const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) ?
    window.devicePixelRatio : 2;
  const canvas = await html2canvas(el, { scale: ratio });

  if(renderCanvas) renderCanvas.style.display = prevDisplay || '';
  el.classList.remove('is-rendering');
  if(!canvas || canvas.width === 0 || canvas.height === 0) return null;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}
