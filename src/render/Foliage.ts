// Deterministic instanced vegetation: palms, bushes, rocks, grass tufts. Wind sway lives in the 'leaf' material.
import * as THREE from 'three';
import { materials } from '../world/models/kit';
import { palmBuilders, bushGeometry, rockGeometry, grassGeometry } from '../world/models/props';
import { terrainHeight, roadQuery, ROAD_HALF_WIDTH, ATOLL } from '../world/heights';
import { mulberry32 } from '../world/noise';

export interface Exclusion { x: number; z: number; r: number }

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, items: { x: number; y: number; z: number; rot: number; scale: number }[], shadows = true) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  items.forEach((it, i) => {
    q.setFromAxisAngle(up, it.rot);
    m4.compose(v.set(it.x, it.y, it.z), q, s.setScalar(it.scale));
    mesh.setMatrixAt(i, m4);
  });
  mesh.count = items.length;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}

export class Foliage {
  readonly palms: { x: number; z: number; y: number }[] = [];

  constructor(scene: THREE.Scene, exclusions: Exclusion[]) {
    const rand = mulberry32(42);
    const free = (x: number, z: number, pad = 0) => {
      if (roadQuery(x, z).dist < ROAD_HALF_WIDTH + 2 + pad) return false;
      for (const e of exclusions) if (Math.hypot(x - e.x, z - e.z) < e.r + pad) return false;
      return true;
    };
    const palmItems: { x: number; y: number; z: number; rot: number; scale: number }[] = [];
    const bushItems: typeof palmItems = [];
    const rockItems: typeof palmItems = [];
    const grassItems: typeof palmItems = [];

    let tries = 0;
    while (palmItems.length < 170 && tries++ < 20000) {
      const x = (rand() - 0.5) * 320, z = (rand() - 0.5) * 320;
      const h = terrainHeight(x, z);
      const beach = h > 0.8 && h < 3.2;
      if (!(beach || (h > 3.2 && h < 14 && rand() < 0.25))) continue;
      if (!free(x, z, 1.5)) continue;
      if (palmItems.some((p) => Math.hypot(p.x - x, p.z - z) < 5)) continue;
      palmItems.push({ x, y: h - 0.2, z, rot: rand() * Math.PI * 2, scale: 0.85 + rand() * 0.45 });
    }
    // Palms on the atoll.
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4, r = 10 + rand() * 8;
      const x = ATOLL.x + Math.cos(a) * r, z = ATOLL.z + Math.sin(a) * r;
      if (!free(x, z)) continue;
      palmItems.push({ x, y: terrainHeight(x, z) - 0.2, z, rot: rand() * 6.28, scale: 0.9 + rand() * 0.3 });
    }
    tries = 0;
    while (bushItems.length < 260 && tries++ < 20000) {
      const x = (rand() - 0.5) * 300, z = (rand() - 0.5) * 300;
      const h = terrainHeight(x, z);
      if (h < 2.8 || !free(x, z)) continue;
      bushItems.push({ x, y: h - 0.1, z, rot: rand() * 6.28, scale: 0.6 + rand() * 0.9 });
    }
    tries = 0;
    while (rockItems.length < 120 && tries++ < 20000) {
      const x = (rand() - 0.5) * 330, z = (rand() - 0.5) * 330;
      const h = terrainHeight(x, z);
      const slope = Math.abs(terrainHeight(x + 1, z) - h) + Math.abs(terrainHeight(x, z + 1) - h);
      if (!(slope > 0.6 || (h > -2 && h < 0.6 && rand() < 0.3)) || !free(x, z)) continue;
      rockItems.push({ x, y: h - 0.3, z, rot: rand() * 6.28, scale: 0.5 + rand() * 1.6 });
    }
    tries = 0;
    while (grassItems.length < 1400 && tries++ < 30000) {
      const x = (rand() - 0.5) * 300, z = (rand() - 0.5) * 300;
      const h = terrainHeight(x, z);
      if (h < 3.0 || !free(x, z, -1)) continue;
      grassItems.push({ x, y: h - 0.05, z, rot: rand() * 6.28, scale: 0.7 + rand() * 0.8 });
    }

    const mats = materials();
    const palm = palmBuilders(1);
    scene.add(instanced(palm.trunk.geometry('std'), mats.std, palmItems));
    scene.add(instanced(palm.leaves.geometry('leaf'), mats.leaf, palmItems));
    scene.add(instanced(bushGeometry(), mats.leaf, bushItems));
    scene.add(instanced(rockGeometry(), mats.std, rockItems));
    scene.add(instanced(grassGeometry(), mats.leaf, grassItems, false));
    this.palms = palmItems.map((p) => ({ x: p.x, y: p.y, z: p.z }));
  }
}
