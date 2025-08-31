import * as THREE from '../vendor/three.module.js';
import { getCamera, getPrimaryController } from './scene.js';
import { state } from './state.js';
import { bossData } from './bosses.js';
import { powers } from './powers.js';
import { AssetManager } from './AssetManager.js';

let uiGroup;
let hudMesh;
let healthFill, shieldFill, healthText;
let ascFill, ascText, apText;
let statusGroup, pantheonGroup;
let offSlots = [], defSlots = [];
let offQueue = [], defQueue = [];
let coreIcon, coreCooldown, coreSocket;
let bossContainer;
const bossBars = new Map();
let notificationGroup, notificationTimeout;
const AP_RIGHT_EDGE = 0.44;
// Text sprites are rendered to a canvas and then scaled into world units.
// Centralizing these factors means every UI element uses the same
// pixel-to-world conversion, making tweaks easy and avoiding magic numbers.
export const SPRITE_SCALE = 0.001; // world units per canvas pixel
export const PIXELS_PER_UNIT = 1 / SPRITE_SCALE; // helper for world->pixel math
// The old 2D game used a consistent font stack across every menu.  Centralizing
// it here keeps text rendering uniform anywhere `createTextSprite` is used so
// VR menus mirror the original typography.
export const FONT_STACK = "'Segoe UI','Roboto',sans-serif";

let bgTexture = null;
// Cache the shared menu background texture and configure it to behave like the
// 2D game's single image. We clamp the edges and force a 1x1 repeat so `bg.png`
// doesn't tile; otherwise seams show up on modal panels and button overlays.
export function getBgTexture() {
  if (!bgTexture) {
    const manager = new AssetManager();
    bgTexture = manager.getTexture('assets/bg.png');
    if (bgTexture) {
      // Disable wrapping in both directions and keep a single copy of the
      // texture so it matches the non-repeating 2D background.
      bgTexture.wrapS = THREE.ClampToEdgeWrapping;
      bgTexture.wrapT = THREE.ClampToEdgeWrapping;
      bgTexture.repeat.set(1, 1);
    }
  }
  return bgTexture;
}

export function holoMaterial(color = 0x1e1e2f, opacity = 0.85) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
}

export function createTextSprite(
    text,
    size = 32,
    color = '#eaf2ff',
    align = 'center',
    shadowColor = null,
    shadowBlur = 0,
    fontWeight = 'normal'
) {
    // Render the text to an offscreen canvas; its pixel dimensions will later
    // be translated into world units using SPRITE_SCALE so every sprite obeys
    // the shared HUD sizing rules.
    const lines = String(text).split('\n');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const font = `${fontWeight} ${size}px ${FONT_STACK}`;
    ctx.font = font;
    const padding = size * 0.2;
    const width = Math.ceil(Math.max(...lines.map(l => ctx.measureText(l).width))) + padding;
    canvas.width = Math.max(1, width);
    canvas.height = size * 1.2 * lines.length;
    ctx.font = font;
    if (shadowColor) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
    } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = align;
    const x = align === 'left' ? 0 : align === 'right' ? canvas.width : canvas.width / 2;
    lines.forEach((line, i) => {
        ctx.fillText(line, x, (i + 0.5) * size * 1.2);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    // Text should always render above menu backgrounds and button frames.
    // Giving sprites a higher renderOrder keeps them visible even when other
    // UI elements share the same Z position or disable depth testing.
    mesh.renderOrder = 2;
    // Apply the global pixel-to-world scale so changing SPRITE_SCALE adjusts
    // all text sprites uniformly.
    mesh.scale.set(canvas.width * SPRITE_SCALE, canvas.height * SPRITE_SCALE, 1);
    mesh.userData = { text, canvas, ctx, font, color, size, align, shadowColor, shadowBlur, fontWeight };
    return mesh;
}

export function updateTextSprite(sprite, newText) {
    if (!sprite || !sprite.userData || sprite.userData.text === newText) return; // Don't update if text is the same

    sprite.userData.text = newText;
    const { ctx, canvas, font, color, size, align, shadowColor, shadowBlur } = sprite.userData;
    if (!ctx || !canvas) return;
    ctx.font = font;
    const lines = String(newText).split('\n');
    const padding = size * 0.2;
    const width = Math.ceil(Math.max(...lines.map(l => ctx.measureText(l).width))) + padding;
    canvas.width = Math.max(1, width);
    canvas.height = size * 1.2 * lines.length;
    ctx.font = font;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (shadowColor) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
    } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = align;
    const x = align === 'left' ? 0 : align === 'right' ? canvas.width : canvas.width / 2;
    lines.forEach((line, i) => {
        ctx.fillText(line, x, (i + 0.5) * size * 1.2);
    });
    sprite.material.map.needsUpdate = true;
    sprite.scale.set(canvas.width * SPRITE_SCALE, canvas.height * SPRITE_SCALE, 1);
}

