import {
  AIR_DRAG,
  BALL_RADIUS,
  CHARGE_CYCLE_DURATION,
  DEFAULT_RESTITUTION,
  DEFAULT_RIM_WIDTH,
  DEFAULT_TILE_SIZE,
  FIXED_DT,
  GRAVITY,
  OCEAN_Y,
  OCTO_DRAW_SCALE,
  OCTO_FRAMES,
  PHYSICS_SUBSTEPS,
  RIM_RESTITUTION,
  RIM_TUBE_RADIUS,
  STAGE_W,
  STAR_BUMPER_RADIUS,
  STAR_BUMPER_RESTITUTION,
  WALL_RESTITUTION,
} from './constants.ts';
import type {
  BallState,
  BlockCluster,
  BlockMotion,
  LevelDef,
  PhysicsEvent,
  SolidRect,
  TrajectoryPoint,
} from './types.ts';

export function evalMotion(move: BlockMotion | undefined, time: number): { dx: number; dy: number; vx: number; vy: number } {
  if (!move || move.period <= 0 || move.range === 0) {
    return { dx: 0, dy: 0, vx: 0, vy: 0 };
  }
  const omega = (Math.PI * 2) / move.period;
  const phase = move.phase ?? 0;
  const offset = Math.sin(time * omega + phase) * move.range;
  const vel = Math.cos(time * omega + phase) * move.range * omega;
  return move.axis === 'x'
    ? { dx: offset, dy: 0, vx: vel, vy: 0 }
    : { dx: 0, dy: offset, vx: 0, vy: vel };
}

export function getHoopPosition(level: LevelDef, time: number): {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rimWidth: number;
} {
  const m = evalMotion(level.hoop.move, time);
  return {
    x: level.hoop.x + m.dx,
    y: level.hoop.y + m.dy,
    vx: m.vx,
    vy: m.vy,
    rimWidth: level.hoop.rimWidth ?? DEFAULT_RIM_WIDTH,
  };
}

/**
 * Compute solid collision rectangles for all block clusters at time `time`.
 * For full rectangular clusters we emit one merged AABB for rock-solid edge-free bouncing;
 * for stepped/staircase patterns with null cells we merge horizontal spans per row.
 */
export function buildSolidRects(blocks: BlockCluster[], time: number): SolidRect[] {
  const rects: SolidRect[] = [];
  for (let idx = 0; idx < blocks.length; idx++) {
    const b = blocks[idx];
    const ts = b.tileSize ?? DEFAULT_TILE_SIZE;
    const m = evalMotion(b.move, time);
    const ox = b.x + m.dx;
    const oy = b.y + m.dy;
    const rest = b.restitution ?? DEFAULT_RESTITUTION;

    if (!b.pattern) {
      rects.push({
        x: ox,
        y: oy,
        w: b.cols * ts,
        h: b.rows * ts,
        vx: m.vx,
        vy: m.vy,
        restitution: rest,
        clusterIndex: idx,
      });
      continue;
    }

    // Merge contiguous spans row-by-row for staircase clusters
    for (let r = 0; r < b.rows; r++) {
      let cStart = -1;
      for (let c = 0; c <= b.cols; c++) {
        const filled = c < b.cols && b.pattern[r * b.cols + c] !== null;
        if (filled && cStart === -1) {
          cStart = c;
        } else if (!filled && cStart !== -1) {
          rects.push({
            x: ox + cStart * ts,
            y: oy + r * ts,
            w: (c - cStart) * ts,
            h: ts,
            vx: m.vx,
            vy: m.vy,
            restitution: rest,
            clusterIndex: idx,
          });
          cStart = -1;
        }
      }
    }
  }
  return rects;
}

/** Compute smooth ping-pong power in [0, 1] from charge elapsed time */
export function computeChargePower(chargeTime: number): number {
  if (chargeTime <= 0) return 0;
  // Triangle-sine smooth curve: 0 -> 1 in CHARGE_CYCLE_DURATION, then oscillates cleanly
  const phase = (chargeTime / CHARGE_CYCLE_DURATION) * Math.PI;
  return 0.5 - 0.5 * Math.cos(phase);
}

