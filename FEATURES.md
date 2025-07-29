# FEATURES.md - Player Systems & Mechanics Catalog

This document is the canonical, exhaustive reference for all player-facing mechanics in Eternal Momentum. It is derived directly from the original game's source code (`powers.js`, `cores.js`, `talents.js`, `ascension.js`) to ensure a perfect 1-to-1 mechanical port.

## Part 1: Power-up System Mechanics (`powers.js`)

This section details all 18 standard power-ups.

### 🛡️ Shield (`shield`)
* **Code-Derived Mechanics**:
    * Sets `state.player.shield` to `true`.
    * Base duration is **6000ms**.
    * Duration is increased by **1500ms** for each rank of the `aegis-shield` talent.
    * A status effect icon '🛡️' is displayed for the duration.
    * A yellow shield visual is rendered around the player.
    * Spawns 30 yellow particles upon activation.

### ❤️ Heal (`heal`)
* **Code-Derived Mechanics**:
    * Instantly increases `state.player.health` by **30**.
    * Health is capped at `state.player.maxHealth`.

### 💥 Shockwave (`shockwave`)
* **Code-Derived Mechanics**:
    * Creates an expanding shockwave effect originating from the player (or the specified `origin` option).
    * Radius expands to cover the screen (`Math.max(innerWidth, innerHeight)`).
    * Base damage is **15**. If the player's `berserkUntil` timestamp is in the future, damage is **30**.
    * This damage is further multiplied by the player's global damage multipliers.
    * Plays `shockwaveSound.mp3`.

### 🎯 Missile (`missile`)
* **Code-Derived Mechanics**:
    * Creates an instant explosion effect (functionally a fast shockwave) centered on the player (or `origin`).
    * Base damage is **10**. If Berserk is active, damage is **20**.
    * Base radius is **250px**. This is increased by **15%** per rank of the `stellar-detonation` talent.
    * If the `homing-shrapnel` talent is purchased, it also releases **3** seeking shrapnel projectiles.

### ⚡ Chain (`chain`)
* **Code-Derived Mechanics**:
    * Creates a `chain_lightning` effect originating from the player (or `origin`).
    * Base chain count is **6** targets. This is increased by **1** per rank of the `arc-cascade` talent.
    * Selects the nearest valid enemy and chains sequentially to the next nearest un-hit enemy.
    * Base damage is **15**. If Berserk is active, damage is **30**.
    * If the `volatile-finish` talent is purchased, the final target of the chain creates a damaging explosion.
    * Plays `chainSound.mp3`.

### 🌀 Gravity (`gravity`)
* **Code-Derived Mechanics**:
    * Sets `state.gravityActive` to `true` for **1000ms**.
    * While active, all non-boss enemies are pulled towards the center of the screen.
    * If the `temporal-collapse` talent is purchased, a `slow_zone` is created at the center of the screen for **4000ms** after the gravity effect ends.
    * Plays `gravitySound.mp3`.

### 🚀 Speed (`speed`)
* **Code-Derived Mechanics**:
    * Multiplies `state.player.speed` by **1.5** for **5000ms**.
    * A status effect icon '🚀' is displayed for the duration.

### 🧊 Freeze (`freeze`)
* **Code-Derived Mechanics**:
    * Sets the `frozen` flag on all non-boss enemies for **4000ms**, setting their `dx` and `dy` to 0.
    * If the `basilisk` core is active, frozen enemies also become "Petrified," taking increased damage.

### 🔮 Decoy (`decoy`)
* **Code-Derived Mechanics**:
    * Spawns a Decoy entity that lasts for **5000ms**.
    * The Decoy is always `isTaunting`, causing enemies to target it.
    * If the `quantum-duplicate` talent is purchased, the Decoy becomes mobile (`isMobile: true`) and moves away from the player.

### 🧠 Stack (`stack`)
* **Code-Derived Mechanics**:
    * Sets `state.stacked` to `true`.
    * A status effect icon '🧠' is displayed.
    * The next power-up used will be applied twice, after which `state.stacked` is set to `false`.

### 💎 Score (`score`)
* **Code-Derived Mechanics**:
    * Instantly grants `200 + (state.player.level * 10)` Essence.

