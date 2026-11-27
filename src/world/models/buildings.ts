// Procedural low-poly buildings. Origin = ground center, front faces +Z.
import * as THREE from 'three';
import { Builder, C, around } from './kit';

const H = Math.PI / 2;

export function cashDropper() {
  const b = new Builder();
  b.box(3, 0.4, 3, C.darkStone, { pos: [0, 0.2, 0] });
  b.box(2.2, 2.6, 2.2, C.yellow, { pos: [0, 1.7, 0], mat: 'metal' });
  b.box(2.4, 0.3, 2.4, C.black, { pos: [0, 3.1, 0] });
  b.cone(1.2, 1.2, C.yellow, { pos: [0, 3.9, 0], rot: [0, Math.PI / 4, 0] }, 4);
  b.cyl(0.5, 0.5, 0.4, C.cash, { pos: [0, 1.6, 1.12], rot: [H, 0, 0], mat: 'glow' }, 12);
  b.box(0.9, 0.5, 0.2, C.black, { pos: [0, 0.75, 1.1] });
  // conveyor towards +X
  b.box(6, 0.35, 1.4, C.black, { pos: [4, 0.55, 0] });
  for (let i = 0; i < 6; i++) b.box(0.15, 0.4, 1.5, C.metal, { pos: [1.5 + i, 0.55, 0], mat: 'metal' });
  return b.build();
}

export function collector() {
  const b = new Builder();
  b.cyl(2.6, 2.9, 0.5, C.darkStone, { pos: [0, 0.25, 0] }, 16);
  b.cyl(2.0, 2.3, 2.2, C.teal, { pos: [0, 1.6, 0], mat: 'metal' }, 16);
  b.torus(2.05, 0.15, C.gold, { pos: [0, 2.7, 0], rot: [H, 0, 0], mat: 'gold' });
  b.cyl(1.7, 1.7, 0.2, 0x3fa055, { pos: [0, 2.72, 0], mat: 'glow' }, 16);
  b.box(1.6, 0.9, 0.2, C.black, { pos: [0, 1.6, 2.2] });
  return b.build();
}

export function solarPanel() {
  const b = new Builder();
  b.cyl(0.08, 0.08, 1.4, C.metal, { pos: [0, 0.7, 0], mat: 'metal' }, 6);
  b.box(2.6, 0.08, 1.6, C.metal, { pos: [0, 1.45, 0], rot: [-0.5, 0, 0], mat: 'metal' });
  b.box(2.4, 0.1, 1.4, C.solar, { pos: [0, 1.5, 0.02], rot: [-0.5, 0, 0], mat: 'glass' });
  return b.build();
}

export function bambooShack() {
  const b = new Builder();
  b.box(5, 0.4, 4.4, C.darkWood, { pos: [0, 0.6, 0] });
  around(4, (_, i) => b.cyl(0.16, 0.16, 1.2, C.darkWood, { pos: [i % 2 ? 2.2 : -2.2, 0.2, i < 2 ? 1.9 : -1.9] }, 6));
  for (let i = 0; i < 11; i++) b.cyl(0.18, 0.18, 2.6, C.bamboo, { pos: [-2.1 + i * 0.42, 2.1, -1.8] }, 6);
  for (let i = 0; i < 10; i++) {
    b.cyl(0.18, 0.18, 2.6, C.bamboo, { pos: [-2.1, 2.1, -1.5 + i * 0.35] }, 6);
    b.cyl(0.18, 0.18, 2.6, C.bamboo, { pos: [2.1, 2.1, -1.5 + i * 0.35] }, 6);
  }
  b.box(1.0, 1.9, 0.2, C.darkWood, { pos: [0, 1.75, 1.9] });
  b.box(1.4, 2.4, 0.3, C.bamboo, { pos: [-1.4, 2.0, 1.9] });
  b.box(1.4, 2.4, 0.3, C.bamboo, { pos: [1.4, 2.0, 1.9] });
  b.cone(4.1, 2.2, C.thatch, { pos: [0, 4.4, 0], rot: [0, Math.PI / 4, 0] }, 4);
  return b.build();
}

