# AGENTS.md – Guidance for AI Agents

## Purpose and Scope

This file provides the primary technical directives for AI agents working on the **Eternal Momentum: Conduit Command VR** repository. It defines high-priority directives and architectural constraints that apply to all files in the directory tree. Direct user instructions always override the guidance contained here.

## Project Overview

The goal is to build a new, native 3D VR game based on the vision in `README.md`. The original 2D game, located in `/Eternal-Momentum-OLD GAME/`, serves as a **highly detailed blueprint and specification**, not a live engine.

## Core Directives for AI-Generated Code

### 1. Architecture: Port and Re-implement
Your primary architectural task is to **port the game logic** from the original 2D JavaScript files into a new, 3D-native VR architecture using A-Frame. You have the freedom to create new modules and refactor the VR-side code as necessary to achieve this. The original game's files in `/Eternal-Momentum-OLD GAME/` are a **read-only reference**.

### 2. Gameplay World Geometry (CRITICAL)
The implementation must follow this specific spatial model:
-   The player is on a **stationary, floating Command Deck** at the origin (0, 0, 0).
-   The deck's floor must be a **transparent neon grid**, allowing a view of the space below.
-   The gameplay arena is the **inner surface of a large, hollow sphere** centered on the player.

### 3. Coordinate Mapping & Control (CRITICAL)
-   **Control:** The VR controller's raycaster must target the inner surface of the gameplay sphere to position the cursor.
-   **Coordinate System:** The 2D `(x, y)` concepts from the original game must be re-interpreted for a spherical space. When porting logic, you will need to map these concepts to 3D vectors and spherical coordinates (`radius`, `theta`, `phi`).
-   **Movement Mechanic:** The player's avatar (Nexus) must **not** snap to the cursor. Re-implement the "attraction" formula from the original `gameLoop.js` (lines 401-404) using 3D vector math to create a fluid chase-and-follow behavior along the sphere's inner surface.
    `// Pseudocode for 3D vector implementation`
    `let direction = cursor_position.clone().sub(avatar_position).normalize();`
    `let velocity = direction.multiplyScalar(distance_to_cursor * 0.015 * speed_modifier);`
    `avatar.position.add(velocity);`

### 4. Asset & Aesthetic Mandate
-   **Theme:** All new 3D assets (models, UI, effects) must match the dark, neon-glow aesthetic of the original game. Reference `style.css` for the exact color palette (e.g., `--primary-glow`).
-   **Assets:** Use existing audio from `/assets/`. Create new 3D models based on the original 2D sprites.

### 5. Development Task Checklist
-   [ ] **Environment:** Implement the central Command Deck and outer gameplay sphere.
-   [ ] **Controls:** Implement spherical raycasting for the cursor.
-   [ ] **Avatar & Movement:** Re-implement the "Momentum" movement system natively in 3D for the avatar on the sphere's surface.
-   [ ] **Enemies & AI:** Begin porting the AI and attack patterns of enemies from `modules/bosses.js` into new, 3D-aware components.
-   [ ] **UI:** Build the floating UI panels, physical buttons, and holographic status displays.
-   [ ] **Systems:** Port the core game systems like health, power-ups, and leveling into the new 3D architecture.