### 🖐️ Repulsion (`repulsion`)
* **Code-Derived Mechanics**:
    * Creates a `repulsion_field` effect around the player for **5000ms** with a radius of **250px**.
    * The field pushes non-boss enemies away from the player.
    * If the `kinetic-overload` talent is purchased, the field has a powerful initial blast that knocks enemies back significantly.

### ☄️ Orbital Strike (`orbitalStrike`)
* **Code-Derived Mechanics**:
    * Selects **3** random, non-friendly enemies.
    * Creates an `orbital_target` effect at each enemy's location.
    * After a **1500ms** delay, the target location explodes.
    * If the `targeting-algorithm` talent is purchased, the target effect will follow the enemy until it detonates.

### ⚫ Black Hole (`black_hole`)
* **Code-Derived Mechanics**:
    * Creates a `black_hole` effect at the cursor's location for **4000ms**.
    * The effect pulls in nearby enemies and projectiles.
    * Base damage is **3**. If Berserk is active, damage is **6**. This damage is only applied if the `unstable-singularity` talent is purchased.
    * If the `unstable-singularity` talent is purchased, the black hole explodes on expiry.
    * If the `time_eater` core is active, leaves a `dilation_field` for **30 seconds** after expiring.
    * Plays `gravitySound.mp3`.

### 💢 Berserk (`berserk`)
* **Code-Derived Mechanics**:
    * Sets `state.player.berserkUntil` to `Date.now() + 8000`.
    * While active, the player deals double damage with most powers but also takes double damage from collisions.
    * The `unstoppable-frenzy` talent grants immunity to slows and stuns while Berserk is active.
    * The `thermal-runaway` talent extends the duration by **0.1 seconds** for every enemy killed.

### 🔄 Ricochet Shot (`ricochetShot`)
* **Code-Derived Mechanics**:
    * Fires a `ricochet_projectile` towards the cursor with a speed of **10**.
    * The projectile has **6** bounces. Bounces are consumed by hitting walls or enemies.
    * Base damage is **10**.
    * If the `unstable-payload` talent is purchased, the projectile's size and damage increase with each bounce.

### 💫 Bullet Nova (`bulletNova`)
* **Code-Derived Mechanics**:
    * Creates a `nova_controller` effect that lasts for **2000ms**.
    * Every **50ms**, this controller fires a `nova_bullet` in a spiraling pattern.
    * Base damage per bullet is **3**. If Berserk is active, damage is **6**.
    * If the `nova-pulsar` talent is purchased, it fires three spirals of bullets instead of one.

---

## Part 2: Aberration Core System Mechanics (`cores.js`)

This section details the passive and active abilities of all 30 Aberration Cores.

* **Splitter Sentinel Core** (`splitter`):
    * **Passive**: On non-boss enemy death, spawn 3 friendly, seeking `player_fragment` projectiles. Effect has a **500ms** cooldown. Plays `splitterOnDeath.mp3`.
* **Reflector Warden Core** (`reflector`):
    * **Passive**: When using any defensive power, gain a `Reflective Ward` status for **2000ms**, which reflects projectiles.
* **Vampire Veil Core** (`vampire`):
    * **Passive 1**: After avoiding damage for **5000ms**, regenerate `2%` of max health per second.
    * **Passive 2**: When dealing damage, you have a **10%** chance to spawn a seeking `🩸` pickup that restores **20%** of max health.
* **Gravity Tyrant Core** (`gravity`):
    * **Passive**: Every **5000ms**, create a `player_pull_pulse` that expands over **500ms**, pushing enemies and pulling pickups. Plays `gravitySound.mp3`.
* **Swarm Link Core** (`swarm`):
    * **Passive**: For every **2** non-boss enemies killed, add one segment to a cosmetic, damaging tail that follows the player, up to a maximum of **50** segments. Tail segments deal **0.2 HP/frame** to enemies they touch.
* **Mirror Mirage Core** (`mirror_mirage`):
    * **Passive**: When taking damage, spawn a stationary decoy. A maximum of **3** such decoys can exist. Decoys taunt enemies for **2s** every **4-7s**. Plays `mirrorSwap.mp3`.
