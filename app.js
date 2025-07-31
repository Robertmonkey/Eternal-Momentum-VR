import { start as startVR, stop as stopVR } from './vrMain.js';
import * as THREE from './vendor/three.module.js';
import { getRenderer } from './modules/scene.js';
import { showHud } from './modules/UIManager.js';

const loadingEl = document.getElementById('loadingScreen');
const homeEl = document.getElementById('homeScreen');
const startBtn = document.getElementById('startVrBtn');
const continueBtn = document.getElementById('continueVrBtn');
const eraseBtn = document.getElementById('eraseVrBtn');

const assetsToLoad = ['assets/bg.png'];

function preloadAssets() {
  const fill = document.getElementById('loadingProgressFill');
  const status = document.getElementById('loadingStatusText');
  return new Promise(resolve => {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      const pct = Math.round((loaded / total) * 100);
      if (fill) fill.style.width = pct + '%';
      if (status) status.textContent = `Loading ${pct}%`;
    };
    manager.onLoad = () => {
      if (status) status.textContent = 'Loading Complete';
      resolve();
    };
    const texLoader = new THREE.TextureLoader(manager);
    assetsToLoad.forEach(src => {
      if (src.endsWith('.mp3')) {
        const audio = new Audio();
        audio.src = src;
        audio.addEventListener('canplaythrough', () => manager.itemEnd(src), { once: true });
        manager.itemStart(src);
      } else {
        texLoader.load(src, () => {});
      }
    });
});
}

export { preloadAssets, showHome, startGame };

function showLoading() {
  if (loadingEl) loadingEl.style.display = 'flex';
  if (homeEl) homeEl.style.display = 'none';
}

function showHome() {
  if (loadingEl) loadingEl.style.display = 'none';
  if (homeEl) {
    homeEl.style.display = 'flex';
    requestAnimationFrame(() => homeEl.classList.add('visible'));
  }
  stopVR();
  if (typeof window !== 'undefined' && window.showHomeMenu) {
    window.showHomeMenu();
  }
  const saveExists = !!localStorage.getItem('eternalMomentumSave');
  if (continueBtn) continueBtn.style.display = saveExists ? 'block' : 'none';
  if (eraseBtn) eraseBtn.style.display = saveExists ? 'block' : 'none';
  if (startBtn) startBtn.style.display = saveExists ? 'none' : 'block';
}

if (typeof window !== 'undefined') {
  window.showHome = showHome;
  window.startGame = startGame;
}

async function startGame(resetSave = false) {
  if (resetSave) localStorage.removeItem('eternalMomentumSave');
  if (homeEl) {
    homeEl.classList.remove('visible');
    homeEl.addEventListener('transitionend', () => {
      homeEl.style.display = 'none';
    }, { once: true });
  }
  const saved = localStorage.getItem('eternalMomentumSave');
  let stage = 1;
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (typeof data.highestStageBeaten === 'number' && data.highestStageBeaten > 0) {
        stage = data.highestStageBeaten + 1;
      }
    } catch(e) {}
  }
  await startVR(stage);
  showHud();

  if (navigator.xr && navigator.xr.isSessionSupported) {
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      if (!supported) {
        console.warn('WebXR immersive-vr session not supported');
        return;
      }
      const sessionInit = { optionalFeatures: ['local-floor', 'bounded-floor'] };
      const session = await navigator.xr.requestSession('immersive-vr', sessionInit);
      getRenderer().xr.setSession(session);
    } catch (err) {
      console.warn('Unable to start WebXR session', err);
    }
  }
}

window.addEventListener('load', async () => {
  showLoading();
  await preloadAssets();
  await startGame(false);
  if (typeof window !== 'undefined' && window.showHomeMenu) {
    window.showHomeMenu();
  }
  startBtn?.addEventListener('click', () => startGame(true));
  continueBtn?.addEventListener('click', () => startGame(false));
  eraseBtn?.addEventListener('click', () => {
    localStorage.removeItem('eternalMomentumSave');
    window.location.reload();
  });
});
