import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initGeometry, path, operation, canonical, boundsOf } from './engine';
import { PDFDocument, rgb } from 'pdf-lib';

beforeAll(() => initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm')));
describe('Phase 0: library risk spikes', () => {
  it('creates a true knockout hole with explicit evenodd geometry', () => {
    const outer = path('M0 0H100V100H0Z');
    const inner = path('M25 25H75V75H25Z');
    operation(outer, inner, 'DIFFERENCE');
    const d = canonical(outer);
    expect(d.match(/M/g)?.length).toBe(2);
    operation(outer, inner, 'INTERSECT');
    expect(outer.toSVGString()).toBe('');
    expect(boundsOf(d)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    outer.delete(); inner.delete();
  });
  it('writes exact A4 dimensions and vector path operators without bitmap content', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([210 * 72 / 25.4, 297 * 72 / 25.4]);
    page.drawSvgPath('M0 0H100V100H0Z', { x: 10 * 72 / 25.4, y: 287 * 72 / 25.4, scale: 72 / 25.4, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: 15, y: 15 }, end: { x: 25, y: 15 }, thickness: 0.5 });
    const bytes = await pdf.save({ useObjectStreams: false });
    const reopened = await PDFDocument.load(bytes);
    expect(reopened.getPages()[0].getWidth()).toBeCloseTo(595.27559, 4);
    expect(reopened.getPages()[0].getHeight()).toBeCloseTo(841.88976, 4);
    expect(new TextDecoder().decode(bytes)).not.toContain('/Subtype /Image');
  });
});
