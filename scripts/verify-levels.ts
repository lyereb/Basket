import { LEVELS } from '../src/levels.ts';
import { simulateShot } from '../src/physics.ts';

let allPass = true;

for (const level of LEVELS) {
  const timesToTest = level.hoop.move || level.blocks.some((b) => b.move) ? [0, 0.8, 1.6, 2.4] : [0];
  let bestWindow = 0;
  let bestPowers: number[] = [];
  let bounceShots = 0;
  let rimShots = 0;

  for (const t0 of timesToTest) {
    const hits: number[] = [];
    for (let p = 5; p <= 100; p++) {
      const power = p / 100;
      const res = simulateShot(level, power, t0);
      if (res.scored) {
        hits.push(p);
        if (res.bounces > 0) bounceShots++;
        if (res.rimHits > 0) rimShots++;
      }
    }
    if (hits.length > bestWindow) {
      bestWindow = hits.length;
      bestPowers = hits;
    }
  }

  // Compute widest contiguous percentage range
  let maxRun = 0;
  let curRun = 0;
  for (let i = 0; i < bestPowers.length; i++) {
    if (i === 0 || bestPowers[i] === bestPowers[i - 1] + 1) {
      curRun++;
    } else {
      curRun = 1;
    }
    if (curRun > maxRun) maxRun = curRun;
  }

  const ok = maxRun >= 4;
  if (!ok) allPass = false;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} [${level.code}] ${level.name} | totalHits=${bestWindow}% | widestWindow=${maxRun}% | powers=[${bestPowers.slice(0, 12).join(',')}${bestPowers.length > 12 ? ',...' : ''}] | bounceWins=${bounceShots} | rimWins=${rimShots}`,
  );
}

if (!allPass) {
  console.error('\nSome levels have narrow or missing scoring windows!');
  process.exit(1);
}
console.log('\nAll levels verified solvable with generous power windows!');
