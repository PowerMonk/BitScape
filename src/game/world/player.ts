import { approach } from '../engine/tween';

export type PlayerPose = 'down' | 'up' | 'left' | 'right';

const SPEED = 190;
const ACCEL = 16;

export type MoveBounds = { x: number; y: number; w: number; h: number };
export type Solid = { x: number; y: number; w: number; h: number };

/**
 * Top-down avatar: WASD/arrows, click-to-move fallback, circle-vs-AABB
 * collision with wall sliding, squash-and-stretch walk animation.
 */
export class Player {
  x = 0;
  y = 0;
  private vx = 0;
  private vy = 0;
  r = 13;
  pose: PlayerPose = 'down';
  moving = false;
  private walkT = 0;
  private stepT = 0;
  color = '#3EC6C2';
  name = '';
  /** click-to-move target */
  target: { x: number; y: number } | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  teleport(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.target = null;
  }

  update(
    dt: number,
    keys: { up: boolean; down: boolean; left: boolean; right: boolean },
    bounds: MoveBounds,
    solids: Solid[],
    onStep?: (x: number, y: number) => void,
  ) {
    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

    if (dx !== 0 || dy !== 0) {
      this.target = null;
    } else if (this.target) {
      const tx = this.target.x - this.x;
      const ty = this.target.y - this.y;
      const d = Math.hypot(tx, ty);
      if (d < 6) {
        this.target = null;
      } else {
        dx = tx / d;
        dy = ty / d;
      }
    }

    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    const targetVx = dx * SPEED;
    const targetVy = dy * SPEED;
    this.vx = approach(this.vx, targetVx, ACCEL, dt);
    this.vy = approach(this.vy, targetVy, ACCEL, dt);
    if (Math.abs(this.vx) < 0.5) this.vx = 0;
    if (Math.abs(this.vy) < 0.5) this.vy = 0;

    this.moving = Math.abs(this.vx) + Math.abs(this.vy) > 12;

    if (this.moving) {
      if (Math.abs(this.vx) > Math.abs(this.vy)) this.pose = this.vx > 0 ? 'right' : 'left';
      else this.pose = this.vy > 0 ? 'down' : 'up';
      this.walkT += dt * 9;
      this.stepT += dt;
      if (this.stepT > 0.32) {
        this.stepT = 0;
        onStep?.(this.x, this.y + this.r * 0.7);
      }
    } else {
      this.walkT = approach(this.walkT, Math.round(this.walkT / Math.PI) * Math.PI, 8, dt);
    }

    this.moveAxis(this.vx * dt, 0, solids);
    this.moveAxis(0, this.vy * dt, solids);

    this.x = Math.max(bounds.x + this.r, Math.min(bounds.x + bounds.w - this.r, this.x));
    this.y = Math.max(bounds.y + this.r, Math.min(bounds.y + bounds.h - this.r, this.y));
  }

  private moveAxis(dx: number, dy: number, solids: Solid[]) {
    this.x += dx;
    this.y += dy;
    for (const s of solids) {
      const cx = Math.max(s.x, Math.min(this.x, s.x + s.w));
      const cy = Math.max(s.y, Math.min(this.y, s.y + s.h));
      const px = this.x - cx;
      const py = this.y - cy;
      if (px * px + py * py >= this.r * this.r) continue;
      if (dx > 0) this.x = s.x - this.r;
      else if (dx < 0) this.x = s.x + s.w + this.r;
      else if (dy > 0) this.y = s.y - this.r;
      else if (dy < 0) this.y = s.y + s.h + this.r;
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    const bob = this.moving ? Math.abs(Math.sin(this.walkT)) * 2.2 : Math.sin(time * 2) * 0.8;
    const swing = this.moving ? Math.sin(this.walkT) * 4.5 : 0;
    const x = this.x;
    const y = this.y - bob;

    // shadow
    ctx.save();
    ctx.fillStyle = 'rgba(38,52,74,0.18)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.9, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);

    // legs
    ctx.strokeStyle = '#26344A';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5, 9);
    ctx.lineTo(-5 - swing * 0.4, 17);
    ctx.moveTo(5, 9);
    ctx.lineTo(5 + swing * 0.4, 17);
    ctx.stroke();

    // body (suit)
    ctx.beginPath();
    ctx.ellipse(0, 1, 12.5, 13.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#26344A';
    ctx.stroke();

    // chest pack
    ctx.beginPath();
    ctx.ellipse(0, 4, 5.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();

    // head
    ctx.beginPath();
    ctx.arc(0, -12, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#FFE9C7';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();

    // visor / eyes based on facing
    ctx.fillStyle = '#26344A';
    if (this.pose === 'left') {
      ctx.beginPath();
      ctx.ellipse(-4, -12, 3.2, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.pose === 'right') {
      ctx.beginPath();
      ctx.ellipse(4, -12, 3.2, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.pose === 'up') {
      ctx.beginPath();
      ctx.ellipse(0, -14, 8, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#26344A';
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      ctx.ellipse(-4, -12, 2.6, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(4, -12, 2.6, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#26344A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -8, 3.5, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // antenna
    ctx.strokeStyle = '#26344A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(6, -20);
    ctx.lineTo(10, -27);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(10, -27, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6FA5';
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
