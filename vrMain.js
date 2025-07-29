import { initScene, getRenderer, getScene, getCamera } from './modules/scene.js';

initScene(document.body);

function render() {
  getRenderer().setAnimationLoop(() => {
    getRenderer().render(getScene(), getCamera());
  });
}

render();
