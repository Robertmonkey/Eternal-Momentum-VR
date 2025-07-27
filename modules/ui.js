// modules/ui.js
import { state, savePlayerState } from './state.js';
import { powers } from './powers.js';
import { bossData } from './bosses.js';
import { STAGE_CONFIG } from './config.js';
import { getBossesForStage } from './gameLoop.js';
import { AudioManager } from './audio.js';

const ascensionFill = document.getElementById('ascension-bar-fill');
const ascensionText = document.getElementById('ascension-bar-text');
const apDisplay = document.getElementById('ascension-points-display');
const healthBarValue = document.getElementById('health-bar-value');
const healthBarText = document.getElementById('health-bar-text');
const shieldBar = document.getElementById('shield-bar-overlay');
const offSlot = document.getElementById('slot-off-0');
const defSlot = document.getElementById('slot-def-0');
const bossContainer = document.getElementById("bossHpContainer");
const statusBar = document.getElementById('status-effects-bar');
const pantheonBar = document.getElementById('pantheon-buffs-bar');
const bossBannerEl = document.getElementById("bossBanner");
const levelSelectList = document.getElementById("level-select-list");
const notificationBanner = document.getElementById('unlock-notification');
const customConfirm = document.getElementById('custom-confirm');
const confirmTitle = document.getElementById('custom-confirm-title');
const confirmText = document.getElementById('custom-confirm-text');
const confirmYesBtn = document.getElementById('confirm-yes');
const confirmNoBtn = document.getElementById('confirm-no');

const bossInfoModal = document.getElementById('bossInfoModal');
const bossInfoTitle = document.getElementById('bossInfoModalTitle');
const bossInfoContent = document.getElementById('bossInfoModalContent');
const closeBossInfoBtn = document.getElementById('closeBossInfoModalBtn');

const aberrationCoreSocket = document.getElementById('aberration-core-socket');
const aberrationCoreIcon = document.getElementById('aberration-core-icon');
const aberrationCoreListContainer = document.getElementById('aberration-core-list-container');
const equippedCoreNameEl = document.getElementById('aberration-core-equipped-name');

function updatePantheonUI() {
    if (!pantheonBar) return;
    const now = Date.now();
    const buffs = state.player.activePantheonBuffs;

    pantheonBar.classList.toggle('visible', buffs.length > 0);
    pantheonBar.innerHTML = '';

    buffs.forEach(buff => {
        const coreData = bossData.find(b => b.id === buff.coreId);
        if (!coreData) return;

        const remaining = (buff.endTime - now) / 1000;
        
        const iconEl = document.createElement('div');
        iconEl.className = 'pantheon-buff-icon';
        iconEl.setAttribute('data-tooltip-text', `${coreData.name} (${remaining.toFixed(1)}s)`);

        const innerIcon = document.createElement('div');
        innerIcon.className = 'pantheon-buff-inner-icon';
        if (coreData.id === 'pantheon') {
            innerIcon.classList.add('pantheon-icon-bg');
        } else {
            innerIcon.style.backgroundColor = coreData.color;
        }

        iconEl.appendChild(innerIcon);
        pantheonBar.appendChild(iconEl);
    });
}

function updateStatusEffectsUI() {
    const now = Date.now();
    state.player.statusEffects = state.player.statusEffects.filter(effect => now < effect.endTime);
    
    statusBar.classList.toggle('visible', state.player.statusEffects.length > 0);
    statusBar.innerHTML = '';

    state.player.statusEffects.forEach(effect => {
        const remaining = effect.endTime - now;
        const duration = effect.endTime - effect.startTime;
        const progress = Math.max(0, remaining) / duration;
        const iconEl = document.createElement('div');
        iconEl.className = 'status-icon';
        iconEl.setAttribute('data-tooltip-text', `${effect.name} (${(remaining / 1000).toFixed(1)}s)`);
        const emojiEl = document.createElement('span');
        emojiEl.innerText = effect.emoji;
        const overlayEl = document.createElement('div');
        overlayEl.className = 'cooldown-overlay';
        overlayEl.style.transform = `scaleY(${1 - progress})`;
        iconEl.appendChild(emojiEl);
        iconEl.appendChild(overlayEl);
        statusBar.appendChild(iconEl);
    });
}

