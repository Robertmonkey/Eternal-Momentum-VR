# Eternal Momentum VR Prototype

This repository contains a **proof‑of‑concept** virtual‑reality port of the
**Eternal Momentum** game.  The goal of this prototype is to demonstrate how
the 2D canvas‑based gameplay of Eternal Momentum can be transported into a
three‑dimensional VR environment using modern WebXR technologies.  It is not
a complete game, but rather a polished starting point for further
development.

## Features

* **360° battlefield** — A hidden `<canvas>` element renders a simplified
  approximation of the original 2D game.  The contents of this canvas are
  wrapped around the player on the inner surface of a cylinder using a
  custom `canvas‑texture` component.  As you turn your head you can see
  different parts of the canvas.
* **Waist‑height UI table** — A circular table surrounds the player at
  waist level.  Score, health and aberration core cooldown indicators are
  presented on panels placed on the table so they are easy to glance at
  without breaking immersion.
* **Aberration core** — A spinning sphere floats above the table and plays
  positional audio.  Clicking the sphere triggers an example “active
  ability” which starts a cooldown timer and awards points.  The sphere is
  interactive and can be extended with more mechanics (e.g. grabbing or
  swapping cores).
* **Drag‑to‑move avatar** — Your in‑game avatar is represented by a blue
  box on the platform.  Grab it with your VR controller and move it around
  the platform; its position is projected back onto the 2D canvas.  In
  this prototype moving the avatar gives you points and clamps the
  movement to the platform boundary.
* **Directional audio** — The aberration core emits a continuous tone
  (`assets/core_sound.wav`) which gets quieter as you move away or turn
  your head, giving a sense of spatial presence.

## Running the Prototype

1. Install a recent version of the [Meta Quest 3](https://www.meta.com/)
   browser or any WebXR‑capable browser on your VR headset or desktop.
2. Serve the contents of this repository using a simple HTTP server
   (browsers often block local file access for security reasons).  From
   within the repository root, run for example:

   ```bash
   npx http-server .
   ```

   Then open the reported URL in your VR browser.  Alternatively you can
   open `index.html` in a WebXR‑capable desktop browser for a
   non‑VR preview.
3. Use your controllers to grab the blue avatar box and move it around.
   Click the red aberration core to trigger its cooldown and see the UI
   update.  Turn your head to observe the battlefield wrapped around you.

## Integrating the Full Game

This prototype does **not** include the full Eternal Momentum codebase
(`modules/bosses.js`, `modules/gameLoop.js`, etc.).  To turn this into a
complete VR version:

1. **Ensure the game modules are present** — The core JavaScript modules
   from Eternal Momentum are included in this repository under the
   `modules/` directory.  `script.js` imports them directly so no extra
   copying is required.

2. **Ensure the canvas ID matches** — The hidden canvas element in
   `index.html` has the id `gameCanvas`, which matches what
   `gameLoop.js` expects.  You do not need to rename anything; simply
   make sure the original game’s rendering code draws onto this canvas.

3. **Synchronise the avatar** — When the blue avatar box is moved in
   VR, `script.js` converts its 3D position back into 2D coordinates and
   assigns them to `state.player.x` and `state.player.y`.  If you
   customise the canvas projection (e.g. wrapping it differently), you
   may need to adjust the conversion logic in `script.js`.

4. **Extend the UI** — Add additional panels to the table for displaying
   talents, ascension grids, stage selection, etc.  These can be built
   from `a-plane` elements with `a-text` children.  Use A‑Frame’s
   interaction components to make them clickable and bind their actions
   to functions imported from the game’s modules.

5. **Replace placeholder assets** — Swap the simple sphere representing
   the aberration core with a proper 3D model (GLTF/GLB) that matches
   your art style.  Place the file in `assets/` and reference it via
   `<a-gltf-model src="assets/yourModel.glb">`.

## Known Limitations

* The original Eternal Momentum is a complex 2D browser game.  Porting
  every mechanic to VR will require thoughtful redesign of interfaces and
  controls.  This prototype focuses on establishing the spatial UI and
  demonstrating how the 2D surface can wrap around the player.
* Performance may vary depending on the target hardware.  Meta Quest 3
  should handle the simple geometry and textures used here, but once the
  full game logic and assets are integrated profiling and optimisation
  will be necessary.

Feel free to build upon this foundation to create a fully fledged VR
experience for Eternal Momentum.  Contributions and pull requests are
welcome!