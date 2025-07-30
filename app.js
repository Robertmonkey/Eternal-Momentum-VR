import { start as startVR } from './vrMain.js';

const loadingEl = document.getElementById('loadingScreen');
const homeEl = document.getElementById('homeScreen');
const startBtn = document.getElementById('startVrBtn');
const continueBtn = document.getElementById('continueVrBtn');
const eraseBtn = document.getElementById('eraseVrBtn');

const assetsToLoad = ['assets/bg.png'];

function preloadAssets() {
  const fill = document.getElementById('loadingProgressFill');
  const status = document.getElementById('loadingStatusText');
  let loaded = 0;
  const total = assetsToLoad.length;

  const update = () => {
    const pct = Math.round((loaded / total) * 100);
    if (fill) fill.style.width = pct + '%';
    if (status) status.textContent = `Loading ${pct}%`;
  };

  update();
  return Promise.all(assetsToLoad.map(src => new Promise(res => {
    if (src.endsWith('.mp3')) {
      const a = new Audio();
      a.src = src;
      a.addEventListener('canplaythrough', () => { loaded++; update(); res(); });
    } else {
      const img = new Image();
      img.src = src;
      img.addEventListener('load', () => { loaded++; update(); res(); });
    }
  }))).then(() => {
    if (status) status.textContent = 'Loading Complete';
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

function startGame(resetSave = false) {
  if (resetSave) localStorage.removeItem('eternalMomentumSave');
  if (homeEl) {
    homeEl.classList.remove('visible');
    homeEl.addEventListener('transitionend', () => {
      homeEl.style.display = 'none';
    }, { once: true });
  }
  startVR();
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