* **EMP Overload Core** (`emp`):
    * **Passive**: When the player's shield breaks, all enemy projectiles on screen are destroyed. Plays `empDischarge.mp3`.
* **The Architect Core** (`architect`):
    * **Active**: Cooldown **15000ms**. Spawns a ring of **16** `architect_pillar` effects around the player that block enemies for **10000ms**. Plays `architectBuild.mp3`.
* **Aethel & Umbra Core** (`aethel_and_umbra`):
    * **Passive**: Gain **+10%** movement speed while above 50% HP. Gain **+10%** damage while at or below 50% HP.
* **Looping Eye Core** (`looper`):
    * **Active**: Cooldown **10000ms**. For **1000ms**, the player is stunned and immune while a `teleport_locus` follows the cursor. After the delay, the player teleports to the locus's final position. Plays `chargeUpSound.mp3` then `mirrorSwap.mp3`.
* **The Juggernaut Core** (`juggernaut`):
    * **Active**: Cooldown **8000ms**. Player is stunned and charges for **1000ms**, then dashes toward the cursor for **1700ms**. The dash deals **500** damage to bosses and instantly kills non-bosses. Plays `chargeUpSound.mp3` then `chargeDashSound.mp3`.
* **The Puppeteer Core** (`puppeteer`):
    * **Passive**: Every **4000ms**, the farthest non-boss enemy is permanently converted to a friendly 'puppet'. Plays `puppeteerConvert.mp3`.
* **The Glitch Core** (`glitch`):
    * **Passive**: On collision with a non-boss enemy, there is a **25%** chance to instantly kill it and spawn a random power-up. Plays `glitchSound.mp3`.
* **Sentinel Pair Core** (`sentinel_pair`):
    * **Passive**: When a decoy is active, a cosmetic but damaging lightning tether connects the player and the decoy.
* **The Basilisk Core** (`basilisk`):
    * **Passive**: Enemies affected by the player's Shockwave or Freeze abilities become "Petrified" for **3000ms**, taking **20%** increased damage.
* **The Annihilator Core** (`annihilator`):
    * **Active**: Cooldown **25000ms**. Channels a `player_annihilation_beam` for **4000ms**. For the final **1000ms**, the beam kills all non-bosses and deals **1000** damage to bosses not in the shadow of another boss. Plays `powerSirenSound.mp3`.
* **The Parasite Core** (`parasite`):
    * **Passive**: Any damage dealt by the player infects non-boss enemies for **10000ms**. Infected enemies spawn a friendly spore upon death.
* **Quantum Shadow Core** (`quantum_shadow`):
    * **Passive**: Using a defensive power grants the "Phased" status for **2000ms**, allowing the player to pass harmlessly through non-boss enemies and projectiles. Plays `phaseShiftSound.mp3`.
* **Time Eater Core** (`time_eater`):
    * **Passive**: When the Black Hole power-up expires, it leaves a `dilation_field` for **30000ms** that slows projectiles.
* **The Singularity Core** (`singularity`):
    * **Passive 1**: **5%** chance to duplicate any power-up effect.
    * **Passive 2**: **15%** chance to not consume a power-up on use.
* **The Miasma Core** (`miasma`):
    * **Passive**: After standing still for **3000ms**, a friendly `miasma_gas` effect is created. It heals the player and damages enemies at a rate of **30 HP/s**. Moving cancels the effect.
* **The Temporal Paradox Core** (`temporal_paradox`):
    * **Passive**: When an offensive power is used, a `paradox_player_echo` is created. This echo repeats the same power-up activation **1000ms** later from the player's original position, dealing **50%** damage. Plays `phaseShiftSound.mp3`.
* **The Syphon Core** (`syphon`):
    * **Passive**: Attempting to use an empty power-up slot (offensive or defensive) creates a `syphon_cone` effect for **1000ms** that pulls all pickups towards the player. This has a **1000ms** cooldown. Plays `syphonFire.mp3`.
* **The Centurion Core** (`centurion`):
    * **Passive**: When a boss wave spawns, **4** `containment_pylon` effects are created in the corners of the arena, which tether and slow nearby enemies. Plays `architectBuild.mp3`.
