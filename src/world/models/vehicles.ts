// Procedural vehicle models. Forward = +Z, origin = chassis/hull center.
// Moving parts (wheels, rotors, propellers) are returned separately so controllers can animate them.
import * as THREE from 'three';
import { Builder, C } from './kit';

const H = Math.PI / 2;

export interface VehicleModel {
  root: THREE.Group;
  wheels: THREE.Object3D[]; // FL, FR, RL, RR
  spinners: THREE.Object3D[]; // rotors / propellers, spun around local Y or Z
}

function wheel(radius: number, width: number, rim: number): THREE.Group {
  const b = new Builder();
  b.cyl(radius, radius, width, C.rubber, { rot: [0, 0, H] }, 12);
  b.cyl(radius * 0.55, radius * 0.55, width + 0.02, rim, { rot: [0, 0, H], mat: 'metal' }, 8);
  return b.build();
}

export const WHEEL_POS: [number, number, number][] = [
  [-0.85, -0.15, 1.2], [0.85, -0.15, 1.2], [-0.85, -0.15, -1.15], [0.85, -0.15, -1.15],
];
export const WHEEL_RADIUS = 0.42;

function withWheels(body: THREE.Group, radius = WHEEL_RADIUS, rim: number = C.metal): VehicleModel {
  const wheels = WHEEL_POS.map((p) => {
    const w = wheel(radius, 0.34, rim);
    w.position.set(...p);
    body.add(w);
    return w;
  });
  return { root: body, wheels, spinners: [] };
}

export function golfCart(): VehicleModel {
  const b = new Builder();
  b.box(1.5, 0.35, 2.6, C.white, { pos: [0, 0.05, 0] });
  b.box(1.4, 0.5, 0.6, C.white, { pos: [0, 0.35, 1.0] });
  b.box(1.3, 0.25, 0.7, C.teal, { pos: [0, 0.45, -0.1] });
  b.box(1.3, 0.7, 0.18, C.teal, { pos: [0, 0.85, -0.45] });
  for (const x of [-0.65, 0.65]) for (const z of [0.75, -0.95]) b.cyl(0.04, 0.04, 1.6, C.metal, { pos: [x, 1.1, z], mat: 'metal' }, 5);
  b.box(1.6, 0.08, 2.0, C.white, { pos: [0, 1.92, -0.1] });
  b.box(1.0, 0.4, 0.5, C.darkStone, { pos: [0, 0.45, -1.1] });
  b.ball(0.09, C.yellow, { pos: [-0.5, 0.35, 1.31], mat: 'glow' }, 0);
  b.ball(0.09, C.yellow, { pos: [0.5, 0.35, 1.31], mat: 'glow' }, 0);
  return withWheels(b.build(), 0.36, C.white);
}

export function buggy(): VehicleModel {
  const b = new Builder();
  b.box(1.4, 0.4, 2.8, C.orange, { pos: [0, 0.15, 0] });
  b.box(1.2, 0.3, 0.9, C.orange, { pos: [0, 0.45, 1.0], rot: [0.25, 0, 0] });
  b.box(0.6, 0.5, 0.5, C.darkStone, { pos: [0, 0.6, -1.0], mat: 'metal' });
  // roll cage
  for (const x of [-0.6, 0.6]) {
    b.cyl(0.05, 0.05, 1.3, C.black, { pos: [x, 1.0, 0.45], rot: [-0.4, 0, 0], mat: 'metal' }, 5);
    b.cyl(0.05, 0.05, 1.2, C.black, { pos: [x, 1.0, -0.55], rot: [0.3, 0, 0], mat: 'metal' }, 5);
    b.cyl(0.05, 0.05, 1.0, C.black, { pos: [x, 1.55, -0.05], rot: [H, 0, 0], mat: 'metal' }, 5);
  }
  b.cyl(0.05, 0.05, 1.2, C.black, { pos: [0, 1.55, 0.45], rot: [0, 0, H], mat: 'metal' }, 5);
  b.box(0.6, 0.5, 0.6, C.black, { pos: [0, 0.6, -0.1] });
  for (const x of [-0.35, -0.12, 0.12, 0.35]) b.ball(0.08, C.white, { pos: [x, 1.62, 0.5], mat: 'glow' }, 0);
  return withWheels(b.build(), 0.5, C.black);
}

