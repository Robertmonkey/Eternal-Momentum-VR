# Eternal Momentum: Conduit Command VR

## Project Vision & Directive

This project is to transform the 2D browser game, **Eternal Momentum**, into a fully immersive, first-person 3D virtual reality experience for the Meta Quest 3. This repository contains the complete source code of the original 2D game, which will serve as the **blueprint** for a new, native 3D VR implementation.

The core fantasy is that the player **is the Conduit**, floating at the very center of a massive, spherical reality. From a central command deck, they have a complete 360-degree view of the battlefield as it wraps around them in every direction.

---
## The Core Experience: Inside the Conduit

### 1. The Command Deck (Player Environment)

The player is positioned on a circular, floating **Command Deck** at the absolute center of the universe. This deck is your stationary anchor point from which you command the battle.

* **360° Omniscience:** From your central vantage point, you can see every part of the battlefield. Action can happen above, below, in front, and behind you, eliminating blind spots and creating a true sense of tactical oversight.
* **Transparent Neon-Grid Floor:** The floor of your command deck is a transparent, luminous grid, styled to match the game's aesthetic. This allows you to look directly down and see the combat unfolding beneath your feet, ensuring you never lose track of the action.
* **Floating Console:** Your UI is a series of floating holographic panels and physical controls that hover at waist-height around you, ensuring your view of the battle is never obstructed.

---
### 2. The 3D Gameplay Arena (The Spherical Timeline)

The battlefield is the entire inner surface of a **massive, hollow sphere** that surrounds your Command Deck.

* **Native 3D Gameplay:** All gameplay elements—the player's avatar (the Nexus), enemies, bosses (Aberrations), and projectiles—are native 3D objects with 3D behaviors, physics, and animations.
* **Spherical Battlefield:** All entities move and fight along the curved, inner wall of the sphere, creating a unique and dynamic combat environment.
* **Faithful Replication:** The behaviors, attack patterns, and core mechanics of all enemies and player abilities will be meticulously re-implemented in 3D to match the design of the original 2D game.

---
### 3. The UI (Tactile & Holographic Interaction)

Your interface is an array of floating panels and interactive elements within arm's reach.

* **Holographic Menus:** Complex menus like the Ascension Grid and the Weaver's Orrery appear as large, interactive holographic panels that you can manipulate with your controller's pointer.
* **Physical Buttons:** Common actions are mapped to large, physical 3D buttons on the floating panels, which visually depress and glow when activated.
* **Holographic Status Display:** For at-a-glance information, a holographic projector displays floating, 3D icons of your equipped powers. At its center is a larger, detailed hologram of your attuned **Aberration Core**, which dynamically changes its appearance based on which core is equipped.

---
## Core Gameplay Loop & VR Control Scheme

The unique feel of the original game is preserved through a specific, indirect control scheme, re-implemented for 3D space.

#### The Player's Role: The Commander

You are a stationary commander at the heart of the sphere. You do not move. You command your avatar remotely, using your VR controllers as targeting instruments.

#### The Control Scheme: Guiding the Nexus

1.  **Targeting on the Sphere:** Your hand controller projects a **cursor** onto the **inner surface of the gameplay sphere**. This is the target point for all movement and offensive abilities.
2.  **Movement via Attraction (The "Momentum" Mechanic):** The Nexus avatar is **not** directly controlled. It is constantly *attracted* towards your cursor's position, moving fluidly along the sphere's curved surface.
    * **How it Works:** This mechanic must be re-implemented natively in 3D, replicating the feel of the original 2D formula:
        `new_position = current_position + (cursor_position - current_position) * 0.015 * speed_modifier`
    * **The "Feel":** This creates the signature, fluid chase motion. The Nexus will always be trying to catch up to your cursor, giving it a sense of weight and momentum.
3.  **Activating Abilities:** All abilities originate from the Nexus avatar on the spherical wall. Offensive powers fire towards your cursor's location, while defensive powers activate in an area around the Nexus.

---
## Directive for AI-Assisted Development

This README serves as the primary brief for AI development tools. Your core task is to **port and re-implement** the 2D game's logic and mechanics into a native 3D VR architecture that realizes the vision above.

### Your Workflow:

1.  **Analyze the Blueprint:** The `Eternal-Momentum-OLD GAME/` directory is your **blueprint and design document**. You must analyze its modules to perfectly understand and replicate the game's mechanics, rules, and aesthetic.
    * `modules/bosses.js` and `modules/powers.js`: Define the required behaviors for enemies and abilities.
    * `modules/state.js` and `modules/talents.js`: Define the necessary data structures and progression systems.
    * `style.css`: Contains the color variables and aesthetic style to be recreated in 3D materials.

2.  **Build a Native VR Engine:** You have the freedom to write and structure new JavaScript files (`script.js`, new modules, etc.) as needed to build a robust, 3D-native game. You are not merely bridging the old engine; you are building a new one based on its specifications.
    * Create a 3D-aware state management system.
    * Implement 3D vector math for movement and physics.
    * Write new functions for handling 3D collisions and effects.

3.  **Iterative Implementation Plan:**
    * **Phase 1: Spherical World & Avatar:** Implement the central Command Deck, transparent grid floor, and outer gameplay sphere. Re-implement the "Momentum" movement system natively in 3D, allowing the avatar to follow a cursor along the sphere's inner surface.
    * **Phase 2: Port Core Mechanics:** Begin porting the logic for basic enemies, projectiles, and power-ups from the original modules into new, 3D-aware functions.
    * **Phase 3: Floating UI & Controls:** Implement the floating UI panels with physical buttons and the holographic status displays.
    * **Phase 4: Port Complex Systems:** Re-implement the more complex systems, such as the Ascension Grid logic and the unique behaviors of the first few Aberration Cores and Bosses.
    * **Phase 5: Full Asset Conversion:** Systematically replace all placeholder geometry with high-quality, stylized 3D models and particle effects that are thematically consistent with the original 2D game's art.

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
