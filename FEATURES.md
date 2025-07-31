# FEATURES.md – Player Systems & VR Implementation Guide

This document is an **exhaustive catalogue** of every player‑facing mechanic from Eternal Momentum and a set of notes for porting those mechanics into the VR environment.  It has been generated directly from the original game’s source files (`powers.js`, `cores.js`, `talents.js`, `ascension.js`) to ensure that every value and behaviour is captured.  When implementing a mechanic in VR, follow the guidelines below and refer back to this catalogue and the original code to confirm accuracy.

> **Coordinate Note:**  The original game expresses radii, positions and speeds in 2D pixel units relative to a 2048 × 1024 canvas.  In VR, all entities should live on the inner surface of a sphere and positions should be stored as `THREE.Vector3` objects.  When this catalogue specifies a radius in pixels, convert it to an angular distance appropriate for the sphere (e.g. by dividing by the canvas width and multiplying by `2π` radians) or use a helper that maps canvas coordinates to 3D positions.  Likewise, when a mechanic references `x`/`y` coordinates, use a helper like `spherePosToUv` to obtain equivalent UV values from the avatar or enemy’s 3D position.

## Using This Catalogue

1. **Read the Mechanic Description** – Each entry lists the key effects, durations, damage values and interactions exactly as they appear in the 2D game.  Do not change these numbers unless explicitly instructed.
2. **Consult the Original Code** – If a mechanic references a specific talent or core, open the original file to see how it is implemented in context.  This will reveal subtle interactions not captured in a short description.
3. **Add VR Effects** – The entries include *VR Implementation Notes* that describe how to visualise or represent the mechanic in 3D space.  Use Three.js primitives (meshes, particles, shaders) to realise these effects.  Remember to attach audio cues via the AudioManager.
4. **Test Thoroughly** – After implementing a mechanic, write unit tests to verify state changes and a manual test plan to ensure the mechanic *feels* like the original.  Check that timers, cooldowns and multipliers are correct.

---

## Part 1: Power‑Up System (`powers.js`)

Players acquire temporary abilities during gameplay.  These powers are stored in offensive and defensive inventories and activated using the controller’s trigger or grip button.  Powers must be consumed when used unless a talent or core dictates otherwise.

For each power below, we list its code‑derived behaviour followed by VR Implementation Notes.  **Bold values** are constants from the original game.  Use these when implementing timers, damage or radius.

### 🛡️ Shield (`shield`)
* **Effect:** Sets `state.player.shield` to `true` for **6000 ms**.  Duration increases by **1500 ms** per rank of the `aegis‑shield` talent.  Shows a shield icon on the status bar and renders a yellow shield visual around the player.  Spawns **30** yellow particles on activation.
* **VR Implementation Notes:** Create a semi‑transparent, glowing sphere around the player avatar to represent the shield.  Use a `THREE.Mesh` with `MeshBasicMaterial` (emissive) and fade it over the duration.  Trigger a sound effect via AudioManager.

### ❤️ Heal (`heal`)
* **Effect:** Instantly increases `state.player.health` by **30** (capped at `maxHealth`).
* **VR Implementation Notes:** Spawn a burst of green particles or a healing aura around the avatar.  Play a heal sound.  Ensure health does not exceed the maximum.

### 💥 Shockwave (`shockwave`)
* **Effect:** Creates an expanding shockwave centred on the player or specified `origin`.  The radius expands to cover the screen (`Math.max(innerWidth, innerHeight)`).  Base damage is **15** (double if Berserk).  Damage is multiplied by global damage multipliers.  Plays `shockwaveSound.mp3`.
* **VR Implementation Notes:** Render a growing ring or disc that emanates from the avatar’s position along the sphere’s surface.  Use a shader or animated texture on a `THREE.RingGeometry`.  Apply damage to enemies whose positions are within the ring’s expanding radius.

### 🎯 Missile (`missile`)
* **Effect:** Instantly creates an explosion centred on the player (or `origin`).  Base damage **10** (double if Berserk).  Base radius **250 px**, increased by **15 %** per rank of the `stellar‑detonation` talent.  If the `homing‑shrapnel` talent is purchased, the explosion releases **3** homing shrapnel projectiles.
* **VR Implementation Notes:** Spawn a small explosion effect at the cursor’s location on the sphere.  Use particle emitters or sphere scaling animations.  For homing shrapnel, create `THREE.Mesh` projectiles that seek nearest enemies using steering behaviour.

### ⚡ Chain (`chain`)
* **Effect:** Emits chain lightning starting from the player or `origin`, hitting up to **6** targets (plus **1** per rank of `arc‑cascade`).  Base damage **15** (double if Berserk).  If `volatile‑finish` is purchased, the final target explodes.
* **VR Implementation Notes:** Cast a Three.js `THREE.Line` or a custom lightning shader between the player and sequential targets.  Ensure the chain selects the nearest un‑hit enemy each time.  For the final explosion, reuse the Missile effect.