function updateCoreCooldownUI() {
    const coreId = state.player.equippedAberrationCore;
    const cooldownOverlay = document.getElementById('aberration-core-cooldown');

    if (!coreId || !cooldownOverlay) {
        if (cooldownOverlay) cooldownOverlay.style.transform = 'scaleY(0)'; // Set to empty if no core
        return;
    }

    const coreState = state.player.talent_states.core_states[coreId];
    if (!coreState || !coreState.cooldownUntil || Date.now() >= coreState.cooldownUntil) {
        cooldownOverlay.style.transform = 'scaleY(0)'; // Ready to use
        return;
    }
    
    // This map must contain the cooldown duration for any core ability that sets 'cooldownUntil'
    const cooldowns = { 
        juggernaut: 8000, 
        syphon: 5000,
        mirror_mirage: 12000,
        looper: 10000,
        gravity: 6000,
        architect: 15000,
        annihilator: 25000,
        // Passive cores can have cooldowns too
        puppeteer: 8000,
        helix_weaver: 5000,
        epoch_ender: 120000,
        splitter: 500
    };
    const duration = cooldowns[coreId];
    if(!duration) {
         cooldownOverlay.style.transform = 'scaleY(0)'; // No defined cooldown, so it's ready
         return;
    }
    
    // Calculate progress based on when the cooldown will end vs. its total duration
    const remainingTime = coreState.cooldownUntil - Date.now();
    const progress = Math.max(0, remainingTime) / duration;
    
    cooldownOverlay.style.transform = `scaleY(${progress})`; // Fills up as it cools down
}


function updateAberrationCoreUI() {
    if (!aberrationCoreSocket) return;

    if (state.player.level >= 10) {
        aberrationCoreSocket.classList.add('unlocked');
    } else {
        aberrationCoreSocket.classList.remove('unlocked');
        return;
    }

    const equippedCoreId = state.player.equippedAberrationCore;
    const coreData = equippedCoreId ? bossData.find(b => b.id === equippedCoreId) : null;

    if (coreData) {
        aberrationCoreSocket.classList.add('active');
        aberrationCoreSocket.style.setProperty('--nexus-glow', coreData.color);
        aberrationCoreIcon.style.backgroundColor = 'transparent';
        if (!document.getElementById('aberration-core-cooldown')) {
             aberrationCoreIcon.innerHTML = `<div id="aberration-core-cooldown" class="cooldown-overlay"></div>`;
        }
        aberrationCoreSocket.setAttribute('data-tooltip-text', `Core Attuned: ${coreData.name}`);
        
        if(coreData.id === 'pantheon') {
            aberrationCoreIcon.classList.add('pantheon-icon-bg');
        } else {
            aberrationCoreIcon.classList.remove('pantheon-icon-bg');
        }
    } else {
        aberrationCoreSocket.classList.remove('active');
        aberrationCoreSocket.style.setProperty('--nexus-glow', 'var(--nexus-glow)'); // Reset to default CSS variable
        aberrationCoreIcon.style.backgroundColor = 'transparent';
        if (aberrationCoreIcon.firstChild?.id !== 'aberration-core-cooldown') {
            aberrationCoreIcon.innerHTML = `<div id="aberration-core-cooldown" class="cooldown-overlay"></div>◎`;
        } else {
             aberrationCoreIcon.innerHTML = document.getElementById('aberration-core-cooldown').outerHTML + '◎';
        }
        aberrationCoreSocket.setAttribute('data-tooltip-text', 'No Core Attuned');
        aberrationCoreIcon.classList.remove('pantheon-icon-bg');
    }
}


