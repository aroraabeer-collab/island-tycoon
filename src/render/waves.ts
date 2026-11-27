// Gerstner wave definition shared by the water shader (GPU) and buoyancy (CPU),
// so boats ride exactly the waves the player sees.

export interface Wave { dirX: number; dirZ: number; steepness: number; wavelength: number }

export const WAVES: Wave[] = [
  { dirX: 1.0, dirZ: 0.35, steepness: 0.09, wavelength: 34 },
  { dirX: -0.45, dirZ: 1.0, steepness: 0.08, wavelength: 23 },
  { dirX: 0.75, dirZ: -0.6, steepness: 0.06, wavelength: 17 },
];

const G = 9.8;

/** Pre-normalized params: [dirX, dirZ, k, a] and phase speed. */
export const WAVE_PARAMS = WAVES.map((w) => {
  const len = Math.hypot(w.dirX, w.dirZ);
  const k = (2 * Math.PI) / w.wavelength;
  return { dx: w.dirX / len, dz: w.dirZ / len, k, a: w.steepness / k, c: Math.sqrt(G / k), steep: w.steepness };
});

/** Waves calm down in very shallow water so they don't clip through beaches. */
export function shoreDamping(depth: number): number {
  return Math.min(1, Math.max(0.15, depth / 4));
}

/** Water surface height at world (x, z) and time t. Ignores horizontal drift (fine for buoyancy). */
export function waveHeight(x: number, z: number, t: number, damping = 1): number {
  let y = 0;
  for (const w of WAVE_PARAMS) {
    const f = w.k * (w.dx * x + w.dz * z - w.c * t);
    y += w.a * Math.sin(f);
  }
  return y * damping;
}

/** GLSL source mirroring waveHeight + analytic normal. Uniform: uTime. */
export function wavesGLSL(): string {
  const lines = WAVE_PARAMS.map(
    (w) => `  gerstner(vec2(${w.dx.toFixed(5)}, ${w.dz.toFixed(5)}), ${w.k.toFixed(5)}, ${w.a.toFixed(5)}, ${w.c.toFixed(5)}, ${w.steep.toFixed(5)}, p, damp, disp, tangent, binormal);`,
  );
  return /* glsl */ `
uniform float uTime;
void gerstner(vec2 d, float k, float a, float c, float steep, vec2 p, float damp,
              inout vec3 disp, inout vec3 tangent, inout vec3 binormal) {
  float f = k * (dot(d, p) - c * uTime);
  float s = sin(f), co = cos(f);
  a *= damp; steep *= damp;
  disp += vec3(d.x * a * co, a * s, d.y * a * co);
  tangent += vec3(-d.x * d.x * steep * s, d.x * steep * co, -d.x * d.y * steep * s);
  binormal += vec3(-d.x * d.y * steep * s, d.y * steep * co, -d.y * d.y * steep * s);
}
vec3 waveDisplace(vec2 p, float damp, out vec3 nrm) {
  vec3 disp = vec3(0.0);
  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);
${lines.join('\n')}
  nrm = normalize(cross(binormal, tangent));
  return disp;
}
`;
}