### 🌀 Gravity (`gravity`)
* **Effect:** Activates a gravity field for **1000 ms**.  Pulls non‑boss enemies toward the screen centre.  If `temporal‑collapse` is purchased, leaves a slow field for **4000 ms** after it ends.  Plays `gravitySound.mp3`.
* **VR Implementation Notes:** Create a pulsating sphere at the cursor that attracts enemies.  Use forces in the enemy AI to move them toward the gravity source.  After the effect ends, spawn a translucent disc representing the slow field.

### 🚀 Speed (`speed`)
* **Effect:** Multiplies `state.player.speed` by **1.5** for **5000 ms**.  Shows a rocket icon on the status bar.
* **VR Implementation Notes:** Increase the avatar’s movement speed on the sphere by modifying the rate at which it lerps toward the cursor.  Spawn speed lines or a wind particle trail behind the avatar.

### 🧊 Freeze (`freeze`)
* **Effect:** Sets the `frozen` flag on all non‑boss enemies for **4000 ms**, setting their `dx` and `dy` to zero.  If the `basilisk` core is active, frozen enemies also become “Petrified,” taking increased damage.
* **VR Implementation Notes:** Change enemy materials to an icy material and stop their animations or movement.  When Basilisk is active, overlay a petrified texture and increase damage taken.

### 🔮 Decoy (`decoy`)
* **Effect:** Spawns a Decoy that lasts for **5000 ms**.  The Decoy taunts enemies (is `isTaunting: true`) so they target it.  With `quantum‑duplicate` talent, the Decoy becomes mobile and moves away from the player.
* **VR Implementation Notes:** Create a holographic clone of the player mesh with a transparent material.  Attach a collider so enemies can perceive it.  If the talent is unlocked, give the Decoy its own movement behaviour that moves along the sphere away from the avatar.

### 🧠 Stack (`stack`)
* **Effect:** Sets `state.stacked` to `true`.  The next power‑up used will be applied twice.  The flag then resets to `false`.
* **VR Implementation Notes:** Display a brain icon on the status bar.  Implement logic in `PowerManager` so that when `state.stacked` is true, the next call to `usePower()` runs the power twice.

### 💎 Score (`score`)
* **Effect:** Instantly grants `200 + (state.player.level * 10)` Essence.
* **VR Implementation Notes:** Add to the player’s essence count and display floating number particles.  Play a coin pickup sound.

### 🖐️ Repulsion (`repulsion`)
* **Effect:** Creates a repulsion field around the player for **5000 ms** with a radius of **250 px**.  Pushes non‑boss enemies away.  With `kinetic‑overload`, produces an initial blast that knocks enemies back significantly.
* **VR Implementation Notes:** Render a translucent sphere or ring expanding and contracting around the player.  Apply forces to nearby enemies to push them outward.  For kinetic overload, add an initial strong impulse.

### ☄️ Orbital Strike (`orbitalStrike`)
* **Effect:** Selects **3** random non‑friendly enemies.  Marks them with a target indicator.  After **1500 ms**, each target location explodes.  If `targeting‑algorithm` is purchased, the target follows the enemy until detonation.
* **VR Implementation Notes:** Place glowing markers above enemies.  Use a timer to trigger separate explosion effects.  With the talent, update marker positions each frame until detonation.

### ⚫ Black Hole (`black_hole`)
* **Effect:** Creates a black hole effect at the cursor’s location for **4000 ms**.  Pulls in enemies and projectiles.  Base damage **3** (double if Berserk); damage applies only if `unstable‑singularity` is purchased.  With the `time eater` core, leaves a `dilation_field` for **30 s** after expiration.  Plays `gravitySound.mp3`.
* **VR Implementation Notes:** Use a particle system or shader to create a swirling vortex.  Apply attraction forces to enemies and bullets.  When `unstable‑singularity` is unlocked, have the black hole explode on expiry.  For the Time Eater core, spawn a large transparent sphere that slows projectiles for its duration.

### 💢 Berserk (`berserk`)
* **Effect:** Sets `state.player.berserkUntil = Date.now() + 8000`.  While Berserk is active, the player deals double damage but takes double damage.  `unstoppable‑frenzy` grants immunity to slows and stuns; `thermal‑runaway` extends duration by **0.1 s** per enemy killed.
* **VR Implementation Notes:** Change the colour of the player’s trail or shader to indicate Berserk (e.g. red glow).  Modify damage multipliers accordingly.  Implement a kill counter to extend the duration when the talent is unlocked.

### 🔄 Ricochet Shot (`ricochetShot`)
* **Effect:** Fires a projectile toward the cursor with speed **10**.  The projectile has **6** bounces; bounces are consumed when hitting walls or enemies.  Base damage **10**.  With `unstable‑payload`, the projectile grows and deals more damage each bounce.
* **VR Implementation Notes:** Spawn a glowing projectile mesh (e.g. sphere or cylinder) and implement reflective physics against the arena walls.  Increase scale and damage after each bounce when the talent is active.