export function beachHut() {
  const b = new Builder();
  b.box(3.6, 2.4, 3.2, C.white, { pos: [0, 1.2, 0] });
  b.box(1, 1.8, 0.1, C.teal, { pos: [0, 0.9, 1.62] });
  b.box(0.8, 0.8, 0.1, C.sky, { pos: [1.1, 1.5, 1.62], mat: 'glass' });
  b.cone(3.0, 1.6, C.coral, { pos: [0, 3.2, 0], rot: [0, Math.PI / 4, 0] }, 4);
  b.box(4.2, 0.15, 1.4, C.wood, { pos: [0, 0.1, 2.3] });
  return b.build();
}

export function pier(length = 22) {
  const b = new Builder();
  b.box(3.2, 0.3, length, C.wood, { pos: [0, 1.0, length / 2] });
  for (let z = 1; z < length; z += 3.5) {
    b.cyl(0.2, 0.2, 5, C.darkWood, { pos: [-1.5, -1.3, z] }, 6);
    b.cyl(0.2, 0.2, 5, C.darkWood, { pos: [1.5, -1.3, z] }, 6);
    b.cyl(0.08, 0.08, 1.0, C.darkWood, { pos: [-1.5, 1.6, z] }, 5);
    b.cyl(0.08, 0.08, 1.0, C.darkWood, { pos: [1.5, 1.6, z] }, 5);
  }
  b.box(0.1, 0.1, length, C.darkWood, { pos: [-1.5, 2.05, length / 2] });
  b.box(0.1, 0.1, length, C.darkWood, { pos: [1.5, 2.05, length / 2] });
  return b.build();
}

export function tikiBar() {
  const b = new Builder();
  b.box(7, 0.3, 6, C.wood, { pos: [0, 0.15, 0] });
  b.box(5, 1.2, 1.0, C.bamboo, { pos: [0, 0.9, 1.4] });
  b.box(5.4, 0.15, 1.3, C.darkWood, { pos: [0, 1.55, 1.4] });
  around(4, (_, i) => b.cyl(0.18, 0.2, 3.4, C.darkWood, { pos: [i % 2 ? 2.8 : -2.8, 1.9, i < 2 ? 2.4 : -2.4] }, 6));
  b.cone(5.4, 2.6, C.thatch, { pos: [0, 4.8, 0], rot: [0, Math.PI / 4, 0] }, 4);
  for (let i = 0; i < 4; i++) {
    b.cyl(0.3, 0.3, 0.1, C.coral, { pos: [-1.8 + i * 1.2, 1.0, 2.6] }, 8);
    b.cyl(0.05, 0.05, 0.9, C.metal, { pos: [-1.8 + i * 1.2, 0.55, 2.6] }, 5);
  }
  around(5, (a, i) => b.ball(0.2, [C.red, C.yellow, C.lime, C.orange, C.pink][i], { pos: [Math.cos(a) * 2.4, 3.4, Math.sin(a) * 2.2], mat: 'glow' }, 0));
  return b.build();
}

export function dock() {
  const b = new Builder();
  b.box(10, 0.4, 8, C.wood, { pos: [0, 1.0, 0] });
  for (let x = -4.5; x <= 4.5; x += 3) for (let z = -3.5; z <= 3.5; z += 3.5) b.cyl(0.25, 0.25, 5, C.darkWood, { pos: [x, -1.4, z] }, 6);
  b.cyl(0.25, 0.3, 1, C.black, { pos: [4.6, 1.6, 3.6] }, 8);
  b.cyl(0.25, 0.3, 1, C.black, { pos: [4.6, 1.6, -3.6] }, 8);
  b.box(2, 1.2, 2, C.navy, { pos: [-3.5, 1.8, -2.5] });
  b.box(2.2, 0.15, 2.2, C.white, { pos: [-3.5, 2.5, -2.5] });
  return b.build();
}

