declare module 'imagetracerjs' {
  type Segment = { type: 'L' | 'Q'; x1: number; y1: number; x2: number; y2: number; x3?: number; y3?: number };
  export type TracedPath = { segments: Segment[]; holechildren: number[]; isholepath: boolean };
  export type PixelPath = { points: { x: number; y: number }[]; holechildren: number[]; isholepath: boolean };
  const tracer: {
    layeringstep(image: { array: number[][] }, color: number): number[][];
    pathscan(layer: number[][], pathomit: number): PixelPath[];
    internodes(paths: unknown[], options: { rightangleenhance: boolean }): unknown[];
    batchtracepaths(paths: unknown[], lineTolerance: number, curveTolerance: number): TracedPath[];
  };
  export default tracer;
}