function createHexGeometry(size) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 6 + (i * Math.PI / 3);
        const x = size * Math.sin(angle);
        const y = size * Math.cos(angle);
        if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
}

function createAbilitySlot(size, isMain = false) {
    const group = new THREE.Group();
    const geo = createHexGeometry(size);
    const mat = holoMaterial(isMain ? 0xf000ff : 0x00ffff, 0.1);
    const mesh = new THREE.Mesh(geo, mat);
    const border = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: isMain ? 0xf000ff : 0x00ffff, transparent: true, opacity: 0.4 })
    );
    // The slot's `size` is given in world units, but the emoji sprite needs a
    // canvas font size in pixels. Multiply by PIXELS_PER_UNIT (the inverse of
    // SPRITE_SCALE) to translate the hex's dimensions into pixels so the emoji
    // reliably fills the slot. Using the shared constants means any future
    // scale tweak propagates automatically.
    const spritePixels = size * (isMain ? 1.2 : 1) * PIXELS_PER_UNIT;
    const sprite = createTextSprite('', spritePixels);
    sprite.position.z = 0.001;
    group.add(mesh, border, sprite);
    return { group, sprite };
}

function getBossColor(boss) {
    if (!boss) return 0xffffff;
    if (boss.color) return boss.color;
    const id = boss.kind || boss.id || (boss.role ? 'aethel_and_umbra' : null);
    const data = bossData.find(b => b.id === id);
    return data ? data.color : 0xffffff;
}

export function isBossEnemy(enemy) {
    if (!enemy) return false;
    if (enemy.boss) return true;
    const id = enemy.kind || enemy.id;
    return bossData.some(b => b.id === id);
}

function createBossBar(boss) {
    const group = new THREE.Group();

    // Background mimics the old game's dark wrapper
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.05), holoMaterial(0x000000, 0.6));

    // Thin white border just behind the background
    const border = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.06), holoMaterial(0xffffff, 0.8));
    border.position.z = -0.001;

    // Left anchored fill bar so scaling matches the original behaviour
    const geom = new THREE.PlaneGeometry(0.24, 0.02);
    geom.translate(0.12, 0, 0); // anchor left at x=0
    const color = getBossColor(boss);
    const fill = new THREE.Mesh(geom, holoMaterial(color));
    fill.position.set(-0.12, -0.01, 0.001);

    const label = createTextSprite(boss.name, 24);
    label.position.set(0, 0.015, 0.002);

    group.add(border, bg, fill, label);
    group.userData = { fill, label, color };
    return group;
}

/**
 * Create a simple rectangular background with a neon border to hold the HUD
 * elements. This mirrors the old game's command bar so the UI feels unified.
 * @param {number} width - plane width
 * @param {number} height - plane height
 * @returns {THREE.Group} command bar group
 */
function createCommandBar(width = 0.9, height = 0.25) {
    const group = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(width, height), holoMaterial(0x111122, 0.9));
    const border = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.02, height + 0.02), holoMaterial(0x00ffff, 0.5));
    border.position.z = -0.001;
    group.add(bg, border);
    return group;
}