export function updateUI() {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    document.querySelectorAll('.ability-key').forEach(el => { el.style.display = isTouchDevice ? 'none' : 'block'; });

    ascensionFill.style.width = `${(state.player.essence / state.player.essenceToNextLevel) * 100}%`;
    ascensionText.innerText = `LVL ${state.player.level}`;
    apDisplay.innerText = `AP: ${state.player.ascensionPoints}`;
    
    updateAberrationCoreUI(); 
    updateCoreCooldownUI();

    const healthPct = Math.max(0, state.player.health) / state.player.maxHealth;
    healthBarValue.style.width = `${healthPct * 100}%`;
    healthBarText.innerText = `${Math.max(0, Math.round(state.player.health))}/${Math.round(state.player.maxHealth)}`;
    healthBarValue.classList.toggle('health-high', healthPct > 0.6);
    healthBarValue.classList.toggle('health-medium', healthPct <= 0.6 && healthPct > 0.3);
    healthBarValue.classList.toggle('health-low', healthPct <= 0.3);
    
    const shieldEffect = state.player.statusEffects.find(e => e.name === 'Shield' || e.name === 'Contingency Protocol');
    if (shieldEffect) {
        const now = Date.now();
        const remaining = shieldEffect.endTime - now;
        const duration = shieldEffect.endTime - shieldEffect.startTime;
        shieldBar.style.width = `${Math.max(0, remaining) / duration * 100}%`;
    } else {
        shieldBar.style.width = '0%';
    }
    
    const offP = state.offensiveInventory[0];
    const defP = state.defensiveInventory[0];
    offSlot.innerHTML = offP ? powers[offP].emoji : '';
    defSlot.innerHTML = defP ? powers[defP].emoji : '';
    offSlot.className = `ability-slot main ${offP ? '' : 'empty'}`;
    defSlot.className = `ability-slot ${defP ? '' : 'empty'}`;
    offSlot.setAttribute('data-tooltip-text', offP ? powers[offP].desc : 'Offensive Power (Left-Click)');
    defSlot.setAttribute('data-tooltip-text', defP ? powers[defP].desc : 'Defensive Power (Right-Click)');

    for (let i = 1; i <= 2; i++) {
        const offPower = state.offensiveInventory[i];
        const defPower = state.defensiveInventory[i];
        const qOffSlot = document.getElementById(`q-off-${i}`);
        const qDefSlot = document.getElementById(`q-def-${i}`);
        
        if (qOffSlot) {
            const isOffSlotVisible = (i < state.player.unlockedOffensiveSlots) && offPower;
            qOffSlot.classList.toggle('visible', isOffSlotVisible);
            qOffSlot.innerHTML = offPower ? powers[offPower].emoji : '';
            qOffSlot.setAttribute('data-tooltip-text', offPower ? powers[offPower].desc : '');
        }

        if (qDefSlot) {
            const isDefSlotVisible = (i < state.player.unlockedDefensiveSlots) && defPower;
            qDefSlot.classList.toggle('visible', isDefSlotVisible);
            qDefSlot.innerHTML = defPower ? powers[defPower].emoji : '';
            qDefSlot.setAttribute('data-tooltip-text', defPower ? powers[defPower].desc : '');
        }
    }

    const allBosses = state.enemies.filter(e => e.boss);
    const renderedBossTypes = new Set();
    const bossesToDisplay = [];
    const currentBossIdsOnScreen = new Set();

    allBosses.forEach(boss => {
        currentBossIdsOnScreen.add(boss.instanceId.toString());
        const sharedHealthIds = ['sentinel_pair', 'fractal_horror'];
        if (sharedHealthIds.includes(boss.id)) {
            if (!renderedBossTypes.has(boss.id)) {
                bossesToDisplay.push(boss);
                renderedBossTypes.add(boss.id);
            }
        } else {
            bossesToDisplay.push(boss);
        }
    });

    for (const child of Array.from(bossContainer.children)) {
        if (!currentBossIdsOnScreen.has(child.dataset.instanceId)) {
            bossContainer.removeChild(child);
        }
    }
    
    const GRID_THRESHOLD = 4;
    bossContainer.classList.toggle('grid-layout', bossesToDisplay.length >= GRID_THRESHOLD);

    bossesToDisplay.forEach(boss => {
        let wrapper = document.getElementById('boss-hp-' + boss.instanceId);
        
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'boss-hp-bar-wrapper';
            wrapper.id = 'boss-hp-' + boss.instanceId;
            wrapper.dataset.instanceId = boss.instanceId.toString();

            const label = document.createElement('div');
            label.className = 'boss-hp-label';
            label.innerText = boss.name;
            
            const bar = document.createElement('div');
            bar.className = 'boss-hp-bar';
            
            wrapper.appendChild(label);
            wrapper.appendChild(bar);
            bossContainer.appendChild(wrapper);
        }

        const bar = wrapper.querySelector('.boss-hp-bar');
        const currentHp = boss.id === 'fractal_horror' ? (state.fractalHorrorSharedHp ?? 0) : boss.hp;
        bar.style.backgroundColor = boss.color;
        bar.style.width = `${Math.max(0, currentHp / boss.maxHP) * 100}%`;
    });
    
    updateStatusEffectsUI();
    updatePantheonUI();
}

