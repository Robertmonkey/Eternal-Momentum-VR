```markdown
# Eternal Momentum: **Conduit Command VR**

> **Target Platform:** Meta Quest 3 (Touch Plus controllers)  
> **Original Blueprint:** *Eternal Momentum* 2‑D browser game located in `Eternal‑Momentum‑OLD GAME/`  
> **Core Fantasy:** You **are** the Conduit—an awakened mind floating at the centre of a colossal hollow sphere, directing reality‑warping combat from a neon‑lit command deck.

---

## 1 Project Status

| Date | Stage | Notes |
|------|-------|-------|
|2025‑07‑28|**Critical Refactor** | Prototype boots in Quest 3 but UI & gameplay are still incomplete. A full VR‑native rewrite is in progress. |

---

## 2 Development Roadmap

### **Phase 1 — Foundational Fixes (in progress)**
- [ ] **Command Deck Anchoring** – deck & console track player waist‑height in real time.  
- [ ] **3‑D Momentum Movement** – Nexus avatar glides along sphere toward controller cursor.  
- [ ] **Valid Stage Autostart** – enemies + bosses spawn as soon as scene loads.

### **Phase 2 — UI / UX Overhaul**
- [ ] **Command Cluster Console** – wrap‑around panel with physical neon buttons.  
- [ ] **Holographic Menus** – Ascension Grid, Core Attunement, Weaver’s Orrery render as large floating canvases.  
- [ ] **Neon‑Grid Deck Floor** – transparent floor so players can see battlefield beneath.

### **Phase 3 — Full Gameplay Port**
- [ ] **Enemy & Boss AI** – replicate attack patterns from `modules/bosses.js` in 3‑D.  
- [ ] **Game Systems** – health, power‑ups, talents, persistence, achievements.

A living checklist with issue links is kept in **`AGENTS.md § Task Board`**.

---

## 3 VR Control Scheme (Quest 3)

| Action | Controller Input | In‑Game Effect |
|--------|------------------|----------------|
|**Target** location | Aim either controller’s laser pointer at the inside of the sphere | Cursor location updates every frame. |
|**Move Nexus** | *Passive* – Nexus is always attracted to the current cursor | Fluid inertia‑based slide along sphere. |
|**Fire Offensive Power** | **Left Trigger** *(short press)* | Launch offensive ability toward cursor. |
|**Activate Defensive Power** | **Right Trigger** *(short press)* | Defensive shield / dash, etc. |
|**Activate Aberration Core** | **Hold both triggers for 0.15 s** | Fires the equipped Core’s ultimate effect. |
|**Open Menus** | Point at **physical console button** and pull trigger | Opens Ascension, Core, Orrery or Story hologram. |
|**Close Menu** | Pull trigger on “Close” button under hologram | Returns to command view. |
|**Pause / Vignette Toggle** | Quest **ᐧᐧ menu button** *(left controller)* | Opens VR system menu—game auto‑pauses. |

> **No keyboard shortcuts are used in VR gameplay.** Legacy hot‑keys (`A`, `C`, `O`, `L`) remain in the HTML source *only* so the original 2‑D blueprint can be captured to textures; they are irrelevant on Quest 3.

---

## 4 Repository Layout (High‑Level)

```

Eternal‑Momentum‑VR/          ← VR project root
├── index.html                ← A‑Frame scene & assets
├── script.js                 ← VR runtime entry
├── modules/                  ← ES modules (state, powers, cores, etc.)
├── styles.css                ← VR‑specific CSS
├── AGENTS.md                 ← Guide for AI agents / Codex
├── README.md                 ← **THIS FILE**
└── Eternal‑Momentum‑OLD GAME/← Original 2‑D blueprint (do not modify)

```

---

## 5 Understanding the **Old 2‑D Game** (Blueprint)

The 2‑D build is treated as an **immutable specification**—its logic, art and file structure define how the VR version must behave.

### 5.1 Key Legacy Modules
| Module | Responsibility |
|--------|----------------|
|`state.js`|Persistent player data, save / load JSON.|
|`gameLoop.js`|Frame update, spawn tables, collision.|
|`powers.js` & `cores.js`|All offensive/defensive powers & Aberration Core ultimates.|
|`bosses.js`|Boss data & aspect switches.|
|`ascension.js` & `talents.js`|Passive skill tree.|
|`ui.js`|DOM manipulation for modals & HUD.|

### 5.2 Legacy UI Elements (ID reference)
`#loading-screen`, `#home-screen`, `#gameCanvas`, `#unlock-notification`, `#gameOverMenu`, `#ascensionGridModal`, `#aberrationCoreModal`, `#orreryModal`, `#bossInfoModal`

These IDs **must not change**—VR code captures them with **html2canvas** and projects them onto 3‑D panels.

---

## 6 Core VR Experience

1. **Command Deck**  
   - Neon‑grid floor, 2 m radius, always under player.  
   - Console buttons wrap ~240° arc at waist‑height.

2. **BattleSphere**  
   - 16 m diameter hollow sphere; player floats at center.  
   - All entities are children of `#enemyContainer`, positioned **on** sphere’s interior.

3. **Holographic Menus**  
   - Off‑screen DOM rendered to canvas → applied to `#holographicPanel`.  
   - Opens by pointing at console button and squeezing trigger.

4. **Fluid Momentum Gameplay**  
   - Nexus avatar (`#nexusAvatar`) seeks cursor with easing (`moveTowards`).  
   - Powers & projectiles inherit original formulas; distances now use arc‑length.

---

## 7 How to Contribute

1. **Clone & sideload** the project to Quest 3 (WebXR Browser or `adb push`).  
2. **Work in a feature branch**, comment‑out superseded code.  
3. **Test in‑headset**; Quest Browser supports live reload (`CTRL+S` in IDE).  
4. **Create a PR**; tick the relevant checklist lines in `AGENTS.md`.  
5. **Never** overwrite files in `Eternal‑Momentum‑OLD GAME/`—they are a fixed reference.

---

## 8 Credits & Licence

Original game by **Vires Animi Studios** (2023).  
VR port by the open‑source community, 2025.  
All code MIT, art & audio under original proprietary licences—see `/assets/LICENCE.txt`.

---

*Last updated 2025‑07‑28 — controller‑first README to align with Meta Quest 3 gameplay.*
```
