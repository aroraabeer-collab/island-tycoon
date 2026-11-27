// Air activity: fly through a ring course around the island. With the Atoll Beach Club,
// the course ends over the far atoll for a x3 payout.
import * as THREE from 'three';
import { Course, type Gate } from './Course';
import { bus } from '../core/EventBus';
import { SPOTS } from '../world/layout';
import { reward, type Activity, type ActivityCtx, type Marker } from './types';

const TIER_MULT = [1, 1.5, 2.2];
const TIME_LIMIT = 75;

function islandLoop(withAtoll: boolean): Gate[] {
  const gates: Gate[] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = 2.4 + (i / n) * Math.PI * 2; // start near the airfield, go around
    const r = 115 + Math.sin(i * 1.7) * 30;
    gates.push({ pos: new THREE.Vector3(Math.cos(a) * r, 26 + Math.sin(i * 2.3) * 12 + (i % 3) * 5, Math.sin(a) * r), radius: 6 });
  }
  if (withAtoll) {
    gates.push({ pos: new THREE.Vector3(-210, 30, 170), radius: 7 });
    gates.push({ pos: new THREE.Vector3(SPOTS.atollPad.x, 14, SPOTS.atollPad.z), radius: 8 });
  }
  return gates;
}

export class Rings implements Activity {
  private course: Course;
  private atoll = false;
  private cooldown = 0;
  private built = false;

  constructor(scene: THREE.Scene) {
    this.course = new Course(scene);
  }

  update(ctx: ActivityCtx) {
    const tier = ctx.tycoon.vehicleTier('air');
    const enabled = tier >= 0 && ctx.tycoon.hasEffect('rings');
    const atoll = ctx.tycoon.hasEffect('atoll');
    if (enabled && (!this.built || atoll !== this.atoll)) {
      this.atoll = atoll;
      this.course.setGates(islandLoop(atoll));
      this.course.reset();
      this.built = true;
    }
    this.cooldown -= ctx.dt;
    const v = ctx.vehicle;
    const flying = !!v && v.kind === 'air';
    this.course.refresh(ctx.time, enabled && (flying || this.course.running));
    if (!enabled) return;
    const c = this.course;
    if (!c.running) {
      if (flying && this.cooldown <= 0 && c.hit(0, v!.position)) {
        c.index = 1;
        c.elapsed = 0;
        bus.emit('activity', { kind: 'rings', state: 'started', text: `Ring run started! ${c.gates.length - 1} rings to go` });
      }
      return;
    }
    c.elapsed += ctx.dt;
    if (c.elapsed > TIME_LIMIT || !flying) {
      bus.emit('activity', { kind: 'rings', state: 'failed', text: 'Ring run failed — fly through the first ring to retry' });
      c.reset();
      this.cooldown = 2;
      return;
    }
    if (c.hit(c.index, v!.position)) {
      ctx.particles.confetti(c.gates[c.index].pos, 30, 0.5);
      c.index++;
      if (c.index >= c.gates.length) {
        const mult = TIER_MULT[tier] * (this.atoll ? 3 : 1);
        const amt = ctx.money.earn(reward(ctx.money, 600, 60, mult));
        const at = v!.position.clone();
        ctx.particles.coins(at, 60);
        bus.emit('cashCollected', { amount: amt, x: at.x, y: at.y, z: at.z, source: 'rings' });
        bus.emit('activity', { kind: 'rings', state: 'done', text: `Course complete in ${c.elapsed.toFixed(1)}s${this.atoll ? ' — ATOLL x3!' : ''}` });
        c.reset();
        this.cooldown = 4;
      } else {
        bus.emit('activity', { kind: 'rings', state: 'progress', text: `Ring ${c.index - 1}/${c.gates.length - 1}` });
      }
    }
  }

  get status(): string | null {
    const c = this.course;
    return c.running ? `RINGS ${c.index - 1}/${c.gates.length - 1}  ·  ${(TIME_LIMIT - c.elapsed).toFixed(0)}s` : null;
  }

  markers(): Marker[] {
    if (!this.built) return [];
    const i = this.course.running ? this.course.index : 0;
    const g = this.course.gates[i];
    return g ? [{ x: g.pos.x, z: g.pos.z, color: '#ffd34d', kind: 'ring' }] : [];
  }
}