function createHudElements() {
    const bar = createCommandBar();
    hudMesh.add(bar);

    healthFill = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.03), holoMaterial(0x3498db));
    healthFill.position.set(0, -0.015, 0.002);
    shieldFill = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.03), holoMaterial(0xf1c40f, 0.7));
    shieldFill.position.set(0, -0.015, 0.003);
    healthText = createTextSprite('100 / 100', 24);
    healthText.position.set(0, 0, 0.004);
    
    const healthGroup = new THREE.Group();
    healthGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.05), holoMaterial(0x111122, 0.8)));
    healthGroup.add(healthFill, shieldFill, healthText);
    healthGroup.position.set(0, 0.06, 0);
    hudMesh.add(healthGroup);

    const levelWidth = 0.22;
    const levelHeight = 0.04;
    const levelMargin = 0.01;
    const levelBg = new THREE.Mesh(new THREE.PlaneGeometry(levelWidth, levelHeight), holoMaterial(0x111122, 0.8));
    const levelBorder = new THREE.Mesh(new THREE.PlaneGeometry(levelWidth + 0.02, levelHeight + 0.02), holoMaterial(0x00ffff, 0.4));
    levelBorder.position.z = -0.001;

    const fillGeom = new THREE.PlaneGeometry(levelWidth - levelMargin * 2, levelHeight - levelMargin * 2);
    fillGeom.translate((levelWidth - levelMargin * 2) / -2, 0, 0);
    ascFill = new THREE.Mesh(fillGeom, holoMaterial(0x00ffff));
    ascFill.position.set(-levelWidth / 2 + levelMargin, 0, 0.001);

    ascText = createTextSprite('LVL 1', 20, '#eaf2ff', 'left');
    ascText.position.set(-levelWidth / 2 + levelMargin, 0, 0.002);

    const ascGroup = new THREE.Group();
    ascGroup.add(levelBorder, levelBg, ascFill, ascText);
    const ascX = AP_RIGHT_EDGE - levelWidth / 2;
    ascGroup.position.set(ascX, -0.02, 0);
    hudMesh.add(ascGroup);
    
    apText = createTextSprite('AP: 0', 24, '#00ffff');
    apText.position.set(AP_RIGHT_EDGE, 0.03, 0.001);
    hudMesh.add(apText);

    statusGroup = new THREE.Group();
    statusGroup.name = 'statusGroup';
    statusGroup.position.set(-0.2, 0.12, 0.01);
    hudMesh.add(statusGroup);
    pantheonGroup = new THREE.Group();
    pantheonGroup.name = 'pantheonGroup';
    pantheonGroup.position.set(0.2, 0.12, 0.01);
    hudMesh.add(pantheonGroup);

    const mainSize = 0.05, queueSize = 0.03, mainSpacing = 0.12, queueSpacing = 0.07;
    const defMain = createAbilitySlot(mainSize);
    defMain.group.position.set(-mainSpacing, -0.08, 0.01);
    defSlots[0] = defMain;
    hudMesh.add(defMain.group);
    const offMain = createAbilitySlot(mainSize, true);
    offMain.group.position.set(mainSpacing, -0.08, 0.01);
    offSlots[0] = offMain;
    hudMesh.add(offMain.group);

    for (let i = 0; i < 2; i++) {
        const defQ = createAbilitySlot(queueSize);
        defQ.group.position.set(-mainSpacing - queueSpacing, (i === 0 ? 0.03 : -0.03) - 0.08, 0.01);
        defQueue.push(defQ);
        hudMesh.add(defQ.group);
        const offQ = createAbilitySlot(queueSize, true);
        offQ.group.position.set(mainSpacing + queueSpacing, (i === 0 ? 0.03 : -0.03) - 0.08, 0.01);
        offQueue.push(offQ);
        hudMesh.add(offQ.group);
    }
    
    coreSocket = new THREE.Mesh(new THREE.CircleGeometry(0.04, 32), holoMaterial(0x111122, 0.8));
    coreIcon = createTextSprite('◎', 48);
    coreIcon.position.z = 0.001;
    coreCooldown = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), holoMaterial(0x000000, 0.7));
    coreCooldown.position.z = 0.002;
    coreCooldown.scale.y = 0;
    coreCooldown.visible = false;
    coreSocket.add(coreIcon, coreCooldown);
    coreSocket.position.set(0, -0.08, 0.01);
    hudMesh.add(coreSocket);
}

