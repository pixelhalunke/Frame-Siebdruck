import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initGeometry, path, operation, serializePath } from '../../core/geometry/engine';
import { importSvg } from '../../core/svg/import';
import { contourArea } from '../../test/helpers/path-area';
import { editableRegions, createRegionIndex, encloses } from './regions';
import { replaceShapes } from './shapes';
import { areaHistory, emptyAreaHistory } from './area-history';
import { imageRegions, importImageSvg } from '../../core/raster/artwork';
import { traceRaster } from '../../core/raster/trace';
import { traceSvg } from '../../core/raster/svg';
import { textureFixture, TEXTURE_OPTIONS } from '../../test/helpers/texture-fixture';
beforeAll(() => initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm')));
function same(a: string, b: string) { for (const [one, two] of [[a, b], [b, a]]) { const p = path(one, 'evenodd'), q = path(two, 'evenodd'); try { operation(p, q, 'DIFFERENCE'); expect(contourArea(serializePath(p))).toBeLessThan(.0001); } finally { p.delete(); q.delete(); } } }
it('splits disjoint compound areas while keeping holes and nested islands intact', () => {
  const item = importSvg('<svg width="200mm" height="100mm" viewBox="0 0 200 100"><path fill-rule="evenodd" d="M0 0H100V100H0ZM20 20H80V80H20ZM30 30H40V40H30ZM120 0H140V20H120Z"/></svg>');
  const regions = editableRegions(item.shapes); expect(regions).toHaveLength(3);
  same(regions.map(s => s.d).join(''), item.shapes.map(s => s.d).join(''));
  const edited = replaceShapes(item, regions.filter(r => r.bounds!.width > 11));
  expect(edited.shapes).toHaveLength(1); expect(edited.sourceSVG.match(/<path/g)).toHaveLength(1);
  same(edited.shapes[0].d, 'M0 0H100V100H0ZM20 20H80V80H20ZM120 0H140V20H120Z');
});
it('preserves curved holes after decomposing and re-saving a single path', () => {
  const item = importSvg('<svg width="140mm" height="100mm" viewBox="0 0 140 100"><path fill-rule="evenodd" d="M10 50a40 40 0 1 0 80 0a40 40 0 1 0 -80 0ZM30 50a20 20 0 1 0 40 0a20 20 0 1 0 -40 0ZM105 15h20v20h-20Z"/></svg>');
  const regions = editableRegions(item.shapes); expect(regions).toHaveLength(2);
  same(item.shapes[0].d, replaceShapes(item, regions).shapes[0].d);
});
it('uses a spatial index to select many texture regions without selecting the entire artwork', () => {
  const item = importImageSvg(traceSvg(traceRaster(textureFixture('speckles'), TEXTURE_OPTIONS), 150), 'Texture-speckles');
  const original = imageRegions(item), index = createRegionIndex(original.shapes, original.width, original.height);
  const box = { x: 400, y: 1000, width: 160, height: 160 };
  const chosen = index.query(box).filter(i => encloses(box, index.regions[i].bounds));
  expect(chosen.length).toBeGreaterThan(8); expect(chosen.length).toBeLessThan(80);
  expect(chosen.every(i => index.regions[i].bounds.height <= box.height)).toBe(true);
  const ids = new Set(chosen.map(i => index.regions[i].shape.id));
  const edited = replaceShapes(item, original.shapes.filter(s => !ids.has(s.id)));
  expect(imageRegions(edited).shapes.length).toBe(original.shapes.length - chosen.length);
});
it('undoes a batch deletion in one step and invalidates redo after a different deletion', () => {
  let state = areaHistory(emptyAreaHistory(), { type: 'remove', ids: ['one', 'two', 'two'] });
  state = areaHistory(state, { type: 'remove', ids: ['two', 'three'] });
  expect([...state.removed]).toEqual(['one', 'two', 'three']);
  state = areaHistory(state, { type: 'undo' }); expect([...state.removed]).toEqual(['one', 'two']);
  state = areaHistory(state, { type: 'undo' }); expect(state.removed.size).toBe(0);
  state = areaHistory(state, { type: 'redo' }); expect([...state.removed]).toEqual(['one', 'two']);
  state = areaHistory(state, { type: 'remove', ids: ['four'] }); expect(state.redo).toHaveLength(0);
});
