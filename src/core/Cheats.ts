// Cheat code registry. Codes are case- and whitespace-insensitive.

export type CheatId = 'infinite' | 'buildall' | 'rich' | 'garage' | 'turbo';

export interface CheatDef {
  id: CheatId;
  code: string;
  description: string;
  /** Toggle cheats switch on/off; others fire once. */
  toggle: boolean;
}

export const CHEATS: CheatDef[] = [
  { id: 'infinite', code: 'MONEYBAGS', description: 'Infinite money — every pad is free', toggle: true },
  { id: 'buildall', code: 'BUILDITALL', description: 'Instantly build the whole island', toggle: false },
  { id: 'rich', code: 'MILLIONAIRE', description: '+$1,000,000', toggle: false },
  { id: 'garage', code: 'GARAGE', description: 'Unlock every vehicle at max tier', toggle: false },
  { id: 'turbo', code: 'TURBO', description: 'x10 income', toggle: true },
];

/** Normalize player input: uppercase, letters/digits only, capped length. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32);
}

export function lookupCheat(input: string): CheatDef | null {
  const code = normalizeCode(input);
  if (!code) return null;
  return CHEATS.find((c) => c.code === code) ?? null;
}
