import svgpath from 'svgpath';
/** Analytic polynomial integration (3-point Gauss-Legendre is exact through
 * degree 5). Sum absolute contour areas: an upper bound even when holes exist.
 */
export function contourArea(d: string) {
  let area = 0, total = 0, startX = 0, startY = 0, lastX = 0, lastY = 0;
  const line = (x: number, y: number, a: number, b: number) => (x * b - a * y) / 2;
  svgpath(d).abs().unshort().unarc().iterate((s, _index, x, y) => {
    const v = s.slice(1) as number[];
    if (s[0] === 'M') { total += Math.abs(area + line(lastX, lastY, startX, startY)); area = 0; startX = lastX = v[0]; startY = lastY = v[1]; return; }
    if (s[0] === 'Z') { area += line(x, y, startX, startY); lastX = startX; lastY = startY; return; }
    if (s[0] === 'L' || s[0] === 'H' || s[0] === 'V') {
      lastX = s[0] === 'V' ? x : v[0]; lastY = s[0] === 'H' ? y : s[0] === 'V' ? v[0] : v[1];
      area += line(x, y, lastX, lastY); return;
    }
    const cubic = s[0] === 'C';
    const points = cubic ? [[x, y], [v[0], v[1]], [v[2], v[3]], [v[4], v[5]]] : [[x, y], [v[0], v[1]], [v[2], v[3]]];
    const evaluate = (t: number, axis: number) => {
      const a = points.map(p => p[axis]), u = 1 - t;
      return cubic ? [u ** 3 * a[0] + 3 * u * u * t * a[1] + 3 * u * t * t * a[2] + t ** 3 * a[3], 3 * u * u * (a[1] - a[0]) + 6 * u * t * (a[2] - a[1]) + 3 * t * t * (a[3] - a[2])] : [u * u * a[0] + 2 * u * t * a[1] + t * t * a[2], 2 * u * (a[1] - a[0]) + 2 * t * (a[2] - a[1])];
    };
    for (const [t, weight] of [[(1 - Math.sqrt(3 / 5)) / 2, 5 / 18], [.5, 4 / 9], [(1 + Math.sqrt(3 / 5)) / 2, 5 / 18]]) {
      const a = evaluate(t, 0), b = evaluate(t, 1); area += weight * (a[0] * b[1] - b[0] * a[1]) / 2;
    }
    [lastX, lastY] = points.at(-1)!;
  });
  return total + Math.abs(area + line(lastX, lastY, startX, startY));
}