export function boathouse() {
  const b = new Builder();
  b.box(8, 4.4, 9, C.teal, { pos: [0, 2.2, 0] });
  b.box(5, 3.4, 0.2, C.darkWood, { pos: [0, 1.7, 4.55] });
  b.box(8.6, 0.25, 9.6, C.white, { pos: [0, 4.5, 0] });
  b.add(new THREE.CylinderGeometry(5.2, 5.2, 9.6, 3, 1, false), C.navy, { pos: [0, 5.3, 0], rot: [H, 0, 0], scale: [1, 1, 0.5] });
  b.box(1.2, 1, 0.1, C.sky, { pos: [-3, 3, 4.55], mat: 'glass' });
  b.box(1.2, 1, 0.1, C.sky, { pos: [3, 3, 4.55], mat: 'glass' });
  return b.build();
}

export function lighthouse() {
  const b = new Builder();
  b.cyl(3, 3.4, 1.2, C.darkStone, { pos: [0, 0.6, 0] }, 10);
  for (let i = 0; i < 5; i++) b.cyl(1.9 - i * 0.18, 2.1 - i * 0.18, 3, i % 2 ? C.red : C.white, { pos: [0, 2.7 + i * 3, 0] }, 12);
  b.cyl(1.5, 1.5, 0.3, C.black, { pos: [0, 16.8, 0] }, 12);
  b.cyl(1.0, 1.0, 1.8, C.yellow, { pos: [0, 17.9, 0], mat: 'glow' }, 10);
  b.cone(1.4, 1.4, C.red, { pos: [0, 19.5, 0] }, 12);
  b.torus(1.6, 0.08, C.black, { pos: [0, 17.1, 0], rot: [H, 0, 0] });
  return b.build();
}

export function seafoodShack() {
  const b = new Builder();
  b.box(6, 3, 4.5, C.sky, { pos: [0, 1.5, 0] });
  b.box(6.6, 0.3, 5.4, C.white, { pos: [0, 3.15, 0.2] });
  b.box(4.2, 0.9, 0.1, C.coral, { pos: [0, 3.8, 2.4] });
  b.box(3.5, 1.2, 0.1, C.glass, { pos: [0, 1.7, 2.27], mat: 'glass' });
  for (let i = 0; i < 6; i++) b.box(1.1, 0.15, 1.6, i % 2 ? C.white : C.red, { pos: [-2.75 + i * 1.1, 2.6, 3.1], rot: [0.35, 0, 0] });
  b.cyl(0.6, 0.6, 0.08, C.white, { pos: [-1.5, 0.9, 5], }, 10);
  b.cyl(0.6, 0.6, 0.08, C.white, { pos: [1.5, 0.9, 5] }, 10);
  b.cyl(0.06, 0.06, 2.6, C.metal, { pos: [-1.5, 1.3, 5] }, 5);
  b.cone(1.4, 0.6, C.yellow, { pos: [-1.5, 2.7, 5] }, 8);
  return b.build();
}

export function buoy(color: number = C.red) {
  const b = new Builder();
  b.cyl(0.5, 0.7, 1.0, color, { pos: [0, 0, 0] }, 8);
  b.cyl(0.12, 0.12, 1.2, C.white, { pos: [0, 1.0, 0] }, 6);
  b.ball(0.22, C.yellow, { pos: [0, 1.7, 0], mat: 'glow' }, 0);
  return b.build();
}

