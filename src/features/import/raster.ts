import { MAX_TRACE_EDGE, MAX_TRACE_PIXELS, type RasterPixels, type TraceOptions, type TraceResult } from '../../core/raster/types';
export type RasterSource = { name: string; originalWidth: number; originalHeight: number; pixels: RasterPixels; url: string; background: string; suggestRemoval: boolean; suggestTexture: boolean; reduced: boolean };
export const MAX_IMAGE_BYTES = 25_000_000;
export function isRasterFile(file: Pick<File, 'name' | 'type'>) { return file.type !== 'image/svg+xml' && !/\.svg$/i.test(file.name) && (file.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif|bmp|ico|heic|heif|tiff?)$/i.test(file.name)); }
/** Check common compressed-image dimensions before asking the browser to allocate a bitmap. */
export function rasterHeaderSize(bytes: Uint8Array): { width: number; height: number } | null {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && data.getUint32(0) === 0x89504e47 && data.getUint32(4) === 0x0d0a1a0a) return { width: data.getUint32(16), height: data.getUint32(20) };
  if (bytes.length >= 10 && bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70) return { width: data.getUint16(6, true), height: data.getUint16(8, true) };
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) return null;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) return null;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return null;
      const length = data.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) return { width: data.getUint16(offset + 5), height: data.getUint16(offset + 3) };
      offset += length;
    }
  }
  return null;
}
export function imageSize(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 50_000_000) throw new Error('Das Bild ist zu groß oder hat ungültige Maße. Verwende höchstens 50 Megapixel.');
  const scale = Math.min(1, MAX_TRACE_EDGE / width, MAX_TRACE_EDGE / height, Math.sqrt(MAX_TRACE_PIXELS / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}
function edgeColor({ width, height, data }: RasterPixels) {
  const bins = new Map<string, number>();
  const add = (p: number) => { if (data[p * 4 + 3] < 128) return; const color = `#${[0, 1, 2].map(c => (Math.round(data[p * 4 + c] / 17) * 17).toString(16).padStart(2, '0')).join('')}`; bins.set(color, (bins.get(color) ?? 0) + 1); };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { add(y * width); add(y * width + width - 1); }
  const sorted = [...bins].sort((a, b) => b[1] - a[1]), total = [...bins.values()].reduce((sum, n) => sum + n, 0);
  return { color: sorted[0]?.[0] ?? '#ffffff', confidence: total ? sorted[0][1] / total : 0 };
}
/** Frequent hard edges indicate existing halftone/splatter that smoothing would erase. */
export function hasFineTexture({ width, height, data }: RasterPixels) {
  let edges = 0;
  for (let y = 0; y < height; y++) for (let x = 1; x < width; x++) {
    const p = (y * width + x) * 4;
    if (data[p + 3] >= 128 && data[p - 1] >= 128 && Math.abs(data[p] - data[p - 4]) + Math.abs(data[p + 1] - data[p - 3]) + Math.abs(data[p + 2] - data[p - 2]) > 180) edges++;
  }
  return edges / (width * height) > .025;
}
export async function decodeRaster(file: File): Promise<RasterSource> {
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error('Die Bilddatei ist leer oder größer als 25 MB. Verwende eine kleinere JPEG-, PNG- oder WebP-Datei.');
  const bytes = new Uint8Array(await file.slice(0, 65536).arrayBuffer()), header = rasterHeaderSize(bytes);
  if (header) imageSize(header.width, header.height);
  // SVGs always use the validating vector importer, even with a misleading extension.
  if (!header && /<svg[\s>]|<!DOCTYPE|<\?xml/i.test(new TextDecoder().decode(bytes.subarray(0, 1024)))) throw new Error('Diese Datei enthält SVG-Code. Öffne sie mit der Dateiendung .svg.');
  const url = URL.createObjectURL(file);
  let bitmap: ImageBitmap | undefined;
  try {
    let image: CanvasImageSource, width: number, height: number;
    try { bitmap = await createImageBitmap(file); image = bitmap; width = bitmap.width; height = bitmap.height; }
    catch {
      const fallback = new Image(); fallback.src = url;
      try { await fallback.decode(); } catch { throw new Error('Dein Browser kann dieses Bildformat nicht lesen oder die Datei ist beschädigt. Speichere es als PNG, JPEG oder WebP und öffne es erneut.'); }
      image = fallback; width = fallback.naturalWidth; height = fallback.naturalHeight;
    }
    const size = imageSize(width, height), canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Die Bildverarbeitung ist in diesem Browser nicht verfügbar. Öffne FRAME in einem aktuellen Browser.');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(image, 0, 0, size.width, size.height);
    const pixels = { ...size, data: ctx.getImageData(0, 0, size.width, size.height).data };
    const edge = edgeColor(pixels);
    let transparent = 0; for (let i = 3; i < pixels.data.length; i += 4) if (pixels.data[i] < 128) transparent++;
    return { name: file.name.slice(0, 200), originalWidth: width, originalHeight: height, pixels, url, background: edge.color, suggestTexture: hasFineTexture(pixels), suggestRemoval: transparent < pixels.width * pixels.height * .01 && edge.confidence > .6, reduced: width !== size.width || height !== size.height };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
  finally { bitmap?.close(); }
}

export function runTrace(pixels: RasterPixels, options: TraceOptions, signal: AbortSignal): Promise<TraceResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Abgebrochen', 'AbortError')); return; }
    const worker = new Worker(new URL('./trace.worker.ts', import.meta.url), { type: 'module' });
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); worker.terminate(); };
    const abort = () => { done(); reject(new DOMException('Abgebrochen', 'AbortError')); };
    const timer = setTimeout(() => { done(); reject(new Error('Die Vektorisierung dauert zu lange. Wähle weniger Farben oder ein kleineres Bild.')); }, 30000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = (e: MessageEvent<{ result?: TraceResult; error?: string }>) => { done(); if (e.data.result) resolve(e.data.result); else reject(new Error(e.data.error ?? 'Die Vektorisierung ist fehlgeschlagen.')); };
    worker.onerror = () => { done(); reject(new Error('Die Bildverarbeitung konnte nicht starten. Lade die Seite neu oder öffne FRAME in einem aktuellen Browser.')); };
    try { worker.postMessage({ pixels, options }); }
    catch { done(); reject(new Error('Die Bilddaten konnten nicht verarbeitet werden. Öffne ein kleineres Bild.')); }
  });
}
