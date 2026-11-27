// Pause / settings menu (Esc or the gear button): audio, graphics, controls, cheat codes, reset.
import type { Settings, GraphicsMode } from '../core/Settings';

export interface MenuHooks {
  getSettings(): Settings;
  /** Apply + persist a settings change. */
  apply(next: Settings): void;
  /** Try a cheat code; returns a message for the status line. */
  cheat(code: string): { ok: boolean; message: string };
  activeCheats(): string[];
  resetIsland(): void;
  onOpenChange(open: boolean): void;
}

const GRAPHICS: { id: GraphicsMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Adjusts resolution to stay smooth' },
  { id: 'high', label: 'High', hint: 'Full quality, fixed resolution' },
  { id: 'low', label: 'Low', hint: 'No shadows or glow — fastest' },
];

export class SettingsMenu {
  private root: HTMLElement;
  private gear: HTMLButtonElement;
  private status!: HTMLElement;
  private active!: HTMLElement;
  private openedAt = 0;
  open = false;

  constructor(parent: HTMLElement, private hooks: MenuHooks) {
    this.gear = document.createElement('button');
    this.gear.className = 'gear panel';
    this.gear.title = 'Settings (Esc)';
    this.gear.setAttribute('aria-label', 'Open settings');
    this.gear.textContent = '⚙';
    this.gear.addEventListener('click', () => this.toggle(true));
    parent.appendChild(this.gear);

    this.root = document.createElement('div');
    this.root.className = 'menu';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Settings');
    parent.appendChild(this.root);
    this.root.addEventListener('mousedown', (e) => { if (e.target === this.root) this.toggle(false); });
  }

  /** Esc handling: ignore the duplicate Escape some browsers send right after releasing pointer lock. */
  handleEscape() {
    if (this.open && performance.now() - this.openedAt < 250) return;
    this.toggle(!this.open);
  }

  toggle(open: boolean) {
    if (open === this.open) return;
    this.open = open;
    if (open) {
      this.openedAt = performance.now();
      this.render();
      document.exitPointerLock?.();
    }
    this.root.classList.toggle('show', open);
    this.gear.style.display = open ? 'none' : '';
    this.hooks.onOpenChange(open);
  }

  /** Re-render (e.g. after Q/P shortcuts changed a setting). */
  refresh() { if (this.open) this.render(); }

  private set<K extends keyof Settings>(key: K, value: Settings[K]) {
    this.hooks.apply({ ...this.hooks.getSettings(), [key]: value });
  }

  private render() {
    const s = this.hooks.getSettings();
    this.root.innerHTML = `
      <div class="menu-card panel">
        <h2>Paused</h2>
        <section>
          <h3>Audio</h3>
          <label class="row"><span>Volume</span>
            <input type="range" min="0" max="100" step="1" value="${Math.round(s.volume * 100)}" data-k="volume">
            <output>${Math.round(s.volume * 100)}%</output></label>
        </section>
        <section>
          <h3>Graphics</h3>
          <div class="seg" role="radiogroup" aria-label="Graphics quality">
            ${GRAPHICS.map((g) => `<button role="radio" aria-checked="${s.graphics === g.id}" class="${s.graphics === g.id ? 'on' : ''}" data-g="${g.id}" title="${g.hint}">${g.label}</button>`).join('')}
          </div>
          <p class="muted">${GRAPHICS.find((g) => g.id === s.graphics)!.hint}</p>
          <label class="row check"><input type="checkbox" data-k="showFps" ${s.showFps ? 'checked' : ''}><span>Show FPS counter</span></label>
        </section>
        <section>
          <h3>Controls</h3>
          <label class="row"><span>Mouse sensitivity</span>
            <input type="range" min="20" max="300" step="5" value="${Math.round(s.sensitivity * 100)}" data-k="sensitivity">
            <output>${s.sensitivity.toFixed(2)}x</output></label>
          <label class="row check"><input type="checkbox" data-k="invertY" ${s.invertY ? 'checked' : ''}><span>Invert vertical look</span></label>
        </section>
        <section>
          <h3>Cheat codes</h3>
          <form class="cheat">
            <input type="text" maxlength="32" placeholder="Enter a code" autocomplete="off" spellcheck="false" aria-label="Cheat code">
            <button type="submit">Apply</button>
          </form>
          <p class="status" aria-live="polite"></p>
          <p class="active"></p>
        </section>
        <div class="menu-actions">
          <button class="danger" data-act="reset">Reset island</button>
          <button class="primary" data-act="resume">Resume</button>
        </div>
      </div>`;

    this.status = this.root.querySelector('.status')!;
    this.active = this.root.querySelector('.active')!;
    this.renderActive();

    this.root.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((el) => {
      el.addEventListener('input', () => {
        const k = el.dataset.k as 'volume' | 'sensitivity';
        const v = Number(el.value) / 100;
        this.set(k, v);
        el.nextElementSibling!.textContent = k === 'volume' ? `${el.value}%` : `${v.toFixed(2)}x`;
      });
    });
    this.root.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((el) => {
      el.addEventListener('change', () => this.set(el.dataset.k as 'showFps' | 'invertY', el.checked));
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-g]').forEach((el) => {
      el.addEventListener('click', () => { this.set('graphics', el.dataset.g as GraphicsMode); this.render(); });
    });
    const form = this.root.querySelector<HTMLFormElement>('.cheat')!;
    const input = form.querySelector('input')!;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const r = this.hooks.cheat(input.value);
      this.status.textContent = r.message;
      this.status.className = `status ${r.ok ? 'ok' : 'bad'}`;
      if (r.ok) input.value = '';
      this.renderActive();
    });
    this.root.querySelector('[data-act=resume]')!.addEventListener('click', () => this.toggle(false));
    this.root.querySelector('[data-act=reset]')!.addEventListener('click', () => {
      if (confirm('Erase your island and start over? Settings are kept.')) this.hooks.resetIsland();
    });
  }

  private renderActive() {
    const list = this.hooks.activeCheats();
    this.active.textContent = list.length ? `Active: ${list.join(', ')}` : '';
  }
}
