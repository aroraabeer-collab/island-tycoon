// Owns the three vehicles, handles unlock/upgrade events and entering/exiting (E).
import * as THREE from 'three';
import type { Physics } from '../core/Physics';
import type { Input } from '../core/Input';
import { bus, type VehicleKind } from '../core/EventBus';
import { SPOTS } from '../world/layout';
import { terrainHeight } from '../world/heights';
import { VEHICLE_NAMES } from '../world/models/vehicles';
import type { Vehicle } from './Vehicle';
import { Car } from './Car';
import { Boat } from './Boat';
import { Aircraft } from './Aircraft';

export class VehicleManager {
  readonly car: Car;
  readonly boat: Boat;
  readonly air: Aircraft;
  readonly all: Vehicle[];
  active: Vehicle | null = null;
  prompt: string | null = null;

  constructor(scene: THREE.Scene, physics: Physics) {
    const c = SPOTS.car, b = SPOTS.boat, a = SPOTS.air;
    this.car = new Car('car', scene, physics, { x: c.x, y: terrainHeight(c.x, c.z) + 1.2, z: c.z, rot: c.rot });
    this.boat = new Boat('boat', scene, physics, { x: b.x, y: 0.6, z: b.z, rot: b.rot });
    this.air = new Aircraft('air', scene, physics, { x: a.x, y: terrainHeight(a.x, a.z) + 2.4, z: a.z, rot: a.rot });
    this.all = [this.car, this.boat, this.air];
    bus.on('vehicleUnlocked', ({ kind, tier }) => this.byKind(kind).setTier(tier, true));
  }

  byKind(kind: VehicleKind): Vehicle {
    return kind === 'car' ? this.car : kind === 'boat' ? this.boat : this.air;
  }

  private reach(v: Vehicle) {
    return v.kind === 'boat' ? 4 + v.tier * 2.5 : v.kind === 'air' ? 5 : 3.5;
  }

  /** Handle E to enter/exit. Returns the vehicle change, if any. */
  handleInteract(input: Input, player: THREE.Vector3): { entered?: Vehicle; exited?: Vehicle } {
    this.prompt = null;
    if (this.active) {
      const v = this.active;
      const slow = v.speed < (v.kind === 'air' ? 6 : 4);
      this.prompt = slow ? `E  Exit ${VEHICLE_NAMES[v.kind][v.tier]}   ·   R  Reset` : null;
      if (input.wasPressed('KeyR')) v.respawn();
      if (input.interact && slow) {
        this.active = null;
        v.occupied = false;
        bus.emit('vehicleExited', { kind: v.kind });
        return { exited: v };
      }
      return {};
    }
    let best: Vehicle | null = null, bd = Infinity;
    for (const v of this.all) {
      if (!v.unlocked) continue;
      const d = v.position.distanceTo(player);
      if (d < this.reach(v) && d < bd) { bd = d; best = v; }
    }
    if (!best) return {};
    this.prompt = `E  Enter ${VEHICLE_NAMES[best.kind][best.tier]}`;
    if (input.interact) {
      this.active = best;
      best.occupied = true;
      bus.emit('vehicleEntered', { kind: best.kind });
      return { entered: best };
    }
    return {};
  }

  step(h: number, input: Input, time: number) {
    for (const v of this.all) if (v.unlocked) v.step(h, v === this.active ? input : null, time);
  }

  sync(dt: number) {
    for (const v of this.all) if (v.unlocked) { v.sync(dt); v.animate(dt); }
  }
}
