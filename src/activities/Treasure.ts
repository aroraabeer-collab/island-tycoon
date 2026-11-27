// Sea activity: treasure chests bob around the reef; pull alongside and hold E to salvage.
import * as THREE from 'three';
import { baseHeight } from '../world/heights';
import { waveHeight } from '../render/waves';
import { treasureChest, beacon } from '../world/models/props';
import { bus } from '../core/EventBus';
import { reward, type Activity, type ActivityCtx, type Marker } from './types';

const TIER_MULT = [1, 1.5, 2.3];
const SALVAGE_TIME = 1.3;

interface Chest { obj: THREE.Group; beam: THREE.Mesh; x: number; z: number; progress: number }

export class Treasure implements Activity {
  private chests: Chest[] = [];
  private timer = 2;
  prompt: string | null = null;

  constructor(private scene: THREE.Scene) {}

  private spawn() {
    for (let tries = 0; tries < 60; tries++) {
      const a = Math.random() * Math.PI * 2, r = 150 + Math.random() * 110;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const depth = -baseHeight(x, z);
      if (depth < 1.8 || depth > 9) continue;
      const obj = treasureChest();
      const beam = beacon(0xffcc3d);
      beam.position.set(x, 0, z);
      this.scene.add(obj, beam);
      this.chests.push({ obj, beam, x, z, progress: 0 });
      return;
    }
  }

  update(ctx: ActivityCtx) {
    this.prompt = null;
    const tier = ctx.tycoon.vehicleTier('boat');
    if (tier < 0) return;
    const boost = ctx.tycoon.hasEffect('treasureBoost');
    const max = boost ? 6 : 3;
    this.timer -= ctx.dt;
    if (this.timer <= 0 && this.chests.length < max) { this.spawn(); this.timer = 8; }

    for (const c of [...this.chests]) {
      c.obj.position.set(c.x, waveHeight(c.x, c.z, ctx.time) - 0.2, c.z);
      c.obj.rotation.set(Math.sin(ctx.time * 1.2 + c.x) * 0.12, ctx.time * 0.3, Math.cos(ctx.time + c.z) * 0.12);
      const v = ctx.vehicle;
      const near = v && v.kind === 'boat' && Math.hypot(v.position.x - c.x, v.position.z - c.z) < 4 + (v.tier === 2 ? 4 : 0);
      if (!near) { c.progress = Math.max(0, c.progress - ctx.dt); continue; }
      if (ctx.input.interactHeld) {
        c.progress += ctx.dt;
        this.prompt = `Salvaging… ${Math.min(100, Math.round((c.progress / SALVAGE_TIME) * 100))}%`;
      } else this.prompt = 'Hold E to salvage the treasure';
      if (c.progress >= SALVAGE_TIME) {
        const amt = ctx.money.earn(reward(ctx.money, 200, 35, TIER_MULT[tier] * (boost ? 2 : 1)));
        ctx.particles.coins(c.obj.position, 50);
        bus.emit('cashCollected', { amount: amt, x: c.x, y: 1, z: c.z, source: 'treasure' });
        this.scene.remove(c.obj, c.beam);
        this.chests.splice(this.chests.indexOf(c), 1);
      }
    }
  }

  markers(): Marker[] {
    return this.chests.map((c) => ({ x: c.x, z: c.z, color: '#ffcc3d', kind: 'chest' }));
  }
}
