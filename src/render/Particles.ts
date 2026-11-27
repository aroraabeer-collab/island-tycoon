// Pooled instanced particles for confetti, coin bursts and splashes.
import * as THREE from 'three';

const MAX = 900;
const PALETTE = [0xff5d73, 0xffcc3d, 0x5fd068, 0x5ec8ff, 0xb48cff, 0xff9f43].map((c) => new THREE.Color(c).multiplyScalar(2.2));

interface P { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; spin: number; size: number; drag: number; grav: number }

export class Particles {
  private mesh: THREE.InstancedMesh;
  private ps: P[] = [];
  private free: number[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BoxGeometry(0.22, 0.04, 0.14);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX; i++) {
      this.ps.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, spin: 0, size: 1, drag: 1, grav: 1 });
      this.free.push(i);
      this.mesh.setColorAt(i, PALETTE[i % PALETTE.length]);
      this.m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, this.m);
    }
    scene.add(this.mesh);
  }

  private spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, color: THREE.Color | null, size = 1, grav = 1, drag = 0.98) {
    const i = this.free.pop();
    if (i === undefined) return;
    Object.assign(this.ps[i], { x, y, z, vx, vy, vz, life, max: life, spin: Math.random() * 10, size, grav, drag });
    if (color) this.mesh.setColorAt(i, color);
    else this.mesh.setColorAt(i, PALETTE[(Math.random() * PALETTE.length) | 0]);
    this.mesh.instanceColor!.needsUpdate = true;
  }

  confetti(pos: THREE.Vector3, count = 120, power = 1) {
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2, u = Math.random();
      const sp = (4 + Math.random() * 8) * power;
      this.spawn(pos.x, pos.y, pos.z, Math.cos(a) * sp * u, 8 + Math.random() * 10 * power, Math.sin(a) * sp * u, 2 + Math.random() * 1.5, null, 1.4, 0.6, 0.96);
    }
  }

  coins(pos: THREE.Vector3, count = 30) {
    const gold = new THREE.Color(0xffd34d).multiplyScalar(3);
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(pos.x, pos.y, pos.z, Math.cos(a) * 3, 6 + Math.random() * 5, Math.sin(a) * 3, 1.2 + Math.random() * 0.5, gold, 1.8, 1.2);
    }
  }

  splash(pos: THREE.Vector3, count = 14) {
    const white = new THREE.Color(0xeafcff).multiplyScalar(1.4);
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(pos.x, pos.y, pos.z, Math.cos(a) * 2.5, 2 + Math.random() * 3, Math.sin(a) * 2.5, 0.6 + Math.random() * 0.4, white, 1.6, 1.3);
    }
  }

  update(dt: number) {
    let dirty = false;
    for (let i = 0; i < MAX; i++) {
      const p = this.ps[i];
      if (p.life <= 0) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        this.m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.m);
        this.free.push(i);
        continue;
      }
      p.vy -= 18 * p.grav * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.spin += dt * 8;
      const k = Math.min(1, p.life / (p.max * 0.3)) * p.size;
      this.q.setFromEuler(this.e.set(p.spin, p.spin * 0.7, p.spin * 1.3));
      this.m.compose(this.v.set(p.x, p.y, p.z), this.q, this.s.setScalar(k));
      this.mesh.setMatrixAt(i, this.m);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
