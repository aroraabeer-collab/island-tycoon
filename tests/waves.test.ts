import { describe, it, expect } from 'vitest';
import { waveHeight, wavesGLSL, WAVE_PARAMS } from '../src/render/waves';
import { terrainHeight, baseHeight, ROAD, ATOLL } from '../src/world/heights';

describe('waves', () => {
  it('is deterministic and bounded by the sum of amplitudes', () => {
    const max = WAVE_PARAMS.reduce((s, w) => s + w.a, 0);
    for (let i = 0; i < 200; i++) {
      const x = i * 7.3 - 500, z = i * 3.1 - 300, t = i * 0.37;
      const h = waveHeight(x, z, t);
      expect(h).toBe(waveHeight(x, z, t));
      expect(Math.abs(h)).toBeLessThanOrEqual(max + 1e-9);
    }
    expect(max).toBeLessThan(1.2);
  });

  it('emits GLSL with one gerstner call per wave', () => {
    expect(wavesGLSL().match(/gerstner\(vec2\(/g)?.length).toBe(WAVE_PARAMS.length);
  });
});

describe('terrain', () => {
  it('has an island in the middle, ocean around and an atoll', () => {
    expect(baseHeight(0, 0)).toBeGreaterThan(2);
    expect(baseHeight(300, 0)).toBeLessThan(-5);
    expect(baseHeight(ATOLL.x, ATOLL.z)).toBeGreaterThan(1);
  });

  it('keeps the whole road above water', () => {
    for (const s of ROAD) {
      expect(s.y).toBeGreaterThan(1);
      expect(Math.abs(terrainHeight(s.x, s.z) - (s.y - 0.08))).toBeLessThan(0.05);
    }
  });
});