### 💫 Bullet Nova (`bulletNova`)
* **Effect:** Creates a nova controller that lasts **2000 ms**.  Every **50 ms**, it fires a bullet in a spiral pattern.  Base damage **3** (double if Berserk).  With `nova‑pulsar`, fires three spirals instead of one.
* **VR Implementation Notes:** Instantiate a controller object at the player’s position that emits bullets outward in a rotating pattern.  Use instancing or pooling for performance.  If the talent is unlocked, emit three spirals offset in phase.

### 🧲 Magnet (`magnet`)
* **Effect:** Acts like a Syphon effect.  Pulls all pickups toward the player for **2000 ms**.  Plays `syphonFire.mp3`.
* **VR Implementation Notes:** Apply attraction forces to pickups within range.  Use visual effects similar to the Syphon core.

### 🔁 Duplicate (`duplicate`)
* **Effect:** Instantly copies a random power from another slot into an empty slot.  If both slots are full, the power is discarded.
* **VR Implementation Notes:** Choose a random power from the offensive or defensive inventory, clone it, and place it in an empty slot.  Use a UI cue to indicate the duplication.

### 🕹️ Swap (`swap`)
* **Effect:** Swaps the two powers in the offensive and defensive slots.  Plays a swap sound.
* **VR Implementation Notes:** Exchange the contents of the two slots.  Update the UI accordingly.

### 🔄 Cycle (`cycle`)
* **Effect:** Rotates the power inventory: defensive → offensive → extra.  Plays a cycling sound.
* **VR Implementation Notes:** Rotate the array of powers (if three slots exist).  Play an appropriate sound effect.

### 🎲 Random (`random`)
* **Effect:** Chooses a random power and immediately uses it.  The power is then consumed.
* **VR Implementation Notes:** Pick a random power from those available.  Trigger its effect and remove it from the inventory.

### 📦 Box (`box`)
* **Effect:** Spawns a random power‑up on the arena.  The player must collect it manually.
* **VR Implementation Notes:** Spawn a glowing box on the sphere’s surface.  When the player touches it, add a random power to the inventory.

### 🔨 Hammer (`hammer`)
* **Effect:** Deals **2000** damage to bosses and instantly kills non‑boss enemies within **250 px**.  Plays a hammer smash sound.
* **VR Implementation Notes:** Create a visual hammer effect that slams down on the target area.  Apply massive damage or instant death to enemies within range.

### 📡 Pulse (`pulse`)
* **Effect:** Reveals all pickups and power‑ups on the arena for **10 s**.  Plays a sonar ping sound.
* **VR Implementation Notes:** Highlight all pickups and power‑ups with a glowing outline.  After 10 seconds, remove the highlight.

### 🧲 AOE Syphon (`aoeSyphon`)
* **Effect:** Pulls all pickups toward the player with increased strength for **4000 ms**.  Plays `syphonFire.mp3`.
* **VR Implementation Notes:** Same as Magnet but longer duration and stronger pull.  Use a larger cone effect.

### 🔧 Downgrade (`downgrade`)
* **Effect:** Downgrades a random core to its previous tier.  Does nothing if the core is already at tier 1.
* **VR Implementation Notes:** Reduce the player’s current core tier by one.  Show a warning notification.

### 🧲 Syphon (`syphon`)
* **Effect:** Pulls all pickups toward the player for **1000 ms**.  Plays `syphonFire.mp3`.
* **VR Implementation Notes:** Create a cone or sphere effect that attracts pickups.  Use similar visuals as the Magnet and AOE Syphon.

### 🔄 Shuffle (`shuffle`)
* **Effect:** Reassigns the two powers in the offensive and defensive slots to two random powers from the pool of all possible powers.  Plays a shuffle sound.
* **VR Implementation Notes:** Remove the current powers and randomly assign new ones.  Update the UI to reflect the change.

### 📶 Amplify (`amplify`)
* **Effect:** Increases the damage of the next power used by **200 %**.  Plays a charging sound.
* **VR Implementation Notes:** Track a flag that modifies the next power’s damage multiplier.  Reset the flag after use.

### 🔄 Rotate (`rotate`)
* **Effect:** Rotates the powers such that the defensive slot becomes the offensive slot, the extra slot becomes the defensive slot, and the offensive slot goes to the extra slot.
* **VR Implementation Notes:** Rotate the powers array cyclically.  Update the UI.

### 🧲 Drain (`drain`)
* **Effect:** Removes **20 %** of all enemies’ current health (double on Berserk) and heals the player for **30 %** of the damage dealt.  Plays `drainSound.mp3`.
* **VR Implementation Notes:** Iterate over all enemies, reducing health accordingly.  Calculate total damage dealt and heal the player proportionally.  Use a red/green particle effect.

