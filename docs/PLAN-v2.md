# Island Tycoon v2: Realistic Overhaul, Enterable Buildings, 9 Mini-games

## Context
v1 works but the user's feedback is fair:
- The art is primitive. Every model is procedural flat-shaded boxes, because Kenney blocked downloads.
- There is little to interact with and nothing to do besides walking onto pads.
- There are no mini-games, and no building can be entered.

User decisions for v2:
- **Time:** a week or more.
- **Art:** semi-realistic PBR.
- **Interiors:** every building is enterable.
- **Mini-games:** fishing, tiki-bar bartending, scuba diving, racing against AI, water polo, 8-ball pool, chess, table tennis, and 1v1 football against AI on a huge pitch.

Feasibility research is done. These CC0 sources can be downloaded by script:
- **Poly Haven** (API and direct downloads): 873 PBR textures, including sand, grass, plaster, wood floors, tiles, marble, roof tiles, thatch, bamboo, coral and leather. 300 sky HDRIs, such as `kloofendal_43d_clear_puresky`. 522 models, including `chess_set`, sofas, armchairs, bar stools, lamps, `island_tree_01-03`, `dutch_ship_*` (for the sunken ship), barrels, crates, `lambis_shell`, `football` and bronze statues.
- **KayKit** on GitHub (CC0): furniture and restaurant props as filler where Poly Haven has nothing.
- **Quaternius** on Poly Pizza (CC0, GLBs reachable at `static.poly.pizza/<id>.glb`): animated people and fish. Check each model's license when downloading.
- **Not available as CC0, so modeled in code with PBR materials:** pool table, ping-pong table, goals and nets, vehicles, the stadium.

The existing tycoon loop, economy, saves, vehicle physics, settings and cheats, and dynamic resolution all stay. v2 adds a realistic presentation, interiors, and a life-sim and mini-game layer on top.

## Progress (update as phases complete)
Stopped on 2026-11-27, partway through **P0**, to move the project to a Windows laptop.

**P0, assets**
- [x] `scripts/fetch-assets.mjs` + `assets.config.json`: 26 Poly Haven textures, 29 models, 1 HDRI. Already downloaded into `public/assets` (25 MB); `npm run assets` re-creates them.
- [x] `src/assets/manifest.ts` (generated), `AssetLoader.ts`, `Materials.ts`. They're written and type-check, but nothing uses them yet.
- [x] `CREDITS.md` (generated)
- [ ] **NEXT:** `Renderer`. Add `N8AOPass` in place of `RenderPass`, set the composer target to `samples: 0`, add `SMAAPass` after the output pass, and have dynamic resolution turn off AO before bloom.
- [ ] `Environment` v2: HDRI `kloofendal_43d_clear_puresky` as `scene.environment` (PMREM) and background. Find the sun direction from the brightest HDRI pixel, aim the directional light there, set fog from the horizon color, and retune exposure.
- [ ] Add a loading progress overlay (driven by `assets.progress`) before the title screen.

**P1–P6:** not started (see the phases below).

Decided during P0: cascaded shadow maps were rejected because they conflict with the `onBeforeCompile` shader patches. Use one shadow map that follows the player, 4096 on High.

