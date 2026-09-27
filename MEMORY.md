# Memory

- Fresh `web-static` project initialized at `/home/ubuntu/metro9-infiltration`; the user explicitly confirmed continuing with the full METRO-9 prototype.
- Babylon.js `^9.28.0` installed. Keep gameplay under `client/src/game/**`; do not edit backend/server files.
- The generated art reference and seamless city-stone texture are complete. The stone texture is uploaded as `/manus-storage/metro9-stone_85ad7add.png`; keep large image files out of the project tree.
- Three world-selection images are uploaded and used from managed storage: Present `/manus-storage/metro9-present-preview_95b03f15.png`, Ancient `/manus-storage/metro9-ancient-preview_c21b8764.png`, and Future `/manus-storage/metro9-future-preview_5f83f758.png`.
- No Tripo3D key was supplied; the avatar, era outfits, vehicles, shops, and props remain procedural Babylon meshes.

## Implementation and validation

- The continuous-canvas flow now connects title, Continue, world selection, live character customization, entry briefing, play, pause, Settings, and How to Play, with validated local profile/run persistence.
- Present City, Ancient World, and Future World are distinct procedural environments with physical shop/accessory/transit interaction targets. The observation timer, detection state, contact, pendant equip, courier reward, and deterministic `?demo` routes remain in place.
- The creator camera now centers the player in its preview stage and hides NPCs/target markers while customizing. Ancient World uses a spawn position/heading that avoids the rear fort wall and keeps the contact nearby.
- WebDev screenshots verified the world selector, Future creator, Ancient entry, and settled Future shop/mission scenes. The stateful browser exercised Future selection → customization → briefing → play and showed the gameplay HUD/timer/prompt. Earlier browser interaction testing verified pendant purchase/equip and the courier handoff.
- Final `pnpm check` and `pnpm build` pass. Vite emits only a non-blocking large-chunk advisory (>500 kB minified) for the Babylon bundle.
- For an immediate `?demo=spawn` screenshot, the follow camera may still be at its initial pose on the first frame; use the menu flow or settled `?demo=mission` route for visual gameplay captures.

## Handoff

- Save one final checkpoint before delivery. The user can open the checkpoint in WebDev and click **Publish** in the Management UI for managed `*.manus.space` hosting; do not use temporary proxy/tunnel links.
