import type { LevelDef, TileColor } from './types.ts';

function rectPattern(cols: number, rows: number, rowColors: TileColor[]): TileColor[] {
  const out: TileColor[] = [];
  for (let r = 0; r < rows; r++) {
    const color = rowColors[Math.min(r, rowColors.length - 1)];
    for (let c = 0; c < cols; c++) {
      out.push(color);
    }
  }
  return out;
}

function leftStairPattern(cols: number, rows: number): (TileColor | null)[] {
  // Matches Layout A (日落沙滩·布局A 左高塔右细墙):
  // Left col is cream, top step starts 2 cols wide and widens to `cols` going down;
  // each exposed step corner is cyan, interior is coral.
  const out: (TileColor | null)[] = [];
  for (let r = 0; r < rows; r++) {
    const stepIdx = Math.floor(r / 2); // widens every 2 rows
    const width = Math.min(cols, 2 + stepIdx);
    const isStepTop = r % 2 === 0;
    for (let c = 0; c < cols; c++) {
      if (c >= width) {
        out.push(null);
      } else if (c === 0) {
        out.push('cream');
      } else if (c === width - 1 && isStepTop) {
        out.push('cyan');
      } else {
        out.push('coral');
      }
    }
  }
  return out;
}

function rightStairPattern(cols: number, rows: number): (TileColor | null)[] {
  // Matches Layout D (日落沙滩·布局D 右塔反斜高位筐):
  // Rightmost col is cream, stairs descend to the left, exposed step corners are cyan.
  const out: (TileColor | null)[] = [];
  for (let r = 0; r < rows; r++) {
    const stepIdx = Math.min(cols - 2, Math.floor((r * (cols - 1)) / rows));
    const width = Math.min(cols, 2 + stepIdx);
    const startCol = cols - width;
    const prevWidth =
      r === 0 ? 0 : Math.min(cols, 2 + Math.min(cols - 2, Math.floor(((r - 1) * (cols - 1)) / rows)));
    const isNewStep = width > prevWidth || r === 0;
    for (let c = 0; c < cols; c++) {
      if (c < startCol) {
        out.push(null);
      } else if (c === cols - 1) {
        out.push('cream');
      } else if (c === startCol && isNewStep) {
        out.push('cyan');
      } else {
        out.push('coral');
      }
    }
  }
  return out;
}

function pillarPattern(cols: number, rows: number): TileColor[] {
  // Matches Layout F (中央立柱): top row cyan, outer columns cream, inner columns coral.
  const out: TileColor[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0) out.push('cyan');
      else if (c === 0 || c === cols - 1) out.push('cream');
      else out.push('coral');
    }
  }
  return out;
}

function thinWallPattern(rows: number, topCyan: boolean, creamSide: 'left' | 'right'): TileColor[] {
  const out: TileColor[] = [];
  for (let r = 0; r < rows; r++) {
    if (r === 0 && topCyan) {
      out.push('cyan', 'cyan');
    } else if (creamSide === 'left') {
      out.push('cream', 'coral');
    } else {
      out.push('coral', 'cream');
    }
  }
  return out;
}

