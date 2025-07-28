
# Eternal Momentum: Conduit Command VR

## Project Vision & Directive

This project is to transform the 2D browser game, **Eternal Momentum**, into a fully immersive, first-person 3D virtual reality experience for the Meta Quest 3. This repository contains the complete source code of the original 2D game, which will serve as the **blueprint** for a new, native 3D VR implementation.

All visuals will use simple 3D shapes and emoji textures, eliminating any need for custom 3D models.

All gameplay data, including saves and optional telemetry, is stored **only** in the player's browser via `localStorage`. The game uses no online services.

The core fantasy is that the player **is the Conduit**, floating at the very center of a massive, spherical reality. From a central command deck, they have a complete 360-degree view of the battlefield as it wraps around them in every direction.

---
## Current Status: Critical Refactor in Progress

**The current VR prototype is considered non-functional and is undergoing a complete overhaul to address critical bugs.** Beta testing has revealed significant issues with the UI, core gameplay loop, and VR implementation that make the game unplayable.

The immediate goal is to refactor the codebase to be VR-native, using the original 2D game as a strict visual and logical specification rather than a live engine.
Non-gameplay features like localization and colorblind options are deferred until the full gameplay port is complete. In-game tutorial prompts will also wait until the core game is fully playable.

---
## Development Roadmap

This project will be developed in phases to ensure a stable and playable experience.

### **Phase 1: Foundational Fixes (Highest Priority)**
The goal of this phase is to make the game launch correctly and be minimally playable.
-   [ ] **Fix VR Layout:** Anchor the Command Deck and all UI elements correctly relative to the player's view at waist level.
-   [ ] **Correct Entity Spawning:** Ensure all gameplay entities (Nexus, enemies, power-ups) spawn and exist **only** on the inner surface of the outer gameplay sphere, not on the player's deck.
-   [ ] **Implement 3D "Momentum" Movement:** Re-implement the signature Nexus movement system in 3D, where the avatar is smoothly attracted to the controller's cursor on the sphere's surface.
-   [ ] **Reliable Stage Start:** Ensure a valid stage with functional controls, enemies, and bosses automatically begins upon entering VR.
-   [x] **Integrate Telemetry:** Record performance data locally for debugging. A toggle is available in the settings menu.
-   [x] **Pooling Optimized:** Enemies, projectiles, pickups, and effects now reuse pooled A-Frame entities for better performance.

### **Phase 2: UI/UX Overhaul**
This phase focuses on rebuilding the UI to match the vision of a tactile, holographic command center.
-   [ ] **Build the Command Cluster:** Arrange all UI panels in a wrap-around console, referencing the layout of the original 2D game's interface.
-   [ ] **Create Physical Buttons:** Replace all placeholder UI elements with styled buttons built from simple 3D shapes and emoji labels—no custom models are required—to match the glowing buttons from the original game.
-   [ ] **Implement Holographic Menus:** Implement the functionality for buttons to open large holographic panels for menus like the Ascension Grid, Core Attunement, and Weaver's Orrery.
-   [ ] **Add Neon Grid Floor:** Implement the transparent, glowing grid floor for the Command Deck so the player can see the battlefield below.

### **Phase 3: Full Gameplay Port**
Once the foundation is stable, the focus will shift to porting the rich content from the original game.
-   [ ] **Port Enemy & Boss AI:** Systematically re-implement the attack patterns and behaviors of all Aberrations from modules/bosses.js into 3D-aware components.
-   [ ] **Port Game Systems:** Port the core game systems like health, power-ups, leveling, and talents into the new 3D architecture.

---
## 4  Understanding the **Old 2‑D Game** (Blueprint)
> **Why this matters**  
> Codex and other automated tools rely on rich context to avoid mis‑mapping 2‑D concepts to 3‑D space.  
> This section distils **everything** about the original game’s UI, flow, and data model, with direct
> file references so you can jump to source instantly.

