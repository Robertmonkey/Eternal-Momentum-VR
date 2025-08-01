# Developer Guide & Architectural Overview

**Document Version:** 2.0 | **Status:** Live

This document describes the architecture of the Eternal Momentum VR project and establishes best practices for future development. The initial refactoring of the game into a stable, 3D VR application is complete. This guide ensures that all future work maintains the project's structure and quality.

## Core Architectural Principles

All new development must adhere to the following principles:

1.  **The State is King (`state.js`):**
    * The global `state` object is the **single source of truth**. All game logic must read from and write to this object.
    * **All positions MUST be stored as `THREE.Vector3` objects.** Do not use separate `x`, `y` properties for world coordinates.
    * Avoid storing transient or derived data in the state (e.g., store a `cooldownUntil` timestamp, not a `timeRemaining` value).

2.  **The Main Loop (`vrMain.js` -> `vrGameLoop.js`):**
    * The render loop in `vrMain.js` is the application's heartbeat. It calls `renderer.render()` every frame.
    * All gameplay logic is driven by `vrGameLoop.js`, which is called once per frame from the render loop. This function orchestrates updates to all game systems (AI, projectiles, passives, etc.).

3.  **VR-First Input (`PlayerController.js`):**
    * This module is the sole interface between the VR hardware and the game.
    * It handles raycasting for both world interaction (movement targeting) and UI interaction.
    * It manages input state (`triggerJustPressed`, etc.) to ensure reliable, single-press actions.

4.  **Decoupled UI (`UIManager.js` & `ModalManager.js`):**
    * All in-game UI is rendered in 3D as `THREE.Object3D` instances. **NEVER manipulate the HTML DOM** for game UI after the initial load.
    * `UIManager.js` handles the persistent HUD.
    * `ModalManager.js` handles the creation and display of world-space menus. Menus are parented to the scene, not the camera, to ensure they are stationary.

5.  **Logic in Helpers, Not Components:**
    * Complex, reusable logic (like game progression or spawning entities) should reside in helper modules like `gameLoop.js` or `helpers.js`.
    * AI scripts and other components should call these helpers rather than re-implementing logic.

## How to Add a New Boss

Follow this pattern to add a new boss to the game:

1.  **Create the AI File:** Create a new file in `modules/agents/NewBossAI.js`.
2.  **Extend BaseAgent:** The new class must `extend BaseAgent`.
3.  **Implement the Constructor:**
    * Call `super()`.
    * Create a `THREE.Mesh` or `THREE.Group` to be the boss's visual model and pass it to the `super()` constructor.
    * Set the boss's properties (`name`, `maxHP`, etc.) based on its design.
4.  **Implement the `update(delta)` method:** Add the boss's per-frame logic here. All movement and targeting must use 3D vectors.
5.  **Add to Game Data:**
    * Add the new boss's static data (ID, name, unlock level, core description) to the `bossData` array in `modules/bosses.js`.
    * Add the boss to a stage in `modules/config.js` in the `STAGE_CONFIG` array.
6.  **Spawn:** The existing `spawnEnemy` function will now be able to spawn your new boss by its ID.

## Ongoing Development Practices

1.  **Atomic Commits:** Commit and push your work frequently. Each commit should correspond to a single, logical change (e.g., "Fix Miasma AI gas attack," "Improve settings modal layout").
2.  **Consistent Style:** Follow the existing code style (ES modules, camelCase, descriptive variable names). Add JSDoc comments for new functions and classes.
3.  **Centralize Helpers:** If you write a useful function that could be used elsewhere, add it to `modules/helpers.js` instead of keeping it local.
4.  **Test:** Add new unit tests in the `tests/` directory to verify new mechanics and prevent regressions.

## Future Development Roadmap

* **Polishing & Bug Fixing:** Playtesting to find and fix minor bugs, timing issues, or visual glitches.
* **Performance Optimization:** Profiling and optimizing, especially for standalone VR headsets (e.g., object pooling for projectiles/enemies, draw call reduction).
* **UI/UX Refinements:** Improving menu layouts, adding more visual feedback for actions, and refining controller interactions.
* **VFX & SFX Polish:** Enhancing visual effects for powers and boss attacks, and ensuring all audio cues are present and correctly positioned.
