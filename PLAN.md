# Game Plan: METRO-9 — Infiltration Protocol

## Risk Tasks

### 1. Connected title-to-play state machine and save restoration
- **Why isolated:** Menus, world selection, customization, ready state, Continue, settings, and actual gameplay must agree without replacing the canvas or losing player choices.
- **Approach:** Keep one Babylon canvas and one explicit `FlowState` owner. Persist selected world and appearance using a versioned localStorage save; Continue resumes a valid selected world/run and otherwise shows a clear empty state. UI actions pass semantic events to the game state.
- **Verify:** Fresh load shows title, not active controls; each button opens its intended state; world choice survives back/continue; Enter World enables movement only after readiness; reload restores saved selection; Escape/back paths do not strand the player.

### 2. Distinct world construction and world switch
- **Why isolated:** Three environments must be physically distinct while retaining compatible mission coordinates, doorway/shop traversal, targets, and collision. A rebuild must occur inside the existing Scene rather than navigating to another page.
- **Approach:** Treat Present, Ancient, and Future as data-driven world variants built from different structural scene recipes (street/buildings/metro; fortress/village/temple/market; neon towers/skybridge/robots/hover vehicles/kiosk). Own runtime meshes through a world root; dispose and reconstruct the selected world in the same Babylon Scene; rebind targets and blockers and reset the spawn without page reload.
- **Verify:** Each choice changes silhouette, landmarks, props, inhabitants, shop, lighting, and clothing. Enter and leave the physical shop in each environment without clipping or being trapped. A world change leaves no duplicate geometry or stale targets.

### 3. Live avatar customization and third-person camera
- **Why isolated:** Customization must be visible on an in-world 3D avatar immediately, and camera/input state must not fight the UI or clip through the nearby structures.
- **Approach:** Give Player a typed appearance model and an `applyAppearance` operation covering face/skin/hair/hair color/eyes/nose/outfit/shoes/accessory, with per-world presets. Keep semantic WASD/Shift/E controls, add Space jump with a simple grounded arc, ignore camera drag while menus are active, and shorten the chase-camera ray against tagged architectural geometry.
- **Verify:** Every control produces a visible model change; per-world outfits load as defaults and remain customizable; jumping lands and does not accumulate height; movement remains camera-relative; menu clicks do not rotate the camera; camera retracts before walls and movement slides around blockers.

## Main Build

Create a connected first-play experience inside the existing full-screen WebDev Babylon app: cinematic METRO-9 title screen → world selection with visual preview cards → visually responsive character transformation → ready-to-enter confirmation → selected 3D world. Keep the city mission, physical accessory display/equip, contact/courier, and in-world HUD. Continue, settings, and how-to controls are functional. Present, Ancient, and Future must each read as different physical locations, not themed recolors.

- **Assets needed:** Three cohesive generated world preview images (Present City, Ancient World, Future World), used in menu preview cards; procedural runtime architecture and actors remain Babylon meshes. Preserve the uploaded city-stone texture for Present City.
- **Verify:**
  - Default load presents a title screen; player cannot move before entering.
  - Start Game → Choose Your World → Character Transformation → Ready to Enter → 3D play works in the same canvas.
  - Each of three world cards selects, highlights, describes, previews, and loads its corresponding distinct environment.
  - Character options for face, skin tone, hair, hair color, eyes, nose, outfit, shoes, and accessory update the large visible 3D avatar immediately; each world applies a suitable initial outfit.
  - Continue, Settings, How to Play, back/cancel, and persisted world/appearance all behave as expected.
  - WASD movement is immediate and camera-relative, Shift runs, Space jumps, mouse drag looks, E interacts, and the physical shop/accessory flow remains navigable.
  - HUD remains minimal and readable; menus do not cover the whole experience more than necessary; no camera spinning, stuck movement, duplicate scenes, missing assets, or console errors.
  - Verify title, selection, creator, and gameplay states with WebDev screenshots; test Present, Ancient, and Future entries and the deterministic `?demo` route.
  - `pnpm check` and `pnpm build` pass.

## Verification results — 2026-09-27

- WebDev screenshots verified the three-world selector, live Future character customization, Ancient entry, and settled Future shop/mission gameplay; generated preview images resolve from managed storage.
- Stateful browser interaction followed Future selection → customization → entry briefing → gameplay; the in-world HUD, observation timer, mission directive, and E interaction prompt appeared in the same canvas. Earlier interaction testing also verified the physical pendant/equip and courier handoff loop.
- Character preview framing now isolates the avatar from NPCs and target markers; Ancient spawn is positioned/oriented toward the open market and its contact.
- Final `pnpm check` and `pnpm build` pass. Vite emits a non-blocking advisory that the Babylon application chunk exceeds 500 kB after minification.