export function supercar(): VehicleModel {
  const b = new Builder();
  b.box(1.8, 0.45, 3.9, C.red, { pos: [0, 0.1, 0], mat: 'metal' });
  b.box(1.7, 0.3, 1.4, C.red, { pos: [0, 0.35, 1.25], rot: [0.12, 0, 0], mat: 'metal' });
  b.box(1.4, 0.5, 1.6, C.black, { pos: [0, 0.55, -0.2], mat: 'glass' });
  b.box(1.5, 0.12, 0.4, C.black, { pos: [0, 0.75, -1.8] });
  b.box(0.1, 0.35, 0.3, C.black, { pos: [-0.6, 0.55, -1.8] });
  b.box(0.1, 0.35, 0.3, C.black, { pos: [0.6, 0.55, -1.8] });
  b.box(0.4, 0.1, 0.05, C.white, { pos: [-0.6, 0.25, 1.96], mat: 'glow' });
  b.box(0.4, 0.1, 0.05, C.white, { pos: [0.6, 0.25, 1.96], mat: 'glow' });
  b.box(0.5, 0.1, 0.05, C.red, { pos: [-0.55, 0.25, -1.96], mat: 'glow' });
  b.box(0.5, 0.1, 0.05, C.red, { pos: [0.55, 0.25, -1.96], mat: 'glow' });
  return withWheels(b.build(), 0.4, C.gold);
}

function boatModel(b: Builder, spinners: THREE.Object3D[] = []): VehicleModel {
  return { root: b.build(), wheels: [], spinners };
}

export function raft(): VehicleModel {
  const b = new Builder();
  for (let i = 0; i < 5; i++) b.cyl(0.28, 0.28, 3.4, C.wood, { pos: [-1.0 + i * 0.5, 0, 0], rot: [H, 0, 0] }, 7);
  b.box(2.4, 0.1, 0.3, C.darkWood, { pos: [0, 0.28, 1.2] });
  b.box(2.4, 0.1, 0.3, C.darkWood, { pos: [0, 0.28, -1.2] });
  b.cyl(0.06, 0.06, 2.6, C.darkWood, { pos: [0, 1.5, 0.3] }, 5);
  b.add(new THREE.PlaneGeometry(1.6, 1.8), C.cream, { pos: [0, 1.7, 0.35] });
  b.box(0.3, 0.3, 0.3, C.yellow, { pos: [0.7, 0.4, -0.9] });
  return boatModel(b);
}

export function speedboat(): VehicleModel {
  const b = new Builder();
  b.box(2.2, 0.7, 4.6, C.white, { pos: [0, 0, -0.4] });
  b.add(new THREE.CylinderGeometry(1.1, 0.2, 2.2, 4, 1), C.white, { pos: [0, 0, 2.6], rot: [H, Math.PI / 4, 0], scale: [1, 1, 0.45] });
  b.box(2.25, 0.18, 4.6, C.red, { pos: [0, 0.1, -0.4] });
  b.box(1.6, 0.3, 2.4, C.cream, { pos: [0, 0.45, -0.9] });
  b.box(1.5, 0.6, 0.08, C.glass, { pos: [0, 0.75, 0.6], rot: [-0.5, 0, 0], mat: 'glass' });
  b.box(0.6, 0.6, 0.6, C.black, { pos: [0, 0.4, -2.85], mat: 'metal' });
  return boatModel(b);
}

export function yacht(): VehicleModel {
  const b = new Builder();
  b.box(4.4, 1.6, 10, C.white, { pos: [0, 0, -1] });
  b.add(new THREE.CylinderGeometry(2.2, 0.3, 4.6, 4, 1), C.white, { pos: [0, 0, 6.2], rot: [H, Math.PI / 4, 0], scale: [1, 1, 0.75] });
  b.box(4.45, 0.3, 10, C.navy, { pos: [0, -0.35, -1] });
  b.box(3.6, 1.6, 6, C.white, { pos: [0, 1.6, -1.6] });
  b.box(3.65, 0.8, 6.05, C.black, { pos: [0, 1.7, -1.6], mat: 'glass' });
  b.box(2.8, 1.2, 3.4, C.white, { pos: [0, 3.0, -2.2] });
  b.box(2.85, 0.6, 3.45, C.black, { pos: [0, 3.1, -2.2], mat: 'glass' });
  b.box(3.4, 0.15, 4, C.gold, { pos: [0, 3.68, -2.4], mat: 'gold' });
  b.cyl(0.08, 0.08, 2.4, C.metal, { pos: [0, 4.9, -2.6] }, 4);
  b.box(4.2, 0.1, 3, C.wood, { pos: [0, 0.82, -5] });
  return boatModel(b);
}

