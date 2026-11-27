export interface LoadedSprites {
  octo: HTMLImageElement[];
  ballMain: HTMLImageElement;
  ballRot: HTMLImageElement[];
  ready: boolean;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export async function loadAllSprites(onProgress?: (ratio: number) => void): Promise<LoadedSprites> {
  const paths: string[] = [
    './assets/sprites/octo_0.png',
    './assets/sprites/octo_1.png',
    './assets/sprites/octo_2.png',
    './assets/sprites/octo_3.png',
    './assets/sprites/octo_4.png',
    './assets/sprites/octo_5.png',
    './assets/sprites/ball_main.png',
    './assets/sprites/ball_rot_0.png',
    './assets/sprites/ball_rot_1.png',
    './assets/sprites/ball_rot_2.png',
    './assets/sprites/ball_rot_3.png',
  ];

  let done = 0;
  const loaded = await Promise.all(
    paths.map(async (p) => {
      const img = await loadImage(p);
      done++;
      onProgress?.(done / paths.length);
      return img;
    }),
  );

  return {
    octo: loaded.slice(0, 6),
    ballMain: loaded[6],
    ballRot: loaded.slice(7, 11),
    ready: true,
  };
}
