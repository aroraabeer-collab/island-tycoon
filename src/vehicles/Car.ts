// Ground vehicle on Rapier's raycast vehicle controller. Tiers: golf cart -> buggy -> supercar.
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { Physics } from '../core/Physics';
import type { Input } from '../core/Input';
import { Vehicle } from './Vehicle';
import { WHEEL_POS } from '../world/models/vehicles';

export const CAR_STATS = [
  { maxSpeed: 15, accel: 9, steer: 0.55, grip: 3.0, radius: 0.36 },
  { maxSpeed: 24, accel: 13, steer: 0.5, grip: 3.6, radius: 0.5 },
  { maxSpeed: 40, accel: 19, steer: 0.42, grip: 4.2, radius: 0.4 },
];

const MASS = 200;
const REST = 0.35;

export class Car extends Vehicle {
  private ctrl: RAPIER.DynamicRayCastVehicleController | null = null;
  private steer = 0;

  protected createBody(tier: number) {
    const R = Physics.R;
    const st = CAR_STATS[tier];
    const body = this.physics.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setLinearDamping(0.15).setAngularDamping(1.2).setCanSleep(false),
    );
    this.physics.world.createCollider(
      R.ColliderDesc.cuboid(0.85, 0.3, 1.8).setMass(MASS).setTranslation(0, 0.15, 0).setFriction(0.3),
      body,
    );
    const ctrl = this.physics.world.createVehicleController(body);
    ctrl.indexUpAxis = 1;
    ctrl.setIndexForwardAxis = 2; // our models face +Z (Rapier's setter is oddly named)
    WHEEL_POS.forEach(([x, , z]) => {
      ctrl.addWheel({ x, y: 0, z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, REST, st.radius);
    });
    for (let i = 0; i < 4; i++) {
      ctrl.setWheelSuspensionStiffness(i, 32);
      ctrl.setWheelSuspensionCompression(i, 2.6);
      ctrl.setWheelSuspensionRelaxation(i, 3.2);
      ctrl.setWheelMaxSuspensionTravel(i, 0.4);
      ctrl.setWheelMaxSuspensionForce(i, 1e5);
      ctrl.setWheelFrictionSlip(i, st.grip);
      ctrl.setWheelSideFrictionStiffness(i, 1);
    }
    this.body = body;
    this.ctrl = ctrl;
  }

  protected destroyBody() {
    if (this.ctrl) this.physics.world.removeVehicleController(this.ctrl);
    this.ctrl = null;
    super.destroyBody();
  }

  /** Signed forward speed (m/s). */
  get forwardSpeed() { return this.ctrl?.currentVehicleSpeed() ?? 0; }

  step(h: number, input: Input | null) {
    if (!this.ctrl || !this.body) return;
    const st = CAR_STATS[this.tier];
    const a = input ? input.axes() : { x: 0, y: 0 };
    const v = this.forwardSpeed;
    let engine = 0, brake = 0;
    if (a.y > 0) {
      if (v < -0.5) brake = 12; else if (v < st.maxSpeed) engine = a.y;
    } else if (a.y < 0) {
      if (v > 0.5) brake = 12; else if (v > -8) engine = a.y * 0.6;
    } else brake = input ? 2.5 : 8;
    if (input?.jump) brake = 20;
    const force = (engine * MASS * st.accel) / 4;
    const steerLimit = st.steer * (1 - Math.min(Math.abs(v) / (st.maxSpeed * 1.6), 0.6));
    this.steer += (-a.x * steerLimit - this.steer) * Math.min(1, h * 8);
    for (let i = 0; i < 4; i++) {
      this.ctrl.setWheelEngineForce(i, force);
      this.ctrl.setWheelBrake(i, brake);
    }
    this.ctrl.setWheelSteering(0, this.steer);
    this.ctrl.setWheelSteering(1, this.steer);
    this.ctrl.updateVehicle(h);
    this.throttle = Math.abs(engine);

    // Auto-right if flipped for a while, and keep out of the sea.
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
    if (up.y < 0.2 && this.speed < 1) this.flipTimer += h; else this.flipTimer = 0;
    if (this.flipTimer > 1.5 || this.position.y < -1.5) {
      const t = this.body.translation();
      if (this.position.y < -1.5) this.respawn();
      else {
        this.body.setTranslation({ x: t.x, y: t.y + 1.5, z: t.z }, true);
        this.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.heading), true);
        this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
      this.flipTimer = 0;
    }
  }

  private flipTimer = 0;

  animate() {
    if (!this.ctrl || !this.model) return;
    this.model.wheels.forEach((w, i) => {
      const susp = this.ctrl!.wheelSuspensionLength(i) ?? REST;
      const p = WHEEL_POS[i];
      w.position.set(p[0], -susp, p[2]);
      w.rotation.set(this.ctrl!.wheelRotation(i) ?? 0, i < 2 ? this.steer : 0, 0, 'YXZ');
    });
  }
}
