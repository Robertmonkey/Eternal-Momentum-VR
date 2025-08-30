# Task Log: Eternal Momentum VR Port

## Core Gameplay Bugs

* [x] **Enemy and Boss Tracking:** Fix the bug causing enemies to move towards the poles. — Completed
    * Rebuilt movement to rotate agents directly on the sphere, removing UV clamps and pole snapping.
    * Consolidated movement utilities with shared vector-based stepping for player and enemies.
* [x] **Player Movement & Avatar Duplication:** Ensured reliable controller input and single avatar instance. — Completed
    * Added controller fallbacks to prevent missing input on platforms reporting a single controller.
    * Cleaned up existing avatar meshes when reinitializing the player controller.
    * Cleared stale references so repeated initialisation cannot spawn duplicate avatars or lasers.
* [ ] **Power-up Functionality:**
    * [x] Fix the missile power-up. — Completed
        * Resolved controller offset so missiles spawn from the controller tip and target the correct direction.
        * Directed fireball toward cursor so it travels to the intended point and damages enemies.
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
    * [x] Create 3D spherical models for all bosses and enemies. — Completed
    * [ ] Implement animations for all bosses, enemies, and power-ups. — In Progress
        * [x] Enabled delta-based enemy AI updates to support animations.
        * [x] Added expanding sphere visual for the `shockwave` power-up.
        * [x] Added heal sparkle and black hole visuals.
        * [x] Enhanced heal sparkle and shield activation with pulsing emissive effects.
    * [x] Create a swirling cube animation for the "glitch" enemy. — Completed
    * [ ] Ensure all animations are interpolated for VR. — In Progress (projectiles, effects, and enemy AI use delta timing)
    * [x] Upgraded boss models with lore-driven shapes for progressive visual flair (Splitter, Reflector, Vampire, Gravity, Epoch Ender).
    * [x] Expanded upgrades to additional bosses so designs scale with difficulty (Syphon, Centurion, Sentinel Pair, Annihilator, Architect, Quantum Shadow, Puppeteer).
    * [x] Added extra rings, shards, and orbiting details so later bosses look increasingly epic and aligned with their lore.
    * [x] Introduced progressive ability animations with lore-based shapes for Aethel & Umbra, Splitter, and Reflector bosses.
    * [x] Expanded ability animations for Vampire, Gravity, Syphon, Centurion, and Puppeteer bosses so effects scale with each stage.
* [x] Stabilized Gravity Tyrant wells near poles and reattached Swarm Link tail segments.
* [x] Fixed Gravity Tyrant well positions so they orbit the boss and affect the player.
* [x] **Sizing:** Increase the size of the player, bosses, and enemies by 30%. — Completed

## UI

* [ ] **Menus:**
    * [x] Recreate all menus from the 2D game in VR. — Completed
    * [x] Attach menus to the player's left hand. — Completed
    * [x] Ensure menu verbiage and layout are faithful to the original. — Completed
    * [x] Refined Ascension Conduit menu with header/footer dividers and button colors matching the 2D game.
    * [x] Synced Ascension Conduit title glow and 16:9 talent grid with the 2D version.
    * [x] Added cyan glow around Ascension Conduit modal to mirror the 2D box-shadow.
    * [x] Aligned Ascension Point header with side-by-side label and value to match the 2D layout.
    * [x] Left-aligned Ascension Conduit title and right-aligned AP display to mirror the original menu.
    * [x] Restored AP header styling and hover sound cues to match the 2D Ascension interface.
    * [x] Auto-sized AP header container so its background grows with the value like the 2D menu.
    * [x] Realigned talent nodes and connector lines so constellations mirror the 2D arrangement exactly.
    * [x] Switched talent nodes to circular buttons and mirrored 2D click responses.
    * [x] Updated controller menu Ascension button to use original 'Ascension Conduit' wording with auto-sized background.
    * [x] Bolded Ascension Point total and aligned footer buttons with modal padding to match the 2D layout.
    * [x] Split talent tooltips into left-aligned rank and right-aligned cost fields, using 'Mastery' and 'MAXED' phrasing like the 2D menu.
    * [x] Resolved layering bug where menu buttons could render behind panels.
    * [x] Reworked render ordering so button faces, borders, and labels always draw above their modal backgrounds.
    * [x] Made controller hand menu buttons show their labels and frames only when hovered to reduce clutter.
    * [x] Added tooltip footer divider and 1.15 hover scale so Ascension talents mirror 2D visuals precisely.
    * [x] Matched talent tooltip text colors and opacity with the original 2D styling.
    * [x] Synced talent purchases with HUD updates and drew connector lines without depth testing so the Ascension grid layers exactly like the 2D menu.
    * [x] Resolved CSS color variables so Ascension constellations use the original cyan and orange hues.
* [x] Raised modal positions so menus appear higher with their bottoms at waist height.
* [x] Restore backgrounds and fix scaling issues. — Completed
* [x] Recreate stage select layout and styling to mirror the 2D game's menu.
    * [x] Reworked stage list to use original stage configuration and match button colors.
    * [x] Matched text alignment, long-name scrolling, and initial scroll position to the 2D stage menu.
    * [x] Aligned mechanics and lore buttons horizontally with circular styling to match the 2D stage menu.
    * [x] Synced row highlight with info button hover and matched button placement/opacity to the 2D version.
    * [x] Matched border translucency and hover effects for rows and info buttons to mirror 2D visuals.
    * [x] Restored Lore Codex story modal and button styling to match the original game's presentation.
    * [x] Corrected Lore Codex text alignment so entries render within the menu bounds.
    * [x] Added in-VR tooltips for Mechanics and Lore buttons and restored boss-name listing to match the 2D stage menu.
    * [x] Synced Stage Select footer button colors and hover behaviour with the 2D stage manager layout.
    * [x] Centered Stage Select footer buttons when Weaver's Orrery is locked so the menu opens with aligned actions.
