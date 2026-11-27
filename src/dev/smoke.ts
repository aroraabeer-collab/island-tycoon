// Dev-only end-to-end smoke test (?smoke=1): buys every pad by walking onto it, then drives,
// sails and flies each vehicle using synthetic key presses. Results are shown on screen.
import * as THREE from 'three';
import type { Game } from '../core/Game';
import { BUTTON_BY_ID, BUTTONS } from '../tycoon/progression';
import { terrainHeight } from '../world/heights';

/** Wait a number of *rendered frames* (~ms at 60fps) so the game loop actually runs. */
const wait = (ms: number) => new Promise<void>((resolve) => {
  let n = Math.max(1, Math.round(ms / 16.7));
  const f = () => (--n <= 0 ? resolve() : requestAnimationFrame(f));
  requestAnimationFrame(f);
});
const key = (code: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
async function press(code: string, ms = 80) { key(code, true); await wait(ms); key(code, false); }

export async function runSmoke(game: Game) {
  const out: string[] = [];
  const log = (ok: boolean, msg: string) => out.push(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  const { player, vehicles, tycoon, money, menu, isPaused } = game.dev;
  try {
    // 0. Settings menu: Esc opens + pauses, Esc closes.
    key('Escape', true); key('Escape', false);
    await wait(400);
    log(!!menu?.open && isPaused(), 'Esc opens the settings menu and pauses');
    key('Escape', true); key('Escape', false);
    await wait(100);
    log(!menu?.open && !isPaused(), 'Esc closes the menu and resumes');
    log(!game.applyCheat('notacode').ok, 'unknown cheat code is rejected');
    money.money = 0;
    const cheat = game.applyCheat('money bags');
    log(cheat.ok && money.infinite, `cheat MONEYBAGS enables infinite money (${cheat.message})`);
    // 1. Buy everything by standing on pads.
    for (let guard = 0; guard < 80 && tycoon.state.purchased.size < BUTTONS.length; guard++) {
      const id = [...tycoon.state.available][0];
      if (!id) break;
      const [x, z] = BUTTON_BY_ID.get(id)!.pad;
      player.teleport(new THREE.Vector3(x, terrainHeight(x, z), z));
      await wait(450);
    }
    log(tycoon.state.purchased.size === BUTTONS.length, `bought ${tycoon.state.purchased.size}/${BUTTONS.length} pads by walking onto them`);
    const before = money.money;
    log(money.spend(1e12) && money.money === before, 'infinite money: purchases never reduce the wallet');
    log(money.autoDeposit && money.multiplier === 1.5, `bank manager + x1.5 multiplier active (income ${money.incomePerSec.toFixed(0)}/s)`);

    // 2. Each vehicle: enter, drive, check movement, exit.
    for (const v of vehicles.all) {
      log(v.tier === 2, `${v.kind} upgraded to tier ${v.tier}`);
      v.respawn();
      await wait(300);
      const p = v.position.clone();
      player.teleport(p.clone().add(new THREE.Vector3(1.5, 0, 0)).setY(Math.max(terrainHeight(p.x + 1.5, p.z), p.y)));
      await wait(300);
      await press('KeyE');
      await wait(200);
      log(vehicles.active === v, `entered ${v.kind}`);
      const start = v.position.clone();
      if (v.kind === 'air') { key('Space', true); await wait(2500); key('Space', false); }
      key('KeyW', true);
      await wait(3000);
      key('KeyW', false);
      const moved = Math.hypot(v.position.x - start.x, v.position.z - start.z);
      const extra = v.kind === 'air' ? `, climbed ${(v.position.y - start.y).toFixed(1)}m` : v.kind === 'boat' ? `, y=${v.position.y.toFixed(2)}` : '';
      log(moved > 15, `${v.kind} moved ${moved.toFixed(1)}m in 3s${extra}`);
      if (v.kind === 'air') log(v.position.y - start.y > 5, 'aircraft gained altitude');
      if (v.kind === 'boat') log(Math.abs(v.position.y) < 2, 'boat floats at the waterline');
      // Handbrake / hover until slow enough to exit.
      key('Space', v.kind === 'car');
      for (let i = 0; i < 12 && v.speed > 3; i++) await wait(500);
      key('Space', false);
      await press('KeyE');
      await wait(200);
      log(vehicles.active === null, `exited ${v.kind}`);
    }
  } catch (e) {
    log(false, `exception: ${String(e)}`);
  }
  const pre = document.createElement('pre');
  pre.id = 'smoke';
  pre.style.cssText = 'position:fixed;left:20px;top:110px;z-index:9;background:rgba(0,0,0,.75);color:#7dffa0;padding:14px;font:15px/1.5 monospace';
  pre.textContent = out.join('\n');
  document.body.appendChild(pre);
  console.log('SMOKE RESULT\n' + out.join('\n'));
}
