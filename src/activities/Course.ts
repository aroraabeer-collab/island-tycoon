// Generic gate course (used by aerial rings and the road time trial).
import * as THREE from 'three';
import { ringGate } from '../world/models/props';

export interface Gate { pos: THREE.Vector3; radius: number }

export class Course {
  readonly gates: Gate[] = [];
  private meshes: THREE.Group[] = [];
  index = -1; // -1 = idle (waiting at gate 0)
  elapsed = 0;

  constructor(private scene: THREE.Scene, private scale = 1) {}

  setGates(gates: Gate[]) {
    this.meshes.forEach((m) => this.scene.remove(m));
    this.meshes = [];
    this.gates.length = 0;
    this.gates.push(...gates);
    gates.forEach((g, i) => {
      const m = ringGate();
      m.scale.setScalar((g.radius / 5) * this.scale);
      m.position.copy(g.pos);
      const next = gates[(i + 1) % gates.length].pos;
      const prev = gates[(i - 1 + gates.length) % gates.length].pos;
      // Torus normal is +Z; face along the course direction (prev -> next).
      m.lookAt(g.pos.clone().add(next).sub(prev));
      m.visible = false;
      this.scene.add(m);
      this.meshes.push(m);
    });
  }

  get running() { return this.index >= 0; }

  /** Show the gate the player should fly/drive through next, plus a preview of the one after. */
  refresh(time: number, enabled: boolean) {
    const cur = this.running ? this.index : 0;
    this.meshes.forEach((m, i) => {
      const show = enabled && (i === cur || (this.running && i === cur + 1));
      m.visible = show;
      if (show) {
        const base = (this.gates[i].radius / 5) * this.scale;
        m.scale.setScalar(i === cur ? base * (1 + Math.sin(time * 5) * 0.05) : base * 0.6);
      }
    });
  }

  /** Returns true if `p` passed through the gate at `i`. */
  hit(i: number, p: THREE.Vector3): boolean {
    const g = this.gates[i];
    return !!g && g.pos.distanceTo(p) < g.radius * 1.15;
  }

  reset() { this.index = -1; this.elapsed = 0; }
}