### 🔢 Split (`split`)
* **Effect:** Summons three mini clones of the boss that chase the player.  Each mini clone has **25 %** of the boss’s max HP.  Plays `splitSound.mp3`.
* **VR Implementation Notes:** Instantiate three smaller versions of the current boss model.  Give them basic chase AI.  Destroy them when their health is depleted.

### 🔁 Exchange (`exchange`)
* **Effect:** Randomly swaps the player’s offensive and defensive cores.  Plays an exchange sound.
* **VR Implementation Notes:** Swap the `equippedAberrationCore` value.  Update the HUD.

### 🧲 Attraction (`attraction`)
* **Effect:** For **3000 ms**, enemies are attracted to the player, dealing no contact damage.  Plays `attractionSound.mp3`.
* **VR Implementation Notes:** Apply forces to enemies pulling them toward the player.  Disable contact damage during the effect.  Use a magnetic visual cue.

### 🧲 Repulsion Field (`repulsionField`)
* **Effect:** For **3000 ms**, enemies are repelled from the player.  Plays `repulsionFieldSound.mp3`.
* **VR Implementation Notes:** Apply forces pushing enemies away.  Use a blue bubble effect.

### 🔀 Randomise (`randomise`)
* **Effect:** Randomly changes the order of all enemy waves yet to come.  Plays a shuffle sound.
* **VR Implementation Notes:** Shuffle the upcoming waves in the stage script.  No immediate visual effect.

### 🧨 Detonate (`detonate`)
* **Effect:** Causes all projectiles on screen (enemy and player) to explode immediately.  Plays an explosion sound.
* **VR Implementation Notes:** Iterate over all active projectiles, trigger their explosion effects, then remove them.

### 🧲 Gravity Pulse (`gravityPulse`)
* **Effect:** Sends out a gravity pulse that pulls enemies toward the player and pushes pickups away.  Plays `gravitySound.mp3`.
* **VR Implementation Notes:** Emit a ring from the player that applies inward force to enemies and outward force to pickups.  Use distinct colours for clarity.

### 🧲 Magnetise (`magnetise`)
* **Effect:** For **5000 ms**, all enemy projectiles are magnetically attracted to the player, greatly reducing their speed.  Plays a magnet hum sound.
* **VR Implementation Notes:** Modify projectile velocities so they curve toward the player and slow down.  Render a magnetic aura.

### 🧪 Mutate (`mutate`)
* **Effect:** Mutates a random enemy (non‑boss) into a stronger variant with increased health and damage.  Plays a mutation sound.
* **VR Implementation Notes:** Select a random enemy and apply modifiers.  Change its material or scale to indicate mutation.

### 🪄 Enchant (`enchant`)
* **Effect:** Gives a random enemy (non‑boss) a shield that reflects projectiles for **4000 ms**.  Plays a shimmering sound.
* **VR Implementation Notes:** Add a reflective bubble around the selected enemy.  Modify the projectile collision logic to reflect off it.

### 🔧 Corrupt (`corrupt`)
* **Effect:** Corrupts a random power in the player’s inventory, turning it into a negative effect.  Plays a glitch sound.
* **VR Implementation Notes:** Replace a random power with a debuff (e.g. a power that damages the player when used).  Mark it visually as corrupted.

### 🌀 Vortex (`vortex`)
* **Effect:** Creates a small vortex that moves around for **3000 ms**, pulling in enemies and projectiles.  Plays `vortexSound.mp3`.
* **VR Implementation Notes:** Spawn a moving vortex effect that exerts attractive forces.  When it expires, remove it.

### ⏳ Slow Time (`slowTime`)
* **Effect:** Slows down time for **2000 ms**, halving enemy and projectile speed.  Player speed remains unchanged.  Plays a temporal distortion sound.
* **VR Implementation Notes:** Scale down the deltaTime used in enemy and projectile updates.  Use a visual colour shift to indicate slowed time.

### 🧱 Wall (`wall`)
* **Effect:** Spawns a wall at the cursor position that blocks enemies for **5000 ms**.  The wall has a width of **200 px**.  Plays `wallSpawn.mp3`.
* **VR Implementation Notes:** Instantiate a rectangular mesh on the sphere surface.  Scale it appropriately to match the specified width.  Enemies should treat it as a solid obstacle.

### 🧲 Reverse Syphon (`reverseSyphon`)
* **Effect:** For **1000 ms**, pushes pickups away from the player instead of pulling them in.  Plays a reverse syphon sound.
* **VR Implementation Notes:** Apply forces on pickups pushing them outward.  Use an inverted cone effect.

### 🧲 Unstable Field (`unstableField`)
* **Effect:** Creates a field at the cursor that alternates between pulling and pushing enemies every **500 ms** for **3000 ms**.  Plays `fieldToggle.mp3`.
* **VR Implementation Notes:** Spawn a sphere that toggles between attraction and repulsion.  Use colour or animation to indicate its current state.

