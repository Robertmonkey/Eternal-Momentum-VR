# Agent Behavior & Development Workflow

*Version: 4.0, Complete*
*Date: July 29, 2025*

## 1. Introduction

This document serves two critical functions:
1.  **Design Specification**: It is the definitive guide to the behavior, mechanics, and implementation of all 30 AI agents. The patterns established in the first ten detailed boss guides should be replicated for all subsequent bosses.
2.  **Live Workflow Log**: It is a living document that the AI assistant will update after every work session to track progress, log changes, and define the next steps. The **Master Development Task List** must be followed sequentially.

---

## High-Priority Scaffolding Tasks (P0)

**ATTENTION:** The following `SXX` tasks are designated **Priority 0**. They MUST be completed in the specified sequential order **BEFORE** proceeding to the "Master Development Task List" (`BXX` tasks) below. Do not begin work on any boss implementation until all scaffolding tasks are complete and verified.

| Task ID | Component | Description | Status |
| :--- | :--- | :--- |:--- |
| **S01** | **Core Scene & VR Setup** | Initialize the `three.js` scene, renderer, and camera. Implement the WebXR session logic (`sessionstart`, `sessionend`). Create the player rig (a `Group` containing the camera and controllers) so that all subsequent player-relative objects (UI, etc.) can be parented to it. Set up basic `AmbientLight` and `DirectionalLight`. | **Done** |
| **S02** | **Environment Implementation** | Build the static environment. Create a large `THREE.SphereGeometry` (radius: 500) with an inverted material (`THREE.BackSide`) to serve as the gameplay arena. At the scene origin `(0,0,0)`, create a static `THREE.CylinderGeometry` (radius: 10, height: 0.5) to act as the player's central platform. | **Done** |
| **S03** | **Player Controller & Avatar** | Implement the `PlayerController`. It must manage the right controller's laser pointer/raycaster to determine a target point on the inner arena sphere. Create a `THREE.SphereGeometry` for the player avatar (radius: 5) and implement movement logic that smoothly moves it across the sphere's surface toward the target point. Map controller inputs: Trigger -> Offensive Power, Grip -> Defensive Power, Trigger+Grip -> Core Ability. | **Done** |
| **S04** | **Application State Flow** | Implement the main application state machine based on `main.js`. This includes creating the visual states for the **Loading Screen** (`#loading-screen`) and **Home Screen** (`#home-screen`). The `index.html` file is the source of truth for the elements and buttons on these screens. These should be presented as the first views to the user upon starting the application. | **Done** |
| **S05** | **UI Manager & HUD Scaffolding** | Create the `UIManager`. All UI elements must be holographic 3D objects in the scene, parented to the player rig's camera. Implement the main HUD container (`.command-bar` from `index.html`) as a curved `THREE.PlaneGeometry` that floats at the bottom of the player's view. | **Done** |
| **S06** | **HUD Implementation: Health & Resources** | Within the HUD container, implement the Health, Shield, Ascension, and Status Effects bars. This involves creating 3D planes that replicate `#health-bar-container`, `#shield-bar-overlay`, `#ascension-bar-container`, and `#status-effects-bar`. Their visuals (width, color, text) must be dynamically updatable by the `UIManager` based on the global `state` object. | **Done** |
| **S07** | **HUD Implementation: Powers & Core** | Recreate the power-up slots (`.abilities` and `.ability-queue`) as hexagonal `THREE.ShapeGeometry` planes. The `UIManager` must update their textures to show the correct power-up emoji from `state.offensiveInventory` and `state.defensiveInventory`. Implement the `#aberration-core-socket` as a circular plane with a child plane for the cooldown overlay. | **Done** |
| **S08** | **HUD Implementation: Boss UI** | Implement the `#bossHpContainer` and `#bossBanner` elements. The container should be a designated area in the UI (e.g., top-center) where individual boss health bars can be dynamically added and removed. The banner is a text element that appears and fades out when a boss spawns. | **Done** |
| **S09** | **Modal UI Implementation** | Create the functionality to display the primary modal menus as large, floating holographic panels. This task covers the initial implementation for: `#gameOverMenu`, `#levelSelectModal`, `#ascensionGridModal`, and `#aberrationCoreModal`. Each modal should be populated with interactive elements that the player can target with the laser pointer. | **Done** |