* [x] **HUD:**
    * [x] Fix the bug preventing power-up emojis from displaying in the inventory.
    * [x] Reworked inventory HUD rendering to scale emoji sprites consistently and refresh even when hidden.
    * [x] Documented centralized scaling constants and slot visibility logic for clearer HUD maintenance.

## Final Polish

* [x] **Code Review and Refactoring:** Review and refactor all modified code.
* [x] **Testing:** Thoroughly test all changes.

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
* [x] Added missing Aberration Core and Orrery footer buttons to mirror the 2D menus and restore their functionality.
* [x] Refined confirm modal with magenta border and button colors matching the 2D game's custom confirm dialog.
* [x] Prevented sever timeline warning text from overflowing its menu.
* [x] Repositioned Stage Select and Boss Info buttons so none bleed beyond their menu boundaries.
* [x] Realigned stage labels and boss names with their bars and kept Game Over's restart label within bounds.
* [x] Standardized Stage Select row widths and anchored info buttons to match the 2D menu.
* [x] Centered Game Over buttons so Stage Select stays within the modal frame.
* [x] Ensured Game Over menu reorients toward the player so it's always readable after death.
* [x] Hardened general utilities: randomInRange handles reversed bounds, safeAddEventListener reports status, drawLightning clamps width, lineCircleCollision rejects zero/negative radii, and wrapText ignores non-positive lengths.
* [x] Prevented avatar drift toward UI by locking movement target during menu interaction, including when pointing at non-interactive panels.
* [x] Added safeguards for edge cases: spherical direction now returns zero for degenerate inputs, UV sanitization wraps v values, movement steps are clamped to avoid overshoot, player damage ignores invalid values, and ring drawing normalizes radii and alpha.
* [x] Reapplied `bg.png` pattern overlay on modal and button backgrounds for faithful 2D-style menus.
* [x] Removed `bg.png` texture from buttons and HUD elements so it only serves as modal wallpaper, matching the original 2D game.
* [x] Fixed additional gameplay bugs: projectile updates now validate callbacks, shield timers clear on break, player health clamps non-negative, circle drawing guards against invalid contexts, and particle spawner verifies inputs.
* [x] Hardened drawing helpers against bad inputs: crystal and player rendering now validate contexts, shadow cones require valid radii, particle updates avoid divide-by-zero alpha, and screen shake clamps magnitude and duration.
* [x] Corrected modal orientation so menus face the player instead of showing their backs.
* [x] Fixed missile explosions so nearby bosses and enemies take damage even if they lack an explicit `alive` flag.
* [x] Added enemy separation logic to keep foes from occupying the same spot.
* [x] Replaced death audio with the original 2D "stone cracking" sound effect.
* [x] Removed stone death sound so only the standard hit audio plays on fatal damage, matching 2D behavior.
* [x] Ensured missile explosions trigger even when fired through the floor.
* [x] Restored hit sound on fatal player damage.
* [x] Awarded essence on enemy and boss deaths, clearing stages and resuming enemy and power-up spawns.
* [x] Fixed ascension menu so talents render correctly even when `purchasedTalents` loads from a legacy array save, ensuring the Core Nexus is always visible.
* [x] Hardened ascension menu against legacy saves storing `purchasedTalents` as plain objects so the Core Nexus always renders.
* [x] Aligned Ascension modal borders and talent nodes with their backgrounds so frames no longer flicker or drift in VR.
* [x] Refreshed Ascension modal immediately and added requestAnimationFrame fallback so talents always display even in RAF-free environments.
* [x] Corrected boss health bar logic so colored fills track each boss's `health` value instead of a nonexistent `hp` field.
* [x] Disabled HUD raycasts so the cursor passes through without affecting player movement.
* [x] Prevented boss spawn crashes by replacing nonexistent geometries, importing missing Pantheon aspects, and correcting the Annihilator's shadow check.
* [x] Stabilized Swarm Link's tail so segments follow the spherical surface and consistently damage the player on contact.
* [x] Reworked Mirror Mirage clone swapping to match the original game's mechanics and prevent ability-related crashes.
* [x] Fixed Mirror Mirage clone spawning so decoys appear on the arena instead of the player's position.
* [x] Hardened rotateAroundNormal to return the original vector when given zero-length normals or invalid angles.
* [x] Fixed race condition in Miasma boss slam by using current timestamps when purifying vents.
* [x] Corrected controller menu sound toggle to update its icon reliably in VR.
* [x] Restored scrollbar behavior so lists scroll in the correct direction and handles can be dragged like the 2D game.
* [x] Anchored boss info and lore text within their modals and wrapped long lines so menu content stays inside its container.
* [x] Added utility safeguards: particle spawner handles polar positions and negative lifetimes, screen shake and fog drawing validate contexts, lightning rendering tolerates missing contexts, and `playerHasCore` ignores non-array buff lists.
* [x] Debugged first 10 boss AIs, importing missing state in Splitter and redirecting Vampire blood orbs to heal the player.