### 🔄 Mirror (`mirror`)
* **Effect:** Spawns a mirror that reflects projectiles and deals **50 %** of the damage back to the shooter.  Lasts for **3000 ms**.  Plays `mirrorSpawn.mp3`.
* **VR Implementation Notes:** Create a planar mesh on the sphere’s surface that reflects projectiles via normal reflection.  Use a reflective material.

### 🌀 Tornado (`tornado`)
* **Effect:** Summons a tornado at the cursor that moves slowly and sucks in enemies for **4000 ms**.  Enemies caught are dealt **5** damage per tick.  Plays `tornadoSound.mp3`.
* **VR Implementation Notes:** Use a tall, swirling particle effect.  Apply upward and inward forces to enemies near it.

### 🌪️ Hurricane (`hurricane`)
* **Effect:** Creates a hurricane around the player that damages enemies for **5** per tick and lasts **3000 ms**.  Plays `hurricaneSound.mp3`.
* **VR Implementation Notes:** Surround the player with a circular ring of wind particles.  Apply continuous damage to enemies inside.

### 💣 Bombardment (`bombardment`)
* **Effect:** Drops **5** bombs randomly around the player, each dealing **50** damage.  Plays `bombardmentSound.mp3`.
* **VR Implementation Notes:** Spawn bomb meshes that fall from above and explode on contact with the sphere.  Use random offsets within a fixed radius.

### 🔄 Disrupt (`disrupt`)
* **Effect:** Silences all enemies for **3000 ms**, preventing them from firing projectiles.  Plays `disruptSound.mp3`.
* **VR Implementation Notes:** Set a `silenced` flag on all enemies.  Prevent their shooting logic while the flag is active.  Use a global effect to show disruption.

### 💫 Teleport (`teleport`)
* **Effect:** Teleports the player to the cursor location.  Has a cooldown of **10000 ms**.  Plays `teleportSound.mp3`.
* **VR Implementation Notes:** Move the player’s avatar and camera along the sphere to the target UV position.  Use a blink or fade effect to reduce nausea.

### 🔀 Shuffle Deck (`shuffleDeck`)
* **Effect:** Randomly reorders the enemies remaining in the current stage.  Plays a card shuffle sound.
* **VR Implementation Notes:** Shuffle the queue of enemy waves.  No immediate visible effect but may change pacing.

### 🎛️ Random Core (`randomCore`)
* **Effect:** Equips a random aberration core from those the player has unlocked.  Plays a core swap sound.
* **VR Implementation Notes:** Choose a random core and set `state.player.equippedAberrationCore` accordingly.  Update the HUD.

---

## Part 2: Core System (`cores.js`)

Aberration cores grant passive abilities and, in many cases, an active ability when both offensive and defensive powers are triggered simultaneously.  Below is a summary of each core’s functionality and VR notes.  The original code should be consulted for exact timing, damage values and interactions.

### Reflector Warden (`reflector`)
* **Passive:** Activating a defensive power grants a *Reflective Ward* for **2000 ms**, which reflects projectiles.
* **VR Implementation Notes:** While the ward is active, display a glowing barrier around the player.  Implement logic in the ProjectileManager to reverse direction when a projectile collides with the ward.

### Vampire Veil (`vampire`)
* **Passive 1:** After avoiding damage for **5000 ms**, regenerate **2 %** of max health per second.
* **Passive 2:** When dealing damage, **10 %** chance to spawn a seeking `🩸` pickup restoring **20 %** max health.
* **VR Implementation Notes:** Track the last time the player took damage.  When the threshold is met, begin gradually increasing health.  Spawn red orb pickups that move toward the player when triggered.

### Gravity Tyrant (`gravity`)
* **Passive:** Every **5000 ms**, creates a `player_pull_pulse` that expands over **500 ms**; pushes enemies and pulls pickups.  Plays `gravitySound.mp3`.
* **VR Implementation Notes:** Emit expanding rings from the player’s position that apply radial forces: outward on enemies and inward on pickups.

### Swarm Link (`swarm`)
* **Passive:** For every **2** non‑boss enemies killed, add one segment to a cosmetic damaging tail following the player, up to **50** segments.  Each segment deals **0.2 HP/frame**.
* **VR Implementation Notes:** Attach a series of small meshes behind the player that follow its path with a slight delay.  Use instancing for performance.  Apply damage to enemies that intersect the tail.

### Mirror Mirage (`mirror_mirage`)
* **Passive:** Taking damage spawns a stationary decoy.  Up to **3** decoys can exist.  Decoys taunt enemies for **2 s** every **4–7 s**.  Plays `mirrorSwap.mp3`.
* **VR Implementation Notes:** Spawn decoys identical to the `Decoy` power but static.  Use a timer to toggle their taunt status.  Play sound when decoys appear.

### EMP Overload (`emp`)
* **Passive:** When the player’s shield breaks, destroy all enemy projectiles on screen.  Plays `empDischarge.mp3`.
* **VR Implementation Notes:** Listen for `shieldActiveUntil` expiration.  When it breaks, iterate over all projectiles in ProjectileManager and remove those belonging to enemies.  Create a burst of electrical particles around the player.

