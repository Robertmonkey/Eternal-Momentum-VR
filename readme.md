# Eternal Momentum VR Port

## Project Overview

This project is a VR interpretation of the 2D game "Eternal Momentum." The core goal is to preserve the original gameplay experience and aesthetic while translating the game into an immersive VR environment. This includes replicating the menus, art style, and core mechanics in 3D.

### Core Gameplay Concept

The player stands on a circular neon grid, fighting off waves of enemies and bosses. The player's left hand has a menu attached for quick access to game functions. The right hand acts as a pointer, similar to the mouse in the 2D version, to navigate and interact with the game world projected on a massive sphere surrounding the player. The trigger and grip buttons on the VR controller will be used for primary and secondary power-ups.

### Key Features to Preserve from 2D Original

* **Menus:** All menus should be nearly identical to the 2D version in terms of verbiage and layout.
* **Bosses and Enemies:** The 2D shapes of bosses and enemies (e.g., circles) should be translated into 3D spheres. The "glitch" enemy should be animated as swirling cubes.
* **Power-ups:** All power-ups need 3D animations.
* **Gameplay Experience:** The overall gameplay loop and feel should be as close to the original as possible.

## Current State of the Prototype

The current prototype is in a very early and buggy state. Many of the core features are either not implemented or not working correctly. This document, along with the `agent.md` file, will serve as a guide for the development team and any automated coding agents to address the current issues and bring the game closer to the intended vision.

## Known Issues

* **Enemy AI and Pathfinding:** Bosses and enemies lose tracking and move towards the poles of the spherical game area. This is a persistent bug that needs to be addressed.
* **UI/HUD:**
    * Power-up emojis are not appearing in the inventory slots on the HUD when collected.
    * Menus are not functional and do not resemble the 2D game's menus.
* **Power-ups:**
    * Power-ups are not working.
    * The missile power-up is broken, which is blocking progress and testing of other power-ups.
* **Animations:** All animations need to be interpolated for VR. The work started on the missile animation is not functional.
* **Sizing:** Bosses, enemies, and the player appear too small in the game. Their size needs to be increased by 30%. Power-ups are the correct size.