export function showBossInfo(bossIds, type) {
    let title = '';
    let content = '';

    const bosses = bossIds.map(id => bossData.find(b => b.id === id)).filter(b => b);

    if (bosses.length === 0) return;

    if (bosses.length > 1) {
        title = bosses.map(b => b.name).join(' & ');
    } else {
        title = bosses[0].name;
    }

    if (type === 'lore') {
        title += ' - Lore ℹ️';
        content = bosses.map(b => `<h3>${b.name}</h3><p>${b.lore}</p>`).join('<hr style="border-color: rgba(255,255,255,0.2); margin: 15px 0;">');
    } else {
        title += ' - Mechanics ❔';
        content = bosses.map(b => `<h3>${b.name}</h3><p>${b.mechanics_desc}</p>`).join('<hr style="border-color: rgba(255,255,255,0.2); margin: 15px 0;">');
    }

    bossInfoTitle.innerHTML = title;
    bossInfoContent.innerHTML = content;
    bossInfoModal.style.display = 'flex';
    AudioManager.playSfx('uiModalOpen');
}

closeBossInfoBtn.addEventListener('click', () => {
    bossInfoModal.style.display = 'none';
    AudioManager.playSfx('uiModalClose');
});


export function showBossBanner(boss){ 
    bossBannerEl.innerText="🚨 "+boss.name+" 🚨"; 
    bossBannerEl.style.opacity=1; 
    setTimeout(()=>bossBannerEl.style.opacity=0,2500); 
}

export function showUnlockNotification(text, subtext = '') {
    let content = `<span class="unlock-name">${text}</span>`;
    if (subtext) {
        content = `<span class="unlock-title">${subtext}</span>` + content;
    }
    notificationBanner.innerHTML = content;
    notificationBanner.classList.add('show');
    setTimeout(() => {
        notificationBanner.classList.remove('show');
    }, 3500);
}

export function populateLevelSelect(startSpecificLevel) {
    if (!levelSelectList) return;
    levelSelectList.innerHTML = '';

    const maxStage = state.player.highestStageBeaten + 1;

    for (let i = 1; i <= maxStage; i++) {
        const bossIds = getBossesForStage(i);
        if (!bossIds || bossIds.length === 0) continue;
        
        let bossNames = bossIds.map(id => {
            const boss = bossData.find(b => b.id === id);
            return boss ? boss.name : 'Unknown';
        }).join(' & ');
        
        const item = document.createElement('div');
        item.className = 'stage-select-item';
        
        item.innerHTML = `
            <div class="stage-item-main">
                <span class="stage-select-number">STAGE ${i}</span>
                <span class="stage-select-bosses">${bossNames}</span>
            </div>
            <div class="stage-item-actions">
                <button class="info-btn mechanics-btn" title="Mechanics">❔</button>
                <button class="info-btn lore-btn" title="Lore">ℹ️</button>
            </div>
        `;
        
        item.querySelector('.stage-item-main').onclick = () => {
            startSpecificLevel(i);
        };

        item.querySelector('.mechanics-btn').onclick = (e) => {
            e.stopPropagation();
            showBossInfo(bossIds, 'mechanics');
        };

        item.querySelector('.lore-btn').onclick = (e) => {
            e.stopPropagation();
            showBossInfo(bossIds, 'lore');
        };

        const bossNameElement = item.querySelector('.stage-select-bosses');
        item.addEventListener('mouseenter', () => {
            if (bossNameElement.scrollWidth > bossNameElement.clientWidth) {
                bossNameElement.classList.add('is-scrolling');
            }
        });
        item.addEventListener('mouseleave', () => {
            bossNameElement.classList.remove('is-scrolling');
        });

        levelSelectList.appendChild(item);
    }
    levelSelectList.parentElement.scrollTop = levelSelectList.parentElement.scrollHeight;
}

