import type { Bi } from '../../i18n/dict';
import type { RoomPalette } from '../theme';
import { THEME } from '../theme';
import { box, rr, text, dot, icon, shadowEllipse, wrapText } from '../engine/draw';
import type { LevelId } from '../types';

export type Rect = { x: number; y: number; w: number; h: number };
export type ZoneDef = { id: string; x: number; y: number; w: number; h: number; tint: string; edge: string; label: Bi };

export type PropKind =
  | 'sensorTower'
  | 'chipBuilding'
  | 'machine'
  | 'window'
  | 'cabinet'
  | 'terminal'
  | 'crate'
  | 'vent';

export type PropDef = {
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  accent?: string;
  label?: Bi;
  level?: LevelId;
  active?: boolean;
  locked?: boolean;
};

export type HotspotRole = 'sensor' | 'mcu' | 'actuator' | 'monitor' | 'device' | 'info';

export type Hotspot = {
  id: string;
  x: number;
  y: number;
  r: number;
  label: Bi;
  icon: string;
  role: HotspotRole;
  kind: 'entry' | 'wiring' | 'program' | 'test' | 'device' | 'info';
  device?: LevelId;
};

export type RoomDef = {
  id: string;
  palette: RoomPalette;
  bounds: Rect;
  zones: ZoneDef[];
  solids: Rect[];
  props: PropDef[];
  hotspots: Hotspot[];
  spawn: { x: number; y: number };
  window?: Rect;
};

/** Live state of the "outside world" preview shown in the room window. */
export type ExteriorState = {
  kind: 'board' | 'fridge' | 'washer' | 'robot' | 'fan';
  active: boolean;
  values: Record<string, number | boolean>;
};

/* ------------------------------------------------------------------ */
/* Background (built once per room, blitted every frame)               */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildBackground(room: RoomDef): HTMLCanvasElement {
  const S = 2;
  const cv = document.createElement('canvas');
  cv.width = 960 * S;
  cv.height = 540 * S;
  const ctx = cv.getContext('2d')!;
  ctx.scale(S, S);
  const pal = room.palette;
  const rnd = mulberry32(room.id.length * 7919 + 13);

  // floor slab
  box(ctx, 16, 64, 928, 412, { fill: pal.floorTint, r: 22, lw: 4 });

  // grid
  ctx.save();
  rr(ctx, 16, 64, 928, 412, 22);
  ctx.clip();
  ctx.strokeStyle = 'rgba(38,52,74,0.07)';
  ctx.lineWidth = 1;
  for (let x = 32; x < 960; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x, 476);
    ctx.stroke();
  }
  for (let y = 80; y < 476; y += 32) {
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(944, y);
    ctx.stroke();
  }

  // decorative circuit traces
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 14; i++) {
    const sx = 40 + rnd() * 860;
    const sy = 84 + rnd() * 370;
    const len = 60 + rnd() * 140;
    const dir = rnd() < 0.5 ? 1 : -1;
    ctx.strokeStyle = 'rgba(38,52,74,0.10)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + len * 0.5, sy);
    ctx.lineTo(sx + len * 0.5, sy + dir * 40);
    ctx.lineTo(sx + len, sy + dir * 40);
    ctx.stroke();
    ctx.strokeStyle = pal.accent + '44';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    dot(ctx, sx, sy, 4, pal.accent + '66', THEME.ink, 1.5);
    dot(ctx, sx + len, sy + dir * 40, 4, pal.accent + '66', THEME.ink, 1.5);
  }
  ctx.restore();

  // zone platforms
  for (const z of room.zones) {
    ctx.save();
    ctx.shadowColor = THEME.shadow;
    ctx.shadowOffsetY = 5;
    rr(ctx, z.x, z.y, z.w, z.h, 16);
    ctx.fillStyle = z.tint;
    ctx.fill();
    ctx.restore();
    rr(ctx, z.x, z.y, z.w, z.h, 16);
    ctx.strokeStyle = z.edge;
    ctx.lineWidth = 3;
    ctx.stroke();
    // inner dashes
    ctx.save();
    ctx.setLineDash([7, 7]);
    rr(ctx, z.x + 7, z.y + 7, z.w - 14, z.h - 14, 11);
    ctx.strokeStyle = z.edge + '99';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    text(ctx, z.label[LANG].toUpperCase(), z.x + z.w / 2, z.y + 26, {
      size: 13,
      weight: 800,
      align: 'center',
      color: THEME.inkSoft,
      maxWidth: z.w - 20,
    });
  }

  // window frame
  if (room.window) {
    const w = room.window;
    box(ctx, w.x, w.y, w.w, w.h, { fill: '#1D2A3D', r: 18, lw: 4 });
    ctx.save();
    rr(ctx, w.x + 8, w.y + 8, w.w - 16, w.h - 16, 12);
    ctx.clip();
    const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
    g.addColorStop(0, '#2A3B54');
    g.addColorStop(1, '#151F2E');
    ctx.fillStyle = g;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.restore();
    text(ctx, LANG === 'es' ? 'VISTA EXTERIOR' : 'OUTSIDE VIEW', w.x + w.w / 2, w.y - 8, {
      size: 12,
      weight: 800,
      align: 'center',
      color: THEME.inkSoft,
      letterSpacing: 1,
    });
  }

  return cv;
}

