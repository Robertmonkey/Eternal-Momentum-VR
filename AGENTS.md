# AGENTS.md - Fidelity & Bug Fix Directive

**Document Version: 5.2**
**STATUS: CRITICAL - ARCHITECTURAL REFACTOR & IMPLEMENTATION OVERRIDE**

**ATTENTION AI DEVELOPER:** A full code review has confirmed the v1.0 playtest findings. The current implementation is critically flawed at an architectural level. All tasks previously marked "Done" are considered **FAILED**. All work is to halt immediately.

The following task list is a **mandatory patch and refactoring directive**. You are to execute these tasks sequentially to repair the core application. The absolute source of truth for all implementation details are the original project's source files (`/Eternal-Momentum-OLD GAME/`) and the previously provided specification documents.

---

## Fidelity Patch Task List (FP-1.0)

**Objective:** To build a functional, performant, and visually correct foundation for the game by removing the flawed hybrid architecture and implementing a native three.js scene graph.

| Task ID | Component | Problem Description | Implementation & Fidelity Requirements | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **FP-01** | **Scene Rendering & Lighting** | The VR experience is completely black. The arena sphere is not visible. | 1. **Arena Material:** In `scene.js`, change the arena sphere's material from `MeshBasicMaterial` to `MeshStandardMaterial` so it can react to light. 2. **Lighting:** Ensure the `AmbientLight` and `DirectionalLight` are correctly added to the scene. 3. **Texture:** Apply the `assets/bg.png` file as a texture map to the arena sphere's material. | The player can clearly see the textured inner surface of the sphere and the central platform. |
| 2025-07-30 | FP-02 | PlayerController.js | Fixed avatar color, position, and movement |
| 2025-07-30 | FP-03 | PlayerController.js | Added laser pointer and cursor rendering |
| 2025-07-30 | FP-04 | UIManager.js | Implemented loading bar and holographic UI materials |
| 2025-07-30 | FP-05 | SplitterAI.js | Reimplemented Splitter Sentinel boss mechanics |
| **FP-02** | **Player Avatar** | The player avatar is the wrong color, is not movable, and is positioned incorrectly. | 1. **Color:** In `PlayerController.js`, the avatar `THREE.SphereGeometry` MUST use a blue material. The correct hex color is **`#3498db`**. 2. **Position:** The avatar's initial position MUST be on the inner surface of the arena sphere. 3. **Movement:** The `PlayerController`'s `update` loop MUST be fixed to correctly move the avatar's position along the sphere's surface toward the laser pointer's target point. | The player avatar is **blue**, is always on the sphere's surface, and smoothly follows the laser pointer's target. |
| 2025-07-30 | FP-03 | PlayerController.js | Added laser pointer and cursor rendering |
| 2025-07-30 | FP-04 | UIManager.js | Implemented loading bar and holographic UI materials |
| 2025-07-30 | FP-05 | SplitterAI.js | Reimplemented Splitter Sentinel boss mechanics |
| **FP-03** | **Player Controls** | The laser pointer/cursor is invisible, making aiming and UI interaction impossible. | 1. **Laser Pointer:** Render a `THREE.Line` or a thin `THREE.CylinderGeometry` from the right controller's position to the raycaster's hit point on the arena sphere. 2. **Cursor:** Render a small, flat plane or sprite at the raycaster's hit point to act as a visible cursor. 3. **Visibility:** Ensure the materials for the laser and cursor are emissive or unlit. | A visible laser beam emanates from the player's controller, and a cursor is visible on the arena surface where the laser hits. |
| 2025-07-30 | FP-04 | UIManager.js | Implemented loading bar and holographic UI materials |
| 2025-07-30 | FP-05 | SplitterAI.js | Reimplemented Splitter Sentinel boss mechanics |
| **FP-04** | **UI Rendering & Functionality** | The loading bar is stuck. The in-game HUD is invisible. The Game Over screen is a blank, non-interactive plane. | 1. **Loading Bar:** The A-Frame asset loader's progress events in `index.html` must be wired to the loading bar UI to show visual progress. 2. **Holographic Material:** Create a standard holographic material for all UI planes (`transparent: true`, `opacity: 0.8-0.9`, `emissive`). 3. **Text & Content:** The `UIManager.js` must be fixed to correctly render text and interactive elements from the original HTML onto 3D planes. The `#gameOverMenu` MUST be fully functional. 4. **HUD Visibility:** The entire HUD (`.command-bar`) MUST be visible and updating during gameplay. | The loading bar progresses to 100%. The full in-game HUD is visible. All modal screens appear with their correct, interactive content. |
| 2025-07-30 | FP-05 | SplitterAI.js | Reimplemented Splitter Sentinel boss mechanics |
| **FP-05** | **Boss Mechanics Fidelity Audit (B01-B30)** | **CRITICAL FAILURE:** All implemented bosses are using generic behaviors instead of their specified unique mechanics. | **Action:** Refactor EVERY boss implementation (`B01` through `B30`). **Methodology for EACH boss:** <br>1. **DELETE** the current faulty AI script (e.g., `SplitterAI.js`). <br>2. **READ** the specific logic for that boss's `id` from the original `/Eternal-Momentum-OLD GAME/modules/bosses.js` file. This is the absolute source of truth. <br>3. **RE-IMPLEMENT** a new AI script that perfectly replicates the specified `init`, `logic`, `onDamage`, and `onDeath` functions natively in the 3D environment. | Each boss behaves with 1-to-1 mechanical accuracy compared to its original 2D counterpart. |
| **FP-06** | **Architectural Refactor** | **CRITICAL FAILURE:** The application is a slow, buggy hybrid of A-Frame and a separate 2D canvas game loop. | 1. **REMOVE A-FRAME:** Delete all A-Frame components (`<a-scene>`, `<a-entity>`, etc.) from `index.html`. The project must use a pure three.js rendering loop managed in `vrMain.js`. 2. **DECOUPLE GAMELOOP:** The `gameTick` function from the original `gameLoop.js` must be refactored. Its responsibility is now to directly manipulate `THREE.Object3D` instances (enemies, player avatar, projectiles) in the main VR scene, NOT to draw to a 2D canvas. 3. **REMOVE MIRRORING:** The entire `spawn` function and entity mapping logic in `script.js` must be deleted. There is only one scene graph. | The application runs in a single, native three.js render loop. The 2D canvas is no longer used for game logic or rendering. |
| **FP-07** | **State Management Unification** | The game state is split between the old `state.js` (2D) and new VR components. | 1. **Refactor `state.js`:** Modify the global state object to be 3D-aware. Positions should be stored as `THREE.Vector3`. Remove all 2D-canvas-specific properties. 2. **Centralize State:** Ensure that all modules (`PlayerController.js`, `UIManager.js`, all agent AI scripts) read from and write to this single, unified state object. | There is one authoritative source for game state that uses 3D-native data types. |
| **FP-08** | **Audio System Integration** | Audio is currently managed through HTML `<audio>` tags. | 1. **Refactor `AudioManager.js`:** Convert the audio manager to use three.js's `AudioListener` and `PositionalAudio` components. 2. **Attach Listener:** Attach the `AudioListener` to the main VR camera. 3. **Positional Audio:** All in-game sound effects (explosions, enemy sounds) must be created as `PositionalAudio` objects attached to their corresponding 3D entities in the scene. | Sound effects correctly emanate from their 3D positions in the VR world. |

