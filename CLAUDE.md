# Island Tycoon — project guide for Claude Code

Original 3D island tycoon web game for an HKU competition (2-person team). Three.js + Rapier physics, Vite + TypeScript, runs in the browser.
Passive income comes from buildings bought on glowing pads. Active income comes from vehicles (car, boat, aircraft, 3 tiers each), supply crates, treasure, rings and a time trial.

**Status:** v1 is complete and playable. The **v2 overhaul** is in progress and started at Phase 0; the full plan and a status checklist are in [docs/PLAN-v2.md](docs/PLAN-v2.md). Read that file before starting v2 work.

## Commands
```bash
npm install          # fresh install on each machine; never copy node_modules (sharp is platform-native)
npm run dev          # http://localhost:5173
npm test             # vitest; pure logic only, no DOM
npm run build        # tsc --noEmit && vite build -> dist/ (static; deploy anywhere)
npm run assets       # re-download/optimize CC0 assets into public/assets (cached; add --force)
npm run shot -- "<url>" <out.png> [marker] [timeoutSec]   # headless Chrome/Edge screenshot via CDP
```
Always run `npx tsc --noEmit`, `npm test` and `npm run build` after changes. For gameplay or visual changes, also verify in the browser (see Verification).

## Rules
- Keep files under 500 lines. Put pure logic (rules, physics, AI, economy) in modules without three/DOM imports, and unit-test them in `tests/`.
- Content is data-driven: `src/world/layout.ts` (placeable objects) and `src/tycoon/progression.ts` (purchase tree). `tests/progression.test.ts` validates both (reachability, pad placement, balance), so keep it green.
- Systems talk through the typed `EventBus` (`src/core/EventBus.ts`).
- Validate untrusted input at boundaries (save data, settings, cheat codes). See `parseSave` and `parseSettings`.
- Commit or push only when the user asks.

## Layout
```
src/core/        Game.ts (orchestrator + frame loop), EventBus, Input, Physics (Rapier wrapper), Settings, Cheats
src/render/      Renderer (post chain + dynamic resolution), Environment (sky/sun/shadows), Water (Gerstner),
                 waves.ts (shared CPU/GPU waves), Foliage, Particles
src/world/       heights.ts (pure terrain + road functions), Terrain (meshes + trimesh), layout.ts, Island (reveal),
                 models/ (v1 procedural low-poly kit; to be replaced in v2)
src/assets/      v2: manifest.ts (GENERATED), AssetLoader (GLB/meshopt, textures, HDRI), Materials (PBR + meter UVs)
src/economy/     MoneyManager (pure), Dropper (cash visuals), Collector (claim pad)
src/tycoon/      progression.ts (data), TycoonState (pure), TycoonManager, TycoonButton
src/player/      Character (Rapier kinematic controller), CameraRig
src/vehicles/    Vehicle base, Car (raycast vehicle), Boat (buoyancy), Aircraft (arcade), VehicleManager
src/activities/  SupplyCrates, Treasure, Rings, TimeTrial, Course
src/ui/          HUD (+minimap), SettingsMenu (Esc), TitleScreen, styles.css
src/audio/       AudioManager (synthesized WebAudio, no files)
src/save/        SaveSystem (versioned, validated localStorage)
src/dev/smoke.ts in-browser end-to-end test (?smoke=1)
scripts/         fetch-assets.mjs + assets.config.json, cdp-run.mjs, cdp-profile.mjs, chrome.mjs (browser locator),
                 heightmap.ts / carsim.ts / vehsim.ts (dev tools; bundle with `npx rolldown <file> --platform node`)
public/assets/   downloaded CC0 assets (textures .webp, models .glb, HDRI). Credits in CREDITS.md
```

