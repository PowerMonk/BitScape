export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: 'circle' | 'square' | 'ring';
  gravity: number;
  drag: number;
};

export type BurstOpts = {
  color?: string | string[];
  count?: number;
  speed?: number;
  size?: number;
  life?: number;
  shape?: Particle['shape'];
  gravity?: number;
  spread?: number;
  angle?: number;
};

/**
 * Tiny particle system for juice: dust puffs when walking,
 * sparks on connections, celebratory confetti on a repair.
 */
export class Particles {
  private items: Particle[] = [];
  reducedMotion = false;

  burst(x: number, y: number, opts: BurstOpts = {}) {
    if (this.reducedMotion) return;
    const count = opts.count ?? 12;
    const colors = Array.isArray(opts.color) ? opts.color : [opts.color ?? '#FFFFFF'];
    const spread = opts.spread ?? Math.PI * 2;
    const base = opts.angle ?? 0;
    for (let i = 0; i < count; i++) {
      const a = base + (Math.random() - 0.5) * spread;
      const sp = (opts.speed ?? 90) * (0.45 + Math.random() * 0.75);
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        maxLife: (opts.life ?? 0.7) * (0.7 + Math.random() * 0.6),
        size: (opts.size ?? 5) * (0.6 + Math.random() * 0.8),
        color: colors[(Math.random() * colors.length) | 0],
        shape: opts.shape ?? 'circle',
        gravity: opts.gravity ?? 60,
        drag: 2.4,
      });
    }
    if (this.items.length > 400) this.items.splice(0, this.items.length - 400);
  }

  update(dt: number) {
    const arr = this.items;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        arr.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.items) {
      const t = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'square') {
        const s = p.size * t;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.4 - t * 0.6), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  clear() {
    this.items.length = 0;
  }
}
