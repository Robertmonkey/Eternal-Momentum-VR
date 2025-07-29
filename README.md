# Eternal Momentum VR — Room‑Scale Conduit Command

_A neon‑drenched, first‑person re‑imagining of the 2‑D bullet‑hell classic._

---

## 1  Project Vision

You, the **Conduit**, stand on a transparent **neon‑grid Command Deck** that floats at the **exact centre of a hollow battle‑sphere**.  
* The deck is a **static island** in world space; it **never rotates or drifts** with the headset.  
* A wrap‑around **Command Cluster** of holographic panels and emoji‑labelled buttons hovers at **waist height** in front of the deck.  
* Look up and you see every boss, shot and pickup curving across the inner surface of the sphere.

This layout gives players a rock‑solid reference point, preventing VR disorientation and motion sickness. 

---

## 2  Non‑Negotiable Comfort & Accessibility Rules

| # | Rule | Why |
|---|------|-----|
| 1 | **Command Deck never moves or turns.** | Any unexpected motion can induce nausea. |
| 2 | **UI fixed in world space, not head‑locked.** | Lets the player glance at stats without cluttering view. |
| 3 | **Clear “Re‑Centre” control (`R` key or **Center** button).** | Players may drift around a room‑scale space. |
| 4 | **High‑contrast neon theme matches 2‑D original.** | Visual continuity and readability. |
| 5 | **All saves & telemetry stay in `localStorage` only.** | Offline‑first design. |

---

## 3  Current Status

The VR prototype boots but the HUD is a placeholder and gameplay entities spawn incorrectly.  
A critical refactor is in progress to:

1. Spawn the Nexus, enemies and projectiles **only on the battle‑sphere**.  
2. Re‑implement _Momentum_ movement in 3‑D.  
3. Replace DOM‑driven HUD with the world‑anchored Command Cluster. 

---

## 4  Phase Roadmap

### Phase 1 — Make It Play (foundation)
- Anchor Command Deck & UI at fixed world coordinates.  
- Start a valid stage automatically in VR.  
- Port 3‑D Momentum movement.

### Phase 2 — Tactile HUD (UI/UX)
- Build the Command Cluster (wrap‑around panels + physical buttons).  
- Render HTML menus to holographic planes via `html2canvas`.  
- Paint the glowing neon‑grid floor.

### Phase 3 — Full Content Port
- Re‑implement bosses, powers, cores and talents with 3‑D logic.  
- Add dynamic quality settings and comfort options.

---

## 5  Quick‑Start for Developers

```bash
npm install
npm run dev   # launches local server with hot‑reload
npm test      # runs nav‑mesh & movement unit tests
Open index.html in a WebXR‑enabled browser or press Ctrl+Shift+I then Enter VR in the emulator.

6  Repository Map (abridged)
bash
Copy
/index.html          ← A‑Frame VR scene
/script.js           ← runtime bootstrap
/modules/…           ← ES modules (3‑D rewrite)
/Eternal‑Momentum‑OLD GAME/  ← 2‑D blueprint
/AGENTS.md           ← in‑depth AI agent guide
/README.md           ← you are here
yaml
Copy