export function initUI() {
    const camera = getCamera();
    if (!camera || uiGroup) return;
    uiGroup = new THREE.Group();
    uiGroup.name = 'uiGroup';
    uiGroup.visible = false;
    camera.add(uiGroup);
    
    hudMesh = new THREE.Group();
    hudMesh.name = 'hudContainer';
    hudMesh.position.set(0, -0.4, -1.2);
    uiGroup.add(hudMesh);

    createHudElements();

    // The HUD is purely informational and should never block controller
    // rays. Disable raycasting on the entire HUD tree so the cursor can
    // pass through without affecting player movement.
    hudMesh.traverse(obj => { obj.raycast = () => {}; });

    bossContainer = new THREE.Group();
    bossContainer.name = 'bossContainer';
    bossContainer.position.set(0, 0.1, -0.05);
    bossContainer.rotation.x = -0.7;
    const controller = getPrimaryController();
    if (controller) controller.add(bossContainer);

    notificationGroup = new THREE.Group();
    notificationGroup.position.set(0, 0.3, -1.5);
    uiGroup.add(notificationGroup);
}

export function showHud() { if (uiGroup) uiGroup.visible = true; }
export function hideHud() { if (uiGroup) uiGroup.visible = false; }
export function getUIRoot() { return uiGroup; }

function clearGroup(group) {
    if (!group) return;
    while (group.children.length) {
        const child = group.children.pop();
        if (child.geometry) child.geometry.dispose();
        if (child.material?.map) child.material.map.dispose();
        if (child.material) child.material.dispose();
        group.remove(child);
    }
}

function renderStatusEffects(now) {
    if (!statusGroup) return;
    state.player.statusEffects = state.player.statusEffects.filter(e => now < e.endTime);
    clearGroup(statusGroup);
    if (state.player.statusEffects.length === 0) {
        statusGroup.visible = false;
        return;
    }
    statusGroup.visible = true;
    const spacing = 0.01;
    state.player.statusEffects.forEach((effect, i) => {
        const sprite = createTextSprite(effect.emoji || '', 48);
        const width = sprite.scale.x;
        const height = sprite.scale.y;
        const duration = effect.endTime - effect.startTime;
        const remaining = Math.max(0, effect.endTime - now);
        const progress = duration > 0 ? remaining / duration : 0;
        const overlay = new THREE.Mesh(new THREE.PlaneGeometry(width, height), holoMaterial(0x000000, 0.7));
        overlay.position.z = 0.001;
        overlay.scale.y = progress;
        overlay.position.y = -height * (1 - progress) / 2;
        const group = new THREE.Group();
        group.add(sprite, overlay);
        group.position.x = i * (width + spacing);
        statusGroup.add(group);
    });
}

function renderPantheonBuffs(now) {
    if (!pantheonGroup) return;
    state.player.activePantheonBuffs = state.player.activePantheonBuffs.filter(b => now < b.endTime);
    clearGroup(pantheonGroup);
    if (state.player.activePantheonBuffs.length === 0) {
        pantheonGroup.visible = false;
        return;
    }
    pantheonGroup.visible = true;
    const size = 0.04;
    const spacing = 0.01;
    state.player.activePantheonBuffs.forEach((buff, i) => {
        const core = bossData.find(b => b.id === buff.coreId);
        if (!core) return;
        const color = core.id === 'pantheon' ? 0xffffff : parseInt(core.color.replace('#', ''), 16);
        const base = new THREE.Mesh(new THREE.PlaneGeometry(size, size), holoMaterial(color));
        const duration = buff.endTime - buff.startTime;
        const remaining = Math.max(0, buff.endTime - now);
        const progress = duration > 0 ? remaining / duration : 0;
        const overlay = new THREE.Mesh(new THREE.PlaneGeometry(size, size), holoMaterial(0x000000, 0.7));
        overlay.position.z = 0.001;
        overlay.scale.y = progress;
        overlay.position.y = -size * (1 - progress) / 2;
        const group = new THREE.Group();
        group.add(base, overlay);
        group.position.x = -i * (size + spacing);
        pantheonGroup.add(group);
    });
}

