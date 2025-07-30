import { start as startVR } from './vrMain.js';
import * as THREE from './vendor/three.module.js';
import { getRenderer } from './modules/scene.js';

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
  const saveExists = !!localStorage.getItem('eternalMomentumSave');
  if (continueBtn) continueBtn.style.display = saveExists ? 'block' : 'none';
  if (eraseBtn) eraseBtn.style.display = saveExists ? 'block' : 'none';
}

async function startGame(resetSave = false) {
  if (resetSave) localStorage.removeItem('eternalMomentumSave');
  if (homeEl) {
    homeEl.classList.remove('visible');
    homeEl.addEventListener('transitionend', () => {
      homeEl.style.display = 'none';
    }, { once: true });
  }
  startVR();

  if (navigator.xr) {
    try {
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
  setTimeout(showHome, 500);
  startBtn?.addEventListener('click', () => startGame(true));
  continueBtn?.addEventListener('click', () => startGame(false));
  eraseBtn?.addEventListener('click', () => {
    localStorage.removeItem('eternalMomentumSave');
    window.location.reload();
  });
});
