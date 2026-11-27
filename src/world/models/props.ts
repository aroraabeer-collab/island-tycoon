// Props, foliage geometry (for instancing), collectibles and the player character.
import * as THREE from 'three';
import { Builder, C, around } from './kit';

const H = Math.PI / 2;

/** Palm tree split into trunk (std) and fronds (leaf, wind sway) builders. */
export function palmBuilders(seed = 0): { trunk: Builder; leaves: Builder } {
  const trunk = new Builder();
  const leaves = new Builder();
  const lean = 0.18 + (seed % 3) * 0.06;
  let x = 0, y = 0;
  for (let i = 0; i < 7; i++) {
    trunk.cyl(0.26 - i * 0.02, 0.3 - i * 0.02, 1.25, i % 2 ? C.wood : C.darkWood, { pos: [x, y + 0.6, 0], rot: [0, 0, -lean * 0.5] }, 6);
    x += lean * 0.55;
    y += 1.2;
  }
  around(7, (a) => {
    leaves.add(new THREE.ConeGeometry(0.55, 4.2, 3), C.leaf, {
      pos: [x + Math.cos(a) * 1.9, y + 0.1, Math.sin(a) * 1.9],
      rot: [Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25],
      scale: [1, 1, 0.25],
      mat: 'leaf',
    });
  });
  for (let i = 0; i < 3; i++) trunk.ball(0.22, C.darkWood, { pos: [x + Math.cos(i * 2.1) * 0.3, y - 0.2, Math.sin(i * 2.1) * 0.3] }, 0);
  return { trunk, leaves };
}

export function bushGeometry(): THREE.BufferGeometry {
  const b = new Builder();
  b.ball(0.9, C.leaf, { pos: [0, 0.6, 0], mat: 'leaf' }, 0);
  b.ball(0.7, C.darkLeaf, { pos: [0.7, 0.45, 0.2], mat: 'leaf' }, 0);
  b.ball(0.6, C.lime, { pos: [-0.6, 0.4, -0.2], mat: 'leaf' }, 0);
  return b.geometry('leaf');
}

export function rockGeometry(): THREE.BufferGeometry {
  const b = new Builder();
  b.ball(1, C.stone, { scale: [1.2, 0.7, 1] }, 0);
  b.ball(0.6, C.darkStone, { pos: [0.8, -0.1, 0.4], scale: [1, 0.8, 1] }, 0);
  return b.geometry('std');
}

export function grassGeometry(): THREE.BufferGeometry {
  const b = new Builder();
  around(5, (a) => b.add(new THREE.ConeGeometry(0.08, 0.7, 3), C.lime, {
    pos: [Math.cos(a) * 0.15, 0.3, Math.sin(a) * 0.15], rot: [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3], mat: 'leaf',
  }));
  return b.geometry('leaf');
}

export function supplyCrate(): THREE.Group {
  const b = new Builder();
  b.box(1.4, 1.4, 1.4, C.wood);
  b.box(1.5, 0.2, 1.5, C.darkWood, { pos: [0, 0.6, 0] });
  b.box(1.5, 0.2, 1.5, C.darkWood, { pos: [0, -0.6, 0] });
  b.box(0.5, 0.5, 0.05, C.cash, { pos: [0, 0, 0.73], mat: 'glow' });
  const crate = b.build();
  const p = new Builder();
  p.add(new THREE.SphereGeometry(2.4, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), C.coral, { pos: [0, 4.2, 0] });
  around(4, (a) => p.cyl(0.02, 0.02, 4.4, C.white, { pos: [Math.cos(a) * 1.2, 2.4, Math.sin(a) * 1.2], rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] }, 3));
  const chute = p.build(false);
  chute.name = 'chute';
  crate.add(chute);
  return crate;
}

export function beacon(color: number = C.cash): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.6, 0.6, 60, 12, 1, true);
  geo.translate(0, 30, 0);
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  mat.color.multiplyScalar(4);
  return new THREE.Mesh(geo, mat);
}

export function treasureChest(): THREE.Group {
  const b = new Builder();
  b.box(1.4, 0.8, 0.9, C.darkWood, { pos: [0, 0.4, 0] });
  b.add(new THREE.CylinderGeometry(0.45, 0.45, 1.4, 8, 1, false, 0, Math.PI), C.wood, { pos: [0, 0.8, 0], rot: [0, 0, H] });
  b.box(1.45, 0.12, 0.95, C.gold, { pos: [0, 0.8, 0], mat: 'gold' });
  b.box(0.12, 1.3, 0.95, C.gold, { pos: [-0.5, 0.75, 0], mat: 'gold' });
  b.box(0.12, 1.3, 0.95, C.gold, { pos: [0.5, 0.75, 0], mat: 'gold' });
  b.box(0.25, 0.3, 0.05, C.yellow, { pos: [0, 0.75, 0.48], mat: 'glow' });
  b.cyl(1.2, 1.2, 0.4, C.wood, { pos: [0, -0.1, 0] }, 8);
  return b.build();
}

export function ringGate(): THREE.Group {
  const b = new Builder();
  b.torus(5, 0.4, C.gold, { mat: 'glow' }, 28);
  return b.build(false);
}

export function cashBill(): THREE.BufferGeometry {
  const b = new Builder();
  b.box(0.7, 0.08, 0.35, C.cash, { mat: 'glow' });
  return b.geometry('glow');
}

export function cashBrick(): THREE.BufferGeometry {
  const b = new Builder();
  b.box(0.7, 0.35, 0.45, C.cash);
  b.box(0.72, 0.36, 0.12, C.white);
  return b.geometry('std');
}

export function character(): { root: THREE.Group; legs: THREE.Object3D[]; arms: THREE.Object3D[] } {
  const body = new Builder();
  body.box(0.62, 0.7, 0.36, C.coral, { pos: [0, 1.15, 0] });
  body.box(0.64, 0.12, 0.38, C.darkWood, { pos: [0, 0.82, 0] });
  body.box(0.42, 0.42, 0.4, 0xf1c27d, { pos: [0, 1.75, 0] });
  body.box(0.46, 0.12, 0.46, C.yellow, { pos: [0, 2.0, 0] });
  body.box(0.7, 0.04, 0.7, C.yellow, { pos: [0, 1.95, 0] });
  body.box(0.32, 0.08, 0.02, C.black, { pos: [0, 1.8, 0.21] });
  const root = body.build();
  const limb = (w: number, h: number, color: number, x: number, y: number) => {
    const lb = new Builder();
    lb.box(w, h, w, color, { pos: [0, -h / 2, 0] });
    const g = lb.build();
    g.position.set(x, y, 0);
    root.add(g);
    return g;
  };
  const legs = [limb(0.24, 0.78, C.navy, -0.15, 0.8), limb(0.24, 0.78, C.navy, 0.15, 0.8)];
  const arms = [limb(0.18, 0.62, 0xf1c27d, -0.42, 1.48), limb(0.18, 0.62, 0xf1c27d, 0.42, 1.48)];
  return { root, legs, arms };
}

/** Glowing purchase pad base (label is a sprite added by TycoonButton). */
export function padGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(1.5, 1.6, 0.25, 24);
  g.translate(0, 0.125, 0);
  return g;
}