export const LEVELS: LevelDef[] = [
  // =========================================================================
  // LEVEL 1: Layout G — 长堤缺口吊筐 (matches 日落沙滩·布局G & 单关通关·进球庆祝帧)
  // =========================================================================
  {
    id: 1,
    code: '1-1',
    name: '长堤缺口吊筐',
    worldName: '日落沙滩',
    layoutTag: '布局G',
    maxShots: 5,
    octoX: 162,
    octoFeetY: 1152,
    facing: 1,
    launchAngleDeg: 63,
    vMin: 360,
    vMax: 1420,
    hoop: {
      x: 450,
      y: 1054,
      rimWidth: 132,
      hangRodTopY: 806,
    },
    blocks: [
      // Left long pier (7x3)
      {
        id: 'pier-left',
        x: 34,
        y: 1152,
        cols: 7,
        rows: 3,
        tileSize: 48,
        pattern: rectPattern(7, 3, ['cyan', 'coral', 'cream']),
      },
      // Right long pier (7x3)
      {
        id: 'pier-right',
        x: 530,
        y: 1152,
        cols: 7,
        rows: 3,
        tileSize: 48,
        pattern: rectPattern(7, 3, ['cyan', 'coral', 'cream']),
      },
      // Left floating 2x2
      {
        id: 'float-left',
        x: 92,
        y: 422,
        cols: 2,
        rows: 2,
        tileSize: 52,
        pattern: rectPattern(2, 2, ['cyan', 'coral']),
      },
      // Top-center floating 3x2
      {
        id: 'float-top',
        x: 372,
        y: 274,
        cols: 3,
        rows: 2,
        tileSize: 52,
        pattern: rectPattern(3, 2, ['cyan', 'coral']),
      },
      // Right floating 2x2 (classic bank shot target!)
      {
        id: 'float-right',
        x: 694,
        y: 472,
        cols: 2,
        rows: 2,
        tileSize: 52,
        pattern: rectPattern(2, 2, ['cyan', 'coral']),
      },
    ],
    starPoles: [
      { x: 316, y: 1004, bottomY: 1600 },
      { x: 584, y: 1004, bottomY: 1600 },
    ],
    starShots: { three: 1, two: 3 },
    hint: '按住蓄力，松手让篮球从上方落入篮筐！',
  },

  // =========================================================================
  // LEVEL 2: Layout 5 — 浮岛串跳 (matches 可解布局5·浮岛串跳)
  // =========================================================================
  {
    id: 2,
    code: '1-2',
    name: '浮岛串跳',
    worldName: '日落沙滩',
    layoutTag: '布局5',
    maxShots: 5,
    octoX: 160,
    octoFeetY: 862,
    facing: 1,
    launchAngleDeg: 65,
    vMin: 380,
    vMax: 1460,
    hoop: {
      x: 450,
      y: 762,
      rimWidth: 132,
    },
    blocks: [
      // Bottom-left 2x2
      {
        id: 'isle-bl',
        x: 48,
        y: 1002,
        cols: 2,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(2, 2, ['cyan', 'coral']),
      },
      // Mid-left 3x2 (octopus launch island)
      {
        id: 'isle-ml',
        x: 88,
        y: 862,
        cols: 3,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(3, 2, ['cyan', 'coral']),
      },
      // Upper-left 2x2
      {
        id: 'isle-ul',
        x: 230,
        y: 716,
        cols: 2,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(2, 2, ['cyan', 'coral']),
      },
      // Bottom-center 1x2
      {
        id: 'isle-bc',
        x: 426,
        y: 1028,
        cols: 1,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(1, 2, ['cyan', 'coral']),
      },
      // Mid-right 3x2
      {
        id: 'isle-mr',
        x: 672,
        y: 822,
        cols: 3,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(3, 2, ['cyan', 'coral']),
      },
      // Bottom-right 2x2
      {
        id: 'isle-br',
        x: 754,
        y: 1002,
        cols: 2,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(2, 2, ['cyan', 'coral']),
      },
      // Upper-right 2x3 bank island
      {
        id: 'isle-ur',
        x: 664,
        y: 552,
        cols: 2,
        rows: 3,
        tileSize: 48,
        pattern: rectPattern(2, 3, ['cyan', 'coral', 'cream']),
      },
    ],
    starPoles: [
      { x: 214, y: 1140, bottomY: 1600 },
      { x: 314, y: 1266, bottomY: 1600 },
      { x: 586, y: 1266, bottomY: 1600 },
      { x: 686, y: 1140, bottomY: 1600 },
    ],
    starShots: { three: 1, two: 3 },
    hint: '可直接抛射，也可借右侧浮岛反弹进筐！',
  },

  // =========================================================================
  // LEVEL 3: Layout A — 左高塔右细墙 (matches 日落沙滩·布局A 左高塔右细墙)
  // =========================================================================
  {
    id: 3,
    code: '1-3',
    name: '左高塔右细墙',
    worldName: '日落沙滩',
    layoutTag: '布局A',
    maxShots: 5,
    octoX: 196,
    octoFeetY: 644,
    facing: 1,
    launchAngleDeg: 52,
    vMin: 360,
    vMax: 1260,
    hoop: {
      x: 450,
      y: 760,
      rimWidth: 132,
    },
    blocks: [
      // Left staircase tower (6x11, tileSize 50)
      {
        id: 'left-tower',
        x: 16,
        y: 444,
        cols: 6,
        rows: 11,
        tileSize: 50,
        pattern: leftStairPattern(6, 11),
      },
      // Right thin tall wall (2x9)
      {
        id: 'right-wall',
        x: 786,
        y: 650,
        cols: 2,
        rows: 9,
        tileSize: 48,
        pattern: thinWallPattern(9, true, 'left'),
      },
      // Upper-right floating 3x1 (top)
      {
        id: 'ur-bar-1',
        x: 678,
        y: 326,
        cols: 3,
        rows: 1,
        tileSize: 48,
        pattern: ['coral', 'coral', 'cyan'],
      },
      // Upper-right floating 3x1 (lower)
      {
        id: 'ur-bar-2',
        x: 572,
        y: 468,
        cols: 3,
        rows: 1,
        tileSize: 48,
        pattern: ['coral', 'coral', 'cyan'],
      },
    ],
    starPoles: [
      { x: 260, y: 1110, bottomY: 1600 },
      { x: 450, y: 1110, bottomY: 1600 },
      { x: 640, y: 1110, bottomY: 1600 },
    ],
    starShots: { three: 1, two: 3 },
    hint: '借助右侧细墙或悬浮横板反弹入筐！',
  },

  // =========================================================================
  // LEVEL 4: Layout F — 中央立柱 (matches 日落沙滩·布局F 中央立柱)
  // =========================================================================
  {
    id: 4,
    code: '1-4',
    name: '中央立柱',
    worldName: '日落沙滩',
    layoutTag: '布局F',
    maxShots: 5,
    octoX: 757,
    octoFeetY: 922,
    facing: -1,
    launchAngleDeg: 65,
    vMin: 440,
    vMax: 1460,
    hoop: {
      x: 286,
      y: 830,
      rimWidth: 128,
    },
    blocks: [
      // Giant central pillar (4x10)
      {
        id: 'center-pillar',
        x: 358,
        y: 734,
        cols: 4,
        rows: 10,
        tileSize: 46,
        pattern: pillarPattern(4, 10),
      },
      // Top-left 2x2
      {
        id: 'tl-block',
        x: 68,
        y: 286,
        cols: 2,
        rows: 2,
        tileSize: 46,
        pattern: rectPattern(2, 2, ['cyan', 'cream']),
      },
      // Mid-left 3x2
      {
        id: 'ml-block',
        x: 68,
        y: 530,
        cols: 3,
        rows: 2,
        tileSize: 46,
        pattern: rectPattern(3, 2, ['cyan', 'cream']),
      },
      // Top-right 2x2
      {
        id: 'tr-block',
        x: 734,
        y: 286,
        cols: 2,
        rows: 2,
        tileSize: 46,
        pattern: rectPattern(2, 2, ['cyan', 'cream']),
      },
      // Lower-right 3x2 (octopus launch platform)
      {
        id: 'lr-block',
        x: 688,
        y: 922,
        cols: 3,
        rows: 2,
        tileSize: 46,
        pattern: rectPattern(3, 2, ['cyan', 'cream']),
      },
    ],
    starPoles: [
      { x: 272, y: 1110, bottomY: 1600 },
      { x: 614, y: 1110, bottomY: 1600 },
    ],
    starShots: { three: 1, two: 3 },
    hint: '高抛越过中央立柱，精准落入左侧篮筐！',
  },

  // =========================================================================
  // LEVEL 5: Layout D — 右塔反斜高位筐 (matches 日落沙滩·布局D 右塔反斜高位筐)
  // =========================================================================
  {
    id: 5,
    code: '1-5',
    name: '右塔反斜高位筐',
    worldName: '日落沙滩',
    layoutTag: '布局D',
    maxShots: 5,
    octoX: 470,
    octoFeetY: 794,
    facing: -1,
    launchAngleDeg: 73,
    vMin: 720,
    vMax: 1740,
    hoop: {
      x: 215,
      y: 416,
      rimWidth: 130,
    },
    blocks: [
      // Left tall thin wall (2x9)
      {
        id: 'left-wall',
        x: 16,
        y: 656,
        cols: 2,
        rows: 9,
        tileSize: 44,
        pattern: thinWallPattern(9, false, 'left'),
      },
      // Mid-left 3x2 platform
      {
        id: 'mid-l',
        x: 202,
        y: 794,
        cols: 3,
        rows: 2,
        tileSize: 44,
        pattern: rectPattern(3, 2, ['cyan', 'coral']),
      },
      // Mid-right 3x2 platform (octopus stands here)
      {
        id: 'mid-r',
        x: 404,
        y: 794,
        cols: 3,
        rows: 2,
        tileSize: 44,
        pattern: rectPattern(3, 2, ['cyan', 'coral']),
      },
      // Right reverse staircase tower (6x8)
      {
        id: 'right-stair',
        x: 610,
        y: 656,
        cols: 6,
        rows: 8,
        tileSize: 46,
        pattern: rightStairPattern(6, 8),
      },
    ],
    starPoles: [
      { x: 186, y: 1126, bottomY: 1600 },
      { x: 316, y: 1126, bottomY: 1600 },
      { x: 446, y: 1126, bottomY: 1600 },
      { x: 576, y: 1126, bottomY: 1600 },
      { x: 706, y: 1126, bottomY: 1600 },
    ],
    starShots: { three: 1, two: 3 },
    hint: '大力蓄力冲击高空篮筐！',
  },

  // =========================================================================
  // LEVEL 6: 椰风反弹屋 (Bank shot off overhanging wall)
  // =========================================================================
  {
    id: 6,
    code: '1-6',
    name: '椰风反弹屋',
    worldName: '日落海湾',
    layoutTag: '进阶1',
    maxShots: 5,
    octoX: 148,
    octoFeetY: 1080,
    facing: 1,
    launchAngleDeg: 58,
    vMin: 620,
    vMax: 1680,
    hoop: {
      x: 660,
      y: 850,
      rimWidth: 130,
    },
    blocks: [
      {
        id: 'l-pad',
        x: 54,
        y: 1080,
        cols: 4,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(4, 2, ['cyan', 'coral']),
      },
      // Center divider wall
      {
        id: 'mid-wall',
        x: 374,
        y: 780,
        cols: 2,
        rows: 7,
        tileSize: 48,
        pattern: thinWallPattern(7, true, 'left'),
      },
      // Right backboard wall
      {
        id: 'backboard',
        x: 780,
        y: 520,
        cols: 2,
        rows: 8,
        tileSize: 48,
        pattern: thinWallPattern(8, true, 'right'),
      },
      // Upper bounce roof
      {
        id: 'roof',
        x: 420,
        y: 340,
        cols: 5,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(5, 2, ['cyan', 'coral']),
      },
    ],
    starPoles: [
      { x: 290, y: 1160, bottomY: 1600 },
      { x: 560, y: 1160, bottomY: 1600 },
    ],
    starShots: { three: 1, two: 3 },
    hint: '利用右侧挡板反弹，稳稳落入篮筐！',
  },

  // =========================================================================
  // LEVEL 7: 潮汐移动台 (Moving bounce shield)
  // =========================================================================
  {
    id: 7,
    code: '1-7',
    name: '潮汐移动台',
    worldName: '日落海湾',
    layoutTag: '进阶2',
    maxShots: 5,
    octoX: 160,
    octoFeetY: 1060,
    facing: 1,
    launchAngleDeg: 62,
    vMin: 600,
    vMax: 1680,
    hoop: {
      x: 690,
      y: 740,
      rimWidth: 130,
    },
    blocks: [
      {
        id: 'start-plat',
        x: 64,
        y: 1060,
        cols: 4,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(4, 2, ['cyan', 'coral']),
      },
      {
        id: 'moving-mid',
        x: 370,
        y: 640,
        cols: 3,
        rows: 2,
        tileSize: 46,
        pattern: rectPattern(3, 2, ['cyan', 'coral']),
        move: { axis: 'y', range: 130, period: 3.4, phase: 0 },
      },
      {
        id: 'right-bump',
        x: 790,
        y: 440,
        cols: 2,
        rows: 7,
        tileSize: 46,
        pattern: thinWallPattern(7, true, 'right'),
      },
    ],
    starPoles: [
      { x: 320, y: 1140, bottomY: 1600 },
      { x: 520, y: 1140, bottomY: 1600 },
      { x: 720, y: 1140, bottomY: 1600 },
    ],
    starShots: { three: 1, two: 3 },
    hint: '看准移动浮岛的时机出手！',
  },

  // =========================================================================
  // LEVEL 8: 升降悬吊筐 (Vertically moving hoop!)
  // =========================================================================
  {
    id: 8,
    code: '1-8',
    name: '升降悬吊筐',
    worldName: '日落海湾',
    layoutTag: '进阶3',
    maxShots: 5,
    octoX: 155,
    octoFeetY: 1020,
    facing: 1,
    launchAngleDeg: 60,
    vMin: 440,
    vMax: 1460,
    hoop: {
      x: 560,
      y: 760,
      rimWidth: 136,
      hangRodTopY: 420,
      move: { axis: 'y', range: 100, period: 3.8, phase: 0 },
    },
    blocks: [
      {
        id: 'left-base',
        x: 58,
        y: 1020,
        cols: 4,
        rows: 3,
        tileSize: 48,
        pattern: rectPattern(4, 3, ['cyan', 'coral', 'cream']),
      },
      {
        id: 'top-bank',
        x: 680,
        y: 350,
        cols: 3,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(3, 2, ['cyan', 'coral']),
      },
      {
        id: 'right-guard',
        x: 786,
        y: 660,
        cols: 2,
        rows: 8,
        tileSize: 48,
        pattern: thinWallPattern(8, true, 'right'),
      },
    ],
    starPoles: [
      { x: 340, y: 1120, bottomY: 1600 },
      { x: 560, y: 1150, bottomY: 1600 },
    ],
    starShots: { three: 1, two: 3 },
    hint: '篮筐正在上下移动，预判它的落点！',
  },

  // =========================================================================
  // LEVEL 9: 星柱弹球阵 (Star bumper combo!)
  // =========================================================================
  {
    id: 9,
    code: '1-9',
    name: '星柱弹球阵',
    worldName: '黄金岛屿',
    layoutTag: '进阶4',
    maxShots: 5,
    octoX: 740,
    octoFeetY: 1050,
    facing: -1,
    launchAngleDeg: 67,
    vMin: 520,
    vMax: 1760,
    hoop: {
      x: 240,
      y: 740,
      rimWidth: 136,
    },
    blocks: [
      {
        id: 'right-start',
        x: 644,
        y: 1050,
        cols: 4,
        rows: 2,
        tileSize: 48,
        pattern: rectPattern(4, 2, ['cyan', 'coral']),
      },
      {
        id: 'left-wall-9',
        x: 24,
        y: 440,
        cols: 2,
        rows: 9,
        tileSize: 48,
        pattern: thinWallPattern(9, true, 'left'),
      },
      {
        id: 'mid-island-9',
        x: 410,
        y: 740,
        cols: 3,
        rows: 2,
        tileSize: 46,
        pattern: rectPattern(3, 2, ['cyan', 'coral']),
      },
    ],
    starPoles: [
      { x: 240, y: 1040, bottomY: 1600 },
      { x: 420, y: 1020, bottomY: 1600 },
      { x: 560, y: 1080, bottomY: 1600 },
    ],
    starShots: { three: 1, two: 3 },
    hint: '左壁反弹或星柱弹射，双路皆可进筐！',
  },

  // =========================================================================
  // LEVEL 10: 日落终极挑战 (Grand finale: moving hoop + moving blocker)
  // =========================================================================
  {
    id: 10,
    code: '1-10',
    name: '日落终极挑战',
    worldName: '黄金岛屿',
    layoutTag: '终极关',
    maxShots: 5,
    octoX: 145,
    octoFeetY: 1080,
    facing: 1,
    launchAngleDeg: 64,
    vMin: 620,
    vMax: 1720,
    hoop: {
      x: 610,
      y: 680,
      rimWidth: 130,
      hangRodTopY: 360,
      move: { axis: 'x', range: 95, period: 4.2, phase: 0 },
    },
    blocks: [
      {
        id: 'start-10',
        x: 48,
        y: 1080,
        cols: 4,
        rows: 3,
        tileSize: 48,
        pattern: rectPattern(4, 3, ['cyan', 'coral', 'cream']),
      },
      {
        id: 'guard-10',
        x: 340,
        y: 800,
        cols: 2,
        rows: 5,
        tileSize: 46,
        pattern: thinWallPattern(5, true, 'left'),
      },
      {
        id: 'bank-10',
        x: 794,
        y: 400,
        cols: 2,
        rows: 9,
        tileSize: 46,
        pattern: thinWallPattern(9, true, 'right'),
      },
      {
        id: 'float-10',
        x: 240,
        y: 420,
        cols: 3,
        rows: 1,
        tileSize: 48,
        pattern: ['cyan', 'coral', 'cyan'],
        move: { axis: 'x', range: 80, period: 3.2, phase: 1.2 },
      },
    ],
    starPoles: [
      { x: 270, y: 1160, bottomY: 1600 },
      { x: 520, y: 1120, bottomY: 1600 },
      { x: 700, y: 1160, bottomY: 1600 },
    ],
    starShots: { three: 1, two: 3 },
    hint: '左右巡航的篮筐，把握节奏一击制胜！',
  },
];