---

## 2. Master Development Task List

### Phase 1: Foundational Agent Systems

| ID | Task | Acceptance Criteria | Status |
| :--- | :--- | :--- | :--- |
| **F-01** | Create `AssetManager.js` | Must handle loading/caching of assets. | **Done** |
| **F-02**| Create `BaseAgent.js` | Must extend `THREE.Group`. Must include health, damage, death, and update methods. | **Done**|
| **F-03** | Create `ProjectileManager.js` | Manages an object pool of projectiles, their movement, and collisions. | **Done** |

### Phase 2: Complete Boss Implementation Plan
* **Detailed Implementation (B1-B10)**: Implement these bosses using the detailed guides below.
* **Pattern-Based Implementation (B11-B30)**: Implement these bosses by applying the established patterns.

| ID | Task (Boss Name) | Status |
| :--- | :--- | :--- |
| **B1** | Splitter Sentinel | **Done** |
| **B2** | Reflector Warden | **Done** |
| **B3** | Vampire Veil | **Done** |
| **B4** | Gravity Tyrant | **Done** |
| **B5** | Swarm Link | **Done** |
| **B6** | Mirror Mirage | **Done** |
| **B7** | EMP Overload | **Done** |
| **B8** | The Architect | **Done** |
| **B9** | Aethel & Umbra | **Done** |
| **B10**| Looping Eye | **Done** |
| **B11**| The Juggernaut | **To Do** |
| **B12**| The Puppeteer | **To Do** |
| **B13**| The Glitch | **To Do** |
| **B14**| Sentinel Pair | **To Do** |
| **B15**| The Basilisk | **To Do** |
| **B16**| The Annihilator | **To Do** |
| **B17**| The Parasite | **To Do** |
| **B18**| Quantum Shadow | **To Do** |
| **B19**| Time Eater | **To Do** |
| **B20**| The Singularity | **To Do** |
| **B21**| The Miasma | **To Do** |
| **B22**| The Temporal Paradox| **To Do** |
| **B23**| The Syphon | **To Do** |
| **B24**| The Centurion | **To Do** |
| **B25**| The Fractal Horror | **To Do** |
| **B26**| The Obelisk | **To Do** |
| **B27**| The Helix Weaver | **To Do** |
| **B28**| The Epoch-Ender | **To Do** |
| **B29**| The Shaper of Fate | **To Do** |
| **B30**| The Pantheon | **To Do** |

## 3. AI Development Workflow Log

### Implementation Log
| Date | Task ID | Agent/System Implemented | Notes |
| :--- | :--- | :--- | :--- |
| 2025-07-29 | F-01/F-02 |`AssetManager.js`, `BaseAgent.js` | Initial foundational modules created. |
| 2025-07-29 | F-03 |`ProjectileManager.js` | Basic projectile pooling and update logic implemented. |
| 2025-07-29 | B1 |`SplitterAI.js` | Initial boss state machine implemented. |
| 2025-07-29 | B2 |`ReflectorAI.js` | Reflector Warden state machine implemented. |
| 2025-07-29 | B3 |`VampireAI.js` | Vampire Veil syphon mechanic implemented. |
| 2025-07-29 | B4 |`GravityAI.js` | Gravity Tyrant gravitational pull implemented. |
| 2025-07-29 | B5 |`SwarmLinkAI.js` | Shared health pool and minion logic implemented. |
| 2025-07-29 | B6 |`MirrorMirageAI.js` | Clone swapping mechanics implemented. |
| 2025-07-29 | B7 |`EMPOverloadAI.js` | EMP blast and inventory reset implemented. |
| 2025-07-29 | Audit |Boss modules adjusted to match original mechanics.|
| 2025-07-29 | S01 |`scene.js` | Three.js WebXR scaffolding implemented. |
| 2025-07-29 | S02 |`scene.js` | Static arena and platform created. |
| 2025-07-30 | S03 |`PlayerController.js` | VR avatar, laser pointer, and input handling implemented. |
| 2025-07-30 | S04 |`app.js`, `vrMain.js` | Loading and home screen flow implemented. |
| 2025-07-31 | S05 |`UIManager.js` | HUD scaffold with curved command bar attached to camera. |
| 2025-07-31 | S06 |`UIManager.js`, `vrMain.js` | Health, shield, ascension, and status bars implemented with dynamic updates. |
| 2025-07-31 | S08 |`UIManager.js`, `ui.js` | Boss health bars and spawn banner added to VR HUD. |
| 2025-07-31 | S09 |`ModalManager.js`, `PlayerController.js`, `vrMain.js` | Initial holographic modal system implemented. |
| 2025-08-01 | B6 |`MirrorMirageAI.js` | Updated to 3-clone design and timed teleportation. |
| 2025-08-02 | B8 |`ArchitectAI.js` | Wall summoning state machine implemented. |
| 2025-08-02 | B9 |`AethelUmbraAI.js` | Twin boss roles and rage logic implemented. |
| 2025-08-02 | B10 |`LoopingEyeAI.js` | Path recording and replay mechanic implemented. |

