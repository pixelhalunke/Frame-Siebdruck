import PathKitInit, { type PathKit, type SkPath } from 'pathkit-wasm';
import wasmUrl from 'pathkit-wasm/bin/pathkit.wasm?url';
import svgpath from 'svgpath';

let engine: PathKit | undefined;
let pending: Promise<void> | undefined;
export function initGeometry(wasmBinary?: Uint8Array) {
  if (!pending) pending = PathKitInit({ locateFile: () => wasmUrl, ...(wasmBinary ? { wasmBinary } : {}) }).then(value => { engine = value; });
  return pending;
}
export function kit(): PathKit {
  if (!engine) throw new Error('Die Vektor-Engine lädt noch. Bitte kurz warten.');
  return engine;
}
export function path(d: string, fillRule = 'nonzero'): SkPath {
  const parsed = svgpath(d);
  if ((parsed as unknown as { err: string }).err) throw new Error(`Der SVG-Pfad ist ungültig (${(parsed as unknown as { err: string }).err}). Exportiere die Grafik erneut als SVG.`);
  const p = kit().FromSVGString(parsed.unarc().toString());
  if (!p) throw new Error('Dieser Vektorpfad konnte nicht gelesen werden.');
  p.setFillType(fillRule === 'evenodd' ? kit().FillType.EVENODD : kit().FillType.WINDING);
  return p;
}
/** Skia simplify returns disjoint even-odd contours. Preserve evenodd in all outputs. */
export function canonical(p: SkPath): string {
  if (!p.simplify()) throw new Error('Die Konturen konnten nicht sicher berechnet werden. Vereinfache die Pfade im Zeichenprogramm.');
  return serializePath(p);
}
/** Preserve full float precision. Skia's default SVG writer keeps only six
 * significant digits, which introduces visible slivers when reparsing masks.
 * Rational stroke conics are converted to cubic Béziers with bounded error.
 */
export function serializePath(p: SkPath): string {
  const n = (v: number) => { if (!Number.isFinite(v)) throw new Error('Ungültige Vektorkoordinaten.'); return String(+v.toFixed(9)); };
  let x = 0, y = 0;
  const result: string[] = [];
  for (const c of p.toCmds()) {
    if (c[0] === 5) { result.push('Z'); continue; }
    if (c[0] !== 3) {
      result.push(`${['M', 'L', 'Q', '', 'C'][c[0]]}${c.slice(1).map(n).join(' ')}`);
      x = c[c.length - 2]; y = c[c.length - 1]; continue;
    }
    const [ax, ay, bx, by, cx, cy, w] = [x, y, ...c.slice(1)];
    const point = (t: number) => {
      const s = 1 - t, den = s * s + 2 * w * s * t + t * t, dd = -2 * s + 2 * w * (1 - 2 * t) + 2 * t;
      const dim = (a: number, b: number, end: number) => {
        const num = s * s * a + 2 * w * s * t * b + t * t * end;
        const derivative = -2 * s * a + 2 * w * (1 - 2 * t) * b + 2 * t * end;
        return [num / den, (derivative * den - num * dd) / (den * den)];
      };
      const px = dim(ax, bx, cx), py = dim(ay, by, cy);
      return { x: px[0], y: py[0], dx: px[1], dy: py[1] };
    };
    const segment = (start: number, end: number, depth: number) => {
      const a = point(start), b = point(end), dt = (end - start) / 3;
      const c1 = { x: a.x + a.dx * dt, y: a.y + a.dy * dt }, c2 = { x: b.x - b.dx * dt, y: b.y - b.dy * dt };
      const error = Math.max(...[.25, .5, .75].map(t => {
        const s = 1 - t, exact = point(start + (end - start) * t);
        return Math.hypot(s ** 3 * a.x + 3 * s * s * t * c1.x + 3 * s * t * t * c2.x + t ** 3 * b.x - exact.x, s ** 3 * a.y + 3 * s * s * t * c1.y + 3 * s * t * t * c2.y + t ** 3 * b.y - exact.y);
      }));
      if (error > .000001) {
        if (depth >= 16) throw new Error('Die Kontur ist zu komplex für eine sichere Kurvenumwandlung.');
        segment(start, (start + end) / 2, depth + 1); segment((start + end) / 2, end, depth + 1);
      } else result.push(`C${[c1.x, c1.y, c2.x, c2.y, b.x, b.y].map(n).join(' ')}`);
    };
    segment(0, 1, 0); x = cx; y = cy;
  }
  return result.join('');
}
export function operation(a: SkPath, b: SkPath, op: 'UNION' | 'DIFFERENCE' | 'INTERSECT') {
  if (!a.op(b, kit().PathOp[op])) throw new Error('Die Farbflächen konnten nicht sicher getrennt werden. Vereinfache die Pfade im Zeichenprogramm.');
  return a;
}
export type Bounds = { x: number; y: number; width: number; height: number };
export function boundsOf(d: string): Bounds {
  const p = path(d);
  try {
    const b = p.computeTightBounds();
    return { x: b.fLeft, y: b.fTop, width: b.fRight - b.fLeft, height: b.fBottom - b.fTop };
  } finally { p.delete(); }
}
export function transformPath(d: string, transform: string) {
  return svgpath(d).transform(transform).unarc().toString();
}