export function cliffGate() {
  const b = new Builder();
  b.box(1.2, 5, 1.2, C.white, { pos: [-4.5, 2.5, 0] });
  b.box(1.2, 5, 1.2, C.white, { pos: [4.5, 2.5, 0] });
  b.box(10.4, 0.8, 1.4, C.white, { pos: [0, 5.2, 0] });
  b.box(5, 0.6, 0.3, C.gold, { pos: [0, 5.2, 0.75], mat: 'gold' });
  b.cone(0.5, 1.2, C.darkLeaf, { pos: [-4.5, 6.2, 0] }, 6);
  b.cone(0.5, 1.2, C.darkLeaf, { pos: [4.5, 6.2, 0] }, 6);
  return b.build();
}

export function villa(variant = 0) {
  const b = new Builder();
  const wall = [C.white, C.cream, C.white][variant % 3];
  const accent = [C.teal, C.coral, C.navy][variant % 3];
  b.box(12, 0.5, 10, C.stone, { pos: [0, 0.25, 0] });
  b.box(9, 3.4, 7, wall, { pos: [-1, 2.2, -0.5] });
  b.box(8.6, 2.6, 0.1, C.glass, { pos: [-1, 2.1, 3.02], mat: 'glass' });
  b.box(9.8, 0.35, 8, accent, { pos: [-1, 4.05, -0.3] });
  b.box(6, 3, 5.6, wall, { pos: [1.5, 5.7, -1.2] });
  b.box(5.8, 2.2, 0.1, C.glass, { pos: [1.5, 5.6, 1.62], mat: 'glass' });
  b.box(6.8, 0.3, 6.4, accent, { pos: [1.5, 7.35, -1.0] });
  b.box(4, 0.25, 3, C.wood, { pos: [-3, 4.3, 2.4] });
  b.box(4, 0.8, 0.08, C.glass, { pos: [-3, 4.8, 3.9], mat: 'glass' });
  b.box(4.2, 0.12, 2.2, C.sky, { pos: [3.6, 0.55, 3.6], mat: 'glass' });
  return b.build();
}

export function mansion() {
  const b = new Builder();
  b.box(22, 0.6, 15, C.stone, { pos: [0, 0.3, 0] });
  b.box(16, 4, 10, C.white, { pos: [0, 2.6, -1.5] });
  b.box(15.6, 3, 0.1, C.glass, { pos: [0, 2.6, 3.55], mat: 'glass' });
  b.box(17, 0.4, 11, C.gold, { pos: [0, 4.8, -1.2], mat: 'gold' });
  b.box(11, 3.6, 7.5, C.white, { pos: [0, 6.8, -2.2] });
  b.box(10.6, 2.8, 0.1, C.glass, { pos: [0, 6.8, 1.6], mat: 'glass' });
  b.box(12, 0.4, 8.5, C.gold, { pos: [0, 8.8, -2.0], mat: 'gold' });
  b.box(5, 2.6, 4, C.white, { pos: [0, 10.3, -3] });
  b.box(5.4, 0.3, 4.4, C.navy, { pos: [0, 11.75, -3] });
  for (let i = -3; i <= 3; i++) b.cyl(0.3, 0.3, 4, C.white, { pos: [i * 2.4, 2.6, 4.5] }, 8);
  b.box(18, 0.3, 2.6, C.white, { pos: [0, 4.75, 4.6] });
  return b.build();
}

export function garden() {
  const b = new Builder();
  b.cyl(5, 5.2, 0.3, C.green, { pos: [0, 0.15, 0] }, 14);
  b.cyl(1.2, 1.4, 0.8, C.stone, { pos: [0, 0.5, 0] }, 10);
  b.cyl(0.9, 0.9, 0.1, C.sky, { pos: [0, 0.92, 0], mat: 'glass' }, 10);
  b.cyl(0.2, 0.3, 1.4, C.stone, { pos: [0, 1.3, 0] }, 6);
  around(10, (a, i) => {
    const r = 3.6;
    b.ball(0.7, C.darkLeaf, { pos: [Math.cos(a) * r, 0.7, Math.sin(a) * r], mat: 'leaf' }, 0);
    b.ball(0.25, [C.pink, C.yellow, C.coral, C.purple][i % 4], { pos: [Math.cos(a) * r, 1.4, Math.sin(a) * r], mat: 'glow' }, 0);
  });
  return b.build();
}

