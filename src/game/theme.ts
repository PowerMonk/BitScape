/** Flat-cartoon design tokens used by the canvas renderer. */

export const THEME = {
  ink: '#26344A',
  inkSoft: '#4A5A73',
  paper: '#FBF7EF',
  white: '#FFFFFF',
  floor: '#E9F0F5',
  floorAlt: '#DFE9F0',
  trace: '#C3D6E2',
  traceLit: '#3EC6C2',
  zoneIn: '#D8ECFB',
  zoneInEdge: '#7EC2E8',
  zoneProc: '#E6E1FA',
  zoneProcEdge: '#9C8CE8',
  zoneOut: '#DCF5E6',
  zoneOutEdge: '#6FCB94',
  cyan: '#3EC6C2',
  pink: '#FF6FA5',
  amber: '#FFB23F',
  violet: '#8B7BE8',
  green: '#5BC97F',
  red: '#F2645A',
  sky: '#7EC2E8',
  cream: '#FFE9C7',
  shadow: 'rgba(38, 52, 74, 0.16)',
  glass: 'rgba(255,255,255,0.72)',
} as const;

export type Theme = typeof THEME;

/** Per-device accent palettes (accent = signature colour of the room). */
export type RoomPalette = {
  accent: string;
  accentSoft: string;
  floorTint: string;
  propA: string;
  propB: string;
};

export const PALETTES: Record<string, RoomPalette> = {
  lab: { accent: '#8B7BE8', accentSoft: '#E6E1FA', floorTint: '#E9EEF6', propA: '#FFB23F', propB: '#3EC6C2' },
  tutorial: { accent: '#3EC6C2', accentSoft: '#D6F3F2', floorTint: '#E7F4F4', propA: '#FFB23F', propB: '#8B7BE8' },
  fridge: { accent: '#7EC2E8', accentSoft: '#D8ECFB', floorTint: '#E4F2FB', propA: '#3EC6C2', propB: '#FFB23F' },
  washer: { accent: '#FF6FA5', accentSoft: '#FFE1EC', floorTint: '#FCE9F1', propA: '#8B7BE8', propB: '#3EC6C2' },
  robot: { accent: '#5BC97F', accentSoft: '#DCF5E6', floorTint: '#E7F6ED', propA: '#FFB23F', propB: '#FF6FA5' },
  fan: { accent: '#FFB23F', accentSoft: '#FFE9C7', floorTint: '#FDF3E2', propA: '#3EC6C2', propB: '#8B7BE8' },
};
