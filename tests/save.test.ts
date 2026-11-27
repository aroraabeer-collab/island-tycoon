import { describe, it, expect } from 'vitest';
import { SaveSystem, parseSave, SAVE_KEY } from '../src/save/SaveSystem';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

describe('SaveSystem', () => {
  it('round-trips a save', () => {
    const st = memoryStorage();
    const s = new SaveSystem(st);
    s.save({ money: 123.5, pending: 7, totalEarned: 999, purchased: ['s_dropper', 's_solar'], playTime: 60, bestTrial: 42.1 }, 1000);
    const loaded = s.load()!;
    expect(loaded.money).toBe(123.5);
    expect(loaded.purchased).toEqual(['s_dropper', 's_solar']);
    expect(loaded.bestTrial).toBe(42.1);
    expect(loaded.savedAt).toBe(1000);
  });

  it('rejects garbage and sanitizes bad fields', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('{not json')).toBeNull();
    expect(parseSave(JSON.stringify({ v: 99 }))).toBeNull();
    const p = parseSave(JSON.stringify({ v: 1, money: -5, pending: 'x', purchased: ['s_dropper', 'hax', 's_dropper', 3], bestTrial: -1 }))!;
    expect(p.money).toBe(0);
    expect(p.pending).toBe(0);
    expect(p.purchased).toEqual(['s_dropper']);
    expect(p.bestTrial).toBeNull();
  });

  it('reset removes the save', () => {
    const st = memoryStorage();
    const s = new SaveSystem(st);
    s.save({ money: 1, pending: 0, totalEarned: 1, purchased: [], playTime: 0, bestTrial: null });
    expect(st.raw.has(SAVE_KEY)).toBe(true);
    s.reset();
    expect(s.load()).toBeNull();
  });
});
