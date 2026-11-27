// Ground activity: supply crates parachute onto the road; drive into them for a cash burst.
import * as THREE from 'three';
import { ROAD } from '../world/heights';
import { supplyCrate, beacon } from '../world/models/props';
import { bus } from '../core/EventBus';
import { reward, type Activity, type ActivityCtx, type Marker } from './types';

const TIER_MULT = [1, 1.6, 2.6];

interface Crate { obj: THREE.Group; beam: THREE.Mesh; x: number; z: number; groundY: number; y: number; life: number }

export class SupplyCrates implements Activity {
  private crates: Crate[] = [];
  private timer = 4;

  constructor(private scene: THREE.Scene) {}

  private spawn() {
    const s = ROAD[(Math.random() * ROAD.length) | 0];
    const obj = supplyCrate();
    const beam = beacon(0x5fd068);
    const c: Crate = { obj, beam, x: s.x, z: s.z, groundY: s.y + 0.7, y: s.y + 45, life: 100 };
    obj.position.set(c.x, c.y, c.z);
    beam.position.set(c.x, s.y, c.z);
    this.scene.add(obj, beam);
    this.crates.push(c);
    bus.emit('activity', { kind: 'crate', state: 'spawned', text: 'Supply drop incoming! Follow the green beam.' });
  }

  private remove(c: Crate) {
    this.scene.remove(c.obj, c.beam);
    this.crates.splice(this.crates.indexOf(c), 1);
  }

  update(ctx: ActivityCtx) {
    const tier = ctx.tycoon.vehicleTier('car');
    if (tier < 0) return;
    this.timer -= ctx.dt;
    const maxCrates = 1 + tier;
    if (this.timer <= 0 && this.crates.length < maxCrates) {
      this.spawn();
      this.timer = 22 + Math.random() * 15;
    }
    for (const c of [...this.crates]) {
      c.life -= ctx.dt;
      if (c.y > c.groundY) {
        c.y = Math.max(c.groundY, c.y - ctx.dt * 7);
        c.obj.rotation.y += ctx.dt * 0.6;
        if (c.y === c.groundY) {
          const chute = c.obj.getObjectByName('chute');
          if (chute) chute.visible = false;
        }
      }
      c.obj.position.y = c.y + (c.y === c.groundY ? Math.sin(ctx.time * 3) * 0.1 : 0);
      if (c.life <= 0) { this.remove(c); continue; }
      const v = ctx.vehicle;
      if (v && v.kind === 'car' && Math.hypot(v.position.x - c.x, v.position.z - c.z) < 3.6 && Math.abs(v.position.y - c.y) < 4) {
        const amt = ctx.money.earn(reward(ctx.money, 120, 25, TIER_MULT[tier]));
        ctx.particles.coins(c.obj.position, 40);
        ctx.particles.confetti(c.obj.position, 50, 0.6);
        bus.emit('cashCollected', { amount: amt, x: c.x, y: c.y + 1, z: c.z, source: 'crate' });
        this.remove(c);
      }
    }
  }

  markers(): Marker[] {
    return this.crates.map((c) => ({ x: c.x, z: c.z, color: '#5fd068', kind: 'crate' }));
  }
}
