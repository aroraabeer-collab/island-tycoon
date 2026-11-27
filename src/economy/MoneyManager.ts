// Balance, passive income, collector, multipliers. Pure logic (no three) so it is unit-testable.

export const OFFLINE_CAP_SECONDS = 2 * 60 * 60;

export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n < 1000) return `${sign}$${Math.floor(n)}`;
  const units = ['K', 'M', 'B', 'T'];
  let u = -1;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return `${sign}$${n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)}${units[u]}`;
}

/** Offline earnings for `seconds` away, capped. */
export function offlineEarnings(seconds: number, incomePerSec: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0 || incomePerSec <= 0) return 0;
  return Math.min(seconds, OFFLINE_CAP_SECONDS) * incomePerSec;
}

export class MoneyManager {
  money = 0;
  /** Cash waiting in the collector. */
  pending = 0;
  baseIncome = 0;
  multiplier = 1;
  judgeMultiplier = 1;
  autoDeposit = false;
  totalEarned = 0;
  /** Cheat: purchases never cost anything. */
  infinite = false;

  get incomePerSec() { return this.baseIncome * this.multiplier * this.judgeMultiplier; }

  tick(dt: number) {
    const amt = this.incomePerSec * dt;
    if (amt <= 0) return;
    this.totalEarned += amt;
    if (this.autoDeposit) this.money += amt;
    else this.pending += amt;
  }

  /** Move collector cash into the wallet. Returns amount claimed. */
  claim(): number {
    const amt = this.pending;
    this.money += amt;
    this.pending = 0;
    return amt;
  }

  /** Active income (crates, treasure, rings) goes straight to the wallet. */
  earn(amount: number): number {
    const amt = Math.max(0, amount) * this.judgeMultiplier;
    this.money += amt;
    this.totalEarned += amt;
    return amt;
  }

  canAfford(cost: number) { return this.infinite || this.money >= cost; }

  spend(cost: number): boolean {
    if (cost < 0) return false;
    if (this.infinite) return true;
    if (this.money < cost) return false;
    this.money -= cost;
    return true;
  }
}
