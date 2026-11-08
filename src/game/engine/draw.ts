import { THEME } from '../theme';

export const FONT_STACK =
  "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export type BoxOpts = {
  fill?: string;
  stroke?: string;
  lw?: number;
  r?: number;
  shadow?: boolean;
};

/** Rounded rect with the signature thick cartoon outline. */
export function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  o: BoxOpts = {},
) {
  ctx.save();
  if (o.shadow !== false) {
    ctx.shadowColor = THEME.shadow;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 4;
  }
  rr(ctx, x, y, w, h, o.r ?? 10);
  if (o.fill) {
    ctx.fillStyle = o.fill;
    ctx.fill();
  }
  ctx.shadowColor = 'transparent';
  if (o.stroke !== 'none') {
    ctx.strokeStyle = o.stroke ?? THEME.ink;
    ctx.lineWidth = o.lw ?? 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

export type TextAlign = CanvasTextAlign;
export type TextOpts = {
  size?: number;
  color?: string;
  align?: TextAlign;
  baseline?: CanvasTextBaseline;
  weight?: number;
  maxWidth?: number;
  letterSpacing?: number;
};

export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  o: TextOpts = {},
) {
  ctx.save();
  ctx.fillStyle = o.color ?? THEME.ink;
  ctx.font = `${o.weight ?? 700} ${o.size ?? 16}px ${FONT_STACK}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
  if (o.maxWidth) ctx.fillText(str, x, y, o.maxWidth);
  else ctx.fillText(str, x, y);
  ctx.restore();
}

/** Word-wrapped text inside a width; returns the drawn height. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  maxWidth: number,
  o: TextOpts = {},
): number {
  const size = o.size ?? 16;
  const weight = o.weight ?? 600;
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  ctx.fillStyle = o.color ?? THEME.ink;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
  const lineH = size * 1.35;
  const words = str.split(/\s+/);
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, yy);
    yy += lineH;
  }
  ctx.restore();
  return yy - y;
}

export function shadowEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha = 0.18,
) {
  ctx.save();
  ctx.fillStyle = `rgba(38,52,74,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Run fn with a soft glow (used sparingly for interactive elements). */
export function withGlow(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
  fn: () => void,
) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

export function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
  lw = 2.5,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
}

/** Small icon glyphs drawn procedurally (no sprite sheets). */
export function icon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, s: number, color = THEME.ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.14);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const h = s / 2;
  switch (name) {
    case 'thermo': {
      rr(ctx, -h * 0.35, -h, h * 0.7, h * 1.4, h * 0.35);
      ctx.stroke();
      dot(ctx, 0, h * 0.7, h * 0.5, color);
      break;
    }
    case 'distance': {
      ctx.beginPath();
      ctx.arc(-h * 0.7, 0, h * 0.35, -0.9, 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(h * 0.1, -h * 0.7);
      ctx.lineTo(h * 0.7, 0);
      ctx.lineTo(h * 0.1, h * 0.7);
      ctx.stroke();
      break;
    }
    case 'motion': {
      ctx.beginPath();
      ctx.moveTo(-h, -h * 0.4);
      ctx.lineTo(h * 0.2, -h * 0.4);
      ctx.moveTo(-h, h * 0.1);
      ctx.lineTo(h * 0.5, h * 0.1);
      ctx.moveTo(-h, h * 0.6);
      ctx.lineTo(0, h * 0.6);
      ctx.stroke();
      break;
    }
    case 'button': {
      dot(ctx, 0, 0, h * 0.75, 'transparent', color, 3);
      dot(ctx, 0, 0, h * 0.3, color);
      break;
    }
    case 'motor': {
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * h * 0.7, Math.sin(a) * h * 0.7);
      }
      ctx.stroke();
      break;
    }
    case 'led': {
      ctx.beginPath();
      ctx.moveTo(-h * 0.4, h * 0.5);
      ctx.lineTo(-h * 0.4, -h * 0.1);
      ctx.quadraticCurveTo(0, -h, h * 0.4, -h * 0.1);
      ctx.lineTo(h * 0.4, h * 0.5);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'chip': {
      rr(ctx, -h * 0.7, -h * 0.7, h * 1.4, h * 1.4, 3);
      ctx.stroke();
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(-h, i * h * 0.35);
        ctx.lineTo(-h * 0.7, i * h * 0.35);
        ctx.moveTo(h * 0.7, i * h * 0.35);
        ctx.lineTo(h, i * h * 0.35);
        ctx.stroke();
      }
      break;
    }
    case 'check': {
      ctx.beginPath();
      ctx.moveTo(-h * 0.7, 0);
      ctx.lineTo(-h * 0.15, h * 0.55);
      ctx.lineTo(h * 0.75, -h * 0.55);
      ctx.stroke();
      break;
    }
    case 'x': {
      ctx.beginPath();
      ctx.moveTo(-h * 0.6, -h * 0.6);
      ctx.lineTo(h * 0.6, h * 0.6);
      ctx.moveTo(h * 0.6, -h * 0.6);
      ctx.lineTo(-h * 0.6, h * 0.6);
      ctx.stroke();
      break;
    }
    case 'lock': {
      rr(ctx, -h * 0.7, -h * 0.1, h * 1.4, h * 1.1, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -h * 0.1, h * 0.45, Math.PI, 0);
      ctx.stroke();
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}
