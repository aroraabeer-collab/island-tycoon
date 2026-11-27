import './ui/styles.css';
import { Game } from './core/Game';
import { showTitle } from './ui/TitleScreen';

async function boot() {
  const app = document.getElementById('app')!;
  const ui = document.getElementById('ui')!;
  const tBoot = performance.now();
  const game = await Game.create(app, ui);
  if (import.meta.env.DEV) console.log(`BOOT world built in ${(performance.now() - tBoot).toFixed(0)}ms`);
  game.run();
  (window as any).__game = game; // handy for debugging in the console
  // Debug flags: ?autostart skips the title, ?reveal=1 shows the finished island (not saved),
  // ?shot=px,py,pz,tx,ty,tz fixes the camera for screenshots.
  const q = new URLSearchParams(location.search);
  if (q.get('quality') === 'low') game.renderer.setQuality('low');
  if (import.meta.env.DEV && q.has('perf')) {
    game.perf.on = true;
    const r = game.renderer as any;
    if (q.has('dpr')) { r.renderer.setPixelRatio(Number(q.get('dpr'))); r.resize(); }
    if (q.has('noshadow')) r.renderer.shadowMap.enabled = false;
    if (q.has('nobloom')) r.bloom.enabled = false;
    game.scene.traverse((o: any) => {
      if (q.has('nowater') && o.geometry?.boundingSphere?.radius === 6000) o.visible = false;
      if (q.has('nosky') && o.isSky) o.visible = false;
      if (q.has('nofoliage') && o.isInstancedMesh) o.visible = false;
    });
  }
  if (import.meta.env.DEV && q.get('smoke') === '1') {
    game.start(false);
    const { runSmoke } = await import('./dev/smoke');
    await runSmoke(game);
    return;
  }
  if (q.has('autostart') || q.has('reveal')) {
    game.start(false);
    if (q.get('reveal') === '1') game.revealAll();
    const shot = q.get('shot')?.split(',').map(Number);
    if (shot?.length === 6 && shot.every(Number.isFinite)) game.shot(...(shot as [number, number, number, number, number, number]));
    if (import.meta.env.DEV && q.has('menu')) game.dev.menu?.toggle(true);
    return;
  }
  const { reset } = await showTitle(ui, game.save.load() !== null);
  game.start(reset);
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;inset:20px;color:#fff;white-space:pre-wrap">Failed to start: ${String(err?.message ?? err)}</pre>`);
});
