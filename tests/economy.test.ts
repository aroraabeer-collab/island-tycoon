import { describe, it, expect } from 'vitest';
import { MoneyManager, formatMoney, offlineEarnings, OFFLINE_CAP_SECONDS } from '../src/economy/MoneyManager';
import { TycoonState } from '../src/tycoon/TycoonState';
import { START_BUTTON } from '../src/tycoon/progression';

describe('MoneyManager', () => {
  it('accrues passive income into the collector until Bank Manager', () => {
    const m = new MoneyManager();
    m.baseIncome = 10;
    m.tick(2);
    expect(m.pending).toBe(20);
    expect(m.money).toBe(0);
    expect(m.claim()).toBe(20);
    expect(m.money).toBe(20);
    m.autoDeposit = true;
    m.tick(1);
    expect(m.money).toBe(30);
    expect(m.pending).toBe(0);
  });

  it('applies multipliers and refuses overspending', () => {
    const m = new MoneyManager();
    m.baseIncome = 10;
    m.multiplier = 1.5;
    m.judgeMultiplier = 10;
    expect(m.incomePerSec).toBe(150);
    m.money = 50;
    expect(m.spend(60)).toBe(false);
    expect(m.spend(-1)).toBe(false);
    expect(m.spend(50)).toBe(true);
    expect(m.money).toBe(0);
  });

  it('formats money compactly', () => {
    expect(formatMoney(999)).toBe('$999');
    expect(formatMoney(1234)).toBe('$1.23K');
    expect(formatMoney(45600)).toBe('$45.6K');
    expect(formatMoney(3_400_000)).toBe('$3.40M');
  });

  it('caps offline earnings', () => {
    expect(offlineEarnings(60, 10)).toBe(600);
    expect(offlineEarnings(1e9, 1)).toBe(OFFLINE_CAP_SECONDS);
    expect(offlineEarnings(-5, 10)).toBe(0);
    expect(offlineEarnings(NaN, 10)).toBe(0);
  });
});

describe('TycoonState', () => {
  it('buys, unlocks children and rejects invalid purchases', () => {
    const m = new MoneyManager();
    const s = new TycoonState(m);
    expect(s.buy(START_BUTTON)).toEqual({ ok: false, reason: 'funds' });
    m.money = 1e6;
    expect(s.buy('s_solar')).toEqual({ ok: false, reason: 'locked' });
    const r = s.buy(START_BUTTON);
    expect(r.ok).toBe(true);
    expect(s.available.has('s_solar')).toBe(true);
    expect(s.buy(START_BUTTON)).toEqual({ ok: false, reason: 'owned' });
    expect(s.buy('nope')).toEqual({ ok: false, reason: 'unknown' });
    expect(m.baseIncome).toBeGreaterThan(0);
  });

  it('tracks vehicle tiers and effects', () => {
    const m = new MoneyManager();
    const s = new TycoonState(m);
    for (const id of ['s_dropper', 's_solar', 's_shack', 's_cart', 's_bank']) s.restore(id);
    expect(s.vehicleTier('car')).toBe(0);
    expect(s.vehicleTier('boat')).toBe(-1);
    expect(m.autoDeposit).toBe(true);
    expect(s.hasEffect('bank')).toBe(true);
  });
});
