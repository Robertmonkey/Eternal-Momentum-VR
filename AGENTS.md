AGENTS.md – Guidance for OpenAI Codex
Purpose and Scope
This AGENTS.md file provides guidance for AI agents such as OpenAI Codex when working with this repository, Eternal Momentum: Conduit Command VR. It applies to the entire repository tree. According to the AGENTS.md spec, a file like this defines instructions that apply to all files in the directory tree where it resides; more deeply nested AGENTS.md files take precedence, and direct user or system instructions always override the guidance contained here
gist.githubusercontent.com
.

Project Overview
The repository contains an early VR prototype and the complete 2D browser game source for Eternal Momentum. The goal is to transform the 2D game into a fully immersive first‑person VR experience for the Meta Quest 3.

The Eternal‑Momentum‑OLD GAME/ directory houses the definitive 2D game logic. Treat this directory as read‑only and do not modify its contents. Use it only as a source of truth.

The VR prototype uses the A‑Frame WebXR framework. The key entry point for VR logic is the top‑level script.js file.

Core Directives for AI‑generated code
Bridge, don’t rewrite – Do not modify files under Eternal‑Momentum‑OLD GAME/. Instead, import the necessary functions and the state object (from modules/state.js, modules/gameLoop.js and other modules) into script.js or other new VR modules. Run the gameTick loop and iterate through the state object each frame to update 3D objects’ positions, rotations and visibility
raw.githubusercontent.com
.

Follow the original game’s aesthetics – Use the color variables defined in style.css (for example, --primary‑glow and --secondary‑glow) and maintain the dark/neon palette so that the VR environment adheres to the original game’s aesthetic
raw.githubusercontent.com
.

Use A‑Frame best practices – Create entities with <a‑entity> and related primitives. Keep components modular and avoid tightly coupling game logic with rendering. When adding interactive elements (e.g., super‑hands components for controller interactions), ensure they integrate cleanly with the WebXR controller system.

Leverage the existing game state – The state object defined in modules/state.js drives the entire game. In each animation frame, read values such as state.player.x and state.player.y and translate them into 3D positions. Translate VR controller inputs into calls to original game functions like usePower() or activateCorePower()
raw.githubusercontent.com
.

Iterative implementation phases – Implement features in logical phases as suggested in the README: (1) 3D arena and avatar, (2) enemies and projectiles, (3) command console UI, (4) holographic displays, and (5) full asset conversion. Complete one phase before starting the next
raw.githubusercontent.com
.

Development & Testing Instructions
Local development – WebXR requires HTTPS/localhost. For faster iteration, run a simple HTTP server from the project root. For example, using Node.js you can install and run http‑server and then open the provided local URL (e.g. http://127.0.0.1:8080) in a WebXR‑compatible browser
raw.githubusercontent.com
.

VR hardware – Use a WebXR‑capable headset such as the Meta Quest 3 for immersive testing. On desktop browsers without a headset you can still run A‑Frame scenes in 2D to confirm basic functionality.

Testing and programmatic checks – There are currently no automated tests. Manually verify that 3D objects reflect the game state and that UI interactions (buttons, holograms, etc.) behave correctly. If you introduce unit tests or linters, document how to run them here and ensure they pass after making changes; the AGENTS.md spec requires running any programmatic checks defined in this file
gist.githubusercontent.com
.

Coding Conventions
Language & style – Use modern JavaScript (ES6+). Prefer descriptive variable and function names, and use consistent indentation (two spaces). Write modular, reusable components rather than monolithic scripts.

3D assets – Place models, textures and audio files in the assets/ directory. When adding assets to the scene, declare them inside the <a‑assets> block in index.html so they are preloaded
raw.githubusercontent.com
. Avoid committing large binary assets unless necessary.

Directory structure – Place new reusable modules under modules/ and group UI components in their own folder if the project grows. Keep the repository organized so Codex can understand where to place new code.

Comments – Provide comments explaining complex logic, especially when translating 2D mechanics into 3D VR interactions, to help both human developers and AI agents follow your reasoning.

Pull Request Guidelines
When creating a pull request (PR) with assistance from Codex:

Summarize the feature or fix and reference the relevant implementation phase from the plan.

Describe how you integrated the 2D game logic into the VR context.

Link to any related issues or discussions.

Confirm that the project runs without errors on a local server and that manual tests pass before requesting review.

Scope and Precedence
These instructions apply to the entire repository. If future subdirectories contain their own AGENTS.md files, those will override conflicting guidance in their scope
gist.githubusercontent.com
.

Direct instructions given by the user, developer or system always take precedence over guidance in this file
gist.githubusercontent.com
.
