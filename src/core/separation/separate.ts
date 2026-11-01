import { path, serializePath, operation, transformPath, boundsOf, type Bounds } from '../geometry/engine';
import type { SkPath } from 'pathkit-wasm';
import type { Artwork, Project, Ink } from '../project/model';

export type Mask = { ink: Ink; d: string; bounds: Bounds };
export type Separation = { masks: Mask[]; bounds: Bounds | null; error: string | null };
export function itemTransform(a: Artwork) {
  return `translate(${a.x + a.width / 2} ${a.y + a.height / 2}) rotate(${a.rotation}) translate(${-a.width / 2} ${-a.height / 2}) scale(${a.width / a.sourceWidth} ${a.height / a.sourceHeight})`;
}
export function combinedBounds(boxes: Bounds[]): Bounds | null {
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
  return { x, y, width: Math.max(...boxes.map(b => b.x + b.width)) - x, height: Math.max(...boxes.map(b => b.y + b.height)) - y };
}
/** A boolean solver need only visit contours near an overlaid object. Keep
 * distant contours (including holes) unchanged; evenodd composes the result.
 * Mosaic contours contain only absolute M/L/Z coordinates.
 */
function localMosaicDifference(d: string, covered: SkPath) {
  const bounds = covered.computeTightBounds(), untouched: string[] = [], nearby: string[] = [];
  for (const contour of d.match(/M[^M]*/g) ?? []) {
    const numbers = (contour.match(/[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?/gi) ?? []).map(Number);
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (let i = 0; i < numbers.length; i += 2) { left = Math.min(left, numbers[i]); right = Math.max(right, numbers[i]); top = Math.min(top, numbers[i + 1]); bottom = Math.max(bottom, numbers[i + 1]); }
    (right <= bounds.fLeft || left >= bounds.fRight || bottom <= bounds.fTop || top >= bounds.fBottom ? untouched : nearby).push(contour);
  }
  if (!nearby.length) return d;
  const changed = path(nearby.join(''), 'evenodd');
  try { operation(changed, covered, 'DIFFERENCE'); return serializePath(changed) + untouched.join(''); }
  finally { changed.delete(); }
}
/** Visibility/knockout is computed before ink reassignment and enable/disable.
 * Disabling an ink omits its film; it does not reveal colors hidden beneath it.
 */
export function separateArtwork(project: Project): Separation {
  const owned: SkPath[] = [];
  const own = (p: SkPath) => { owned.push(p); return p; };
  try {
    const items = project.artwork.filter(a => a.visible).slice().reverse();
    let covered: SkPath | undefined;
    const byInk = new Map<string, string[]>();
    for (let index = 0; index < items.length; index++) {
      const item = items[index], needCoverage = index < items.length - 1;
      const shapes = item.shapes.map(s => ({ ...s, d: transformPath(s.d, itemTransform(item)) })).reverse();
      const originals: string[] = [];
      for (let j = 0; j < shapes.length; j++) {
        const shape = shapes[j];
        const inkId = project.mapping[shape.color];
        if (!inkId || !project.inks.some(i => i.id === inkId)) throw new Error('Eine Quellfarbe hat keine Druckfarbe. Weise sie einer Druckfarbe zu.');
        let d = shape.d;
        if (covered && item.isMosaic) d = localMosaicDifference(d, covered);
        else if (covered) {
          const visible = own(path(d, 'evenodd'));
          operation(visible, covered, 'DIFFERENCE');
          d = serializePath(visible);
        }
        // Visibility has made the pieces disjoint. Concatenation with evenodd
        // preserves them without repeatedly unioning thousands of tiny dots.
        if (d) { if (!byInk.has(inkId)) byInk.set(inkId, []); byInk.get(inkId)!.push(d); }
        if (item.isMosaic) { if (needCoverage) originals.push(shape.d); }
        else if (needCoverage || j < shapes.length - 1) {
          const original = own(path(shape.d, 'evenodd'));
          if (covered) operation(covered, original, 'UNION'); else covered = own(original.copy());
        }
      }
      if (originals.length) {
        const original = own(path(originals.join(''), 'evenodd'));
        if (covered) operation(covered, original, 'UNION'); else covered = own(original.copy());
      }
    }
    const masks: Mask[] = [];
    for (const ink of project.inks) {
      const d = byInk.get(ink.id)?.join('');
      if (d) masks.push({ ink, d, bounds: boundsOf(d) });
    }
    return { masks, bounds: combinedBounds(masks.filter(m => m.ink.enabled).map(m => m.bounds)), error: null };
  } catch (error) {
    return { masks: [], bounds: null, error: error instanceof Error ? error.message : 'Die Farbtrennung ist fehlgeschlagen.' };
  } finally { owned.forEach(p => p.delete()); }
}
