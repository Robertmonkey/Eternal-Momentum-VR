import { start as startVR } from './vrMain.js';

const loadingEl = document.getElementById('loadingScreen');
const homeEl = document.getElementById('homeScreen');
const startBtn = document.getElementById('startVrBtn');
const continueBtn = document.getElementById('continueVrBtn');
const eraseBtn = document.getElementById('eraseVrBtn');

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

window.addEventListener('load', () => {
  showLoading();
  setTimeout(showHome, 500);
  startBtn?.addEventListener('click', () => startGame(true));
  continueBtn?.addEventListener('click', () => startGame(false));
  eraseBtn?.addEventListener('click', () => {
    localStorage.removeItem('eternalMomentumSave');
    window.location.reload();
  });
});
