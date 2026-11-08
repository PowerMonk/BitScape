import { Game } from './game';

function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  const hud = document.getElementById('hud');
  const dialogRoot = document.getElementById('dialog-root');
  const screenRoot = document.getElementById('screen-root');
  const toastRoot = document.getElementById('toast-root');
  const touchRoot = document.getElementById('touch-root');
  if (!canvas || !hud || !dialogRoot || !screenRoot || !toastRoot || !touchRoot) {
    throw new Error('BitScape: missing DOM roots');
  }
  const game = new Game(canvas, hud, dialogRoot, screenRoot, toastRoot, touchRoot);
  game.start();
  // QA hook: lets automated smoke tests drive the game.
  (window as unknown as { __bitscape?: Game }).__bitscape = game;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
