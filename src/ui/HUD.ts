// DOM overlay: money, zone progress, prompts, toasts, floating cash, minimap.
import * as THREE from 'three';
import { bus } from '../core/EventBus';
import { formatMoney, type MoneyManager } from '../economy/MoneyManager';
import { BUTTONS, ZONE_NAMES } from '../tycoon/progression';
import type { TycoonState } from '../tycoon/TycoonState';
import type { Zone } from '../world/layout';
import type { Marker } from '../activities/types';
import { terrainHeight, roadQuery, ROAD_HALF_WIDTH } from '../world/heights';

const MAP_RANGE = 210;
const MAP_PX = 200;

const el = (tag: string, cls: string, parent: HTMLElement, html = '') => {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  parent.appendChild(e);
  return e;
};

interface Floater { el: HTMLElement; pos: THREE.Vector3; t: number }

export class HUD {
  private amount: HTMLElement;
  private rate: HTMLElement;
  private moneyBox: HTMLElement;
  private zoneEls = new Map<Zone, { root: HTMLElement; fill: HTMLElement }>();
  private promptEl: HTMLElement;
  private statusEl: HTMLElement;
  private hintEl: HTMLElement;
  private toastsEl: HTMLElement;
  private mapCtx: CanvasRenderingContext2D;
  private mapBase: HTMLCanvasElement;
  private floaters: Floater[] = [];
  private lastMoney = -1;
  private v = new THREE.Vector3();

  constructor(private root: HTMLElement, private money: MoneyManager, private tycoon: TycoonState, private camera: THREE.Camera) {
    this.moneyBox = el('div', 'money panel', root, `<div class="coin">$</div><div><div class="amount">$0</div><div class="rate">+$0/s</div></div>`);
    this.amount = this.moneyBox.querySelector('.amount')!;
    this.rate = this.moneyBox.querySelector('.rate')!;

    const zones = el('div', 'zones panel', root);
    (Object.keys(ZONE_NAMES) as Zone[]).forEach((z) => {
      const r = el('div', 'zone', zones, `${ZONE_NAMES[z]}<div class="bar"><div class="fill"></div></div>`);
      this.zoneEls.set(z, { root: r, fill: r.querySelector('.fill')! });
    });
    this.statusEl = el('div', 'status panel', root);
    this.promptEl = el('div', 'prompt panel', root);
    this.hintEl = el('div', 'hint panel', root);
    this.toastsEl = el('div', 'toasts', root);

    const mapWrap = el('div', 'minimap', root);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = MAP_PX * 2;
    mapWrap.appendChild(canvas);
    this.mapCtx = canvas.getContext('2d')!;
    this.mapBase = this.renderMapBase();

    bus.on('toast', ({ text, kind }) => this.toast(text, kind));
    bus.on('buttonPurchased', ({ label }) => { this.toast(`Built ${label}!`, 'unlock'); this.updateZones(); });
    bus.on('vehicleUnlocked', ({ name }) => this.toast(`New ride: ${name}!`, 'unlock'));
    bus.on('cashCollected', ({ amount, x, y, z, source }) => {
      this.floatCash(`+${formatMoney(amount)}`, new THREE.Vector3(x, y, z));
      if (source !== 'collector') this.toast(`${{ crate: 'Supply crate', treasure: 'Treasure', rings: 'Ring run', trial: 'Time trial' }[source] ?? 'Bonus'} +${formatMoney(amount)}`, 'money');
    });
    bus.on('activity', ({ text, state }) => { if (text && state !== 'progress') this.toast(text, 'info'); });
    this.updateZones();
  }

