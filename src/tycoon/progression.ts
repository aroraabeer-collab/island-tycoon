// DATA: the tycoon progression tree. Each entry is one glowing purchase pad.
import type { Zone } from '../world/layout';
import type { VehicleKind } from '../core/EventBus';

export type Effect =
  | { type: 'vehicle'; kind: VehicleKind; tier: number }
  | { type: 'bank' }
  | { type: 'multiplier'; value: number }
  | { type: 'treasureBoost' }
  | { type: 'timeTrial' }
  | { type: 'rings' }
  | { type: 'atoll' }
  | { type: 'win' };

export interface ButtonDef {
  id: string;
  zone: Zone;
  label: string;
  cost: number;
  incomePerSec: number;
  /** Layout ids revealed on purchase. */
  targets: string[];
  /** Button ids that appear once this one is bought. */
  unlocks: string[];
  effects?: Effect[];
  /** Pad position (x, z). */
  pad: [number, number];
}

export const START_BUTTON = 's_dropper';
export const START_MONEY = 40;

const b = (
  id: string, zone: Zone, label: string, cost: number, incomePerSec: number,
  targets: string[], unlocks: string[], pad: [number, number], effects?: Effect[],
): ButtonDef => ({ id, zone, label, cost, incomePerSec, targets, unlocks, pad, effects });

const range = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}_${i + 1}`);

export const BUTTONS: ButtonDef[] = [
  // ---------------- Starter Beach
  b('s_dropper', 'beach', 'Cash Dropper', 25, 3, ['dropper'], ['s_solar'], [-7, 111]),
  b('s_solar', 'beach', 'Solar Panels', 75, 6, range('solar', 3), ['s_shack'], [-19, 110]),
  b('s_shack', 'beach', 'Bamboo Shack', 180, 12, ['shack_1'], ['s_path', 's_cart'], [13, 112]),
  b('s_path', 'beach', 'Palm Path', 280, 5, ['palmpath'], ['s_huts'], [6, 121]),
  b('s_cart', 'beach', 'Rusty Golf Cart', 400, 0, ['carport'], ['s_bank'], [7, 99], [{ type: 'vehicle', kind: 'car', tier: 0 }]),
  b('s_huts', 'beach', 'Beach Huts', 650, 22, range('hut', 3), ['s_solar2', 'm_pier'], [26, 119]),
  b('s_bank', 'beach', 'Bank Manager', 950, 0, ['bank'], [], [-3, 113], [{ type: 'bank' }]),
  b('s_solar2', 'beach', 'Solar Farm', 1400, 34, range('solar2', 6), [], [-33, 112]),

  // ---------------- The Marina
  b('m_pier', 'marina', 'Wooden Pier', 1800, 28, ['pier'], ['m_bar'], [120, 24]),
  b('m_bar', 'marina', 'Tiki Beach Bar', 2500, 50, ['tikibar'], ['m_dock', 'c_gate'], [112, 0]),
  b('m_dock', 'marina', 'Dock + Wooden Raft', 3200, 15, ['dock'], ['m_boathouse', 'm_buggy'], [130, 12], [{ type: 'vehicle', kind: 'boat', tier: 0 }]),
  b('m_boathouse', 'marina', 'Boathouse', 4200, 65, ['boathouse'], ['m_speedboat', 'm_seafood'], [114, 36]),
  b('m_buggy', 'marina', 'Off-Road Buggy', 5000, 0, [], [], [20, 99], [{ type: 'vehicle', kind: 'car', tier: 1 }]),
  b('m_speedboat', 'marina', 'Speedboat', 6500, 0, [], [], [128, 18], [{ type: 'vehicle', kind: 'boat', tier: 1 }]),
  b('m_seafood', 'marina', 'Seafood Shack', 8500, 120, ['seafood'], ['m_lighthouse'], [106, 47]),
  b('m_lighthouse', 'marina', 'Lighthouse', 11000, 150, ['lighthouse'], ['m_reef'], [100, -60]),
  b('m_reef', 'marina', 'Reef Buoys (2x Treasure)', 13000, 60, range('buoy', 6), [], [132, -4], [{ type: 'treasureBoost' }]),

  // ---------------- Cliffside Mansion
  b('c_gate', 'cliff', 'Cliffside Gate', 15000, 40, ['gate'], ['c_villa1'], [-9, -68]),
  b('c_villa1', 'cliff', 'Ocean Villa', 19000, 200, ['villa_1'], ['c_garden', 'a_runway'], [-10, -74]),
  b('c_garden', 'cliff', 'Tropical Garden', 24000, 140, ['garden'], ['c_villa2'], [6, -78]),
  b('c_villa2', 'cliff', 'Sunset Villa', 30000, 300, ['villa_2'], ['c_pool', 'c_supercar'], [9, -90]),
  b('c_pool', 'cliff', 'Infinity Pool', 37000, 240, ['pool'], ['c_mansion'], [13, -94]),
  b('c_supercar', 'cliff', 'Supercar + Time Trial', 42000, 0, ['trialarch'], [], [26, 99], [{ type: 'vehicle', kind: 'car', tier: 2 }, { type: 'timeTrial' }]),
  b('c_mansion', 'cliff', 'Grand Mansion', 52000, 520, ['mansion'], ['c_yacht', 'c_concierge'], [-6, -90]),
  b('c_yacht', 'cliff', 'Luxury Yacht', 62000, 0, [], [], [126, 0], [{ type: 'vehicle', kind: 'boat', tier: 2 }]),
  b('c_concierge', 'cliff', 'Golden Concierge (x1.5 Income)', 75000, 0, ['concierge'], [], [14, -70], [{ type: 'multiplier', value: 1.5 }]),

  // ---------------- The Airfield
  b('a_runway', 'airfield', 'Runway', 85000, 280, ['runway'], ['a_hangar', 'a_helipad'], [-90, -15]),
  b('a_hangar', 'airfield', 'Hangar', 100000, 420, ['hangar'], ['a_tower'], [-80, -26]),
  b('a_helipad', 'airfield', 'Helipad + Glider', 115000, 150, ['helipad'], ['a_seaplane', 'a_resort'], [-80, 42], [{ type: 'vehicle', kind: 'air', tier: 0 }, { type: 'rings' }]),
  b('a_tower', 'airfield', 'Control Tower', 135000, 650, ['tower'], ['a_atoll'], [-81, 6]),
  b('a_seaplane', 'airfield', 'Seaplane', 155000, 0, [], [], [-80, 26], [{ type: 'vehicle', kind: 'air', tier: 1 }]),
  b('a_resort', 'airfield', 'Sky Resort', 185000, 900, ['resort'], ['a_heli'], [-46, 26]),
  b('a_atoll', 'airfield', 'Atoll Beach Club (x3 Rings)', 220000, 1100, ['atoll_club', 'atoll_pad'], [], [-94, 52], [{ type: 'atoll' }]),
  b('a_heli', 'airfield', 'Private Helicopter', 260000, 0, [], ['a_statue'], [-96, 24], [{ type: 'vehicle', kind: 'air', tier: 2 }]),
  b('a_statue', 'airfield', 'Golden Statue', 350000, 0, ['statue'], [], [0, 78], [{ type: 'win' }]),
];

export const BUTTON_BY_ID = new Map(BUTTONS.map((d) => [d.id, d]));

export const ZONE_NAMES: Record<Zone, string> = {
  beach: 'Starter Beach', marina: 'The Marina', cliff: 'Cliffside Mansion', airfield: 'The Airfield',
};
