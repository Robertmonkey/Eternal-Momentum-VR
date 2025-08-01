import * as THREE from '../vendor/three.module.js';
import { getCamera } from './scene.js';
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

let bgTexture = null;
export function getBgTexture() {
  if (!bgTexture) {
    const manager = new AssetManager();
    bgTexture = manager.getTexture('assets/bg.png');
  }
  return bgTexture;
}

export function holoMaterial(color = 0x141428, opacity = 0.85) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthTest: false
  });
}

export function createTextSprite(text, size = 32, color = '#eaf2ff') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontStack = "'Segoe UI','Roboto',sans-serif";
    ctx.font = `${size}px ${fontStack}`;
    const padding = size * 0.2;
    const width = Math.ceil(ctx.measureText(text).width) + padding;
    canvas.width = width;
    canvas.height = size * 1.2;
    ctx.font = `${size}px ${fontStack}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    const scale = 0.001;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    sprite.userData = { text, canvas, ctx, font: `${size}px ${fontStack}` }; // Cache the text
    return sprite;
}

export function updateTextSprite(sprite, newText) {
    if (!sprite || !sprite.userData || sprite.userData.text === newText) return; // Don't update if text is the same
    
    sprite.userData.text = newText;
    const { ctx, canvas, font } = sprite.userData;
    if (!ctx || !canvas) return;
    ctx.font = font;
    const padding = parseInt(font, 10) * 0.2;
    canvas.width = Math.max(1, Math.ceil(ctx.measureText(newText).width) + padding);
    ctx.font = font;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = sprite.material.color.getStyle();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(newText, canvas.width / 2, canvas.height / 2);
    sprite.material.map.needsUpdate = true;
    const scale = 0.001;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
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
    const sprite = createTextSprite('', size * (isMain ? 1.2 : 1) * 20);
    sprite.position.z = 0.001;
    group.add(mesh, border, sprite);
    return { group, sprite };
}

function createHudElements() {
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

    ascFill = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.02), holoMaterial(0x00ffff));
    ascFill.position.set(-0.35, -0.1, 0.002);
    ascText = createTextSprite('LVL 1', 20);
    ascText.position.set(-0.35, -0.1, 0.003);
    const ascGroup = new THREE.Group();
    ascGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.04), holoMaterial(0x111122, 0.8)));
    ascGroup.add(ascFill, ascText);
    ascGroup.position.set(0.45, -0.02, 0);
    hudMesh.add(ascGroup);
    
    apText = createTextSprite('AP: 0', 24, '#00ffff');
    apText.position.set(0.45, 0.03, 0.001);
    hudMesh.add(apText);

    statusGroup = new THREE.Group();
    statusGroup.position.set(-0.2, 0.12, 0.01);
    hudMesh.add(statusGroup);
    pantheonGroup = new THREE.Group();
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
    notificationGroup = new THREE.Group();
    notificationGroup.position.set(0, 0.3, -1.5);
    uiGroup.add(notificationGroup);
}

export function showHud() { if (uiGroup) uiGroup.visible = true; }
export function getUIRoot() { return uiGroup; }

export function updateHud() {
    if (!uiGroup || !uiGroup.visible) return;
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

    const updateSlot = (slot, key, isVisible) => {
        if (!slot) return;
        slot.group.visible = isVisible;
        if (isVisible) {
            updateTextSprite(slot.sprite, key ? powers[key].emoji : '');
        }
    };

    updateSlot(offSlots[0], state.offensiveInventory[0], true);
    updateSlot(defSlots[0], state.defensiveInventory[0], true);
    updateSlot(offQueue[0], state.offensiveInventory[1], state.player.unlockedOffensiveSlots > 1);
    updateSlot(offQueue[1], state.offensiveInventory[2], state.player.unlockedOffensiveSlots > 2);
    updateSlot(defQueue[0], state.defensiveInventory[1], state.player.unlockedDefensiveSlots > 1);
    updateSlot(defQueue[1], state.defensiveInventory[2], state.player.unlockedDefensiveSlots > 2);

    const coreId = state.player.equippedAberrationCore;
    coreSocket.visible = state.player.level >= 10;
    if (coreSocket.visible) {
        const coreData = coreId ? bossData.find(b => b.id === coreId) : null;
        const color = coreData ? coreData.color : '#eaf2ff';
        updateTextSprite(coreIcon, coreData ? '' : '◎');
        coreIcon.material.color.set(color);
    }
}

export function showUnlockNotification(text, subtext = '') {
    if (notificationTimeout) clearTimeout(notificationTimeout);
    while (notificationGroup.children.length) {
        const child = notificationGroup.children[0];
        if (child.material.map) child.material.map.dispose();
        if (child.material) child.material.dispose();
        notificationGroup.remove(child);
    }
    if (subtext) {
        const titleSprite = createTextSprite(subtext, 32, '#ffffff');
        titleSprite.position.y = 0.03;
        notificationGroup.add(titleSprite);
        const textSprite = createTextSprite(text, 48, '#00ffff');
        textSprite.position.y = -0.03;
        notificationGroup.add(textSprite);
    } else {
        const textSprite = createTextSprite(text, 48, '#00ffff');
        notificationGroup.add(textSprite);
    }
    notificationGroup.visible = true;
    notificationTimeout = setTimeout(() => {
        notificationGroup.visible = false;
    }, 3500);
}

export function showBossBanner(text) {
    showUnlockNotification(`🚨 ${text} 🚨`, 'Aberration Detected');
}
