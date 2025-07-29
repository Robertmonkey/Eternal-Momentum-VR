import { initScene, getRenderer, getScene, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';

let initialized = false;

export function start() {
  if (initialized) return;
  initScene(document.body);
  initPlayerController();
  initialized = true;
  getRenderer().setAnimationLoop(() => {
    updatePlayerController();
    getRenderer().render(getScene(), getCamera());
  });
}

export function stop() {
  if (!initialized) return;
  getRenderer().setAnimationLoop(null);
  initialized = false;
}
