import { boundsOf, transformPath, type Bounds } from '../geometry/engine';
import { combinedBounds, type Separation } from '../separation/separate';
import { pageSize, type Project } from '../project/model';

export const MM_TO_PT = 72 / 25.4;
export type Film = { inkId: string; name: string; color: string; d: string; width: number; height: number; marks: string };
export type Preflight = { films: Film[]; errors: string[]; warnings: string[]; bounds: Bounds | null };
export function prepareFilms(project: Project, separation: Separation): Preflight {
  const { width, height } = pageSize(project.print);
  const s = project.print.scale;
  const tx = `translate(${width / 2} ${height / 2}) scale(${project.print.mirrored ? -s : s} ${s}) translate(${-width / 2} ${-height / 2})`;
  const selected = separation.masks.filter(m => m.ink.enabled);
  const identity = s === 1 && !project.print.mirrored;
  const transformed = identity ? selected : selected.map(m => ({ ...m, d: transformPath(m.d, tx) }));
  const bounds = combinedBounds(transformed.map(m => identity ? m.bounds : boundsOf(m.d)));
  const errors: string[] = separation.error ? [separation.error] : [];
  const warnings: string[] = [];
  if (!selected.length) errors.push('Aktiviere mindestens eine sichtbare Druckfarbe.');
  if (s !== 1) warnings.push(`Ausgabe mit ${Math.round(s * 100)} %: Die Maße weichen vom Motiv ab.`);
  if (selected.length > 4) warnings.push('Mehr als vier Siebe: Prüfe Druckreihenfolge und Ausrichtung besonders sorgfältig.');
  let marks = '';
  if (bounds) {
    if (bounds.x < 5 - .001 || bounds.y < 5 - .001 || bounds.x + bounds.width > width - 5 + .001 || bounds.y + bounds.height > height - 5 + .001) errors.push('Das Motiv ragt in den 5-mm-Druckrand. Verkleinere oder verschiebe es, oder wähle größeres Papier.');
    if (project.print.marks) {
      const points = [
        [bounds.x - 5, bounds.y - 5], [bounds.x + bounds.width + 5, bounds.y - 5],
        [bounds.x - 5, bounds.y + bounds.height + 5], [bounds.x + bounds.width + 5, bounds.y + bounds.height + 5],
      ];
      if (points.some(([x, y]) => x - 2.5 < 5 || y - 2.5 < 5 || x + 2.5 > width - 5 || y + 2.5 > height - 5)) errors.push('Die Passkreuze brauchen mehr Platz. Halte mindestens 12,5 mm Abstand zwischen Motiv und Papierkante.');
      // Filled rectangles, never hairline strokes: same opaque geometry on every film.
      marks = points.map(([x, y]) => `M${x - 2.5} ${y - .125}h5v.25h-5ZM${x - .125} ${y - 2.5}h.25v5h-.25Z`).join('');
    }
  }
  const films = transformed.map(m => ({ inkId: m.ink.id, name: m.ink.name, color: m.ink.color, d: m.d, width, height, marks }));
  return { films, errors, warnings, bounds };
}
export function filmSvg(film: Film) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${film.width}mm" height="${film.height}mm" viewBox="0 0 ${film.width} ${film.height}"><path fill="#000000" fill-rule="evenodd" d="${film.d}"/>${film.marks ? `<path fill="#000000" d="${film.marks}"/>` : ''}</svg>`;
}
export async function filmsPdf(preflight: Preflight): Promise<Uint8Array> {
  if (preflight.errors.length) throw new Error(preflight.errors.join(' '));
  const { PDFDocument, rgb, drawSvgPath, PDFOperator, PDFOperatorNames } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.setTitle('FRAME · Belichtungsfilme'); pdf.setCreator('FRAME'); pdf.setProducer('FRAME / pdf-lib');
  pdf.setCreationDate(new Date('2026-01-01T00:00:00Z')); pdf.setModificationDate(new Date('2026-01-01T00:00:00Z'));
  for (const film of preflight.films) {
    const page = pdf.addPage([film.width * MM_TO_PT, film.height * MM_TO_PT]);
    const options = { x: 0, y: film.height * MM_TO_PT, scale: MM_TO_PT, color: rgb(0, 0, 0), borderWidth: 0, borderColor: undefined, rotate: undefined };
    // PathKit outputs even-odd contours. PDF must use f*; nonzero f would fill holes.
    const ops = drawSvgPath(film.d, options).map(op => op.toString() === 'f' ? PDFOperator.of(PDFOperatorNames.FillEvenOdd) : op);
    for (let i = 0; i < ops.length; i += 4096) page.pushOperators(...ops.slice(i, i + 4096));
    if (film.marks) page.pushOperators(...drawSvgPath(film.marks, options));
  }
  return pdf.save({ useObjectStreams: false });
}
export function safeFilename(name: string) { return name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-|-$/g, '') || 'FRAME'; }
export function downloadFile(data: BlobPart, filename: string, type: string, retain = false) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  if (!retain) setTimeout(() => URL.revokeObjectURL(url), 30000);
  return url;
}