### The Architect (`architect`)
* **Active:** Cooldown **15000 ms**.  Spawns a ring of **16** `architect_pillar` effects around the player that block enemies for **10000 ms**.  Plays `architectBuild.mp3`.
* **VR Implementation Notes:** On activation, instantiate 16 pillar meshes equally spaced around the avatar on the sphere surface.  These pillars block enemy movement but allow player projectiles to pass.  Destroy pillars after 10 seconds.

### Aethel & Umbra (`aethel_and_umbra`)
* **Passive:** While above **50 %** HP, gain **+10 %** movement speed.  While at or below **50 %**, gain **+10 %** damage.
* **VR Implementation Notes:** Continuously monitor health percentage and adjust movement speed or damage multiplier accordingly.  Use subtle colour shifts (e.g. blue when healthy, red when injured) to reflect the active bonus.

### Looping Eye (`looper`)
* **Active:** Cooldown **10000 ms**.  Stuns and makes the player immune for **1000 ms** while a `teleport_locus` follows the cursor.  After the delay, the player teleports to that position.  Plays `chargeUpSound.mp3`, then `mirrorSwap.mp3`.
* **VR Implementation Notes:** Freeze the avatar’s movement and render a glowing marker that tracks the cursor.  After 1 second, move the avatar to the marker’s location.  Ensure the player cannot use other powers during the stun.

### The Juggernaut (`juggernaut`)
* **Active:** Cooldown **8000 ms**.  The player charges for **1000 ms**, then dashes toward the cursor for **1700 ms**.  The dash deals **500** damage to bosses and instantly kills non‑boss enemies.  Plays `chargeUpSound.mp3`, then `chargeDashSound.mp3`.
* **VR Implementation Notes:** Temporarily disable normal movement and accelerate the avatar along the sphere surface toward the target.  Create motion blur effects.  Apply damage on collision with enemies.

### The Puppeteer (`puppeteer`)
* **Passive:** Every **4000 ms**, converts the farthest non‑boss enemy into a friendly puppet.  Plays `puppeteerConvert.mp3`.
* **VR Implementation Notes:** Identify the farthest enemy by measuring distance on the sphere.  Change its allegiance and apply a puppet material or colour.  Puppets should attack other enemies until they expire.

### The Glitch (`glitch`)
* **Passive:** On collision with a non‑boss enemy, **25 %** chance to instantly kill it and spawn a random power‑up.  Plays `glitchSound.mp3`.
* **VR Implementation Notes:** Detect collisions between the avatar and enemies via bounding spheres.  On proc, remove the enemy and spawn a power‑up pickup that floats toward the player.

### Sentinel Pair (`sentinel_pair`)
* **Passive:** When a Decoy is active, a damaging lightning tether connects the player and the Decoy.
* **VR Implementation Notes:** Render a thin lightning bolt between the avatar and the decoy.  Apply damage over time to any enemy intersecting the tether.

### The Basilisk (`basilisk`)
* **Passive:** Enemies affected by Shockwave or Freeze become “Petrified” for **3000 ms**, taking **20 %** increased damage.
* **VR Implementation Notes:** When Shockwave or Freeze is used, mark affected enemies as petrified and apply a texture or shader to indicate stone.  Apply a damage multiplier to them.

### The Annihilator (`annihilator`)
* **Active:** Cooldown **25000 ms**.  Channels a `player_annihilation_beam` for **4000 ms**.  For the final **1000 ms**, the beam kills all non‑bosses and deals **1000** damage to bosses not in the shadow of another boss.  Plays `powerSirenSound.mp3`.
* **VR Implementation Notes:** Spawn a giant beam mesh or particle system emanating from the player.  Implement a timer that increases its damage toward the end of the channel.  Check line‑of‑sight for bosses; those behind other bosses take no damage.

### The Parasite (`parasite`)
* **Passive:** Any damage dealt by the player infects non‑boss enemies for **10000 ms**.  Infected enemies spawn a friendly spore upon death.
* **VR Implementation Notes:** Attach a parasite marker to damaged enemies.  When they die, spawn small spore entities that seek other enemies or benefit the player.

### Quantum Shadow (`quantum_shadow`)
* **Passive:** Using a defensive power grants the *Phased* status for **2000 ms**, allowing the player to pass harmlessly through enemies and projectiles.  Plays `phaseShiftSound.mp3`.
* **VR Implementation Notes:** When Phased, ignore collision detection between the avatar and all hostile objects.  Optionally, render the avatar as semi‑transparent or ghostly.

### Time Eater (`time_eater`)
* **Passive:** When Black Hole expires, leaves a `dilation_field` for **30000 ms** that slows projectiles.
* **VR Implementation Notes:** Spawn a translucent bubble at the black hole’s location.  Modify projectile velocities while inside this zone.