### Next Steps
1.  **Begin Task B11:** The Juggernaut

---

## 4. Detailed Boss Implementation Guides (1-10)

### **B1: Splitter Sentinel**
* **Player Strategy**: A straightforward fight. Keep distance, focus fire, and prepare to manage two faster minions upon its defeat.
* **Geometry & Materials**: A `THREE.SphereGeometry` with a red (`0xff0000`), emissive `MeshBasicMaterial`.
* **Movement Patterns**: Static. It does not move from its spawn point.
* **Attack Patterns**: Every 5 seconds, it fires a single, slow-moving spherical projectile at the player.
* **VFX & SFX Cues**: On death, play `splitterOnDeath.mp3` and emit a burst of red particles.

### **B2: Reflector Warden**
* **Player Strategy**: A puzzle of timing. Do not attack when its shields are glowing. Wait for the shields to drop, then unleash damage.
* **Geometry & Materials**: A central `THREE.BoxGeometry` (dark purple, `0x300030`) with four child `THREE.PlaneGeometry` shields. Shields use a transparent material with a purple (`0x800080`) emissive color that is toggled.
* **Movement Patterns**: Rotates slowly on its Y-axis when defensive. Static when vulnerable.
* **State Machine**:
    * `DEFENSIVE` (8s): Immune. Shields are emissive. Reflects projectiles.
    * `VULNERABLE` (4s): Takes damage. Shields are not emissive.
* **VFX & SFX Cues**: Shield hit: `reflectorOnHit.mp3`. Shields drop: `shieldBreak.mp3`.

### **B3: Vampire Veil**
* **Player Strategy**: A damage race. Stay aggressive. When it emits a red aura, move your avatar far away to prevent it from healing.
* **Geometry & Materials**: A `THREE.ConeGeometry` (crimson, `0xdc143c`). A large, semi-transparent red sphere visualizes the syphon radius.
* **State Machine**:
    * `ATTACKING`: Fires a burst of 3 projectiles, then transitions to `SYPHONING`.
    * `SYPHONING` (3s): If the player is within the radius, the boss regenerates health. Then transitions back to `ATTACKING`.
* **VFX & SFX Cues**: Syphon starts: `vampireHeal.mp3` and red aura appears.

### **B4: Gravity Tyrant**
* **Player Strategy**: A battle of positioning. Constantly move your avatar outwards against the pull. The force is weaker at a greater distance.
* **Geometry & Materials**: A `THREE.TorusKnotGeometry` (deep blue, `0x00008b`).
* **Movement Patterns**: Moves slowly to random points on the arena surface.
* **Attack Patterns**: Continuously applies a gravitational force to the player's avatar. Fires a single projectile every 6 seconds.
* **VFX & SFX Cues**: A deep, constant hum (`gravitySound.mp3`). The arena can have subtle, inward-flowing particles.