export function infinityPool() {
  const b = new Builder();
  b.box(14, 0.8, 8, C.white, { pos: [0, 0.4, 0] });
  b.box(13, 0.2, 7, C.sky, { pos: [0, 0.75, 0], mat: 'glass' });
  b.box(13, 0.4, 6.8, C.teal, { pos: [0, 0.55, 0] });
  for (let i = 0; i < 4; i++) {
    b.box(0.8, 0.25, 2, C.white, { pos: [-4.5 + i * 3, 0.95, 5] });
    b.box(0.8, 0.5, 0.6, C.white, { pos: [-4.5 + i * 3, 1.15, 5.8], rot: [-0.6, 0, 0] });
  }
  b.cyl(0.06, 0.06, 2.6, C.metal, { pos: [6, 2.1, 5] }, 5);
  b.cone(1.6, 0.7, C.coral, { pos: [6, 3.4, 5] }, 8);
  return b.build();
}

export function concierge() {
  const b = new Builder();
  b.box(3, 1.2, 1.4, C.white, { pos: [0, 0.6, 0] });
  b.box(3.2, 0.12, 1.6, C.gold, { pos: [0, 1.26, 0], mat: 'gold' });
  b.add(new THREE.SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), C.gold, { pos: [0, 1.32, 0], mat: 'gold' });
  b.ball(0.08, C.gold, { pos: [0, 1.78, 0], mat: 'gold' }, 0);
  b.cyl(2.2, 2.2, 0.12, C.red, { pos: [0, 0.06, 1.6] }, 16);
  return b.build();
}

export function runway() {
  const b = new Builder();
  b.box(16, 0.2, 110, C.asphalt, { pos: [0, 0.1, 0] });
  for (let z = -50; z <= 50; z += 8) b.box(0.6, 0.05, 4, C.white, { pos: [0, 0.22, z] });
  b.box(0.3, 0.05, 110, C.yellow, { pos: [-7.4, 0.22, 0] });
  b.box(0.3, 0.05, 110, C.yellow, { pos: [7.4, 0.22, 0] });
  for (let z = -54; z <= 54; z += 10) {
    b.ball(0.2, C.orange, { pos: [-8.2, 0.3, z], mat: 'glow' }, 0);
    b.ball(0.2, C.orange, { pos: [8.2, 0.3, z], mat: 'glow' }, 0);
  }
  return b.build();
}

export function hangar() {
  const b = new Builder();
  b.box(16, 0.3, 18, C.asphalt, { pos: [0, 0.15, 0] });
  // Quonset-style arched roof from box segments (solid from every angle).
  const segs = 9;
  for (let i = 0; i < segs; i++) {
    const a = ((i + 0.5) / segs) * Math.PI;
    b.box(7 * Math.PI / segs + 0.15, 0.25, 16, C.metal, { pos: [Math.cos(a) * 7, 0.3 + Math.sin(a) * 7, -1], rot: [0, 0, a - H], mat: 'metal' });
  }
  for (let i = 0; i < 7; i++) b.box(1.9, 7 * Math.sin(((i + 0.5) / 7) * Math.PI), 0.2, C.white, { pos: [-6 + i * 2, 0.3 + 3.5 * Math.sin(((i + 0.5) / 7) * Math.PI), -9] });
  b.box(9, 5.5, 0.2, C.navy, { pos: [0, 3, 7] });
  b.box(5, 1, 0.1, C.yellow, { pos: [0, 6.4, 7.1] });
  return b.build();
}