### The Singularity (`singularity`)
* **Passive 1:** **5 %** chance to duplicate any power‑up effect.
* **Passive 2:** **15 %** chance to not consume a power‑up on use.
* **VR Implementation Notes:** Implement random rolls when powers are used.  If a duplicate triggers, call `usePower()` again.  If consumption is negated, do not remove the power from the inventory.

### The Miasma (`miasma`)
* **Passive:** After standing still for **3000 ms**, creates a friendly `miasma_gas` effect that heals the player and damages enemies at **30 HP/s**.  Moving cancels the effect.
* **VR Implementation Notes:** Monitor the avatar’s movement.  When stationary long enough, spawn a green gas cloud around the player.  Heal the player and damage enemies that enter the cloud.  Remove the cloud if the player moves.

### The Temporal Paradox (`temporal_paradox`)
* **Passive:** When using an offensive power, creates a `paradox_player_echo` that repeats the activation **1000 ms** later from the player’s original position, dealing **50 %** damage.  Plays `phaseShiftSound.mp3`.
* **VR Implementation Notes:** Record the avatar’s position and orientation when a power is used.  After 1 second, spawn a ghost of the player that performs the same power with half damage.  The echo should be translucent and fade after execution.

### The Syphon (`syphon`)
* **Passive:** Attempting to use an empty power slot (offensive or defensive) creates a `syphon_cone` for **1000 ms** that pulls all pickups toward the player.  Cooldown **1000 ms**.  Plays `syphonFire.mp3`.
* **VR Implementation Notes:** Detect when the player attempts to use a power but the inventory slot is empty.  Spawn a cone effect in front of the player that magnetically attracts pickups.  Prevent repeated activation within the cooldown.

### The Centurion (`centurion`)
* **Passive:** When a boss wave spawns, creates **4** `containment_pylon` effects in the arena corners that tether and slow nearby enemies.  Plays `architectBuild.mp3`.
* **VR Implementation Notes:** At the start of a boss stage, spawn four pillar meshes at 90 ° intervals along the sphere’s equator.  Implement a tether field around each pylon that slows enemies.

### The Fractal Horror (`fractal_horror`)
* **Passive:** Reduces player radius by **50 %** and increases base speed by **50 %**.
* **VR Implementation Notes:** Scale down the avatar’s size and increase its movement speed accordingly.  Ensure the laser pointer still aims correctly.

### The Obelisk (`obelisk`)
* **Passive:** Collecting any power‑up grants a *Conduit Charge* status, stacking up to **3**.  When the player would take damage, one charge is consumed to negate it and emit a shockwave.  Plays `conduitShatter.mp3`.
* **VR Implementation Notes:** Maintain a counter of charges.  Display this in the HUD.  When damage would be applied, consume a charge and trigger a shockwave similar to the Shockwave power but with no damage to the player.

### The Helix Weaver (`helix_weaver`)
* **Passive:** While the player is stationary, fires a `helix_bolt` every **1000 ms**.  Plays `weaverCast.mp3`.
* **VR Implementation Notes:** Monitor player movement.  When stationary, spawn bolts that spiral outward from the player along the sphere surface.  Use a helical path.

### The Epoch‑Ender (`epoch_ender`)
* **Passive:** Once every **120000 ms**, when the player would take fatal damage, they revert to their position and health from **2 s** prior.  Plays `timeRewind.mp3`.
* **VR Implementation Notes:** Store a rolling buffer of the player’s last positions and health values.  When the player’s health would drop below zero, revert the state and move the avatar accordingly.

### The Shaper of Fate (`shaper_of_fate`)
* **Passive:** At the start of each stage, spawns **3** `rune_of_fate` pickups.  Collecting one grants a permanent buff for that stage (e.g. +5 % damage, +20 px pickup radius).  Plays `shaperAttune.mp3`.
* **VR Implementation Notes:** Spawn three glowing runes in random positions on the sphere.  When the player picks one up, apply the buff and display an icon indicating the effect.

### The Pantheon (`pantheon`)
* **Passive:** Every **10000 ms**, grants a random unlocked core’s passive effect for **30000 ms**, up to **3** active buffs.  Plays `shaperAttune.mp3`.
* **VR Implementation Notes:** Maintain a list of unlocked cores.  Every 10 seconds, randomly pick one and copy its passive into a temporary buff list.  Display icons for active buffs and remove them after 30 seconds.

---

## Part 3: Ascension Talent System (`talents.js`, `ascension.js`)

The Ascension Conduit provides permanent upgrades purchased with Ascension Points (AP).  Talents are organised into constellations.  Below is a condensed list of all talents; refer to `ascension.js` for full implementation details and `FEATURES.md` in the original repo for exact costs and ranks.

### Core Constellation

