export type RasterPixels = { width: number; height: number; data: Uint8ClampedArray };
export type TraceOptions = {
  colors: number;
  background: 'keep' | 'remove';
  backgroundColor: string;
  backgroundTolerance: number;
  detail: 'fine' | 'balanced' | 'smooth';
  minArea: number;
  preserveTexture?: boolean;
};
export type TraceShape = { id: string; d: string; color: string };
export type TraceResult = {
  width: number; height: number; shapes: TraceShape[];
  palette: { color: string; pixels: number }[];
  removedSpeckles: number; transparentPixels: number;
  preserveTexture?: boolean;
};
export const DEFAULT_TRACE: TraceOptions = { colors: 4, background: 'remove', backgroundColor: '#ffffff', backgroundTolerance: 8, detail: 'balanced', minArea: 12 };
export const MAX_TRACE_PIXELS = 4_000_000;
export const MAX_TRACE_EDGE = 2400;
export const MAX_TRACE_SHAPES = 50_000;
export const MAX_IMAGE_SVG_CHARS = 16_000_000;
