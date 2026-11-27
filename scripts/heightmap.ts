// Dev tool: renders a top-down map of the island to a PPM image for layout work.
import { writeFileSync } from 'node:fs';
import { terrainHeight, roadQuery, ROAD_HALF_WIDTH } from '../src/world/heights';

const out = process.argv[2] ?? 'map.ppm';
const N = 600, MIN = -420, SIZE = 840;
const buf: number[] = [];
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const x = MIN + (i / N) * SIZE, z = MIN + (j / N) * SIZE;
  const h = terrainHeight(x, z);
  let c: number[];
  if (h < 0) { const d = Math.min(1, -h / 12); c = [40 * (1 - d), 200 - 140 * d, 220 - 80 * d]; }
  else if (h < 2.5) c = [235, 215, 160];
  else { const t = Math.min(1, h / 25); c = [80 + 120 * t, 160 - 40 * t, 70 + 60 * t]; }
  if (h > 0 && roadQuery(x, z).dist < ROAD_HALF_WIDTH) c = [60, 60, 66];
  if (Math.abs(x % 50) < 0.7 || Math.abs(z % 50) < 0.7) c = c.map((v) => v * 0.6);
  buf.push(...c.map((v) => Math.max(0, Math.min(255, v | 0))));
}
writeFileSync(out, Buffer.concat([Buffer.from(`P6 ${N} ${N} 255\n`), Buffer.from(buf)]));
console.log('wrote', out);
