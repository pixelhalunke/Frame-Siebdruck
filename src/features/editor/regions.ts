import svgpath from 'svgpath';
import type { Shape } from '../../core/project/model';
import type { Bounds } from '../../core/geometry/engine';

export type EditableRegion = Shape & { sourceId?: string; bounds?: Bounds };
export type Point = { x: number; y: number };
type Curve = Point[];
type Contour = { d: string; curves: Curve[]; bounds: Bounds; area: number };
export const rectFromPoints = (a: Point, b: Point): Bounds => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) });
export const overlaps = (a: Bounds, b: Bounds) => a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
export const encloses = (a: Bounds, b: Bounds) => a.x <= b.x && a.y <= b.y && a.x + a.width >= b.x + b.width && a.y + a.height >= b.y + b.height;
function at(c: Curve, t: number): Point {
  const p = c.map(p => ({ ...p }));
  for (let n = p.length - 1; n > 0; n--) for (let i = 0; i < n; i++) { p[i].x += (p[i + 1].x - p[i].x) * t; p[i].y += (p[i + 1].y - p[i].y) * t; }
  return p[0];
}
function critical(values: number[]) {
  if (values.length === 2) return [];
  if (values.length === 3) { const den = values[0] - 2 * values[1] + values[2]; return den ? [(values[0] - values[1]) / den] : []; }
  const [a, b, c, d] = values, A = -a + 3 * b - 3 * c + d, B = 2 * (a - 2 * b + c), C = b - a;
  if (Math.abs(A) < 1e-14) return Math.abs(B) < 1e-14 ? [] : [-C / B];
  const disc = B * B - 4 * A * C;
  return disc < 0 ? [] : [(-B - Math.sqrt(disc)) / (2 * A), (-B + Math.sqrt(disc)) / (2 * A)];
}
/** Ray crossings of monotonic curve pieces; no polygon approximation of holes. */
function contains(contour: Contour, p: Point) {
  let inside = false;
  for (const c of contour.curves) {
    if (c.length === 2) { const [a, b] = c; if ((a.y > p.y) !== (b.y > p.y) && a.x + (p.y - a.y) * (b.x - a.x) / (b.y - a.y) > p.x) inside = !inside; continue; }
    const ys = c.map(q => q.y);
    if (p.y < Math.min(...ys) || p.y >= Math.max(...ys)) continue;
    const cuts = [0, ...critical(ys).filter(t => t > 0 && t < 1).sort((a, b) => a - b), 1];
    for (let i = 1; i < cuts.length; i++) {
      let lo = cuts[i - 1], hi = cuts[i];
      const a = at(c, lo), b = at(c, hi);
      if ((a.y > p.y) === (b.y > p.y)) continue;
      for (let n = 0; n < 40; n++) { const mid = (lo + hi) / 2; if ((at(c, mid).y > p.y) === (a.y > p.y)) lo = mid; else hi = mid; }
      if (at(c, (lo + hi) / 2).x > p.x) inside = !inside;
    }
  }
  return inside;
}
function contours(d: string): Contour[] {
  const result: Contour[] = []; let commands: string[] = [], curves: Curve[] = [], start: Point = { x: 0, y: 0 };
  const flush = () => {
    if (!curves.length) return;
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, area = 0;
    for (const c of curves) {
      const xs = c.map(p => p.x), ys = c.map(p => p.y);
      for (const t of [0, 1, ...critical(xs).filter(t => t > 0 && t < 1), ...critical(ys).filter(t => t > 0 && t < 1)]) {
        const p = at(c, t); left = Math.min(left, p.x); top = Math.min(top, p.y); right = Math.max(right, p.x); bottom = Math.max(bottom, p.y);
      }
      const derivative = c.slice(1).map((p, i) => ({ x: (p.x - c[i].x) * (c.length - 1), y: (p.y - c[i].y) * (c.length - 1) }));
      for (const [t, w] of [[.1127016653792583, 5 / 18], [.5, 4 / 9], [.8872983346207417, 5 / 18]]) { const p = at(c, t), v = at(derivative, t); area += w * (p.x * v.y - p.y * v.x) / 2; }
    }
    result.push({ d: commands.join(''), curves, area: Math.abs(area), bounds: { x: left, y: top, width: right - left, height: bottom - top } });
    commands = []; curves = [];
  };
  svgpath(d).abs().unshort().unarc().iterate((s, _i, x, y) => {
    const v = s.slice(1) as number[], from = { x, y };
    if (s[0] === 'M') { flush(); start = { x: v[0], y: v[1] }; commands.push(`M${v.join(' ')}`); return; }
    if (s[0] === 'Z') { curves.push([from, start]); commands.push('Z'); flush(); return; }
    const points: Point[] = [from];
    if (s[0] === 'H') points.push({ x: v[0], y });
    else if (s[0] === 'V') points.push({ x, y: v[0] });
    else for (let i = 0; i < v.length; i += 2) points.push({ x: v[i], y: v[i + 1] });
    curves.push(points); commands.push(s[0] === 'H' || s[0] === 'V' ? `L${points[1].x} ${points[1].y}` : `${s[0]}${v.join(' ')}`);
  });
  flush(); return result;
}
export function regionBounds(d: string): Bounds {
  // Fast conservative bounds for already expanded, absolute M/L/Q/C paths.
  const parsed = svgpath(d).abs().unshort().unarc(); let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  const add = (x: number, y: number) => { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); };
  parsed.iterate((s, _i, x, y) => { const v = s.slice(1) as number[]; if (s[0] === 'H') add(v[0], y); else if (s[0] === 'V') add(x, v[0]); else for (let i = 0; i < v.length; i += 2) add(v[i], v[i + 1]); });
  return { x: left, y: top, width: right - left, height: bottom - top };
}
/** Compound SVG paths become selectable outer regions; nested holes stay attached. */
export function editableRegions(shapes: Shape[]): EditableRegion[] {
  return shapes.flatMap(shape => {
    const parts = contours(shape.d).filter(c => c.area > 1e-14).sort((a, b) => b.area - a.area);
    const depth: number[] = [], children = new Map<number, number[]>();
    let right = 1, bottom = 1; for (const p of parts) { right = Math.max(right, p.bounds.x + p.bounds.width); bottom = Math.max(bottom, p.bounds.y + p.bounds.height); }
    const spatial = createRegionIndex(parts.map((p, i) => ({ id: String(i), color: shape.color, d: '', bounds: p.bounds })), right, bottom);
    parts.forEach((part, i) => {
      let parent = -1;
      for (const j of spatial.query(part.bounds)) if (j < i && encloses(parts[j].bounds, part.bounds) && (parent < 0 || parts[j].area < parts[parent].area) && part.curves.slice(0, 4).some(c => contains(parts[j], at(c, .47)))) parent = j;
      depth[i] = parent < 0 ? 0 : depth[parent] + 1;
      if (!children.has(parent)) children.set(parent, []); children.get(parent)!.push(i);
    });
    return parts.flatMap((part, i) => depth[i] % 2 ? [] : [{ id: `${shape.id}:part:${i}`, sourceId: shape.id, color: shape.color, bounds: part.bounds, d: part.d + (children.get(i) ?? []).filter(j => depth[j] % 2).map(j => parts[j].d).join('') }]);
  });
}
export function createRegionIndex(shapes: EditableRegion[], width: number, height: number) {
  const regions = shapes.map(shape => ({ shape, bounds: shape.bounds ?? regionBounds(shape.d) })), buckets = new Map<number, number[]>(), large: number[] = [];
  const cell = (x: number, size: number) => Math.max(0, Math.min(31, Math.floor(x / size * 32)));
  const range = (r: Bounds) => [cell(r.x, width), cell(r.y, height), cell(r.x + r.width, width), cell(r.y + r.height, height)];
  regions.forEach((r, i) => { const [x1, y1, x2, y2] = range(r.bounds); if ((x2 - x1 + 1) * (y2 - y1 + 1) > 64) { large.push(i); return; } for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) { const key = y * 32 + x; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key)!.push(i); } });
  return { regions, query(r: Bounds) { const found = new Set(large), [x1, y1, x2, y2] = range(r); for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) for (const i of buckets.get(y * 32 + x) ?? []) found.add(i); return [...found].filter(i => overlaps(regions[i].bounds, r)).sort((a, b) => b - a); } };
}
