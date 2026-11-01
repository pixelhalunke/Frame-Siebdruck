import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initFont, makeText } from './text';
import { demoSvg } from './demo';
import { initGeometry } from '../../core/geometry/engine';
import { importSvg } from '../../core/svg/import';
import { separateArtwork } from '../../core/separation/separate';
import { newProject, reconcileInks } from '../../core/project/model';
beforeAll(async () => {
  await initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm'));
  await initFont(Uint8Array.from(readFileSync('public/fonts/SpaceGrotesk-Bold.woff')).buffer);
});
it('outlines the bundled font without font references', () => {
  const a = makeText('ÖL & FARBE', '#000000');
  expect(a.sourceSVG).not.toContain('<text'); expect(a.shapes.length).toBeGreaterThan(0); expect(a.width).toBeCloseTo(100);
});
it('imports the real demo and derives three films', () => {
  const a = importSvg(demoSvg());
  const result = separateArtwork(reconcileInks({ ...newProject(), artwork: [a] }));
  expect(result.error).toBeNull(); expect(result.masks).toHaveLength(3);
});
