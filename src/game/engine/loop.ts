export type Loop = {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
};

/**
 * requestAnimationFrame loop with a clamped delta so tab-switches
 * never teleport the player. update() runs at frame rate; render()
 * receives the same dt.
 */
export function createLoop(update: (dt: number) => void, render: (dt: number) => void): Loop {
  const MAX_DT = 0.05;
  let raf = 0;
  let last = 0;
  let running = false;

  const frame = (now: number) => {
    if (!running) return;
    const dt = last === 0 ? 0 : Math.min((now - last) / 1000, MAX_DT);
    last = now;
    if (dt > 0) update(dt);
    render(dt);
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    isRunning: () => running,
  };
}
