// Title card shown over the live island; resolves when the player clicks Play.
export const GAME_TITLE = 'Island Tycoon';

export function showTitle(root: HTMLElement, hasSave: boolean): Promise<{ reset: boolean }> {
  const wrap = document.createElement('div');
  wrap.className = 'title';
  wrap.innerHTML = `
    <div class="card panel">
      <h1>${GAME_TITLE}<span>PARADISE EMPIRE</span></h1>
      <p>Build your private island. Drive, sail and fly for treasure.</p>
      <button class="play">${hasSave ? 'Continue' : 'Play'}</button>
      ${hasSave ? '<button class="small reset">Start a new island</button>' : ''}
      <div class="controls">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Move / drive</span>
        <span><kbd>Mouse</kbd></span><span>Look (click to lock)</span>
        <span><kbd>Space</kbd> / <kbd>Shift</kbd></span><span>Jump · Fly up / down · Sprint</span>
        <span><kbd>E</kbd></span><span>Enter / exit vehicle · Salvage</span>
        <span><kbd>R</kbd></span><span>Reset vehicle</span>
        <span><kbd>M</kbd> · <kbd>Q</kbd> · <kbd>P</kbd></span><span>Mute · Graphics quality · FPS</span>
      </div>
    </div>`;
  root.appendChild(wrap);
  return new Promise((resolve) => {
    const done = (reset: boolean) => {
      wrap.classList.add('hide');
      setTimeout(() => wrap.remove(), 700);
      resolve({ reset });
    };
    wrap.querySelector('.play')!.addEventListener('click', () => done(false));
    wrap.querySelector('.reset')?.addEventListener('click', () => {
      if (confirm('Erase your island and start over?')) done(true);
    });
  });
}
