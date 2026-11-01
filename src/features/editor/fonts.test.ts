import { beforeAll, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { initGeometry } from '../../core/geometry/engine';
import { BUNDLED_FONTS, initFont, importFontFile, loadFont } from './fonts';
import { makeText } from './text';
import { newProject, projectSchema, reconcileInks } from '../../core/project/model';
import { separateArtwork } from '../../core/separation/separate';
import { filmsPdf, prepareFilms } from '../../core/print/films';
import { PDFDocument } from 'pdf-lib';
beforeAll(() => initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm')));
const buffer = (file: string) => Uint8Array.from(readFileSync(`public/fonts/${file}`)).buffer;
it('outlines all eight bundled styles, remembers the chosen font and exports it as vectors', async () => {
  const drawings = [];
  for (const f of BUNDLED_FONTS) { await initFont(buffer(f.file), f.id); const a = makeText('ÖL & FARBE', '#000000', 100, f.id); expect(a.fontId).toBe(f.id); expect(a.sourceSVG).not.toMatch(/<text|<image|NaN/); drawings.push(a.shapes.map(s => s.d).join('')); }
  expect(new Set(drawings).size).toBe(8);
  const project = reconcileInks({ ...newProject(), artwork: [makeText('PRINT', '#000000', 80, 'dejavu-serif-regular')] });
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(project)));
  expect(restored.artwork[0].fontId).toBe('dejavu-serif-regular');
  expect((await PDFDocument.load(await filmsPdf(prepareFilms(restored, separateArtwork(restored))))).getPageCount()).toBe(1);
});
it('stores a custom font in the project file and validates its contents on loading', async () => {
  const bytes = buffer('DejaVuSerif-Bold.ttf');
  const asset = await importFontFile({ name: 'My-serif.ttf', size: bytes.byteLength, arrayBuffer: async () => bytes } as File);
  const p = projectSchema.parse({ ...newProject(), fonts: [asset] });
  vi.resetModules(); const fresh = await import('./fonts'); await fresh.loadFont(asset.id, JSON.parse(JSON.stringify(p.fonts)));
  expect(fresh.fontFor(asset.id).charToGlyphIndex('Ä')).toBeGreaterThan(0);
  await loadFont(asset.id, p.fonts);
  expect(makeText('ÄÖÜ', '#000000', 100, asset.id).fontId).toBe(asset.id);
  await expect(loadFont(asset.id, [{ ...asset, data: btoa('bad data') }])).rejects.toThrow();
  await expect(importFontFile({ name: 'wrong.ttf', size: 100, arrayBuffer: async () => new ArrayBuffer(100) } as File)).rejects.toThrow('Schriftformat');
});
