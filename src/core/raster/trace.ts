import tracer, { type TracedPath, type PixelPath } from 'imagetracerjs';
import { cleanIslands, quantize } from './quantize';
import { MAX_TRACE_SHAPES, MAX_IMAGE_SVG_CHARS, type RasterPixels, type TraceOptions, type TraceResult, type TraceShape } from './types';

function contour(path: TracedPath) {
  if (!path.segments.length) return '';
  const n = (v: number | undefined) => { if (v === undefined || !Number.isFinite(v)) throw new Error('Eine Bildkontur konnte nicht gelesen werden. Verringere den Detailgrad.'); return String(+v.toFixed(5)); };
  return `M${n(path.segments[0].x1)} ${n(path.segments[0].y1)}${path.segments.map(s => s.type === 'Q' ? `Q${n(s.x2)} ${n(s.y2)} ${n(s.x3)} ${n(s.y3)}` : `L${n(s.x2)} ${n(s.y2)}`).join('')}Z`;
}
/** Exact pixel-cell boundaries preserve existing halftone dots and guarantee
 * disjoint ink regions. Only redundant collinear vertices are removed. */
function pixelContour(path: PixelPath) {
  const points = path.points.filter((p, i, all) => {
    const before = all[(i + all.length - 1) % all.length], after = all[(i + 1) % all.length];
    return (p.x - before.x) * (after.y - p.y) !== (p.y - before.y) * (after.x - p.x);
  });
  return points.length ? `M${points.map(p => `${p.x} ${p.y}`).join('L')}Z` : '';
}
export function traceRaster(pixels: RasterPixels, options: TraceOptions): TraceResult {
  const { labels, colors } = quantize(pixels, options);
  const removedSpeckles = cleanIslands(labels, pixels.width, pixels.height, options.minArea, colors.length);
  const array: number[][] = [Array(pixels.width + 2).fill(-1)];
  for (let y = 0; y < pixels.height; y++) array.push([-1, ...labels.subarray(y * pixels.width, (y + 1) * pixels.width), -1]);
  array.push(Array(pixels.width + 2).fill(-1));
  const tolerance = options.preserveTexture ? .05 : { fine: .1, balanced: .7, smooth: 2 }[options.detail], shapes: TraceShape[] = [], counts = new Uint32Array(colors.length);
  let transparentPixels = 0, size = 0;
  for (const label of labels) { if (label < 0) transparentPixels++; else counts[label]++; }
  colors.forEach((color, index) => {
    if (!counts[index]) return;
    const scanned = tracer.pathscan(tracer.layeringstep({ array }, index), 0);
    const layer = options.preserveTexture ? scanned : tracer.batchtracepaths(tracer.internodes(scanned, { rightangleenhance: true }), tolerance, tolerance);
    layer.forEach((p, i) => {
      if (p.isholepath) return;
      const write = (p: PixelPath | TracedPath) => 'points' in p ? pixelContour(p) : contour(p);
      const d = write(p) + p.holechildren.map(h => write(layer[h])).join('');
      if (!d) return;
      size += d.length;
      if (shapes.length >= MAX_TRACE_SHAPES || size > MAX_IMAGE_SVG_CHARS - 1_000_000) throw new Error('Das Bild überschreitet das Detailbudget. Reduziere die Druckfarben oder verwende eine kleinere Bilddatei.');
      shapes.push({ id: `trace-${index}-${i}`, d, color });
    });
  });
  if (!shapes.length) throw new Error('Es sind keine druckbaren Flächen übrig. Verringere den Fleckenfilter oder behalte den Hintergrund.');
  return { width: pixels.width, height: pixels.height, shapes, palette: colors.flatMap((color, i) => counts[i] ? [{ color, pixels: counts[i] }] : []), removedSpeckles, transparentPixels, preserveTexture: !!options.preserveTexture };
}
