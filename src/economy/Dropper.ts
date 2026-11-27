// Visual cash flow: bricks ride the dropper conveyor and bills arc from income buildings to the collector.
import * as THREE from 'three';
import { cashBrick, cashBill } from '../world/models/props';
import { materials } from '../world/models/kit';
import type { Island } from '../world/Island';

interface Flyer { active: boolean; t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; spin: number }

export class Dropper {
  private bricks: THREE.InstancedMesh;
  private bills: THREE.InstancedMesh;
  private brickT: number[] = [];
  private flyers: Flyer[] = [];
  private spawnBrick = 0;
  private spawnBill = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3(1, 1, 1);
  private collectorTop: THREE.Vector3;

  constructor(scene: THREE.Scene, private island: Island) {
    const mats = materials();
    this.bricks = new THREE.InstancedMesh(cashBrick(), mats.std, 16);
    this.bills = new THREE.InstancedMesh(cashBill(), mats.glow, 32);
    for (const im of [this.bricks, this.bills]) {
      im.frustumCulled = false;
      im.castShadow = true;
      for (let i = 0; i < im.count; i++) im.setMatrixAt(i, this.m.makeScale(0, 0, 0));
      scene.add(im);
    }
    for (let i = 0; i < 32; i++) this.flyers.push({ active: false, t: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), spin: 0 });
    this.collectorTop = island.topOf('collector');
  }

  update(dt: number, incomeRate: number) {
    // --- conveyor bricks
    const dropper = this.island.get('dropper');
    if (dropper && this.island.isRevealed('dropper')) {
      this.spawnBrick -= dt;
      if (this.spawnBrick <= 0 && this.brickT.length < 16) { this.brickT.push(0); this.spawnBrick = 1.1; }
      const base = dropper.position;
      for (let i = this.brickT.length - 1; i >= 0; i--) {
        this.brickT[i] += dt * 0.55;
        if (this.brickT[i] >= 1) this.brickT.splice(i, 1);
      }
      for (let i = 0; i < 16; i++) {
        const t = this.brickT[i];
        if (t === undefined) { this.bricks.setMatrixAt(i, this.m.makeScale(0, 0, 0)); continue; }
        const x = base.x + 1.2 + t * 6.2;
        const fall = Math.max(0, t - 0.9) * 10;
        this.v.set(x, base.y + 0.95 - fall * fall * 0.5, base.z);
        this.m.compose(this.v, this.q.identity(), this.s.setScalar(t > 0.9 ? 1 - (t - 0.9) * 8 : Math.min(1, t * 8)));
        this.bricks.setMatrixAt(i, this.m);
      }
      this.bricks.instanceMatrix.needsUpdate = true;
    }

    // --- bills flying from income buildings
    const sources = this.island.incomeSources();
    this.spawnBill -= dt;
    if (sources.length > 1 && incomeRate > 0 && this.spawnBill <= 0) {
      this.spawnBill = Math.max(0.25, 2.2 - sources.length * 0.08);
      const f = this.flyers.find((x) => !x.active);
      const src = sources[(Math.random() * sources.length) | 0];
      if (f && src.distanceTo(this.collectorTop) < 140) {
        f.active = true; f.t = 0;
        f.from.set(src.x, src.y + 3, src.z);
        f.to.copy(this.collectorTop);
        f.dur = 1.2 + f.from.distanceTo(f.to) / 40;
        f.spin = Math.random() * 6;
      }
    }
    this.flyers.forEach((f, i) => {
      if (!f.active) { this.bills.setMatrixAt(i, this.m.makeScale(0, 0, 0)); return; }
      f.t += dt / f.dur;
      if (f.t >= 1) { f.active = false; return; }
      this.v.lerpVectors(f.from, f.to, f.t);
      this.v.y += Math.sin(f.t * Math.PI) * (6 + f.from.distanceTo(f.to) * 0.15);
      this.q.setFromEuler(this.e.set(f.t * 9 + f.spin, f.t * 6, 0));
      this.m.compose(this.v, this.q, this.s.setScalar(1.6));
      this.bills.setMatrixAt(i, this.m);
    });
    this.bills.instanceMatrix.needsUpdate = true;
  }
}
