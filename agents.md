# Agent Task Instructions: Eternal Momentum VR Port

## Objective

Your primary objective is to fix the issues in the "Eternal Momentum VR" prototype and implement the features described in the `readme.md` file. Your goal is to make the VR version of the game as faithful as possible to the original 2D version, with the necessary adaptations for an immersive VR experience.

## Instructions for the Agent

Before you begin, create a file named `task_log.md` in the root directory of the project. Use this file to track the status of each task listed below. Update the status of each task to "In Progress," "Completed," or "Blocked" as you work on them.

**The original 2D game's files are located in the `2d_game_source` directory. You can and should reference these files as a source of truth when in doubt about how any mechanics should work.**

### Task 1: Fix Core Gameplay Bugs

1.  **Enemy and Boss Tracking:**
    * **Issue:** Enemies and bosses lose tracking and move towards the poles of the spherical game area.
    * **Files to investigate:** `modules/enemyAI3d.js`, `modules/movement3d.js`, and all files in `modules/agents/`.
    * **Action:** Debug the enemy and boss movement logic to ensure they correctly track the player and stay within the intended play area. The issue might be related to how polar coordinates are handled in the 3D space.

2.  **Power-up Functionality:**
    * **Issue:** Power-ups are not working, with the missile power-up being a known blocker.
    * **Files to investigate:** `modules/powers.js`, `modules/PowerManager.js`, `modules/ProjectileManager.js`, and `tests/missileFireball.test.js`.
    * **Action:**
        1.  Start by debugging the missile power-up. Get it to a functional state where it can be fired and interacts with enemies.
        2.  Once the missile is working, systematically go through each power-up defined in `modules/powers.js` and ensure they are all functional in the 3D environment.
        3.  Make sure the power-ups are triggered correctly by the VR controller's trigger and grip buttons as described in the `readme.md`.

### Task 2: Implement and Refine 3D Assets and Animations

1.  **3D Models and Animations:**
    * **Issue:** Bosses are simple shapes and need to be more like their 2D counterparts but in 3D, and all power-ups and enemies need 3D animations. The "glitch" should be animated as swirling cubes.
    * **Files to investigate:** `modules/agents/`, `modules/powers.js`, `vrMain.js`.
    * **Action:**
        1.  For each boss and enemy, create a 3D spherical representation.
        2.  Implement animations for all bosses, enemies, and power-ups. For the "glitch," create a swirling cube animation.
        3.  Ensure all animations are interpolated for a smooth VR experience.

2.  **Sizing:**
    * **Issue:** Bosses, enemies, and the player are 30% smaller than desired.
    * **Files to investigate:** `modules/agents/`, `PlayerController.js`.
    * **Action:** Increase the scale of the player, boss, and enemy models by 30%.

### Task 3: Rebuild and Perfect the UI

1.  **Menus:**
    * **Issue:** The menus are not functional and do not look like the 2D version.
    * **Files to investigate:** `modules/ControllerMenu.js`, `modules/ModalManager.js`, `modules/UIManager.js`.
    * **Action:**
        1.  Recreate all menus from the 2D game in the VR environment. This includes the main menu, game over menu, ascension menu, and all other menus from the original game.
        2.  The menus should be attached to the player's left hand as described in the `readme.md`.
        3.  Ensure all verbiage and layouts are as close to the original as possible.

2.  **HUD:**
    * **Issue:** Power-up emojis do not appear in the HUD's inventory slots.
    * **Files to investigate:** `modules/UIManager.js`.
    * **Action:** Debug the HUD to ensure that when a power-up is collected, its corresponding emoji is displayed in the correct inventory slot.

### Task 4: Final Polish and Code Cleanup

1.  **Code Review and Refactoring:**
    * Review all modified files for clarity, performance, and adherence to the project's coding style.
    * Refactor any code that is inefficient or difficult to understand.
2.  **Testing:**
    * Thoroughly test all fixed and implemented features to ensure they are working as expected and have not introduced any new bugs.

Good luck.
