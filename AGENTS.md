# AGENTS.md – Guidance for AI Agents

## Purpose and Scope

This file provides the primary technical directives for AI agents working on the **Eternal Momentum: Conduit Command VR** repository. It defines high-priority directives and architectural constraints that apply to all files in the directory tree. Direct user instructions always override the guidance contained here.

## Project Overview

The goal is to build a new, native 3D VR game based on the vision in `README.md`. The original 2D game, located in `/Eternal-Momentum-OLD GAME/`, serves as a **highly detailed blueprint and specification**, not a live engine.

---

## Current Beta Test Feedback & Issues (Updated July 2025)

This section lists the current known issues with the prototype. Your immediate priority is to resolve these issues. **This section must be updated with any new user feedback received.**

1.  **Incorrect UI Layout:**
    * **Issue:** The UI panels are currently stacked on top of each other in a single location.
    * **Required Fix:** The panels must be arranged in a wrap-around "command cluster" on the player's console, as seen in the original game's UI. They should be spread out and easily readable.

2.  **Incorrect Entity Spawning:**
    * **Issue:** The player's avatar (the Conduit/Nexus) and all power-ups are spawning directly on the player's Command Deck, not on the external gameplay sphere.
    * **Required Fix:** All gameplay entities (player avatar, enemies, power-ups) **must** spawn and exist only on the inner surface of the large, external sphere. The Command Deck is for the player and UI only. No gameplay should occur on the deck itself.

3.  **Incorrect Button Styling:**
    * **Issue:** The interactive buttons for opening menus are generic panels.
    * **Required Fix:** The buttons must be modeled and styled to look like the physical, glowing buttons from the original game's UI. Reference the original `style.css` and game screenshots for their design.

4.  **Non-Functional Menus:**
    * **Issue:** Clicking the menu buttons (e.g., "Ascension," "Cores") does not open the corresponding menus.
    * **Required Fix:** Implement the functionality so that clicking a menu button opens the correct UI panel from the original `index.html` as a large, interactive holographic screen in front of the player.

5.  **Broken VR Layout and Gameplay:**
    * **Issue:** Upon entering VR, all UI elements and command deck pieces appear high above the player's head with scattered blue cylinders. These cylinders behave as unlabeled buttons that drop when touched and then float into the player's position, stacking on one another. The Aberration Core sphere is visible before any cores are unlocked, the player cannot move across the battlefield, and the stage never begins.
    * **Required Fix:** Anchor the command deck and UI relative to the player's camera so they sit at waist level, keep the placeholder buttons from drifting, hide the Aberration Core model until a core is unlocked, automatically start a valid stage when VR begins, and ensure the battle sphere registers pointer input for movement.

6.  **Gameplay Stability Concerns:**
    * **Issue:** Recent feedback reports that the game is still largely unplayable. The current build cannot start a level, lacks enemy spawns or power-up pickups, and the player cannot move the Nexus across the sphere.
    * **Required Fix:** Continue addressing bugs and ensure the default VR entry always launches a playable stage with functional controls, including movement, enemies, bosses, and power-ups.

7.  **UI Aesthetic Mismatch:**
    * **Issue:** All visible panels and buttons do not resemble the original game's UI. The blue cylinders are oversized, unlabeled, and clash with the intended design.
   * **Required Fix:** Replace temporary geometry with properly sized, glowing buttons and panels that match the style defined in `style.css` and game screenshots.

8.  **Ongoing Beta Feedback (July 27, 2025):**
   * **Issue:** A tester reports that despite recent commits, the UI panels remain stacked and gameplay still fails to start correctly in VR. They are skeptical that previous fixes had any effect.
   * **Action:** Re-examine the UI layout logic and stage initialization code. Ensure that panels are positioned around the command deck on load and that a valid stage launches automatically when entering VR.

9.  **UI Panel Redesign Request (July 2025):**
   * **Issue:** Testers want the command cluster and boss health bar from the original game recreated as floating panels. Menu buttons should be physical, emoji-labeled controls that open their respective holographic panels.
   * **Action:** Style the VR panels and buttons to match the 2D UI aesthetic, showing power-up slots, the Aberration Core, and boss health bars with the same look and feel.

10.  **Missing Grid Floor (July 2025):**
    * **Issue:** Testers note the command deck still lacks the promised neon grid floor.
    * **Action:** Add a transparent grid floor beneath the command deck using the gridCanvas texture so players can see space below.

11.  **Button Drift Feedback (July 2025):**
    * **Issue:** Some testers report the console buttons are unlabeled and appear to jump toward the player when pressed instead of opening their menus.
    * **Action:** Ensure each button has a clear emoji label, stays anchored to the command deck, and toggles its corresponding holographic panel without moving.

---

## Core Directives for AI-Generated Code

### 1. Architecture: Port and Re-implement
Your primary architectural task is to **port the game logic** from the original 2D JavaScript files into a new, 3D-native VR architecture. You have the freedom to create new modules and refactor the VR-side code as necessary. The original game's files in `/Eternal-Momentum-OLD GAME/` are a **read-only reference**.

### 2. Gameplay World Geometry (CRITICAL)
The implementation must follow this specific spatial model:
-   The player is on a **stationary, floating Command Deck** at the origin (0, 0, 0).
-   The deck's floor must be a **transparent neon grid**, allowing a view of the space below.
-   The gameplay arena is the **inner surface of a large, hollow sphere** centered around the player.

### 3. Coordinate Mapping & Control (CRITICAL)
-   **Control:** The VR controller's pointer projects a cursor by raycasting against the inner surface of the gameplay sphere.
-   **Coordinate System:** The 2D `(x, y)` concepts from the original game must be re-interpreted for a spherical space. When porting logic, you will need to map these concepts to 3D vectors and spherical coordinates.
-   **Movement Mechanic:** The player's avatar (Nexus) must **not** snap to the cursor. It must be attracted to it using the smoothing formula from the original `gameLoop.js` (lines 401-404). Re-implement this with 3D vector math for fluid movement along the sphere's inner surface.

### 4. Asset & Aesthetic Mandate
-   **Theme:** All new 3D assets (models, UI, effects) must match the dark, neon-glow aesthetic of the original game. Reference `style.css` for the exact color palette.
-   **Assets:** Use existing audio from `/assets/`. Create new 3D models based on the original 2D sprites.

### 5. Development Task Checklist
-   [x] **Environment:** Implement the central Command Deck and outer gameplay sphere.
-   [x] **Controls:** Implement spherical raycasting for the cursor.
-   [x] **Avatar & Movement:** Re-implement the "Momentum" movement system natively in 3D.
-   [ ] **Enemies & AI:** Begin porting the AI and attack patterns of enemies from `modules/bosses.js` into new, 3D-aware components.
-   [x] **UI:** Build the floating UI panels, physical buttons, and holographic status displays.
-   [ ] **Systems:** Port the core game systems like health, power-ups, and leveling into the new 3D architecture.
