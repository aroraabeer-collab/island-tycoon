// Base vehicle: tiered model swap, dynamic body lifecycle, enter/exit, respawn.
import * as THREE from 'three';
import gsap from 'gsap';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Physics } from '../core/Physics';
import type { Input } from '../core/Input';
import type { VehicleKind } from '../core/EventBus';
import { VEHICLE_MODELS, type VehicleModel } from '../world/models/vehicles';

export interface Spawn { x: number; y: number; z: number; rot: number }

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

export abstract class Vehicle {
  tier = -1;
  occupied = false;
  body: RAPIER.RigidBody | null = null;
  model: VehicleModel | null = null;
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3();
  readonly quaternion = new THREE.Quaternion();
  /** Throttle 0..1 for engine sound. */
  throttle = 0;

  constructor(readonly kind: VehicleKind, protected scene: THREE.Scene, protected physics: Physics, readonly spawn: Spawn) {
    this.group.visible = false;
    scene.add(this.group);
  }

  get unlocked() { return this.tier >= 0; }

  /** Forward yaw (radians, 0 = +Z). */
  get heading() {
    _v.set(0, 0, 1).applyQuaternion(this.quaternion);
    return Math.atan2(_v.x, _v.z);
  }

  get speed() {
    const v = this.body?.linvel();
    return v ? Math.hypot(v.x, v.y, v.z) : 0;
  }

  setTier(tier: number, animate: boolean) {
    if (tier <= this.tier) return;
    this.tier = tier;
    if (this.model) this.group.remove(this.model.root);
    this.model = VEHICLE_MODELS[this.kind][tier]();
    this.model.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    this.group.add(this.model.root);
    this.group.visible = true;
    const pose = this.body ? { p: this.body.translation(), r: this.body.rotation() } : null;
    if (this.body) { this.destroyBody(); }
    this.createBody(tier);
    if (pose && this.occupied) {
      this.body!.setTranslation({ x: pose.p.x, y: pose.p.y + 0.5, z: pose.p.z }, true);
      this.body!.setRotation(pose.r, true);
    } else this.respawn();
    if (animate) {
      this.model.root.scale.setScalar(0.001);
      gsap.to(this.model.root.scale, { x: 1, y: 1, z: 1, duration: 1.0, ease: 'elastic.out(1, 0.5)' });
    }
  }

  respawn() {
    if (!this.body) return;
    _q.setFromEuler(_e.set(0, this.spawn.rot, 0));
    this.body.setTranslation({ x: this.spawn.x, y: this.spawn.y, z: this.spawn.z }, true);
    this.body.setRotation(_q, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.sync(0);
  }

  /** Where the player pops out when exiting. */
  exitPoint(): THREE.Vector3 {
    return _v.set(-2.6 * this.exitScale(), 0.5, 0).applyQuaternion(this.quaternion).add(this.position).clone();
  }

  protected exitScale() { return 1; }

  protected abstract createBody(tier: number): void;
  protected destroyBody() {
    if (this.body) this.physics.world.removeRigidBody(this.body);
    this.body = null;
  }

  /** Fixed-step control. `input` is null when nobody is driving. */
  abstract step(h: number, input: Input | null, time: number): void;

  sync(_dt: number) {
    if (!this.body) return;
    const t = this.body.translation();
    const r = this.body.rotation();
    this.position.set(t.x, t.y, t.z);
    this.quaternion.set(r.x, r.y, r.z, r.w);
    this.group.position.copy(this.position);
    this.group.quaternion.copy(this.quaternion);
  }

  /** Visual extras (wheels/rotors). */
  animate(_dt: number) {}
}
