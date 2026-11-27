// Thin wrapper around Rapier: init, static colliders, fixed-step stepping.
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export type { RAPIER };

export class Physics {
  static R: typeof RAPIER;
  world!: RAPIER.World;
  readonly step = 1 / 60;
  private acc = 0;

  static async create(): Promise<Physics> {
    await RAPIER.init();
    Physics.R = RAPIER;
    const p = new Physics();
    p.world = new RAPIER.World({ x: 0, y: -20, z: 0 });
    p.world.timestep = p.step;
    return p;
  }

  addTrimesh(vertices: Float32Array, indices: Uint32Array) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(0.9), body);
  }

  /** Static oriented box: center + half extents + yaw. */
  addBox(center: THREE.Vector3, half: THREE.Vector3, yaw = 0): RAPIER.Collider {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(center.x, center.y, center.z).setRotation(q),
    );
    return this.world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z), body);
  }

  addCylinder(x: number, y: number, z: number, halfH: number, r: number) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y + halfH, z));
    this.world.createCollider(RAPIER.ColliderDesc.cylinder(halfH, r), body);
  }

  /** Run as many fixed steps as needed; `before` runs before each step (controllers apply forces). */
  update(dt: number, before: (h: number) => void) {
    this.acc += Math.min(dt, 0.1);
    let n = 0;
    while (this.acc >= this.step && n < 5) {
      before(this.step);
      this.world.step();
      this.acc -= this.step;
      n++;
    }
  }
}