export function updateHud() {
    if (!uiGroup) return;
    const now = Date.now();

    const healthPct = Math.max(0, state.player.health) / state.player.maxHealth;
    healthFill.scale.x = healthPct;
    healthFill.material.color.set(healthPct > 0.6 ? 0x3498db : healthPct > 0.3 ? 0xf1c40f : 0xe74c3c);
    updateTextSprite(healthText, `${Math.max(0, Math.round(state.player.health))}/${Math.round(state.player.maxHealth)}`);

    const shieldEffect = state.player.statusEffects.find(e => e.name === 'Shield' || e.name === 'Contingency Protocol');
    shieldFill.scale.x = shieldEffect ? Math.max(0, (shieldEffect.endTime - now) / (shieldEffect.endTime - shieldEffect.startTime)) : 0;

    ascFill.scale.x = state.player.essence / state.player.essenceToNextLevel;
    updateTextSprite(ascText, `LVL ${state.player.level}`);
    updateTextSprite(apText, `AP: ${state.player.ascensionPoints}`);
    apText.position.x = AP_RIGHT_EDGE - apText.scale.x / 2;

    const updateSlot = (slot, key, isVisible) => {
        if (!slot) return;
        // The group stays in the scene graph so we can update hidden slots;
        // toggle the slot container itself based on unlocked/active state.
        slot.group.visible = isVisible;
        const emoji = key && powers[key] ? powers[key].emoji : '';
        // Refresh the sprite every frame so inventory changes while the HUD is
        // hidden are reflected once it becomes visible again.
        updateTextSprite(slot.sprite, emoji);
        // Sprite visibility is explicitly tied to power presence to avoid
        // leftover emojis lingering in empty slots.
        slot.sprite.visible = !!emoji;
    };

    updateSlot(offSlots[0], state.offensiveInventory[0], true);
    updateSlot(defSlots[0], state.defensiveInventory[0], true);
    updateSlot(offQueue[0], state.offensiveInventory[1], state.player.unlockedOffensiveSlots > 1);
    updateSlot(offQueue[1], state.offensiveInventory[2], state.player.unlockedOffensiveSlots > 2);
    updateSlot(defQueue[0], state.defensiveInventory[1], state.player.unlockedDefensiveSlots > 1);
    updateSlot(defQueue[1], state.defensiveInventory[2], state.player.unlockedDefensiveSlots > 2);

    renderStatusEffects(now);
    renderPantheonBuffs(now);

    const coreId = state.player.equippedAberrationCore;
    coreSocket.visible = state.player.level >= 10;
    if (coreSocket.visible) {
        const coreData = coreId ? bossData.find(b => b.id === coreId) : null;
        const color = coreData ? coreData.color : '#eaf2ff';
        updateTextSprite(coreIcon, coreData ? '' : '◎');
        coreIcon.material.color.set(color);

        let cooldownProgress = 0;
        if (coreId && coreData) {
            const coreState = state.player.talent_states.core_states[coreId];
            const cooldowns = {
                juggernaut: 8000,
                syphon: 5000,
                mirror_mirage: 12000,
                looper: 10000,
                gravity: 6000,
                architect: 15000,
                annihilator: 25000,
                puppeteer: 8000,
                helix_weaver: 5000,
                epoch_ender: 120000,
                splitter: 500,
            };
            const duration = cooldowns[coreId];
            if (duration && coreState && coreState.cooldownUntil && coreState.cooldownUntil > now) {
                const remaining = coreState.cooldownUntil - now;
                cooldownProgress = Math.max(0, remaining) / duration;
            }
        }
        coreCooldown.scale.y = cooldownProgress;
        coreCooldown.visible = !!coreId;
    }

    if (bossContainer) {
        const allBosses = state.enemies.filter(isBossEnemy);
        const sharedHealthIds = ['sentinel_pair', 'fractal_horror'];
        const renderedKeys = new Set();
        const bossesToDisplay = [];

        allBosses.forEach(boss => {
            const key = sharedHealthIds.includes(boss.id) ? boss.id : boss.instanceId;
            if (!renderedKeys.has(key)) {
                renderedKeys.add(key);
                bossesToDisplay.push({ boss, key });
            }
        });

        const activeKeys = new Set();
        const GRID_THRESHOLD = 4;
        const useGrid = bossesToDisplay.length >= GRID_THRESHOLD;
        let index = 0;
        bossesToDisplay.forEach(({ boss, key }) => {
            activeKeys.add(key);
            let bar = bossBars.get(key);
            if (!bar) {
                bar = createBossBar(boss);
                bossBars.set(key, bar);
                bossContainer.add(bar);
            }
            const cur = boss.id === 'fractal_horror' ? (state.fractalHorrorSharedHp ?? 0) : boss.health;
            const pct = Math.max(0, cur / boss.maxHP);
            bar.userData.fill.scale.x = pct;
            const color = getBossColor(boss);
            bar.userData.fill.material.color.set(color);
            updateTextSprite(bar.userData.label, boss.name);
            const col = useGrid ? index % 2 : 0;
            const row = useGrid ? Math.floor(index / 2) : index;
            const x = useGrid ? (col === 0 ? -0.15 : 0.15) : 0;
            const y = -row * 0.07;
            bar.position.set(x, y, 0);
            index++;
        });

        for (const [key, bar] of bossBars.entries()) {
            if (!activeKeys.has(key)) {
                bossContainer.remove(bar);
                bossBars.delete(key);
            }
        }
        bossContainer.visible = bossesToDisplay.length > 0;
    }
}

