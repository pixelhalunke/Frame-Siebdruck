import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initGeometry, path, operation } from '../geometry/engine';
import { importSvg } from '../svg/import';
import { newProject, reconcileInks, type Project } from '../project/model';
import { separateArtwork } from './separate';
beforeAll(() => initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm')));
export function fixture(content: string): Project {
  const a = importSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 100 100">${content}</svg>`);
  a.x = 55; a.y = 98.5;
  return reconcileInks({ ...newProject('Test'), artwork: [a] });
}
function contains(d: string, x: number, y: number) {
  const a = path(d, 'evenodd'), b = path(`M${x} ${y}h.1v.1h-.1Z`);
  try { operation(a, b, 'INTERSECT'); return !!a.toSVGString(); } finally { a.delete(); b.delete(); }
}
it('creates three masks from one group', () => {
  const p = fixture('<g><rect width="30" height="50" fill="red"/><rect x="30" width="30" height="50" fill="blue"/><rect x="60" width="30" height="50" fill="green"/></g>');
  expect(separateArtwork(p).masks).toHaveLength(3);
});
it('unifies identical colors from different source groups', () => {
  const p = fixture('<g fill="red"><rect width="10" height="10"/><rect x="20" width="10" height="10"/></g><g fill="#f00"><circle cx="50" cy="50" r="10"/></g><rect x="70" width="10" height="10" fill="blue"/><circle cx="90" cy="90" r="5" fill="blue"/>');
  expect(separateArtwork(p).masks).toHaveLength(2);
});
it('fully hidden shapes create no extra film', () => {
  const p = fixture('<rect width="50" height="50" fill="red"/><rect width="50" height="50" fill="blue"/>');
  expect(separateArtwork(p).masks.map(m => m.ink.color)).toEqual(['#0000ff']);
});
it('removes upper geometry from the lower color', () => {
  const p = fixture('<circle cx="50" cy="50" r="45" fill="yellow"/><path d="M40 20H60V80H40Z" fill="black"/>');
  const masks = separateArtwork(p).masks;
  const yellow = masks.find(m => m.ink.color === '#ffff00')!;
  expect(contains(yellow.d, 105, 148)).toBe(false);
  expect(contains(yellow.d, 80, 148)).toBe(true);
});
it.each(['evenodd', 'nonzero'])('preserves compound holes (%s)', rule => {
  const p = fixture(`<path fill-rule="${rule}" d="M0 0H100V100H0ZM25 25V75H75V25Z"/>`);
  const m = separateArtwork(p).masks[0];
  expect(contains(m.d, 105, 148)).toBe(false); expect(contains(m.d, 60, 103)).toBe(true);
});
it('expands strokes before nonuniform transform and respects knockout', () => {
  const p = fixture('<g transform="translate(20 20) scale(2 1)"><path d="M0 0L20 0" fill="none" stroke="red" stroke-width="10" stroke-linecap="round"/></g><rect x="30" y="15" width="10" height="10" fill="blue"/>');
  const r = separateArtwork(p).masks.find(m => m.ink.color === '#ff0000')!;
  expect(r.bounds.width).toBeCloseTo(60, 2); expect(r.bounds.height).toBeCloseTo(10, 2);
  expect(contains(r.d, 90, 118)).toBe(false);
});
it('merging colors unites visible geometry; disabling does not reveal occluded ink', () => {
  const p = fixture('<rect width="100" height="100" fill="red"/><rect x="25" y="25" width="50" height="50" fill="blue"/>');
  const red = p.mapping['#ff0000'], blue = p.mapping['#0000ff'];
  p.inks.find(i => i.id === blue)!.enabled = false;
  expect(contains(separateArtwork(p).masks.find(m => m.ink.id === red)!.d, 105, 148)).toBe(false);
  p.mapping['#0000ff'] = red;
  const result = separateArtwork(p);
  expect(result.masks).toHaveLength(1); expect(contains(result.masks[0].d, 105, 148)).toBe(true);
});
it('edits transform both bounds and knockout deterministically', () => {
  const p = fixture('<rect width="100" height="100"/>');
  p.artwork[0].width = 250;
  expect(separateArtwork(p).bounds!.width).toBeCloseTo(250, 2);
  expect(separateArtwork(p)).toEqual(separateArtwork(p));
});
