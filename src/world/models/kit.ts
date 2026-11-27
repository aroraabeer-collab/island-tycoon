// Procedural low-poly model kit. Each model is assembled from primitives with per-vertex
// colors, then merged per material kind -> ~1-3 draw calls per model.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const globalUniforms = { uTime: { value: 0 } };

export const C = {
  sand: 0xe8d3a0, wood: 0x9c6b3f, darkWood: 0x6b4426, bamboo: 0xc9a85a, thatch: 0xd6ad5e,
  white: 0xf4f1ea, cream: 0xefe3c8, teal: 0x2fb5a8, coral: 0xff7b5c, red: 0xe04848,
  yellow: 0xffcc3d, navy: 0x24325a, glass: 0x9fd8ff, green: 0x4caf50, leaf: 0x3f9d4a,
  darkLeaf: 0x2e7d3a, stone: 0x9a9a92, darkStone: 0x6d6d68, asphalt: 0x3a3a40, metal: 0xb8c0c8,
  black: 0x22252a, gold: 0xffc83d, solar: 0x1d3b6e, pink: 0xff8fb1, orange: 0xff9f43,
  sky: 0x5ec8ff, lime: 0x9be15d, purple: 0x8e6cff, cash: 0x5fd068, rubber: 0x1b1b1f,
} as const;

export type MatKind = 'std' | 'metal' | 'glass' | 'glow' | 'gold' | 'leaf';

function swayPatch(mat: THREE.Material) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = globalUniforms.uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec3 swayOrigin = modelMatrix[3].xyz;
      #ifdef USE_INSTANCING
        swayOrigin += instanceMatrix[3].xyz;
      #endif
      float swayH = max(position.y, 0.0);
      float swayPhase = swayOrigin.x * 0.21 + swayOrigin.z * 0.17;
      transformed.x += sin(uTime * 1.6 + swayPhase) * 0.012 * swayH * swayH;
      transformed.z += cos(uTime * 1.3 + swayPhase) * 0.008 * swayH * swayH;`,
    );
  };
}

let MATS: Record<MatKind, THREE.Material> | null = null;
export function materials(): Record<MatKind, THREE.Material> {
  if (MATS) return MATS;
  const leaf = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true, side: THREE.DoubleSide });
  swayPatch(leaf);
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  glow.color.setScalar(16);
  MATS = {
    std: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, flatShading: true }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.65, flatShading: true }),
    glass: new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55,
      envMapIntensity: 1.6, clearcoat: 1,
    }),
    glow,
    gold: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 1, envMapIntensity: 1.4 }),
    leaf,
  };
  return MATS;
}

export interface PartOpts {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number] | number;
  mat?: MatKind;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();

export class Builder {
  private parts = new Map<MatKind, THREE.BufferGeometry[]>();

  add(geo: THREE.BufferGeometry, color: number, o: PartOpts = {}): this {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    const s = o.scale ?? 1;
    tmpS.set(...(typeof s === 'number' ? ([s, s, s] as [number, number, number]) : s));
    tmpQ.setFromEuler(tmpE.set(...(o.rot ?? [0, 0, 0])));
    tmpM.compose(tmpV.set(...(o.pos ?? [0, 0, 0])), tmpQ, tmpS);
    g.applyMatrix4(tmpM);
    tmpC.setHex(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const kind = o.mat ?? 'std';
    const list = this.parts.get(kind);
    if (list) list.push(g); else this.parts.set(kind, [g]);
    return this;
  }

  box(w: number, h: number, d: number, color: number, o: PartOpts = {}) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, o);
  }
  cyl(rt: number, rb: number, h: number, color: number, o: PartOpts = {}, seg = 10) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, o);
  }
  cone(r: number, h: number, color: number, o: PartOpts = {}, seg = 8) {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, o);
  }
  ball(r: number, color: number, o: PartOpts = {}, detail = 1) {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, o);
  }
  torus(r: number, tube: number, color: number, o: PartOpts = {}, seg = 24) {
    return this.add(new THREE.TorusGeometry(r, tube, 6, seg), color, o);
  }

  /** Merge into one geometry per material kind. */
  build(shadows = true): THREE.Group {
    const group = new THREE.Group();
    const mats = materials();
    for (const [kind, geos] of this.parts) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mats[kind]);
      mesh.castShadow = shadows && kind !== 'glow' && kind !== 'glass';
      mesh.receiveShadow = kind !== 'glow';
      mesh.name = kind;
      group.add(mesh);
      geos.forEach((g) => g.dispose());
    }
    return group;
  }

  /** Single merged geometry for one material (used for instancing). */
  geometry(kind: MatKind = 'std'): THREE.BufferGeometry {
    return mergeGeometries(this.parts.get(kind) ?? [], false)!;
  }
}

/** Ring of N items around a center (handy for fences, petals, wheels). */
export function around(n: number, fn: (angle: number, i: number) => void) {
  for (let i = 0; i < n; i++) fn((i / n) * Math.PI * 2, i);
}