---

## Master Development Task List (Reprioritized)

**ATTENTION:** Do not begin this list until all `FP-XX` tasks are complete and a new playtest has **verified** their successful implementation. The status of all `BXX` tasks is reset to **To Do**.

| ID | Task (Boss Name) | Status |
| :--- | :--- | :--- |
| **B01** | Splitter Sentinel | **Needs Rework** |
| **B02** | Reflector Warden | **Needs Rework** |
| **B3** | Vampire Veil | **Needs Rework** |
| **B4** | Gravity Tyrant | **Needs Rework** |
| **B5** | Swarm Link | **Needs Rework** |
| **B6** | Mirror Mirage | **Needs Rework** |
| **B7** | EMP Overload | **Needs Rework** |
| **B8** | The Architect | **Needs Rework** |
| **B9** | Aethel & Umbra | **Needs Rework** |
| **B10**| Looping Eye | **Needs Rework** |
| **B11**| The Juggernaut | **Needs Rework** |
| **B12**| The Puppeteer | **Needs Rework** |
| **B13**| The Glitch | **Needs Rework** |
| **B14**| Sentinel Pair | **Needs Rework** |
| **B15**| The Basilisk | **Needs Rework** |
| **B16**| The Annihilator | **Needs Rework** |
| **B17**| The Parasite | **Needs Rework** |
| **B18**| Quantum Shadow | **Needs Rework** |
| **B19**| Time Eater | **Needs Rework** |
| **B20**| The Singularity | **Needs Rework** |
| **B21**| The Miasma | **Needs Rework** |
| **B22**| The Temporal Paradox| **Needs Rework** |
| **B23**| The Syphon | **Needs Rework** |
| **B24**| The Centurion | **Needs Rework** |
| **B25**| The Fractal Horror | **Needs Rework** |
| **B26**| The Obelisk | **Needs Rework** |
| **B27**| The Helix Weaver | **Needs Rework** |
| **B28**| The Epoch-Ender | **Needs Rework** |
| **B29**| The Shaper of Fate | **Needs Rework** |
| **B30**| The Pantheon | **Needs Rework** |

