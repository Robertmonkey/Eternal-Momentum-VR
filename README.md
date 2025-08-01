# Eternal Momentum VR – A 1-to-1 Mechanical Port

## Project Vision
Eternal Momentum VR is a full 3D re-imagining of the 2D browser game, **Eternal Momentum**. The goal of this project is a **1-to-1 mechanical port** that feels and plays identically to the original, while leveraging the immersion of virtual reality. Every power-up, boss mechanic, and progression system from the original JavaScript game has been faithfully recreated in a 3D environment.

## Current Status: Playable Refactor Complete
The initial, foundational refactor of the project is now complete. The game has been successfully transitioned from a broken 2D/3D hybrid into a stable, VR-native application. All major systems are now functional:
* **Player Control:** Reliable movement and interaction in VR.
* **Spawning:** Enemies, bosses, and power-ups spawn correctly.
* **UI:** All menus are functional, in-world 3D panels.
* **Boss Mechanics:** All 30 bosses from the original game have been implemented with their core mechanics adapted for 3D combat.

The game is now in a playable state, ready for testing, polish, and future development.

## Architectural Overview

The game is built on Three.js and a set of core architectural patterns designed for a robust VR experience:

1.  **3D Spherical Arena:** The entire game takes place on the inner surface of a large sphere. The player avatar stands on a semi-transparent, neon grid at the sphere's center, ensuring an unobstructed view of the action.

2.  **Centralized 3D State (`state.js`):** A single global `state` object serves as the single source of truth for all game logic. Critically, all positional data for the player, enemies, and other entities is stored as `THREE.Vector3` objects, ensuring all calculations are 3D-aware.

3.  **VR Player Control (`PlayerController.js`):** Player movement and aiming are handled via raycasting from a VR controller. The intersection point of the ray on the arena sphere becomes the avatar's target point. The system fully supports handedness settings to swap primary and off-hand controllers.

4.  **Modular Systems:** The game logic is broken down into managers for each core system:
    * **`PowerManager.js` & `CoreManager.js`**: High-level wrappers for activating player abilities.
    * **`UIManager.js`**: Manages the persistent Heads-Up Display (HUD).
    * **`ModalManager.js`**: Creates and manages all world-space UI panels and menus.
    * **`AssetManager.js`**: Handles the loading and caching of all game assets.

5.  **Component-Based AI (`modules/agents/`):** Each boss's unique logic is encapsulated in its own class file, which extends a common `BaseAgent`. This makes each boss self-contained and easier to debug or modify.

6.  **VR-Native UI:** All menus are rendered as 3D objects in world space, not as HTML overlays. This provides a crisp, immersive, and performant UI that feels native to the VR experience.

## Getting Started

1.  **Install Dependencies:** Ensure you have Node.js and npm installed. Run `npm install` in the project root.
2.  **Run the Game:** Execute `npm run dev` to launch the application. This will start a local server. Open the provided URL in a WebXR-compatible browser.
3.  **Enter VR:** Click the "Enter VR" button to start the session.

## Next Steps & Future Development

With the core refactor complete, development can now focus on polish and expansion:
* **Playtesting & Bug Fixing:** Thoroughly test all mechanics to find and fix minor bugs, timing issues, or unexpected interactions.
* **Performance Optimization:** Profile the application on target hardware (especially standalone headsets) and optimize where necessary (e.g., object pooling, draw call reduction).
* **VFX & SFX Polish:** Enhance the visual effects for powers, projectiles, and boss attacks to make the game more dynamic and visually appealing. Ensure all audio cues are correctly implemented and positioned.
* **UI/UX Refinements:** Polish menu layouts, add more visual feedback for button presses and interactions, and refine the feel of the scroll bars.
