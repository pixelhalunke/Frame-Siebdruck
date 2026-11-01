import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_TRACE, type TraceResult } from '../../core/raster/types';
import { imageSize, rasterHeaderSize, runTrace } from './raster';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const pixels = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: { result: TraceResult } }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn(); postMessage = vi.fn();
  constructor() { FakeWorker.instances.push(this); }
}
it('terminates canceled tracing and does not start work for an already closed dialog', async () => {
  FakeWorker.instances = []; vi.stubGlobal('Worker', FakeWorker);
  const controller = new AbortController(), task = runTrace(pixels, DEFAULT_TRACE, controller.signal);
  const rejected = expect(task).rejects.toMatchObject({ name: 'AbortError' }); controller.abort(); await rejected;
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  await expect(runTrace(pixels, DEFAULT_TRACE, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(FakeWorker.instances).toHaveLength(1);
});
it('terminates unresponsive jobs and reports how to recover', async () => {
  FakeWorker.instances = []; vi.stubGlobal('Worker', FakeWorker); vi.useFakeTimers();
  const task = runTrace(pixels, DEFAULT_TRACE, new AbortController().signal), rejected = expect(task).rejects.toThrow('weniger Farben');
  vi.advanceTimersByTime(30000); await rejected;
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
});
it('returns finished paths and disposes the worker on success or error', async () => {
  FakeWorker.instances = []; vi.stubGlobal('Worker', FakeWorker);
  const result: TraceResult = { width: 2, height: 2, shapes: [], palette: [], transparentPixels: 4, removedSpeckles: 0 };
  const task = runTrace(pixels, DEFAULT_TRACE, new AbortController().signal);
  FakeWorker.instances[0].onmessage!({ data: { result } });
  await expect(task).resolves.toEqual(result); expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  const bad = runTrace(pixels, DEFAULT_TRACE, new AbortController().signal), rejected = expect(bad).rejects.toThrow('aktuellen Browser');
  FakeWorker.instances[1].onerror!(); await rejected; expect(FakeWorker.instances[1].terminate).toHaveBeenCalledOnce();
});
it('reads real JPEG/PNG dimensions before decoding and rejects oversized compressed headers', () => {
  for (const name of ['FRAME-Bildimport.jpg', 'FRAME-Bildimport.png']) expect(rasterHeaderSize(readFileSync(`examples/images/${name}`).subarray(0, 65536))).toEqual({ width: 900, height: 1100 });
  const png = Uint8Array.from(readFileSync('examples/images/FRAME-Bildimport.png').subarray(0, 24));
  const view = new DataView(png.buffer); view.setUint32(16, 100000); view.setUint32(20, 100000);
  const size = rasterHeaderSize(png)!; expect(() => imageSize(size.width, size.height)).toThrow('Megapixel');
  expect(rasterHeaderSize(new Uint8Array([255, 216, 255, 224, 255]))).toBeNull();
});