/** Map charge power [0,1] to octopus sprite frame index 0..5 */
export function powerToOctoFrame(power: number, charging: boolean): number {
  if (!charging && power <= 0.01) return 0;
  return Math.min(5, Math.max(0, Math.floor(power * 5.999)));
}

/** Exact ball resting position right on top of the octopus's head */
export function getBallRestPosition(level: LevelDef, power: number, charging: boolean): { x: number; y: number } {
  const frameIdx = powerToOctoFrame(power, charging);
  const f = OCTO_FRAMES[frameIdx];
  const headHeight = (f.bodyBottomY - f.headTopY) * OCTO_DRAW_SCALE;
  return {
    x: level.octoX,
    y: level.octoFeetY - headHeight - BALL_RADIUS + 4,
  };
}

/** Compute initial velocity vector from level config + power [0..1] */
export function computeLaunchVelocity(level: LevelDef, power: number): { vx: number; vy: number; speed: number } {
  const clamped = Math.max(0.05, Math.min(1, power));
  const speed = level.vMin + (level.vMax - level.vMin) * clamped;
  const rad = (level.launchAngleDeg * Math.PI) / 180;
  return {
    vx: Math.cos(rad) * speed * level.facing,
    vy: -Math.sin(rad) * speed,
    speed,
  };
}

export function createIdleBall(level: LevelDef): BallState {
  const rest = getBallRestPosition(level, 0, false);
  return {
    x: rest.x,
    y: rest.y,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    angle: 0,
    angularVel: 0,
    active: false,
    scored: false,
    passedTopSensor: false,
    bounces: 0,
    rimHits: 0,
    starHits: 0,
    flightTime: 0,
    lowSpeedTime: 0,
    squashX: 1,
    squashY: 1,
    squashAngle: 0,
    squashTimer: 0,
  };
}

export function launchBall(ball: BallState, level: LevelDef, power: number): void {
  // Always launch from the upright head position (octopus springs upward on release!)
  const launchPos = getBallRestPosition(level, 0, false);
  const { vx, vy } = computeLaunchVelocity(level, power);
  ball.x = launchPos.x;
  ball.y = launchPos.y;
  ball.vx = vx;
  ball.vy = vy;
  ball.angle = 0;
  ball.angularVel = level.facing * (4.5 + power * 7.5);
  ball.active = true;
  ball.scored = false;
  ball.passedTopSensor = false;
  ball.bounces = 0;
  ball.rimHits = 0;
  ball.starHits = 0;
  ball.flightTime = 0;
  ball.lowSpeedTime = 0;
  ball.squashX = 1.18;
  ball.squashY = 0.84;
  ball.squashAngle = Math.atan2(vy, vx);
  ball.squashTimer = 0.14;
}

function collideBallWithCircle(
  ball: BallState,
  cx: number,
  cy: number,
  cr: number,
  cvx: number,
  cvy: number,
  restitution: number,
): { hit: boolean; nx: number; ny: number; speed: number } {
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const minDist = ball.radius + cr;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minDist * minDist || distSq < 1e-8) {
    return { hit: false, nx: 0, ny: 0, speed: 0 };
  }
  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  // Separate ball
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const rvx = ball.vx - cvx;
  const rvy = ball.vy - cvy;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) {
    return { hit: false, nx, ny, speed: 0 };
  }

  const impactSpeed = -vn;
  const j = -(1 + restitution) * vn;
  ball.vx += j * nx;
  ball.vy += j * ny;

  // Tangential spin coupling
  const tx = -ny;
  const ty = nx;
  const vt = rvx * tx + rvy * ty;
  ball.angularVel = ball.angularVel * 0.65 + (vt / ball.radius) * 0.35;

  return { hit: true, nx, ny, speed: impactSpeed };
}