* **The Fractal Horror Core** (`fractal_horror`):
    * **Passive**: Reduces player radius by **50%** and increases base speed by **50%**.
* **The Obelisk Core** (`obelisk`):
    * **Passive**: Collecting any power-up grants a `Conduit Charge` status, stacking up to **3**. When the player would take damage, one charge is consumed to negate it and release a non-damaging shockwave. Plays `conduitShatter.mp3`.
* **The Helix Weaver Core** (`helix_weaver`):
    * **Passive**: While the player is stationary, a `helix_bolt` projectile is fired every **1000ms**. Plays `weaverCast.mp3`.
* **The Epoch-Ender Core** (`epoch_ender`):
    * **Passive**: Once every **120000ms**, when the player would take fatal damage, they instead revert to their position and health from **2 seconds** prior. Plays `timeRewind.mp3`.
* **The Shaper of Fate Core** (`shaper_of_fate`):
    * **Passive**: At the start of each stage, **3** `rune_of_fate` pickups are spawned. Collecting one grants a permanent buff for that stage (e.g., +5% damage, +20px pickup radius).
* **The Pantheon Core** (`pantheon`):
    * **Passive**: Every **10000ms**, grants a random unlocked Aberration Core's passive effect as a buff for **30000ms**. A maximum of **3** buffs can be active. Plays `shaperAttune.mp3`.

---

## Part 3: Ascension Talent System Mechanics (`talents.js` & `ascension.js`)

This section details every talent from the Ascension Conduit. Effects are derived from `applyAllTalentEffects`.

### Core Constellation
* **💠 Core Nexus** (`core-nexus`): The central starting node. Max Ranks: 1. Cost: [1].
* **⚛️ Capstone: Overload Protocol** (`overload-protocol`): When inventory is full, picking up a power-up instantly uses it. Max Ranks: 1. Cost: [50].
* **✚ Core Reinforcement** (`core-reinforcement`): Increases Max Health by **5** per rank. Max Ranks: 9999. Cost: [5 per rank].
* **💨 Momentum Drive** (`momentum-drive`): Increases Movement Speed by **1%** per rank. Max Ranks: 9999. Cost: [5 per rank].
* **🔥 Weapon Calibration** (`weapon-calibration`): Increases all Damage by **1%** per rank. Max Ranks: 9999. Cost: [5 per rank].

### Aegis Constellation (Defensive/Utility)
* **❤️ Exo-Weave Plating** (`exo-weave-plating`): Increases Max Health by **+15**, **+20**, **+25** for each rank respectively. Max Ranks: 3. Cost: [1, 2, 2].
* **🔋 Extended Capacitor** (`aegis-shield`): Increases Shield duration by **1.5s** per rank. Max Ranks: 2. Cost: [1, 1].
* **🏃 Solar Wind** (`solar-wind`): Increases base movement speed by **6%** per rank. Max Ranks: 2. Cost: [1, 2].
* **💥 Aegis Retaliation** (`aegis-retaliation`): When your Shield breaks, it releases a defensive shockwave. Max Ranks: 1. Cost: [2].
* **❄️ Cryo-Shatter** (`cryo-shatter`): Enemies defeated while Frozen have a **25%** (Rank 1) / **50%** (Rank 2) chance to shatter, damaging nearby enemies. Max Ranks: 2. Cost: [2, 3].
* **🖐️ Kinetic Overload** (`kinetic-overload`): Activating Repulsion Field causes a massive initial knockback blast. Max Ranks: 1. Cost: [3].
* **👻 Capstone: Phase Momentum** (`phase-momentum`): After avoiding damage for **8s**, gain **+10%** speed and move through non-boss enemies. Max Ranks: 1. Cost: [4].
* **✳️ Glacial Propagation** (`glacial-propagation`): Enemies shattered by Cryo-Shatter have a **50%** chance to briefly freeze nearby enemies. Max Ranks: 1. Cost: [3].
* **✨ Reactive Plating** (`reactive-plating`): After taking damage, **25%** chance to release a small knockback pulse (5s cooldown). Max Ranks: 1. Cost: [3].
* **💔 Contingency Protocol** (`contingency-protocol`): Once per stage, prevent fatal damage, set HP to 1, and gain a 3s shield. Max Ranks: 1. Cost: [4].