### **B5: Swarm Link**
* **Player Strategy**: A multi-target fight. All three entities share one health bar. Focus fire on one at a time to reduce the number of incoming projectiles.
* **Geometry & Materials**: Three small `THREE.IcosahedronGeometry` entities (yellow, `0xffff00`), linked by `THREE.Line` objects with a flickering material.
* **Logic**: The `SwarmLinkAI.js` manager tracks a shared health pool. Each of the three minions acts independently, firing a single projectile every 4 seconds. When a minion is defeated, it is removed. The fight ends when the shared health pool is zero.
* **VFX & SFX Cues**: Constant electrical crackle (`chainSound.mp3`).

### **B6: Mirror Mirage**
* **Player Strategy**: A shell game. The boss creates two identical, non-damaging clones. You must track and damage the *real* one. Hitting a clone causes it to vanish and respawn elsewhere.
* **Geometry & Materials**: Three identical `THREE.OctahedronGeometry` objects (cyan, `0x00ffff`).
* **Logic**: The `MirrorMirageAI.js` controls all three entities. Only the "real" one has health. Every 10 seconds, the boss and its clones will rapidly teleport to new positions.
* **VFX & SFX Cues**: Teleport/swap effect uses `mirrorSwap.mp3`.

### **B7: EMP Overload**
* **Player Strategy**: A resource denial fight. The boss periodically unleashes an EMP blast that disables your power-ups and Core ability for a short time. Inflict damage between these blasts.
* **Geometry & Materials**: A `THREE.TorusGeometry` (electric blue, `0x00BFFF`) with smaller spheres orbiting it.
* **State Machine**:
    * `NORMAL` (10s): Fires standard projectiles.
    * `CHARGING` (3s): Emits a loud siren (`powerSirenSound.mp3`) and glows brightly.
    * `DISCHARGE`: Unleashes a full-arena visual pulse. The player's `PowerUpManager` is temporarily disabled.
* **VFX & SFX Cues**: Discharge event uses `empDischarge.mp3`.

### **B8: The Architect**
* **Player Strategy**: The arena itself becomes the enemy. Dodge the boss's projectiles while navigating the maze of rotating walls it creates.
* **Geometry & Materials**: A complex, non-primitive shape assembled from multiple `THREE.BoxGeometry` objects (stone grey, `0x808080`). Walls are long, thin `THREE.CylinderGeometry`.
* **State Machine**:
    * `SUMMONING` (4s): Spawns 3 long, rotating `Wall` objects that act as barriers.
    * `ATTACKING` (8s): Fires volleys of projectiles, using the walls for cover.
    * `RECONFIGURING`: Destroys old walls (with `wallShrink.mp3`) and transitions back to `SUMMONING`.
* **VFX & SFX Cues**: Wall creation uses `architectBuild.mp3` and `wallSummon.mp3`.

### **B9: Aethel & Umbra**
* **Player Strategy**: A duo boss fight. Aethel (light) creates healing zones for Umbra (dark). You must defeat Aethel first to stop the healing, then focus on Umbra.
* **Geometry & Materials**: Aethel is a white, glowing `DodecahedronGeometry`. Umbra is a black, sharp-edged `TetrahedronGeometry`.
* **Logic**: Two independent agents. `AethelAI` creates healing circles on the arena floor. `UmbraAI` is aggressive, constantly firing projectiles. Both must be defeated.
* **VFX & SFX Cues**: When both are defeated, play `aspectDefeated.mp3`.

### **B10: Looping Eye**
* **Player Strategy**: A memory and timing challenge. The boss "records" the player's movement for 5 seconds, then "replays" a damaging trail along that exact path while also firing projectiles.
* **Geometry & Materials**: A large central sphere resembling an eye. The pupil's material can change color to indicate its state.
* **State Machine**:
    * `RECORDING` (5s): Pupil is red. The boss records the player avatar's `position` array.
    * `REPLAY` (5s): Pupil is blue. The boss emits a damaging trail of particles along the recorded path (`paradoxTrailHum.mp3` plays). Simultaneously, it fires simple projectiles.
* **VFX & SFX Cues**: State transitions are marked with `timeRewind.mp3`.
