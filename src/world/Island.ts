// Spawns every layout object hidden (scale 0) and reveals them with a bouncy scale-in.
import * as THREE from 'three';
import gsap from 'gsap';
import { LAYOUT, LAYOUT_BY_ID, COLLIDER_DEFAULTS, type LayoutItem, type ModelKey } from './layout';
import { terrainHeight } from './heights';
import { waveHeight } from '../render/waves';
import { Physics } from '../core/Physics';
import * as B from './models/buildings';

const FACTORY: Record<ModelKey, () => THREE.Object3D> = {
  collector: B.collector, cashDropper: B.cashDropper, solarPanel: B.solarPanel, bambooShack: B.bambooShack,
  beachHut: B.beachHut, palmPath: B.palmPath, carport: B.carport, bank: B.bank, pier: () => B.pier(24),
  tikiBar: B.tikiBar, dock: B.dock, boathouse: B.boathouse, lighthouse: B.lighthouse, seafoodShack: B.seafoodShack,
  buoy: () => B.buoy(), cliffGate: B.cliffGate, villa0: () => B.villa(0), villa1: () => B.villa(1),
  mansion: B.mansion, garden: B.garden, infinityPool: B.infinityPool, concierge: B.concierge, raceArch: B.raceArch,
  runway: B.runway, hangar: B.hangar, helipad: B.helipad, controlTower: B.controlTower, beachClub: B.beachClub,
  skyResort: B.skyResort, goldenStatue: B.goldenStatue,
};

interface Placed { item: LayoutItem; obj: THREE.Object3D; baseY: number; revealed: boolean }

export class Island {
  private placed = new Map<string, Placed>();
  private floaters: Placed[] = [];

  constructor(scene: THREE.Scene, private physics: Physics) {
    for (const item of LAYOUT) {
      const obj = FACTORY[item.model]();
      const baseY = item.y ?? terrainHeight(item.x, item.z);
      obj.position.set(item.x, baseY, item.z);
      obj.rotation.y = item.rot ?? 0;
      obj.name = item.id;
      const p: Placed = { item, obj, baseY, revealed: false };
      this.placed.set(item.id, p);
      if (item.float) this.floaters.push(p);
      if (item.alwaysVisible) this.reveal(item.id, false);
      else { obj.scale.setScalar(0.0001); obj.visible = false; }
      scene.add(obj);
    }
  }

  get(id: string) { return this.placed.get(id)?.obj; }
  isRevealed(id: string) { return !!this.placed.get(id)?.revealed; }

  /** World position at the top-center of an object (for particles / labels). */
  topOf(id: string): THREE.Vector3 {
    const p = this.placed.get(id);
    if (!p) return new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(p.obj);
    return new THREE.Vector3(p.item.x, Number.isFinite(box.max.y) ? box.max.y : p.baseY + 3, p.item.z);
  }

  reveal(id: string, animate: boolean) {
    const p = this.placed.get(id);
    if (!p || p.revealed) return;
    p.revealed = true;
    p.obj.visible = true;
    if (animate) {
      p.obj.scale.setScalar(0.0001);
      gsap.to(p.obj.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: 'elastic.out(1, 0.45)' });
    } else {
      p.obj.scale.setScalar(1);
    }
    this.addCollider(p);
  }

  private addCollider(p: Placed) {
    const mode = p.item.collider ?? COLLIDER_DEFAULTS[p.item.model] ?? 'box';
    if (mode === 'none') return;
    // Compute local-space bounds (unrotated, unscaled).
    const saved = { s: p.obj.scale.clone(), r: p.obj.rotation.y, pos: p.obj.position.clone() };
    p.obj.scale.setScalar(1);
    p.obj.rotation.y = 0;
    p.obj.position.set(0, 0, 0);
    p.obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(p.obj);
    p.obj.scale.copy(saved.s);
    p.obj.rotation.y = saved.r;
    p.obj.position.copy(saved.pos);
    p.obj.updateMatrixWorld(true);
    if (mode === 'deck') box.min.y = box.max.y - 0.4;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    center.applyAxisAngle(new THREE.Vector3(0, 1, 0), saved.r).add(saved.pos);
    this.physics.addBox(center, size.multiplyScalar(0.5), saved.r);
  }

  /** Item ids considered "income buildings" that are currently visible. */
  incomeSources(): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    for (const p of this.placed.values()) if (p.revealed && p.item.income) out.push(p.obj.position);
    return out;
  }

  update(time: number) {
    for (const f of this.floaters) {
      if (!f.revealed) continue;
      f.obj.position.y = f.baseY + waveHeight(f.item.x, f.item.z, time) * 0.8;
      f.obj.rotation.z = Math.sin(time * 1.3 + f.item.x) * 0.08;
    }
  }

  static exclusions() {
    return LAYOUT.map((l) => ({ x: l.x, z: l.z, r: l.model === 'runway' ? 60 : l.model === 'mansion' ? 14 : 9 }));
  }

  static item(id: string) { return LAYOUT_BY_ID.get(id); }
}