- **💠 Core Nexus (`core‑nexus`)** – Starting node; required to unlock the tree.
- **⚛️ Capstone: Overload Protocol (`overload‑protocol`)** – Using a power when inventory is full instantly triggers it.
- **✚ Core Reinforcement (`core‑reinforcement`)** – Increases max health by **+5** per rank.
- **💨 Momentum Drive (`momentum‑drive`)** – Increases movement speed by **1 %** per rank.
- **🔥 Weapon Calibration (`weapon‑calibration`)** – Increases all damage by **1 %** per rank.

### Aegis Constellation (Defensive/Utility)

- **❤️ Exo‑Weave Plating (`exo‑weave‑plating`)** – Increases max health by **+15/+20/+25** per rank.
- **🔋 Extended Capacitor (`aegis‑shield`)** – Increases shield duration by **1.5 s** per rank.
- **🏃 Solar Wind (`solar‑wind`)** – Increases base movement speed by **6 %** per rank.
- **💥 Aegis Retaliation (`aegis‑retaliation`)** – When the shield breaks, releases a defensive shockwave.
- **❄️ Cryo‑Shatter (`cryo‑shatter`)** – Enemies killed while Frozen have a chance to shatter, damaging others.
- **🖐️ Kinetic Overload (`kinetic‑overload`)** – The Repulsion Field’s initial blast is stronger.
- **👻 Capstone: Phase Momentum (`phase‑momentum`)** – After avoiding damage for 8 s, gain +10 % speed and pass through enemies.
- **✳️ Glacial Propagation (`glacial‑propagation`)** – Shattered enemies have a chance to freeze nearby enemies.
- **✨ Reactive Plating (`reactive‑plating`)** – Taking damage has a chance to emit a knockback pulse.
- **💔 Contingency Protocol (`contingency‑protocol`)** – Once per stage, prevent fatal damage, set HP to 1 and gain a 3 s shield.

### Havoc Constellation (Offensive)

- **📈 High‑Frequency Emitters (`high‑frequency‑emitters`)** – Increases all damage by **5 %/12 %** per rank.
- **💢 Unstoppable Frenzy (`unstoppable‑frenzy`)** – While Berserk is active, immunity to slows and stuns.
- **♾️ Thermal Runaway (`thermal‑runaway`)** – Extends Berserk duration by **0.1 s** per kill.
- **💥 Stellar Detonation (`stellar‑detonation`)** – Missile explosion radius increased by **15 %** per rank.
- **🛰️ Targeting Algorithm (`targeting‑algorithm`)** – Orbital Strike tracks its target.
- **💫 Nova Pulsar (`nova‑pulsar`)** – Bullet Nova fires three spirals instead of one.
- **⛓️ Arc Cascade (`arc‑cascade`)** – Chain Lightning jumps to an extra target per rank.
- **🧭 Homing Shrapnel (`homing‑shrapnel`)** – Missile releases homing shrapnel.
- **💣 Volatile Finish (`volatile‑finish`)** – Chain Lightning’s final target explodes.
- **🔄 Unstable Payload (`unstable‑payload`)** – Ricochet Shot grows larger and more damaging each bounce.
- **⚫ Capstone: Unstable Singularity (`unstable‑singularity`)** – Black Hole damages enemies and explodes on expiry.

### Flux Constellation (Resource/Utility)

- **💰 Essence Conduit (`essence‑conduit`)** – Gain more Essence per pickup.
- **🩸 Essence Weaving (`essence‑weaving`)** – Picking up a power heals the player.
- **🧲 Resonance Magnet (`resonance‑magnet`)** – Increases pickup radius.
- **📶 Resonant Frequencies (`resonant‑frequencies`)** – Increases power‑up spawn rate.
- **⏳ Temporal Anomaly (`temporal‑anomaly`)** – Power‑ups decay slower.
- **🌀 Temporal Collapse (`temporal‑collapse`)** – Gravity power leaves a slow field.
- **💎 Power Scavenger (`power‑scavenger`)** – Non‑boss enemies have a chance to drop Essence.
- **🎲 Preordinance (`preordinance`)** – The first power used each stage is duplicated.
- **👥 Quantum Duplicate (`quantum‑duplicate`)** – The Decoy moves away from the player.
- **♻️ Capstone: Energetic Recycling (`energetic‑recycling`)** – Using a power has a chance to not be consumed.
- **🧬 Essence Transmutation (`essence‑transmutation`)** – Every 50 Essence increases max health; capped at 150 %/250 %/300 % of base health depending on rank.

## Implementation Tips for Talents

* Display the talent grid with clear nodes, costs and ranks.  Use colours to indicate locked, available and purchased states.
* Apply talent effects immediately on purchase by updating values in `state.player` or `state` as appropriate.
* Some talents modify existing powers (e.g. Unstable Singularity modifies Black Hole).  Ensure that the modified behaviour is integrated into the power’s implementation.

---

By following this catalogue and the VR Implementation Notes, you will be able to faithfully reproduce every mechanic from Eternal Momentum in a 3D VR environment.  Always cross‑reference with the original game code when implementing behaviours, and add your own notes to this file if you discover subtle interactions that are not captured here.