## Verification workflow
These are dev-server-only URL flags:
- `?smoke=1`: scripted playthrough. It covers the Esc menu, the MONEYBAGS cheat, buying all 35 pads, and driving, sailing and flying each vehicle. Results are logged as `SMOKE RESULT` with PASS/FAIL lines.
- `?autostart`: skip the title screen.
- `?reveal=1`: show the finished island; nothing is saved.
- `?shot=px,py,pz,tx,ty,tz`: fixed camera.
- `?menu`: open settings.
- `?quality=low`
- `?perf=1`: logs `PERF cpu/gpu ms, draw calls, tris`. Toggles: `&nobloom &noshadow &nowater &nosky &nofoliage &dpr=1`.
- `?judge=1` or F9: ×10 income.

To run the smoke test: `npm run shot -- "http://localhost:5173/?smoke=1" out.png "SMOKE RESULT" 150`.
For a performance check at Retina size: `W=2560 H=1440 DPR=2 MARKS=3 npm run shot -- "http://localhost:5173/?reveal=1&perf=1" p.png PERF 60`. On Windows PowerShell, set env vars with `$env:W=2560`.

Headless Chrome caveats:
- Use frame-based waits, not `setTimeout`, in in-page scripts. Virtual time skips animation frames.
- Dynamic resolution lowers sharpness in headless shots. That's expected.
- Headless GPU timings are unreliable. The user's real browser is the ground truth (press P for the FPS counter).

Cheat codes (Esc menu): MONEYBAGS (infinite money), BUILDITALL, MILLIONAIRE, GARAGE, TURBO.

## Gotchas (learned the hard way)
- **Bloom and bright skies:** the HDR sky must stay dim relative to the bloom threshold (8.0). Otherwise bloom turns the whole screen white. Glow materials use color ×16 to get past the threshold.
- **Post chain:** `EffectComposer.setPixelRatio` must be called whenever the pixel ratio changes (see `Renderer.resize`). Tone mapping happens in the final output pass, so the renderer's own toneMapping stays `NoToneMapping`. Don't add `#include <colorspace_pars_fragment>` to a ShaderMaterial; three already injects it.
- **Sky:** it's baked once into a cubemap (`Environment`). Per-pixel cloud shading every frame was a major GPU cost.
- **Rapier:**
  - Calling `setLinvel` overwrites earlier impulses in the same step. The boat re-reads velocity after buoyancy.
  - The vehicle forward axis is set with the oddly named setter `ctrl.setIndexForwardAxis = 2`.
  - Exiting a vehicle needs low speed; the car uses the Space handbrake.
- **Assets:**
  - Kenney's website blocks scripts (HTTP 403).
  - Poly Haven `island_tree_*` are 1.7–4.7M triangles, so they're unusable. Build palms in code with `palm_tree_bark` and alpha fronds.
  - Poly Haven is all CC0. KayKit on GitHub is CC0.
  - Quaternius models via `static.poly.pizza/<id>.glb`: check the license per model.
- **Shaders:** custom shaders use `onBeforeCompile` (water, foliage sway; the terrain splat is planned). That's why cascaded shadow maps (three CSM) were rejected. Use one shadow map that follows the player (4096 on High).
- **N8AO** (installed, not wired yet): `N8AOPass` replaces `RenderPass` and renders the scene itself. Hardware MSAA doesn't work with it, so pair it with `SMAAPass` and a composer target with `samples: 0`. Set `configuration.gammaCorrection = false` because the output pass handles color, and use `halfRes = true`.

## User preferences / decisions
- The user wants a **semi-realistic PBR** look. They found v1's flat-shaded art "bad" and the game too thin.
- **Every enclosed building must be enterable**, with furnished interiors.
- **Mini-games:** fishing, tiki-bar bartending, scuba diving, racing against AI (karts and jet-skis), water polo, 8-ball pool, chess, table tennis, and 1v1 football against AI on a full-size pitch. The pitch goes on a new Sports Isle reached by a bridge.
- Deadline: a week or more, so quality matters more than speed. Each phase should end in a playable, tested build.
