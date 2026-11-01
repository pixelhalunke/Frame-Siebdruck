import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initGeometry, boundsOf } from '../geometry/engine';
import { importSvg } from './import';
import { readClipboard } from '../../features/import/clipboard';
beforeAll(() => initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm')));
export const svg = (content: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 100 100">${content}</svg>`;
it('reads physical SVG dimensions and normalizes a simple rectangle', () => {
  const a = importSvg(svg('<rect width="100" height="100" fill="red"/>'));
  expect(a.width).toBeCloseTo(100); expect(a.shapes[0].color).toBe('#ff0000');
  expect(boundsOf(a.shapes[0].d).width).toBeCloseTo(100);
});
it.each(['<script>alert(1)</script>', '<foreignObject/>', '<image href="https://test.invalid/x"/>', '<rect width="10" height="10" onload="alert(1)"/>', '<rect width="10" height="10" filter="url(#blur)"/>', '<linearGradient/>', '<rect opacity=".5" width="10" height="10"/>', '<text>Outline me</text>', '<style>rect{fill:red}</style>', '<use href="#x"/>'])('rejects unsafe or unsupported input: %s', content => {
  expect(() => importSvg(svg(content))).toThrow();
});
it('rejects malformed paths and XML entities', () => {
  expect(() => importSvg(svg('<path d="M0 0 Lx y"/>'))).toThrow();
  expect(() => importSvg('<!DOCTYPE svg><svg/>')).toThrow();
});
it('normalizes inherited styles and nested transforms', () => {
  const a = importSvg(svg('<g style="fill:rgb(255,0,0)" transform="translate(10 20)"><g transform="scale(2)"><rect width="10" height="10"/></g></g>'));
  expect(boundsOf(a.shapes[0].d)).toEqual({ x: 10, y: 20, width: 20, height: 20 });
});
it('prioritizes SVG clipboard data over plain text', async () => {
  const data = { getData: (t: string) => t === 'image/svg+xml' ? svg('<circle r="10"/>') : 'text', files: [], items: [] } as unknown as DataTransfer;
  expect(await readClipboard(data)).toContain('<circle');
});
it('reads raster clipboard content as a file for the vectorization dialog', async () => {
  const file = new File(['pixels'], 'clipboard.png', { type: 'image/png' });
  const data = { getData: () => '', files: [], items: [{ type: 'image/png', getAsFile: () => file }] } as unknown as DataTransfer;
  expect(await readClipboard(data)).toBe(file);
});