export function helipad() {
  const b = new Builder();
  b.cyl(7, 7.4, 0.6, C.darkStone, { pos: [0, 0.3, 0] }, 20);
  b.cyl(6.4, 6.4, 0.1, C.asphalt, { pos: [0, 0.62, 0] }, 20);
  b.torus(5.6, 0.18, C.yellow, { pos: [0, 0.68, 0], rot: [H, 0, 0] }, 32);
  b.box(0.7, 0.06, 4, C.white, { pos: [-1.2, 0.68, 0] });
  b.box(0.7, 0.06, 4, C.white, { pos: [1.2, 0.68, 0] });
  b.box(2.4, 0.06, 0.7, C.white, { pos: [0, 0.68, 0] });
  around(8, (a) => b.ball(0.18, C.lime, { pos: [Math.cos(a) * 6.8, 0.75, Math.sin(a) * 6.8], mat: 'glow' }, 0));
  return b.build();
}

export function controlTower() {
  const b = new Builder();
  b.box(5, 1, 5, C.darkStone, { pos: [0, 0.5, 0] });
  b.cyl(1.4, 1.8, 12, C.white, { pos: [0, 7, 0] }, 8);
  b.cyl(3.6, 2.4, 1.2, C.white, { pos: [0, 13.4, 0] }, 8);
  b.cyl(3.6, 3.6, 2.4, C.glass, { pos: [0, 15.2, 0], mat: 'glass' }, 8);
  b.cyl(3.9, 3.9, 0.4, C.navy, { pos: [0, 16.6, 0] }, 8);
  b.cyl(0.08, 0.08, 3, C.metal, { pos: [0, 18.2, 0] }, 4);
  b.ball(0.25, C.red, { pos: [0, 19.8, 0], mat: 'glow' }, 0);
  return b.build();
}

export function beachClub() {
  const b = new Builder();
  b.cyl(7, 7.5, 0.5, C.wood, { pos: [0, 0.25, 0] }, 12);
  around(6, (a) => b.cyl(0.2, 0.25, 3.6, C.darkWood, { pos: [Math.cos(a) * 5.5, 2.2, Math.sin(a) * 5.5] }, 6));
  b.cone(7.6, 3.2, C.thatch, { pos: [0, 5.6, 0] }, 12);
  b.cyl(2.2, 2.2, 1.1, C.bamboo, { pos: [0, 1.05, 0] }, 12);
  b.cyl(2.5, 2.5, 0.12, C.darkWood, { pos: [0, 1.66, 0] }, 12);
  around(8, (a, i) => b.ball(0.22, [C.pink, C.lime, C.yellow, C.sky][i % 4], { pos: [Math.cos(a) * 6.2, 3.9, Math.sin(a) * 6.2], mat: 'glow' }, 0));
  return b.build();
}

export function skyResort() {
  const b = new Builder();
  b.box(14, 0.6, 14, C.stone, { pos: [0, 0.3, 0] });
  for (let i = 0; i < 6; i++) {
    const w = 10 - i * 1.1;
    b.box(w, 2.8, w, i % 2 ? C.white : C.cream, { pos: [0, 2 + i * 3, 0], rot: [0, i * 0.18, 0] });
    b.box(w + 0.2, 2.0, w + 0.2, C.glass, { pos: [0, 2 + i * 3, 0], rot: [0, i * 0.18, 0], mat: 'glass' });
  }
  b.cyl(2.4, 2.4, 0.3, C.teal, { pos: [0, 19.6, 0] }, 12);
  b.cyl(0.1, 0.1, 5, C.metal, { pos: [0, 22, 0] }, 4);
  b.ball(0.35, C.purple, { pos: [0, 24.6, 0], mat: 'glow' }, 0);
  return b.build();
}

