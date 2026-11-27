import { loadAllSprites, type LoadedSprites } from './assets.ts';
import { sound } from './audio.ts';
import { COLORS, FIXED_DT, STAGE_H, STAGE_W } from './constants.ts';
import { LEVELS } from './levels.ts';
import {
  computeChargePower,
  createIdleBall,
  getBallRestPosition,
  getHoopPosition,
  launchBall,
  predictTrajectory,
  stepBallPhysics,
} from './physics.ts';
import {
  drawBasketballAndTrail,
  drawBlockClusters,
  drawCharacter,
  drawHoopBack,
  drawHoopFront,
  drawParticlesAndCallouts,
  drawStarPoles,
  drawSunsetBackground,
  drawTrajectoryPreview,
  type RenderFxState,
} from './renderer.ts';
import { loadSave, persistSave, todayKey } from './save.ts';
import type { BallState, CharacterSkinId, GameScreen, LevelDef, PhysicsEvent, SaveData, VersusState } from './types.ts';
import {
  drawCelebrateOverlay,
  drawGameplayHud,
  drawLevelSelect,
  drawLoadingScreen,
  drawMainMenu,
  drawResultPanel,
  drawVersusResultPanel,
  type HitRegion,
  type UiDrawContext,
} from './ui-draw.ts';