export function showCustomConfirm(title, text, onConfirm) {
    confirmTitle.innerText = title;
    confirmText.innerText = text;

    const close = () => {
        customConfirm.style.display = 'none';
        confirmYesBtn.removeEventListener('click', handleYes);
        confirmNoBtn.removeEventListener('click', handleNo);
    }

    const handleYes = () => {
        onConfirm();
        close();
    }

    const handleNo = () => {
        close();
    }

    confirmYesBtn.addEventListener('click', handleYes);
    confirmNoBtn.addEventListener('click', handleNo);

    customConfirm.style.display = 'flex';
}

export function populateAberrationCoreMenu(onEquip) {
    if (!aberrationCoreListContainer) return;
    aberrationCoreListContainer.innerHTML = '';

    const equippedCoreId = state.player.equippedAberrationCore;
    const equippedCoreData = equippedCoreId ? bossData.find(b => b.id === equippedCoreId) : null;
    equippedCoreNameEl.innerText = equippedCoreData ? equippedCoreData.name : 'None';
    if(equippedCoreData?.color) equippedCoreNameEl.style.color = equippedCoreData.color;
    else equippedCoreNameEl.style.color = 'var(--nexus-glow)';


    bossData.forEach(core => {
        if (!core.core_desc) return;

        let isUnlocked = state.player.unlockedAberrationCores.has(core.id);
        if (!isUnlocked && state.player.level >= core.unlock_level) {
            state.player.unlockedAberrationCores.add(core.id);
            savePlayerState(); 
            isUnlocked = true;
        }
        
        const isEquipped = state.player.equippedAberrationCore === core.id;

        const item = document.createElement('div');
        item.className = 'aberration-core-item';
        if (!isUnlocked) item.classList.add('locked');
        if (isEquipped) item.classList.add('equipped');

        const iconClass = core.id === 'pantheon' ? 'core-item-icon pantheon-icon-bg' : 'core-item-icon';
        const iconStyle = core.id === 'pantheon' ? '' : `background-color: ${core.color};`;

        const coresWithActiveAbility = new Set(['juggernaut', 'syphon', 'gravity', 'architect', 'annihilator', 'looper']);
        let coreDescHtml = isUnlocked ? core.core_desc : '????????????????';

        if (isUnlocked && coresWithActiveAbility.has(core.id)) {
            coreDescHtml += `<div class="core-active-ability-indicator">Core Power: [LMB+RMB]</div>`;
        }

        item.innerHTML = `
            <div class="${iconClass}" style="${iconStyle}"></div>
            <div class="core-item-details">
                <div class="core-item-name">${isUnlocked ? core.name : 'LOCKED // LEVEL ' + core.unlock_level}</div>
                <div class="core-item-desc">${coreDescHtml}</div>
            </div>
        `;
        
        if (isUnlocked) {
            item.onclick = () => onEquip(core.id);
        }

        aberrationCoreListContainer.appendChild(item);
    });
}


