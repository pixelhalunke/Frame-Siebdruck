import { beforeAll, expect, it } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { initGeometry, path, operation, boundsOf, serializePath } from '../core/geometry/engine';
import { contourArea } from './helpers/path-area';
import { importSvg } from '../core/svg/import';
import { newProject, projectSchema, reconcileInks } from '../core/project/model';
import { separateArtwork } from '../core/separation/separate';
import { prepareFilms, filmSvg, filmsPdf } from '../core/print/films';
import { initFont } from '../features/editor/text';
import { demoSvg } from '../features/editor/demo';
beforeAll(async () => {
  await initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm'));
  await initFont(Uint8Array.from(readFileSync('public/fonts/SpaceGrotesk-Bold.woff')).buffer);
});
it('runs file → knockout → mapping → save/reload → SVG/PDF without changing geometry', async () => {
  const source = readFileSync('src/test/fixtures/three-inks.svg', 'utf8');
  const project = reconcileInks({ ...newProject('Drei Druckfarben'), artwork: [importSvg(source)] });
  const original = separateArtwork(project);
  expect(original.masks).toHaveLength(3);
  project.mapping['#edb83b'] = project.mapping['#f05b36'];
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(project)));
  expect(separateArtwork(restored)).toEqual(separateArtwork(project));
  const preflight = prepareFilms(restored, separateArtwork(restored));
  expect(preflight.errors).toEqual([]); expect(preflight.films).toHaveLength(2);
  expect((await PDFDocument.load(await filmsPdf(preflight))).getPageCount()).toBe(2);
  expect(filmSvg(preflight.films[0])).toContain('width="210mm"');
});
it('does not create a film for hidden items, and disabled ink does not reveal underlying art', () => {
  const project = reconcileInks({ ...newProject(), artwork: [importSvg(readFileSync('src/test/fixtures/three-inks.svg', 'utf8'))] });
  const original = separateArtwork(project);
  project.inks[1].enabled = false;
  expect(separateArtwork(project).masks[0].d).toBe(original.masks[0].d);
  expect(prepareFilms(project, separateArtwork(project)).films).toHaveLength(2);
  project.artwork[0].visible = false;
  expect(separateArtwork(project).masks).toHaveLength(0);
});
it('keeps pairwise mask overlap below 0.0001 mm² (float32 curve tolerance)', () => {
  const project = reconcileInks({ ...newProject(), artwork: [importSvg(readFileSync('src/test/fixtures/three-inks.svg', 'utf8'))] });
  const masks = separateArtwork(project).masks;
  for (let i = 0; i < masks.length; i++) for (let j = i + 1; j < masks.length; j++) {
    const a = path(masks[i].d, 'evenodd'), b = path(masks[j].d, 'evenodd');
    try {
      operation(a, b, 'INTERSECT');
      expect(contourArea(serializePath(a))).toBeLessThan(.0001);
    } finally { a.delete(); b.delete(); }
  }
});
it('blocks unsupported artwork before it enters a project', () => {
  expect(() => importSvg(readFileSync('src/test/fixtures/unsupported-gradient.svg', 'utf8'))).toThrow('linearGradient');
});
it('calibration target has exactly 100 mm outer dimensions', async () => {
  const a = importSvg(readFileSync('src/test/fixtures/calibration-100mm.svg', 'utf8'));
  const p = reconcileInks({ ...newProject('Kalibrierung 100 mm'), artwork: [a] });
  const out = prepareFilms(p, separateArtwork(p));
  expect(boundsOf(out.films[0].d).width).toBeCloseTo(100, 4);
  expect(boundsOf(out.films[0].d).height).toBeCloseTo(100, 4);
  if (process.env.FRAME_WRITE_SAMPLES) { mkdirSync('examples/films', { recursive: true }); writeFileSync('examples/films/Kalibrierung-100mm.pdf', await filmsPdf(out)); writeFileSync('examples/films/Kalibrierung-100mm.svg', filmSvg(out.films[0])); }
});
it('generates the real three-color studio sample as aligned vector films', async () => {
  const source = demoSvg(), a = importSvg(source, 'Grow your own');
  const p = reconcileInks({ ...newProject('Grow your own'), artwork: [a] });
  const out = prepareFilms(p, separateArtwork(p));
  expect(out.errors).toEqual([]); expect(out.films).toHaveLength(3);
  const pdf = await filmsPdf(out);
  expect((await PDFDocument.load(pdf)).getPageCount()).toBe(3);
  if (process.env.FRAME_WRITE_SAMPLES) {
    mkdirSync('examples/films', { recursive: true });
    writeFileSync('examples/Grow-your-own.svg', source);
    writeFileSync('examples/Grow-your-own.frame.json', JSON.stringify(p, null, 2));
    writeFileSync('examples/films/Grow-your-own.pdf', pdf);
    out.films.forEach((f, i) => writeFileSync(`examples/films/Grow-your-own-${i + 1}-${f.name}.svg`, filmSvg(f)));
  }
});
