# Assets

**Art direction:** Stylized-realistic late-night urban infiltration scene. Compact, human-scale city block in charcoal and blue-gray stone with restrained teal security signage, warm brass and amber jewellery-shop lighting, wet-but-readable pavement, and an over-the-shoulder third-person camera. The environment should feel lived in and navigable without cinematic blur or heavy post-processing.

**Visual target:** `/home/ubuntu/webdev-static-assets/metro9-reference.png` — generated 2560×1440 in-game screenshot reference; review-only, not used as a runtime backdrop.

## Generated-image prompt summaries

- **Visual target:** Stylized 3D third-person infiltration game screenshot in a compact European-style night city block; blue-gray masonry, warm jewellery-shop windows, a small metro entrance, street fixtures, and restrained teal HUD accents. Reference image only.
- **City-stone tile:** Seamless repeatable blue-gray cut-stone paving texture for sidewalks and selected masonry, framed straight-on without lettering or perspective distortion. Used as a runtime surface texture.

## Textures

| Name | Description | Size | Image |
|---|---|---|---|
| city-stone | Generated seamless blue-gray cut-stone pavers, repeated on selected urban surfaces | 2m tile | `/manus-storage/metro9-stone_85ad7add.png` |

## Procedural 3D Assets

| Name | Description | Size | Image/model |
|---|---|---|---|
| player | Dark-jacketed third-person avatar with head, rounded torso, articulated limbs, and attachment point for pendant | 1.75m tall | Babylon primitive meshes |
| courier | City contact NPC in a recognizable teal-accented field jacket | 1.75m tall | Babylon primitive meshes |
| jeweller | Shopkeeper behind the interior counter | 1.70m tall | Babylon primitive meshes |
| security officer | Patrol/security NPC near the Metro entrance | 1.80m tall | Babylon primitive meshes |
| metro storefront block | Physically navigable sidewalk, masonry buildings, open shop entrance, tiled interior, display counters, glazed windows, and Metro entrance | 40m × 40m footprint; 4–7m building heights | Babylon meshes + city-stone texture |
| vintage pendant | Gold chain ring, oval setting, and teal stone; appears at the display and then on the avatar | 0.25m wide; avatar scale 0.18m | Babylon meshes |
| street props | Lamps, bollards, tree, planter, bench, signs, security camera, window mullions, road markings | 0.3–5m each | Babylon meshes |


## World-selection preview images

Generated 16:9 environment panels used only in the menu/entry briefing; the playable environments themselves are built from Babylon meshes.

| World | Description | Managed image |
|---|---|---|
| Present City | Wet late-night city block, shopfronts, and Metro entrance in slate/amber tones | `/manus-storage/metro9-present-preview_95b03f15.png` |
| Ancient World | Ashen fortress-market streets, lanterns, and stone architecture | `/manus-storage/metro9-ancient-preview_c21b8764.png` |
| Future World | Neon megacity, skybridges, maglev and service kiosks | `/manus-storage/metro9-future-preview_5f83f758.png` |