function collideBallWithRect(
  ball: BallState,
  rect: SolidRect,
): { hit: boolean; nx: number; ny: number; speed: number } {
  const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
  let dx = ball.x - closestX;
  let dy = ball.y - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= ball.radius * ball.radius) {
    return { hit: false, nx: 0, ny: 0, speed: 0 };
  }

  let nx = 0;
  let ny = 0;
  let overlap = 0;

  if (distSq < 1e-6) {
    // Center inside rect — push out along shallowest axis
    const dLeft = ball.x - rect.x;
    const dRight = rect.x + rect.w - ball.x;
    const dTop = ball.y - rect.y;
    const dBottom = rect.y + rect.h - ball.y;
    const minD = Math.min(dLeft, dRight, dTop, dBottom);
    if (minD === dTop) {
      nx = 0;
      ny = -1;
      overlap = dTop + ball.radius;
    } else if (minD === dBottom) {
      nx = 0;
      ny = 1;
      overlap = dBottom + ball.radius;
    } else if (minD === dLeft) {
      nx = -1;
      ny = 0;
      overlap = dLeft + ball.radius;
    } else {
      nx = 1;
      ny = 0;
      overlap = dRight + ball.radius;
    }
  } else {
    const dist = Math.sqrt(distSq);
    nx = dx / dist;
    ny = dy / dist;
    overlap = ball.radius - dist;
  }

  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const rvx = ball.vx - rect.vx;
  const rvy = ball.vy - rect.vy;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) {
    return { hit: false, nx, ny, speed: 0 };
  }

  const impactSpeed = -vn;
  // Slightly reduce bounce on tiny bounces so ball settles cleanly
  const effRest = impactSpeed < 120 ? rect.restitution * 0.45 : rect.restitution;
  const j = -(1 + effRest) * vn;
  ball.vx += j * nx;
  ball.vy += j * ny;

  // Gentle tangential friction & realistic spin
  const tx = -ny;
  const ty = nx;
  const vt = rvx * tx + rvy * ty;
  ball.vx -= vt * 0.03 * tx;
  ball.vy -= vt * 0.03 * ty;
  ball.angularVel = ball.angularVel * 0.72 + (vt / ball.radius) * 0.28;

  return { hit: true, nx, ny, speed: impactSpeed };
}

function applySquash(ball: BallState, nx: number, ny: number, speed: number): void {
  const intensity = Math.min(0.28, (speed / 1200) * 0.26);
  if (intensity < 0.04) return;
  ball.squashX = 1 - intensity;
  ball.squashY = 1 + intensity;
  ball.squashAngle = Math.atan2(ny, nx);
  ball.squashTimer = 0.13;
}

/**
 * Advance physics by one fixed frame (1/60s) with substepping.
 * Returns events fired during this frame.
 */