export function glider(): VehicleModel {
  const b = new Builder();
  b.box(0.5, 0.5, 2.0, C.yellow, { pos: [0, 0, 0] });
  b.add(new THREE.ConeGeometry(0.3, 0.9, 6), C.yellow, { pos: [0, 0, 1.4], rot: [H, 0, 0] });
  b.box(0.08, 0.08, 2.4, C.metal, { pos: [0, 0.3, -1.6], mat: 'metal' });
  b.add(new THREE.ConeGeometry(4.4, 2.6, 3), C.coral, { pos: [0, 1.4, 0.2], rot: [-H, 0, 0], scale: [1, 1, 0.05] });
  b.box(1.6, 0.06, 0.6, C.coral, { pos: [0, 0.3, -2.8] });
  b.box(0.06, 0.7, 0.6, C.coral, { pos: [0, 0.6, -2.8] });
  const prop = new Builder();
  prop.box(1.4, 0.15, 0.06, C.darkWood);
  const spinner = prop.build();
  spinner.position.set(0, 0, -1.05);
  const root = b.build();
  root.add(spinner);
  return { root, wheels: [], spinners: [spinner] };
}

export function seaplane(): VehicleModel {
  const b = new Builder();
  b.cyl(0.55, 0.4, 4.6, C.white, { rot: [H, 0, 0] }, 10);
  b.add(new THREE.ConeGeometry(0.55, 1.0, 10), C.white, { pos: [0, 0, 2.8], rot: [H, 0, 0] });
  b.box(8, 0.12, 1.2, C.sky, { pos: [0, 0.55, 0.4] });
  b.box(2.6, 0.08, 0.7, C.sky, { pos: [0, 0.3, -2.3] });
  b.box(0.08, 1.1, 0.8, C.sky, { pos: [0, 0.8, -2.3] });
  b.box(0.8, 0.4, 0.9, C.black, { pos: [0, 0.45, 1.0], mat: 'glass' });
  for (const x of [-1.2, 1.2]) {
    b.box(0.35, 0.35, 3.6, C.white, { pos: [x, -1.25, 0.3] });
    b.cyl(0.04, 0.04, 1.0, C.metal, { pos: [x, -0.7, 0.9], mat: 'metal' }, 4);
    b.cyl(0.04, 0.04, 1.0, C.metal, { pos: [x, -0.7, -0.4], mat: 'metal' }, 4);
  }
  const prop = new Builder();
  prop.box(2.0, 0.18, 0.06, C.black);
  prop.ball(0.15, C.red, {}, 0);
  const spinner = prop.build();
  spinner.position.set(0, 0, 3.35);
  const root = b.build();
  root.add(spinner);
  return { root, wheels: [], spinners: [spinner] };
}

export function helicopter(): VehicleModel {
  const b = new Builder();
  b.ball(1.2, C.navy, { pos: [0, 0, 0.4], scale: [1, 0.95, 1.4], mat: 'metal' }, 1);
  b.ball(0.95, C.black, { pos: [0, 0.2, 1.2], scale: [0.9, 0.8, 0.9], mat: 'glass' }, 1);
  b.cyl(0.18, 0.32, 4.2, C.navy, { pos: [0, 0.35, -2.4], rot: [H, 0, 0], mat: 'metal' }, 8);
  b.box(0.1, 1.0, 0.7, C.gold, { pos: [0, 0.8, -4.3], mat: 'gold' });
  b.cyl(0.12, 0.12, 0.5, C.metal, { pos: [0, 1.3, 0.3], mat: 'metal' }, 6);
  for (const x of [-0.8, 0.8]) {
    b.box(0.1, 0.1, 3.0, C.metal, { pos: [x, -1.25, 0.4], mat: 'metal' });
    b.cyl(0.05, 0.05, 0.7, C.metal, { pos: [x, -0.9, 1.2], mat: 'metal' }, 4);
    b.cyl(0.05, 0.05, 0.7, C.metal, { pos: [x, -0.9, -0.4], mat: 'metal' }, 4);
  }
  const rotor = new Builder();
  rotor.box(9, 0.06, 0.35, C.black);
  rotor.box(0.35, 0.06, 9, C.black);
  const main = rotor.build();
  main.position.set(0, 1.58, 0.3);
  const tr = new Builder();
  tr.box(0.05, 1.4, 0.2, C.black);
  const tail = tr.build();
  tail.position.set(0.12, 0.8, -4.3);
  tail.rotation.z = H; // spins around its local Y (now along X)
  const root = b.build();
  root.add(main, tail);
  return { root, wheels: [], spinners: [main, tail] };
}

export const VEHICLE_MODELS = {
  car: [golfCart, buggy, supercar],
  boat: [raft, speedboat, yacht],
  air: [glider, seaplane, helicopter],
} as const;

export const VEHICLE_NAMES = {
  car: ['Rusty Golf Cart', 'Off-Road Buggy', 'Supercar'],
  boat: ['Wooden Raft', 'Speedboat', 'Luxury Yacht'],
  air: ['Ultralight Glider', 'Seaplane', 'Private Helicopter'],
} as const;
