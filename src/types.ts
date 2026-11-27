export type TileColor = 'cyan' | 'coral' | 'cream';

export interface BlockMotion {
  axis: 'x' | 'y';
  range: number;
  period: number;
  phase?: number;
}

export interface BlockCluster {
  id: string;
  /** Top-left position in 900x1600 logical coordinates */
  x: number;
  y: number;
  /** Tile grid dimensions */
  cols: number;
  rows: number;
  /** Optional custom tile size (defaults to 54) */
  tileSize?: number;
  /**
   * Row-major tile colors or null for empty cell (enables staircases!).
   * Length = rows * cols. If omitted, top row = cyan, middle = coral, bottom = cream.
   */
  pattern?: (TileColor | null)[];
  /** Restitution override (defaults to 0.78) */
  restitution?: number;
  /** Optional sinusoidal movement */
  move?: BlockMotion;
}

export interface StarPole {
  /** Center X of the pole & star head */
  x: number;
  /** Center Y of the spiky cyan star head */
  y: number;
  /** Visual pole bottom Y (defaults to 1600) */
  bottomY?: number;
  /** Whether the star head acts as a bouncy bumper (default true) */
  bouncy?: boolean;
}

export interface HoopConfig {
  /** Center X of the hoop opening */
  x: number;
  /** Center Y of the turquoise rim bar */
  y: number;
  /** Inner opening width between left/right rim centers (default 124) */
  rimWidth?: number;
  /** Optional hanging vertical rod above the hoop */
  hangRodTopY?: number;
  /** Optional sinusoidal movement */
  move?: BlockMotion;
}

export interface LevelDef {
  id: number;
  code: string;
  name: string;
  worldName: string;
  /** Reference layout tag */
  layoutTag: string;
  /** Total shots allowed in this level */
  maxShots: number;
  /** Octopus standing position (center X, feet Y resting on block top) */
  octoX: number;
  octoFeetY: number;
  /** Facing direction: 1 = facing/shooting right, -1 = facing/shooting left */
  facing: 1 | -1;
  /** Launch angle in degrees from horizontal (0 = flat, 90 = straight up). Always in (15..85). */
  launchAngleDeg: number;
  /** Min and max launch speed (px/sec) */
  vMin: number;
  vMax: number;
  /** Hoop definition */
  hoop: HoopConfig;
  /** Block clusters (rendered with unified thick cream halo + dark outline) */
  blocks: BlockCluster[];
  /** Cyan star poles */
  starPoles: StarPole[];
  /** Star rating thresholds (max shots used for 3 stars / 2 stars) */
  starShots: { three: number; two: number };
  /** Optional hint text for the level */
  hint?: string;
}

export interface SolidRect {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  restitution: number;
  clusterIndex: number;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  angularVel: number;
  active: boolean;
  scored: boolean;
  passedTopSensor: boolean;
  bounces: number;
  rimHits: number;
  starHits: number;
  flightTime: number;
  lowSpeedTime: number;
  squashX: number;
  squashY: number;
  squashAngle: number;
  squashTimer: number;
}

export interface PhysicsEvent {
  type: 'block' | 'rim' | 'wall' | 'star' | 'score' | 'ocean';
  x: number;
  y: number;
  nx: number;
  ny: number;
  speed: number;
  clusterIndex?: number;
  starIndex?: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  bounced?: boolean;
}

export type GameScreen =
  | 'loading'
  | 'menu'
  | 'levelSelect'
  | 'playing'
  | 'celebrate'
  | 'result'
  | 'versusResult';

export type CharacterSkinId = 'octo' | 'dog' | 'duck';

export interface SaveData {
  unlockedLevel: number;
  starsByLevel: Record<number, number>;
  bestShotsByLevel: Record<number, number>;
  coins: number;
  playerLevel: number;
  muted: boolean;
  showGuide: boolean;
  selectedSkin: CharacterSkinId;
  unlockedSkins: CharacterSkinId[];
  lastCheckInDate: string;
  checkInStreak: number;
}

export interface VersusState {
  enabled: boolean;
  currentPlayer: 1 | 2;
  round: number;
  maxRounds: number;
  scores: [number, number];
  shotsTaken: [number, number];
  levelIndex: number;
}
