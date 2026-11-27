// Shared context passed to activities each frame.
import type * as THREE from 'three';
import type { Input } from '../core/Input';
import type { MoneyManager } from '../economy/MoneyManager';
import type { TycoonState } from '../tycoon/TycoonState';
import type { Particles } from '../render/Particles';
import type { Vehicle } from '../vehicles/Vehicle';

export interface ActivityCtx {
  dt: number;
  time: number;
  player: THREE.Vector3;
  /** Vehicle the player is driving, if any. */
  vehicle: Vehicle | null;
  input: Input;
  money: MoneyManager;
  tycoon: TycoonState;
  particles: Particles;
}

export interface Marker { x: number; z: number; color: string; kind: string }

export interface Activity {
  update(ctx: ActivityCtx): void;
  markers(): Marker[];
  /** Contextual prompt (e.g. "Hold E to salvage"), or null. */
  prompt?: string | null;
}

/** Reward scaled to current passive income so active play always matters. */
export function reward(money: MoneyManager, base: number, secondsOfIncome: number, mult = 1) {
  return Math.round((base + money.baseIncome * money.multiplier * secondsOfIncome) * mult);
}