export class AngryOctoGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sprites: LoadedSprites | null = null;
  private save: SaveData;

  private screen: GameScreen = 'loading';
  private menuModal: 'none' | 'settings' | 'skins' | 'checkin' = 'none';
  private checkInMessage = '';

  private loadProgress = 0;
  private spriteLoadRatio = 0;

  private levelIndex = 0;
  private levelTime = 0;
  private levelElapsed = 0;
  private shotsLeft = 5;
  private shotsUsed = 0;
  private hasShotInSession = false;

  private ball: BallState;
  private charging = false;
  private chargeTime = 0;
  private chargePower = 0;
  private shotResetTimer = 0;
  private celebrateTimer = 0;
  private celebrateBonusText = '';
  private resultTimer = 0;
  private wonLastLevel = false;
  private starsEarned = 0;
  private screenShake = 0;

  private versus: VersusState = {
    enabled: false,
    currentPlayer: 1,
    round: 1,
    maxRounds: 5,
    scores: [0, 0],
    shotsTaken: [0, 0],
    levelIndex: 0,
  };

  private fx: RenderFxState = {
    time: 0,
    blockPulse: [],
    starPulse: [],
    rimWobble: 0,
    netSwish: 0,
    octoJumpY: 0,
    octoStretchX: 1,
    octoStretchY: 1,
    trail: [],
    particles: [],
    callouts: [],
    celebrateRays: 0,
  };

  private hitRegions: HitRegion[] = [];
  private lastRaf = 0;
  private accumulator = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not initialize 2D context');
    this.ctx = context;

    this.save = loadSave();
    sound.setMuted(this.save.muted);
    this.ball = createIdleBall(LEVELS[0]);

    this.bindEvents();
    this.startAssetLoad();
    this.lastRaf = performance.now();
    requestAnimationFrame(this.loop);
  }

  private get currentLevel(): LevelDef {
    return LEVELS[this.levelIndex] ?? LEVELS[0];
  }

  private startAssetLoad(): void {
    loadAllSprites((r) => {
      this.spriteLoadRatio = r;
    })
      .then((loaded) => {
        this.sprites = loaded;
        this.spriteLoadRatio = 1;
      })
      .catch((err) => {
        console.warn('Sprite load fallback triggered:', err);
        this.spriteLoadRatio = 1;
      });
  }

  private bindEvents(): void {
    const toStage = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * STAGE_W,
        y: ((clientY - rect.top) / rect.height) * STAGE_H,
      };
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      sound.unlock();
      const pt = toStage(e.clientX, e.clientY);

      // Check UI buttons first (reverse order so top-most wins)
      for (let i = this.hitRegions.length - 1; i >= 0; i--) {
        const r = this.hitRegions[i];
        if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
          this.handleButtonClick(r.id);
          return;
        }
      }

      if (this.screen === 'playing') {
        this.beginCharge();
      } else if (this.screen === 'loading' && this.loadProgress >= 0.99) {
        this.screen = 'menu';
      }
    };

    const onUp = (e: PointerEvent) => {
      if (this.charging) {
        e.preventDefault();
        this.releaseCharge();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        sound.unlock();
        if (this.screen === 'playing') {
          this.beginCharge();
        }
      } else if (e.code === 'KeyR' && this.screen === 'playing') {
        this.startLevel(this.levelIndex, this.versus.enabled);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.charging) {
          this.releaseCharge();
        }
      }
    };

    this.canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  private handleButtonClick(id: string): void {
    sound.playClick();

    if (id === 'btn-play') {
      const targetIdx = Math.min(LEVELS.length - 1, Math.max(0, this.save.unlockedLevel - 1));
      this.startLevel(targetIdx, false);
    } else if (id === 'btn-levels') {
      this.screen = 'levelSelect';
    } else if (id === 'btn-versus') {
      this.startVersusMatch();
    } else if (id === 'btn-settings') {
      this.menuModal = 'settings';
    } else if (id === 'btn-skins') {
      this.menuModal = 'skins';
    } else if (id === 'btn-mute' || id === 'hud-mute' || id === 'modal-toggle-mute') {
      this.save.muted = !this.save.muted;
      sound.setMuted(this.save.muted);
      persistSave(this.save);
    } else if (id === 'modal-toggle-guide') {
      this.save.showGuide = !this.save.showGuide;
      persistSave(this.save);
    } else if (id === 'btn-checkin') {
      this.handleDailyCheckIn();
    } else if (id === 'modal-close') {
      this.menuModal = 'none';
    } else if (id.startsWith('skin-')) {
      const skinId = id.slice(5) as CharacterSkinId;
      this.selectOrUnlockSkin(skinId);
    } else if (id === 'btn-back-menu' || id === 'hud-home' || id === 'vs-menu') {
      this.charging = false;
      sound.stopCharge();
      this.versus.enabled = false;
      this.screen = 'menu';
    } else if (id.startsWith('level-')) {
      const idx = Number(id.slice(6));
      if (!Number.isNaN(idx) && idx >= 0 && idx < LEVELS.length) {
        this.startLevel(idx, false);
      }
    } else if (id === 'hud-restart' || id === 'res-retry') {
      this.startLevel(this.levelIndex, this.versus.enabled);
    } else if (id === 'res-next') {
      if (this.levelIndex + 1 < LEVELS.length) {
        this.startLevel(this.levelIndex + 1, false);
      } else {
        this.screen = 'levelSelect';
      }
    } else if (id === 'res-levels') {
      this.screen = 'levelSelect';
    } else if (id === 'vs-again') {
      this.startVersusMatch();
    }
  }

  private handleDailyCheckIn(): void {
    const today = todayKey();
    if (this.save.lastCheckInDate === today) {
      this.checkInMessage = '今天已经签到过啦，明天再来！';
    } else {
      this.save.lastCheckInDate = today;
      this.save.checkInStreak += 1;
      this.save.coins += 200;
      if (!this.save.unlockedSkins.includes('dog')) {
        this.save.unlockedSkins.push('dog');
        this.checkInMessage = '签到成功！+200金币 & 解锁【墨镜柴犬】';
      } else if (!this.save.unlockedSkins.includes('duck')) {
        this.save.unlockedSkins.push('duck');
        this.checkInMessage = '签到成功！+200金币 & 解锁【酷黑鸭鸭】';
      } else {
        this.checkInMessage = '签到成功！获得 +200 金币！';
      }
      persistSave(this.save);
    }
    this.menuModal = 'checkin';
  }

  private selectOrUnlockSkin(skinId: CharacterSkinId): void {
    const costs: Record<CharacterSkinId, number> = { octo: 0, dog: 400, duck: 600 };
    if (this.save.unlockedSkins.includes(skinId)) {
      this.save.selectedSkin = skinId;
      persistSave(this.save);
    } else if (this.save.coins >= costs[skinId]) {
      this.save.coins -= costs[skinId];
      this.save.unlockedSkins.push(skinId);
      this.save.selectedSkin = skinId;
      persistSave(this.save);
    }
  }

  private startVersusMatch(): void {
    this.versus = {
      enabled: true,
      currentPlayer: 1,
      round: 1,
      maxRounds: 5,
      scores: [0, 0],
      shotsTaken: [0, 0],
      levelIndex: 0,
    };
    this.startLevel(0, true);
  }

  public startLevel(index: number, isVersus: boolean): void {
    this.levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    this.versus.enabled = isVersus;
    const lvl = this.currentLevel;

    this.levelTime = 0;
    this.levelElapsed = 0;
    this.shotsLeft = lvl.maxShots;
    this.shotsUsed = 0;
    this.charging = false;
    this.chargeTime = 0;
    this.chargePower = 0;
    this.shotResetTimer = 0;
    this.celebrateTimer = 0;
    this.resultTimer = 0;
    this.screenShake = 0;
    sound.stopCharge();

    this.ball = createIdleBall(lvl);
    this.fx.blockPulse = lvl.blocks.map(() => 0);
    this.fx.starPulse = lvl.starPoles.map(() => 0);
    this.fx.rimWobble = 0;
    this.fx.netSwish = 0;
    this.fx.octoJumpY = 0;
    this.fx.octoStretchX = 1;
    this.fx.octoStretchY = 1;
    this.fx.trail = [];
    this.fx.particles = [];
    this.fx.callouts = [];
    this.fx.celebrateRays = 0;

    this.screen = 'playing';
  }

  private beginCharge(): void {
    if (this.ball.active || this.shotResetTimer > 0) return;
    if (!this.versus.enabled && this.shotsLeft <= 0) return;
    this.charging = true;
    this.chargeTime = 0;
    this.chargePower = 0;
    sound.startCharge();
  }

  private releaseCharge(): void {
    if (!this.charging) return;
    this.charging = false;
    const power = Math.max(0.08, this.chargePower);
    this.hasShotInSession = true;

    launchBall(this.ball, this.currentLevel, power);
    this.shotsUsed += 1;
    if (!this.versus.enabled) {
      this.shotsLeft = Math.max(0, this.shotsLeft - 1);
    }

    // Juicy spring-up stretch on the octopus when releasing!
    this.fx.octoStretchX = 0.82;
    this.fx.octoStretchY = 1.24;
    this.fx.octoJumpY = -18;
    this.fx.trail = [];

    // Launch puff particles
    const pos = getBallRestPosition(this.currentLevel, 0, false);
    this.spawnBurst(pos.x, pos.y + 18, 10, ['#ffffff', COLORS.rimCyan, COLORS.pinkOcto], 220, 'circle');
    sound.playLaunch(power);
  }

  private loop = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastRaf) / 1000);
    this.lastRaf = now;

    this.accumulator += dt;
    while (this.accumulator >= FIXED_DT) {
      this.fixedUpdate(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.render();
    requestAnimationFrame(this.loop);
  };

  private fixedUpdate(dt: number): void {
    this.fx.time += dt;

    // Update particles & callouts across all screens
    this.updateParticles(dt);

    if (this.screen === 'loading') {
      // Smoothly progress loading bar while waiting for real sprite loading
      const target = Math.min(this.spriteLoadRatio, 1);
      this.loadProgress += Math.max(0.015, (target - this.loadProgress) * 0.12);
      if (this.loadProgress >= 0.995 && this.spriteLoadRatio >= 1) {
        this.loadProgress = 1;
        this.screen = 'menu';
      }
      return;
    }

    if (this.screen === 'menu' || this.screen === 'levelSelect' || this.screen === 'versusResult') {
      return;
    }

    const lvl = this.currentLevel;
    this.levelTime += dt;
    if (this.screen === 'playing') {
      this.levelElapsed += dt;
    }

    // Decay visual pulses
    for (let i = 0; i < this.fx.blockPulse.length; i++) {
      this.fx.blockPulse[i] = Math.max(0, this.fx.blockPulse[i] - dt * 4.5);
    }
    for (let i = 0; i < this.fx.starPulse.length; i++) {
      this.fx.starPulse[i] = Math.max(0, this.fx.starPulse[i] - dt * 3.8);
    }
    this.fx.rimWobble = Math.max(0, this.fx.rimWobble - dt * 3.2);
    this.fx.netSwish = Math.max(0, this.fx.netSwish - dt * 1.9);
    this.screenShake = Math.max(0, this.screenShake - dt * 28);

    // Relax octopus stretch & jump
    if (this.screen !== 'celebrate') {
      this.fx.octoStretchX += (1 - this.fx.octoStretchX) * 0.18;
      this.fx.octoStretchY += (1 - this.fx.octoStretchY) * 0.18;
      this.fx.octoJumpY += (0 - this.fx.octoJumpY) * 0.2;
    }

    // Charging update
    if (this.screen === 'playing' && this.charging) {
      this.chargeTime += dt;
      this.chargePower = computeChargePower(this.chargeTime);
      sound.updateCharge(this.chargePower);
      const rest = getBallRestPosition(lvl, this.chargePower, true);
      this.ball.x = rest.x;
      this.ball.y = rest.y;
    } else if (this.screen === 'playing' && !this.ball.active && this.shotResetTimer <= 0) {
      this.chargePower = Math.max(0, this.chargePower - dt * 4.5);
      const rest = getBallRestPosition(lvl, 0, false);
      this.ball.x = rest.x;
      this.ball.y = rest.y;
    }

    // Physics step when ball is in flight
    if (this.ball.active) {
      // Append comet trail sample
      this.fx.trail.push({
        x: this.ball.x,
        y: this.ball.y,
        alpha: 0.9,
        radius: this.ball.radius,
      });
      if (this.fx.trail.length > 16) {
        this.fx.trail.shift();
      }
      for (const s of this.fx.trail) {
        s.alpha *= 0.92;
      }

      const events = stepBallPhysics(this.ball, lvl, this.levelTime, dt);
      for (const ev of events) {
        this.handlePhysicsEvent(ev);
      }

      // Check stalled or excessively long flight (non-scored)
      if (!this.ball.scored && (this.ball.lowSpeedTime > 1.05 || this.ball.flightTime > 7.5)) {
        this.ball.active = false;
        this.onShotMissed();
      }
    }

    // Brief pause before resetting ball onto octopus head after miss
    if (this.shotResetTimer > 0) {
      this.shotResetTimer -= dt;
      if (this.shotResetTimer <= 0 && this.screen === 'playing') {
        if (this.versus.enabled) {
          this.advanceVersusTurn(false);
        } else if (this.shotsLeft <= 0) {
          this.openResultPanel(false);
        } else {
          this.ball = createIdleBall(lvl);
          this.fx.trail = [];
        }
      }
    }

    // Celebration phase ("进了!" -> transitions cleanly into Settlement Panel!)
    if (this.screen === 'celebrate') {
      this.celebrateTimer += dt;
      this.fx.celebrateRays = Math.min(1, this.celebrateTimer / 0.25);
      // Happy leaping octopus bounce!
      this.fx.octoJumpY = -Math.abs(Math.sin(this.celebrateTimer * 7.2)) * 135;
      this.fx.octoStretchX = 1 - Math.abs(Math.sin(this.celebrateTimer * 7.2)) * 0.08;
      this.fx.octoStretchY = 1 + Math.abs(Math.sin(this.celebrateTimer * 7.2)) * 0.1;

      if (this.celebrateTimer >= 1.55) {
        if (this.versus.enabled) {
          this.advanceVersusTurn(true);
        } else {
          this.openResultPanel(true);
        }
      }
    } else if (this.screen === 'result') {
      this.resultTimer += dt;
    }
  }

  private handlePhysicsEvent(ev: PhysicsEvent): void {
    if (ev.type === 'block') {
      if (ev.clusterIndex !== undefined) {
        this.fx.blockPulse[ev.clusterIndex] = 1;
      }
      sound.playBounce(ev.speed);
      this.spawnBurst(ev.x, ev.y, 8, [COLORS.rimCyan, COLORS.tileCoral, '#ffffff'], 240, 'circle');
      if (ev.speed > 480) {
        this.screenShake = Math.max(this.screenShake, 4.5);
      }
    } else if (ev.type === 'wall') {
      sound.playBounce(ev.speed);
      this.spawnBurst(ev.x, ev.y, 6, ['#ffffff', COLORS.rimCyan], 200, 'circle');
    } else if (ev.type === 'rim') {
      this.fx.rimWobble = 1;
      sound.playRim(ev.speed);
      this.spawnBurst(ev.x, ev.y, 10, [COLORS.rimCyan, '#ffffff', COLORS.hudGold], 260, 'sparkle');
      this.screenShake = Math.max(this.screenShake, 5.5);
    } else if (ev.type === 'star') {
      if (ev.starIndex !== undefined) {
        this.fx.starPulse[ev.starIndex] = 1;
      }
      sound.playStar();
      this.spawnBurst(ev.x, ev.y, 14, [COLORS.rimCyan, '#ffffff', '#ffea75'], 320, 'sparkle');
      this.addCallout('星柱弹射!', ev.x, ev.y - 36, COLORS.rimCyan);
      this.screenShake = Math.max(this.screenShake, 6);
    } else if (ev.type === 'score') {
      this.onScored();
    } else if (ev.type === 'ocean') {
      sound.playSplash();
      this.spawnSplash(ev.x, ev.y);
      if (!this.ball.scored && this.screen === 'playing') {
        this.onShotMissed();
      }
    }
  }

  private onShotMissed(): void {
    this.shotResetTimer = 0.55;
  }

  private onScored(): void {
    sound.playScore();
    this.fx.netSwish = 1;
    this.fx.rimWobble = 0.7;
    this.screenShake = 8;

    const hoop = getHoopPosition(this.currentLevel, this.levelTime);

    // Bonus label
    if (this.ball.bounces === 0 && this.ball.rimHits === 0) {
      this.celebrateBonusText = '✨ 空心入网!';
    } else if (this.ball.bounces >= 2) {
      this.celebrateBonusText = `🔥 ${this.ball.bounces}连反弹神球!`;
    } else if (this.ball.rimHits > 0) {
      this.celebrateBonusText = '💫 擦筐压哨进!';
    } else {
      this.celebrateBonusText = '🎯 漂亮反弹球!';
    }

    // Rising cyan stars from the hoop (matches 单关通关·进球庆祝帧.png!)
    const starOffsets = [-68, 0, 68];
    starOffsets.forEach((dx, i) => {
      this.fx.particles.push({
        x: hoop.x + dx * 0.4,
        y: hoop.y - 10,
        vx: dx * 1.4,
        vy: i === 1 ? -460 : -340,
        size: i === 1 ? 38 : 26,
        color: COLORS.rimCyan,
        alpha: 1,
        life: 1.45,
        maxLife: 1.45,
        rot: 0,
        vRot: (i - 1) * 1.6,
        shape: 'star',
        gravity: 280,
      });
    });

    // Rich colorful confetti shower across the stage!
    const confettiColors = [COLORS.tileCoral, COLORS.tileCyan, '#fff8e0', '#ffda59', COLORS.pinkOcto];
    for (let i = 0; i < 65; i++) {
      this.fx.particles.push({
        x: 80 + Math.random() * (STAGE_W - 160),
        y: 160 + Math.random() * 520,
        vx: (Math.random() - 0.5) * 340,
        vy: -120 - Math.random() * 280,
        size: 14 + Math.random() * 14,
        color: confettiColors[i % confettiColors.length],
        alpha: 1,
        life: 1.8 + Math.random() * 0.9,
        maxLife: 2.5,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 8,
        shape: i % 5 === 0 ? 'sparkle' : 'rect',
        gravity: 340,
      });
    }

    this.screen = 'celebrate';
    this.celebrateTimer = 0;
  }

  private advanceVersusTurn(scored: boolean): void {
    const pIdx = this.versus.currentPlayer - 1;
    this.versus.shotsTaken[pIdx] += 1;
    if (scored) {
      // Bonus point for bank shots!
      const pts = this.ball.bounces >= 1 ? 2 : 1;
      this.versus.scores[pIdx] += pts;
    }

    if (this.versus.currentPlayer === 1) {
      this.versus.currentPlayer = 2;
      this.startLevel(this.versus.levelIndex, true);
    } else {
      if (this.versus.round >= this.versus.maxRounds) {
        this.screen = 'versusResult';
      } else {
        this.versus.round += 1;
        this.versus.currentPlayer = 1;
        this.versus.levelIndex = (this.versus.levelIndex + 1) % 5; // Rotate through the 5 iconic layouts!
        this.startLevel(this.versus.levelIndex, true);
      }
    }
  }

  private openResultPanel(won: boolean): void {
    this.wonLastLevel = won;
    this.resultTimer = 0;
    const lvl = this.currentLevel;

    if (won) {
      let stars = 1;
      if (this.shotsUsed <= lvl.starShots.three || this.ball.bounces >= 2) {
        stars = 3;
      } else if (this.shotsUsed <= lvl.starShots.two) {
        stars = 2;
      }
      this.starsEarned = stars;

      const prevStars = this.save.starsByLevel[lvl.id] ?? 0;
      if (stars > prevStars) {
        this.save.starsByLevel[lvl.id] = stars;
      }
      const prevBest = this.save.bestShotsByLevel[lvl.id] ?? 99;
      if (this.shotsUsed < prevBest) {
        this.save.bestShotsByLevel[lvl.id] = this.shotsUsed;
      }
      if (lvl.id >= this.save.unlockedLevel && lvl.id < LEVELS.length) {
        this.save.unlockedLevel = lvl.id + 1;
      }
      this.save.coins += 60 + stars * 30;
      this.save.playerLevel = Math.max(3, 2 + Object.keys(this.save.starsByLevel).length);
      persistSave(this.save);
    } else {
      this.starsEarned = 0;
    }

    this.screen = 'result';
  }

  private spawnBurst(
    x: number,
    y: number,
    count: number,
    colors: string[],
    maxSpeed: number,
    shape: 'circle' | 'sparkle',
  ): void {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = maxSpeed * (0.4 + Math.random() * 0.65);
      this.fx.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 40,
        size: 10 + Math.random() * 10,
        color: colors[i % colors.length],
        alpha: 1,
        life: 0.48 + Math.random() * 0.25,
        maxLife: 0.72,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 10,
        shape,
        gravity: 520,
      });
    }
  }

  private spawnSplash(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const angle = -Math.PI * (0.18 + Math.random() * 0.64);
      const spd = 220 + Math.random() * 340;
      this.fx.particles.push({
        x: x + (Math.random() - 0.5) * 32,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 10 + Math.random() * 12,
        color: i % 2 === 0 ? COLORS.creamHalo : COLORS.oceanLight,
        alpha: 1,
        life: 0.55 + Math.random() * 0.3,
        maxLife: 0.85,
        rot: 0,
        vRot: 0,
        shape: 'drop',
        gravity: 960,
      });
    }
  }

  private addCallout(text: string, x: number, y: number, color: string): void {
    this.fx.callouts.push({
      text,
      x: Math.max(140, Math.min(STAGE_W - 140, x)),
      y,
      vy: -75,
      color,
      life: 0.95,
      maxLife: 0.95,
      scale: 1,
    });
  }

  private updateParticles(dt: number): void {
    for (let i = this.fx.particles.length - 1; i >= 0; i--) {
      const p = this.fx.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.fx.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vRot * dt;
      p.alpha = Math.min(1, p.life / Math.min(0.4, p.maxLife));
    }

    for (let i = this.fx.callouts.length - 1; i >= 0; i--) {
      const c = this.fx.callouts[i];
      c.life -= dt;
      if (c.life <= 0) {
        this.fx.callouts.splice(i, 1);
        continue;
      }
      c.y += c.vy * dt;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    this.hitRegions = [];

    const ui: UiDrawContext = {
      ctx,
      sprites: this.sprites,
      time: this.fx.time,
      save: this.save,
      hits: this.hitRegions,
    };

    if (this.screen === 'loading') {
      drawLoadingScreen(ui, this.loadProgress);
      return;
    }

    if (this.screen === 'menu') {
      drawMainMenu(ui, this.menuModal, this.checkInMessage);
      return;
    }

    if (this.screen === 'levelSelect') {
      drawLevelSelect(ui);
      return;
    }

    // Gameplay / Celebrate / Result / VersusResult all render the live arena behind!
    const lvl = this.currentLevel;

    ctx.save();
    if (this.screenShake > 0.2) {
      const sx = (Math.random() - 0.5) * this.screenShake * 2;
      const sy = (Math.random() - 0.5) * this.screenShake * 2;
      ctx.translate(sx, sy);
    }

    drawSunsetBackground(ctx, this.fx.time, 845);
    drawStarPoles(ctx, lvl, this.levelTime, this.fx.starPulse);
    drawBlockClusters(ctx, lvl.blocks, this.levelTime, this.fx.blockPulse);
    drawHoopBack(ctx, lvl, this.levelTime, this.fx);

    // Trajectory guide when aiming / idle
    if (this.screen === 'playing' && !this.ball.active && this.save.showGuide) {
      const previewPower = this.charging ? Math.max(0.08, this.chargePower) : 0.36;
      const pts = predictTrajectory(lvl, previewPower, this.levelTime, this.charging ? 36 : 18);
      drawTrajectoryPreview(ctx, pts, this.charging);
    }

    // Character (Pink Octopus or buddy skin)
    const activeSkin: CharacterSkinId = this.versus.enabled
      ? this.versus.currentPlayer === 1
        ? 'octo'
        : 'dog'
      : this.save.selectedSkin;

    drawCharacter(
      ctx,
      this.sprites,
      activeSkin,
      lvl.octoX,
      lvl.octoFeetY,
      lvl.facing,
      this.chargePower,
      this.charging,
      this.fx,
      this.screen === 'celebrate',
    );

    // Basketball & glowing blue trail (drawn behind hoop front net so ball genuinely passes INSIDE the net!)
    drawBasketballAndTrail(ctx, this.sprites, this.ball, this.fx.trail);

    // Hoop front rim & diamond net
    drawHoopFront(ctx, lvl, this.levelTime, this.fx);

    // Particles & callouts
    drawParticlesAndCallouts(ctx, this.fx);

    ctx.restore();

    // HUD & Overlay Panels
    const completionRatio =
      this.screen === 'celebrate' || (this.screen === 'result' && this.wonLastLevel)
        ? 1
        : Math.max(0.1, (this.levelIndex + (this.ball.scored ? 1 : 0)) / LEVELS.length);

    if (this.screen === 'playing' || this.screen === 'celebrate') {
      const showTutorial = !this.versus.enabled && lvl.id === 1 && !this.hasShotInSession && !this.ball.active;
      drawGameplayHud(
        ui,
        lvl,
        this.shotsLeft,
        this.charging,
        this.chargePower,
        showTutorial,
        this.versus,
        completionRatio,
      );
    }

    if (this.screen === 'celebrate') {
      drawCelebrateOverlay(ctx, this.celebrateTimer, this.celebrateBonusText);
    } else if (this.screen === 'result') {
      drawResultPanel(
        ui,
        lvl,
        this.wonLastLevel,
        this.starsEarned,
        this.shotsUsed,
        this.levelElapsed,
        this.resultTimer,
        this.levelIndex + 1 < LEVELS.length,
      );
    } else if (this.screen === 'versusResult') {
      drawVersusResultPanel(ui, this.versus);
    }
  }
}
