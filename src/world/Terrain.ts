// Terrain + road meshes built from the pure height functions. Also exports trimesh data for physics.
import * as THREE from 'three';
import { terrainHeight, ROAD, ROAD_HALF_WIDTH, ATOLL } from './heights';
import { Noise2D, smoothstep } from './noise';

export interface TrimeshData { vertices: Float32Array; indices: Uint32Array }

const tint = new Noise2D(99);
const cA = new THREE.Color(), cB = new THREE.Color(), out = new THREE.Color();
const COL = {
  deep: new THREE.Color(0x3f8f8a), wetSand: new THREE.Color(0xd2b77c), sand: new THREE.Color(0xf0dca8),
  grassA: new THREE.Color(0x8cc63f), grassB: new THREE.Color(0x4f9a3a), forest: new THREE.Color(0x3d7f35),
  rock: new THREE.Color(0x9a8f80), cliff: new THREE.Color(0x7d7468), dirt: new THREE.Color(0xb59466),
};

function groundColor(x: number, z: number, h: number, slope: number): THREE.Color {
  const n = tint.noise(x * 0.05, z * 0.05) * 0.5 + 0.5;
  if (h < 0.4) {
    out.copy(COL.wetSand).lerp(COL.deep, smoothstep(0.4, -9, h));
  } else if (h < 2.6 && (Math.hypot(x, z) > 108 || Math.hypot(x - ATOLL.x, z - ATOLL.z) < 60)) {
    out.copy(COL.wetSand).lerp(COL.sand, smoothstep(0.4, 1.2, h));
  } else {
    cA.copy(COL.grassA).lerp(COL.grassB, n);
    cB.copy(cA).lerp(COL.forest, smoothstep(8, 18, h) * 0.6);
    const coastal = Math.hypot(x, z) > 108 ? 1 : 0;
    out.copy(COL.sand).lerp(cB, coastal ? smoothstep(2.6, 3.4, h) : 1);
    if (n > 0.82) out.lerp(COL.dirt, (n - 0.82) * 3);
  }
  const rockiness = smoothstep(0.55, 0.9, slope);
  if (rockiness > 0) out.lerp(h > 10 ? COL.cliff : COL.rock, rockiness);
  return out;
}

function buildPatch(cx: number, cz: number, size: number, segs: number): { mesh: THREE.Mesh; tri: TrimeshData } {
  const n = segs + 1;
  const pos = new Float32Array(n * n * 3);
  const col = new Float32Array(n * n * 3);
  const step = size / segs;
  const hs = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = cx - size / 2 + i * step, z = cz - size / 2 + j * step;
    hs[j * n + i] = terrainHeight(x, z);
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i;
    const x = cx - size / 2 + i * step, z = cz - size / 2 + j * step;
    const h = hs[k];
    const hx = hs[j * n + Math.min(n - 1, i + 1)] - hs[j * n + Math.max(0, i - 1)];
    const hz = hs[Math.min(n - 1, j + 1) * n + i] - hs[Math.max(0, j - 1) * n + i];
    const slope = Math.hypot(hx, hz) / (2 * step);
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    const c = groundColor(x, z, h, slope);
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  const idx = new Uint32Array(segs * segs * 6);
  let p = 0;
  for (let j = 0; j < segs; j++) for (let i = 0; i < segs; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    idx[p++] = a; idx[p++] = c; idx[p++] = b;
    idx[p++] = b; idx[p++] = c; idx[p++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false; // big mesh; self-shadowing the hills isn't worth a second pass
  return { mesh, tri: { vertices: pos, indices: idx } };
}

function buildRoadMesh(): THREE.Mesh {
  const lanes = [-ROAD_HALF_WIDTH, -ROAD_HALF_WIDTH + 0.35, ROAD_HALF_WIDTH - 0.35, ROAD_HALF_WIDTH];
  const laneCol = [0xf2f2f2, 0x45464d, 0x45464d, 0xf2f2f2].map((c) => new THREE.Color(c));
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const N = ROAD.length;
  for (let i = 0; i <= N; i++) {
    const s = ROAD[i % N];
    const nx = -s.dirZ, nz = s.dirX;
    lanes.forEach((off, l) => {
      pos.push(s.x + nx * off, s.y + 0.03, s.z + nz * off);
      const c = laneCol[l];
      col.push(c.r, c.g, c.b);
    });
    if (i < N) {
      const a = i * 4, b = (i + 1) * 4;
      for (let l = 0; l < 3; l++) idx.push(a + l, a + l + 1, b + l, a + l + 1, b + l + 1, b + l);
    }
  }
  // Center dashes.
  for (let i = 0; i < N; i += 3) {
    const s = ROAD[i], e = ROAD[(i + 1) % N];
    const nx = -s.dirZ * 0.12, nz = s.dirX * 0.12;
    const base = pos.length / 3;
    pos.push(s.x - nx, s.y + 0.05, s.z - nz, s.x + nx, s.y + 0.05, s.z + nz, e.x - nx, e.y + 0.05, e.z - nz, e.x + nx, e.y + 0.05, e.z + nz);
    for (let k = 0; k < 4; k++) col.push(1, 0.8, 0.25);
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

export class Terrain {
  readonly group = new THREE.Group();
  readonly trimeshes: TrimeshData[] = [];

  constructor(scene: THREE.Scene) {
    const main = buildPatch(0, 0, 440, 300);
    const atoll = buildPatch(ATOLL.x, ATOLL.z, 120, 70);
    this.group.add(main.mesh, atoll.mesh, buildRoadMesh());
    this.trimeshes.push(main.tri, atoll.tri);

    const seabed = new THREE.Mesh(
      new THREE.PlaneGeometry(14000, 14000).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x1d5f7a, roughness: 1 }),
    );
    seabed.position.y = -17;
    this.group.add(seabed);
    scene.add(this.group);
  }
}
