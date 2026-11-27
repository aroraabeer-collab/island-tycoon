// Pure terrain + road height functions. Shared by the terrain mesh, physics, placement,
// water depth texture and tests — so the world is defined in exactly one place.
import { Noise2D, smoothstep, lerp } from './noise';

export const ISLAND_RADIUS = 150;
export const WATER_LEVEL = 0;
export const ATOLL = { x: -330, z: 250, r: 30 };
export const PLATEAU = { x: 0, z: -82, r: 30, slope: 26, height: 17 };
export const AIRFIELD = { x: -100, z: -5, hx: 20, hz: 62, height: 4.2 };
export const BEACH_PLAZA = { x: 0, z: 108, r: 32, height: 1.9 };

const noise = new Noise2D(20261127);

/** Raw island shape before roads are carved in. */
export function baseHeight(x: number, z: number): number {
  const ang = Math.atan2(z, x);
  const wobble =
    1 + 0.11 * noise.noise(Math.cos(ang) * 1.3 + 7, Math.sin(ang) * 1.3 + 7) +
    0.05 * noise.noise(x * 0.018, z * 0.018);
  const d = Math.hypot(x, z) / (ISLAND_RADIUS * wobble);

  // Beach profile: interior ~3m, shoreline ~d=0.94, shelf then deep ocean.
  let h = lerp(-7, 3, smoothstep(1.35, 0.7, d));
  h -= smoothstep(1.3, 2.4, d) * 9;

  // Rolling hills inland.
  const inland = smoothstep(0.85, 0.45, d);
  h += inland * (noise.fbm(x * 0.011 + 3, z * 0.011 - 2, 4) * 7 + 1.5);

  // Cliffside plateau to the north (mansion zone).
  const dp = Math.hypot(x - PLATEAU.x, z - PLATEAU.z);
  const plateau = smoothstep(PLATEAU.r + PLATEAU.slope, PLATEAU.r, dp);
  h = lerp(h, PLATEAU.height + noise.noise(x * 0.05, z * 0.05) * 0.4, plateau);
  // Rugged sea cliffs on the north coast.
  const northCliff = smoothstep(-95, -135, z) * smoothstep(70, 20, Math.abs(x)) * smoothstep(1.02, 0.85, d);
  h += northCliff * (8 + noise.fbm(x * 0.06, z * 0.06, 3) * 4);

  // Flat airfield plateau to the west.
  const ax = Math.abs(x - AIRFIELD.x) - AIRFIELD.hx;
  const az = Math.abs(z - AIRFIELD.z) - AIRFIELD.hz;
  const boxDist = Math.hypot(Math.max(ax, 0), Math.max(az, 0)) + Math.min(Math.max(ax, az), 0);
  h = lerp(h, AIRFIELD.height, smoothstep(14, 0, boxDist));

  // Starter beach plaza: gentle and flat.
  const db = Math.hypot(x - BEACH_PLAZA.x, z - BEACH_PLAZA.z);
  h = lerp(h, BEACH_PLAZA.height, smoothstep(BEACH_PLAZA.r, BEACH_PLAZA.r * 0.45, db) * 0.9);

  // Mini-atoll far out to sea.
  const da = Math.hypot(x - ATOLL.x, z - ATOLL.z);
  const atoll = lerp(-9, 1.6, smoothstep(ATOLL.r + 16, ATOLL.r * 0.55, da)) +
    smoothstep(ATOLL.r * 0.6, 0, da) * 1.8;
  h = Math.max(h, atoll);
  return h;
}

// ---------------------------------------------------------------- roads
/** Closed loop around the island (x, z) — Catmull-Rom control points. */
export const ROAD_POINTS: [number, number][] = [
  [0, 90], [48, 84], [88, 58], [104, 18], [100, -28], [74, -56],
  [36, -62], [0, -58], [-36, -62], [-62, -50], [-70, -20], [-70, 22],
  [-60, 62], [-36, 84],
];
export const ROAD_HALF_WIDTH = 4.2;
const ROAD_BLEND = 7;

export interface RoadSample { x: number; z: number; y: number; dirX: number; dirZ: number }

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function buildRoad(): RoadSample[] {
  const pts = ROAD_POINTS;
  const n = pts.length;
  const raw: { x: number; z: number }[] = [];
  const perSeg = 24;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg;
      raw.push({ x: catmull(p0[0], p1[0], p2[0], p3[0], t), z: catmull(p0[1], p1[1], p2[1], p3[1], t) });
    }
  }
  const hs = raw.map((p) => baseHeight(p.x, p.z));
  // Smooth the vertical profile so the road climbs gently.
  const W = 10;
  const smooth = hs.map((_, i) => {
    let s = 0;
    for (let k = -W; k <= W; k++) s += hs[(i + k + hs.length) % hs.length];
    return Math.max(1.3, s / (2 * W + 1) + 0.15);
  });
  return raw.map((p, i) => {
    const q = raw[(i + 1) % raw.length];
    const len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    return { x: p.x, z: p.z, y: smooth[i], dirX: (q.x - p.x) / len, dirZ: (q.z - p.z) / len };
  });
}

export const ROAD: RoadSample[] = buildRoad();

// Spatial hash of road segments for fast nearest queries.
const CELL = 16;
const grid = new Map<string, number[]>();
for (let i = 0; i < ROAD.length; i++) {
  const a = ROAD[i], b = ROAD[(i + 1) % ROAD.length];
  const minX = Math.floor((Math.min(a.x, b.x) - ROAD_BLEND - ROAD_HALF_WIDTH) / CELL);
  const maxX = Math.floor((Math.max(a.x, b.x) + ROAD_BLEND + ROAD_HALF_WIDTH) / CELL);
  const minZ = Math.floor((Math.min(a.z, b.z) - ROAD_BLEND - ROAD_HALF_WIDTH) / CELL);
  const maxZ = Math.floor((Math.max(a.z, b.z) + ROAD_BLEND + ROAD_HALF_WIDTH) / CELL);
  for (let gx = minX; gx <= maxX; gx++) for (let gz = minZ; gz <= maxZ; gz++) {
    const key = gx + ',' + gz;
    const list = grid.get(key);
    if (list) list.push(i); else grid.set(key, [i]);
  }
}

/** Distance to the road centerline and the road height at the closest point. */
export function roadQuery(x: number, z: number): { dist: number; y: number; index: number } {
  const list = grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
  let best = Infinity, by = 0, bi = -1;
  if (list) for (const i of list) {
    const a = ROAD[i], b = ROAD[(i + 1) % ROAD.length];
    const abx = b.x - a.x, abz = b.z - a.z;
    const l2 = abx * abx + abz * abz || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / l2));
    const px = a.x + abx * t, pz = a.z + abz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; by = lerp(a.y, b.y, t); bi = i; }
  }
  return { dist: best, y: by, index: bi };
}

/** Final ground height including carved roads. */
export function terrainHeight(x: number, z: number): number {
  const h = baseHeight(x, z);
  const r = roadQuery(x, z);
  if (r.index < 0) return h;
  const w = smoothstep(ROAD_HALF_WIDTH + ROAD_BLEND, ROAD_HALF_WIDTH + 0.5, r.dist);
  return lerp(h, r.y - 0.08, w);
}

/** Water depth at a point (positive = underwater). */
export const waterDepth = (x: number, z: number) => WATER_LEVEL - baseHeight(x, z);
