import type { LoadedSprites } from './assets.ts';
import { COLORS, STAGE_H, STAGE_W } from './constants.ts';
import { LEVELS } from './levels.ts';
import {
  drawBuddyVectorCharacter,
  drawFiveStar,
  drawRoundedRect,
  drawSpikyStar,
  drawSunsetBackground,
} from './renderer.ts';
import type { CharacterSkinId, LevelDef, SaveData, VersusState } from './types.ts';

export interface HitRegion {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UiDrawContext {
  ctx: CanvasRenderingContext2D;
  sprites: LoadedSprites | null;
  time: number;
  save: SaveData;
  hits: HitRegion[];
}

function addHit(hits: HitRegion[], id: string, x: number, y: number, w: number, h: number): void {
  hits.push({ id, x, y, w, h });
}

export function drawComicText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  fill: string,
  outerStroke = COLORS.outline,
  innerStroke = '#ffffff',
  outerWidth = 20,
  innerWidth = 10,
): void {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (outerWidth > 0) {
    ctx.lineWidth = outerWidth;
    ctx.strokeStyle = outerStroke;
    ctx.strokeText(text, x, y);
  }
  if (innerWidth > 0) {
    ctx.lineWidth = innerWidth;
    ctx.strokeStyle = innerStroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawTitleLogo(ctx: CanvasRenderingContext2D, sprites: LoadedSprites | null, cy: number, time: number): void {
  ctx.save();
  // Yellow spiky comic burst behind logo
  ctx.fillStyle = 'rgba(255, 244, 166, 0.72)';
  drawSpikyStar(ctx, STAGE_W / 2, cy - 8, 260, 155, 11, Math.sin(time * 0.6) * 0.04, 'rgba(255, 244, 166, 0.72)', 'transparent', 0);

  // Decorative floating confetti bits around title
  const bits = [
    { x: 140, y: cy - 110, c: COLORS.tileCoral, r: 0.3 },
    { x: 260, y: cy - 155, c: COLORS.tileCyan, r: -0.4 },
    { x: 735, y: cy - 140, c: COLORS.tileCyan, r: 0.5 },
    { x: 780, y: cy + 68, c: COLORS.tileCoral, r: -0.2 },
    { x: 112, y: cy + 88, c: COLORS.tileCyan, r: 0.4 },
  ];
  for (const b of bits) {
    ctx.save();
    ctx.translate(b.x, b.y + Math.sin(time * 2 + b.x) * 4);
    ctx.rotate(b.r);
    ctx.fillStyle = b.c;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
  }

  // Main Chinese comic title "愤怒的章鱼"
  ctx.save();
  ctx.translate(STAGE_W / 2, cy - 28);
  ctx.rotate(-0.035);
  drawComicText(
    ctx,
    '愤怒的章鱼',
    0,
    0,
    '900 132px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    '#20c5be',
    COLORS.outline,
    '#ffffff',
    30,
    15,
  );
  ctx.restore();

  // Subtitle "ANGRY OCTO"
  ctx.save();
  ctx.translate(STAGE_W / 2, cy + 84);
  ctx.rotate(-0.025);
  drawComicText(
    ctx,
    'ANGRY OCTO',
    0,
    0,
    '700 76px "Fredoka", "Arial Black", sans-serif',
    '#f26c42',
    COLORS.outline,
    '#ffffff',
    24,
    12,
  );
  ctx.restore();

  // Decorative blue basketball perched on top-left corner of title
  if (sprites?.ready && sprites.ballMain) {
    const bx = 135;
    const by = cy - 122 + Math.sin(time * 3) * 5;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-0.2 + Math.sin(time * 1.6) * 0.08);
    ctx.drawImage(sprites.ballMain, -56, -56, 112, 112);
    ctx.restore();
  }

  ctx.restore();
}

export function drawAvatarBadge(
  ctx: CanvasRenderingContext2D,
  sprites: LoadedSprites | null,
  cx: number,
  cy: number,
  r: number,
  skin: CharacterSkinId,
  goldFrame = false,
): void {
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(51, 28, 14, 0.2)';
  ctx.beginPath();
  ctx.arc(cx, cy + 5, r + 4, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.fillStyle = goldFrame ? COLORS.hudGold : COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner cyan ring
  ctx.fillStyle = COLORS.rimCyan;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Clipped character face
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 13, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#ff6d9f';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (skin === 'octo' && sprites?.ready && sprites.octo[0]) {
    ctx.drawImage(sprites.octo[0], cx - r * 0.88, cy - r * 0.72, r * 1.76, r * 1.76);
  } else {
    ctx.save();
    ctx.translate(cx, cy + r * 0.65);
    ctx.scale(r / 58, r / 58);
    drawBuddyVectorCharacter(ctx, skin, 1, 0, false);
    ctx.restore();
  }
  ctx.restore();

  if (goldFrame) {
    // Little cyan crown on top (matching HUD spec!)
    ctx.fillStyle = COLORS.rimCyan;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - r + 4);
    ctx.lineTo(cx - 24, cy - r - 18);
    ctx.lineTo(cx - 6, cy - r - 8);
    ctx.lineTo(cx, cy - r - 24);
    ctx.lineTo(cx + 6, cy - r - 8);
    ctx.lineTo(cx + 24, cy - r - 18);
    ctx.lineTo(cx + 18, cy - r + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function drawCircleIconButton(
  ui: UiDrawContext,
  id: string,
  cx: number,
  cy: number,
  r: number,
  icon: 'restart' | 'soundOn' | 'soundOff' | 'home' | 'settings' | 'skins' | 'back',
  accentDotPos: 'tl' | 'br' = 'br',
): void {
  const { ctx, hits } = ui;
  ctx.save();

  // Shadow
  ctx.fillStyle = 'rgba(51, 28, 14, 0.22)';
  ctx.beginPath();
  ctx.arc(cx, cy + 5, r, 0, Math.PI * 2);
  ctx.fill();

  // Circle body
  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cyan dot badge (matching reference screenshots!)
  const dotX = accentDotPos === 'tl' ? cx - r * 0.68 : cx + r * 0.66;
  const dotY = accentDotPos === 'tl' ? cy - r * 0.68 : cy + r * 0.64;
  ctx.fillStyle = COLORS.rimCyan;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crisp icon glyph
  ctx.strokeStyle = COLORS.outline;
  ctx.fillStyle = COLORS.outline;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (icon === 'restart') {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, -0.7, Math.PI * 1.48);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.34, cy - r * 0.44);
    ctx.lineTo(cx + r * 0.44, cy - r * 0.14);
    ctx.lineTo(cx + r * 0.14, cy - r * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'soundOn' || icon === 'soundOff') {
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 8);
    ctx.lineTo(cx - 6, cy - 8);
    ctx.lineTo(cx + 8, cy - 19);
    ctx.lineTo(cx + 8, cy + 19);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.lineTo(cx - 16, cy + 8);
    ctx.closePath();
    ctx.fill();
    if (icon === 'soundOn') {
      ctx.beginPath();
      ctx.arc(cx + 11, cy, 11, -0.7, 0.7);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 18);
      ctx.lineTo(cx + 20, cy + 18);
      ctx.stroke();
    }
  } else if (icon === 'home') {
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 2);
    ctx.lineTo(cx, cy - 19);
    ctx.lineTo(cx + 18, cy - 2);
    ctx.lineTo(cx + 14, cy - 2);
    ctx.lineTo(cx + 14, cy + 17);
    ctx.lineTo(cx + 4, cy + 17);
    ctx.lineTo(cx + 4, cy + 5);
    ctx.lineTo(cx - 4, cy + 5);
    ctx.lineTo(cx - 4, cy + 17);
    ctx.lineTo(cx - 14, cy + 17);
    ctx.lineTo(cx - 14, cy - 2);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'settings') {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
      ctx.rotate(a);
      ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.creamCard;
    ctx.beginPath();
    ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'skins') {
    // Two cute player silhouettes
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 8, 8, 0, Math.PI * 2);
    ctx.arc(cx + 10, cy - 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 8, cy + 16, 13, Math.PI, 0);
    ctx.arc(cx + 10, cy + 16, 11, Math.PI, 0);
    ctx.fill();
  } else if (icon === 'back') {
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 14);
    ctx.lineTo(cx - 10, cy);
    ctx.lineTo(cx + 8, cy + 14);
    ctx.stroke();
  }

  ctx.restore();
  addHit(hits, id, cx - r - 6, cy - r - 6, (r + 6) * 2, (r + 6) * 2);
}