/** Language used for canvas-drawn static labels; re-built on language switch. */
export let LANG: 'es' | 'en' = 'es';
export function setCanvasLang(l: 'es' | 'en') {
  LANG = l;
}

/* ------------------------------------------------------------------ */
/* Live props                                                          */
/* ------------------------------------------------------------------ */

export function drawProp(
  ctx: CanvasRenderingContext2D,
  p: PropDef,
  time: number,
  pal: RoomPalette,
  exterior?: ExteriorState,
) {
  const { x, y, w, h } = p;
  switch (p.kind) {
    case 'sensorTower': {
      shadowEllipse(ctx, x + w / 2, y + h + 4, w * 0.45, 7);
      box(ctx, x, y + h * 0.35, w, h * 0.65, { fill: p.color, r: 10 });
      box(ctx, x + w * 0.18, y, w * 0.64, h * 0.5, { fill: THEME.white, r: 12 });
      const blink = (Math.sin(time * 3) + 1) / 2;
      dot(ctx, x + w / 2, y + h * 0.22, 6 + blink * 2, p.accent ?? THEME.cyan, THEME.ink, 2.5);
      ctx.save();
      ctx.globalAlpha = 0.35 + blink * 0.4;
      ctx.strokeStyle = p.accent ?? THEME.cyan;
      ctx.lineWidth = 2.5;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.22, 10 + i * 7 + blink * 3, -0.7, 0.7);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'chipBuilding': {
      shadowEllipse(ctx, x + w / 2, y + h + 4, w * 0.5, 7);
      // pins
      ctx.strokeStyle = THEME.ink;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const py = y + 16 + i * ((h - 32) / 3);
        ctx.beginPath();
        ctx.moveTo(x - 9, py);
        ctx.lineTo(x, py);
        ctx.moveTo(x + w, py);
        ctx.lineTo(x + w + 9, py);
        ctx.stroke();
      }
      box(ctx, x, y, w, h, { fill: p.color, r: 12 });
      const pulse = (Math.sin(time * 2.4) + 1) / 2;
      box(ctx, x + 14, y + 14, w - 28, h - 28, {
        fill: p.accent ?? THEME.violet,
        r: 8,
        lw: 3,
      });
      ctx.save();
      ctx.globalAlpha = 0.55 + pulse * 0.45;
      text(ctx, 'MCU', x + w / 2, y + h / 2 + 6, {
        size: 17,
        weight: 900,
        align: 'center',
        color: THEME.white,
      });
      ctx.restore();
      break;
    }
    case 'machine': {
      shadowEllipse(ctx, x + w / 2, y + h + 4, w * 0.5, 7);
      box(ctx, x, y, w, h, { fill: p.color, r: 12 });
      box(ctx, x + 12, y + 12, w - 24, h * 0.4, { fill: THEME.white, r: 8, lw: 2.5 });
      const spin = time * 4;
      ctx.save();
      ctx.translate(x + w / 2, y + h * 0.68);
      ctx.rotate(spin);
      ctx.fillStyle = p.accent ?? THEME.amber;
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.ellipse(9, 0, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = THEME.ink;
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'cabinet': {
      shadowEllipse(ctx, x + w / 2, y + h + 5, w * 0.5, 8);
      box(ctx, x, y, w, h, { fill: p.active ? p.color : '#CFD8E3', r: 14 });
      // screen
      const screenOn = p.active;
      box(ctx, x + 16, y + 16, w - 32, h * 0.42, {
        fill: screenOn ? '#1D2A3D' : '#B9C4D2',
        r: 8,
        lw: 2.5,
      });
      if (screenOn) {
        const sweep = ((time * 0.35) % 1);
        ctx.save();
        rr(ctx, x + 20, y + 20, w - 40, h * 0.42 - 8, 6);
        ctx.clip();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = p.accent ?? THEME.cyan;
        ctx.fillRect(x + 20, y + 20 + sweep * (h * 0.42 - 8), w - 40, 6);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = p.accent ?? THEME.cyan;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const px = x + 24 + (i / 12) * (w - 48);
          const py =
            y + 20 + (h * 0.42 - 8) / 2 +
            Math.sin(i * 0.9 + time * 2) * (h * 0.42 - 8) * 0.28;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
      // status LED
      dot(
        ctx,
        x + w - 24,
        y + h - 24,
        8,
        p.active ? THEME.green : THEME.red,
        THEME.ink,
        2.5,
      );
      if (!p.active && Math.sin(time * 6) > 0.4) {
        ctx.save();
        ctx.strokeStyle = THEME.red;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w - 24, y + h - 46);
        ctx.lineTo(x + w - 18, y + h - 36);
        ctx.lineTo(x + w - 28, y + h - 32);
        ctx.stroke();
        ctx.restore();
      }
      if (p.label) {
        text(ctx, p.label[LANG], x + w / 2, y + h + 22, {
          size: 14,
          weight: 800,
          align: 'center',
          color: THEME.ink,
          maxWidth: w + 60,
        });
      }
      break;
    }
    case 'terminal': {
      shadowEllipse(ctx, x + w / 2, y + h + 4, w * 0.45, 7);
      box(ctx, x, y + h * 0.3, w, h * 0.7, { fill: p.color, r: 10 });
      box(ctx, x + 10, y, w - 20, h * 0.42, { fill: '#1D2A3D', r: 8, lw: 3 });
      const blink = (Math.sin(time * 2) + 1) / 2;
      ctx.save();
      ctx.globalAlpha = 0.4 + blink * 0.6;
      text(ctx, 'i', x + w / 2, y + h * 0.26, {
        size: h * 0.26,
        weight: 900,
        align: 'center',
        color: THEME.amber,
      });
      ctx.restore();
      if (p.label) {
        text(ctx, p.label[LANG], x + w / 2, y + h + 22, {
          size: 13,
          weight: 800,
          align: 'center',
          color: THEME.ink,
          maxWidth: w + 40,
        });
      }
      break;
    }
    case 'crate': {
      shadowEllipse(ctx, x + w / 2, y + h + 4, w * 0.4, 6);
      box(ctx, x, y, w, h, { fill: p.color, r: 8 });
      ctx.strokeStyle = THEME.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + w - 8, y + h - 8);
      ctx.moveTo(x + w - 8, y + 8);
      ctx.lineTo(x + 8, y + h - 8);
      ctx.stroke();
      break;
    }
    case 'vent': {
      box(ctx, x, y, w, h, { fill: p.color, r: 8, lw: 2.5 });
      ctx.strokeStyle = 'rgba(38,52,74,0.35)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 6, y + (h / 5) * i);
        ctx.lineTo(x + w - 6, y + (h / 5) * i);
        ctx.stroke();
      }
      break;
    }
    case 'window':
      break;
  }
  void pal;
  void exterior;
}

