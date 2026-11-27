// On-foot player: Rapier kinematic character controller with a capsule, camera-relative movement.
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { Physics } from '../core/Physics';
import type { Input } from '../core/Input';
import { character } from '../world/models/props';
import { baseHeight, terrainHeight } from '../world/heights';

const HALF_H = 0.55;
const RADIUS = 0.35;
const WALK = 7;
const SPRINT = 12;
const JUMP = 9;

export class Character {
  readonly root: THREE.Group;
  private legs: THREE.Object3D[];
  private arms: THREE.Object3D[];
  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private ctrl: RAPIER.KinematicCharacterController;
  private vy = 0;
  private grounded = false;
  private walkPhase = 0;
  private heading = 0;
  private lastSafe = new THREE.Vector3();
  /** Feet position (for pads, prompts, camera). */
  readonly position = new THREE.Vector3();
  enabled = true;

  constructor(scene: THREE.Scene, physics: Physics, spawn: THREE.Vector3) {
    const R = Physics.R;
    const m = character();
    this.root = m.root;
    this.legs = m.legs;
    this.arms = m.arms;
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    scene.add(this.root);

    this.body = physics.world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + HALF_H + RADIUS + 0.2, spawn.z),
    );
    this.collider = physics.world.createCollider(R.ColliderDesc.capsule(HALF_H, RADIUS), this.body);
    this.ctrl = physics.world.createCharacterController(0.05);
    this.ctrl.enableAutostep(0.7, 0.25, false);
    this.ctrl.enableSnapToGround(0.5);
    this.ctrl.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(50));
    this.ctrl.setSlideEnabled(true);
    this.syncVisual(0);
    this.lastSafe.copy(spawn);
  }

  teleport(p: THREE.Vector3) {
    this.body.setNextKinematicTranslation({ x: p.x, y: p.y + HALF_H + RADIUS + 0.3, z: p.z });
    this.body.setTranslation({ x: p.x, y: p.y + HALF_H + RADIUS + 0.3, z: p.z }, true);
    this.vy = 0;
    this.syncVisual(0);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.root.visible = on;
    this.collider.setEnabled(on);
  }

  /** Fixed-step movement. */
  step(h: number, input: Input, camYaw: number) {
    if (!this.enabled) return;
    const a = input.axes();
    const speed = input.sprint ? SPRINT : WALK;
    // Camera-relative direction: forward is where the camera looks.
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    const rx = -fz, rz = fx;
    let mx = (fx * a.y + rx * a.x) * speed;
    let mz = (fz * a.y + rz * a.x) * speed;
    if (Math.hypot(a.x, a.y) > 0.1) this.heading = Math.atan2(mx, mz);

    const t = this.body.translation();
    // Don't wade into deep water.
    if (baseHeight(t.x + mx * h * 6, t.z + mz * h * 6) < -1.2 && t.y < 3) { mx = 0; mz = 0; }

    if (this.grounded) {
      this.vy = Math.max(this.vy, -2);
      if (input.jump) this.vy = JUMP;
    }
    this.vy -= 26 * h;
    this.ctrl.computeColliderMovement(this.collider, { x: mx * h, y: this.vy * h, z: mz * h });
    const mv = this.ctrl.computedMovement();
    this.grounded = this.ctrl.computedGrounded();
    if (this.grounded && this.vy < 0) this.vy = 0;
    this.body.setNextKinematicTranslation({ x: t.x + mv.x, y: t.y + mv.y, z: t.z + mv.z });

    const speedNow = Math.hypot(mv.x, mv.z) / h;
    this.walkPhase += speedNow * h * 1.6;

    // Fell off the world or into the sea: return to the last safe ground.
    if (t.y < -3) this.teleport(this.lastSafe);
    else if (this.grounded && terrainHeight(t.x, t.z) > 0.5) this.lastSafe.set(t.x, t.y - HALF_H - RADIUS, t.z);
    this.speed = speedNow;
  }

  private speed = 0;

  syncVisual(dt: number) {
    const t = this.body.translation();
    this.position.set(t.x, t.y - HALF_H - RADIUS, t.z);
    this.root.position.copy(this.position);
    let d = this.heading - this.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.root.rotation.y += d * Math.min(1, dt * 12);
    const swing = Math.sin(this.walkPhase) * Math.min(1, this.speed / WALK) * 0.8;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.8;
    this.arms[1].rotation.x = swing * 0.8;
    if (!this.grounded) { this.legs[0].rotation.x = 0.5; this.legs[1].rotation.x = -0.3; }
  }
}
