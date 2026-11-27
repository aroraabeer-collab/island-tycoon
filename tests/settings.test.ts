import { describe, it, expect } from 'vitest';
import { parseSettings, DEFAULT_SETTINGS, SettingsStore } from '../src/core/Settings';
import { lookupCheat, normalizeCode, CHEATS } from '../src/core/Cheats';
import { MoneyManager } from '../src/economy/MoneyManager';
import { TycoonState } from '../src/tycoon/TycoonState';

describe('settings', () => {
  it('falls back to defaults for missing or garbage data', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{bad json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps and validates each field', () => {
    const s = parseSettings(JSON.stringify({ volume: 9, graphics: 'ultra', sensitivity: -1, invertY: 'yes', showFps: true }));
    expect(s.volume).toBe(1);
    expect(s.graphics).toBe('auto');
    expect(s.sensitivity).toBe(0.2);
    expect(s.invertY).toBe(false);
    expect(s.showFps).toBe(true);
  });

  it('round-trips through storage', () => {
    const m = new Map<string, string>();
    const store = new SettingsStore({ getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) });
    store.save({ ...DEFAULT_SETTINGS, volume: 0.3, graphics: 'low' });
    expect(store.load()).toEqual({ ...DEFAULT_SETTINGS, volume: 0.3, graphics: 'low' });
  });
});

describe('cheats', () => {
  it('matches codes case- and space-insensitively', () => {
    expect(lookupCheat('moneybags')?.id).toBe('infinite');
    expect(lookupCheat('  Money Bags ')?.id).toBe('infinite');
    expect(lookupCheat('nope')).toBeNull();
    expect(lookupCheat('')).toBeNull();
    expect(normalizeCode('a'.repeat(100)).length).toBe(32);
  });

  it('has unique codes', () => {
    expect(new Set(CHEATS.map((c) => c.code)).size).toBe(CHEATS.length);
  });

  it('infinite money makes every purchase succeed without spending', () => {
    const m = new MoneyManager();
    m.infinite = true;
    const s = new TycoonState(m);
    expect(s.buy('s_dropper').ok).toBe(true);
    expect(m.money).toBe(0);
    expect(m.canAfford(1e12)).toBe(true);
  });

  it('vehicle tier overrides (GARAGE) count as owned tiers', () => {
    const s = new TycoonState(new MoneyManager());
    expect(s.vehicleTier('air')).toBe(-1);
    s.vehicleOverride.set('air', 2);
    expect(s.vehicleTier('air')).toBe(2);
  });
});
