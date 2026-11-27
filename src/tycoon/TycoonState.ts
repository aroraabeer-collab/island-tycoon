// Pure purchase/unlock logic for the progression tree (no rendering).
import { BUTTONS, START_BUTTON, type ButtonDef, type Effect } from './progression';
import type { MoneyManager } from '../economy/MoneyManager';

export type BuyResult =
  | { ok: true; def: ButtonDef; unlocked: string[] }
  | { ok: false; reason: 'unknown' | 'locked' | 'owned' | 'funds' };

export class TycoonState {
  readonly purchased = new Set<string>();
  readonly available = new Set<string>([START_BUTTON]);
  /** Cheat (GARAGE): vehicle tiers granted outside the progression tree. */
  readonly vehicleOverride = new Map<string, number>();
  private byId: Map<string, ButtonDef>;

  constructor(private money: MoneyManager, private defs: ButtonDef[] = BUTTONS) {
    this.byId = new Map(defs.map((d) => [d.id, d]));
  }

  buy(id: string): BuyResult {
    const def = this.byId.get(id);
    if (!def) return { ok: false, reason: 'unknown' };
    if (this.purchased.has(id)) return { ok: false, reason: 'owned' };
    if (!this.available.has(id)) return { ok: false, reason: 'locked' };
    if (!this.money.spend(def.cost)) return { ok: false, reason: 'funds' };
    return { ok: true, def, unlocked: this.apply(def) };
  }

  /** Mark bought without paying (used when loading a save). */
  restore(id: string): ButtonDef | null {
    const def = this.byId.get(id);
    if (!def || this.purchased.has(id)) return null;
    this.apply(def);
    return def;
  }

  private apply(def: ButtonDef): string[] {
    this.purchased.add(def.id);
    this.available.delete(def.id);
    this.money.baseIncome += def.incomePerSec;
    for (const e of def.effects ?? []) this.applyEffect(e);
    const unlocked = def.unlocks.filter((u) => !this.purchased.has(u));
    unlocked.forEach((u) => this.available.add(u));
    return unlocked;
  }

  private applyEffect(e: Effect) {
    if (e.type === 'bank') this.money.autoDeposit = true;
    if (e.type === 'multiplier') this.money.multiplier *= e.value;
  }

  has(id: string) { return this.purchased.has(id); }

  /** Highest owned tier for a vehicle kind, or -1. */
  vehicleTier(kind: string): number {
    let tier = this.vehicleOverride.get(kind) ?? -1;
    for (const id of this.purchased) for (const e of this.byId.get(id)?.effects ?? []) {
      if (e.type === 'vehicle' && e.kind === kind) tier = Math.max(tier, e.tier);
    }
    return tier;
  }

  hasEffect(type: Effect['type']): boolean {
    for (const id of this.purchased) if (this.byId.get(id)?.effects?.some((e) => e.type === type)) return true;
    return false;
  }

  get progress() { return this.purchased.size / this.defs.length; }
}
