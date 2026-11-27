// Dev tool: headless car handling check on a flat plane (no rendering).
import { Physics } from '../src/core/Physics';
import { Car, CAR_STATS } from '../src/vehicles/Car';

(globalThis as any).window = globalThis;
const scene: any = { add() {}, remove() {} };
const fakeInput = (x: number, y: number): any => ({ axes: () => ({ x, y }), jump: false });

const p = await Physics.create();
p.addTrimesh(new Float32Array([-500, 0, -500, 500, 0, -500, -500, 0, 500, 500, 0, 500]), new Uint32Array([0, 2, 1, 1, 2, 3]));
for (let tier = 0; tier < 3; tier++) {
  const car = new Car('car', scene, p, { x: tier * 50, y: 1.5, z: 0, rot: 0 });
  (car as any).setTier = undefined;
  car.tier = tier;
  (car as any).createBody(tier);
  car.respawn();
  const run = (secs: number, x: number, y: number) => { for (let i = 0; i < secs * 60; i++) { car.step(1 / 60, fakeInput(x, y)); p.world.step(); car.sync(1 / 60); } };
  run(1, 0, 0);
  const y0 = car.position.y;
  run(4, 0, 1);
  const v4 = car.forwardSpeed, z4 = car.position.z;
  run(3, 1, 1);
  const up = (() => { const q = car.quaternion; return 1 - 2 * (q.x * q.x + q.z * q.z); })();
  console.log(`tier ${tier} rest y ${y0.toFixed(2)} | after 4s: speed ${v4.toFixed(1)} (max ${CAR_STATS[tier].maxSpeed}) z ${z4.toFixed(1)} | turning right 3s: x ${(car.position.x - tier * 50).toFixed(1)} heading ${car.heading.toFixed(2)} up ${up.toFixed(2)}`);
  run(3, 0, -1);
  console.log(`   after braking 3s: speed ${car.forwardSpeed.toFixed(1)}`);
}
