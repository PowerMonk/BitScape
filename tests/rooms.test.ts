import { describe, it, expect } from 'vitest';
import { LEVEL_ORDER, LEVELS } from '../src/data/levels';
import { makeLabRoom, makeLevelRoom } from '../src/game/world/rooms';
import { Player } from '../src/game/world/player';

const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);

describe('lab room layout', () => {
  const room = makeLabRoom(LEVEL_ORDER, {});

  it('places one cabinet per device (five), all with finite coordinates', () => {
    const cabinets = room.props.filter((p) => p.kind === 'cabinet');
    expect(cabinets).toHaveLength(LEVEL_ORDER.length);
    expect(cabinets.map((c) => c.level)).toEqual([...LEVEL_ORDER]);
    for (const p of room.props) {
      expect(finite(p.x), `prop ${p.kind} x`).toBe(true);
      expect(finite(p.y), `prop ${p.kind} y`).toBe(true);
      expect(finite(p.w) && p.w > 0, `prop ${p.kind} w`).toBe(true);
      expect(finite(p.h) && p.h > 0, `prop ${p.kind} h`).toBe(true);
    }
  });

  it('derives every collision solid from finite coordinates', () => {
    expect(room.solids.length).toBeGreaterThanOrEqual(LEVEL_ORDER.length + 1);
    for (const s of room.solids) {
      expect(finite(s.x) && finite(s.y) && finite(s.w) && finite(s.h), JSON.stringify(s)).toBe(true);
      expect(s.w).toBeGreaterThan(0);
      expect(s.h).toBeGreaterThan(0);
    }
  });

  it('gives every device a reachable hotspot inside the walkable bounds', () => {
    const devices = room.hotspots.filter((h) => h.role === 'device');
    expect(devices).toHaveLength(LEVEL_ORDER.length);
    for (const h of room.hotspots) {
      expect(finite(h.x) && finite(h.y), `hotspot ${h.id}`).toBe(true);
      expect(h.x).toBeGreaterThan(room.bounds.x);
      expect(h.x).toBeLessThan(room.bounds.x + room.bounds.w);
      expect(h.y).toBeGreaterThan(room.bounds.y);
      expect(h.y).toBeLessThan(room.bounds.y + room.bounds.h);
    }
    // pads must not overlap each other (52 + 52 radius)
    for (let i = 0; i < devices.length; i++) {
      for (let j = i + 1; j < devices.length; j++) {
        const d = Math.hypot(devices[i].x - devices[j].x, devices[i].y - devices[j].y);
        expect(d, `pads ${i}/${j}`).toBeGreaterThan(110);
      }
    }
  });

  it('keeps the spawn clear of every solid', () => {
    const { spawn } = room;
    for (const s of room.solids) {
      const inside =
        spawn.x > s.x - 14 && spawn.x < s.x + s.w + 14 && spawn.y > s.y - 14 && spawn.y < s.y + s.h + 14;
      expect(inside, `spawn overlaps ${JSON.stringify(s)}`).toBe(false);
    }
  });
});

describe('device rooms', () => {
  for (const id of LEVEL_ORDER) {
    it(`${id}: solids are all finite and inside the bounds`, () => {
      const room = makeLevelRoom(`level-${id}`, LEVELS[id].palette, LEVELS[id].hotspot, LEVELS[id].windowKind);
      for (const s of room.solids) {
        expect(finite(s.x) && finite(s.y) && finite(s.w) && finite(s.h), JSON.stringify(s)).toBe(true);
      }
      expect(room.spawn.x).toBeGreaterThan(room.bounds.x);
      expect(room.spawn.x).toBeLessThan(room.bounds.x + room.bounds.w);
    });
  }
});

describe('player collision robustness', () => {
  const bounds = { x: 30, y: 84, w: 900, h: 382 };
  const keys = { up: false, down: false, left: false, right: true };

  it('keeps walking right when a malformed (NaN) solid is in the list', () => {
    // Regression: the lab's 5th cabinet once had x: undefined, which made the
    // overlap test fail open, pushed the player to NaN and snapped it to the
    // left wall — the "choppy jumping" lab movement.
    const solids = [
      { x: 55, y: 120, w: 175, h: 140 },
      { y: 120, w: 175, h: 140 } as { x: number; y: number; w: number; h: number },
      { x: 55, y: 356, w: 150, h: 96 },
    ];
    const p = new Player(480, 440);
    for (let i = 0; i < 30; i++) p.update(0.016, keys, bounds, solids);

    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(p.x, 'must travel right, not snap to a wall').toBeGreaterThan(520);
    expect(p.x).toBeLessThan(bounds.x + bounds.w);
  });

  it('is not pushed around by zero-size solids either', () => {
    const p = new Player(480, 440);
    const solids = [
      { x: 0, y: 0, w: 0, h: 0 },
      { x: Number.NaN, y: 0, w: 10, h: 10 },
    ];
    for (let i = 0; i < 20; i++) p.update(0.016, keys, bounds, solids);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(p.x).toBeGreaterThan(500);
  });
});
