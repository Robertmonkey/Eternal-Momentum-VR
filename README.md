# README.md - Eternal Momentum VR Port Specification (Updated)

## Project Overview & Vision

This document outlines the technical specifications for **Eternal Momentum VR**, a direct, 1-to-1 mechanical port of the 2D JavaScript browser game "Eternal Momentum." The project's goal is to recreate the original game's mechanics, features, and art style with absolute fidelity in a 3D virtual reality environment for the Meta Quest 3.

The technological foundation for this port will be **three.js** and the **WebXR API**.

The core VR vision is as follows:
* **Environment**: The player is positioned on a static, central platform within a massive, hollow sphere. The entire gameplay area is the inner surface of this sphere.
* **Controls**: The player wields a laser pointer with their right-hand controller. This pointer dictates the target location for their avatar, which moves along the sphere's inner surface.
* **Art Style**: The original's minimalist, geometric art style will be preserved. 2D shapes will be translated into their 3D equivalents (e.g., circles become spheres, squares become cubes, lines become cylinders or beams).
* **User Interface**: All UI elements, including the HUD and menus, will be rendered as holographic panels floating in the space around the player.

**Primary Mandate**: There shall be no deviation from the original game's mechanics. All systems, including power-ups, boss behaviors, and meta-progression, must function exactly as defined in the source JavaScript code.

---

## Development Progress

The Fidelity Patch is underway. The VR scene now renders correctly with lighting and textures, and the avatar moves using vector-based coordinates. A basic holographic HUD and interactive modals are functional, and most bosses now have dedicated 3D AI. Remaining tasks include mirroring the legacy HUD, stripping the last canvas code and finalizing the state refactor. See **AGENTS.md** for full status.


## Player Experience & Game Flow

The application follows a distinct set of states, from initial loading to gameplay and menu interaction.

### Application States
1.  **Loading Screen**: Displays asset loading progress.
2.  **Home Screen**: The main menu, offering to start a new game, continue a saved one, or erase progress.
3.  **In-Game**: The core gameplay loop where the player fights through stages against enemies and bosses.
4.  **Game Over / Stage Cleared**: Upon player death, a "Timeline Collapsed" menu appears. Upon clearing all bosses in a stage, the game transitions to the next stage, granting unlocks and rewards.
5.  **Menus**: The player can pause the active game to access several holographic menus:
    * **Stage Select**: Browse and select unlocked stages.
    * **Ascension Conduit**: Spend Ascension Points (AP) on permanent meta-progression talents.
    * **Aberration Core Attunement**: Equip a powerful "ultimate" ability derived from a defeated boss.

### VR Control Scheme
* **Right Controller (Laser Pointer)**:
    * **Aiming**: The laser pointer's endpoint on the sphere's inner surface determines the player avatar's destination. The avatar will constantly move toward this point.
    * **UI Interaction**: Used as a standard point-and-click cursor for all holographic menus.
* **Right Controller (Buttons)**:
    * **Trigger (Primary Action)**: Use the currently equipped **Offensive Power**.
    * **Grip (Secondary Action)**: Use the currently equipped **Defensive Power**.
    * **Simultaneous Trigger + Grip**: Activate the attuned **Aberration Core** ability.

---

## Software Architecture (three.js)

The VR application will be built using a modular manager-based architecture to cleanly separate concerns.

* **`GameManager`**: The central controller. It initializes the game, manages the main `requestAnimationFrame` loop, handles state transitions (e.g., from menu to game), and coordinates all other managers.
* **`PlayerController`**: This module is responsible for all VR-specific player interactions. It reads input from the Meta Quest 3 controllers, manages the laser pointer, translates controller inputs into game actions (movement, power-up usage), and updates the player avatar's position and state.
* **`UIManager`**: Manages the creation, display, and interaction logic for all holographic UI elements. This includes the main HUD, the Stage Select grid, the Ascension talent tree, and all other modal windows.
* **`AgentManager`**: Handles the entire lifecycle of all non-player entities. It is responsible for spawning, updating AI, managing movement patterns, and despawning all enemies (bosses and minions) based on the specifications in **[AGENTS.md](./AGENTS.md)**.
* **`ProjectileManager`**: Manages all projectiles, both from the player and enemies. It handles their creation, trajectory, collision detection against agents and the environment, and destruction.
* **`AudioManager`**: Controls the loading and playback of all audio assets. It manages background music transitions, triggers sound effects for in-game events (e.g., attacks, power-up collection, UI interactions), and implements spatial audio to enhance immersion.
* **`AssetManager`**: Responsible for loading all necessary game assets, including 3D models (for agents and projectiles), textures, and sound files. It provides a centralized point of access for other managers to retrieve these assets.

---

## Original Game Feature Deep Dive

This section provides a high-level overview of the core player-facing systems from the original game. For a complete and exhaustive mechanical breakdown of every power-up, core, and talent, refer to the master catalog: **[FEATURES.md](./FEATURES.md)**.

* **Power-up System**: Throughout gameplay, the player collects temporary abilities that are sorted into Offensive and Defensive inventories. These provide a wide range of effects, from shields and healing to powerful attacks like chain lightning and orbital strikes.

* **The Core System**: Upon reaching certain levels, the player unlocks the ability to attune an Aberration Core. These Cores grant powerful, persistent passive abilities and, in some cases, a unique active "ultimate" ability, which are derived from the game's bosses.

* **Meta-Progression**: Between runs, the player can spend Ascension Points (AP) in the Ascension Conduit. This unlocks permanent, passive upgrades from a talent grid, enhancing stats like health, speed, and damage, or augmenting the effects of specific power-ups.

---

## User Bug Report & Verification Log

| Report ID | Date | User/QA | Feature Area | Description of Issue | Status | Verification Notes |
| :-------- | :--- | :------ | :----------- | :------------------- | :----- | :----------------- |
|           |      |         |              |                      |        |                    |
