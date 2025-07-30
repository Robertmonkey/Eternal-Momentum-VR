import { initScene, getRenderer, getScene, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud } from './modules/UIManager.js';
import { initModals } from './modules/ModalManager.js';
import { initVrGameLoop, updateVrGameLoop } from './modules/vrGameLoop.js';
import { initControllerMenu, updateControllerMenu } from './modules/ControllerMenu.js';
import { AudioManager } from './modules/audio.js';

let initialized = false;

export async function start() {
  if (initialized) return;
  initScene(document.body);
  initPlayerController();
  initVrGameLoop();
  initUI();
  AudioManager.setup(getCamera(), null);
  await initModals();
  initControllerMenu();
  initialized = true;
  // Show level select on first launch as placeholder
  import('./modules/ModalManager.js').then(m => m.showModal('levelSelect'));
  getRenderer().setAnimationLoop(() => {
    updatePlayerController();
    updateVrGameLoop();
    updateControllerMenu();
    updateHud();
    getRenderer().render(getScene(), getCamera());
  });
}

export function stop() {
  if (!initialized) return;
  getRenderer().setAnimationLoop(null);
  initialized = false;
}
