import type { LoadedSprites } from './assets.ts';
import {
  BALL_RADIUS,
  COLORS,
  DEFAULT_TILE_SIZE,
  OCTO_DRAW_SCALE,
  OCTO_FRAMES,
  RIM_TUBE_RADIUS,
  STAGE_H,
  STAGE_W,
} from './constants.ts';
import { evalMotion, getHoopPosition, powerToOctoFrame } from './physics.ts';
import type {
  BallState,
  BlockCluster,
  CharacterSkinId,
  LevelDef,
  TileColor,
  TrajectoryPoint,
} from './types.ts';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rot: number;
  vRot: number;
  shape: 'rect' | 'circle' | 'star' | 'sparkle' | 'drop';
  gravity: number;
}

export interface TrailSample {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

export interface FloatingCallout {
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface RenderFxState {
  time: number;
  blockPulse: number[]; // per-cluster hit pulse 0..1
  starPulse: number[]; // per-star hit pulse 0..1
  rimWobble: number; // rim shake amplitude
  netSwish: number; // net flare/sway 0..1
  octoJumpY: number; // celebration or launch recoil offset (negative = up)
  octoStretchX: number;
  octoStretchY: number;
  trail: TrailSample[];
  particles: Particle[];
  callouts: FloatingCallout[];
  celebrateRays: number; // 0..1 when scoring
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export function drawSpikyStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
  rot: number,
  fill: string,
  stroke: string = COLORS.outline,
  lineWidth = 5,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rot + (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function drawFiveStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  fill: string,
  stroke: string = COLORS.outline,
  lineWidth = 6,
): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawPalmTree(ctx: CanvasRenderingContext2D, baseX: number, baseY: number, flip: 1 | -1, scale = 1): void {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.scale(flip * scale, scale);

  // Trunk
  ctx.fillStyle = COLORS.palm;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.quadraticCurveTo(-18, -110, 26, -195);
  ctx.lineTo(44, -184);
  ctx.quadraticCurveTo(10, -100, 12, 0);
  ctx.closePath();
  ctx.fill();

  // Palm fronds
  const fronds = [
    { a: -2.4, len: 122, curve: -28 },
    { a: -1.7, len: 108, curve: -22 },
    { a: -0.95, len: 112, curve: 18 },
    { a: -0.35, len: 128, curve: 26 },
    { a: 0.2, len: 110, curve: 32 },
    { a: 0.72, len: 92, curve: 26 },
  ];
  ctx.save();
  ctx.translate(34, -188);
  for (const f of fronds) {
    ctx.save();
    ctx.rotate(f.a);
    ctx.fillStyle = COLORS.palm;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(f.len * 0.55, -24 + f.curve * 0.2, f.len, f.curve);
    ctx.quadraticCurveTo(f.len * 0.45, 16 + f.curve * 0.3, 0, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Three cute coconuts with cream outlines
  const nuts = [
    { x: -12, y: 8 },
    { x: 10, y: 10 },
    { x: -1, y: 24 },
  ];
  for (const n of nuts) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.palm;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLORS.palmLight;
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

export function drawSunsetBackground(ctx: CanvasRenderingContext2D, time: number, sunY = 820): void {
  // 1. Warm sunset vertical gradient
  const grad = ctx.createLinearGradient(0, 0, 0, STAGE_H);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(0.55, COLORS.skyMid);
  grad.addColorStop(1, COLORS.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);

  // 2. Subtle geometric dot grid matching all reference images
  ctx.fillStyle = COLORS.skyDot;
  const stepX = 52;
  const stepY = 54;
  for (let y = 36; y < 1465; y += stepY) {
    for (let x = 44; x < STAGE_W - 20; x += stepX) {
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Large warm setting sun
  ctx.fillStyle = COLORS.sun;
  ctx.beginPath();
  ctx.arc(STAGE_W / 2, sunY, 215, 0, Math.PI * 2);
  ctx.fill();

  // 4. Drifting pale pill clouds across the sun
  const drift1 = Math.sin(time * 0.35) * 18;
  const drift2 = Math.cos(time * 0.28) * 16;
  ctx.fillStyle = COLORS.sunCloud;
  drawRoundedRect(ctx, 110 + drift1, sunY - 68, 220, 24, 12);
  ctx.fill();
  drawRoundedRect(ctx, 565 + drift2, sunY + 34, 210, 24, 12);
  ctx.fill();

  // 5. Distant sunset sandbar & shimmer
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(0, 1445, STAGE_W, 95);
  ctx.fillStyle = 'rgba(255, 250, 224, 0.55)';
  drawRoundedRect(ctx, 355, 1456, 190, 9, 4.5);
  ctx.fill();
  drawRoundedRect(ctx, 395, 1474, 110, 8, 4);
  ctx.fill();

  // 6. Left & right palm trees
  drawPalmTree(ctx, 24, 1510, 1, 1.08);
  drawPalmTree(ctx, STAGE_W - 24, 1510, -1, 1.08);

  // 7. Animated turquoise ocean waves + cream foam crest
  const waveBaseY = 1510;
  ctx.beginPath();
  ctx.moveTo(0, STAGE_H);
  for (let x = 0; x <= STAGE_W; x += 24) {
    const wy = waveBaseY + Math.sin(x * 0.02 + time * 2.0) * 11 + Math.cos(x * 0.011 - time * 1.1) * 5;
    ctx.lineTo(x, wy);
  }
  ctx.lineTo(STAGE_W, STAGE_H);
  ctx.closePath();
  ctx.fillStyle = COLORS.creamHalo;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, STAGE_H);
  for (let x = 0; x <= STAGE_W; x += 24) {
    const wy = waveBaseY + 11 + Math.sin(x * 0.02 + time * 2.0) * 11 + Math.cos(x * 0.011 - time * 1.1) * 5;
    ctx.lineTo(x, wy);
  }
  ctx.lineTo(STAGE_W, STAGE_H);
  ctx.closePath();
  ctx.fillStyle = COLORS.oceanLight;
  ctx.fill();

  // Deeper turquoise band + shimmer pills
  ctx.fillStyle = COLORS.oceanMid;
  ctx.fillRect(0, 1554, STAGE_W, 46);
  ctx.fillStyle = COLORS.oceanShimmer;
  const shimmers = [
    { x: 92, y: 1546, w: 82 },
    { x: 350, y: 1564, w: 96 },
    { x: 690, y: 1548, w: 90 },
    { x: 760, y: 1574, w: 66 },
  ];
  for (const s of shimmers) {
    const ox = Math.sin(time * 1.4 + s.x * 0.02) * 10;
    drawRoundedRect(ctx, s.x + ox, s.y, s.w, 8, 4);
    ctx.fill();
  }
}

function tileHex(color: TileColor): string {
  switch (color) {
    case 'cyan':
      return COLORS.tileCyan;
    case 'coral':
      return COLORS.tileCoral;
    case 'cream':
      return COLORS.tileCream;
  }
}

export function drawBlockClusters(
  ctx: CanvasRenderingContext2D,
  blocks: BlockCluster[],
  time: number,
  blockPulse: number[],
): void {
  for (let idx = 0; idx < blocks.length; idx++) {
    const b = blocks[idx];
    const ts = b.tileSize ?? DEFAULT_TILE_SIZE;
    const m = evalMotion(b.move, time);
    const pulse = blockPulse[idx] ?? 0;

    ctx.save();
    const cx = b.x + m.dx + (b.cols * ts) / 2;
    const cy = b.y + m.dy + (b.rows * ts) / 2;
    if (pulse > 0.01) {
      const s = 1 + Math.sin(pulse * Math.PI) * 0.045;
      ctx.translate(cx, cy);
      ctx.scale(s, 2 - s);
      ctx.translate(-cx, -cy);
    }

    const ox = b.x + m.dx;
    const oy = b.y + m.dy;

    const cells: { x: number; y: number; color: TileColor }[] = [];
    for (let r = 0; r < b.rows; r++) {
      for (let c = 0; c < b.cols; c++) {
        const col = b.pattern
          ? b.pattern[r * b.cols + c]
          : r === 0
            ? 'cyan'
            : r === b.rows - 1 && b.rows >= 3
              ? 'cream'
              : 'coral';
        if (col !== null) {
          cells.push({ x: ox + c * ts, y: oy + r * ts, color: col });
        }
      }
    }

    // Pass 1: Soft ground/drop shadow beneath cluster
    ctx.fillStyle = 'rgba(130, 68, 22, 0.22)';
    for (const cell of cells) {
      drawRoundedRect(ctx, cell.x - 4, cell.y + 8, ts + 8, ts + 6, 12);
      ctx.fill();
    }

    // Pass 2: Thick cream sticker halo around entire cluster
    ctx.fillStyle = COLORS.creamHalo;
    for (const cell of cells) {
      drawRoundedRect(ctx, cell.x - 9, cell.y - 9, ts + 18, ts + 18, 13);
      ctx.fill();
    }

    // Pass 3: Dark brown outer silhouette
    ctx.fillStyle = COLORS.outline;
    for (const cell of cells) {
      drawRoundedRect(ctx, cell.x - 4, cell.y - 4, ts + 8, ts + 8, 7);
      ctx.fill();
    }

    // Pass 4: Crisp colored tiles with subtle inner grid lines
    for (const cell of cells) {
      const pad = 2.5;
      ctx.fillStyle = tileHex(cell.color);
      drawRoundedRect(ctx, cell.x + pad, cell.y + pad, ts - pad * 2, ts - pad * 2, 4);
      ctx.fill();

      // Subtle glossy top highlight on cyan tiles
      if (cell.color === 'cyan') {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(cell.x + 6, cell.y + 5, ts - 12, 6);
      }

      // Hit flash overlay
      if (pulse > 0.05) {
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.42})`;
        ctx.fillRect(cell.x + pad, cell.y + pad, ts - pad * 2, ts - pad * 2);
      }
    }

    ctx.restore();
  }
}

export function drawStarPoles(
  ctx: CanvasRenderingContext2D,
  level: LevelDef,
  time: number,
  starPulse: number[],
): void {
  for (let i = 0; i < level.starPoles.length; i++) {
    const p = level.starPoles[i];
    const bottom = p.bottomY ?? STAGE_H;
    const pulse = starPulse[i] ?? 0;

    // Dark brown pole with crisp dark outline
    const poleW = 16;
    ctx.fillStyle = '#5e2e16';
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 4;
    ctx.fillRect(p.x - poleW / 2, p.y + 10, poleW, bottom - p.y);
    ctx.strokeRect(p.x - poleW / 2, p.y + 10, poleW, bottom - p.y);

    // Spiky cyan star topper
    const scale = 1 + Math.sin(pulse * Math.PI) * 0.35 + Math.sin(time * 3 + i) * 0.03;
    const rot = pulse * 0.7 + Math.sin(time * 1.4 + i) * 0.08;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);
    drawSpikyStar(ctx, 0, 0, 32, 16, 7, rot, pulse > 0.1 ? '#b2fff9' : COLORS.rimCyan, COLORS.outline, 5);
    ctx.restore();
  }
}

export function drawHoopBack(
  ctx: CanvasRenderingContext2D,
  level: LevelDef,
  time: number,
  fx: RenderFxState,
): void {
  const hoop = getHoopPosition(level, time);
  const wobbleAngle = Math.sin(time * 36) * fx.rimWobble * 0.08;

  ctx.save();
  ctx.translate(hoop.x, hoop.y);
  ctx.rotate(wobbleAngle);

  // Optional hanging rod from above (like Layout G)
  if (level.hoop.hangRodTopY !== undefined) {
    const rodLen = hoop.y - level.hoop.hangRodTopY - 48;
    if (rodLen > 10) {
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.lineTo(0, -48 - rodLen);
      ctx.stroke();

      ctx.strokeStyle = '#68351c';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.lineTo(0, -48 - rodLen);
      ctx.stroke();
    }
  }

  // Cute bobbing downward brown arrow indicating "drop ball from above"
  const arrowBob = Math.sin(time * 4.2) * 5;
  ctx.fillStyle = COLORS.outline;
  ctx.beginPath();
  ctx.moveTo(-22, -52 + arrowBob);
  ctx.lineTo(22, -52 + arrowBob);
  ctx.lineTo(0, -28 + arrowBob);
  ctx.closePath();
  ctx.fill();

  // Celebration sunburst rays behind hoop when scored
  if (fx.celebrateRays > 0.01) {
    ctx.save();
    ctx.globalAlpha = fx.celebrateRays * 0.85;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12 + time * 1.2;
      ctx.strokeStyle = '#fffdf2';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 58, Math.sin(a) * 58 + 18);
      ctx.lineTo(Math.cos(a) * 140, Math.sin(a) * 140 + 18);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

export function drawHoopFront(
  ctx: CanvasRenderingContext2D,
  level: LevelDef,
  time: number,
  fx: RenderFxState,
): void {
  const hoop = getHoopPosition(level, time);
  const half = hoop.rimWidth / 2;
  const wobbleAngle = Math.sin(time * 36) * fx.rimWobble * 0.08;
  const swish = Math.sin(fx.netSwish * Math.PI) * 14;

  ctx.save();
  ctx.translate(hoop.x, hoop.y);
  ctx.rotate(wobbleAngle);

  // 1. Crisp diamond-criss-cross white net with thick dark brown outline (matches reference!)
  const netTopY = 8;
  const netMidY = 58 + swish * 0.35;
  const netBotY = 102 + swish * 0.5;
  const topLeft = -half + 10;
  const topRight = half - 10;
  const botLeft = -half * 0.52 - swish * 0.45;
  const botRight = half * 0.52 + swish * 0.45;

  const drawNetLines = (strokeStyle: string, lineWidth: number) => {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    // Left & right side cords
    ctx.moveTo(topLeft, netTopY);
    ctx.lineTo(botLeft, netBotY);
    ctx.moveTo(topRight, netTopY);
    ctx.lineTo(botRight, netBotY);

    // Criss-cross diamond mesh
    const cols = 4;
    for (let i = 0; i <= cols; i++) {
      const tx = topLeft + ((topRight - topLeft) * i) / cols;
      const bx = botLeft + ((botRight - botLeft) * i) / cols;
      if (i < cols) {
        const nextBx = botLeft + ((botRight - botLeft) * (i + 1)) / cols;
        ctx.moveTo(tx, netTopY);
        ctx.lineTo(nextBx, netBotY);
      }
      if (i > 0) {
        const prevBx = botLeft + ((botRight - botLeft) * (i - 1)) / cols;
        ctx.moveTo(tx, netTopY);
        ctx.lineTo(prevBx, netBotY);
      }
      if (i > 0 && i < cols) {
        ctx.moveTo(bx, netMidY);
        ctx.lineTo(bx, netBotY + 8);
      }
    }

    // Bottom zig-zag scallop
    ctx.moveTo(botLeft, netBotY);
    ctx.lineTo((botLeft + 0) / 2, netBotY - 14);
    ctx.lineTo(0, netBotY + 4);
    ctx.lineTo((botRight + 0) / 2, netBotY - 14);
    ctx.lineTo(botRight, netBotY);
    ctx.stroke();
  };

  drawNetLines(COLORS.outline, 14);
  drawNetLines(COLORS.netWhite, 6);

  // 2. Thick turquoise rounded rim bar (with explicit rounded outer rings!)
  const rimH = RIM_TUBE_RADIUS * 2;
  const rimX = -half - RIM_TUBE_RADIUS;
  const rimY = -RIM_TUBE_RADIUS;
  const rimTotalW = hoop.rimWidth + RIM_TUBE_RADIUS * 2;

  ctx.fillStyle = COLORS.rimCyan;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, rimX, rimY, rimTotalW, rimH, RIM_TUBE_RADIUS);
  ctx.fill();
  ctx.stroke();

  // Glossy rim top highlight
  ctx.fillStyle = COLORS.rimHighlight;
  drawRoundedRect(ctx, rimX + 12, rimY + 4, rimTotalW * 0.44, 7, 3.5);
  ctx.fill();

  // Small sparkling rim stars when scored
  if (fx.celebrateRays > 0.1) {
    drawSpikyStar(ctx, -half - 6, 0, 20 * fx.celebrateRays, 9 * fx.celebrateRays, 7, time * 2, COLORS.rimCyan, COLORS.outline, 4);
    drawSpikyStar(ctx, half + 6, 0, 20 * fx.celebrateRays, 9 * fx.celebrateRays, 7, -time * 2, COLORS.rimCyan, COLORS.outline, 4);
  }

  ctx.restore();
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  sprites: LoadedSprites | null,
  skin: CharacterSkinId,
  x: number,
  feetY: number,
  facing: 1 | -1,
  power: number,
  charging: boolean,
  fx: RenderFxState,
  celebrating: boolean,
): void {
  const frameIdx = celebrating ? 0 : powerToOctoFrame(power, charging);
  const f = OCTO_FRAMES[frameIdx];

  // Subtle breathing when idle
  const breathe = !charging && !celebrating ? Math.sin(fx.time * 3.4) * 0.025 : 0;
  // Micro tremor at high charge
  const tremorX = charging && power > 0.65 ? Math.sin(fx.time * 55) * (power - 0.65) * 9 : 0;
  const jumpY = fx.octoJumpY;

  ctx.save();
  ctx.translate(x + tremorX, feetY + jumpY);

  // Cute motion lines below octopus when leaping in celebration
  if (celebrating && jumpY < -14) {
    ctx.strokeStyle = 'rgba(255, 250, 232, 0.85)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-24, 18);
    ctx.lineTo(-28, 72);
    ctx.moveTo(0, 26);
    ctx.lineTo(-2, 92);
    ctx.moveTo(22, 16);
    ctx.lineTo(26, 68);
    ctx.stroke();
  }

  // Contact shadow on platform
  const shadowScale = Math.max(0.45, 1 + jumpY / 260);
  ctx.fillStyle = 'rgba(51, 28, 14, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, -jumpY + 2, 52 * shadowScale * (1 + power * 0.28), 11 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  const sx = fx.octoStretchX * (1 - breathe);
  const sy = fx.octoStretchY * (1 + breathe);
  ctx.scale(sx, sy);

  if (skin === 'octo' && sprites?.ready && sprites.octo[frameIdx]) {
    const img = sprites.octo[frameIdx];
    const dw = f.w * OCTO_DRAW_SCALE;
    const dh = f.h * OCTO_DRAW_SCALE;
    const bottomPad = (f.h - f.bodyBottomY) * OCTO_DRAW_SCALE;
    ctx.save();
    if (facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -dw / 2, -dh + bottomPad + 2, dw, dh);
    ctx.restore();
  } else {
    drawBuddyVectorCharacter(ctx, skin, facing, power, charging);
  }

  ctx.restore();
}

export function drawBuddyVectorCharacter(
  ctx: CanvasRenderingContext2D,
  skin: CharacterSkinId,
  facing: 1 | -1,
  power: number,
  charging: boolean,
): void {
  const squash = charging ? 1 - power * 0.42 : 1;
  const wide = charging ? 1 + power * 0.36 : 1;
  ctx.save();
  ctx.scale(facing * wide, squash);

  if (skin === 'dog') {
    // White cheeky pup with yellow sunglasses & scarf (from Main Menu left podium!)
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 6;

    // Floppy ears
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-44, -68, 16, 28, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(44, -68, 16, 28, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Body + head
    ctx.beginPath();
    ctx.ellipse(0, -54, 46, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Yellow scarf
    ctx.fillStyle = '#ffd845';
    drawRoundedRect(ctx, -32, -26, 64, 18, 9);
    ctx.fill();
    ctx.stroke();

    // Yellow cool sunglasses
    ctx.fillStyle = '#ffe13a';
    drawRoundedRect(ctx, -34, -84, 30, 22, 6);
    ctx.fill();
    ctx.stroke();
    drawRoundedRect(ctx, 4, -84, 30, 22, 6);
    ctx.fill();
    ctx.stroke();

    // Cute nose & happy tongue
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.ellipse(0, -56, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b8b';
    ctx.beginPath();
    ctx.arc(0, -42, 9, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    // Paws
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-22, -8, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(22, -8, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (skin === 'duck') {
    // Sleek black duck with long orange bill (from Main Menu right podium!)
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 6;

    // Feet
    ctx.fillStyle = '#f58320';
    ctx.beginPath();
    ctx.ellipse(-22, -8, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(22, -8, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Round black body
    ctx.fillStyle = '#252124';
    ctx.beginPath();
    ctx.ellipse(0, -56, 48, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Big puppy eyes
    ctx.fillStyle = '#73d7f7';
    ctx.beginPath();
    ctx.arc(-12, -74, 12, 0, Math.PI * 2);
    ctx.arc(14, -74, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.arc(-10, -74, 6, 0, Math.PI * 2);
    ctx.arc(16, -74, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-13, -78, 3, 0, Math.PI * 2);
    ctx.arc(13, -78, 3, 0, Math.PI * 2);
    ctx.fill();

    // Long orange bill
    ctx.fillStyle = '#f88b26';
    drawRoundedRect(ctx, 2, -66, 56, 22, 11);
    ctx.fill();
    ctx.stroke();
  } else {
    // Fallback vector pink octopus (before images load)
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 6;
    ctx.fillStyle = COLORS.pinkOcto;
    ctx.beginPath();
    ctx.ellipse(0, -56, 48, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.rimCyan;
    ctx.beginPath();
    ctx.arc(0, -54, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.arc(0, -54, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawBasketballAndTrail(
  ctx: CanvasRenderingContext2D,
  sprites: LoadedSprites | null,
  ball: BallState,
  trail: TrailSample[],
): void {
  // 1. Glowing cyan-blue comet afterimage trail (matches 篮球拖尾特效!)
  if (ball.active && trail.length > 1) {
    for (let i = 0; i < trail.length; i++) {
      const s = trail[i];
      const frac = (i + 1) / trail.length;
      ctx.save();
      ctx.globalAlpha = s.alpha * frac * 0.42;
      const g = ctx.createRadialGradient(s.x, s.y, s.radius * 0.15, s.x, s.y, s.radius * 1.15);
      g.addColorStop(0, '#9bf0ff');
      g.addColorStop(0.55, '#4ba3ff');
      g.addColorStop(1, 'rgba(75, 163, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius * (0.45 + frac * 0.65), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 2. Basketball body with squash-and-stretch + spin
  ctx.save();
  ctx.translate(ball.x, ball.y);

  // Apply impact squash along collision normal
  if (ball.squashTimer > 0) {
    ctx.rotate(ball.squashAngle);
    ctx.scale(ball.squashX, ball.squashY);
    ctx.rotate(-ball.squashAngle);
  }

  ctx.rotate(ball.angle);

  const d = ball.radius * 2 + 4;
  if (sprites?.ready && sprites.ballMain) {
    ctx.drawImage(sprites.ballMain, -d / 2, -d / 2, d, d);
  } else {
    // Fallback crisp vector blue basketball
    ctx.fillStyle = COLORS.ballBlue;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-BALL_RADIUS, 0);
    ctx.lineTo(BALL_RADIUS, 0);
    ctx.moveTo(0, -BALL_RADIUS);
    ctx.lineTo(0, BALL_RADIUS);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawTrajectoryPreview(
  ctx: CanvasRenderingContext2D,
  points: TrajectoryPoint[],
  charging: boolean,
): void {
  if (points.length === 0) return;
  ctx.save();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const t = 1 - i / points.length;
    const r = (charging ? 7.5 : 5.5) * (0.55 + t * 0.55);
    ctx.globalAlpha = (charging ? 0.92 : 0.45) * (0.25 + t * 0.75);
    ctx.fillStyle = p.bounced ? '#ff8b5c' : COLORS.rimCyan;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawParticlesAndCallouts(ctx: CanvasRenderingContext2D, fx: RenderFxState): void {
  for (const p of fx.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.shape === 'rect') {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
    } else if (p.shape === 'circle' || p.shape === 'drop') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'star') {
      drawFiveStar(ctx, 0, 0, p.size, p.size * 0.48, p.color, COLORS.outline, 4);
    } else if (p.shape === 'sparkle') {
      drawSpikyStar(ctx, 0, 0, p.size, p.size * 0.35, 4, 0, p.color, COLORS.outline, 2.5);
    }
    ctx.restore();
  }

  for (const c of fx.callouts) {
    const progress = 1 - c.life / c.maxLife;
    const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale);
    ctx.font = '900 40px "Fredoka", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = COLORS.outline;
    ctx.strokeText(c.text, 0, 0);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(c.text, 0, 0);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, 0, 0);
    ctx.restore();
  }
}