### Havoc Constellation (Offensive)
* **📈 High-Frequency Emitters** (`high-frequency-emitters`): Increases all damage by **5%** (Rank 1) / **12%** (Rank 2). Max Ranks: 2. Cost: [1, 2].
* **💢 Unstoppable Frenzy** (`unstoppable-frenzy`): While Berserk is active, you are immune to Slow and Stun effects. Max Ranks: 1. Cost: [2].
* **♾️ Thermal Runaway** (`thermal-runaway`): While Berserk is active, defeating an enemy extends its duration by **0.1s**. Max Ranks: 1. Cost: [3].
* **💥 Stellar Detonation** (`stellar-detonation`): Increases Missile explosion radius by **15%** per rank. Max Ranks: 2. Cost: [1, 1].
* **🛰️ Targeting Algorithm** (`targeting-algorithm`): Orbital Strike now locks on and tracks its target. Max Ranks: 1. Cost: [2].
* **💫 Nova Pulsar** (`nova-pulsar`): Bullet Nova fires three spiraling waves instead of one. Max Ranks: 1. Cost: [3].
* **⛓️ Arc Cascade** (`arc-cascade`): Chain Lightning jumps to **1** additional target per rank. Max Ranks: 2. Cost: [2, 2].
* **🧭 Homing Shrapnel** (`homing-shrapnel`): Missile releases seeking shrapnel upon impact. Max Ranks: 1. Cost: [2].
* **💣 Volatile Finish** (`volatile-finish`): The final target of Chain Lightning erupts in an explosion. Max Ranks: 1. Cost: [3].
* **🔄 Unstable Payload** (`unstable-payload`): Ricochet Shot projectiles grow larger and more damaging with each bounce. Max Ranks: 1. Cost: [3].
* **⚫ Capstone: Unstable Singularity** (`unstable-singularity`): Black Hole now damages enemies and explodes on expiry. Max Ranks: 1. Cost: [4].

### Flux Constellation (Resource/Utility)
* **💰 Essence Conduit** (`essence-conduit`): Gain **10%** (Rank 1) / **25%** (Rank 2) more Essence. Max Ranks: 2. Cost: [1, 2].
* **🩸 Essence Weaving** (`essence-weaving`): Picking up a power-up restores **2%** of max health. Max Ranks: 1. Cost: [3].
* **🧲 Resonance Magnet** (`resonance-magnet`): Increases pickup radius by **75px** per rank. Max Ranks: 2. Cost: [1, 1].
* **📶 Resonant Frequencies** (`resonant-frequencies`): Increases power-up spawn rate by **10%** per rank. Max Ranks: 2. Cost: [2, 3].
* **⏳ Temporal Anomaly** (`temporal-anomaly`): Power-ups decay **25%** (Rank 1) / **50%** (Rank 2) slower. Max Ranks: 2. Cost: [1, 2].
* **🌀 Temporal Collapse** (`temporal-collapse`): Gravity power-up leaves behind a temporary slow field for 4s. Max Ranks: 1. Cost: [2].
* **💎 Power Scavenger** (`power-scavenger`): Non-boss enemies have a **1%** (Rank 1) / **2.5%** (Rank 2) chance to drop an Essence pickup. Max Ranks: 2. Cost: [2, 2].
* **🎲 Preordinance** (`preordinance`): The first power-up used each stage is duplicated. Max Ranks: 1. Cost: [4].
* **👥 Quantum Duplicate** (`quantum-duplicate`): Your Decoy now moves away from your position. Max Ranks: 1. Cost: [2].
* **♻️ Capstone: Energetic Recycling** (`energetic-recycling`): Using a power-up has a **20%** chance to not be consumed. Max Ranks: 1. Cost: [4].
* **🧬 Essence Transmutation** (`essence-transmutation`): Every 50 Essence increases max health by 1. Capped at **150%** (R1), **250%** (R2), or **300%** (R3) of base max health. Max Ranks: 3. Cost: [4, 4, 4].
