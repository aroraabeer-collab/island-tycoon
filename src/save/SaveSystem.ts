// localStorage persistence with a versioned, validated schema.
import { BUTTON_BY_ID } from '../tycoon/progression';

export const SAVE_KEY = 'island-tycoon-save';
export const SAVE_VERSION = 1;

export interface SaveData {
  v: number;
  money: number;
  pending: number;
  totalEarned: number;
  purchased: string[];
  playTime: number;
  bestTrial: number | null;
  savedAt: number;
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);

/** Validate untrusted data from storage. Returns null if unusable. */
export function parseSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  let o: any;
  try { o = JSON.parse(raw); } catch { return null; }
  if (!o || typeof o !== 'object' || o.v !== SAVE_VERSION) return null;
  const purchased: string[] = Array.isArray(o.purchased)
    ? [...new Set<string>(o.purchased.filter((id: unknown): id is string => typeof id === 'string' && BUTTON_BY_ID.has(id)))]
    : [];
  return {
    v: SAVE_VERSION,
    money: num(o.money),
    pending: num(o.pending),
    totalEarned: num(o.totalEarned),
    purchased,
    playTime: num(o.playTime),
    bestTrial: typeof o.bestTrial === 'number' && Number.isFinite(o.bestTrial) && o.bestTrial > 0 ? o.bestTrial : null,
    savedAt: num(o.savedAt, Date.now()),
  };
}

export class SaveSystem {
  constructor(private storage: KV | null = typeof localStorage !== 'undefined' ? localStorage : null) {}

  load(): SaveData | null {
    try { return parseSave(this.storage?.getItem(SAVE_KEY) ?? null); } catch { return null; }
  }

  save(data: Omit<SaveData, 'v' | 'savedAt'>, now = Date.now()) {
    const full: SaveData = { ...data, v: SAVE_VERSION, savedAt: now };
    try { this.storage?.setItem(SAVE_KEY, JSON.stringify(full)); } catch { /* quota / private mode */ }
  }

  reset() { try { this.storage?.removeItem(SAVE_KEY); } catch { /* ignore */ } }
}
