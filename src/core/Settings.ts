// Player settings, persisted separately from the save so "reset island" keeps them.

export type GraphicsMode = 'auto' | 'high' | 'low';

export interface Settings {
  /** Master volume 0..1. */
  volume: number;
  graphics: GraphicsMode;
  /** Mouse sensitivity multiplier 0.2..3. */
  sensitivity: number;
  invertY: boolean;
  showFps: boolean;
}

export const SETTINGS_KEY = 'island-tycoon-settings';

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  graphics: 'auto',
  sensitivity: 1,
  invertY: false,
  showFps: false,
};

const clampNum = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

/** Validate untrusted stored settings; unknown/invalid fields fall back to defaults. */
export function parseSettings(raw: string | null): Settings {
  let o: any = null;
  try { o = raw ? JSON.parse(raw) : null; } catch { o = null; }
  if (!o || typeof o !== 'object') return { ...DEFAULT_SETTINGS };
  return {
    volume: clampNum(o.volume, 0, 1, DEFAULT_SETTINGS.volume),
    graphics: o.graphics === 'high' || o.graphics === 'low' || o.graphics === 'auto' ? o.graphics : DEFAULT_SETTINGS.graphics,
    sensitivity: clampNum(o.sensitivity, 0.2, 3, DEFAULT_SETTINGS.sensitivity),
    invertY: typeof o.invertY === 'boolean' ? o.invertY : DEFAULT_SETTINGS.invertY,
    showFps: typeof o.showFps === 'boolean' ? o.showFps : DEFAULT_SETTINGS.showFps,
  };
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;

export class SettingsStore {
  constructor(private storage: KV | null = typeof localStorage !== 'undefined' ? localStorage : null) {}

  load(): Settings {
    try { return parseSettings(this.storage?.getItem(SETTINGS_KEY) ?? null); } catch { return { ...DEFAULT_SETTINGS }; }
  }

  save(s: Settings) {
    try { this.storage?.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore quota/private mode */ }
  }
}
