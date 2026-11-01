import { traceRaster } from '../../core/raster/trace';
import type { RasterPixels, TraceOptions } from '../../core/raster/types';
self.onmessage = (e: MessageEvent<{ pixels: RasterPixels; options: TraceOptions }>) => {
  try { self.postMessage({ result: traceRaster(e.data.pixels, e.data.options) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Das Bild konnte nicht vektorisiert werden. Probiere weniger Farben.' }); }
};
