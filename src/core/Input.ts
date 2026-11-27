// Keyboard / mouse / gamepad -> abstract actions. Pointer lock for mouse-look.

/** True when the key event is aimed at a text field (menus), so gameplay should ignore it. */
export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  locked = false;
  private dragging = false;

  constructor(canvas: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat || isTyping(e)) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('click', () => {
      if (!this.locked) canvas.requestPointerLock?.();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    canvas.addEventListener('mousedown', () => (this.dragging = true));
    window.addEventListener('mouseup', () => (this.dragging = false));
    window.addEventListener('mousemove', (e) => {
      if (this.locked || this.dragging) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
  }

  /** Drop all held keys (e.g. after closing a menu). */
  clear() { this.down.clear(); this.pressed.clear(); this.mouseDX = this.mouseDY = 0; }

  isDown(...codes: string[]) { return codes.some((c) => this.down.has(c)); }
  wasPressed(...codes: string[]) { return codes.some((c) => this.pressed.has(c)); }

  private pad(): Gamepad | null {
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads) if (p) return p;
    return null;
  }

  /** Movement axes in [-1, 1]: x = right, y = forward. */
  axes(): { x: number; y: number } {
    let x = (this.isDown('KeyD', 'ArrowRight') ? 1 : 0) - (this.isDown('KeyA', 'ArrowLeft') ? 1 : 0);
    let y = (this.isDown('KeyW', 'ArrowUp') ? 1 : 0) - (this.isDown('KeyS', 'ArrowDown') ? 1 : 0);
    const p = this.pad();
    if (p) {
      const dz = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
      x += dz(p.axes[0] ?? 0);
      y -= dz(p.axes[1] ?? 0);
      if (p.buttons[7]?.pressed) y = Math.max(y, p.buttons[7].value);
      if (p.buttons[6]?.pressed) y = Math.min(y, -p.buttons[6].value);
      this.mouseDX += dz(p.axes[2] ?? 0) * 12;
      this.mouseDY += dz(p.axes[3] ?? 0) * 8;
    }
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }

  get jump() { return this.isDown('Space') || !!this.pad()?.buttons[0]?.pressed; }
  get descend() { return this.isDown('ShiftLeft', 'ShiftRight', 'ControlLeft') || !!this.pad()?.buttons[1]?.pressed; }
  get sprint() { return this.isDown('ShiftLeft', 'ShiftRight'); }
  private padPrev = false;
  private padEdge = false;
  /** Call at start of frame to latch gamepad button edges. */
  poll() {
    const now = !!this.pad()?.buttons[2]?.pressed;
    this.padEdge = now && !this.padPrev;
    this.padPrev = now;
  }
  get interact() { return this.wasPressed('KeyE') || this.padEdge; }
  get interactHeld() { return this.isDown('KeyE'); }

  /** Call at end of frame. */
  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
  }
}
