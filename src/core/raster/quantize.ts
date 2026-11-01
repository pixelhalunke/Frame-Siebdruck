import { MAX_TRACE_EDGE, MAX_TRACE_PIXELS, type RasterPixels, type TraceOptions } from './types';

type Sample = { r: number; g: number; b: number; count: number; lab: number[] };
const linear = Array.from({ length: 256 }, (_, c) => { const v = c / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
function oklab(r: number, g: number, b: number) {
  const R = linear[Math.round(r)], G = linear[Math.round(g)], B = linear[Math.round(b)];
  const l = Math.cbrt(.4122214708 * R + .5363325363 * G + .0514459929 * B);
  const m = Math.cbrt(.2119034982 * R + .6806995451 * G + .1073969566 * B);
  const s = Math.cbrt(.0883024619 * R + .2817188376 * G + .6299787005 * B);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
const distance = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const hex = (s: { r: number; g: number; b: number }) => `#${[s.r, s.g, s.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

export function validateTrace(pixels: RasterPixels, options: TraceOptions) {
  const { width, height, data } = pixels;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_TRACE_EDGE || height > MAX_TRACE_EDGE || width * height > MAX_TRACE_PIXELS || data.length !== width * height * 4) throw new Error('Die Bilddaten sind ungültig oder zu groß. Öffne das Bild erneut.');
  if (!Number.isInteger(options.colors) || options.colors < 1 || options.colors > 8 || !['keep', 'remove'].includes(options.background) || !/^#[\da-f]{6}$/i.test(options.backgroundColor) || !Number.isFinite(options.backgroundTolerance) || options.backgroundTolerance < 0 || options.backgroundTolerance > 100 || !['fine', 'balanced', 'smooth'].includes(options.detail) || !Number.isInteger(options.minArea) || options.minArea < 0 || options.minArea > 100) throw new Error('Die Einstellungen für die Vektorisierung sind ungültig.');
}

/** Deterministic, weighted OKLab clustering. Transparent pixels never consume a printing ink. */
export function quantize(pixels: RasterPixels, options: TraceOptions) {
  validateTrace(pixels, options);
  const count = pixels.width * pixels.height, labels = new Int16Array(count).fill(-1), bins = new Map<number, Sample>();
  const keys = new Int32Array(count).fill(-1), bg = [1, 3, 5].map(i => parseInt(options.backgroundColor.slice(i, i + 2), 16));
  const tolerance = (options.backgroundTolerance / 100 * Math.sqrt(3 * 255 ** 2)) ** 2;
  // Existing screenprint art needs its saturated accent, even if gray edge
  // pixels are more frequent. Reduce luminance dominance in texture mode.
  const metric = options.preserveTexture ? (a: number[], b: number[]) => .25 * (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 : distance;
  const paper = options.background === 'remove' ? oklab(bg[0], bg[1], bg[2]) : null;
  for (let i = 0; i < count; i++) {
    const r = pixels.data[i * 4], g = pixels.data[i * 4 + 1], b = pixels.data[i * 4 + 2], a = pixels.data[i * 4 + 3];
    if (a < 128 || (options.background === 'remove' && (r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2 <= tolerance)) continue;
    const key = (r >> 3) * 1024 + (g >> 3) * 32 + (b >> 3); keys[i] = key;
    const bin = bins.get(key);
    if (bin) { bin.r += r; bin.g += g; bin.b += b; bin.count++; }
    else bins.set(key, { r, g, b, count: 1, lab: [] });
  }
  const samples = [...bins.entries()].sort((a, b) => b[1].count - a[1].count || a[0] - b[0]);
  if (!samples.length) throw new Error('Nach dem Entfernen des Hintergrunds bleibt keine Fläche übrig. Behalte den Hintergrund oder verringere die Toleranz.');
  for (const [, sample] of samples) { sample.r /= sample.count; sample.g /= sample.count; sample.b /= sample.count; sample.lab = oklab(sample.r, sample.g, sample.b); }
  const centers: Sample[] = [{ ...samples[0][1] }];
  while (centers.length < Math.min(options.colors, samples.length)) {
    let best: Sample | undefined, bestScore = 0;
    for (const [, sample] of samples) {
      const score = Math.min(paper ? metric(sample.lab, paper) : Infinity, ...centers.map(c => metric(sample.lab, c.lab))) * Math.sqrt(sample.count);
      if (score > bestScore) { best = sample; bestScore = score; }
    }
    if (!best || bestScore < 1e-10) break;
    centers.push({ ...best });
  }
  const assignments = new Map<number, number>();
  for (let iteration = 0; iteration < 12; iteration++) {
    const sums = centers.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
    let changed = false;
    for (const [key, sample] of samples) {
      // Antialiased ink/paper transitions may still belong to the paper. Without
      // a fixed paper center, every remaining gray edge is forced into an ink.
      let nearest = paper ? -1 : 0, score = paper ? metric(sample.lab, paper) : Infinity;
      centers.forEach((c, index) => { const d = metric(sample.lab, c.lab); if (d < score) { score = d; nearest = index; } });
      if (assignments.get(key) !== nearest) changed = true;
      assignments.set(key, nearest);
      if (nearest < 0) continue;
      const sum = sums[nearest]; sum.r += sample.r * sample.count; sum.g += sample.g * sample.count; sum.b += sample.b * sample.count; sum.count += sample.count;
    }
    sums.forEach((sum, index) => { if (sum.count) { const r = sum.r / sum.count, g = sum.g / sum.count, b = sum.b / sum.count; centers[index] = { r, g, b, count: sum.count, lab: oklab(r, g, b) }; } });
    if (!changed) break;
  }
  if (options.preserveTexture) {
    // Choose the dominant solid ink, not an average diluted by paper-edge pixels.
    centers.forEach((_, index) => {
      const dominant = samples.find(([key]) => assignments.get(key) === index);
      if (dominant) centers[index] = { ...dominant[1] };
    });
  }
  // Deduplicate rounded centers so the requested maximum is also the actual ink maximum.
  const colors: string[] = [], remap = centers.map(c => { const color = hex(c); let index = colors.indexOf(color); if (index < 0) { index = colors.length; colors.push(color); } return index; });
  for (let i = 0; i < count; i++) if (keys[i] !== -1) { const assigned = assignments.get(keys[i])!; if (assigned >= 0) labels[i] = remap[assigned]; }
  return { labels, colors };
}

/** Remove small connected color islands by replacing them with their surrounding color.
 * Decisions use the original labels, so iteration order cannot change the result.
 * Transparent holes are intentionally preserved.
 */
export function cleanIslands(labels: Int16Array, width: number, height: number, minArea: number, colors: number) {
  if (minArea <= 1) return 0;
  const seen = new Uint8Array(labels.length), queue = new Int32Array(labels.length), edits = new Int16Array(labels.length).fill(-2);
  let removed = 0;
  for (let start = 0; start < labels.length; start++) {
    if (seen[start] || labels[start] < 0) continue;
    let head = 0, tail = 1; queue[0] = start; seen[start] = 1;
    const color = labels[start], neighbors = new Uint32Array(colors + 1);
    while (head < tail) {
      const p = queue[head++], x = p % width, y = Math.floor(p / width);
      for (const q of [x ? p - 1 : -1, x + 1 < width ? p + 1 : -1, y ? p - width : -1, y + 1 < height ? p + width : -1]) {
        if (q === -1) { neighbors[colors]++; continue; }
        if (labels[q] === color) { if (!seen[q]) { seen[q] = 1; queue[tail++] = q; } }
        else neighbors[labels[q] < 0 ? colors : labels[q]]++;
      }
    }
    if (tail < minArea) {
      let replacement = colors; for (let i = 0; i < neighbors.length; i++) if (neighbors[i] > neighbors[replacement]) replacement = i;
      for (let i = 0; i < tail; i++) edits[queue[i]] = replacement === colors ? -1 : replacement;
      removed++;
    }
  }
  for (let i = 0; i < labels.length; i++) if (edits[i] !== -2) labels[i] = edits[i];
  return removed;
}
