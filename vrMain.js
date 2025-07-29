import { initScene, getRenderer, getScene, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';

initScene(document.body);
initPlayerController();

function render() {
  getRenderer().setAnimationLoop(() => {
    updatePlayerController();
    getRenderer().render(getScene(), getCamera());
  });
}

render();