## Architecture (new and changed modules; every file under 500 lines)
```
scripts/fetch-assets.mjs     downloads from assets.config.json (Poly Haven API / KayKit raw / Poly Pizza),
                             verifies the CC0 license, compresses with gltf-transform (meshopt + webp, 1k/2k), and writes
                             public/assets/** + src/assets/manifest.ts + CREDITS.md
src/assets/AssetLoader.ts    GLTF (meshopt) / HDRI / texture cache, lazy load groups per zone/interior, progress bar
src/assets/Materials.ts      PBR material library: pbr('plaster_white', {repeat, tint}) using diff/nor_gl/arm maps
src/core/Game.ts             slimmed to an orchestrator with a system registry (update order, pause, context object)
src/core/GameContext.ts      shared refs passed to systems (scene, physics, input, money, tycoon, ui, assets)
src/render/                  Environment (HDRI env + background, sun matched to HDRI), CSM shadows (three/addons/csm),
                             N8AO ambient occlusion (npm `n8ao`, MIT) on High, TerrainMaterial (splat: sand/wet sand/
                             grass/rock/coral by height+slope, world UVs + macro variation to hide tiling), Water v2
                             (Gerstner kept + baked normal maps + depth color + foam texture + optional planar
                             reflection on High), Vegetation (instanced Poly Haven trees/grass with LOD), Underwater
                             (fog, caustics, god rays for scuba)
src/world/buildings/         BuildingSpec.ts (footprint, floors, rooms, doors, windows, style, furniture list),
                             generate.ts (walls with door/window cut-outs, floors, ceilings, stairs, roofs, PBR,
                             colliders per wall), archetypes/{hut,shop,bar,villa,mansion,tower,hangar,resort}.ts,
                             Interior.ts (enter/exit detection, roof/upper-floor cutaway, interior lights + local
                             env probe, outdoor culling while inside), Doors.ts (animated doors)
src/characters/              CharacterModel.ts (animated GLB, AnimationMixer, crossfades idle/walk/run/sit/swim/
                             kick), NPC.ts + NPCManager.ts (tourists, staff, customers; schedules), Navigation.ts
                             (waypoint graphs outdoors + per-interior room graphs, A*)
src/interact/                Interactables.ts (registry: radius, prompt, onUse: sit, doors, lights, jukebox,
                             shops, mini-game entry points)
src/minigames/MiniGame.ts    interface + manager: enter/exit, camera takeover, input routing, HUD panel,
                             pause, rewards, high scores in the save
src/minigames/{fishing,bartending,scuba,racing,waterpolo,pool8,chess,tabletennis,football}/
                             each split into pure rules/physics/AI (unit-tested) and a view (3D + UI)
src/quests/                  Quests.ts (guided missions), Collections.ts (fish log, shells, pearls, achievements)
src/save/SaveSystem.ts       schema v2 + v1->v2 migration (keeps purchases and money)
```
Reused as-is or extended: `world/heights.ts` (a new Sports Isle profile is added), `tycoon/*` (new buttons build mini-game venues), `vehicles/*` (physics kept, models get PBR re-skins), `economy/*`, `render/Renderer.ts` (dynamic resolution now also turns off AO and CSM cascades), `core/Settings.ts` and `core/Cheats.ts`, `dev/smoke.ts` (extended), and `scripts/cdp-run.mjs`.

## World changes
- **New Sports and Leisure Isle**, linked to the main island by a bridge road. It holds:
  - a full-size stadium (105×68 pitch, stands, floodlights, goals with nets)
  - a kart circuit
  - an aquatic center (water polo)
  - a jet-ski course in its lagoon

  The main island has no room for a huge pitch.
- **Every enclosed building is enterable (16).** Each is generated from one of 8 archetypes with its own furnishing:

  | Buildings | Archetype | Notable interior |
  |---|---|---|
  | bamboo shack, 3 beach huts | hut | — |
  | bank | shop | vault |
  | tiki bar | bar | bartending game |
  | seafood shack | shop | fish market, where fish are sold |
  | boathouse | shop | dive shop, where scuba starts |
  | lighthouse | tower | spiral stairs to a lookout |
  | 2 villas | villa | 2 floors |
  | mansion | mansion | 3 floors: games room (8-ball, table tennis, chess), library, cinema, bedrooms |
  | hangar | hangar | — |
  | control tower | tower | — |
  | sky resort | resort | lobby, a lift to the rooftop bar, chess in the lounge |
  | atoll beach club | bar | — |

- Each interior has decor pads that are new tycoon buttons, so furnishing a room raises income.
- **Indoor camera:** when inside, the roof and upper floors are cut away, the camera collides against colliders using Rapier ray casts, and a closer preset is used.
- **Life:** NPC tourists wander, visit shops, sit and swim. Staff stand behind counters. Doors, lights, a jukebox, seats and the pool are all usable. A day/night cycle drives NPC schedules and lights.

## Mini-game designs (rules, physics and AI as pure, unit-tested modules)
1. **Fishing** (pier, boat, Sports Isle lagoon):
   - Hold to set cast power, the bobber rides the shared waves, and you react to the bite.
   - The reel-in is a tension bar: keep the fish inside a moving zone.
   - About 15 species by location and time of day, a collection log, and selling at the seafood shack.