export function drawPillButton(
  ui: UiDrawContext,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  style: 'primary' | 'secondary' | 'cyan',
  showPlayArrow = false,
): void {
  const { ctx, hits } = ui;
  ctx.save();

  // Drop shadow
  ctx.fillStyle = 'rgba(51, 28, 14, 0.24)';
  drawRoundedRect(ctx, x, y + 8, w, h, h / 2);
  ctx.fill();

  // Cream outer ring for primary CTA button (exact match to 开始页 & 结算面板!)
  if (style === 'primary') {
    ctx.fillStyle = COLORS.creamCard;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 7;
    drawRoundedRect(ctx, x - 9, y - 9, w + 18, h + 18, (h + 18) / 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle =
    style === 'primary' ? COLORS.hudCoral : style === 'cyan' ? COLORS.hudCyan : COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  // Subtle top highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  drawRoundedRect(ctx, x + 20, y + 7, w - 40, h * 0.28, h * 0.14);
  ctx.fill();

  const textX = showPlayArrow ? x + w * 0.45 : x + w / 2;
  const textY = y + h / 2 + 2;
  if (style === 'primary') {
    drawComicText(
      ctx,
      label,
      textX,
      textY,
      '900 54px "Noto Sans SC", "Fredoka", sans-serif',
      '#ffffff',
      COLORS.outline,
      '',
      11,
      0,
    );
  } else {
    ctx.fillStyle = COLORS.outline;
    ctx.font = '900 38px "Noto Sans SC", "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, textX, textY);
  }

  if (showPlayArrow) {
    const ax = x + w - 74;
    const ay = y + h / 2;
    ctx.fillStyle = COLORS.rimCyan;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax - 18, ay - 20);
    ctx.lineTo(ax + 22, ay);
    ctx.lineTo(ax - 18, ay + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
  addHit(hits, id, x - 8, y - 8, w + 16, h + 16);
}

// ============================================================================
// SCREEN 1: LOADING SCREEN (matches 加载页（愤怒的章鱼）.png)
// ============================================================================
export function drawLoadingScreen(ui: UiDrawContext, progress: number): void {
  const { ctx, sprites, time } = ui;
  drawSunsetBackground(ctx, time, 760);
  drawTitleLogo(ctx, sprites, 290, time);

  // Coral brick pedestal in center
  const pedX = 205;
  const pedY = 948;
  const pedW = 490;
  const pedH = 82;
  ctx.fillStyle = COLORS.creamHalo;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 7;
  drawRoundedRect(ctx, pedX, pedY, pedW, pedH, 16);
  ctx.fill();
  ctx.stroke();

  const cols = 8;
  const cw = (pedW - 24) / cols;
  for (let i = 0; i < cols; i++) {
    ctx.fillStyle = COLORS.tileCoral;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 4;
    ctx.fillRect(pedX + 12 + i * cw, pedY + 12, cw, pedH - 24);
    ctx.strokeRect(pedX + 12 + i * cw, pedY + 12, cw, pedH - 24);
  }

  // Squashed charging octopus with basketball on head
  const squashOsc = 0.5 + 0.5 * Math.sin(time * 4.5);
  const fIdx = Math.min(5, Math.floor(squashOsc * 5.99));
  if (sprites?.ready && sprites.octo[fIdx]) {
    const img = sprites.octo[fIdx];
    const dw = img.width * 1.25;
    const dh = img.height * 1.25;
    ctx.drawImage(img, STAGE_W / 2 - dw / 2, pedY - dh + 14, dw, dh);
    const ballY = pedY - dh * 0.85 - 52;
    if (sprites.ballMain) {
      ctx.drawImage(sprites.ballMain, STAGE_W / 2 - 58, ballY, 116, 116);
    }
  } else {
    ctx.save();
    ctx.translate(STAGE_W / 2, pedY);
    ctx.scale(1.6, 1.6);
    drawBuddyVectorCharacter(ctx, 'octo', 1, squashOsc, true);
    ctx.restore();
  }

  // Cyan-to-coral loading bar + star marker + percentage
  const barX = 86;
  const barY = 1094;
  const barW = 580;
  const barH = 56;
  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 7;
  drawRoundedRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  ctx.stroke();

  const pct = Math.max(0.06, Math.min(1, progress));
  const fillW = (barW - 18) * pct;
  const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  barGrad.addColorStop(0, COLORS.hudCyan);
  barGrad.addColorStop(0.7, COLORS.hudCyan);
  barGrad.addColorStop(1, COLORS.hudCoral);
  ctx.fillStyle = barGrad;
  drawRoundedRect(ctx, barX + 9, barY + 9, fillW, barH - 18, (barH - 18) / 2);
  ctx.fill();

  // Tick marks
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 4;
  for (const frac of [0.25, 0.5, 0.75]) {
    const tx = barX + barW * frac;
    ctx.beginPath();
    ctx.moveTo(tx, barY + barH - 22);
    ctx.lineTo(tx, barY + barH - 9);
    ctx.stroke();
  }

  // Star indicator at progress head
  drawSpikyStar(ctx, barX + 9 + fillW, barY + 4, 24, 11, 8, time * 2, COLORS.rimCyan, COLORS.outline, 4);

  // Percentage text
  ctx.fillStyle = COLORS.outline;
  ctx.font = '900 46px "Fredoka", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(progress * 100)}%`, barX + barW + 24, barY + barH / 2 + 2);

  // Tip pill: 小提示：按得越久 弹得越猛
  const tipX = 96;
  const tipY = 1200;
  const tipW = 708;
  const tipH = 116;
  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 7;
  drawRoundedRect(ctx, tipX, tipY, tipW, tipH, tipH / 2);
  ctx.fill();
  ctx.stroke();

  // Cyan starburst lightbulb badge
  drawSpikyStar(ctx, tipX + 74, tipY + tipH / 2, 42, 26, 9, 0, COLORS.rimCyan, COLORS.outline, 4);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(tipX + 74, tipY + tipH / 2 - 4, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(tipX + 67, tipY + tipH / 2 + 10, 14, 9);

  ctx.fillStyle = COLORS.outline;
  ctx.font = '900 36px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('小提示：按得越久 弹得越猛', tipX + 142, tipY + tipH / 2 + 2);
}

// ============================================================================
// SCREEN 2: MAIN MENU (matches 开始页·主菜单（愤怒的章鱼）.png)
// ============================================================================
export function drawMainMenu(
  ui: UiDrawContext,
  modal: 'none' | 'settings' | 'skins' | 'checkin',
  checkInMessage: string,
): void {
  const { ctx, sprites, time, save, hits } = ui;
  drawSunsetBackground(ctx, time, 760);

  // Top-left avatar + LV pill + Coins pill
  drawAvatarBadge(ctx, sprites, 102, 118, 66, save.selectedSkin, false);

  // LV badge
  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 5.5;
  drawRoundedRect(ctx, 198, 66, 166, 62, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.outline;
  ctx.font = '900 38px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LV ${save.playerLevel}`, 281, 99);

  // Coins pill
  ctx.fillStyle = COLORS.creamCard;
  drawRoundedRect(ctx, 198, 138, 174, 48, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.rimCyan;
  ctx.beginPath();
  ctx.arc(224, 162, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.outline;
  ctx.font = '800 28px "Fredoka", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(save.coins.toLocaleString('en-US'), 250, 164);

  // Top-right 3 circular icon buttons: Settings, Sound, Skins
  drawCircleIconButton(ui, 'btn-settings', 586, 110, 44, 'settings', 'tl');
  drawCircleIconButton(ui, 'btn-mute', 700, 110, 44, save.muted ? 'soundOff' : 'soundOn', 'tl');
  drawCircleIconButton(ui, 'btn-skins', 814, 110, 44, 'skins', 'tl');

  // Comic Title Logo
  drawTitleLogo(ctx, sprites, 360, time);

  // Decorative floating basketball hoop on mid-right
  ctx.save();
  ctx.translate(778, 594 + Math.sin(time * 2.2) * 5);
  ctx.scale(1.1, 1.1);
  // Mini net
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-58, 10);
  ctx.lineTo(-34, 96);
  ctx.moveTo(58, 10);
  ctx.lineTo(34, 96);
  ctx.moveTo(-54, 10);
  ctx.lineTo(14, 96);
  ctx.moveTo(54, 10);
  ctx.lineTo(-14, 96);
  ctx.moveTo(-14, 10);
  ctx.lineTo(34, 96);
  ctx.moveTo(14, 10);
  ctx.lineTo(-34, 96);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.stroke();
  // Mini turquoise rim
  ctx.fillStyle = COLORS.rimCyan;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, -74, -14, 148, 28, 14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Character Podium (center pink octopus + left white dog + right black duck!)
  const drawMiniBlock = (bx: number, by: number, cols: number, rows: number, ts = 48) => {
    ctx.fillStyle = COLORS.creamHalo;
    drawRoundedRect(ctx, bx - 9, by - 9, cols * ts + 18, rows * ts + 18, 14);
    ctx.fill();
    ctx.fillStyle = COLORS.outline;
    drawRoundedRect(ctx, bx - 4, by - 4, cols * ts + 8, rows * ts + 8, 8);
    ctx.fill();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = r === 0 ? COLORS.tileCyan : COLORS.tileCoral;
        ctx.fillRect(bx + c * ts + 2.5, by + r * ts + 2.5, ts - 5, ts - 5);
      }
    }
  };

  drawMiniBlock(128, 934, 3, 2, 46); // Left podium
  drawMiniBlock(630, 934, 3, 2, 46); // Right podium
  drawMiniBlock(308, 902, 5, 3, 56); // Center podium (tallest!)

  // Left buddy (White dog)
  ctx.save();
  ctx.translate(196, 934);
  ctx.scale(1.1, 1.1);
  drawBuddyVectorCharacter(ctx, 'dog', 1, 0, false);
  ctx.restore();

  // Right buddy (Black duck)
  ctx.save();
  ctx.translate(698, 934);
  ctx.scale(1.1, 1.1);
  drawBuddyVectorCharacter(ctx, 'duck', 1, 0, false);
  ctx.restore();

  // Center Star Hero (Pink Octopus with basketball on head!)
  const heroBob = Math.sin(time * 3.2) * 4;
  if (sprites?.ready && sprites.octo[0]) {
    const img = sprites.octo[0];
    const dw = img.width * 1.12;
    const dh = img.height * 1.12;
    ctx.drawImage(img, STAGE_W / 2 - dw / 2, 904 - dh + 6, dw, dh);
    if (sprites.ballMain) {
      ctx.drawImage(sprites.ballMain, STAGE_W / 2 - 58, 904 - dh - 94 + heroBob, 116, 116);
    }
  }

  // Primary CTA Button: "开始游戏 ▶"
  drawPillButton(ui, 'btn-play', 102, 1114, 696, 128, '开始游戏', 'primary', true);

  // Two mode buttons: "单人闯关" & "双人同屏"
  drawPillButton(ui, 'btn-levels', 94, 1286, 338, 102, '⚑ 单人闯关', 'secondary', false);
  drawPillButton(ui, 'btn-versus', 468, 1286, 338, 102, '⚑ 双人同屏', 'secondary', false);

  // Bottom pill: "每日签到 领新选手"
  const pillX = 224;
  const pillY = 1432;
  const pillW = 452;
  const pillH = 68;
  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 5.5;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.stroke();
  drawSpikyStar(ctx, pillX + 46, pillY + pillH / 2, 22, 10, 8, time, COLORS.rimCyan, COLORS.outline, 3.5);
  ctx.fillStyle = COLORS.outline;
  ctx.font = '900 30px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('每日签到  领新选手', pillX + 86, pillY + pillH / 2 + 1);
  addHit(hits, 'btn-checkin', pillX, pillY, pillW, pillH);

  // Optional modal overlays
  if (modal !== 'none') {
    drawMenuModal(ui, modal, checkInMessage);
  }
}

function drawMenuModal(
  ui: UiDrawContext,
  modal: 'settings' | 'skins' | 'checkin',
  checkInMessage: string,
): void {
  const { ctx, sprites, save, hits } = ui;
  // Clear background hits so clicks only target modal
  hits.length = 0;

  ctx.fillStyle = 'rgba(42, 20, 8, 0.56)';
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);

  const cx = 110;
  const cy = 440;
  const cw = 680;
  const ch = 640;

  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 8;
  drawRoundedRect(ctx, cx, cy, cw, ch, 40);
  ctx.fill();
  ctx.stroke();

  // Top cyan bar accent
  ctx.fillStyle = COLORS.rimCyan;
  drawRoundedRect(ctx, cx + 8, cy + 8, cw - 16, 22, 12);
  ctx.fill();

  if (modal === 'settings') {
    drawComicText(ctx, '游戏设置', STAGE_W / 2, cy + 96, '900 56px "Noto Sans SC", sans-serif', COLORS.hudCoral, COLORS.outline, '#fff', 14, 6);

    drawPillButton(
      ui,
      'modal-toggle-mute',
      cx + 70,
      cy + 185,
      cw - 140,
      96,
      save.muted ? '音效：已关闭' : '音效：已开启',
      save.muted ? 'secondary' : 'cyan',
    );
    drawPillButton(
      ui,
      'modal-toggle-guide',
      cx + 70,
      cy + 310,
      cw - 140,
      96,
      save.showGuide ? '辅助瞄准线：开启' : '辅助瞄准线：关闭',
      save.showGuide ? 'cyan' : 'secondary',
    );
    drawPillButton(ui, 'modal-close', cx + 140, cy + 476, cw - 280, 96, '确定', 'primary');
  } else if (modal === 'skins') {
    drawComicText(ctx, '选择选手', STAGE_W / 2, cy + 90, '900 56px "Noto Sans SC", sans-serif', COLORS.hudCoral, COLORS.outline, '#fff', 14, 6);

    const skins: { id: CharacterSkinId; name: string; cost: number }[] = [
      { id: 'octo', name: '愤怒章鱼', cost: 0 },
      { id: 'dog', name: '墨镜柴犬', cost: 400 },
      { id: 'duck', name: '酷黑鸭鸭', cost: 600 },
    ];

    skins.forEach((s, i) => {
      const bx = cx + 44 + i * 204;
      const by = cy + 178;
      const bw = 184;
      const bh = 250;
      const unlocked = save.unlockedSkins.includes(s.id);
      const selected = save.selectedSkin === s.id;

      ctx.fillStyle = selected ? '#d9fffc' : '#fffdf7';
      ctx.strokeStyle = selected ? COLORS.hudCyan : COLORS.outline;
      ctx.lineWidth = selected ? 7 : 5;
      drawRoundedRect(ctx, bx, by, bw, bh, 26);
      ctx.fill();
      ctx.stroke();

      drawAvatarBadge(ctx, sprites, bx + bw / 2, by + 84, 54, s.id, selected);

      ctx.fillStyle = COLORS.outline;
      ctx.font = '900 28px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.name, bx + bw / 2, by + 168);

      ctx.fillStyle = selected ? COLORS.hudCyan : unlocked ? '#449e6b' : COLORS.hudCoral;
      ctx.font = '800 24px "Noto Sans SC", sans-serif';
      ctx.fillText(selected ? '使用中' : unlocked ? '点击切换' : `${s.cost} 金币`, bx + bw / 2, by + 214);

      addHit(hits, `skin-${s.id}`, bx, by, bw, bh);
    });

    drawPillButton(ui, 'modal-close', cx + 140, cy + 482, cw - 280, 96, '完成', 'primary');
  } else if (modal === 'checkin') {
    drawComicText(ctx, '每日签到', STAGE_W / 2, cy + 96, '900 56px "Noto Sans SC", sans-serif', COLORS.hudCoral, COLORS.outline, '#fff', 14, 6);

    drawSpikyStar(ctx, STAGE_W / 2, cy + 245, 76, 38, 9, ui.time * 0.8, COLORS.rimCyan, COLORS.outline, 6);
    ctx.fillStyle = COLORS.outline;
    ctx.font = '900 34px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(checkInMessage, STAGE_W / 2, cy + 374);
    ctx.font = '700 26px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#754c2e';
    ctx.fillText(`当前金币：${save.coins} · 累计签到 ${save.checkInStreak} 天`, STAGE_W / 2, cy + 424);

    drawPillButton(ui, 'modal-close', cx + 140, cy + 482, cw - 280, 96, '太棒了!', 'primary');
  }
}

// ============================================================================
// SCREEN 3: LEVEL SELECT
// ============================================================================
export function drawLevelSelect(ui: UiDrawContext): void {
  const { ctx, time, save, hits } = ui;
  drawSunsetBackground(ctx, time, 900);

  drawCircleIconButton(ui, 'btn-back-menu', 92, 108, 44, 'back', 'br');
  drawComicText(ctx, '选择关卡', STAGE_W / 2, 112, '900 62px "Noto Sans SC", sans-serif', '#ffffff', COLORS.outline, '', 16, 0);

  // World header pill
  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, 210, 184, 480, 68, 34);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.hudCyan;
  drawRoundedRect(ctx, 224, 196, 452, 44, 22);
  ctx.fill();
  ctx.fillStyle = COLORS.outline;
  ctx.font = '900 30px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('世界 1 · 日落沙滩 & 黄金岛屿', STAGE_W / 2, 219);

  // 2 columns x 5 rows cards
  const cardW = 376;
  const cardH = 196;
  const startX = 56;
  const startY = 290;
  const gapX = 36;
  const gapY = 28;

  LEVELS.forEach((lvl, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    const unlocked = lvl.id <= save.unlockedLevel;
    const stars = save.starsByLevel[lvl.id] ?? 0;

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(51, 28, 14, 0.2)';
    drawRoundedRect(ctx, x, y + 7, cardW, cardH, 28);
    ctx.fill();

    // Card
    ctx.fillStyle = unlocked ? COLORS.creamCard : '#dfd0b9';
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 6;
    drawRoundedRect(ctx, x, y, cardW, cardH, 28);
    ctx.fill();
    ctx.stroke();

    // Top badge
    ctx.fillStyle = unlocked ? COLORS.hudCyan : '#b4a38c';
    drawRoundedRect(ctx, x + 20, y + 18, 108, 44, 22);
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = COLORS.outline;
    ctx.font = '900 28px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lvl.code, x + 74, y + 41);

    // Layout tag
    ctx.fillStyle = '#8b5e3c';
    ctx.font = '700 22px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(lvl.layoutTag, x + cardW - 24, y + 41);

    // Level name
    ctx.fillStyle = unlocked ? COLORS.outline : '#7e6f5d';
    ctx.font = '900 32px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(lvl.name, x + 24, y + 102);

    // 3 stars or lock icon
    if (unlocked) {
      for (let s = 0; s < 3; s++) {
        drawFiveStar(
          ctx,
          x + 58 + s * 62,
          y + 154,
          22,
          10.5,
          s < stars ? COLORS.rimCyan : '#e6dbc8',
          COLORS.outline,
          4,
        );
      }
    } else {
      ctx.fillStyle = '#8d7b66';
      ctx.font = '800 26px "Noto Sans SC", sans-serif';
      ctx.fillText('🔒 通关上一关解锁', x + 24, y + 154);
    }

    ctx.restore();
    if (unlocked) {
      addHit(hits, `level-${idx}`, x, y, cardW, cardH);
    }
  });
}

// ============================================================================
// GAMEPLAY HUD (matches HUD 组件规范表 + 单关通关·进球庆祝帧.png)
// ============================================================================
export function drawGameplayHud(
  ui: UiDrawContext,
  level: LevelDef,
  shotsLeft: number,
  charging: boolean,
  power: number,
  showTutorial: boolean,
  versus: VersusState,
  completionRatio: number,
): void {
  const { ctx, sprites, time, save } = ui;

  // 1. Top-left Avatar + level pill (or P1/P2 badge in versus mode)
  const pillX = 96;
  const pillY = 66;
  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, pillX, pillY, 178, 68, 34);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COLORS.outline;
  ctx.font = '900 34px "Fredoka", "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(versus.enabled ? `P${versus.currentPlayer} 回合` : level.code, pillX + 108, pillY + 36);

  const avatarSkin: CharacterSkinId = versus.enabled
    ? versus.currentPlayer === 1
      ? 'octo'
      : 'dog'
    : save.selectedSkin;
  drawAvatarBadge(ctx, sprites, 90, 100, 52, avatarSkin, versus.enabled && versus.currentPlayer === 2);

  // 2. Top-center completion / score bar
  if (versus.enabled) {
    // P1 vs P2 scoreboard pill
    ctx.fillStyle = COLORS.creamCard;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 5.5;
    drawRoundedRect(ctx, 296, 56, 286, 86, 26);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 26px "Fredoka", "Noto Sans SC", sans-serif';
    ctx.fillStyle = COLORS.pinkOcto;
    ctx.textAlign = 'left';
    ctx.fillText(`P1: ${versus.scores[0]}分`, 322, 86);
    ctx.fillStyle = COLORS.hudCyan;
    ctx.textAlign = 'right';
    ctx.fillText(`P2: ${versus.scores[1]}分`, 558, 86);

    ctx.fillStyle = COLORS.outline;
    ctx.font = '800 22px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${versus.round}/${versus.maxRounds} 轮`, 439, 122);
  } else {
    ctx.fillStyle = COLORS.outline;
    ctx.font = '900 30px "Noto Sans SC", "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`完成度 ${Math.round(completionRatio * 100)}%`, 438, 72);

    // Progress bar pill
    const pbX = 310;
    const pbY = 98;
    const pbW = 256;
    const pbH = 30;
    ctx.fillStyle = COLORS.creamCard;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, pbX, pbY, pbW, pbH, 15);
    ctx.fill();
    ctx.stroke();

    const fillW = Math.max(18, (pbW - 10) * completionRatio);
    ctx.fillStyle = COLORS.hudCyan;
    drawRoundedRect(ctx, pbX + 5, pbY + 5, fillW, pbH - 10, 10);
    ctx.fill();

    // Remaining shots circle counter (matches HUD 组件规范表 2/5 -> 5/5!)
    const scX = 294;
    const scY = 148;
    const scW = 232;
    const scH = 44;
    ctx.fillStyle = COLORS.creamCard;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 4.5;
    drawRoundedRect(ctx, scX, scY, scW, scH, 22);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < level.maxShots; i++) {
      const dx = scX + 28 + i * 42;
      const dy = scY + scH / 2;
      ctx.fillStyle = i < shotsLeft ? COLORS.rimCyan : '#ede3d1';
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(dx, dy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.outline;
    ctx.font = '900 28px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${shotsLeft}/${level.maxShots}`, scX + scW + 12, scY + scH / 2 + 1);
  }

  // 3. Top-right 3 circular icon buttons: Restart, Mute, Home
  drawCircleIconButton(ui, 'hud-restart', 640, 100, 42, 'restart', 'br');
  drawCircleIconButton(ui, 'hud-mute', 738, 100, 42, save.muted ? 'soundOff' : 'soundOn', 'br');
  drawCircleIconButton(ui, 'hud-home', 836, 100, 42, 'home', 'br');

  // 4. Charge Power Bar (bottom floating HUD pill — exact match to HUD 组件规范表!)
  const barW = 460;
  const barH = 44;
  const barX = (STAGE_W - barW) / 2;
  const barY = 1384;

  ctx.save();
  ctx.globalAlpha = charging ? 1 : 0.78;
  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  ctx.stroke();

  if (power > 0.01) {
    const innerW = (barW - 14) * power;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, COLORS.hudCyan);
    grad.addColorStop(0.72, COLORS.hudCyan);
    grad.addColorStop(0.84, COLORS.hudCoral);
    grad.addColorStop(1, '#ff5b36');
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, barX + 7, barY + 7, Math.max(18, innerW), barH - 14, (barH - 14) / 2);
    ctx.fill();
  }

  // Power bar tick marks
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 4;
  for (const f of [0.25, 0.5, 0.75]) {
    const tx = barX + barW * f;
    ctx.beginPath();
    ctx.moveTo(tx, barY + 11);
    ctx.lineTo(tx, barY + barH - 11);
    ctx.stroke();
  }

  // MAX pill badge when power > 85%
  if (power > 0.85) {
    ctx.fillStyle = COLORS.outline;
    drawRoundedRect(ctx, barX + barW - 86, barY - 26, 86, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MAX', barX + barW - 43, barY - 9);
  }
  ctx.restore();

  // Bottom hint caption inside a crisp cream pill (never overlaps star poles!)
  const hintText = charging
    ? `蓄力中 ${Math.round(power * 100)}% · 松手投篮！`
    : level.hint ?? '长按屏幕或空格键蓄力，松手投篮！';
  ctx.save();
  ctx.font = '900 24px "Noto Sans SC", sans-serif';
  const textW = ctx.measureText(hintText).width;
  const hintPillW = Math.min(760, Math.max(360, textW + 56));
  const hintPillH = 46;
  const hintPillX = (STAGE_W - hintPillW) / 2;
  const hintPillY = barY + 56;
  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 4.5;
  drawRoundedRect(ctx, hintPillX, hintPillY, hintPillW, hintPillH, hintPillH / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.outline;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hintText, STAGE_W / 2, hintPillY + hintPillH / 2 + 1);
  ctx.restore();

  // 5. Level 1 Onboarding Callouts (exact match to HUD 组件规范表 ①②③ + tapping hand!)
  if (showTutorial && !charging) {
    const steps = [
      { n: '1', text: '按住蓄力', x: 64, y: 690 },
      { n: '2', text: '松手投篮', x: 64, y: 762 },
      { n: '3', text: '球从上方落入', x: 64, y: 834 },
    ];
    for (const st of steps) {
      const pw = st.n === '3' ? 248 : 204;
      ctx.fillStyle = COLORS.creamCard;
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = 5;
      drawRoundedRect(ctx, st.x, st.y, pw, 54, 27);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = COLORS.hudCyan;
      ctx.beginPath();
      ctx.arc(st.x + 29, st.y + 27, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '900 22px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.n, st.x + 29, st.y + 28);

      ctx.fillStyle = COLORS.outline;
      ctx.font = '900 25px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(st.text, st.x + 56, st.y + 28);
    }

    // Animated pulsing cyan tap ring + hand icon near octopus
    const pulse = (time * 1.4) % 1;
    const hx = 170;
    const hy = 985;
    ctx.save();
    ctx.strokeStyle = COLORS.rimCyan;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 1 - pulse;
    ctx.beginPath();
    ctx.arc(hx, hy, 18 + pulse * 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(hx, hy + Math.sin(time * 5) * 6);
    ctx.fillStyle = COLORS.rimCyan;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 5;
    // Simple cute pointer finger
    drawRoundedRect(ctx, -11, -12, 22, 46, 11);
    ctx.fill();
    ctx.stroke();
    drawRoundedRect(ctx, -22, 16, 48, 36, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================================
// CELEBRATION BANNER ("进了!" — matches 单关通关·进球庆祝帧.png)
// ============================================================================
export function drawCelebrateOverlay(ctx: CanvasRenderingContext2D, timer: number, bonusLabel: string): void {
  const pop = Math.min(1, timer / 0.24);
  const elastic = pop < 1 ? 0.5 + 0.65 * Math.sin(pop * Math.PI * 0.72) : 1 + Math.sin(timer * 7) * 0.03;

  ctx.save();
  ctx.translate(STAGE_W / 2, 540);
  ctx.scale(elastic, elastic);
  ctx.rotate(-0.04);
  drawComicText(
    ctx,
    '进了!',
    0,
    0,
    '900 170px "Noto Sans SC", "Fredoka", sans-serif',
    '#f26c42',
    COLORS.outline,
    '#ffffff',
    36,
    18,
  );
  if (bonusLabel) {
    drawComicText(
      ctx,
      bonusLabel,
      0,
      118,
      '900 44px "Noto Sans SC", "Fredoka", sans-serif',
      COLORS.rimCyan,
      COLORS.outline,
      '#ffffff',
      14,
      6,
    );
  }
  ctx.restore();
}

// ============================================================================
// SETTLEMENT PANEL (matches 单关通关·结算面板.png!)
// ============================================================================
export function drawResultPanel(
  ui: UiDrawContext,
  level: LevelDef,
  won: boolean,
  starsEarned: number,
  shotsUsed: number,
  elapsedSec: number,
  panelTimer: number,
  hasNextLevel: boolean,
): void {
  const { ctx, sprites } = ui;
  // Dimmed sunset overlay
  ctx.fillStyle = 'rgba(46, 22, 6, 0.56)';
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);

  const slide = Math.min(1, panelTimer / 0.28);
  const ease = 1 - Math.pow(1 - slide, 3);
  const offsetY = (1 - ease) * 260;

  const cardX = 86;
  const cardY = 408 + offsetY;
  const cardW = 728;
  const cardH = 928;

  ctx.save();

  // Cute pink octopus peeking over the TOP-LEFT of the card (exact match to 单关通关·结算面板.png!)
  if (sprites?.ready && sprites.octo[0]) {
    ctx.drawImage(sprites.octo[0], cardX + 26, cardY - 134, 174, 174);
    if (sprites.ballMain) {
      ctx.drawImage(sprites.ballMain, cardX + 76, cardY - 208, 78, 78);
    }
    // Little sparkles next to octopus
    drawSpikyStar(ctx, cardX + 214, cardY - 150, 18, 6, 4, 0, COLORS.rimCyan, 'transparent', 0);
    drawSpikyStar(ctx, cardX + 244, cardY - 102, 22, 7, 4, 0, COLORS.rimCyan, 'transparent', 0);
  }

  // Card drop shadow
  ctx.fillStyle = 'rgba(34, 15, 5, 0.35)';
  drawRoundedRect(ctx, cardX, cardY + 14, cardW, cardH, 48);
  ctx.fill();

  // Cream card body
  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 9;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 48);
  ctx.fill();
  ctx.stroke();

  // Turquoise top trim stripe inside card
  ctx.save();
  drawRoundedRect(ctx, cardX + 4, cardY + 4, cardW - 8, cardH - 8, 44);
  ctx.clip();
  ctx.fillStyle = won ? COLORS.rimCyan : COLORS.hudCoral;
  ctx.fillRect(cardX, cardY, cardW, 24);
  ctx.restore();

  // Re-draw octopus tentacles gripping the top rim of the card!
  ctx.fillStyle = '#ff9d6e';
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 5;
  for (const px of [cardX + 58, cardX + 194, cardX + 236]) {
    ctx.beginPath();
    ctx.ellipse(px, cardY + 6, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Big comic heading: "过关!" or "差一点!"
  drawComicText(
    ctx,
    won ? '过关!' : '差一点!',
    STAGE_W / 2,
    cardY + 150,
    '900 124px "Noto Sans SC", "Fredoka", sans-serif',
    won ? '#f26c42' : '#d65548',
    COLORS.outline,
    '#ffffff',
    26,
    13,
  );

  // Subtitle: 第 N 关 · 世界名
  ctx.fillStyle = COLORS.outline;
  ctx.font = '900 38px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`第 ${level.id} 关 · ${level.worldName}（${level.name}）`, STAGE_W / 2, cardY + 266);

  // 3 Big Cyan Stars with radiant lines!
  for (let i = 0; i < 3; i++) {
    const sx = STAGE_W / 2 + (i - 1) * 204;
    const sy = cardY + 412;
    const earned = won && i < starsEarned;
    const reveal = Math.max(0, Math.min(1, (panelTimer - 0.18 - i * 0.14) / 0.22));
    const scale = earned ? 0.5 + 0.5 * reveal + Math.sin(reveal * Math.PI) * 0.18 : 0.92;

    ctx.save();
    ctx.translate(sx, sy);
    if (earned) {
      // Radiant lines around earned star
      ctx.strokeStyle = 'rgba(246, 180, 128, 0.72)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      for (let r = 0; r < 10; r++) {
        const a = (r * Math.PI * 2) / 10;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 86, Math.sin(a) * 86);
        ctx.lineTo(Math.cos(a) * 108, Math.sin(a) * 108);
        ctx.stroke();
      }
    }
    ctx.scale(scale, scale);
    // White outer halo for star
    drawFiveStar(ctx, 0, 0, 74, 38, '#ffffff', COLORS.outline, 10);
    drawFiveStar(ctx, 0, 0, 62, 31, earned ? COLORS.rimCyan : '#e8decb', COLORS.outline, 6);
    ctx.restore();
  }

  // Stats pills: 投掷 N | 用时 Xs
  const statY = cardY + 548;
  const statW = 286;
  const statH = 92;

  ctx.fillStyle = '#fffdf8';
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 5.5;
  drawRoundedRect(ctx, cardX + 64, statY, statW, statH, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.outline;
  ctx.font = '900 34px "Noto Sans SC", "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🏀 投掷 ${shotsUsed}`, cardX + 64 + statW / 2, statY + statH / 2 + 2);

  ctx.fillStyle = '#fffdf8';
  drawRoundedRect(ctx, cardX + cardW - 64 - statW, statY, statW, statH, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.outline;
  ctx.fillText(`⏱ 用时 ${Math.max(1, Math.round(elapsedSec))}s`, cardX + cardW - 64 - statW / 2, statY + statH / 2 + 2);

  // Action buttons: 下一关 ▶ & 重玩
  if (won && hasNextLevel) {
    drawPillButton(ui, 'res-next', cardX + 68, cardY + 678, cardW - 136, 110, '下一关', 'primary', true);
    drawPillButton(ui, 'res-retry', cardX + 124, cardY + 812, cardW - 248, 86, '重玩', 'secondary', false);
  } else if (won && !hasNextLevel) {
    drawPillButton(ui, 'res-levels', cardX + 68, cardY + 678, cardW - 136, 110, '全部通关 · 选关', 'primary', true);
    drawPillButton(ui, 'res-retry', cardX + 124, cardY + 812, cardW - 248, 86, '重玩本关', 'secondary', false);
  } else {
    drawPillButton(ui, 'res-retry', cardX + 68, cardY + 678, cardW - 136, 110, '再来一次', 'primary', true);
    drawPillButton(ui, 'res-levels', cardX + 124, cardY + 812, cardW - 248, 86, '返回选关', 'secondary', false);
  }

  ctx.restore();
}

// ============================================================================
// LOCAL 2-PLAYER VERSUS RESULT PANEL
// ============================================================================
export function drawVersusResultPanel(ui: UiDrawContext, versus: VersusState): void {
  const { ctx, sprites } = ui;
  ctx.fillStyle = 'rgba(46, 22, 6, 0.58)';
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);

  const cardX = 94;
  const cardY = 410;
  const cardW = 712;
  const cardH = 820;

  ctx.fillStyle = COLORS.creamCard;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 9;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 48);
  ctx.fill();
  ctx.stroke();

  const [s1, s2] = versus.scores;
  const title = s1 > s2 ? 'P1 获胜!' : s2 > s1 ? 'P2 获胜!' : '平局大战!';
  drawComicText(ctx, title, STAGE_W / 2, cardY + 130, '900 96px "Noto Sans SC", "Fredoka", sans-serif', COLORS.hudCoral, COLORS.outline, '#fff', 22, 10);

  drawAvatarBadge(ctx, sprites, cardX + 206, cardY + 310, 74, 'octo', s1 >= s2);
  drawAvatarBadge(ctx, sprites, cardX + cardW - 206, cardY + 310, 74, 'dog', s2 >= s1);

  ctx.fillStyle = COLORS.outline;
  ctx.font = '900 44px "Fredoka", "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`P1: ${s1} 分`, cardX + 206, cardY + 432);
  ctx.fillText(`P2: ${s2} 分`, cardX + cardW - 206, cardY + 432);

  drawPillButton(ui, 'vs-again', cardX + 86, cardY + 530, cardW - 172, 110, '再来一局', 'primary', true);
  drawPillButton(ui, 'vs-menu', cardX + 146, cardY + 670, cardW - 292, 92, '返回主页', 'secondary', false);
}