---

## AI Development Workflow Log (Reset)

### Implementation Log
| Date | Task ID | Agent/System Implemented | Notes |
| :--- | :--- | :--- | :--- |
| 2025-07-30 | FP-01 | scene.js | Applied MeshStandardMaterial, lighting and texture |
| 2025-07-30 | FP-02 | PlayerController.js | Fixed avatar color, position, and movement |
| 2025-07-30 | FP-03 | PlayerController.js | Added laser pointer and cursor rendering |
| 2025-07-30 | FP-04 | UIManager.js | Implemented loading bar and holographic UI materials |
| 2025-07-30 | FP-05 | SplitterAI.js | Reimplemented Splitter Sentinel boss mechanics |

| 2025-07-31 | CI-02 | navmesh.js, utils.js | Removed global THREE dependency |
| 2025-07-31 | CI-03 | vrCommandCluster.js | Removed obsolete A-Frame HUD module |
| 2025-07-31 | CI-04 | BaseAgent.js, AssetManager.js, projectilePhysics3d.js | Replaced global THREE with module imports |
### Next Steps
1.  **Execute Fidelity Patch 1.0 sequentially and with absolute adherence to the fidelity requirements.**
2.  Continue removing legacy global dependencies and wiring UI interactions.
3.  **Halt for user verification and playtest after all FP tasks are complete.**

## Code Audit & Bug Report (2025-07-30)
The current repository contains both the original 2D game (under `Eternal-Momentum-OLD GAME/`) and a partial VR rewrite. Key modules and their interactions are:

- **scene.js** sets up the Three.js scene, camera and lighting. Controllers are attached to a `playerRig` group.
- **PlayerController.js** creates the player avatar, laser pointer and crosshair. It uses raycasting to map controller aim to a point on the arena sphere.
- **UIManager.js** and **ModalManager.js** construct HUD elements and VR modals around the camera using `THREE.Group` containers.
- **vrMain.js** starts the VR loop via `renderer.setAnimationLoop` and updates player and HUD each frame.
- Legacy files such as `main.js` and `gameLoop.js` still update a 2D canvas using DOM events. These rely on `state.js` which stores player position in 2D coordinates.
- A collection of boss AI scripts exist in `modules/agents/`, but they mirror the generic behaviour from the old game.

### Critical Issues
1. **Hybrid Architecture** – `vrMain.js` renders the VR scene while `main.js` maintains the old canvas loop. This split causes duplicated state and inconsistent updates. `state.resetGame` still references a `gameCanvas` DOM element【F:modules/state.js†L208-L219】.
2. **Global Dependencies** – Several modules relied on `window` or a global `THREE` instance (e.g. `navmesh.js` comments)【F:modules/navmesh.js†L1-L5】, complicating bundling and testing. *(Corrected: `navmesh.js` and `utils.js` now import Three.js directly.)*
3. **2D Position Data** – Player coordinates are managed in pixels (`state.player.x`, `state.player.y`) instead of `THREE.Vector3`, preventing native 3D movement logic【F:modules/state.js†L208-L219】.
4. **Audio System** – `AudioManager` manipulates `<audio>` elements rather than Three.js audio objects, so sounds cannot be positioned in 3D space【F:modules/audio.js†L1-L19】.
5. **Boss AI Stubs** – Each file under `modules/agents/` implements placeholder behaviours. The root directive notes these must be reimplemented based on the old game's `bosses.js` logic.
6. **Obsolete A‑Frame Artifacts** – Files such as `vrCommandCluster.js` still generated `<a-plane>` elements and were designed for A‑Frame. *(Corrected: `vrCommandCluster.js` removed.)*
7. **UI and Modal Functionality** – The Three.js HUD renders correctly but many modal buttons only log to the console instead of manipulating game state【F:modules/ModalManager.js†L53-L74】.
8. **Pathfinding Performance** – `findPath` sorts the open list each iteration, leading to O(n²) behaviour on complex nav meshes【F:modules/navmesh.js†L82-L99】.

These issues must be addressed alongside the existing `FP-XX` tasks before a stable VR build is possible.
