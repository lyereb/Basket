import { AngryOctoGame } from './game.ts';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('Missing #game-canvas element');
}

new AngryOctoGame(canvas);