export function goldenStatue() {
  const b = new Builder();
  b.box(6, 1.4, 6, C.white, { pos: [0, 0.7, 0] });
  b.box(4.4, 2.4, 4.4, C.stone, { pos: [0, 2.6, 0] });
  b.box(1.5, 3.2, 1.0, C.gold, { pos: [0, 5.4, 0], mat: 'gold' });
  b.ball(0.8, C.gold, { pos: [0, 7.7, 0], mat: 'gold' }, 1);
  b.box(0.45, 3.2, 0.45, C.gold, { pos: [-1.1, 7.4, 0], rot: [0, 0, 0.35], mat: 'gold' });
  b.box(0.45, 2.4, 0.45, C.gold, { pos: [1.05, 5.6, 0], rot: [0, 0, -0.2], mat: 'gold' });
  b.cyl(0.9, 0.9, 0.2, C.gold, { pos: [-1.9, 9.2, 0], rot: [H, 0, 0], mat: 'gold' }, 16);
  around(8, (a) => b.ball(0.25, C.yellow, { pos: [Math.cos(a) * 3.4, 1.6, Math.sin(a) * 3.4], mat: 'glow' }, 0));
  return b.build();
}

export function palmPath() {
  const b = new Builder();
  for (let i = 0; i < 8; i++) b.cyl(0.9, 0.9, 0.12, C.stone, { pos: [Math.sin(i * 0.7) * 0.6, 0.06, -10 + i * 2.6] }, 8);
  for (let i = 0; i < 4; i++) {
    b.cyl(0.07, 0.07, 1.6, C.darkWood, { pos: [-2.2, 0.8, -9 + i * 6] }, 5);
    b.ball(0.22, C.orange, { pos: [-2.2, 1.7, -9 + i * 6], mat: 'glow' }, 0);
    b.cyl(0.07, 0.07, 1.6, C.darkWood, { pos: [2.2, 0.8, -6 + i * 6] }, 5);
    b.ball(0.22, C.orange, { pos: [2.2, 1.7, -6 + i * 6], mat: 'glow' }, 0);
  }
  return b.build();
}

export function carport() {
  const b = new Builder();
  b.box(5, 0.15, 6, C.asphalt, { pos: [0, 0.08, 0] });
  for (const x of [-2.3, 2.3]) for (const z of [-2.7, 2.7]) b.cyl(0.1, 0.1, 2.8, C.white, { pos: [x, 1.4, z] }, 6);
  b.box(5.6, 0.2, 6.6, C.teal, { pos: [0, 2.9, 0], rot: [0.05, 0, 0] });
  b.box(2, 0.5, 0.1, C.yellow, { pos: [0, 3.25, 3.25] });
  return b.build();
}

export function bank() {
  const b = new Builder();
  b.box(7, 0.5, 6, C.stone, { pos: [0, 0.25, 0] });
  b.box(6, 3.2, 4.4, C.white, { pos: [0, 2.1, -0.5] });
  for (let i = -2; i <= 2; i++) b.cyl(0.22, 0.25, 3.2, C.cream, { pos: [i * 1.3, 2.1, 2.2] }, 8);
  b.add(new THREE.CylinderGeometry(3.6, 3.6, 7, 3, 1), C.white, { pos: [0, 4.4, 0.6], rot: [0, 0, H], scale: [0.35, 1, 1] });
  b.box(1.2, 1.2, 0.1, C.gold, { pos: [0, 4.3, 2.55], mat: 'gold' });
  b.box(1.1, 2, 0.1, C.darkWood, { pos: [0, 1.5, 1.76] });
  return b.build();
}

export function raceArch() {
  const b = new Builder();
  b.box(0.8, 6, 0.8, C.black, { pos: [-5.6, 3, 0] });
  b.box(0.8, 6, 0.8, C.black, { pos: [5.6, 3, 0] });
  for (let i = 0; i < 12; i++) b.box(0.98, 1.2, 0.5, i % 2 ? C.white : C.black, { pos: [-5.4 + i * 0.98, 6.2, 0] });
  b.box(12, 0.15, 0.6, C.red, { pos: [0, 5.5, 0], mat: 'glow' });
  return b.build();
}