export function stepBallPhysics(
  ball: BallState,
  level: LevelDef,
  levelTime: number,
  dt: number = FIXED_DT,
): PhysicsEvent[] {
  const events: PhysicsEvent[] = [];
  if (!ball.active) return events;

  // Decay squash-and-stretch
  if (ball.squashTimer > 0) {
    ball.squashTimer = Math.max(0, ball.squashTimer - dt);
    const t = ball.squashTimer / 0.13;
    ball.squashX = 1 + (ball.squashX - 1) * t;
    ball.squashY = 1 + (ball.squashY - 1) * t;
  } else {
    ball.squashX = 1;
    ball.squashY = 1;
  }

  const subDt = dt / PHYSICS_SUBSTEPS;
  ball.flightTime += dt;

  for (let s = 0; s < PHYSICS_SUBSTEPS; s++) {
    const tNow = levelTime + s * subDt;
    const prevY = ball.y;

    // Integrate gravity & mild air drag
    ball.vy += GRAVITY * subDt;
    const dragFactor = Math.max(0, 1 - AIR_DRAG * subDt);
    ball.vx *= dragFactor;
    ball.vy *= dragFactor;

    ball.x += ball.vx * subDt;
    ball.y += ball.vy * subDt;
    ball.angle += ball.angularVel * subDt;

    // 1. Left & right screen walls
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      if (ball.vx < 0) {
        const spd = -ball.vx;
        ball.vx = -ball.vx * WALL_RESTITUTION;
        ball.bounces++;
        applySquash(ball, 1, 0, spd);
        events.push({ type: 'wall', x: 0, y: ball.y, nx: 1, ny: 0, speed: spd });
      }
    } else if (ball.x + ball.radius > STAGE_W) {
      ball.x = STAGE_W - ball.radius;
      if (ball.vx > 0) {
        const spd = ball.vx;
        ball.vx = -ball.vx * WALL_RESTITUTION;
        ball.bounces++;
        applySquash(ball, -1, 0, spd);
        events.push({ type: 'wall', x: STAGE_W, y: ball.y, nx: -1, ny: 0, speed: spd });
      }
    }

    // 2. Solid blocks
    const rects = buildSolidRects(level.blocks, tNow);
    for (let i = 0; i < rects.length; i++) {
      const res = collideBallWithRect(ball, rects[i]);
      if (res.hit) {
        ball.bounces++;
        applySquash(ball, res.nx, res.ny, res.speed);
        if (res.speed > 75) {
          events.push({
            type: 'block',
            x: ball.x - res.nx * ball.radius,
            y: ball.y - res.ny * ball.radius,
            nx: res.nx,
            ny: res.ny,
            speed: res.speed,
            clusterIndex: rects[i].clusterIndex,
          });
        }
      }
    }

    // 3. Bouncy cyan star poles
    for (let i = 0; i < level.starPoles.length; i++) {
      const pole = level.starPoles[i];
      if (pole.bouncy === false) continue;
      const res = collideBallWithCircle(
        ball,
        pole.x,
        pole.y,
        STAR_BUMPER_RADIUS,
        0,
        0,
        STAR_BUMPER_RESTITUTION,
      );
      if (res.hit) {
        // Ensure a cheerful upward kick off the star bumper
        if (ball.vy > -380) {
          ball.vy = Math.min(ball.vy, -460);
        }
        ball.bounces++;
        ball.starHits++;
        applySquash(ball, res.nx, res.ny, Math.max(res.speed, 450));
        events.push({
          type: 'star',
          x: pole.x + res.nx * STAR_BUMPER_RADIUS,
          y: pole.y + res.ny * STAR_BUMPER_RADIUS,
          nx: res.nx,
          ny: res.ny,
          speed: res.speed,
          starIndex: i,
        });
      }
    }

    // 4. Hoop outer rim circles (left & right ring caps — realistic basketball rim bounce!)
    const hoop = getHoopPosition(level, tNow);
    const halfRim = hoop.rimWidth / 2;
    const leftRimX = hoop.x - halfRim;
    const rightRimX = hoop.x + halfRim;

    const leftHit = collideBallWithCircle(
      ball,
      leftRimX,
      hoop.y,
      RIM_TUBE_RADIUS,
      hoop.vx,
      hoop.vy,
      RIM_RESTITUTION,
    );
    if (leftHit.hit) {
      ball.bounces++;
      ball.rimHits++;
      applySquash(ball, leftHit.nx, leftHit.ny, leftHit.speed);
      events.push({
        type: 'rim',
        x: leftRimX + leftHit.nx * RIM_TUBE_RADIUS,
        y: hoop.y + leftHit.ny * RIM_TUBE_RADIUS,
        nx: leftHit.nx,
        ny: leftHit.ny,
        speed: leftHit.speed,
      });
    }

    const rightHit = collideBallWithCircle(
      ball,
      rightRimX,
      hoop.y,
      RIM_TUBE_RADIUS,
      hoop.vx,
      hoop.vy,
      RIM_RESTITUTION,
    );
    if (rightHit.hit) {
      ball.bounces++;
      ball.rimHits++;
      applySquash(ball, rightHit.nx, rightHit.ny, rightHit.speed);
      events.push({
        type: 'rim',
        x: rightRimX + rightHit.nx * RIM_TUBE_RADIUS,
        y: hoop.y + rightHit.ny * RIM_TUBE_RADIUS,
        nx: rightHit.nx,
        ny: rightHit.ny,
        speed: rightHit.speed,
      });
    }

    // 5. Top-down hoop scoring sensors
    if (!ball.scored) {
      const innerHalf = halfRim - RIM_TUBE_RADIUS * 0.4;
      const withinOpening = Math.abs(ball.x - hoop.x) < innerHalf;

      // Crossed rim plane going downward
      if (withinOpening && prevY <= hoop.y + 8 && ball.y > hoop.y + 8 && ball.vy > 0) {
        ball.passedTopSensor = true;
      }

      // If ball bounces back up above rim, reset top sensor
      if (ball.y < hoop.y - ball.radius * 0.6) {
        ball.passedTopSensor = false;
      }

      // Passed lower net sensor -> SCORE!
      if (ball.passedTopSensor && Math.abs(ball.x - hoop.x) < halfRim && ball.y >= hoop.y + 38 && ball.vy > 0) {
        ball.scored = true;
        // Net swish gently funnels & slows the ball through the mesh
        ball.vx *= 0.35;
        ball.vy = Math.max(180, ball.vy * 0.52);
        events.push({
          type: 'score',
          x: hoop.x,
          y: hoop.y + 30,
          nx: 0,
          ny: 1,
          speed: Math.hypot(ball.vx, ball.vy),
        });
      }
    } else {
      // Gently funnel scored ball down the center of the net
      if (ball.y < hoop.y + 115) {
        ball.vx += (hoop.x - ball.x) * 6 * subDt;
        ball.vx *= 0.94;
      }
    }

    // 6. Ocean floor splash check
    if (ball.y - ball.radius > OCEAN_Y) {
      ball.active = false;
      events.push({
        type: 'ocean',
        x: ball.x,
        y: OCEAN_Y,
        nx: 0,
        ny: -1,
        speed: Math.abs(ball.vy),
      });
      break;
    }
  }

  // Track stalled ball on a flat ledge
  const speedNow = Math.hypot(ball.vx, ball.vy);
  if (!ball.scored && speedNow < 45 && ball.flightTime > 0.6) {
    ball.lowSpeedTime += dt;
  } else {
    ball.lowSpeedTime = 0;
  }

  return events;
}

