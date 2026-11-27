export const STAGE_W = 900;
export const STAGE_H = 1600;

export const FIXED_DT = 1 / 60;
export const PHYSICS_SUBSTEPS = 4;

export const GRAVITY = 1520; // px/s^2 — crisp, buoyant cartoon basketball arc
export const AIR_DRAG = 0.08; // gentle air damping
export const BALL_RADIUS = 33;
export const RIM_TUBE_RADIUS = 13;
export const DEFAULT_RIM_WIDTH = 128;
export const DEFAULT_TILE_SIZE = 54;
export const DEFAULT_RESTITUTION = 0.78;
export const RIM_RESTITUTION = 0.72;
export const WALL_RESTITUTION = 0.76;
export const STAR_BUMPER_RADIUS = 29;
export const STAR_BUMPER_RESTITUTION = 1.04;
export const OCEAN_Y = 1490;

export const CHARGE_CYCLE_DURATION = 1.15; // seconds from 0 -> 100%

export const COLORS = {
  outline: '#331c0e',
  outlineDark: '#261207',
  creamHalo: '#fff9eb',
  creamCard: '#fdf7ec',
  skyTop: '#f5985f',
  skyMid: '#fcb967',
  skyBot: '#fee07b',
  skyDot: 'rgba(170, 94, 42, 0.34)',
  sun: 'rgba(255, 243, 176, 0.56)',
  sunCloud: 'rgba(255, 248, 214, 0.62)',
  palm: '#d86342',
  palmLight: '#f6c38d',
  sand: '#f7c962',
  oceanLight: '#6ad9cf',
  oceanMid: '#46c4bc',
  oceanShimmer: 'rgba(255, 255, 255, 0.42)',
  tileCyan: '#2ad3c9',
  tileCoral: '#f3704b',
  tileCream: '#f9f1d5',
  rimCyan: '#3ae3da',
  rimHighlight: '#b9fffb',
  netWhite: '#ffffff',
  hudCyan: '#2ed1c8',
  hudCoral: '#f16c44',
  hudGold: '#f7c143',
  ballBlue: '#4ba3ff',
  ballHighlight: '#9ce2ff',
  pinkOcto: '#ff5d94',
  pinkOctoDark: '#de3a75',
} as const;

export interface OctoFrameMeta {
  w: number;
  h: number;
  headTopY: number;
  bodyBottomY: number;
}

/** Exact anchor metrics measured from sliced transparent octopus sprites */
export const OCTO_FRAMES: OctoFrameMeta[] = [
  { w: 158, h: 161, headTopY: 2.6, bodyBottomY: 157.0 },
  { w: 178, h: 152, headTopY: 2.6, bodyBottomY: 147.2 },
  { w: 202, h: 126, headTopY: 2.6, bodyBottomY: 120.6 },
  { w: 244, h: 116, headTopY: 2.6, bodyBottomY: 108.2 },
  { w: 220, h: 124, headTopY: 32.2, bodyBottomY: 116.0 },
  { w: 262, h: 112, headTopY: 25.0, bodyBottomY: 104.5 },
];

/** Draw scale applied to the octopus sprites in-game */
export const OCTO_DRAW_SCALE = 0.72;
