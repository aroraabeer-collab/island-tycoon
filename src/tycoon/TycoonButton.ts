// A glowing purchase pad with a floating price label. Step on it to buy.
import * as THREE from 'three';
import gsap from 'gsap';
import type { ButtonDef } from './progression';
import { formatMoney } from '../economy/MoneyManager';
import { terrainHeight } from '../world/heights';
import { padGeometry } from '../world/models/props';

const PAD_GEO = padGeometry();
const RING_GEO = new THREE.TorusGeometry(1.55, 0.09, 6, 32).rotateX(Math.PI / 2);
const ARROW_GEO = new THREE.ConeGeometry(0.45, 0.8, 4).rotateX(Math.PI);

function labelTexture(title: string, price: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(10, 30, 45, 0.78)';
  g.beginPath();
  g.roundRect(8, 8, 496, 176, 36);
  g.fill();
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';
  g.font = '600 50px system-ui, -apple-system, Segoe UI, sans-serif';
  g.fillText(title.length > 22 ? title.slice(0, 21) + '…' : title, 256, 82, 470);
  g.fillStyle = '#7dffa0';
  g.font = '800 58px system-ui, -apple-system, Segoe UI, sans-serif';
  g.fillText(price, 256, 154);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class TycoonButton {
  readonly group = new THREE.Group();
  readonly position: THREE.Vector3;
  private padMat: THREE.MeshStandardMaterial;
  private ringMat: THREE.MeshBasicMaterial;
  private arrow: THREE.Mesh;
  private label: THREE.Sprite;
  private affordable: boolean | null = null;
  /** Player is currently standing on this pad. */
  occupied = false;
  dwell = 0;

  constructor(readonly def: ButtonDef, scene: THREE.Scene) {
    const [x, z] = def.pad;
    this.position = new THREE.Vector3(x, terrainHeight(x, z), z);
    this.group.position.copy(this.position);

    this.padMat = new THREE.MeshStandardMaterial({ color: 0x1f2d3a, emissive: 0x24ff7a, emissiveIntensity: 1.2, roughness: 0.4 });
    const pad = new THREE.Mesh(PAD_GEO, this.padMat);
    pad.receiveShadow = true;
    this.ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5dff9a).multiplyScalar(12) });
    const ring = new THREE.Mesh(RING_GEO, this.ringMat);
    ring.position.y = 0.28;
    this.arrow = new THREE.Mesh(ARROW_GEO, this.ringMat);
    this.arrow.position.y = 2.2;

    const mat = new THREE.SpriteMaterial({ map: labelTexture(def.label, def.cost === 0 ? 'FREE' : formatMoney(def.cost)), depthWrite: false });
    this.label = new THREE.Sprite(mat);
    this.label.scale.set(5.6, 2.1, 1);
    this.label.position.y = 4.4;
    this.group.add(pad, ring, this.arrow, this.label);
    scene.add(this.group);

    this.group.scale.setScalar(0.001);
    gsap.to(this.group.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(2.2)', delay: 0.15 });
  }

  setAffordable(ok: boolean) {
    if (ok === this.affordable) return;
    this.affordable = ok;
    const c = ok ? 0x5dff9a : 0xff6b6b;
    this.ringMat.color.set(c).multiplyScalar(ok ? 12 : 5);
    this.padMat.emissive.set(ok ? 0x24ff7a : 0x802020);
    this.padMat.emissiveIntensity = ok ? 1.2 : 0.5;
  }

  update(time: number) {
    this.arrow.position.y = 2.3 + Math.sin(time * 3 + this.position.x) * 0.25;
    this.arrow.rotation.y = time * 1.5;
  }

  /** Is a point standing on this pad? */
  contains(p: THREE.Vector3) {
    return Math.hypot(p.x - this.position.x, p.z - this.position.z) < 1.7 && Math.abs(p.y - this.position.y) < 2.5;
  }

  dispose(scene: THREE.Scene) {
    gsap.to(this.group.scale, {
      x: 0.001, y: 0.001, z: 0.001, duration: 0.3, ease: 'back.in(2)',
      onComplete: () => {
        scene.remove(this.group);
        this.padMat.dispose();
        this.ringMat.dispose();
        (this.label.material as THREE.SpriteMaterial).map?.dispose();
        this.label.material.dispose();
      },
    });
  }
}
