// Arcade flight shared by all air tiers: W/S thrust, A/D yaw, Space climb, Shift descend.
import * as THREE from 'three';
import { Physics } from '../core/Physics';
import type { Input } from '../core/Input';
import { Vehicle } from './Vehicle';
import { terrainHeight } from '../world/heights';

export const AIR_STATS = [
  { half: [1.2, 0.6, 1.6], speed: 20, climb: 5, turn: 1.0, sink: 1.6, mass: 120 },
  { half: [1.6, 0.9, 2.4], speed: 34, climb: 8, turn: 1.1, sink: 0, mass: 400 },
  { half: [1.4, 1.2, 2.4], speed: 46, climb: 13, turn: 1.6, sink: 0, mass: 600 },
] as const;

const fwd = new THREE.Vector3();

export class Aircraft extends Vehicle {
  private tiltX = 0;
  private tiltZ = 0;
  private spin = 0;
  airborne = false;

  protected createBody(tier: number) {
    const R = Physics.R;
    const st = AIR_STATS[tier];
    const body = this.physics.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setLinearDamping(0.6).setCanSleep(false).enabledRotations(false, true, false),
    );
    this.physics.world.createCollider(
      R.ColliderDesc.cuboid(st.half[0], st.half[1], st.half[2]).setMass(st.mass).setFriction(0.6).setTranslation(0, -0.2, 0),
      body,
    );
    this.body = body;
  }

  protected exitScale() { return 1.4; }

  step(h: number, input: Input | null) {
    const body = this.body;
    if (!body) return;
    const st = AIR_STATS[this.tier];
    const a = input ? input.axes() : { x: 0, y: 0 };
    const climb = input ? (input.jump ? 1 : 0) - (input.descend ? 1 : 0) : 0;
    const ground = Math.max(terrainHeight(this.position.x, this.position.z), 0);
    const alt = this.position.y - ground - st.half[1];
    this.airborne = alt > 0.6;
    const powered = !!input;

    fwd.set(0, 0, 1).applyQuaternion(this.quaternion).setY(0).normalize();
    const lin = body.linvel();
    if (powered) {
      body.setGravityScale(0, true);
      const vf = a.y * st.speed;
      let vy = climb * st.climb;
      if (climb === 0 && this.airborne) vy = -st.sink;
      if (alt < 0.4 && climb <= 0 && this.position.y < 0.6) vy = Math.max(vy, 0.5); // skim water
      const k = Math.min(1, h * 1.6);
      body.setLinvel({
        x: lin.x + (fwd.x * vf - lin.x) * k,
        y: lin.y + (vy - lin.y) * Math.min(1, h * 3),
        z: lin.z + (fwd.z * vf - lin.z) * k,
      }, true);
      const yawRate = this.airborne || Math.abs(a.y) > 0 ? -a.x * st.turn : 0;
      body.setAngvel({ x: 0, y: yawRate, z: 0 }, true);
    } else {
      body.setGravityScale(1, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      // Unattended aircraft settle on water instead of sinking.
      if (this.position.y < 0.6 && ground <= 0.01) body.setLinvel({ x: lin.x * 0.95, y: Math.max(lin.y, 1), z: lin.z * 0.95 }, true);
    }
    this.throttle = powered ? Math.max(0.35, Math.abs(a.y), Math.abs(climb)) : 0;
    this.tiltX += ((powered ? a.y * 0.18 : 0) - this.tiltX) * Math.min(1, h * 3);
    this.tiltZ += ((powered && this.airborne ? -a.x * 0.35 : 0) - this.tiltZ) * Math.min(1, h * 3);
    if (this.position.y < -3) this.respawn();
  }

  animate(dt: number) {
    if (!this.model) return;
    this.model.root.rotation.set(this.tiltX, 0, this.tiltZ);
    this.spin += dt * (4 + this.throttle * 40);
    this.model.spinners.forEach((s, i) => {
      if (this.tier === 2) s.rotation.y = this.spin * (i === 0 ? 1 : 3);
      else s.rotation.z = this.spin * 1.5;
    });
  }
}
