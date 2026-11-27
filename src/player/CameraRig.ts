// Third-person orbit camera: mouse look, zoom, auto-align behind vehicles, terrain collision.
import * as THREE from 'three';
import type { Input } from '../core/Input';
import { terrainHeight } from '../world/heights';

export interface CamPreset { distance: number; height: number; lookHeight: number }

export const PRESETS: Record<string, CamPreset> = {
  foot: { distance: 8, height: 2.5, lookHeight: 1.6 },
  car: { distance: 10, height: 3.2, lookHeight: 1.2 },
  boat: { distance: 13, height: 4, lookHeight: 1.5 },
  yacht: { distance: 22, height: 7, lookHeight: 3 },
  air: { distance: 16, height: 4, lookHeight: 1 },
};

export class CameraRig {
  yaw = 0;
  pitch = 0.25;
  /** From settings. */
  sensitivity = 1;
  invertY = false;
  private zoom = 1;
  private preset: CamPreset = PRESETS.foot;
  private dist = PRESETS.foot.distance;
  private idle = 0;
  private target = new THREE.Vector3();
  private look = new THREE.Vector3();

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  setPreset(name: keyof typeof PRESETS) { this.preset = PRESETS[name]; }

  snap(target: THREE.Vector3, heading?: number) {
    this.target.copy(target);
    if (heading !== undefined) this.yaw = heading + Math.PI;
  }

  /** `heading` = vehicle forward yaw, used to drift behind when the mouse is idle. */
  update(dt: number, input: Input, focus: THREE.Vector3, heading?: number, speed = 0) {
    const sens = 0.0025 * this.sensitivity;
    if (input.mouseDX || input.mouseDY) this.idle = 0; else this.idle += dt;
    this.yaw -= input.mouseDX * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch + input.mouseDY * sens * (this.invertY ? -1 : 1), -0.35, 1.25);
    if (input.wheel) this.zoom = THREE.MathUtils.clamp(this.zoom + input.wheel * 0.12, 0.5, 2.2);

    if (heading !== undefined && this.idle > 1.2 && speed > 2) {
      const want = heading + Math.PI;
      let d = want - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 2.5);
    }

    this.target.lerp(focus, 1 - Math.exp(-dt * 14));
    const wantDist = this.preset.distance * this.zoom * (1 + Math.min(speed, 60) * 0.004);
    this.dist += (wantDist - this.dist) * Math.min(1, dt * 4);
    this.look.copy(this.target).y += this.preset.lookHeight;

    const cp = Math.cos(this.pitch);
    const pos = this.camera.position;
    pos.set(
      this.look.x + Math.sin(this.yaw) * cp * this.dist,
      this.look.y + Math.sin(this.pitch) * this.dist + this.preset.height * 0.3,
      this.look.z + Math.cos(this.yaw) * cp * this.dist,
    );
    const ground = Math.max(terrainHeight(pos.x, pos.z), 0) + 0.8;
    if (pos.y < ground) pos.y = ground;
    this.camera.lookAt(this.look);
    const fov = 60 + Math.min(speed, 70) * 0.18;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 3);
      this.camera.updateProjectionMatrix();
    }
  }
}
