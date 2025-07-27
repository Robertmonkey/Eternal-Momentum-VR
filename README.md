# Eternal Momentum: Conduit Command VR

## Project Vision & Directive

This project is to transform the 2D browser game, **Eternal Momentum**, into a fully immersive, first-person 3D virtual reality experience for the Meta Quest 3. The current repository contains an early prototype and the complete, functional source code of the original 2D game. The primary directive for all future development is to evolve the prototype into the vision detailed below, using the original game's logic as the foundational engine.

The core fantasy is that the player **is the Conduit**, standing directly on the battlefield. A luminous neon grid floor hovers above the action, letting the player see the combat space below and project a cursor through the grid to command movement.

---
## The Core Experience: Inside the Conduit

### 1. The Battlefield (Player Environment)

The Conduit now fights on the ground. The immediate surroundings are still futuristic, but the bulky command deck is gone. Instead the player stands atop the neon grid floor, with UI panels floating nearby styled in the familiar dark and glow aesthetic defined in `style.css`.

* **Ground-Level View:** The player's perspective is on the same plane as the action. The cursor from the VR controller projects through the grid to set movement targets just like the 2D game.
* **Floating Console Panels:** Status readouts and buttons remain, hovering around the player for quick access. They still glow and depress when interacted with.

---
### 2. The 3D Gameplay Arena (The Timeline Projection)

The battlefield now spans a much larger area. A transparent neon grid plane floats just above it, serving as the player's ground. The VR pointer passes through this grid so clicks register on the battlefield plane underneath.

* **Full 3D Conversion:** All gameplay elements—the player's avatar (the Nexus), enemies, bosses (Aberrations), and projectiles—must be rendered as 3D objects.
* **State-Driven Rendering:** The positions, animations, and behaviors of these 3D objects will be directly driven by the original game's state object (`state` from `modules/state.js`). The `gameTick` function will read the `x`, `y` coordinates from the 2D logic and translate them into `x`, `y`, `z` positions in the 3D A-Frame scene.
* **Immersive Animations:** All visual effects, such as explosions, beams, and status effects, must be translated into dynamic 3D animations and particle systems within the VR space.

---
### 3. The UI Console (Tactile Interaction)

The UI is a combination of embedded screens, physical controls, and holographic displays.

* **Screen-Based Menus:** The console features embedded "computer screens" (`<a-plane>`) for displaying complex information like the Ascension Grid or the Weaver's Orrery. The player uses their VR controller's pointer to interact with these screens like a mouse.
* **Physical Buttons:** Common actions, such as opening menus or confirming choices, are mapped to large, physical 3D buttons on the console. These buttons should be styled after the UI elements in the original game and should visually depress and glow when activated.
* **Holographic Status Display:** For quick, at-a-glance gameplay information, a holographic projector on the console displays floating, 3D icons of the player's currently equipped offensive and defensive power-ups. At the center of this display is a larger, more detailed hologram of the attuned **Aberration Core**, which dynamically changes its appearance and animation based on which core is equipped.

---
## Directive for AI-Assisted Development

This README serves as the primary brief for AI development tools (e.g., ChatGPT Codex). Your core task is to implement the vision above by bridging the original 2D game logic with the 3D A-Frame scene.

### Your Workflow:

1.  **Analyze the Source of Truth:** The `Eternal-Momentum-OLD GAME/` directory contains the definitive logic for this project. Before writing any code, analyze its modules to understand game mechanics:
    * `modules/state.js`: Defines the structure of the entire game state. All 3D rendering will be a visualization of this object.
    * `modules/gameLoop.js`: Contains the core `gameTick` function that updates the state.
    * `modules/bosses.js`: Details the unique AI, attacks, and phases for every Aberration.
    * `modules/powers.js`, `modules/cores.js`, `modules/talents.js`: Define all player abilities and progression systems.
    * `style.css`: Contains the color variables (`--primary-glow`, `--secondary-glow`, etc.) and general aesthetic that the 3D environment **must** adhere to.

2.  **Bridge, Don't Rewrite:** Do not modify the original game logic files. The VR `script.js` is the **bridge**. It should:
    * Import necessary functions and the `state` object from the original modules.
    * Run the `gameTick` in its animation loop.
    * Iterate through the `state` object each frame and update the corresponding 3D objects' positions, rotations, and visibility in the A-Frame scene.
    * Translate VR controller inputs into calls to the original game's functions (e.g., `usePower()`, `activateCorePower()`).

3.  **Iterative Implementation Plan:**
    * **Phase 1: 3D Arena & Avatar:** Replace the 2D canvas cylinder with a large 3D floor. Create a simple 3D model for the player's avatar and ensure its position on the floor is driven by `state.player.x` and `state.player.y`.
    * **Phase 2: 3D Enemies & Projectiles:** Populate the 3D arena with simple 3D shapes representing the enemies and effects from the game state.
    * **Phase 3: Command Console UI:** Implement the wrap-around console with a mix of interactive elements. Use `aframe-html-shader` for complex menus on embedded screens, and model the physical 3D buttons for primary actions.
    * **Phase 4: Holographic Displays:** Create the central holographic display. Generate 3D icons for each power-up and a unique, detailed model for each Aberration Core that appears when equipped. Ensure these holograms update in real-time.
    * **Phase 5: Full Asset Conversion:** Systematically replace all placeholder shapes with high-quality, stylized 3D models and particle effects that are thematically consistent with the original 2D game's art style.

---
## Development & Testing Workflow

### Prerequisites

* A VR headset with WebXR support (e.g., Meta Quest 3).
* Node.js (for local testing).

### Live Testing on Headset (GitHub Pages) 🚀

This is the primary method for testing on the target device.

1.  **Push Changes:** Commit and push your code changes to a new branch on GitHub.
2.  **Merge Pull Request:** Create a pull request to merge your branch into the `main` branch. Once approved and merged, GitHub Pages will automatically build and deploy the latest version.
3.  **Test in VR:** Open the project's GitHub Pages URL in your Meta Quest browser. Refresh the page to load the new updates.

### Local Development 💻

For faster iteration, you can run a local web server.

1.  Navigate to the project's root directory in your terminal.
2.  Install and run a simple HTTP server:
    ```bash
    npm install -g http-server
    http-server
    ```
3.  Open the provided local URL (e.g., `http://127.0.0.1:8080`) in a WebXR-compatible browser on your PC or headset.
