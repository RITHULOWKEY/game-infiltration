# METRO-9 Runtime Structure

## Runtime boundary

`client/src/components/GameCanvas.tsx` owns one full-screen Babylon `Engine` for the React component lifetime. `client/src/game/scene.ts` creates the Babylon `Scene`, constructs the selected world, attaches the HUD, starts the update loop, and returns a `GameHandle` with the scene and cleanup method. React contributes only the canvas host; gameplay remains in framework-agnostic modules under `client/src/game/`.

## Game modules

| Module | Responsibility |
|---|---|
| `client/src/game/scene.ts` | Owns the title-to-play flow, screen transitions, world changes, camera, mission/timer/detection state, interaction handling, local-save integration, and deterministic `?demo` routes. |
| `client/src/game/WorldCatalog.ts` | Defines the Present City, Ancient World, and Future World selection data, location copy, and managed preview-image URLs. |
| `client/src/game/SaveStore.ts` | Validates and persists the selected world, character appearance, settings, mission progress, position, and credits in browser-local storage. |
| `client/src/game/InputManager.ts` | Maps keyboard actions (WASD, Shift, Space, E, Escape) and pointer-drag camera input, with listener cleanup and menu/dialog gating. |
| `client/src/game/Player.ts` | Procedural third-person avatar, live appearance customization, era-specific attire, movement/jump/collision, and pendant equipment. |
| `client/src/game/World.ts` | Builds and disposes the distinct Present, Ancient, and Future scenes in one Babylon Scene; owns shops, NPCs, landmarks, accessory displays, transit/vehicle targets, collision blockers, and actor-visibility control. |
| `client/src/game/Hud.ts` | Renders the title, world selection, character creator, entry briefing, settings/how-to/pause screens, plus the in-game timer, directive, detection/credits, prompts, toasts, and dialogs. |
| `client/src/game.css` | Full-screen game presentation, responsive menu flow, HUD overlays, character-preview stage, and typography. |

## State ownership

The scene update loop owns the 180-second observation timer, security awareness, field credits, mission stages, menu/play transitions, and world switching. `Player` owns movement and appearance. `World` exposes targets, collision blockers, lighting-owned geometry, and actor/marker visibility. `Hud` renders snapshots and sends semantic UI actions back to the scene. `SaveStore` validates browser-local profile/run data.

The first-play flow is title → world selection → live character customization → ready briefing → selected 3D world. The mission loop is to observe the district, contact an informant, inspect/equip the marked pendant from the physical shop, and return to the courier/transit landmark for the field-credit handoff. The same physical-interaction pattern is available across the three eras.

## Asset hints

The generated city-stone image is served from managed WebDev storage and used as a repeated Babylon texture in Present City. Three generated world-preview images are used in the selection and briefing screens; runtime buildings, props, characters, outfits, and landmarks are procedural Babylon meshes. Large image assets stay in managed storage, not the project source tree.
