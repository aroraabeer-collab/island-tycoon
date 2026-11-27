// The claim pad in front of the main collector. Step on it to bank pending cash.
import * as THREE from 'three';
import { SPOTS } from '../world/layout';
import { terrainHeight } from '../world/heights';
import { formatMoney, type MoneyManager } from './MoneyManager';
import type { Particles } from '../render/Particles';
import { bus } from '../core/EventBus';

export class Collector {
  private label: THREE.Sprite;
  private canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private ring: THREE.Mesh;
  private pos: THREE.Vector3;
  private wasOn = false;
  private lastText = '';
  private refresh = 0;

  constructor(scene: THREE.Scene, private money: MoneyManager, private particles: Particles) {
    const { x, z } = SPOTS.collectorPad;
    this.pos = new THREE.Vector3(x, terrainHeight(x, z), z);
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd34d).multiplyScalar(10) });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 6, 32).rotateX(Math.PI / 2), ringMat);
    this.ring.position.copy(this.pos).y += 0.15;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.55, 0.1, 32),
      new THREE.MeshStandardMaterial({ color: 0x3b2f12, emissive: 0xffb300, emissiveIntensity: 0.6 }),
    );
    disc.position.copy(this.pos).y += 0.05;
    scene.add(this.ring, disc);

    this.canvas.width = 512; this.canvas.height = 160;
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, depthWrite: false }));
    this.label.scale.set(4.4, 1.375, 1);
    // Float above the collector machine (layout id 'collector' at x=0, z=104).
    this.label.position.set(0, terrainHeight(0, 104) + 5.6, 104);
    scene.add(this.label);
  }

  private draw(text: string, sub: string) {
    const key = text + sub;
    if (key === this.lastText) return;
    this.lastText = key;
    const g = this.ctx;
    g.clearRect(0, 0, 512, 160);
    g.fillStyle = 'rgba(40, 28, 5, 0.75)';
    g.beginPath(); g.roundRect(6, 6, 500, 148, 34); g.fill();
    g.textAlign = 'center';
    g.fillStyle = '#ffe27a';
    g.font = '800 64px system-ui, -apple-system, sans-serif';
    g.fillText(text, 256, 82);
    g.fillStyle = '#fff';
    g.font = '500 30px system-ui, -apple-system, sans-serif';
    g.fillText(sub, 256, 128);
    this.tex.needsUpdate = true;
  }

  update(player: THREE.Vector3, time: number, dt: number) {
    this.ring.rotation.y = time;
    this.ring.scale.setScalar(1 + Math.sin(time * 4) * 0.04 * Math.min(1, this.money.pending / 50));
    this.refresh -= dt;
    if (this.refresh <= 0) {
      this.refresh = 0.2;
      if (this.money.autoDeposit) this.draw('AUTO-BANK', 'Bank Manager deposits for you');
      else this.draw(formatMoney(this.money.pending), 'Step on the gold pad to collect');
    }
    const on = Math.hypot(player.x - this.pos.x, player.z - this.pos.z) < 1.8 && Math.abs(player.y - this.pos.y) < 2.5;
    if (on && !this.wasOn && this.money.pending >= 1) {
      const amt = this.money.claim();
      const at = this.pos.clone().setY(this.pos.y + 1.5);
      this.particles.coins(at, Math.min(60, 10 + Math.floor(Math.log10(amt + 1) * 10)));
      bus.emit('cashCollected', { amount: amt, x: at.x, y: at.y, z: at.z, source: 'collector' });
    }
    this.wasOn = on;
  }
}
