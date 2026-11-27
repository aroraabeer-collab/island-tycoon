// Boat with 4-point buoyancy sampled from the same Gerstner waves the shader draws.
import * as THREE from 'three';
import { Physics } from '../core/Physics';
import type { Input } from '../core/Input';
import { Vehicle } from './Vehicle';
import { waveHeight } from '../render/waves';
import { baseHeight } from '../world/heights';
import { bus } from '../core/EventBus';

export const BOAT_STATS = [
  { half: [1.2, 0.3, 1.7], mass: 160, draft: 0.22, maxSpeed: 8, accel: 4, turn: 1.1 },
  { half: [1.1, 0.4, 3.0], mass: 420, draft: 0.3, maxSpeed: 24, accel: 9, turn: 1.4 },
  { half: [2.2, 0.8, 6.5], mass: 2400, draft: 0.6, maxSpeed: 17, accel: 5, turn: 0.75 },
] as const;

const G = 20;
const v3 = new THREE.Vector3();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();

export class Boat extends Vehicle {
  private wakeTimer = 0;
  wet = false;

  protected createBody(tier: number) {
    const R = Physics.R;
    const st = BOAT_STATS[tier];
    const body = this.physics.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setLinearDamping(0.4).setAngularDamping(2.5).setCanSleep(false),
    );
    this.physics.world.createCollider(
      R.ColliderDesc.cuboid(st.half[0], st.half[1], st.half[2]).setMass(st.mass).setFriction(0.2),
      body,
    );
    this.body = body;
  }

  protected exitScale() { return BOAT_STATS[Math.max(0, this.tier)].half[0] / 1.1; }

  step(h: number, input: Input | null, time: number) {
    const body = this.body;
    if (!body) return;
    const st = BOAT_STATS[this.tier];
    const [hx, hy, hz] = st.half;
    let submergedPts = 0;
    const lin = body.linvel();
    // Buoyancy at the four bottom corners.
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      v3.set(sx * hx * 0.8, -hy, sz * hz * 0.8).applyQuaternion(this.quaternion).add(this.position);
      const depth = Math.max(0, -baseHeight(v3.x, v3.z));
      const water = waveHeight(v3.x, v3.z, time, Math.min(1, Math.max(0.15, depth / 4)));
      const sub = water - v3.y;
      if (sub <= 0) continue;
      submergedPts++;
      const k = Math.min(sub / st.draft, 3);
      const up = (st.mass * G / 4) * k - lin.y * st.mass * 0.9;
      body.applyImpulseAtPoint({ x: 0, y: up * h, z: 0 }, { x: v3.x, y: v3.y, z: v3.z }, true);
    }
    this.wet = submergedPts > 0;

    fwd.set(0, 0, 1).applyQuaternion(this.quaternion).setY(0).normalize();
    right.set(fwd.z, 0, -fwd.x);
    // Re-read: buoyancy impulses above changed the velocity and setLinvel below must keep them.
    const lin2 = body.linvel();
    lin.x = lin2.x; lin.y = lin2.y; lin.z = lin2.z;
    const vf = lin.x * fwd.x + lin.z * fwd.z;
    const vs = lin.x * right.x + lin.z * right.z;
    const a = input ? input.axes() : { x: 0, y: 0 };
    this.throttle = Math.abs(a.y);

    if (this.wet) {
      // Thrust, with soft speed cap.
      const target = a.y > 0 ? st.maxSpeed : a.y < 0 ? -st.maxSpeed * 0.35 : 0;
      const push = a.y !== 0 && Math.abs(vf) < Math.abs(target) ? Math.sign(target) * st.accel : 0;
      // Kill sideways drift (keel) and apply drag.
      const side = -vs * Math.min(1, h * 2.5);
      const drag = a.y === 0 ? -vf * Math.min(1, h * 0.6) : 0;
      body.setLinvel({
        x: lin.x + fwd.x * (push * h + drag) + right.x * side,
        y: lin.y,
        z: lin.z + fwd.z * (push * h + drag) + right.z * side,
      }, true);
      // Rudder: turning needs a little speed.
      const ang = body.angvel();
      const authority = Math.max(-1, Math.min(1, vf / 3));
      const wantYaw = -a.x * st.turn * authority;
      body.setAngvel({ x: ang.x, y: ang.y + (wantYaw - ang.y) * Math.min(1, h * 4), z: ang.z }, true);
      // Keep upright-ish: torque along cross(up, worldUp) = (-up.z, 0, up.x).
      const upv = v3.set(0, 1, 0).applyQuaternion(this.quaternion);
      const k = st.mass * 6 * h;
      body.applyTorqueImpulse({ x: -upv.z * k, y: 0, z: upv.x * k }, true);
    }

    if (this.position.y < -4 || (!this.wet && this.speed < 0.5 && baseHeight(this.position.x, this.position.z) > 0.5)) {
      this.strandTimer += h;
      if (this.strandTimer > 3) { this.respawn(); this.strandTimer = 0; }
    } else this.strandTimer = 0;

    this.wakeTimer -= h;
    if (this.wet && Math.abs(vf) > 4 && this.wakeTimer <= 0) {
      this.wakeTimer = 0.08;
      v3.copy(this.position).addScaledVector(fwd, -hz);
      bus.emit('splash', { x: v3.x, z: v3.z });
    }
  }

  private strandTimer = 0;
}
