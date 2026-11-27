// PBR material library built on Poly Haven texture sets (diff / nor_gl / arm = AO, roughness, metal).
// Geometry is expected to carry UVs in meters (see uvBox / worldUV), so `tile` = texture size in meters.
import * as THREE from 'three';
import { assets } from './AssetLoader';
import { TEXTURES, type TextureId } from './manifest';

export interface PbrOpts {
  /** Meters covered by one texture repeat (UVs are in meters). */
  tile?: number;
  tint?: number;
  roughness?: number;
  metalness?: number;
  normalScale?: number;
  side?: THREE.Side;
  envMapIntensity?: number;
}

const cache = new Map<string, THREE.MeshStandardMaterial>();

function tex(path: string, color: boolean, repeat: number): THREE.Texture {
  const base = assets.texture(path, color);
  if (repeat === 1) return base;
  const t = base.clone(); // shares the image Source -> uploaded to the GPU once
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  return t;
}

/** Cached PBR material for a texture set. */
export function pbr(id: TextureId, o: PbrOpts = {}): THREE.MeshStandardMaterial {
  const key = `${id}|${JSON.stringify(o)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const set = TEXTURES[id] as { diff: string; nor?: string; arm?: string };
  const repeat = 1 / (o.tile ?? 2);
  const m = new THREE.MeshStandardMaterial({
    map: tex(set.diff, true, repeat),
    color: o.tint ?? 0xffffff,
    roughness: o.roughness ?? 1,
    metalness: o.metalness ?? 0,
    side: o.side ?? THREE.FrontSide,
    envMapIntensity: o.envMapIntensity ?? 1,
  });
  if (set.nor) {
    m.normalMap = tex(set.nor, false, repeat);
    m.normalScale.setScalar(o.normalScale ?? 1);
  }
  if (set.arm) {
    const arm = tex(set.arm, false, repeat);
    m.roughnessMap = arm;
    m.aoMap = arm;
    m.aoMapIntensity = 0.8;
    if (o.metalness) m.metalnessMap = arm;
  }
  m.name = id;
  cache.set(key, m);
  return m;
}

/** Plain PBR material without textures (painted metal, glass, plastic, car paint...). */
export function solid(color: number, roughness = 0.6, metalness = 0, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  const key = `solid|${color}|${roughness}|${metalness}|${JSON.stringify(extra)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshPhysicalMaterial({ color, roughness, metalness, ...extra });
  cache.set(key, m);
  return m;
}

export const glass = () => solid(0xcfe8f5, 0.05, 0, { transparent: true, opacity: 0.28, envMapIntensity: 1.5, depthWrite: false });

/**
 * Rewrite a BoxGeometry's UVs so 1 UV unit = 1 meter on every face (pair with pbr({tile})).
 * BoxGeometry face order: +x, -x, +y, -y, +z, -z; 4 vertices per face.
 */
export function uvBox(geo: THREE.BufferGeometry, w: number, h: number, d: number): THREE.BufferGeometry {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Planar world-space UVs (x,z in meters) — for floors, decks, roads. */
export function worldUV(geo: THREE.BufferGeometry, axis: 'xz' | 'xy' | 'zy' = 'xz'): THREE.BufferGeometry {
  const p = geo.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const a = axis === 'zy' ? p.getZ(i) : p.getX(i);
    const b = axis === 'xz' ? p.getZ(i) : p.getY(i);
    uv[i * 2] = a; uv[i * 2 + 1] = b;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Box mesh with meter UVs and a material. */
export function pbrBox(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(uvBox(new THREE.BoxGeometry(w, h, d), w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
