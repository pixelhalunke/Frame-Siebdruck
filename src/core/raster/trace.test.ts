import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { initGeometry, operation, path, serializePath, boundsOf } from '../geometry/engine';
import { newProject, projectSchema, reconcileInks } from '../project/model';
import { importSvg } from '../svg/import';
import { separateArtwork } from '../separation/separate';
import { filmSvg, filmsPdf, prepareFilms } from '../print/films';
import { contourArea } from '../../test/helpers/path-area';
import { replaceShapes } from '../../features/editor/shapes';
import { imageSize, isRasterFile } from '../../features/import/raster';
import { cleanIslands, quantize } from './quantize';
import { traceRaster } from './trace';
import { traceSvg } from './svg';
import { DEFAULT_TRACE, type RasterPixels } from './types';

beforeAll(() => initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm')));
const white = [255, 255, 255, 255], red = [240, 70, 35, 255], green = [30, 80, 40, 255], yellow = [235, 180, 40, 255];
function image(width: number, height: number, paint: (x: number, y: number) => number[]): RasterPixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * 4);
  return { width, height, data };
}
const threeColors = () => image(120, 100, (x, y) => {
  if (x > 10 && x < 45 && y > 10 && y < 60) return red;
  if ((x - 78) ** 2 + (y - 35) ** 2 < 22 ** 2) return yellow;
  if (x > 30 && x < 90 && y > 75 && y < 90) return green;
  return white;
});
describe('local raster to printing vectors', () => {
  it('removes background before quantization and generates three opaque printing inks', () => {
    const result = traceRaster(threeColors(), { ...DEFAULT_TRACE, colors: 3 });
    expect(result.palette).toHaveLength(3); expect(result.transparentPixels).toBeGreaterThan(5000);
    const svg = traceSvg(result, 120), item = importSvg(svg); item.kind = 'image';
    expect(item.sourceWidth).toBeCloseTo(120, 8); expect(item.sourceHeight).toBe(100);
    expect(svg).not.toMatch(/<image|opacity|data:image/);
    const p = reconcileInks({ ...newProject(), artwork: [item] });
    expect(projectSchema.parse(p).artwork[0].kind).toBe('image');
    expect(separateArtwork(p).masks).toHaveLength(3);
  });
  it('is deterministic and does not mutate original RGBA pixels', () => {
    const pixels = threeColors(), original = new Uint8ClampedArray(pixels.data);
    expect(traceRaster(pixels, DEFAULT_TRACE)).toEqual(traceRaster(pixels, DEFAULT_TRACE));
    expect(pixels.data).toEqual(original);
  });
  it('honors color limits even on a continuous gradient', () => {
    const pixels = image(100, 80, (x, y) => [x * 2.5, y * 3, (x + y) * 1.4, 255]);
    for (const colors of [1, 2, 4, 8]) expect(quantize(pixels, { ...DEFAULT_TRACE, colors, background: 'keep' }).colors.length).toBeLessThanOrEqual(colors);
  });
  it('can keep the background as a real printing ink', () => {
    const result = traceRaster(threeColors(), { ...DEFAULT_TRACE, colors: 4, background: 'keep' });
    expect(result.palette).toHaveLength(4); expect(result.transparentPixels).toBe(0);
    expect(result.palette.some(p => p.color === '#ffffff')).toBe(true);
  });
  it('keeps transparent pixels out of the ink palette and makes alpha decisions explicitly', () => {
    const pixels = image(20, 20, (x, y) => x < 10 ? [23, 42, 57, 0] : y < 10 ? [200, 10, 20, 127] : [200, 10, 20, 128]);
    const result = traceRaster(pixels, { ...DEFAULT_TRACE, background: 'keep', colors: 8, minArea: 0 });
    expect(result.palette).toEqual([{ color: '#c80a14', pixels: 100 }]); expect(result.transparentPixels).toBe(300);
  });
  it('tolerates near-white JPEG noise when removing a white background', () => {
    const pixels = image(30, 30, (x, y) => x >= 10 && x < 20 && y >= 10 && y < 20 ? red : [250 + x % 5, 250 + y % 5, 252, 255]);
    const result = traceRaster(pixels, { ...DEFAULT_TRACE, colors: 4, minArea: 0 });
    expect(result.palette).toHaveLength(1); expect(result.transparentPixels).toBe(800);
  });
  it('preserves transparent holes and colored islands inside those holes', () => {
    const pixels = image(80, 80, (x, y) => {
      const d = (x - 40) ** 2 + (y - 40) ** 2;
      return d < 7 ** 2 ? green : d > 15 ** 2 && d < 30 ** 2 ? red : white;
    });
    const item = importSvg(traceSvg(traceRaster(pixels, { ...DEFAULT_TRACE, colors: 2, minArea: 0 }), 80));
    const redShape = item.shapes.find(s => s.color === '#f04623')!;
    const mask = path(redShape.d, 'evenodd'), center = path('M32 32H48V48H32Z');
    try { operation(mask, center, 'INTERSECT'); expect(contourArea(serializePath(mask))).toBeLessThan(.001); } finally { mask.delete(); center.delete(); }
    expect(item.shapes.some(s => s.color === '#1e5028')).toBe(true);
  });
  it('removes tiny connected speckles and preserves large regions and transparent holes', () => {
    const labels = new Int16Array(100).fill(-1); labels[0] = 0;
    for (let y = 2; y < 8; y++) for (let x = 2; x < 8; x++) labels[y * 10 + x] = 1;
    labels[44] = -1;
    expect(cleanIslands(labels, 10, 10, 4, 2)).toBe(1);
    expect(labels[0]).toBe(-1); expect(labels[44]).toBe(-1); expect(labels[33]).toBe(1);
  });
  it('exports separated, physically sized SVG/PDF masks with pairwise knockout', async () => {
    const item = importSvg(traceSvg(traceRaster(threeColors(), { ...DEFAULT_TRACE, colors: 3 }), 120));
    const p = reconcileInks({ ...newProject('Bildimport'), artwork: [item] }), separation = separateArtwork(p);
    expect(separation.error).toBeNull();
    for (let i = 0; i < separation.masks.length; i++) for (let j = i + 1; j < separation.masks.length; j++) {
      const a = path(separation.masks[i].d, 'evenodd'), b = path(separation.masks[j].d, 'evenodd');
      try { operation(a, b, 'INTERSECT'); expect(contourArea(serializePath(a))).toBeLessThan(.0001); } finally { a.delete(); b.delete(); }
    }
    const films = prepareFilms(p, separation); expect(films.errors).toEqual([]); expect(films.films).toHaveLength(3);
    const pdf = await PDFDocument.load(await filmsPdf(films));
    expect(pdf.getPageCount()).toBe(3); expect(pdf.getPages()[0].getWidth() * 25.4 / 72).toBeCloseTo(210, 4);
    for (const film of films.films) { expect(filmSvg(film)).toContain('fill="#000000"'); expect(filmSvg(film)).not.toContain('<image'); }
  });
  it('persists deleted areas in project source and preserves transforms on save/reload', () => {
    const item = importSvg(traceSvg(traceRaster(threeColors(), { ...DEFAULT_TRACE, colors: 3 }), 120)); item.kind = 'image'; item.x = 12; item.y = 23; item.rotation = 17;
    const edited = replaceShapes(item, item.shapes.filter(s => s.color !== '#f04623'));
    expect(edited.kind).toBe('image'); expect([edited.x, edited.y, edited.width, edited.height, edited.rotation]).toEqual([item.x, item.y, item.width, item.height, item.rotation]);
    const p = reconcileInks({ ...newProject(), artwork: [edited] }), parsed = projectSchema.parse(JSON.parse(JSON.stringify(p)));
    const reloaded = { ...parsed, artwork: parsed.artwork.map(a => ({ ...a, shapes: importSvg(a.sourceSVG).shapes })) };
    expect(separateArtwork(reloaded)).toEqual(separateArtwork(p)); expect(separateArtwork(p).masks).toHaveLength(2);
    expect(() => replaceShapes(item, [])).toThrow('mindestens');
  });
  it('retains existing version-one SVG projects', () => {
    const item = importSvg('<svg width="10mm" height="10mm"><rect width="10" height="10"/></svg>');
    expect(projectSchema.parse(reconcileInks({ ...newProject(), artwork: [item] })).artwork[0].kind).toBe('svg');
  });
  it('keeps physical width independent of input pixel density', () => {
    const pixels = image(100, 50, () => red), item = importSvg(traceSvg(traceRaster(pixels, { ...DEFAULT_TRACE, background: 'keep' }), 100));
    expect(item.width).toBe(100); expect(item.height).toBe(50); expect(boundsOf(item.shapes[0].d).width).toBeCloseTo(100, 2);
  });
  it('rejects empty traces and malformed or excessive input with actionable errors', () => {
    expect(() => traceRaster(image(20, 20, () => white), DEFAULT_TRACE)).toThrow('Hintergrund');
    expect(() => traceRaster({ width: 30000, height: 1, data: new Uint8ClampedArray(120000) }, DEFAULT_TRACE)).toThrow('groß');
    expect(() => traceRaster(threeColors(), { ...DEFAULT_TRACE, colors: 9 })).toThrow('Einstellungen');
    expect(() => traceSvg({ width: 10, height: 10, shapes: [] }, NaN)).toThrow('Breite');
  });
  it('fits big images into the processing budget and routes SVG through the safe importer', () => {
    const size = imageSize(4096, 4096); expect(size.width * size.height).toBeLessThanOrEqual(4_000_000);
    expect(imageSize(4000, 2000)).toEqual({ width: 2400, height: 1200 });
    expect(() => imageSize(100000, 100000)).toThrow('Megapixel');
    expect(isRasterFile({ name: 'photo.JPG', type: '' })).toBe(true);
    expect(isRasterFile({ name: 'photo.avif', type: 'image/avif' })).toBe(true);
    expect(isRasterFile({ name: 'unsafe.svg', type: 'image/png' })).toBe(false);
    expect(isRasterFile({ name: 'file.pdf', type: 'application/pdf' })).toBe(false);
  });
});