export function populateOrreryMenu(onStart) {
    let totalEchoes = 0;
    if (state.player.highestStageBeaten >= 30) {
        totalEchoes += 10;
        totalEchoes += (state.player.highestStageBeaten - 30);
        if (state.player.highestStageBeaten >= 50) totalEchoes += 15;
        if (state.player.highestStageBeaten >= 70) totalEchoes += 20;
        if (state.player.highestStageBeaten >= 90) totalEchoes += 25;
    }

    const pointsDisplay = document.getElementById('orrery-points-total');
    const bossListContainer = document.getElementById('orrery-boss-list-container');
    const selectionContainer = document.getElementById('orrery-selection-display');
    const costDisplay = document.getElementById('orrery-current-cost');
    const startBtn = document.getElementById('orrery-start-btn');
    const resetBtn = document.getElementById('orrery-reset-btn');
    
    let selectedBosses = [];
    let currentCost = 0;

    const costs = { 1: 2, 2: 5, 3: 8 };

    function render() {
        pointsDisplay.innerText = totalEchoes - currentCost;
        bossListContainer.innerHTML = '';
        selectionContainer.innerHTML = '';

        const availableBosses = bossData.filter(b => b.difficulty_tier).sort((a,b) => a.difficulty_tier - b.difficulty_tier);
        
        availableBosses.forEach(boss => {
            const cost = costs[boss.difficulty_tier];
            const item = document.createElement('div');
            item.className = 'orrery-boss-item';
            
            const canAfford = (totalEchoes - currentCost) >= cost;
            item.classList.toggle('disabled', !canAfford);

            const isPantheon = boss.id === 'pantheon';
            const iconStyle = isPantheon ? '' : `background-color: ${boss.color};`;
            const iconClass = isPantheon ? 'orrery-boss-icon pantheon-icon-bg' : 'orrery-boss-icon';

            item.innerHTML = `
                <div class="orrery-boss-info">
                    <span class="${iconClass}" style="${iconStyle}"></span>
                    <span class="orrery-boss-name">${boss.name}</span>
                </div>
                <div class="stage-item-actions">
                     <button class="info-btn mechanics-btn" title="Mechanics">❔</button>
                     <button class="info-btn lore-btn" title="Lore">ℹ️</button>
                     <span class="orrery-boss-cost">${cost}</span>
                </div>
            `;
            
            item.querySelector('.orrery-boss-info').onclick = () => {
                 if (canAfford) {
                    AudioManager.playSfx('talentPurchase');
                    selectedBosses.push(boss.id);
                    currentCost += cost;
                    render();
                } else {
                    AudioManager.playSfx('talentError');
                }
            };

            item.querySelector('.mechanics-btn').onclick = (e) => {
                e.stopPropagation();
                showBossInfo([boss.id], 'mechanics');
            };
            item.querySelector('.lore-btn').onclick = (e) => {
                e.stopPropagation();
                showBossInfo([boss.id], 'lore');
            };

            bossListContainer.appendChild(item);
        });

        selectedBosses.forEach((bossId, index) => {
            const boss = bossData.find(b => b.id === bossId);
            const item = document.createElement('div');
            item.className = 'orrery-selected-boss';

            if (boss.id === 'pantheon') {
                item.classList.add('pantheon-icon-bg');
            } else {
                item.style.backgroundColor = boss.color;
            }
            
            item.title = boss.name;

            item.onclick = () => {
                AudioManager.playSfx('uiClickSound');
                selectedBosses.splice(index, 1);
                currentCost -= costs[boss.difficulty_tier];
                render();
            };
            selectionContainer.appendChild(item);
        });

        costDisplay.innerText = currentCost;
        if (selectedBosses.length > 0) {
            startBtn.classList.remove('disabled');
            startBtn.onclick = () => onStart(selectedBosses);
        } else {
            startBtn.classList.add('disabled');
            startBtn.onclick = null;
        }
    }

    resetBtn.onclick = () => {
        AudioManager.playSfx('uiClickSound');
        selectedBosses = [];
        currentCost = 0;
        render();
    };

    render();
}
