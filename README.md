# Eternal Momentum: Conduit Command VR

## Project Vision & Directive

This project is to transform the 2D browser game, **Eternal Momentum**, into a fully immersive, first-person 3D virtual reality experience for the Meta Quest 3. This repository contains the complete source code of the original 2D game, which will serve as the **blueprint** for a new, native 3D VR implementation.

The core fantasy is that the player **is the Conduit**, floating at the very center of a massive, spherical reality. From a central command deck, they have a complete 360-degree view of the battlefield as it wraps around them in every direction.

---
## Current Status: Critical Refactor in Progress

**The current VR prototype is considered non-functional and is undergoing a complete overhaul to address critical bugs.** Beta testing has revealed significant issues with the UI, core gameplay loop, and VR implementation that make the game unplayable.

The immediate goal is to refactor the codebase to be VR-native, using the original 2D game as a strict visual and logical specification rather than a live engine.

---
## Development Roadmap

This project will be developed in phases to ensure a stable and playable experience.

### **Phase 1: Foundational Fixes (Highest Priority)**
The goal of this phase is to make the game launch correctly and be minimally playable.
-   [ ] **Fix VR Layout:** Anchor the Command Deck and all UI elements correctly relative to the player's view at waist level.
-   [ ] **Correct Entity Spawning:** Ensure all gameplay entities (Nexus, enemies, power-ups) spawn and exist **only** on the inner surface of the outer gameplay sphere, not on the player's deck.
-   [ ] **Implement 3D "Momentum" Movement:** Re-implement the signature Nexus movement system in 3D, where the avatar is smoothly attracted to the controller's cursor on the sphere's surface.
-   [ ] **Reliable Stage Start:** Ensure a valid stage with functional controls, enemies, and bosses automatically begins upon entering VR.

### **Phase 2: UI/UX Overhaul**
This phase focuses on rebuilding the UI to match the vision of a tactile, holographic command center.
-   [ ] **Build the Command Cluster:** Arrange all UI panels in a wrap-around console, referencing the layout of the original 2D game's interface.
-   [ ] **Create Physical Buttons:** Replace all placeholder UI elements with properly modeled and styled 3D buttons that look and feel like the glowing buttons from the original game.
-   [ ] **Implement Holographic Menus:** Implement the functionality for buttons to open large holographic panels for menus like the Ascension Grid, Core Attunement, and Weaver's Orrery.
-   [ ] **Add Neon Grid Floor:** Implement the transparent, glowing grid floor for the Command Deck so the player can see the battlefield below.

### **Phase 3: Full Gameplay Port**
Once the foundation is stable, the focus will shift to porting the rich content from the original game.
-   [ ] **Port Enemy & Boss AI:** Systematically re-implement the attack patterns and behaviors of all Aberrations from `modules/bosses.js` into 3D-aware components.
-   [ ] **Port Game Systems:** Port the core game systems like health, power-ups, leveling, and talents into the new 3D architecture.

---
## Core Experience: Inside the Conduit

### 1. The Command Deck (Player Environment)
The player is positioned on a circular, floating **Command Deck** at the absolute center of the universe. This deck is your stationary anchor point.

* **360° Omniscience:** From your central vantage point, you can see every part of the battlefield.
* **Transparent Neon-Grid Floor:** The floor of your command deck is a transparent, luminous grid, styled to match the game's aesthetic.
* **Floating Console:** Your UI is a series of floating holographic panels and physical controls that hover at waist-height around you.

### 2. The 3D Gameplay Arena (The Spherical Timeline)
The battlefield is the entire inner surface of a **massive, hollow sphere** that surrounds your Command Deck.

* **Native 3D Gameplay:** All gameplay elements—the Nexus, enemies, and projectiles—are native 3D objects.
* **Faithful Replication:** The behaviors and attack patterns from the original 2D game will be meticulously re-implemented in 3D.

### 3. The UI (Tactile & Holographic Interaction)
* **Holographic Menus:** Complex menus like the Ascension Grid appear as large, interactive holographic panels.
* **Physical Buttons:** Common actions are mapped to large, physical 3D buttons on the floating panels.
* **Holographic Status Display:** A projector displays floating, 3D icons of your equipped powers and a detailed hologram of your attuned **Aberration Core**.

### 4. Core Gameplay Loop & VR Control Scheme
* **Targeting on the Sphere:** Your hand controller projects a **cursor** onto the **inner surface of the gameplay sphere**.
* **Movement via Attraction:** The Nexus avatar is **not** directly controlled. It is constantly *attracted* towards your cursor's position, moving fluidly along the sphere's curved surface.
* **Activating Abilities:** Offensive powers fire towards your cursor, while defensive powers activate around the Nexus. Squeezing **both** triggers together activates your attuned Aberration Core ability.
