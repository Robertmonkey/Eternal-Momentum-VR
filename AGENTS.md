
---

## 📄 New `AGENTS.md`

```markdown
# AGENTS.md — Definitive Guide for Codex‑Style Agents

> **Read this first.** Every pull‑request is validated against the rules below.

---

## 1  Core Experience (What the player **must** feel)

1. **Grounded in Space**  
   The Command Deck is a static island; the player can walk around it (room‑scale) but it never follows the headset or rotates.  
2. **Instant Glanceable HUD**  
   A 210‑degree arc of panels (“Command Cluster”) sits ~1 m in front of the deck at waist height.  
3. **360° Battlesphere**  
   All gameplay happens on the inner surface of a 24 m radius sphere. Nothing spawns on the deck itself.

These requirements are repeated because play‑testers reported nausea when anything on the deck moved. 

---

## 2  Architectural Absolutes

| ID | Directive |
|----|-----------|
| A1 | _Never_ manipulate the live DOM for visible VR UI. Build with A‑Frame entities. |
| A2 | _Never_ place gameplay entities on or inside the Command Deck. |
| A3 | Use **primitive shapes + emoji textures only** (no custom 3‑D models). |
| A4 | All saves/telemetry stay in browser `localStorage`; no network calls. |
| A5 | Code must compile under ES Modules; keep Node scripts in `tests/`. |

Violating any A‑rule blocks a merge.

---

## 3  Master Task List (updated 2025‑07‑29)

### 3.1 Priority 1 — Un‑break the Prototype
- **T1.1  World‑Anchor Deck & UI** ✅
  * Create `#commandDeck` (**positioned once**) at `(0 1.0 0)`.  
  * Register `world-stationary` component that **does nothing in `tick`**; _DO NOT_ attach to the headset.  
  * Panels/buttons live under `#commandDeck`.  
- **T1.2  Stage Start** ✅ – call `resetGame()` then `spawnBossesForStage()` on `enter-vr`.
- **T1.3  3‑D Momentum Movement** ✅ – port lines 401‑404 from 2‑D `gameLoop.js` with spherical maths.

### 3.2 Priority 2 — Command Cluster & Menus
- **T2.1 ** ✅ Wrap‑around panel layout (array‑driven builder).
- **T2.2 ** ✅ Emoji‑labelled cylinder buttons (mixin `console‑button`).
- **T2.3 ** ✅ Holographic menus via `html2canvas` → texture on `a-plane`.
- **T2.4 ** ✅ Procedural neon‑grid floor (`gridCanvas` → `a-plane` below deck).

---

## 4  Workflow for Agents

1. Read both `README.md` (vision) and this file (rules).  
2. Pick the **highest‑priority unchecked task** and create a branch.  
3. Implement _without deleting legacy code_; comment‑out with reason if replacement is needed.  
4. Update this file: check the task, add a concise changelog entry.  
5. Open a PR titled `feat: T1.1 world‑anchor deck` (_example_).

---

## 5  File Quick‑Reference

| Sub‑System | Key File(s) |
|------------|-------------|
| VR scene bootstrap | `script.js`, `index.html` |
| UI builder (new)  | `modules/vrCommandCluster.js` |
| Spherical movement maths | `modules/movement3d.js` |
| Legacy 2‑D spec | `/Eternal‑Momentum‑OLD GAME/*` |

---

## 6  Common Pitfalls & Fixes

* **Head‑Locked HUD** → _Reject_. Move panels under `#commandDeck`.  
* **Blue placeholder cylinders** → replace with `console‑button` mixin (see T2.2).  
* **Entities at (Y < 1)_** → ensure Y matches sphere surface; use helper `placeOnSphere()`.

---

## Changelog

- T1.1 implemented: command deck now fixed at `(0 1 0)` using `world-stationary`.
- T1.2 implemented: stage resets on `enter-vr`.
- T1.3 implemented: 3-D Momentum movement on the battle sphere.
- T2.1 implemented: wrap-around panels built via `vrCommandCluster.js`.
- T2.2 implemented: emoji cylinder buttons using `console-button` mixin.
- T2.3 implemented: holographic menus rendered with `html2canvas`.
- T2.4 implemented: neon grid floor drawn to `gridCanvas`.
- Added local `three.module.js` under `/vendor` for GitHub Pages.

Happy hacking. The galaxy counts on your code!
