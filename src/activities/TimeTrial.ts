// Road time trial: drive through the checkered arch, hit every checkpoint around the loop, return.
import * as THREE from 'three';
import { Course, type Gate } from './Course';
import { ROAD } from '../world/heights';
import { LAYOUT_BY_ID } from '../world/layout';
import { bus } from '../core/EventBus';
import { reward, type Activity, type ActivityCtx, type Marker } from './types';

const LOOP_LENGTH = ROAD.reduce((s, p, i) => s + Math.hypot(ROAD[(i + 1) % ROAD.length].x - p.x, ROAD[(i + 1) % ROAD.length].z - p.z), 0);
const TARGET = LOOP_LENGTH / 26;

function gates(): Gate[] {
  const arch = LAYOUT_BY_ID.get('trialarch')!;
  let start = 0, bd = Infinity;
  ROAD.forEach((s, i) => { const d = Math.hypot(s.x - arch.x, s.z - arch.z); if (d < bd) { bd = d; start = i; } });
  const out: Gate[] = [];
  const n = 7;
  for (let k = 0; k <= n; k++) {
    const s = ROAD[(start + Math.round((k / n) * ROAD.length)) % ROAD.length];
    out.push({ pos: new THREE.Vector3(s.x, s.y + 2.5, s.z), radius: 5.5 });
  }
  return out;
}

export class TimeTrial implements Activity {
  private course: Course;
  private built = false;
  private cooldown = 0;
  best: number | null = null;

  constructor(scene: THREE.Scene) {
    this.course = new Course(scene, 1);
  }

  update(ctx: ActivityCtx) {
    const enabled = ctx.tycoon.hasEffect('timeTrial');
    if (enabled && !this.built) { this.course.setGates(gates()); this.built = true; }
    const v = ctx.vehicle;
    const driving = !!v && v.kind === 'car';
    this.course.refresh(ctx.time, enabled && this.course.running);
    if (!enabled) return;
    this.cooldown -= ctx.dt;
    const c = this.course;
    if (!c.running) {
      if (driving && this.cooldown <= 0 && c.hit(0, v!.position)) {
        c.index = 1;
        c.elapsed = 0;
        bus.emit('activity', { kind: 'trial', state: 'started', text: `Time trial! Beat ${TARGET.toFixed(0)}s for a bonus` });
      }
      return;
    }
    c.elapsed += ctx.dt;
    if (!driving || c.elapsed > TARGET * 3) {
      bus.emit('activity', { kind: 'trial', state: 'failed', text: 'Time trial abandoned' });
      c.reset();
      this.cooldown = 3;
      return;
    }
    if (c.hit(c.index, v!.position)) {
      c.index++;
      if (c.index >= c.gates.length) {
        const t = c.elapsed;
        const factor = Math.max(0.4, Math.min(2.5, TARGET / t));
        const amt = ctx.money.earn(reward(ctx.money, 1500, 40, factor * (1 + v!.tier * 0.3)));
        const isBest = this.best === null || t < this.best;
        if (isBest) this.best = t;
        ctx.particles.confetti(v!.position.clone().setY(v!.position.y + 2), 120);
        bus.emit('cashCollected', { amount: amt, x: v!.position.x, y: v!.position.y + 2, z: v!.position.z, source: 'trial' });
        bus.emit('activity', { kind: 'trial', state: 'done', text: `Lap ${t.toFixed(2)}s${isBest ? ' — NEW BEST!' : ''}` });
        c.reset();
        this.cooldown = 5;
      }
    }
  }

  get status(): string | null {
    const c = this.course;
    return c.running ? `TIME TRIAL  ${c.elapsed.toFixed(1)}s  ·  CP ${c.index}/${c.gates.length - 1}` : null;
  }

  markers(): Marker[] {
    if (!this.built || !this.course.running) return [];
    const g = this.course.gates[this.course.index];
    return g ? [{ x: g.pos.x, z: g.pos.z, color: '#ff5d73', kind: 'checkpoint' }] : [];
  }
}
