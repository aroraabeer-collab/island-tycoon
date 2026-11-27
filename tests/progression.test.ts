import { describe, it, expect } from 'vitest';
import { BUTTONS, BUTTON_BY_ID, START_BUTTON } from '../src/tycoon/progression';
import { LAYOUT, LAYOUT_BY_ID } from '../src/world/layout';
import { terrainHeight, roadQuery, ROAD_HALF_WIDTH } from '../src/world/heights';
import { MoneyManager } from '../src/economy/MoneyManager';
import { TycoonState } from '../src/tycoon/TycoonState';

describe('progression tree', () => {
  it('has unique ids and ~35 buttons', () => {
    expect(BUTTON_BY_ID.size).toBe(BUTTONS.length);
    expect(BUTTONS.length).toBeGreaterThanOrEqual(30);
    expect(BUTTONS.length).toBeLessThanOrEqual(40);
  });

  it('references only existing targets and unlocks', () => {
    for (const b of BUTTONS) {
      for (const t of b.targets) expect(LAYOUT_BY_ID.has(t), `${b.id} -> target ${t}`).toBe(true);
      for (const u of b.unlocks) expect(BUTTON_BY_ID.has(u), `${b.id} -> unlock ${u}`).toBe(true);
    }
  });

  it('every button is reachable from the start exactly once (tree, no cycles)', () => {
    const parents = new Map<string, number>();
    for (const b of BUTTONS) for (const u of b.unlocks) parents.set(u, (parents.get(u) ?? 0) + 1);
    expect(parents.has(START_BUTTON)).toBe(false);
    const seen = new Set<string>();
    const stack = [START_BUTTON];
    while (stack.length) {
      const id = stack.pop()!;
      expect(seen.has(id), `cycle at ${id}`).toBe(false);
      seen.add(id);
      stack.push(...BUTTON_BY_ID.get(id)!.unlocks);
    }
    expect(seen.size).toBe(BUTTONS.length);
  });

  it('a child never costs less than its parent', () => {
    for (const b of BUTTONS) for (const u of b.unlocks) {
      expect(BUTTON_BY_ID.get(u)!.cost, `${b.id} -> ${u}`).toBeGreaterThanOrEqual(b.cost);
    }
  });

  it('each layout object is revealed by at most one button', () => {
    const owner = new Map<string, string>();
    for (const b of BUTTONS) for (const t of b.targets) {
      expect(owner.has(t), `${t} owned by ${owner.get(t)} and ${b.id}`).toBe(false);
      owner.set(t, b.id);
    }
    for (const l of LAYOUT) if (!l.alwaysVisible) expect(owner.has(l.id), `${l.id} is never revealed`).toBe(true);
  });

  it('pads sit on dry land, off the road, and do not overlap each other', () => {
    for (const b of BUTTONS) {
      const [x, z] = b.pad;
      expect(terrainHeight(x, z), `${b.id} pad underwater`).toBeGreaterThan(0.3);
      expect(roadQuery(x, z).dist, `${b.id} pad on road`).toBeGreaterThan(ROAD_HALF_WIDTH + 1.6);
      for (const o of BUTTONS) if (o !== b) {
        expect(Math.hypot(o.pad[0] - x, o.pad[1] - z), `${b.id} overlaps ${o.id}`).toBeGreaterThan(3.4);
      }
    }
  });
});

describe('balance', () => {
  it('a passive-only greedy playthrough finishes in 15-35 minutes', () => {
    const money = new MoneyManager();
    money.money = 40;
    const state = new TycoonState(money);
    let t = 0;
    const dt = 0.5;
    while (state.purchased.size < BUTTONS.length && t < 7200) {
      money.tick(dt);
      money.claim();
      const cheapest = [...state.available].map((id) => BUTTON_BY_ID.get(id)!).sort((a, b) => a.cost - b.cost)[0];
      if (cheapest) state.buy(cheapest.id);
      t += dt;
    }
    const minutes = t / 60;
    // Active income (crates/treasure/rings) shortens this further in real play.
    expect(minutes).toBeGreaterThan(15);
    expect(minutes).toBeLessThan(35);
  });
});