### 3.1 High‑level Architecture
| Layer | Responsibility | Key files |
|-------|----------------|-----------|
|**DOM (+ CSS)**|All visual UI (HUD, menus, modals).|Eternal‑Momentum‑OLD GAME/index.html, style.css|
|**Canvas 2‑D**|Realtime gameplay rendering.|gameLoop.js (draw & tick)|
|**Game Logic**|State machine, powers, bosses, talent maths.|state.js, powers.js, bosses.js, talents.js, ascension.js, cores.js, config.js|
|**Asset pipeline**|Sprites, emoji/procedural particles, SFX, music.|assets/* folders referenced in modules|

### 3.2 Start‑up & Flow
1. **Loading Screen** → fades when assets reach 100 % (#loading-screen div).  
2. **Home Screen** (#home-screen)  
   * Background MP4 (assets/home.mp4)  
   * Buttons: new-game-btn, continue-game-btn, erase-game-btn  
   * All buttons call startSpecificLevel() or show confirm modals.
3. **Gameplay Loop**  
   * Main loop in main.js → gameTick() (from gameLoop.js) every requestAnimationFrame.  
   * Stage progression via spawnBossesForStage() based on state.currentStage.
4. **Persistent Save**  
   * Serialised JSON in localStorage[ 'eternalMomentumSave' ] via savePlayerState() / loadPlayerState().

### 3.3 HUD & In‑game UI
| Cluster | Elements (DOM id / class) | Behaviour | File |
|---------|---------------------------|-----------|------|
|**Command Bar**|hud-group-powers, hud-group-center, hud-group-info|Fixed bottom overlay containing abilities, health, XP.|style.css (§COMMAND BAR)|
|  • Ability Slots|slot-off-0, slot-def-0, queue q-*|Drag‑&‑drop powers; flash on activation.|ui.js, powers.js|
|  • Core Socket|aberration-core-socket|Shows currently equipped Aberration Core.|ui.js, cores.js|
|  • Health & Shield|#health-bar-*, #shield-bar-overlay|Animated bars, sheen effect.|ui.js, gameLoop.js|
|  • Ascension Bar|#ascension-bar-*, AP label|XP toward next level; turns purple when full.|ascension.js|
|**Status Bars**|#status-effects-bar, #pantheon-buffs-bar|Emoji icons with timers.|ui.js|
|**Notification**|#unlock-notification|Animated banner for unlocks.|ui.js -> showUnlockNotification()|

### 3.4 Menus & Modals
| Modal | Shortcut | Purpose | Generating Module |
|-------|----------|---------|-------------------|
|**Ascension Grid**|A key / menu button|Passive talent tree; spend Ascension Points.|ascension.js|
|**Aberration Core Attunement**|C|Equip / unequip powerful cores that modify play.|cores.js|
|**Weaver’s Orrery**|O|Draft boss combinations for custom “Timelines”.|ui.js, main.js|
|**Stage Select**|L|Replay cleared stages at will.|ui.js|
|**Game Over**|auto|Restart, open Ascension, etc.|main.js|
|**Custom Confirm**|runtime|Reusable yes/no prompt.|ui.js|
|**Boss Info**|click boss banner|Lore & mechanics for each boss.|ui.js, bosses.js|

### 3.5 Core Gameplay Systems
* **Momentum Movement** – Player sprite attracted toward mouse (state.player.speed, easing in gameLoop.js lines 395‑410).  
* **Offensive / Defensive Powers** – Defined in powers.js, referenced by emoji and cooldown arrays.  
* **Aberration Cores** – Active + passive abilities (e.g. *Architect*, *Paradox*, *Vampire*). Logic in cores.js; current core saved on player object.  
* **Bosses & Aspects** – Data‑driven objects (bosses.js). Each boss can swap “aspects” at HP thresholds, altering behaviour.  
* **Talents / Ascension Grid** – Node graph in talents.js with colour‑coded constellations; UI rendered by ascension.js.  
* **Levelling & Unlocks** – XP curve in config.js (LEVELING_CONFIG), stage‑based unlock table THEMATIC_UNLOCKS.  
* **Particles & SFX** – Helper functions in utils.js and audio routing in audio.js.

### 3.6 File Quick‑Reference
| Feature | File(s) |
|---------|---------|
|Global game state, reset & save|modules/state.js|
|Main loop / rendering|modules/gameLoop.js, main.js|
|Power definitions & usage|modules/powers.js|
|Aberration Cores logic|modules/cores.js|
|Boss encyclopedia|modules/bosses.js|
|Talent grid|modules/talents.js, modules/ascension.js|
|HUD & Modals|index.html, modules/ui.js, style.css|
|Stage configuration table|modules/config.js|
|Math helpers & particles|modules/utils.js|
|Audio routing|modules/audio.js|

---
## Core Experience: Inside the Conduit

### 1. The Command Deck (Player Environment) THIS SHOULD NEVER ROTATE OR MOVE WITH THE PLAYER! The game will be played with room scale and moving elements in the command deck will make the user sick!
The player is positioned on a circular, floating **Command Deck** at the absolute center of the universe. This deck is your stationary anchor point. THIS SHOULD NEVER ROTATE OR MOVE! The game will be played with room scale and moving elements in the command deck will make the user sick!

* **360° Omniscience:** From your central vantage point, you can see every part of the battlefield.
* **Transparent Neon-Grid Floor:** The floor of your command deck is a transparent, luminous grid, styled to match the game's aesthetic.
* **Floating Console:** Your UI is a series of floating holographic panels and physical controls that hover at waist-height around you.
* **Recenter Option:** Press the new **Center** button or the `R` key to move the command deck back to your current position if you drift away.

### 2. The 3D Gameplay Arena (The Spherical Timeline)
The battlefield is the entire inner surface of a **massive, hollow sphere** that surrounds your Command Deck.

* **Native 3D Gameplay:** All gameplay elements—the Nexus, enemies, and projectiles—are native 3D objects.
* **Faithful Replication:** The behaviors and attack patterns from the original 2D game will be meticulously re-implemented in 3D.

### 3. The UI (Tactile & Holographic Interaction) THIS SHOULD NEVER ROTATE OR MOVE WITH THE PLAYER! The game will be played with room scale and moving elements in the command deck will make the user sick!
* **Holographic Menus:** Complex menus like the Ascension Grid appear as large, interactive holographic panels.
* **Physical Buttons:** Common actions are mapped to large, physical 3D buttons on the floating panels.
* **Holographic Status Display:** A projector displays floating, 3D icons of your equipped powers and a detailed hologram of your attuned **Aberration Core**.
* **Audio Controls:** The settings panel provides sliders for music and SFX volume.

### 4. Core Gameplay Loop & VR Control Scheme
* **Targeting on the Sphere:** Your hand controller projects a **cursor** onto the **inner surface of the gameplay sphere**.
* **Movement via Attraction:** The Nexus avatar is **not** directly controlled. It is constantly *attracted* towards your cursor's position, moving fluidly along the sphere's curved surface.
* **Activating Abilities:** Offensive powers fire towards your cursor, while defensive powers activate around the Nexus. Squeezing **both** triggers together activates your attuned Aberration Core ability.

---
## Telemetry & Privacy
Eternal Momentum VR can optionally record anonymous performance data such as average frame rate. Data is stored **only** in the browser's localStorage for local troubleshooting. Telemetry is **disabled by default** and can be enabled in the in‑game settings panel. A dedicated **Telemetry** panel on the command deck lists recent frame‑rate samples. No personal information is collected or transmitted anywhere.

---
### User Feedback from Testing
Recent playtesting revealed several issues that need to be addressed:

* loading screen hangs on 0% and looks nothing like the orginal games. ❌ Loading screen now uses the legacy progress bar and updates as assets load. Bar still never progresses to 100% and we never end up at the home screen!
* Console error - script.js:1235 Uncaught SyntaxError: missing ) after argument list
