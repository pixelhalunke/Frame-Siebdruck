import svgpath from 'svgpath';
import { importSvg } from '../svg/import';
import type { Artwork, Shape } from '../project/model';
import { MAX_IMAGE_SVG_CHARS, MAX_TRACE_SHAPES, MAX_TRACE_EDGE, MAX_TRACE_PIXELS } from './types';

/** Only FRAME's narrow, opaque, path-only format enters this importer. */
function imageDocument(source: string) {
  if (source.length > MAX_IMAGE_SVG_CHARS || /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(source)) throw new Error('Die Bildvektoren sind ungültig oder zu groß.');
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml'), root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.localName !== 'svg') throw new Error('Die Bildvektoren konnten nicht gelesen werden.');
  const allowedRoot = new Set(['xmlns', 'width', 'height', 'viewBox', 'data-frame-mosaic']);
  if ([...root.attributes].some(a => !allowedRoot.has(a.name))) throw new Error('Die Bildvektoren enthalten nicht unterstützte Eigenschaften.');
  const paths = [...root.children];
  if (!paths.length || paths.length > MAX_TRACE_SHAPES) throw new Error('Die Bildvektoren überschreiten das Detailbudget.');
  for (const p of paths) if (p.localName !== 'path' || p.children.length || [...p.attributes].some(a => !['d', 'fill', 'fill-rule'].includes(a.name)) || !/^#[\da-f]{6}$/i.test(p.getAttribute('fill') ?? '') || p.getAttribute('fill-rule') !== 'evenodd') throw new Error('Nur deckende Vektorflächen sind als Bildvektoren erlaubt.');
  const vb = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  const mm = (s: string | null) => s?.match(/^(\d+(?:\.\d+)?(?:e[+-]?\d+)?)mm$/i)?.[1];
  const width = Number(mm(root.getAttribute('width'))), height = Number(mm(root.getAttribute('height')));
  if (vb.length !== 4 || vb.some(v => !Number.isFinite(v)) || vb[0] !== 0 || vb[1] !== 0 || vb[2] <= 0 || vb[3] <= 0 || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 10000 || height > 10000) throw new Error('Die Bildvektoren haben ungültige Abmessungen.');
  const shapes = paths.map((p, i) => ({ id: `region-${i}`, d: p.getAttribute('d') ?? '', color: p.getAttribute('fill')!.toLowerCase() }));
  return { root, shapes, width, height, pixelWidth: vb[2], pixelHeight: vb[3], mosaic: root.getAttribute('data-frame-mosaic') === '1' };
}

/** Verify the grid and disjoint colors rather than trusting a project-file flag.
 * Scanlines also verify holes and shared pixel boundaries without boolean unions.
 */
export function mosaicPixels(shapes: Shape[], width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_TRACE_EDGE || height > MAX_TRACE_EDGE || width * height > MAX_TRACE_PIXELS) throw new Error('Ungültiges Detailraster.');
  const groups = new Map<string, string[]>();
  for (const s of shapes) { if (!groups.has(s.color)) groups.set(s.color, []); groups.get(s.color)!.push(s.d); }
  if (groups.size > 8) throw new Error('Das Detailraster enthält zu viele Farben.');
  const labels = new Int16Array(width * height).fill(-1);
  let index = 0, edgeSteps = 0;
  for (const paths of groups.values()) {
    const rows: number[][] = Array.from({ length: height }, () => []);
    for (const d of paths) {
      const parsed = svgpath(d);
      if ((parsed as unknown as { err: string }).err) throw new Error('Ungültige Rasterkontur.');
      let x = 0, y = 0, sx = 0, sy = 0, open = false;
      const edge = (nx: number, ny: number) => {
        if (!Number.isInteger(nx) || !Number.isInteger(ny) || nx < 0 || ny < 0 || nx > width || ny > height || (nx !== x && ny !== y)) throw new Error('Rasterkonturen müssen auf dem Pixelraster liegen.');
        edgeSteps += Math.abs(ny - y);
        if (edgeSteps > 8_000_000) throw new Error('Die Rasterkonturen überschreiten das Detailbudget.');
        if (nx === x) for (let row = Math.min(y, ny); row < Math.max(y, ny); row++) rows[row].push(x);
        x = nx; y = ny;
      };
      parsed.iterate(s => {
        if (s[0] === 'M' && s.length === 3 && !open) { x = sx = s[1]; y = sy = s[2]; edge(x, y); open = true; }
        else if (s[0] === 'L' && s.length === 3 && open) edge(s[1], s[2]);
        else if (s[0] === 'Z' && open) { edge(sx, sy); open = false; }
        else throw new Error('Ungültige Rasterkontur.');
      });
      if (open) throw new Error('Rasterkonturen müssen geschlossen sein.');
    }
    rows.forEach((row, y) => {
      row.sort((a, b) => a - b);
      if (row.length % 2) throw new Error('Die Rasterkontur ist unvollständig.');
      for (let i = 0; i < row.length; i += 2) for (let x = row[i]; x < row[i + 1]; x++) {
        const p = y * width + x;
        if (labels[p] !== -1) throw new Error('Die Rasterfarben überlappen sich.');
        labels[p] = index;
      }
    });
    index++;
  }
  return labels;
}

/** Keep editable regions in the source; use one compound path per ink in the editor. */
export function importImageSvg(source: string, name: string): Artwork {
  const image = imageDocument(source), groups: { color: string; paths: string[] }[] = [];
  // Smooth legacy traces can overlap at their curves, so preserve their paint order.
  for (const s of image.shapes) {
    if (groups.at(-1)?.color !== s.color) groups.push({ color: s.color, paths: [] });
    groups.at(-1)!.paths.push(s.d);
  }
  const transform = `scale(${image.width / image.pixelWidth} ${image.height / image.pixelHeight})`;
  if (image.mosaic) {
    mosaicPixels(image.shapes, image.pixelWidth, image.pixelHeight);
    const colors = [...new Set(image.shapes.map(s => s.color))];
    const shapes = colors.map((color, i) => ({ id: `ink-${i}`, color, d: svgpath(image.shapes.filter(s => s.color === color).map(s => s.d).join('')).transform(transform).round(9).toString() }));
    if (shapes.some(s => s.d.length > MAX_IMAGE_SVG_CHARS)) throw new Error('Die Vektorgrafik überschreitet das Detailbudget. Verwende ein kleineres Bild.');
    return { id: crypto.randomUUID(), name, kind: 'image', sourceSVG: source, shapes, isMosaic: true, sourceWidth: image.width, sourceHeight: image.height, width: image.width, height: image.height, x: (210 - image.width) / 2, y: (297 - image.height) / 2, rotation: 0, visible: true };
  }
  const packed = `<svg xmlns="http://www.w3.org/2000/svg" width="${image.width}mm" height="${image.height}mm" viewBox="0 0 ${image.pixelWidth} ${image.pixelHeight}">${groups.map(g => `<path fill="${g.color}" fill-rule="evenodd" d="${g.paths.join('')}"/>`).join('')}</svg>`;
  const item = importSvg(packed, name, MAX_IMAGE_SVG_CHARS);
  return { ...item, kind: 'image', sourceSVG: source, isMosaic: false };
}
export function imageRegions(item: Artwork) {
  const image = imageDocument(item.sourceSVG);
  return { shapes: image.shapes, width: image.pixelWidth, height: image.pixelHeight, preserveTexture: image.mosaic };
}
