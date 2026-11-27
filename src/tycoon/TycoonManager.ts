// Connects the pure TycoonState to the world: pads, reveals, particles, events.
import * as THREE from 'three';
import { TycoonState } from './TycoonState';
import { TycoonButton } from './TycoonButton';
import { BUTTON_BY_ID, type ButtonDef } from './progression';
import type { MoneyManager } from '../economy/MoneyManager';
import { formatMoney } from '../economy/MoneyManager';
import type { Island } from '../world/Island';
import type { Particles } from '../render/Particles';
import { bus } from '../core/EventBus';
import { VEHICLE_NAMES } from '../world/models/vehicles';

export class TycoonManager {
  readonly state: TycoonState;
  private buttons = new Map<string, TycoonButton>();

  constructor(
    private scene: THREE.Scene,
    private money: MoneyManager,
    private island: Island,
    private particles: Particles,
  ) {
    this.state = new TycoonState(money);
  }

  /** Spawn pads for whatever is currently available (call after restoring a save). */
  syncPads() {
    for (const id of this.state.available) if (!this.buttons.has(id)) {
      this.buttons.set(id, new TycoonButton(BUTTON_BY_ID.get(id)!, this.scene));
    }
    for (const [id, btn] of this.buttons) if (!this.state.available.has(id)) {
      btn.dispose(this.scene);
      this.buttons.delete(id);
    }
  }

  /** Re-apply a saved purchase without animation or cost. */
  restore(id: string) {
    const def = this.state.restore(id);
    if (def) this.applyWorld(def, false);
  }

  private applyWorld(def: ButtonDef, animate: boolean) {
    def.targets.forEach((t, i) => {
      if (animate) setTimeout(() => this.island.reveal(t, true), i * 120);
      else this.island.reveal(t, false);
    });
    for (const e of def.effects ?? []) {
      if (e.type === 'vehicle') bus.emit('vehicleUnlocked', { kind: e.kind, tier: e.tier, name: VEHICLE_NAMES[e.kind][e.tier] });
    }
    if (!animate) return;
    const at = def.targets.length ? this.island.topOf(def.targets[0]) : new THREE.Vector3(def.pad[0], 4, def.pad[1]);
    this.particles.confetti(at, 140);
    bus.emit('buttonPurchased', { id: def.id, label: def.label, x: at.x, y: at.y, z: at.z, animate });
    if (def.effects?.some((e) => e.type === 'win')) bus.emit('win', {});
  }

  update(player: THREE.Vector3, time: number, dt: number) {
    for (const [id, btn] of this.buttons) {
      btn.setAffordable(this.money.canAfford(btn.def.cost));
      btn.update(time);
      const on = btn.contains(player);
      if (!on) { btn.occupied = false; btn.dwell = 0; continue; }
      if (btn.occupied) continue;
      btn.dwell += dt;
      if (btn.dwell < 0.2) continue;
      btn.occupied = true;
      const r = this.state.buy(id);
      if (r.ok) {
        this.applyWorld(r.def, true);
        this.syncPads();
        bus.emit('buttonsAvailable', { ids: [...this.state.available] });
      } else if (r.reason === 'funds') {
        bus.emit('purchaseDenied', { id });
        bus.emit('toast', { text: `Need ${formatMoney(btn.def.cost - this.money.money)} more for ${btn.def.label}`, kind: 'info' });
      }
    }
  }

  /** Closest available pad (for the HUD hint arrow). */
  nearestPad(from: THREE.Vector3): ButtonDef | null {
    let best: ButtonDef | null = null, bd = Infinity;
    for (const btn of this.buttons.values()) {
      const d = btn.position.distanceTo(from) + (this.money.canAfford(btn.def.cost) ? 0 : 1000);
      if (d < bd) { bd = d; best = btn.def; }
    }
    return best;
  }

  get pads() { return [...this.buttons.values()]; }
}
