import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';

// Verify that initPlayerController only keeps a single avatar instance even
// when called multiple times.
test('initPlayerController resets previous avatar meshes', async () => {
  mock.reset();

  const scene = new THREE.Scene();
  const arena = { geometry: { parameters: { radius: 5 } } };
  const controller = {
    addEventListener: mock.fn(),
    removeEventListener: mock.fn(),
    add: mock.fn(),
    remove: mock.fn()
  };

  await mock.module('../modules/scene.js', {
    namedExports: {
      getScene: () => scene,
      getArena: () => arena,
      getPrimaryController: () => controller,
      getCamera: () => ({})
    }
  });
  await mock.module('../modules/UIManager.js', { namedExports: { attachBossUI: mock.fn(), PIXELS_PER_UNIT: 1000 } });
  await mock.module('../modules/PowerManager.js', { namedExports: { useOffensivePower: mock.fn(), useDefensivePower: mock.fn() } });
  await mock.module('../modules/CoreManager.js', { namedExports: { useCoreActive: mock.fn() } });
  await mock.module('../modules/ModalManager.js', { namedExports: { getModalObjects: () => [] } });
  await mock.module('../modules/ControllerMenu.js', { namedExports: { getControllerMenuObjects: () => [] } });
  await mock.module('../modules/gameHelpers.js', { namedExports: { gameHelpers: {} } });
  await mock.module('../modules/config.js', { namedExports: { MODEL_SCALE: 1 } });
  await mock.module('../modules/movement3d.js', { namedExports: { moveTowards: () => {} } });
  await mock.module('../modules/AssetManager.js', {
    namedExports: {
      AssetManager: class {
        async loadTexture() { return new THREE.Texture(); }
      }
    }
  });
  const state = {
    player: { position: new THREE.Vector3(), speed: 1, talent_states: { phaseMomentum: { active: false } }, stunnedUntil: 0 },
    isPaused: false,
    cursorDir: new THREE.Vector3()
  };
  await mock.module('../modules/state.js', { namedExports: { state } });

  const { initPlayerController, getAvatar } = await import('../modules/PlayerController.js');

  await initPlayerController();
  const firstAvatar = getAvatar();
  assert.equal(scene.children.filter(o => o.name === 'playerAvatar').length, 1);

  await initPlayerController();
  const secondAvatar = getAvatar();
  assert.equal(scene.children.filter(o => o.name === 'playerAvatar').length, 1);
  assert.notEqual(firstAvatar, secondAvatar);

  mock.reset();
});
