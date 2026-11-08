export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Frame-rate independent approach towards a target. */
export function approach(current: number, target: number, rate: number, dt: number): number {
  const d = target - current;
  if (Math.abs(d) < 0.0005) return target;
  return current + d * (1 - Math.exp(-rate * dt));
}

/** Promise-based sleep used by the test-runner choreography. */
export function sleep(ms: number, reducedMotion = false): Promise<void> {
  const dur = reducedMotion ? Math.min(ms, 30) : ms;
  return new Promise((resolve) => setTimeout(resolve, dur));
}

/** Wave oscillation helper for idle animations. */
export const wave = (time: number, speed = 1, amp = 1) => Math.sin(time * speed) * amp;
