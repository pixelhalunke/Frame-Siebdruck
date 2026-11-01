declare module 'pathkit-wasm' {
  export interface SkPath {
    copy(): SkPath;
    delete(): void;
    toSVGString(): string;
    toCmds(): number[][];
    getFillTypeString(): string;
    setFillType(type: unknown): void;
    simplify(): SkPath | null;
    op(other: SkPath, op: unknown): SkPath | null;
    stroke(options: { width: number; cap: unknown; join: unknown; miter_limit: number }): SkPath | null;
    transform(matrix: number[]): SkPath;
    computeTightBounds(): { fLeft: number; fTop: number; fRight: number; fBottom: number };
  }
  export interface PathKit {
    NewPath(): SkPath;
    FromSVGString(d: string): SkPath | null;
    PathOp: Record<'UNION' | 'DIFFERENCE' | 'INTERSECT', unknown>;
    FillType: Record<'WINDING' | 'EVENODD', unknown>;
    StrokeCap: Record<'BUTT' | 'ROUND' | 'SQUARE', unknown>;
    StrokeJoin: Record<'MITER' | 'ROUND' | 'BEVEL', unknown>;
  }
  export default function init(options: { locateFile?: (file: string) => string; wasmBinary?: Uint8Array }): Promise<PathKit>;
}
