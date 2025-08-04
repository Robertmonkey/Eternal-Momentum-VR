# Task Log: Eternal Momentum VR Port

## Core Gameplay Bugs

* [x] **Enemy and Boss Tracking:** Fix the bug causing enemies to move towards the poles. — Completed
    * Refined spherical movement calculations to avoid pole drift on antipodal targets.
    * Consolidated movement utilities with shared UV sanitization and delta-aware stepping for player and enemies.
* [ ] **Power-up Functionality:**
    * [x] Fix the missile power-up. — Completed
    * [x] Ensure all other power-ups are functional.
        * [x] Chain lightning power adapted with 3D beam effect.
        * [x] Heal and black hole powers render 3D effects.
        * [x] Repulsion field pushes enemies away.
        * [x] Orbital strike targets enemies and creates shockwaves.
        * [x] Ricochet shot bounces and damages foes.
        * [x] Bullet nova spawns damaging spiral shots.
        * [x] Berserk applies damage boost status.
    * [x] Implement correct power-up controls for VR controllers. — Completed
    * [x] Fix bug preventing power-ups from being collected. — Completed

## 3D Assets and Animations

* [ ] **3D Models and Animations:**
    * [ ] Create 3D spherical models for all bosses and enemies. — In Progress (most enemies now use base spheres)
    * [ ] Implement animations for all bosses, enemies, and power-ups. — In Progress
        * [x] Enabled delta-based enemy AI updates to support animations.
        * [x] Added expanding sphere visual for the `shockwave` power-up.
        * [x] Added heal sparkle and black hole visuals.
    * [x] Create a swirling cube animation for the "glitch" enemy. — Completed
    * [ ] Ensure all animations are interpolated for VR. — In Progress (projectiles, effects, and enemy AI use delta timing)
* [x] **Sizing:** Increase the size of the player, bosses, and enemies by 30%. — Completed

## UI

* [ ] **Menus:**
    * [x] Recreate all menus from the 2D game in VR. — Completed
    * [x] Attach menus to the player's left hand. — Completed
    * [x] Ensure menu verbiage and layout are faithful to the original. — Completed
    * [x] Refined Ascension Conduit menu with header/footer dividers and button colors matching the 2D game.
    * [x] Synced Ascension Conduit title glow and 16:9 talent grid with the 2D version.
* [x] Restore backgrounds and fix scaling issues. — Completed
* [x] Recreate stage select layout and styling to mirror the 2D game's menu.
    * [x] Reworked stage list to use original stage configuration and match button colors.
    * [x] Matched text alignment, long-name scrolling, and initial scroll position to the 2D stage menu.
    * [x] Aligned mechanics and lore buttons horizontally with circular styling to match the 2D stage menu.
    * [x] Synced row highlight with info button hover and matched button placement/opacity to the 2D version.
    * [x] Matched border translucency and hover effects for rows and info buttons to mirror 2D visuals.
    * [x] Restored Lore Codex story modal and button styling to match the original game's presentation.
    * [x] Added in-VR tooltips for Mechanics and Lore buttons and pulled stage labels from `STAGE_CONFIG` for fidelity.
* [x] **HUD:**
    * [x] Fix the bug preventing power-up emojis from displaying in the inventory.

## Final Polish

* [ ] **Code Review and Refactoring:** Review and refactor all modified code.
* [ ] **Testing:** Thoroughly test all changes.

## Additional Improvements

* [x] Added `clamp` and `applyPlayerHeal` helpers to centralize healing logic.
* [x] Updated heal power to use the new `applyPlayerHeal` helper.
* [x] Refactored essence transmutation health gain in `gameLoop` to use `applyPlayerHeal`.
* [x] Applied centralized healing to the `essence-weaving` talent in `pickupPhysics3d`.
* [x] Updated vampire core effects to use `applyPlayerHeal` for life-steal.
* [x] Added unit tests for `clamp` and `applyPlayerHeal`.
* [x] Centralized power-up inventory management in `PowerManager` for reliability.
* [x] Hardened projectile pooling and coordinate helpers to reset reused objects and validate inputs.
* [x] Improved inventory overflow handling, projectile pooling cleanup, enemy update skipping of dead entities, stable spherical direction math and optional radius parameter for canvas-to-sphere conversions.
* [x] Reworked game over menu to mirror the 2D game's horizontal button layout.
* [x] Matched game over title color and glow to the 2D game's design.
* [x] Styled game over menu buttons and background to match the 2D color scheme.
* [x] Refined confirm modal with magenta border and button colors matching the 2D game's custom confirm dialog.
