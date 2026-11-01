import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument, PDFName, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { initGeometry } from '../geometry/engine';
import { importSvg } from '../svg/import';
import { newProject, reconcileInks } from '../project/model';
import { separateArtwork } from '../separation/separate';
import { prepareFilms, filmsPdf, filmSvg, MM_TO_PT } from './films';
beforeAll(() => initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm')));
function sample() {
  const a = importSvg('<svg width="100mm" height="100mm" viewBox="0 0 100 100"><rect width="100" height="100" fill="red"/><circle cx="50" cy="50" r="30" fill="yellow"/><rect x="40" y="40" width="20" height="20" fill="black"/></svg>');
  return reconcileInks({ ...newProject(), artwork: [a] });
}
it('exports three exact-size vector pages with identical registration coordinates and evenodd fill', async () => {
  const project = sample(), output = prepareFilms(project, separateArtwork(project));
  expect(output.errors).toEqual([]); expect(output.films).toHaveLength(3);
  expect(new Set(output.films.map(f => f.marks)).size).toBe(1);
  expect(output.bounds!.width).toBeCloseTo(100, 3);
  for (const film of output.films) {
    const svg = filmSvg(film);
    expect(svg).toContain('width="210mm"'); expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).not.toContain('<image'); expect(svg).not.toContain(film.color === '#000000' ? '#ffffff' : film.color);
  }
  const bytes = await filmsPdf(output), pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(3);
  for (const p of pdf.getPages()) {
    expect(p.getWidth() / MM_TO_PT).toBeCloseTo(210, 5); expect(p.getHeight() / MM_TO_PT).toBeCloseTo(297, 5);
    const streams = p.node.lookup(PDFName.of('Contents'), PDFArray);
    const content = new TextDecoder().decode(decodePDFRawStream(pdf.context.lookup(streams.get(0)) as PDFRawStream).decode());
    expect(content).toContain('f*'); expect(content).toContain('0 0 0 rg'); expect(content).not.toContain(' Do');
    expect(content).toContain(`${MM_TO_PT}`);
  }
});
it('blocks overflow and never silently fits artwork', async () => {
  const p = sample(); p.artwork[0].width = 250;
  const output = prepareFilms(p, separateArtwork(p));
  expect(output.errors.length).toBeGreaterThan(0); expect(output.bounds!.width).toBeCloseTo(250);
  await expect(filmsPdf(output)).rejects.toThrow();
});
it('handles A3 landscape, mirror and explicit output scale', () => {
  const p = sample(); p.print = { ...p.print, paper: 'A3', landscape: true, mirrored: true, scale: 1.2 };
  const result = prepareFilms(p, separateArtwork(p));
  expect(result.films[0].width).toBe(420); expect(result.films[0].height).toBe(297);
  expect(result.bounds!.width).toBeCloseTo(120); expect(result.warnings).toHaveLength(1);
});