export function showUnlockNotification(text, subtext = '') {
    if (notificationTimeout) clearTimeout(notificationTimeout);
    while (notificationGroup.children.length) {
        const child = notificationGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material?.map) child.material.map.dispose();
        if (child.material) child.material.dispose();
        notificationGroup.remove(child);
    }

    const sprites = [];
    if (subtext) {
        sprites.push(createTextSprite(subtext, 32, '#ffffff'));
        sprites.push(createTextSprite(text, 48, '#00ffff'));
    } else {
        sprites.push(createTextSprite(text, 48, '#00ffff'));
    }

    const padding = 20 * SPRITE_SCALE;
    const spacing = 10 * SPRITE_SCALE;
    const totalTextHeight = sprites.reduce((h, s) => h + s.scale.y, 0) + (sprites.length - 1) * spacing;
    const height = totalTextHeight + padding * 2;
    const width = Math.max(...sprites.map(s => s.scale.x)) + padding * 2;

    const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        holoMaterial(0x141428, 0.85)
    );
    bg.renderOrder = 0;
    notificationGroup.add(bg);

    const border = new THREE.Mesh(
        new THREE.PlaneGeometry(width + 0.02, height + 0.02),
        holoMaterial(0x00ffff, 0.4)
    );
    border.position.z = 0.001;
    border.renderOrder = 1;
    notificationGroup.add(border);

    if (sprites.length === 2) {
        const h1 = sprites[0].scale.y;
        const h2 = sprites[1].scale.y;
        sprites[0].position.y = (h2 + spacing) / 2;
        sprites[1].position.y = -(h1 + spacing) / 2;
    } else {
        sprites[0].position.y = 0;
    }
    sprites.forEach(sprite => notificationGroup.add(sprite));

    notificationGroup.visible = true;
    notificationTimeout = setTimeout(() => {
        notificationGroup.visible = false;
    }, 3500);
}

export function showBossBanner(text) {
    showUnlockNotification(`🚨 ${text} 🚨`, 'Aberration Detected');
}

export function attachBossUI() {
    if (!bossContainer) return;
    const controller = getPrimaryController();
    if (controller && bossContainer.parent !== controller) {
        controller.add(bossContainer);
    }
}
