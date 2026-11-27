// DATA: every placeable object on the finished island. Everything except `alwaysVisible`
// entries starts hidden (scale 0) and is revealed by tycoon buttons that list it in `targets`.
import { ROAD } from './heights';

export type ModelKey =
  | 'collector' | 'cashDropper' | 'solarPanel' | 'bambooShack' | 'beachHut' | 'palmPath' | 'carport' | 'bank'
  | 'pier' | 'tikiBar' | 'dock' | 'boathouse' | 'lighthouse' | 'seafoodShack' | 'buoy'
  | 'cliffGate' | 'villa0' | 'villa1' | 'mansion' | 'garden' | 'infinityPool' | 'concierge' | 'raceArch'
  | 'runway' | 'hangar' | 'helipad' | 'controlTower' | 'beachClub' | 'skyResort' | 'goldenStatue';

export type ColliderMode = 'box' | 'none' | 'deck';
export type Zone = 'beach' | 'marina' | 'cliff' | 'airfield';

export interface LayoutItem {
  id: string;
  model: ModelKey;
  x: number;
  z: number;
  /** Absolute Y. Defaults to terrain height. */
  y?: number;
  rot?: number;
  zone: Zone;
  collider?: ColliderMode;
  /** Bobs on the waves. */
  float?: boolean;
  /** Emits cash-flow visuals toward the collector. */
  income?: boolean;
  alwaysVisible?: boolean;
}

export const COLLIDER_DEFAULTS: Partial<Record<ModelKey, ColliderMode>> = {
  palmPath: 'none', carport: 'none', raceArch: 'none', buoy: 'none', garden: 'none',
  runway: 'none', pier: 'deck', dock: 'deck',
};

const H = Math.PI / 2;

function onRoad(nearX: number, nearZ: number): { x: number; z: number; y: number; rot: number } {
  let best = ROAD[0], bd = Infinity;
  for (const s of ROAD) {
    const d = Math.hypot(s.x - nearX, s.z - nearZ);
    if (d < bd) { bd = d; best = s; }
  }
  return { x: best.x, z: best.z, y: best.y, rot: Math.atan2(best.dirX, best.dirZ) };
}

const arch = onRoad(0, -58);

export const LAYOUT: LayoutItem[] = [
  // ---------------- Starter Beach
  { id: 'collector', model: 'collector', x: 0, z: 104, zone: 'beach', alwaysVisible: true },
  { id: 'dropper', model: 'cashDropper', x: -12, z: 104, zone: 'beach', income: true },
  ...[97, 102, 107].map((z, i) => ({ id: `solar_${i + 1}`, model: 'solarPanel' as const, x: -26, z, zone: 'beach' as const, income: i === 1 })),
  { id: 'shack_1', model: 'bambooShack', x: 20, z: 106, rot: -0.3, zone: 'beach', income: true },
  { id: 'palmpath', model: 'palmPath', x: 0, z: 128, zone: 'beach' },
  { id: 'carport', model: 'carport', x: 14, z: 97, zone: 'beach' },
  { id: 'hut_1', model: 'beachHut', x: -20, z: 122, zone: 'beach', income: true },
  { id: 'hut_2', model: 'beachHut', x: 20, z: 122, zone: 'beach', income: true },
  { id: 'hut_3', model: 'beachHut', x: 32, z: 114, rot: -0.4, zone: 'beach', income: true },
  { id: 'bank', model: 'bank', x: -10, z: 117, zone: 'beach' },
  ...[-38, -42.5].flatMap((x, i) => [96, 101, 106].map((z, j) => ({
    id: `solar2_${i * 3 + j + 1}`, model: 'solarPanel' as const, x, z, zone: 'beach' as const, income: j === 1,
  }))),

  // ---------------- The Marina
  { id: 'pier', model: 'pier', x: 128, z: 34, y: 0, rot: H, zone: 'marina', income: true },
  { id: 'tikibar', model: 'tikiBar', x: 118, z: 8, rot: H, zone: 'marina', income: true },
  { id: 'dock', model: 'dock', x: 146, z: 8, y: 0, zone: 'marina' },
  { id: 'boathouse', model: 'boathouse', x: 121, z: 44, rot: H, zone: 'marina', income: true },
  { id: 'seafood', model: 'seafoodShack', x: 112, z: 54, rot: H, zone: 'marina', income: true },
  { id: 'lighthouse', model: 'lighthouse', x: 96, z: -70, zone: 'marina', income: true },
  ...([[165, -10], [178, 14], [170, 40], [190, -2], [188, 30], [160, 58]] as const).map(([x, z], i) => ({
    id: `buoy_${i + 1}`, model: 'buoy' as const, x, z, y: 0, zone: 'marina' as const, float: true,
  })),

  // ---------------- Cliffside Mansion
  { id: 'gate', model: 'cliffGate', x: 0, z: -66, zone: 'cliff' },
  { id: 'villa_1', model: 'villa0', x: -18, z: -84, zone: 'cliff', income: true },
  { id: 'garden', model: 'garden', x: 0, z: -80, zone: 'cliff', income: true },
  { id: 'villa_2', model: 'villa1', x: 18, z: -86, zone: 'cliff', income: true },
  { id: 'pool', model: 'infinityPool', x: 22, z: -101, zone: 'cliff', income: true },
  { id: 'mansion', model: 'mansion', x: 0, z: -102, zone: 'cliff', income: true },
  { id: 'concierge', model: 'concierge', x: 8, z: -72, zone: 'cliff' },
  { id: 'trialarch', model: 'raceArch', x: arch.x, z: arch.z, y: arch.y, rot: arch.rot, zone: 'cliff' },

  // ---------------- The Airfield
  { id: 'runway', model: 'runway', x: -108, z: -5, zone: 'airfield', income: true },
  { id: 'hangar', model: 'hangar', x: -86, z: -38, rot: -H, zone: 'airfield', income: true },
  { id: 'helipad', model: 'helipad', x: -88, z: 32, zone: 'airfield' },
  { id: 'tower', model: 'controlTower', x: -88, z: 0, zone: 'airfield', income: true },
  { id: 'resort', model: 'skyResort', x: -46, z: 14, zone: 'airfield', income: true },
  { id: 'atoll_club', model: 'beachClub', x: -335, z: 245, zone: 'airfield', income: true },
  { id: 'atoll_pad', model: 'helipad', x: -320, z: 260, zone: 'airfield' },
  { id: 'statue', model: 'goldenStatue', x: 0, z: 70, zone: 'airfield' },
];

export const LAYOUT_BY_ID = new Map(LAYOUT.map((l) => [l.id, l]));

/** Fixed gameplay anchors. */
export const SPOTS = {
  spawn: { x: 0, z: 116 },
  collectorPad: { x: 0, z: 109 },
  car: { x: 14, z: 97, rot: Math.PI },
  boat: { x: 154, z: 2, rot: H },
  air: { x: -88, z: 32, rot: Math.PI },
  atollPad: { x: -320, z: 260 },
};
