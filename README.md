# Eternal Momentum VR — Conceptual Prototype

**Eternal Momentum VR** is not a one‑to‑one 3D remake of the original browser game.  Instead it places you inside a virtual control room where you can play the **2D game unchanged** on a huge curved display while reaching out to interact with familiar menus on a wraparound desk.  The intent is to preserve the deep mechanics and interface of the original while enhancing it with spatial awareness, tactile controls and 3D flourishes.

## Vision

Imagine standing at a sleek, waist‑high desk that arcs around you.  In front of you stretches a massive “window” into the Eternal Momentum battlefield: the game’s 2D canvas is rendered at high resolution and wrapped onto a curved screen so you can take in the action by turning your head.  You use your Meta Quest controllers as a laser pointer/hand to drag the cursor across this screen, click on abilities and move your conduit just as you would with a mouse in the desktop version.

Around the desk sit fixed panels representing every major menu and status element from the original game.  There’s a **core menu** to equip and activate aberration cores, an **ascension conduit** to spend AP on talents, a **stage selector** for choosing your next challenge, a **lore codex** screen, a **weaver’s orrery** for weaving talents, sound and pause controls and more.  These panels are built from simple 3D planes with text and buttons; they light up and animate when you look at them or tap them with your controller.  Because they are part of the desk, they always stay in a consistent place in your peripheral vision.

Beyond the screen, certain objects – bosses, enemies, power‑ups and even your conduit – can “pop off” the 2D plane as 3D models.  When a boss charges an attack, a holographic 3D representation rises up from the battlefield; when you collect a power‑up, a glowing orb hovers briefly above the screen before settling back down.  This hybrid approach keeps the core gameplay intact while adding depth and spectacle to the experience.

## How it Works

* **2D game canvas** — The original game’s rendering loop still draws onto a hidden `<canvas>` element exactly as it does in the web version.  A custom A‑Frame component copies that canvas onto the inside of a curved screen geometry in VR.  Dragging the in‑scene cursor updates `state.player.x`/`y` so the game logic receives the same mouse coordinates it expects.

* **VR controller as mouse** — The Meta Quest controllers are configured with laser pointers and grabbing hands.  When you point at the main screen you see a cursor; pulling the trigger simulates a click.  Grabbing the in‑scene marker and moving it across the desk translates into mouse movement on the 2D canvas.  This allows the existing JavaScript modules (e.g. `gameTick`, `activateCorePower`) to run unmodified.

* **Desk panels for menus** — UI elements like the ascension grid, aberration core list, stage menu and codex are re‑created as A‑Frame planes positioned around the desk.  Each has interactive buttons that call into the original modules (e.g. `populateAberrationCoreMenu`, `renderAscensionGrid`) when tapped.  Panels can be shown or hidden by toggles on the desk or via controller buttons.

* **3D embellishments** — Models for bosses, enemies, power‑ups and the player conduit can be imported (GLTF/GLB) and positioned just in front of the curved screen to give the illusion that they’re emerging from the 2D world.  When the game logic spawns an entity or triggers an effect, a corresponding 3D object is instantiated and animated in sync.

## Getting Started

1. **Serve the VR folder** — Use a simple HTTP server to serve the contents of `vr_port`.  For example, from the repository root run:

   ```bash
   npx http-server vr_port
   ```

   Then open the reported URL on a WebXR‑capable browser inside your Meta Quest or on a desktop for testing.

2. **Copy the original game** — Place the original Eternal Momentum JavaScript modules and assets into `vr_port/game` so the VR prototype can import them.  The VR `script.js` expects files like `modules/gameLoop.js`, `modules/state.js`, `modules/cores.js`, etc.  No modifications to these modules are needed; they will render onto the canvas and update the game state as usual.

3. **Run and test** — When you load `index.html` in VR you should see a curved screen displaying the 2D game and a series of panels on the desk.  Use your controllers to move the cursor on the screen, click on powers and open panels.  Most original features (ascension, cores, stage select, lore, orrery) are accessible via their corresponding panels.

4. **Add models and effects** — To get the “pop‑off‑the‑screen” effect, place 3D models in `vr_port/assets` and spawn them from `script.js` when the game logic dictates.  For example, import `boss.glb` with `<a-gltf-model src="assets/boss.glb">` and position it slightly in front of the screen when a boss spawns.

## Implementation Notes

* The VR code is written with [A‑Frame](https://aframe.io/) and loads as an ES module.  See `script.js` for the component definitions and event handlers.
* UI panels use A‑Frame primitives (`a-plane`, `a-text`, `a-box`) and are laid out in a circle around the player at waist height.  Feel free to adjust their positions and scales in `index.html`.
* The existing audio system can be reused.  Place ambient music or core sounds in `assets/` and reference them with `<audio>` and `<a-sound>` elements.  To avoid continuous droning, only play sounds in response to game events.

## Future Work

This README outlines the intended VR experience and supersedes earlier prototypes that attempted to wrap the entire battlefield on a cylinder.  To realise the full vision you will need to:

* Build out each menu panel in 3D with appropriate buttons and integrate them with the original modules.
* Import or model 3D versions of in‑game entities and synchronise them with the 2D game state.
* Polish the visual design, animations and haptics to match Eternal Momentum’s neon‑sci‑fi aesthetic.
* Optimise performance on target hardware once all features are present.

Contributions, feedback and pull requests are welcome as this project evolves toward a complete VR edition of Eternal Momentum.