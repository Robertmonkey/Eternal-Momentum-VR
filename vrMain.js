import { initScene, getRenderer, getScene, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud } from './modules/UIManager.js';
import { initModals } from './modules/ModalManager.js';

let initialized = false;

export function start() {
  if (initialized) return;
  initScene(document.body);
  initPlayerController();
  initUI();
  initModals();
  initialized = true;
  // Show level select on first launch as placeholder
  import('./modules/ModalManager.js').then(m => m.showModal('levelSelect'));
  getRenderer().setAnimationLoop(() => {
    updatePlayerController();
    updateHud();
    getRenderer().render(getScene(), getCamera());
  });
}

export function stop() {
  if (!initialized) return;
  getRenderer().setAnimationLoop(null);
  initialized = false;
}
