# Eternal Momentum VR Prototype

This repository contains a **proof‑of‑concept** virtual‑reality port of the
**Eternal Momentum** game.  The goal of this prototype is to demonstrate how
the 2D canvas‑based gameplay of Eternal Momentum can be transported into a
three‑dimensional VR environment using modern WebXR technologies.  It is not
a complete game, but rather a polished starting point for further
development.

## VR Philosophy

Eternal Momentum VR aims to preserve the feel of the original 2D game while
placing the player inside a spacious arena.  Instead of running around in VR,
you stand on a platform and project a laser pointer from your controller
onto a huge **180° curved screen** that surrounds you.  The on‑screen avatar
follows this pointer just like a mouse cursor on a monitor.  All familiar UI
elements appear on the surrounding table so you can play entirely from this
balcony‑like viewpoint.  A full 3D version may come later, but the current
focus is making every original mechanic comfortable to use in VR.

## Features

* **Large curved screen** — The 2D game canvas is mapped onto a 180° cylinder around you. Point at the screen with your controller to steer your character.
* **Waist‑height UI table** — A circular table surrounds the player at
  waist level.  Score, health and aberration core cooldown indicators are
  presented on panels placed on the table so they are easy to glance at
  without breaking immersion.
* **Aberration core** — A spinning sphere floats above the table and plays
  positional audio.  Clicking the sphere or squeezing both controller
  triggers together activates the core’s ability and starts its cooldown
  timer.  The sphere is interactive and can be extended with more mechanics
  (e.g. grabbing or swapping cores).
* **Pointer-based movement** — Raise your hand to project a cursor on the curved screen. Your on-screen avatar follows the pointer automatically.
* **Directional audio** — The aberration core emits a continuous tone
  (`assets/core_sound.wav`) which gets quieter as you move away or turn
  your head, giving a sense of spatial presence.
* **Boss health display** — When a boss spawns, a panel shows its name and
  remaining hit points so you can track the encounter without leaving VR.
* **Quick restart button** — A reset button on the table immediately
  restarts the run, mirroring the original game’s "retry" functionality.
* **Status effect icons** — Active buffs and debuffs appear as emojis on a
  panel so you can quickly see what affects your character.
* **Power queue cycling** — Use the grip buttons on your VR controllers to
  rotate through your offensive and defensive power queues. Upcoming powers are
  shown beneath the main icons so you always know what will trigger next.
* **Controller shortcuts** — Face buttons open common menus (A: stage select,
  B: pause, X: core menu, Y: ascension grid). Press the left thumbstick for the
  lore codex and the right thumbstick for the orrery menu.

## Visual Style

The VR prototype mirrors the original game's synth‑wave aesthetic. Deep blues
and star‑filled backdrops contrast with bright cyan and magenta highlights.
Core colours are defined in `style.css` using custom properties:

```css
:root {
  --primary-glow: #00ffff;
  --secondary-glow: #f000ff;
  --dark-bg: #1e1e2f;
  --ui-bg: rgba(20, 20, 40, 0.85);
}
```

Panels and text elements use these variables so the glowing accents match the
2D interface. The VR arena places you above a cosmic horizon using
`assets/bg.png` for the skybox. When creating new VR elements, reuse
`--primary-glow` and `--secondary-glow` for emissive colours and text to keep
the neon look cohesive.

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
3. Aim your controller at the large screen and click to move your character. Click the red aberration core to trigger its cooldown.
4. If the menus appear far below or above you, recenter your headset. The VR camera rig starts at the world origin so your real head height determines the in‑game eye level.
5. The 2D game appears on a curved wall covering roughly 180° in front of you. If you do not see it after entering VR, face forward and ensure your browser has entered immersive mode.

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

3. **Cursor coordinates** — The VR controller ray updates `state.player.x` and `state.player.y` based on where it intersects the game screen.

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
experience for Eternal Momentum.  Contributions and pull requests are welcome!
