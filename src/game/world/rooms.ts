import { DICT, type Bi } from '../../i18n/dict';
import { PALETTES } from '../theme';
import type { LevelId } from '../types';
import { LEVELS, LEVEL_ORDER } from '../../data/levels';
import type { RoomDef, Hotspot, PropDef, ExteriorState } from './room';

export type LevelRoomLabels = { sensor: Bi; mcu: Bi; actuator: Bi; monitor: Bi };

/**
 * Shared top-down room for every device: three zones on the left
 * (Entrada -> Procesamiento -> Salida) and the exterior window on the right.
 */
export function makeLevelRoom(
  id: string,
  paletteKey: string,
  labels: LevelRoomLabels,
  windowKind: ExteriorState['kind'],
): RoomDef {
  const palette = PALETTES[paletteKey] ?? PALETTES.lab;
  void windowKind;
  return {
    id,
    palette,
    bounds: { x: 30, y: 84, w: 576, h: 366 },
    zones: [
      { id: 'in', x: 44, y: 140, w: 170, h: 260, tint: '#D8ECFB', edge: '#7EC2E8', label: { es: 'Entrada', en: 'Input' } },
      { id: 'proc', x: 234, y: 140, w: 170, h: 260, tint: '#E6E1FA', edge: '#9C8CE8', label: { es: 'Procesamiento', en: 'Processing' } },
      { id: 'out', x: 424, y: 140, w: 170, h: 260, tint: '#DCF5E6', edge: '#6FCB94', label: { es: 'Salida', en: 'Output' } },
    ],
    solids: [
      { x: 648, y: 84, w: 288, h: 366 },
      { x: 99, y: 190, w: 60, h: 100 },
      { x: 274, y: 200, w: 90, h: 90 },
      { x: 464, y: 205, w: 90, h: 85 },
    ],
    props: [
      { kind: 'sensorTower', x: 99, y: 190, w: 60, h: 100, color: '#FFFFFF', accent: palette.accent },
      { kind: 'chipBuilding', x: 274, y: 200, w: 90, h: 90, color: palette.propB, accent: palette.accent },
      { kind: 'machine', x: 464, y: 205, w: 90, h: 85, color: palette.propA, accent: palette.accent },
      { kind: 'vent', x: 44, y: 96, w: 70, h: 26, color: '#D7E1EC' },
      { kind: 'crate', x: 545, y: 402, w: 44, h: 40, color: '#E4D6BE' },
      { kind: 'crate', x: 44, y: 410, w: 36, h: 34, color: '#E4D6BE' },
    ],
    hotspots: [
      { id: 'sensor', x: 129, y: 344, r: 46, label: labels.sensor, icon: 'thermo', role: 'sensor', kind: 'entry' },
      { id: 'mcu', x: 319, y: 344, r: 46, label: labels.mcu, icon: 'chip', role: 'mcu', kind: 'wiring' },
      { id: 'actuator', x: 509, y: 344, r: 46, label: labels.actuator, icon: 'motor', role: 'actuator', kind: 'test' },
      { id: 'monitor', x: 630, y: 268, r: 48, label: labels.monitor, icon: 'led', role: 'monitor', kind: 'program' },
    ],
    spawn: { x: 319, y: 430 },
  };
}

/**
 * Central lab: one cabinet per device plus the encyclopedia terminal.
 *
 * The layout is derived from LEVEL_ORDER — never from a hand-written
 * position list, so adding a device can no longer leave a cabinet (and its
 * collision solid) with `x: undefined`.
 */
export function makeLabRoom(
  unlocked: LevelId[],
  results: Partial<Record<LevelId, { score: number }>>,
): RoomDef {
  const CABINET_W = 150;
  const CABINET_H = 140;
  const GAP = 27;
  const X0 = 55;
  const xs = LEVEL_ORDER.map((_, i) => X0 + i * (CABINET_W + GAP));
  const props: PropDef[] = [];
  const hotspots: Hotspot[] = [];

  LEVEL_ORDER.forEach((id, i) => {
    const level = LEVELS[id];
    const active = !!results[id];
    const locked = !unlocked.includes(id);
    const x = xs[i];
    props.push({
      kind: 'cabinet',
      x,
      y: 120,
      w: CABINET_W,
      h: CABINET_H,
      color: PALETTES[level.palette].accent,
      accent: PALETTES[level.palette].propB,
      label: locked ? DICT['common.locked'] : level.device,
      level: id,
      active,
      locked,
    });
    hotspots.push({
      id: `device-${id}`,
      x: x + CABINET_W / 2,
      y: 312,
      r: 52,
      label: locked ? DICT['common.locked'] : level.device,
      icon: locked ? 'lock' : active ? 'check' : 'chip',
      role: 'device',
      kind: 'device',
      device: id,
    });
  });

  props.push({
    kind: 'terminal',
    x: 55,
    y: 356,
    w: 150,
    h: 96,
    color: '#FFE9C7',
    accent: '#FFB23F',
    label: DICT['menu.encyclopedia'],
  });
  hotspots.push({
    id: 'encyclopedia',
    x: 130,
    y: 462,
    r: 44,
    label: DICT['menu.encyclopedia'],
    icon: 'chip',
    role: 'info',
    kind: 'info',
  });

  props.push({ kind: 'crate', x: 860, y: 380, w: 56, h: 50, color: '#E4D6BE' });
  props.push({ kind: 'vent', x: 840, y: 90, w: 74, h: 26, color: '#D7E1EC' });

  return {
    id: 'lab',
    palette: PALETTES.lab,
    bounds: { x: 30, y: 84, w: 900, h: 382 },
    zones: [],
    solids: [
      ...props
        .filter((p) => p.kind === 'cabinet' || p.kind === 'terminal')
        .map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h })),
      { x: 860, y: 380, w: 56, h: 50 },
    ],
    props,
    hotspots,
    spawn: { x: 480, y: 440 },
  };
}