/**
 * Predict a short dashed trajectory preview (up to `maxSteps` fixed steps or 1 bounce)
 * using the exact same physics integrator so aiming feels 100% consistent!
 */
export function predictTrajectory(
  level: LevelDef,
  power: number,
  levelTime: number,
  maxSteps: number = 34,
): TrajectoryPoint[] {
  const sim = createIdleBall(level);
  launchBall(sim, level, power);
  const pts: TrajectoryPoint[] = [];
  let t = levelTime;
  let bouncedOnce = false;

  for (let i = 0; i < maxSteps; i++) {
    const evs = stepBallPhysics(sim, level, t, FIXED_DT);
    t += FIXED_DT;
    const hitSomething = evs.some((e) => e.type === 'block' || e.type === 'wall' || e.type === 'rim' || e.type === 'star');
    if (hitSomething) {
      bouncedOnce = true;
    }
    if (i % 2 === 0) {
      pts.push({ x: sim.x, y: sim.y, bounced: bouncedOnce });
    }
    if (!sim.active || sim.scored) break;
    // Show a brief hint after the first bounce, then fade out so puzzle solving stays fun!
    if (bouncedOnce && pts.length > 14) break;
  }
  return pts;
}

/**
 * Headless deterministic simulation of a single shot at `power` starting at `startTime`.
 * Used by the automated level verifier script!
 */
export function simulateShot(
  level: LevelDef,
  power: number,
  startTime: number = 0,
  maxSimSeconds: number = 5.5,
): { scored: boolean; bounces: number; rimHits: number; starHits: number; timeToScore: number } {
  const ball = createIdleBall(level);
  launchBall(ball, level, power);
  const maxFrames = Math.ceil(maxSimSeconds / FIXED_DT);
  let t = startTime;

  for (let f = 0; f < maxFrames; f++) {
    stepBallPhysics(ball, level, t, FIXED_DT);
    t += FIXED_DT;
    if (ball.scored) {
      return {
        scored: true,
        bounces: ball.bounces,
        rimHits: ball.rimHits,
        starHits: ball.starHits,
        timeToScore: ball.flightTime,
      };
    }
    if (!ball.active || ball.lowSpeedTime > 1.1) {
      break;
    }
  }
  return {
    scored: false,
    bounces: ball.bounces,
    rimHits: ball.rimHits,
    starHits: ball.starHits,
    timeToScore: -1,
  };
}
