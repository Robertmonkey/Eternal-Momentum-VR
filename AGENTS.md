# AGENTS.md – Guidance for AI Agents

## Purpose and Scope

This file provides the primary technical directives for AI agents working on the **Eternal Momentum: Conduit Command VR** repository. It defines high-priority tasks, architectural constraints, and critical pitfalls. Direct user instructions always override the guidance contained here.

## Project Overview

The goal is to build a new, native 3D VR game based on the vision in `README.md`. The original 2D game, located in `/Eternal-Momentum-OLD GAME/`, serves as a **highly detailed blueprint and specification**, not a live engine to be bridged.

**No Custom 3D Models:** All enemies, projectiles, pickups, and UI elements will be composed of primitive shapes and emoji textures only. We will not create or use bespoke 3D models.

**Local-Only Data:** All saves and optional telemetry must be kept in localStorage. The game should never rely on external servers or network connectivity.

---
## Master Task List & Priorities

This is the prioritized list of tasks to resolve the critical issues with the prototype.

### **Priority 1: Critical Gameplay & VR Layout Fixes (Un-break the game)**
Your immediate priority is to make the game playable. Address these tasks in order.

* [ ] **Task 1.1: Anchor Command Deck & UI:** The command deck and all UI elements must be anchored relative to the player's camera at waist level, not high above their head. They must remain stationary as the player turns.
* [ ] **Task 1.2: Implement Stage Initialization:** The game must automatically start a valid stage upon entering VR. This involves calling the `resetGame()` and `spawnBossesForStage()` functions from the legacy modules at the appropriate time in `script.js`.
* [ ] **Task 1.3: Correct Gameplay Entity Spawning:** All gameplay entities (the Nexus avatar, enemies, power-ups, projectiles) **must** be spawned and exist only on the inner surface of the large, external `battleSphere`. No gameplay logic should execute on the command deck itself.
* [ ] **Task 1.4: Re-implement 3D "Momentum" Movement:** The Nexus avatar must not snap to the cursor. It must be smoothly attracted to it using the formula from the original `gameLoop.js` (lines 401-404), re-implemented with 3D vector math for movement along a sphere's inner surface. Use the `moveTowards` function in `modules/movement3d.js` as the basis for this.

### **Priority 2: UI Implementation & Overhaul (Match the vision)**
After the game is playable, the UI must be rebuilt to match the original game's aesthetic.

* [ ] **Task 2.1: Implement Command Cluster Layout:** Programmatically arrange the UI panels (`scorePanel`, `offPowerPanel`, etc.) in a wrap-around "command cluster" on the player's console, as seen in the original game. They must be spread out and easily readable.
* [ ] **Task 2.2: Style Physical Buttons:** Replace all placeholder UI geometry (the blue cylinders) with properly sized, glowing buttons built from simple shapes. Each button must have a clear emoji label (`<a-text>`) and be interactive. No custom 3D models are required.
* [ ] **Task 2.3: Implement Holographic Menus:** Clicking a menu button (e.g., "Ascension") must open the correct UI panel from the original `index.html` as a large, interactive holographic screen in front of the player. This must be achieved by rendering the HTML modal to an offscreen canvas and applying that canvas as a texture to an `<a-plane>`.
* [ ] **Task 2.4: Create the Neon Grid Floor Texture:** Add a transparent neon grid floor beneath the command deck using the `gridCanvas` texture, allowing players to see space below.

---
## Critical Pitfalls to Avoid

Adherence to these constraints is crucial for a successful implementation.

1.  **DO NOT Manipulate the DOM for VR UI.** The original game's HTML and CSS are a visual reference and a source for `html2canvas` rendering only. All visible UI in VR must be constructed from A-Frame `<a-entity>` primitives. Direct DOM manipulation for UI will not work and will break the VR experience.
2.  **DO NOT Mix 2D and 3D Coordinate Systems.** All `(x, y)` coordinates from the legacy `gameLoop` must be re-interpreted as `(u, v)` texture coordinates for the spherical battlefield. These must be converted to `THREE.Vector3` positions on the sphere's surface before being used to position any 3D object.
3.  **DO NOT Allow Gameplay on the Command Deck.** The Command Deck is a static environment for the player and the UI only. The `battleSphere` is the exclusive arena for all gameplay entities and effects. This separation is a non-negotiable architectural rule.
4.  **DO NOT Use Unlabeled or Unstyled Placeholders.** All new assets must match the dark, neon-glow aesthetic of the original game. Reference the color variables in `/Eternal-Momentum-OLD GAME/style.css`. Placeholder geometry like the blue cylinders must be replaced with properly designed assets that match the game's theme and have clear labels.
# AGENTS.md – Comprehensive Guide for AI Agents Working on **Eternal Momentum / Eternal Momentum VR**

> **Purpose**  This document gives Codex‑style agents (or any automated assistant) **everything they need** to reason about, modify, and extend the project **without confusion**.  
> It merges knowledge of the **original 2‑D game** (in `Eternal‑Momentum‑OLD GAME/`) with the current **VR rewrite** so agents always know where to look, how subsystems map to one another, and what project conventions must never be violated.

---

## 1  Repository Map

```text
/                     ← VR project root
|-- index.html        ← A‑Frame scene for VR build
|-- main.js           ← non‑VR entry and testing harness
|-- script.js         ← VR runtime bootstrap
|-- modules/          ← ES‑module logic for the VR rewrite
|   |-- ascension.js
|   |-- audio.js
|   |-- bosses.js
|   |-- config.js
|   |-- cores.js
|   |-- enemyAI3d.js
|   |-- gameLoop.js
|   |-- movement3d.js
|   |-- navmesh.js
|   |-- powers.js
|   |-- projectilePhysics3d.js
|   |-- state.js
|   |-- talents.js
|   |-- telemetry.js
|   |-- ui.js
|   |-- utils.js
|-- styles.css        ← VR‑only CSS (comfort vignette, off‑screen modals)
|-- AGENTS.md         ← **THIS FILE**
|-- README.md         ← High‑level project brief + legacy overview
|-- assets/           ← shared images, audio and cursor files
|   |-- cursors/      ← .cur and .ani files referenced by CSS
|-- Eternal-Momentum-OLD GAME/   ← **Original 2‑D browser game**
    |-- index.html    ← legacy HTML scaffold
    |-- style.css     ← neon/space aesthetic, colour variables (uses ../assets/ paths)
    |-- main.js       ← entry point
    |-- modules/      ← state.js, gameLoop.js, powers.js, cores.js, ascension.js, ui.js, utils.js…
```

## TODO
- Expand boss attack patterns to use full 3D positioning and effects.
- Add unit tests for 3D movement helpers.

## NEED
- Additional sound effects and background music loops.
- remove features not found in the orginal game to focus on readme direction.
- Adjust boss damage output for VR scale.

## Workflow for Agents
1. Review `README.md` and this `AGENTS.md` before starting work.
2. Choose tasks from the TODO/NEED lists or the roadmap and implement them.
3. After completing a task, update the lists by removing the finished item and adding the next logical step.
4. When user feedback items in `README.md` are addressed, mark them with a ✅ and briefly note the fix in your commit messages.

