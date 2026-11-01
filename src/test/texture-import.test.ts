import { beforeAll, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import svgpath from 'svgpath';
import { PDFDocument, PDFName, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { traceRaster } from '../core/raster/trace';
import { quantize } from '../core/raster/quantize';
import { traceSvg } from '../core/raster/svg';
import { imageRegions, importImageSvg, mosaicPixels } from '../core/raster/artwork';
import { initGeometry } from '../core/geometry/engine';
import { newProject, projectSchema, reconcileInks } from '../core/project/model';
import { separateArtwork } from '../core/separation/separate';
import { textureFixture, TEXTURE_OPTIONS } from './helpers/texture-fixture';
import { prepareFilms, filmsPdf, filmSvg, MM_TO_PT } from '../core/print/films';
import { importSvg } from '../core/svg/import';
import { hasFineTexture, imageSize } from '../features/import/raster';
import { replaceShapes } from '../features/editor/shapes';

beforeAll(() => initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm')));
const options = TEXTURE_OPTIONS;
function mismatches(a: Int16Array, b: Int16Array) {
  expect(a.length).toBe(b.length);
  let count = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) count++;
  return count;
}
for (const name of ['dots', 'speckles'] as const) {
  it(`imports a full-resolution ${name} pattern, preserves every classified pixel and exports two vector films`, async () => {
    const pixels = textureFixture(name);
    expect(imageSize(pixels.width, pixels.height)).toEqual({ width: 1122, height: 1402 });
    expect(hasFineTexture(pixels)).toBe(true);
    const traced = traceRaster(pixels, options), quantized = quantize(pixels, options);
    expect(traced.palette).toHaveLength(2);
    expect(traced.palette[0].color).toBe('#0c0c0a');
    expect(traced.palette[1].color).toBe('#e2fa14');
    expect(traced.removedSpeckles).toBe(0);
    expect(traced.shapes.length).toBeGreaterThan(3000);
    // Exhaustive cell comparison: catches missing dots, filled holes, overlap,
    // shifted contours and border clipping. No smoothing/filter is allowed here.
    expect(mismatches(mosaicPixels(traced.shapes, pixels.width, pixels.height), quantized.labels)).toBe(0);
    const item = importImageSvg(traceSvg(traced, 150), `Texture-${name}`);
    expect(item.shapes).toHaveLength(2); expect(item.isMosaic).toBe(true);
    const project = reconcileInks({ ...newProject(`Texture-${name}`), artwork: [item] });
    const separated = separateArtwork(project);
    expect(separated.error).toBeNull(); expect(separated.masks).toHaveLength(2);
    const restoredCells = separated.masks.map(m => ({ id: m.ink.id, color: m.ink.color, d: svgpath(m.d).transform(`scale(${pixels.width / item.width} ${pixels.height / item.height}) translate(${-item.x} ${-item.y})`).round(0).toString() }));
    expect(mismatches(mosaicPixels(restoredCells, pixels.width, pixels.height), quantized.labels)).toBe(0);
    const output = prepareFilms(project, separated);
    expect(output.errors).toEqual([]);
    expect(new Set(output.films.map(f => f.marks)).size).toBe(1);
    const bytes = await filmsPdf(output), pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    for (const page of pdf.getPages()) {
      expect(page.getWidth() / MM_TO_PT).toBeCloseTo(210, 5);
      expect(page.getHeight() / MM_TO_PT).toBeCloseTo(297, 5);
      const streams = page.node.lookup(PDFName.of('Contents'), PDFArray);
      const content = new TextDecoder().decode(decodePDFRawStream(pdf.context.lookup(streams.get(0)) as PDFRawStream).decode());
      expect(content).toContain('f*'); expect(content).toContain('0 0 0 rg'); expect(content).not.toContain(' Do');
    }
    const parsed = projectSchema.parse(JSON.parse(JSON.stringify(project)));
    const rebuilt = importImageSvg(parsed.artwork[0].sourceSVG, item.name);
    expect(rebuilt.shapes).toEqual(item.shapes);
    expect(imageRegions(rebuilt).shapes.length).toBe(traced.shapes.length);
    if (process.env.FRAME_WRITE_TEXTURES) {
      mkdirSync('examples/textures', { recursive: true });
      writeFileSync(`examples/textures/Texture-${name}.frame.json`, JSON.stringify(project));
      writeFileSync(`examples/textures/Texture-${name}.pdf`, bytes);
      output.films.forEach((f, i) => writeFileSync(`examples/textures/Texture-${name}-${i + 1}.svg`, filmSvg(f)));
    }
    // Deleting a source region survives rebuilding without losing the grid.
    item.x = 12; item.rotation = 17;
    const regions = imageRegions(item), edited = replaceShapes(item, regions.shapes.slice(1));
    expect(edited.x).toBe(12); expect(edited.rotation).toBe(17);
    expect(imageRegions(importImageSvg(edited.sourceSVG, edited.name)).shapes).toHaveLength(traced.shapes.length - 1);
  }, 20000);
}
it('clips a textured pattern under added artwork without changing any distant pixel or hole', () => {
  const pixels = textureFixture('speckles'), traced = traceRaster(pixels, options), expected = quantize(pixels, options).labels;
  const item = importImageSvg(traceSvg(traced, 150), 'Texture-speckles'), factor = item.width / pixels.width;
  const overlay = importSvg(`<svg width="${500 * factor}mm" height="${90 * factor}mm" viewBox="0 0 500 90"><rect width="500" height="90" fill="red"/></svg>`);
  overlay.x = item.x + 300 * factor; overlay.y = item.y + 650 * factor;
  const project = reconcileInks({ ...newProject(), artwork: [item, overlay] }), result = separateArtwork(project);
  expect(result.error).toBeNull(); expect(result.masks).toHaveLength(3);
  const restored = result.masks.map(m => ({ id: m.ink.id, color: m.ink.color, d: svgpath(m.d).transform(`scale(${1 / factor}) translate(${-item.x} ${-item.y})`).round(0).toString() }));
  for (let y = 650; y < 740; y++) for (let x = 300; x < 800; x++) expected[y * pixels.width + x] = 2;
  expect(mismatches(mosaicPixels(restored, pixels.width, pixels.height), expected)).toBe(0);
}, 10000);
it('does not trust a forged mosaic flag or unsafe image source in project backups', () => {
  const root = (paths: string, attr = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10" data-frame-mosaic="1" ${attr}>${paths}</svg>`;
  const p = (d: string, color = '#000000') => `<path fill="${color}" fill-rule="evenodd" d="${d}"/>`;
  expect(() => importImageSvg(root(p('M0 0L5 5L0 5Z')), 'bad')).toThrow('Pixelraster');
  expect(() => importImageSvg(root(p('M0 0L5 0L5 5L0 5Z') + p('M0 0L5 0L5 5L0 5Z', '#ffff00')), 'bad')).toThrow('überlappen');
  expect(() => importImageSvg(root(p('M0 0L20 0L20 5L0 5Z')), 'bad')).toThrow();
  expect(() => importImageSvg(root(p('M0 0L5 0L5 5L0 5Z'), 'onload="alert(1)"'), 'bad')).toThrow();
  expect(() => importImageSvg(root('<image href="https://example.com/image.png"/>'), 'bad')).toThrow();
});
