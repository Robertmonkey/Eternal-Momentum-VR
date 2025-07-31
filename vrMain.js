import { initScene, getRenderer, getScene, getCamera } from './modules/scene.js';
import { initPlayerController, updatePlayerController } from './modules/PlayerController.js';
import { initUI, updateHud } from './modules/UIManager.js';
import { initModals, startStage } from './modules/ModalManager.js';
import { initVrGameLoop, updateVrGameLoop } from './modules/vrGameLoop.js';
import { initControllerMenu, updateControllerMenu } from './modules/ControllerMenu.js';
import { AudioManager } from './modules/audio.js';
import { loadPlayerState, state } from './modules/state.js';

let initialized = false;

export async function start(initialStage) {
  if (initialized) return;
  loadPlayerState();
  initScene(document.body);
  initPlayerController();
  initVrGameLoop();
  initUI();
  AudioManager.setSfxVolume(state.settings.sfxVolume / 100);
  AudioManager.setMusicVolume(state.settings.musicVolume / 100);
  AudioManager.setup(getCamera(), null);
  await initModals();
  initControllerMenu();
  startStage(
    typeof initialStage === 'number'
      ? initialStage
      : state.player.highestStageBeaten > 0
      ? state.player.highestStageBeaten + 1
      : 1
  );
  initialized = true;
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
