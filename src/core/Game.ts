// Wires every system together and runs the frame loop.
import * as THREE from 'three';
import { bus } from './EventBus';
import { Input, isTyping } from './Input';
import { SettingsStore, type Settings, type GraphicsMode } from './Settings';
import { lookupCheat, CHEATS, type CheatId } from './Cheats';
import { Physics } from './Physics';
import { Renderer } from '../render/Renderer';
import { Environment } from '../render/Environment';
import { Water } from '../render/Water';
import { Foliage } from '../render/Foliage';
import { Particles } from '../render/Particles';
import { waveHeight } from '../render/waves';
import { globalUniforms } from '../world/models/kit';
import { Terrain } from '../world/Terrain';
import { Island } from '../world/Island';
import { SPOTS } from '../world/layout';
import { terrainHeight } from '../world/heights';
import { MoneyManager, offlineEarnings, formatMoney } from '../economy/MoneyManager';
import { Dropper } from '../economy/Dropper';
import { Collector } from '../economy/Collector';
import { TycoonManager } from '../tycoon/TycoonManager';
import { BUTTONS, START_MONEY } from '../tycoon/progression';
import { Character } from '../player/Character';
import { CameraRig } from '../player/CameraRig';
import { VehicleManager } from '../vehicles/VehicleManager';
import { SupplyCrates } from '../activities/SupplyCrates';
import { Treasure } from '../activities/Treasure';
import { Rings } from '../activities/Rings';
import { TimeTrial } from '../activities/TimeTrial';
import type { Marker } from '../activities/types';
import { HUD } from '../ui/HUD';
import { SettingsMenu } from '../ui/SettingsMenu';
import { AudioManager } from '../audio/AudioManager';
import { SaveSystem } from '../save/SaveSystem';

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 12000);
  readonly renderer: Renderer;
  readonly save = new SaveSystem();
  readonly audio = new AudioManager();
  private env: Environment;
  private input: Input;
  private particles: Particles;
  private island: Island;
  private money = new MoneyManager();
  private tycoon: TycoonManager;
  private dropper: Dropper;
  private collector: Collector;
  private player: Character;
  private cam: CameraRig;
  private vehicles: VehicleManager;
  private crates: SupplyCrates;
  private treasure: Treasure;
  private rings: Rings;
  private trial: TimeTrial;
  private hud!: HUD;
  private timer = new THREE.Timer();
  private time = 0;
  private playing = false;
  private playTime = 0;
  private autosave = 10;
  private frame = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private showFps = false;
  private settingsStore = new SettingsStore();
  private settings: Settings = this.settingsStore.load();
  private menu: SettingsMenu | null = null;
  private paused = false;
  private cheatsOn = new Set<CheatId>();

  private constructor(container: HTMLElement, private ui: HTMLElement, private physics: Physics) {
    this.renderer = new Renderer(container, this.scene, this.camera);
    this.env = new Environment(this.scene, this.renderer.renderer);
    new Water(this.scene);
    const terrain = new Terrain(this.scene);
    terrain.trimeshes.forEach((t) => physics.addTrimesh(t.vertices, t.indices));
    const exclusions = [
      ...Island.exclusions(),
      ...BUTTONS.map((b) => ({ x: b.pad[0], z: b.pad[1], r: 3 })),
      { x: SPOTS.spawn.x, z: SPOTS.spawn.z, r: 6 },
    ];
    const foliage = new Foliage(this.scene, exclusions);
    foliage.palms.forEach((p) => physics.addCylinder(p.x, p.y, p.z, 4, 0.35));

    this.particles = new Particles(this.scene);
    this.island = new Island(this.scene, physics);
    this.tycoon = new TycoonManager(this.scene, this.money, this.island, this.particles);
    this.dropper = new Dropper(this.scene, this.island);
    this.collector = new Collector(this.scene, this.money, this.particles);
    const spawn = new THREE.Vector3(SPOTS.spawn.x, terrainHeight(SPOTS.spawn.x, SPOTS.spawn.z), SPOTS.spawn.z);
    this.player = new Character(this.scene, physics, spawn);
    this.cam = new CameraRig(this.camera);
    this.vehicles = new VehicleManager(this.scene, physics);
    this.crates = new SupplyCrates(this.scene);
    this.treasure = new Treasure(this.scene);
    this.rings = new Rings(this.scene);
    this.trial = new TimeTrial(this.scene);
    this.input = new Input(this.renderer.canvas);

    bus.on('splash', ({ x, z }) => this.particles.splash(new THREE.Vector3(x, waveHeight(x, z, this.time), z), 3));
    bus.on('buttonPurchased', () => this.persist());
    bus.on('win', () => {
      bus.emit('toast', { text: 'PARADISE COMPLETE! You built the ultimate island!', kind: 'win' });
      for (let i = 0; i < 6; i++) setTimeout(() => this.particles.confetti(this.island.topOf('statue'), 160, 1.4), i * 350);
    });
    window.addEventListener('beforeunload', () => this.persist());
    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (e.code === 'Escape' && this.playing) { this.menu?.handleEscape(); return; }
      if (e.code === 'KeyM') this.audio.toggleMute();
      if (e.code === 'KeyQ') {
        const order: GraphicsMode[] = ['auto', 'high', 'low'];
        const next = order[(order.indexOf(this.settings.graphics) + 1) % order.length];
        this.applySettings({ ...this.settings, graphics: next });
        bus.emit('toast', { text: `Graphics: ${next.toUpperCase()}`, kind: 'info' });
      }
      if (e.code === 'F9') { e.preventDefault(); this.toggleJudge(); }
      if (e.code === 'KeyP') this.applySettings({ ...this.settings, showFps: !this.settings.showFps });
    });
    if (new URLSearchParams(location.search).get('judge') === '1') this.money.judgeMultiplier = 10;
  }

  static async create(container: HTMLElement, ui: HTMLElement): Promise<Game> {
    const physics = await Physics.create();
    return new Game(container, ui, physics);
  }

  private toggleJudge() {
    this.money.judgeMultiplier = this.money.judgeMultiplier > 1 ? 1 : 10;
    bus.emit('toast', { text: `Judge mode ${this.money.judgeMultiplier > 1 ? 'ON (x10 income)' : 'OFF'}`, kind: 'info' });
  }

  /** Load (or reset) progress and hand control to the player. */
  start(reset: boolean) {
    this.audio.start();
    if (reset) this.save.reset();
    const data = this.save.load();
    if (data) {
      data.purchased.forEach((id) => this.tycoon.restore(id));
      this.money.money = data.money;
      this.money.pending = data.pending;
      this.money.totalEarned = data.totalEarned;
      this.playTime = data.playTime;
      this.trial.best = data.bestTrial;
      const away = offlineEarnings((Date.now() - data.savedAt) / 1000, this.money.incomePerSec / this.money.judgeMultiplier);
      if (away >= 1) {
        if (this.money.autoDeposit) this.money.money += away; else this.money.pending += away;
        setTimeout(() => bus.emit('toast', { text: `While you were away: +${formatMoney(away)}`, kind: 'money' }), 800);
      }
    } else {
      this.money.money = START_MONEY;
    }
    this.tycoon.syncPads();
    this.hud = new HUD(this.ui, this.money, this.tycoon.state, this.camera);
    this.menu = new SettingsMenu(this.ui, {
      getSettings: () => this.settings,
      apply: (next) => this.applySettings(next),
      cheat: (code) => this.applyCheat(code),
      activeCheats: () => CHEATS.filter((c) => this.cheatsOn.has(c.id)).map((c) => c.code),
      resetIsland: () => { this.save.reset(); this.debug = true; location.reload(); },
      onOpenChange: (open) => { this.paused = open; this.input.clear(); },
    });
    // Releasing pointer lock (Esc while mouse-looking) pauses the game.
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.playing && !this.paused) this.menu?.toggle(true);
    });
    this.applySettings(this.settings);
    this.cam.snap(this.player.position, Math.PI);
    this.cam.pitch = 0.32;
    this.playing = true;
  }

  /** Internals for the dev smoke test (src/dev/smoke.ts). */
  get dev() {
    this.debug = true; // never persist a scripted session
    return { player: this.player, vehicles: this.vehicles, tycoon: this.tycoon, money: this.money, menu: this.menu, isPaused: () => this.paused };
  }

  /** Debug (?reveal=1): show the finished island without touching the save. */
  private debug = false;
  revealAll() {
    this.debug = true;
    for (const b of BUTTONS) this.tycoon.restore(b.id);
    this.tycoon.syncPads();
    this.hud.updateZones();
  }

  /** Debug: place the camera for screenshots. */
  shot(px: number, py: number, pz: number, tx: number, ty: number, tz: number) {
    this.shotCam = { p: new THREE.Vector3(px, py, pz), t: new THREE.Vector3(tx, ty, tz) };
  }
  private shotCam: { p: THREE.Vector3; t: THREE.Vector3 } | null = null;

  /** Apply + persist settings to every system that uses them. */
  applySettings(next: Settings) {
    const prevGraphics = this.settings.graphics;
    this.settings = next;
    this.settingsStore.save(next);
    this.audio.setVolume(next.volume);
    this.cam.sensitivity = next.sensitivity;
    this.cam.invertY = next.invertY;
    this.showFps = next.showFps;
    if (!next.showFps) this.hud?.setFps(null);
    if (next.graphics !== prevGraphics || !this.graphicsApplied) {
      this.renderer.setMode(next.graphics);
      this.graphicsApplied = true;
    }
    this.menu?.refresh();
  }
  private graphicsApplied = false;

  /** Cheat codes typed into the settings menu. */
  applyCheat(input: string): { ok: boolean; message: string } {
    const def = lookupCheat(input);
    if (!def) return { ok: false, message: 'Unknown code.' };
    const on = def.toggle ? !this.cheatsOn.has(def.id) : true;
    if (def.toggle) { if (on) this.cheatsOn.add(def.id); else this.cheatsOn.delete(def.id); }
    switch (def.id) {
      case 'infinite':
        this.money.infinite = on;
        this.tycoon.pads.forEach((p) => p.setAffordable(true));
        break;
      case 'turbo':
        this.money.judgeMultiplier = on ? 10 : 1;
        break;
      case 'rich':
        this.money.money += 1_000_000;
        break;
      case 'buildall': {
        for (const b of BUTTONS) this.tycoon.restore(b.id);
        this.tycoon.syncPads();
        this.hud.updateZones();
        this.particles.confetti(this.player.position.clone().setY(this.player.position.y + 3), 220, 1.3);
        this.persist();
        break;
      }
      case 'garage':
        for (const kind of ['car', 'boat', 'air'] as const) {
          this.tycoon.state.vehicleOverride.set(kind, 2);
          this.vehicles.byKind(kind).setTier(2, true);
        }
        break;
    }
    const verb = def.toggle ? (on ? 'ON' : 'OFF') : 'applied';
    bus.emit('toast', { text: `Cheat ${def.code} ${verb}`, kind: 'unlock' });
    return { ok: true, message: `${def.description} — ${verb}` };
  }

  persist() {
    if (!this.playing || this.debug) return;
    this.save.save({
      money: this.money.money, pending: this.money.pending, totalEarned: this.money.totalEarned,
      purchased: [...this.tycoon.state.purchased], playTime: this.playTime, bestTrial: this.trial.best,
    });
  }

  run() {
    this.renderer.renderer.setAnimationLoop(() => this.tick());
  }

  private markers(): Marker[] {
    const out: Marker[] = [];
    for (const p of this.tycoon.pads) out.push({ x: p.position.x, z: p.position.z, color: this.money.canAfford(p.def.cost) ? '#7dffa0' : '#9aa7b0', kind: 'pad' });
    out.push({ x: SPOTS.collectorPad.x, z: SPOTS.collectorPad.z, color: '#ffd34d', kind: 'pad' });
    for (const v of this.vehicles.all) if (v.unlocked && !v.occupied) out.push({ x: v.position.x, z: v.position.z, color: '#ffffff', kind: 'pad' });
    for (const a of [this.crates, this.treasure, this.rings, this.trial]) out.push(...a.markers());
    return out;
  }

  private hint(focus: THREE.Vector3): string {
    const st = this.tycoon.state;
    if (st.purchased.size === 0) return 'Walk onto the <b>glowing green pad</b> to build your first Cash Dropper.';
    if (!this.money.autoDeposit && this.money.pending > 5) return `Your collector holds <b>${formatMoney(this.money.pending)}</b> — step on the <b>gold pad</b> to bank it.`;
    const pad = this.tycoon.nearestPad(focus);
    if (pad && this.money.canAfford(pad.cost)) {
      const d = Math.round(Math.hypot(pad.pad[0] - focus.x, pad.pad[1] - focus.z));
      return `You can afford <b>${pad.label}</b> (${d}m away — green dot on the map).`;
    }
    if (st.vehicleTier('car') >= 0 && !this.vehicles.active) return 'Hop in a vehicle (<b>E</b>) and chase supply drops, treasure and rings for bonus cash!';
    return 'Saving up… active income from vehicles speeds things up.';
  }

  /** Dev perf probe (?perf=1): CPU vs GPU (gl.finish) time per frame. */
  perf: { cpu: number; gpu: number; n: number; on: boolean } = { cpu: 0, gpu: 0, n: 0, on: false };

  private tick() {
    const t0 = performance.now();
    this.timer.update();
    const rawDt = this.timer.getDelta();
    this.renderer.adapt(rawDt);
    const dt = Math.min(rawDt, 0.05);
    this.fpsAcc += rawDt; this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      if (this.showFps && this.hud) {
        const r = this.renderer;
        this.hud.setFps(`${Math.round(this.fpsFrames / this.fpsAcc)} FPS · res ${r.currentPixelRatio.toFixed(2)}x${r.bloomOn ? '' : ' · no bloom'}${r.shadowsOn ? '' : ' · no shadows'}`);
      }
      this.fpsAcc = 0; this.fpsFrames = 0;
    }
    this.time += dt;
    this.frame++;
    globalUniforms.uTime.value = this.time;
    const input = this.input;
    input.poll();

    let focus = this.player.position;
    let heading: number | undefined;
    let speed = 0;

    if (this.playing && this.paused) {
      // Menu open: world keeps rendering, gameplay is frozen.
      focus = this.vehicles.active?.position ?? this.player.position;
      this.cam.update(dt, input, focus, this.vehicles.active?.heading, 0);
      this.hud.update(dt);
      if (this.frame % 30 === 0) this.hud.drawMinimap(focus, this.vehicles.active?.heading ?? this.player.root.rotation.y, this.markers());
    } else if (this.playing) {
      this.playTime += dt;
      const change = this.vehicles.handleInteract(input, this.player.position);
      if (change.entered) {
        this.player.setEnabled(false);
        const v = change.entered;
        this.cam.setPreset(v.kind === 'car' ? 'car' : v.kind === 'air' ? 'air' : v.tier === 2 ? 'yacht' : 'boat');
      } else if (change.exited) {
        const p = change.exited.exitPoint();
        p.y = Math.max(p.y, terrainHeight(p.x, p.z));
        this.player.teleport(p);
        this.player.setEnabled(true);
        this.cam.setPreset('foot');
      }
      this.physics.update(dt, (h) => {
        this.player.step(h, input, this.cam.yaw);
        this.vehicles.step(h, input, this.time);
      });
      this.player.syncVisual(dt);
      this.vehicles.sync(dt);

      const v = this.vehicles.active;
      if (v) { focus = v.position; heading = v.heading; speed = v.speed; }
      this.tycoon.update(focus, this.time, dt);
      this.collector.update(focus, this.time, dt);
      this.money.tick(dt);

      const ctx = { dt, time: this.time, player: focus, vehicle: v, input, money: this.money, tycoon: this.tycoon.state, particles: this.particles };
      this.crates.update(ctx);
      this.treasure.update(ctx);
      this.rings.update(ctx);
      this.trial.update(ctx);

      this.hud.setPrompt(this.treasure.prompt ?? this.vehicles.prompt);
      this.hud.setStatus(this.rings.status ?? this.trial.status);
      if (this.frame % 15 === 0) this.hud.setHint(this.hint(focus));
      if (this.frame % 4 === 0) this.hud.drawMinimap(focus, heading ?? this.player.root.rotation.y, this.markers());
      this.hud.update(dt);
      this.audio.update(speed, v?.throttle ?? 0);

      this.autosave -= dt;
      if (this.autosave <= 0) { this.autosave = 10; this.persist(); }
      this.cam.update(dt, input, focus, heading, speed);
      if (this.shotCam) { this.camera.position.copy(this.shotCam.p); this.camera.lookAt(this.shotCam.t); focus = this.shotCam.t; }
    } else {
      // Title screen flyover.
      const a = this.time * 0.05;
      this.camera.position.set(Math.cos(a) * 240, 75, Math.sin(a) * 240);
      this.camera.lookAt(0, 5, 0);
      focus = new THREE.Vector3(0, 0, 0);
    }

    this.env.update(focus);
    this.island.update(this.time);
    this.dropper.update(dt, this.money.incomePerSec);
    this.particles.update(dt);
    const t1 = performance.now();
    if (this.perf.on) { this.renderer.renderer.info.autoReset = false; this.renderer.renderer.info.reset(); }
    this.renderer.render();
    input.endFrame();
    if (this.perf.on) {
      const gl = this.renderer.renderer.getContext();
      gl.finish();
      const p = this.perf;
      p.cpu += t1 - t0; p.gpu += performance.now() - t1; p.n++;
      if (p.n === 120) {
        const info = this.renderer.renderer.info.render;
        console.log(`PERF cpu ${(p.cpu / p.n).toFixed(2)}ms gpu ${(p.gpu / p.n).toFixed(2)}ms calls ${info.calls} tris ${info.triangles}`);
        p.cpu = p.gpu = p.n = 0;
      }
    }
  }
}
