import { afterEach, expect, it, vi } from 'vitest';
import { newProject } from '../../core/project/model';
import { importSvg } from '../../core/svg/import';
import { initGeometry } from '../../core/geometry/engine';
import { readFileSync } from 'node:fs';
import { SeparationQueue, type GeometryReply, type GeometryJob } from './queue';
import { sameArtworkGeometry } from './useSeparation';
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((event: { data: GeometryReply }) => void) | null = null; onerror: (() => void) | null = null;
  postMessage = vi.fn(); terminate = vi.fn();
  constructor() { FakeWorker.all.push(this); }
}
const job = (id: string): GeometryJob => ({ id, revision: 1, project: newProject() });
const reply = (id: string): GeometryReply => ({ id, elapsedMs: 10, separation: { masks: [], bounds: null, error: null }, preflight: { films: [], bounds: null, errors: [], warnings: [] } });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); FakeWorker.all = []; });
it('coalesces rapid edits and never enables an obsolete set of films', () => {
  vi.stubGlobal('Worker', FakeWorker); const receive = vi.fn(), queue = new SeparationQueue(receive);
  queue.submit(job('a')); queue.submit(job('b')); queue.submit(job('c'));
  const worker = FakeWorker.all[0]; expect(worker.postMessage).toHaveBeenCalledTimes(1);
  worker.onmessage!({ data: reply('a') }); expect(receive).not.toHaveBeenCalled();
  expect(worker.postMessage.mock.calls[1][0].id).toBe('c');
  worker.onmessage!({ data: reply('c') }); expect(receive).toHaveBeenCalledOnce(); expect(receive.mock.calls[0][0].id).toBe('c');
  queue.dispose(); expect(worker.terminate).toHaveBeenCalledOnce();
});
it('reports worker startup failures and cancels hung calculations', () => {
  vi.stubGlobal('Worker', class { constructor() { throw new Error('No worker'); } });
  const receive = vi.fn(), queue = new SeparationQueue(receive); queue.submit(job('bad'));
  expect(receive.mock.calls[0][1]).toBeInstanceOf(Error);
  vi.stubGlobal('Worker', FakeWorker); vi.useFakeTimers(); queue.submit(job('slow')); vi.advanceTimersByTime(30000);
  expect(FakeWorker.all[0].terminate).toHaveBeenCalledOnce(); expect(receive.mock.calls[1][1].message).toContain('dauert zu lange'); queue.dispose();
});
it('does not recalculate geometry for names or text metadata, but detects movement and edited paths', async () => {
  await initGeometry(readFileSync('node_modules/pathkit-wasm/bin/pathkit.wasm'));
  const a = importSvg('<svg width="10mm" height="10mm"><rect width="10" height="10"/></svg>');
  expect(sameArtworkGeometry([a], [{ ...a, name: 'new', text: 'A', fontId: 'font' }])).toBe(true);
  expect(sameArtworkGeometry([a], [{ ...a, x: a.x + 1 }])).toBe(false);
  expect(sameArtworkGeometry([a], [{ ...a, shapes: [...a.shapes] }])).toBe(false);
});
