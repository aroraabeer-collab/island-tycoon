// Dev tool: headless boat + aircraft handling check in open water.
import { Physics } from '../src/core/Physics';
import { Boat } from '../src/vehicles/Boat';
import { Aircraft } from '../src/vehicles/Aircraft';

const scene: any = { add() {}, remove() {} };
const inp = (x: number, y: number, jump = false, descend = false): any => ({ axes: () => ({ x, y }), jump, descend });
const p = await Physics.create();
let time = 0;
for (let tier = 0; tier < 3; tier++) {
  const b = new Boat('boat', scene, p, { x: 300, y: 0.5, z: tier * 60, rot: 0 });
  b.tier = tier; (b as any).createBody(tier); b.respawn();
  const run = (s: number, i: any) => { for (let k = 0; k < s * 60; k++) { b.step(1 / 60, i, time); p.world.step(); b.sync(0); time += 1 / 60; } };
  run(3, null);
  const ys: number[] = []; for (let k = 0; k < 60; k++) { run(1 / 60, null); ys.push(b.position.y); }
  run(6, inp(0, 1));
  const sp = b.speed;
  run(3, inp(1, 1));
  console.log(`boat ${tier}: float y ${Math.min(...ys).toFixed(2)}..${Math.max(...ys).toFixed(2)} | speed after 6s ${sp.toFixed(1)} | heading after right turn ${b.heading.toFixed(2)} | up ${(1 - 2 * (b.quaternion.x ** 2 + b.quaternion.z ** 2)).toFixed(2)}`);
}
for (let tier = 0; tier < 3; tier++) {
  const a = new Aircraft('air', scene, p, { x: 300, y: 2, z: 300 + tier * 80, rot: 0 });
  a.tier = tier; (a as any).createBody(tier); a.respawn();
  const run = (s: number, i: any) => { for (let k = 0; k < s * 60; k++) { a.step(1 / 60, i); p.world.step(); a.sync(0); } };
  run(1, inp(0, 0));
  run(3, inp(0, 0, true));
  const alt = a.position.y;
  run(4, inp(0, 1));
  console.log(`air ${tier}: alt after 3s climb ${alt.toFixed(1)} | speed ${a.speed.toFixed(1)} | alt after cruise ${a.position.y.toFixed(1)}`);
}