  toast(text: string, kind: string = 'info') {
    const t = el('div', `toast panel ${kind}`, this.toastsEl);
    t.textContent = text;
    while (this.toastsEl.children.length > 5) this.toastsEl.firstElementChild?.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, kind === 'win' ? 8000 : 3200);
  }

  floatCash(text: string, pos: THREE.Vector3) {
    const e = el('div', 'float-cash', this.root, text);
    this.floaters.push({ el: e, pos: pos.clone(), t: 0 });
  }

  updateZones() {
    for (const [z, { root, fill }] of this.zoneEls) {
      const defs = BUTTONS.filter((b) => b.zone === z);
      const owned = defs.filter((b) => this.tycoon.has(b.id)).length;
      fill.style.width = `${(owned / defs.length) * 100}%`;
      root.classList.toggle('active', owned > 0 || defs.some((b) => this.tycoon.available.has(b.id)));
      root.classList.toggle('done', owned === defs.length);
    }
  }

  setPrompt(text: string | null) {
    if (!text) { this.promptEl.style.display = 'none'; return; }
    this.promptEl.style.display = 'block';
    const html = text.replace(/^([A-Z])  /, '<kbd>$1</kbd>').replace(/·\s+([A-Z])  /, '· <kbd>$1</kbd>');
    if (this.promptEl.innerHTML !== html) this.promptEl.innerHTML = html;
  }

  setStatus(text: string | null) {
    this.statusEl.style.display = text ? 'block' : 'none';
    if (text && this.statusEl.textContent !== text) this.statusEl.textContent = text;
  }

  setHint(html: string) {
    if (this.hintEl.innerHTML !== html) this.hintEl.innerHTML = html;
  }

  private renderMapBase(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    const N = MAP_PX;
    c.width = c.height = N;
    const g = c.getContext('2d')!;
    const img = g.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -MAP_RANGE + (i / N) * MAP_RANGE * 2, z = -MAP_RANGE + (j / N) * MAP_RANGE * 2;
      const h = terrainHeight(x, z);
      let col: number[];
      if (h < 0) { const d = Math.min(1, -h / 8); col = [60 - 40 * d, 210 - 110 * d, 215 - 60 * d]; }
      else if (h < 2.6) col = [240, 222, 170];
      else col = [110 + h * 3, 180 - h * 2, 90];
      if (h > 0 && roadQuery(x, z).dist < ROAD_HALF_WIDTH) col = [70, 72, 80];
      const k = (j * N + i) * 4;
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  private drawMap(player: THREE.Vector3, heading: number, markers: Marker[]) {
    const g = this.mapCtx;
    const S = MAP_PX * 2;
    const toPx = (x: number, z: number) => [((x + MAP_RANGE) / (MAP_RANGE * 2)) * S, ((z + MAP_RANGE) / (MAP_RANGE * 2)) * S];
    g.fillStyle = '#1b6f95';
    g.fillRect(0, 0, S, S);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.mapBase, 0, 0, S, S);
    for (const m of markers) {
      let [px, py] = toPx(m.x, m.z);
      const off = px < 8 || py < 8 || px > S - 8 || py > S - 8;
      px = Math.min(S - 10, Math.max(10, px)); py = Math.min(S - 10, Math.max(10, py));
      g.fillStyle = m.color;
      g.strokeStyle = 'rgba(0,0,0,0.5)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(px, py, m.kind === 'pad' ? 6 : off ? 7 : 9, 0, Math.PI * 2);
      g.fill(); g.stroke();
    }
    const [px, py] = toPx(player.x, player.z);
    g.save();
    g.translate(px, py);
    g.rotate(-heading + Math.PI);
    g.fillStyle = '#fff';
    g.strokeStyle = '#0d2b3a';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, -14); g.lineTo(10, 11); g.lineTo(0, 5); g.lineTo(-10, 11); g.closePath();
    g.stroke(); g.fill();
    g.restore();
  }

  private fpsEl: HTMLElement | null = null;
  setFps(text: string | null) {
    if (!text) { this.fpsEl?.remove(); this.fpsEl = null; return; }
    if (!this.fpsEl) this.fpsEl = el('div', 'fps panel', this.root);
    this.fpsEl.textContent = text;
  }

  drawMinimap(player: THREE.Vector3, heading: number, markers: Marker[]) {
    this.drawMap(player, heading, markers);
  }

  update(dt: number) {
    const m = this.money.money;
    if (this.money.infinite) {
      if (this.amount.textContent !== '∞') this.amount.textContent = '∞';
      this.lastMoney = m;
    } else if (Math.floor(m) !== Math.floor(this.lastMoney) || this.amount.textContent === '∞') {
      this.amount.textContent = formatMoney(m);
      if (m > this.lastMoney + 1 && this.lastMoney >= 0) {
        this.moneyBox.classList.remove('bump');
        void this.moneyBox.offsetWidth;
        this.moneyBox.classList.add('bump');
      }
      this.lastMoney = m;
    }
    const rate = `+${formatMoney(this.money.incomePerSec)}/s${this.money.multiplier > 1 ? ` · x${this.money.multiplier}` : ''}${this.money.judgeMultiplier > 1 ? ' · JUDGE x10' : ''}`;
    if (this.rate.textContent !== rate) this.rate.textContent = rate;

    for (const f of [...this.floaters]) {
      f.t += dt;
      this.v.copy(f.pos).setY(f.pos.y + f.t * 3).project(this.camera);
      const visible = this.v.z < 1;
      f.el.style.left = `${(this.v.x * 0.5 + 0.5) * window.innerWidth}px`;
      f.el.style.top = `${(-this.v.y * 0.5 + 0.5) * window.innerHeight}px`;
      f.el.style.opacity = visible ? `${Math.max(0, 1 - Math.max(0, f.t - 0.8) * 1.5)}` : '0';
      f.el.style.scale = `${Math.min(1.2, 0.6 + f.t * 3)}`;
      if (f.t > 1.6) { f.el.remove(); this.floaters.splice(this.floaters.indexOf(f), 1); }
    }
  }
}
