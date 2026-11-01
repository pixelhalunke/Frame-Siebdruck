import { DEFAULT_TRACE, type RasterPixels } from '../../core/raster/types';

export const TEXTURE_OPTIONS = { ...DEFAULT_TRACE, colors: 2, backgroundColor: '#ffffee', preserveTexture: true, minArea: 0 };

/** Original, deterministic test patterns. No imported artwork or image files. */
export function textureFixture(kind: 'dots' | 'speckles'): RasterPixels {
  const width = 1122, height = 1402, data = new Uint8ClampedArray(width * height * 4);
  const paper = [255, 255, 238], inks = [[12, 12, 10], [226, 250, 20]];
  for (let i = 0; i < width * height; i++) data.set([...paper, 255], i * 4);
  for (let row = 0, cy = 20; cy < height - 12; row++, cy += 20) {
    for (let column = 0, cx = 20; cx < width - 12; column++, cx += 20) {
      const seed = (column * 73 + row * 151) % 97;
      const irregular = kind === 'speckles';
      const radius = irregular ? 3 + seed % 4 : 5;
      const x = cx + (irregular ? seed % 7 - 3 : 0), y = cy + (irregular ? seed % 5 - 2 : 0);
      const ink = inks[column % 4 === 0 ? 1 : 0];
      for (let dy = -radius - 1; dy <= radius + 1; dy++) {
        for (let dx = -radius - 1; dx <= radius + 1; dx++) {
          const distance = dx * dx + dy * dy;
          if (distance > (radius + .5) ** 2 || (seed % 7 === 0 && distance < 4)) continue;
          const color = distance > radius ** 2 ? ink.map((value, c) => Math.round(value * .7 + paper[c] * .3)) : ink;
          data.set([...color, 255], ((y + dy) * width + x + dx) * 4);
        }
      }
    }
  }
  return { width, height, data };
}