/* ------------------------------------------------------------------ */
/* Exterior window content                                             */
/* ------------------------------------------------------------------ */

export function drawExterior(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  st: ExteriorState,
  time: number,
) {
  const pad = 14;
  const x = r.x + pad;
  const y = r.y + pad;
  const w = r.w - pad * 2;
  const h = r.h - pad * 2;
  ctx.save();
  rr(ctx, x, y, w, h, 10);
  ctx.clip();

  const label = (s: string) =>
    text(ctx, s, x + 12, y + 24, { size: 13, weight: 800, color: '#9FB4CC' });

  const gauge = (value: number, max: number, color: string, caption: string, unit: string) => {
    const gw = w - 24;
    const gh = 16;
    const gy = y + h - 56;
    box(ctx, x + 12, gy, gw, gh, { fill: '#0E1622', r: 8, lw: 2, stroke: '#3A4C66', shadow: false });
    const frac = Math.max(0, Math.min(1, value / max));
    if (frac > 0) {
      box(ctx, x + 14, gy + 2, (gw - 4) * frac, gh - 4, { fill: color, r: 6, shadow: false, stroke: 'none' });
    }
    text(ctx, `${caption}: ${Math.round(value)}${unit}`, x + 12, gy - 8, {
      size: 14,
      weight: 800,
      color: '#E7EEF7',
    });
  };

  const statusPill = (ok: boolean, msg: string) => {
    const pw = Math.min(w - 24, 8 + ctx.measureText(msg).width + 60);
    box(ctx, x + 12, y + h - 34, pw, 24, {
      fill: ok ? THEME.green : THEME.red,
      r: 12,
      lw: 2.5,
      shadow: false,
    });
    text(ctx, msg, x + 24, y + h - 17, { size: 13, weight: 800, color: THEME.white });
  };

  switch (st.kind) {
    case 'board': {
      label(LANG === 'es' ? 'PLACA DE PRUEBAS' : 'TEST BOARD');
      const pressed = !!st.values.pressed;
      const led = !!st.values.led;
      const cx = x + w / 2;
      const cy = y + h / 2 - 6;
      box(ctx, cx - 90, cy - 44, 180, 96, { fill: '#E9F0F5', r: 12, lw: 3 });
      // button
      dot(ctx, cx - 46, cy + 6, 20, pressed ? '#FF9AA9' : THEME.pink, THEME.ink, 3);
      text(ctx, LANG === 'es' ? 'BOTÓN' : 'BUTTON', cx - 46, cy + 46, {
        size: 11,
        weight: 800,
        align: 'center',
        color: '#9FB4CC',
      });
      // led
      ctx.save();
      if (led) {
        ctx.shadowColor = THEME.amber;
        ctx.shadowBlur = 24;
      }
      dot(ctx, cx + 46, cy - 4, 17, led ? THEME.amber : '#5A6B82', THEME.ink, 3);
      ctx.restore();
      text(ctx, LANG === 'es' ? 'INDICADOR' : 'INDICATOR', cx + 46, cy + 46, {
        size: 11,
        weight: 800,
        align: 'center',
        color: '#9FB4CC',
      });
      statusPill(led, led ? (LANG === 'es' ? 'ENCENDIDO' : 'ON') : LANG === 'es' ? 'APAGADO' : 'OFF');
      break;
    }
    case 'fridge': {
      label(LANG === 'es' ? 'REFRIGERADOR' : 'REFRIGERATOR');
      const temp = Number(st.values.temp ?? 6);
      const cooling = !!st.values.cooling;
      const bx = x + w - 96;
      const by = y + 34;
      box(ctx, bx, by, 80, h - 110, { fill: cooling ? '#DCE9F6' : '#C9D4E2', r: 12, lw: 3 });
      ctx.strokeStyle = THEME.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx + 40, by + 8);
      ctx.lineTo(bx + 40, by + h - 118);
      ctx.stroke();
      box(ctx, bx + 8, by + 14, 8, 34, { fill: '#9FB4CC', r: 4, lw: 2, shadow: false });
      const fanSpin = cooling ? time * 8 : 0;
      ctx.save();
      ctx.translate(bx - 34, by + 40);
      ctx.rotate(fanSpin);
      ctx.fillStyle = cooling ? THEME.cyan : '#5A6B82';
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.ellipse(11, 0, 11, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = THEME.ink;
      ctx.fill();
      ctx.restore();
      gauge(temp, 12, temp >= 6 ? THEME.red : THEME.cyan, LANG === 'es' ? 'Temperatura' : 'Temperature', ' °C');
      statusPill(cooling, cooling ? (LANG === 'es' ? 'ENFRIANDO' : 'COOLING') : LANG === 'es' ? 'SIN ENFRIAR' : 'IDLE');
      break;
    }
    case 'washer': {
      label(LANG === 'es' ? 'LAVADORA' : 'WASHING MACHINE');
      const door = !!(st.values.door ?? st.values.doorClosed);
      const water = Number(st.values.water ?? 0);
      const motor = !!st.values.motor;
      const step = Number(st.values.step ?? 0);
      const cx = x + 70;
      const cy = y + 46;
      box(ctx, cx - 46, cy, 92, h - 106, { fill: '#E7EDF5', r: 12, lw: 3 });
      // door
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy + 54, 32, 0, Math.PI * 2);
      ctx.fillStyle = '#1D2A3D';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = THEME.ink;
      ctx.stroke();
      ctx.clip();
      ctx.fillStyle = 'rgba(126,194,232,0.55)';
      ctx.fillRect(cx - 34, cy + 54 + (1 - water) * 30, 68, 40);
      const rot = motor ? time * 6 : step >= 4 ? time * 3 : 0;
      ctx.translate(cx, cy + 54);
      ctx.rotate(rot);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(24, 0);
        ctx.stroke();
      }
      ctx.restore();
      dot(ctx, cx + 30, cy + 12, 6, door ? THEME.green : THEME.red, THEME.ink, 2);
      const names =
        LANG === 'es'
          ? ['Revisión', 'Llenado', 'Lavado', 'Desagüe', 'Centrifugado', 'Fin']
          : ['Check', 'Fill', 'Wash', 'Drain', 'Spin', 'Done'];
      text(ctx, `${step + 1}/6 · ${names[Math.min(step, 5)]}`, x + 12, y + h - 74, {
        size: 14,
        weight: 800,
        color: '#E7EEF7',
      });
      gauge(water * 100, 100, THEME.sky, LANG === 'es' ? 'Nivel de agua' : 'Water level', '%');
      statusPill(door, door ? (LANG === 'es' ? 'PUERTA CERRADA' : 'DOOR CLOSED') : LANG === 'es' ? 'PUERTA ABIERTA' : 'DOOR OPEN');
      break;
    }
    case 'robot': {
      label(LANG === 'es' ? 'PISTA DEL ROBOT' : 'ROBOT TRACK');
      const trackY = y + h - 96;
      const trackH = 56;
      box(ctx, x + 12, trackY, w - 24, trackH, { fill: '#0E1622', r: 10, lw: 2.5, stroke: '#3A4C66', shadow: false });
      // obstacles
      const obstacles = [0.42, 0.68, 0.88];
      for (const o of obstacles) {
        const ox = x + 12 + o * (w - 24);
        box(ctx, ox - 8, trackY + 8, 16, trackH - 16, { fill: THEME.pink, r: 4, lw: 2, shadow: false });
      }
      const frac = Number(st.values.x ?? 0);
      const rx = x + 20 + frac * (w - 60);
      const moving = !!st.values.moving;
      box(ctx, rx, trackY + 12, 30, trackH - 24, {
        fill: moving ? THEME.green : '#5A6B82',
        r: 7,
        lw: 2.5,
        shadow: false,
      });
      dot(ctx, rx + 24, trackY + trackH / 2 - 6, 4, THEME.cyan, THEME.ink, 1.5);
      const dist = Number(st.values.dist ?? st.values.distance ?? 60);
      text(ctx, `${LANG === 'es' ? 'Distancia' : 'Distance'}: ${Math.round(dist)} cm`, x + 12, y + 44, {
        size: 15,
        weight: 800,
        color: '#E7EEF7',
      });
      const stopped = !moving || dist < 20;
      statusPill(!stopped || frac < 0.9, stopped ? (LANG === 'es' ? 'DETENIDO' : 'STOPPED') : LANG === 'es' ? 'AVANZANDO' : 'MOVING');
      break;
    }
    case 'fan': {
      label(LANG === 'es' ? 'VENTILADOR' : 'FAN');
      const temp = Number(st.values.temp ?? 25);
      const speed = Number(st.values.speed ?? 0);
      const cx = x + w - 74;
      const cy = y + h / 2 - 18;
      box(ctx, cx - 44, cy - 44, 88, 88, { fill: '#FDF3E2', r: 44, lw: 3 });
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * (2 + speed * 14));
      ctx.fillStyle = speed > 0 ? THEME.amber : '#B9C4D2';
      for (let i = 0; i < 4; i++) {
        ctx.rotate((Math.PI * 2) / 4);
        ctx.beginPath();
        ctx.ellipse(16, 0, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = THEME.ink;
      ctx.fill();
      ctx.restore();
      gauge(temp, 50, temp >= 30 ? THEME.red : THEME.amber, LANG === 'es' ? 'Temperatura' : 'Temperature', ' °C');
      statusPill(speed > 0, speed > 0 ? (LANG === 'es' ? 'ENCENDIDO' : 'ON') : LANG === 'es' ? 'APAGADO' : 'OFF');
      break;
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Hotspot pads                                                        */
/* ------------------------------------------------------------------ */

export function drawHotspot(
  ctx: CanvasRenderingContext2D,
  hs: Hotspot,
  time: number,
  active: boolean,
  near: boolean,
) {
  const pulse = (Math.sin(time * 3.4) + 1) / 2;
  const base = active ? 0.9 : near ? 0.7 : 0.4;

  ctx.save();
  ctx.globalAlpha = base;
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = -time * 14;
  ctx.beginPath();
  ctx.arc(hs.x, hs.y, hs.r - 6, 0, Math.PI * 2);
  ctx.strokeStyle = active ? THEME.amber : THEME.inkSoft;
  ctx.lineWidth = active ? 3.5 : 2.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = (active ? 0.25 : 0.12) + pulse * (active ? 0.25 : 0.1);
  ctx.beginPath();
  ctx.arc(hs.x, hs.y, hs.r - 6, 0, Math.PI * 2);
  ctx.fillStyle = active ? THEME.amber : '#7EC2E8';
  ctx.fill();
  ctx.restore();

  // icon disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(hs.x, hs.y, 17, 0, Math.PI * 2);
  ctx.fillStyle = active ? THEME.amber : THEME.white;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = THEME.ink;
  ctx.stroke();
  ctx.restore();
  icon(ctx, hs.icon, hs.x, hs.y, 17, THEME.ink);

  // floating label pill
  const label = hs.label[LANG];
  ctx.save();
  ctx.font = `800 13px 'Segoe UI', system-ui, sans-serif`;
  const tw = ctx.measureText(label).width;
  const pw = tw + 34;
  const px = hs.x - pw / 2;
  const py = hs.y - hs.r - 30;
  box(ctx, px, py, pw, 24, {
    fill: active ? THEME.ink : 'rgba(255,255,255,0.94)',
    r: 12,
    lw: 2.5,
    shadow: true,
  });
  text(ctx, label, hs.x, py + 16.5, {
    size: 13,
    weight: 800,
    align: 'center',
    color: active ? THEME.white : THEME.ink,
    maxWidth: pw - 14,
  });
  ctx.restore();

  // "E" key hint when the player stands here
  if (near) {
    const hx = hs.x + hs.r - 4;
    const hy = hs.y - hs.r + 4;
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx, hy, 11, 0, Math.PI * 2);
    ctx.fillStyle = THEME.ink;
    ctx.fill();
    ctx.restore();
    text(ctx, 'E', hx, hy + 4.5, { size: 13, weight: 900, align: 'center', color: THEME.white });
  }
}

/** Interaction hint pill drawn near the player when a hotspot is close. */
export function drawPrompt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  time: number,
) {
  const bob = Math.sin(time * 4) * 2;
  ctx.save();
  ctx.font = `800 14px 'Segoe UI', system-ui, sans-serif`;
  const tw = ctx.measureText(label).width;
  const pw = tw + 58;
  const px = x - pw / 2;
  const py = y - 46 + bob;
  box(ctx, px, py, pw, 28, { fill: THEME.ink, r: 14, lw: 0, stroke: 'none' });
  box(ctx, px + 6, py + 4, 20, 20, { fill: THEME.amber, r: 6, lw: 2, shadow: false });
  text(ctx, 'E', px + 16, py + 18.5, { size: 13, weight: 900, align: 'center', color: THEME.ink });
  text(ctx, label, px + 34, py + 19, { size: 14, weight: 800, color: THEME.white });
  ctx.restore();
}

export { wrapText };
