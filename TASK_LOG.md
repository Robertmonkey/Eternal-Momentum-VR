# Task Log

## 2025-08-01
- Added documentation requirement in `AGENTS.md` instructing developers to record completed tasks in this log.
- Confirmed `FP-01` and `FP-02` implementations remain intact; all unit tests pass.

## 2025-08-02
- Implemented FP-02 fix by syncing player UV coordinates to state and added corresponding unit test.
- Improved UI modules (FP-04) by exporting `holoMaterial`, allowing modal injection and added tests for UI material and modal visibility.
- Updated `showModal` to ignore null entries and added new tests to `package.json`.
- Added noCanvas integration test verifying `gameTick` operates without a DOM canvas.

## 2025-08-03
- Implemented FP-06 step 2 by attaching projectile meshes to a `projectileGroup`
  in `vrGameLoop.js` and updating them in `projectilePhysics3d.js`. Added cleanup
  logic and ensured all tests pass.

## 2025-08-03
- Completed FP-06 step 1 by removing the legacy `canvas` object from
  `gameLoop.js`. Replaced all references with `SCREEN_WIDTH` and
  `SCREEN_HEIGHT` constants to decouple the VR loop from DOM canvas
  dimensions. All tests continue to pass.

## 2025-08-04
- Finished FP-06 step 3 by removing the last A-Frame reference from `ui.js`.
  The unlock banner now relies solely on the Three.js UI. All tests pass.

## 2025-08-05
- Started FP-07 by replacing the player's `x` and `y` fields with a
  `THREE.Vector3` position in `state.js`. Updated the player controller,
  game loop and unit tests to use the new vector-based position. All tests
  continue to pass.


## 2025-08-06
- Continued FP-07 by updating `vrGameLoop.js` to read the player's
  3D `position` vector from state. Enemy updates now use this value
  directly. All tests continue to pass.

## 2025-08-07
- Continued FP-07 by making enemy AI read the centralized
  `state.player.position` directly. Updated `enemyAI3d.js`,
  `vrGameLoop.js`, and `gameLoop.js` accordingly and added a new
  unit test `enemyAI3d.test.mjs` to ensure enemies move using the
  shared player position. All tests pass.

## 2025-08-08
- Added FP-04 tests verifying loading progress updates DOM elements and Game Over modal buttons trigger the expected actions.

## 2025-08-09
- Implemented FP-08 by refactoring AudioManager to use three.js AudioListener and PositionalAudio. Added listener setup in vrMain.js and updated main.js for new API. All tests pass.

## 2025-08-10
- Continued FP-07 by replacing the global `window.mousePosition` with
  `state.mousePosition`. Updated PlayerController, powers, cores and
  main.js to use the centralized cursor state. All tests continue to pass.

## 2025-08-11
- Reimplemented Reflector Warden boss AI using original logic and added unit test verifying reflection damage (FP-05).

## 2025-08-12
- Reimplemented Vampire Veil boss AI with healing and pickup mechanics and added
  unit test verifying behaviour (FP-05).

## 2025-08-13
- Improved menu clarity by capturing DOM modals at higher resolution.
  `captureElementToTexture` now scales html2canvas captures by the
  device pixel ratio for crisp UI textures (FP-04).

## 2025-08-14
- Reduced console noise by gating WebXR session logs behind NODE_ENV checks (CI-07).
## 2025-08-15
- Continued FP-07 by removing remaining window.mousePosition references in gameLoop.js to use state.mousePosition.

## 2025-08-16
- Added Gravity Tyrant AI unit test validating gravitational pull effect (FP-05).