2. **Bartending** (tiki bar and beach club): NPC customers queue with order bubbles. You build the cocktail by clicking bottles in recipe order, with a pour-timing meter and a shake. Patience timers set the tips, and difficulty ramps up.
3. **Scuba** (dive shop or boat): underwater mode with fog, caustics and light rays. You swim with an oxygen meter through an instanced coral reef and schools of fish (boids). Collect pearls from clams and loot the sunken `dutch_ship` wreck.
4. **Racing against AI:**
   - Kart circuit with 3 laps against 5 AI karts, plus a jet-ski buoy course.
   - The AI follows a racing-line spline with steering control and light rubber-banding.
   - Countdown, position tracking, a podium and prize money.
   - The player uses the existing Car and Boat physics.
5. **Water polo** (aquatic center pool): 1v1 against AI, each side with an auto goalie. Swimming controller, buoyant ball physics, pass and shoot with charge, first to 5.
6. **8-ball pool** (mansion games room):
   - Custom 2D ball physics: elastic ball collisions, cushions, pockets and friction.
   - Aiming guide and power control.
   - Rules: solids/stripes, scratches, and the 8-ball last.
   - The AI simulates candidate shots and scores the outcomes.
7. **Chess** (mansion library and resort lounge):
   - Full legal move generation: castling, en passant, promotion, check, checkmate and stalemate.
   - Alpha-beta AI with piece-square tables in a Web Worker, with 3 difficulty levels.
   - Uses the Poly Haven `chess_set` model.
8. **Table tennis** (games room and beach club):
   - 3D ball with gravity, bounce and simple spin.
   - The player's paddle follows the mouse in a plane.
   - The AI predicts where the ball will land and reacts with a delay.
   - Games to 11.
9. **Football 1v1** (stadium):
   - Animated players and an auto goalkeeper on each side.
   - Rapier ball physics; dribble, charged shot and tackle.
   - AI states: chase, dribble toward goal, shoot when there's an opening, defend.
   - 3-minute match or first to 3 goals; crowd noise and a replay-cam goal celebration.

Every mini-game is reached through a building or venue that a tycoon button unlocks. Each pays money scaled to income and records high scores. Quests guide the player through them.

## Execution phases (each ends with a playable, tested build)
- **P0, assets (about 0.5 day):** fetch script, manifest, loader, CREDITS.md, PBR material library, HDRI environment.
- **P1, realistic world (about 1.5 days):**
  - Splat terrain, Water v2, real vegetation, CSM shadows, AO.
  - PBR re-skins of all buildings through the BuildingSpec generator (exteriors).
  - PBR vehicle re-skins.
  - Sports Isle terrain and bridge.
- **P2, interiors and life (about 1.5 days):** interior generation for all 16 buildings, doors, indoor camera, interactables, the animated player character, NPCs and navigation, day/night cycle, decor pads.
- **P3, framework and first games (about 1 day):** MiniGame manager, Fishing, Bartending.
- **P4, indoor games (about 1.5 days):** 8-ball pool, Chess, Table tennis.
- **P5, sports and water (about 2 days):** Football stadium plus 1v1 AI, Water polo, Scuba with the wreck, Racing (karts and jet-skis).
- **P6, integration (about 1 day):** progression and quests, collections, save migration, audio (CC0 sound effects if a downloadable source checks out, otherwise synthesized), performance pass, deploy build.

## Performance guardrails
- 1k textures by default, 2k only for hero surfaces.
- Interiors and venues load lazily and are culled when you're not inside or near them.
- Trees are instanced with LODs.
- Dynamic resolution also sheds AO and CSM cascades when frames get slow.
- Budget: 60fps on Apple M-series at "Auto"; under 400 draw calls outdoors.
- The PERF probe (`?perf=1`) is checked for each zone and interior.

## Verification
- `npm test` covers:
  - chess perft node counts from standard positions, plus mate and stalemate detection
  - 8-ball momentum and energy sanity, pocketing and foul rules
  - fishing tension logic
  - football, water polo and table tennis scoring
  - race position ordering and lap counting
  - BuildingSpec validation: every room reachable from the door, colliders closed, no overlapping furniture
  - save migration v1 to v2
  - existing tests stay green
- `npm run build` is clean.
- `?smoke=1` is extended to:
  - enter every building
  - start and finish each mini-game through dev hooks (simulated input or AI-vs-AI)
  - check that rewards are paid
  - check that the game exits cleanly
- `scripts/cdp-run.mjs` screenshots each zone, each interior and each mini-game; I review them visually after every phase.
- A PERF probe run at a Retina size (2560×1440 at 2x) after each phase.
