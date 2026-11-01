import { memo, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Trash2, MousePointer2, Minus, Plus, Maximize, Hand, Undo2, Redo2, Scan, SquareDashedMousePointer } from 'lucide-react';
import { inkName } from '../core/project/model';
import { createRegionIndex, encloses, rectFromPoints, type EditableRegion, type Point } from '../features/editor/regions';
import type { Bounds } from '../core/geometry/engine';
import { isEditable } from '../features/import/clipboard';
import { Button } from './ui/button';

const BasePaths = memo(function BasePaths({ groups, width, height }: { groups: { color: string; d: string }[]; width: number; height: number }) {
  return <svg className="area-base" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">{groups.map((s, i) => <path key={i} d={s.d} fill={s.color} fillRule="evenodd"/>)}</svg>;
});
type Gesture = { type: 'select' | 'pan'; start: Point; screen: Point; scroll: Point; add: boolean; subtract: boolean };
export function VectorShapeEditor({ width, height, shapes, onRemove, onUndo, onRedo, canUndo = false, canRedo = false, compact = false, disjoint = false, label = 'Vektorisierte Vorschau', children }: { width: number; height: number; shapes: EditableRegion[]; onRemove: (ids: string[]) => void; onUndo?: () => void; onRedo?: () => void; canUndo?: boolean; canRedo?: boolean; compact?: boolean; disjoint?: boolean; label?: string; children?: React.ReactNode }) {
  const [selection, setSelection] = useState<Set<string>>(new Set()), [zoom, setZoom] = useState(1), [tool, setTool] = useState<'select' | 'pan'>('select'), [adding, setAdding] = useState(false);
  const [frame, setFrame] = useState<Bounds | null>(null), [keyboardFrame, setKeyboardFrame] = useState(false), [color, setColor] = useState(''), [space, setSpace] = useState(false);
  const context = useRef<CanvasRenderingContext2D | null>(null), viewport = useRef<HTMLDivElement>(null), overlay = useRef<SVGSVGElement>(null);
  const previousZoom = useRef(1), gesture = useRef<Gesture | null>(null), animation = useRef(0), pendingFrame = useRef<Bounds | null>(null), hintId = useId();
  const paths = useRef(new Map<string, Path2D>());
  const index = useMemo(() => createRegionIndex(shapes, width, height), [shapes, width, height]);
  const selected = useMemo(() => shapes.filter(s => selection.has(s.id)), [shapes, selection]);
  const colors = useMemo(() => [...new Set(shapes.map(s => s.color))], [shapes]);
  const pack = (items: EditableRegion[]) => {
    const groups: { color: string; id: string; paths: string[] }[] = [];
    for (const s of items) { const id = s.sourceId ?? (disjoint ? s.color : s.id); if (groups.at(-1)?.id !== id) groups.push({ color: s.color, id, paths: [] }); groups.at(-1)!.paths.push(s.d); }
    return groups.map(g => ({ color: g.color, d: g.paths.join('') }));
  };
  const groups = useMemo(() => pack(shapes), [shapes, disjoint]);
  const highlights = useMemo(() => pack(selected), [selected, disjoint]);
  useLayoutEffect(() => { paths.current.clear(); setSelection(old => { const ids = new Set(shapes.map(s => s.id)), kept = [...old].filter(id => ids.has(id)); return kept.length === old.size ? old : new Set(kept); }); }, [shapes]);
  useLayoutEffect(() => {
    const el = viewport.current;
    if (el) { const ratio = zoom / previousZoom.current; el.scrollLeft = (el.scrollLeft + el.clientWidth / 2) * ratio - el.clientWidth / 2; el.scrollTop = (el.scrollTop + el.clientHeight / 2) * ratio - el.clientHeight / 2; }
    previousZoom.current = zoom;
  }, [zoom]);
  useLayoutEffect(() => () => cancelAnimationFrame(animation.current), []);
  const point = (x: number, y: number): Point => {
    const matrix = overlay.current?.getScreenCTM();
    const p = matrix ? new DOMPoint(x, y).matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
    return { x: Math.max(0, Math.min(width, p.x)), y: Math.max(0, Math.min(height, p.y)) };
  };
  const available = (s: EditableRegion) => !color || s.color === color;
  function selectBox(rect: Bounds, add: boolean, subtract = false) {
    const ids = index.query(rect).filter(i => available(index.regions[i].shape) && encloses(rect, index.regions[i].bounds)).map(i => index.regions[i].shape.id);
    setSelection(old => { const next = add || subtract ? new Set(old) : new Set<string>(); ids.forEach(id => { if (subtract) next.delete(id); else next.add(id); }); return next; });
  }
  function selectPoint(p: Point, add: boolean, subtract: boolean) {
    if (!context.current) context.current = document.createElement('canvas').getContext('2d');
    let found = '';
    for (const i of index.query({ ...p, width: 0, height: 0 })) {
      const s = index.regions[i].shape; if (!available(s)) continue;
      if (!paths.current.has(s.id)) paths.current.set(s.id, new Path2D(s.d));
      if (context.current?.isPointInPath(paths.current.get(s.id)!, p.x, p.y, 'evenodd')) { found = s.id; break; }
    }
    setSelection(old => { const next = add || subtract ? new Set(old) : new Set<string>(); if (found) { if (subtract || (add && next.has(found))) next.delete(found); else next.add(found); } return next; });
  }
  function remove() { if (!selected.length) return; onRemove(selected.map(s => s.id)); setSelection(new Set()); viewport.current?.focus(); }
  function startKeyboardFrame() {
    const el = viewport.current; if (!el) return;
    const b = el.getBoundingClientRect(), center = point(b.left + b.width / 2, b.top + b.height / 2);
    const w = width / (zoom * 4), h = height / (zoom * 4);
    setFrame({ x: Math.max(0, center.x - w / 2), y: Math.max(0, center.y - h / 2), width: w, height: h }); setKeyboardFrame(true); el.focus();
  }
  return <div className={`vector-shape-editor ${compact ? 'area-compact' : ''}`} onKeyDown={e => {
    if (isEditable(e.target)) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); if (e.shiftKey) onRedo?.(); else onUndo?.(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); setSelection(new Set(shapes.filter(available).map(s => s.id))); return; }
    if (e.key === 'Escape' && (frame || selected.length)) { e.preventDefault(); e.stopPropagation(); setFrame(null); setKeyboardFrame(false); setSelection(new Set()); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); return; }
    if (e.target !== viewport.current) return;
    if (e.key === ' ') { e.preventDefault(); setSpace(true); }
    if (e.key.toLowerCase() === 'r') { e.preventDefault(); startKeyboardFrame(); }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(z => Math.min(8, z + .5)); }
    if (e.key === '-') { e.preventDefault(); setZoom(z => Math.max(1, z - .5)); }
    if (e.key === '0') { e.preventDefault(); setZoom(1); }
    if (keyboardFrame && frame) {
      if (e.key === 'Enter') { e.preventDefault(); selectBox(frame, e.shiftKey || adding); setFrame(null); setKeyboardFrame(false); }
      if (e.key.startsWith('Arrow')) {
        e.preventDefault(); const step = Math.max(width, height) / (e.altKey ? 1000 : 100) / zoom, dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0, dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
        setFrame(e.shiftKey ? { ...frame, width: Math.max(step, Math.min(width - frame.x, frame.width + dx)), height: Math.max(step, Math.min(height - frame.y, frame.height + dy)) } : { ...frame, x: Math.max(0, Math.min(width - frame.width, frame.x + dx)), y: Math.max(0, Math.min(height - frame.height, frame.y + dy)) });
      }
    }
  }} onKeyUp={e => { if (e.key === ' ') setSpace(false); }}>
    <div className="area-toolbar" role="toolbar" aria-label="Werkzeuge für die Flächenauswahl">
      <div className="area-tool-group"><Button variant={tool === 'select' ? 'secondary' : 'ghost'} size="icon" aria-label="Auswählen mit Klick oder Rahmen" aria-pressed={tool === 'select'} onClick={() => setTool('select')}><MousePointer2 size={18}/></Button><Button variant={tool === 'pan' ? 'secondary' : 'ghost'} size="icon" aria-label="Arbeitsfläche verschieben" aria-pressed={tool === 'pan'} onClick={() => setTool('pan')}><Hand size={18}/></Button></div>
      {!compact && <><Button variant={adding ? 'secondary' : 'ghost'} size="small" aria-pressed={adding} onClick={() => setAdding(v => !v)}><Plus size={15}/>Auswahl erweitern</Button><Button variant="ghost" size="small" onClick={() => setSelection(new Set(shapes.filter(available).map(s => s.id)))}>Alles auswählen</Button><Button variant="ghost" size="small" disabled={!selected.length} onClick={() => setSelection(new Set())}>Auswahl aufheben</Button><label className="area-color-filter"><span className="sr-only">Auswahl auf Farbe beschränken</span><select aria-label="Auswahl auf Farbe beschränken" value={color} onChange={e => setColor(e.target.value)}><option value="">Alle Farben</option>{colors.map(c => <option key={c} value={c}>{inkName(c)} · {c.toUpperCase()}</option>)}</select></label><Button variant="ghost" size="icon" aria-label="Auswahlrahmen per Tastatur erstellen" onClick={startKeyboardFrame}><SquareDashedMousePointer size={18}/></Button></>}
      <div className="area-tool-group area-history"><Button variant="ghost" size="icon" aria-label="Flächenlöschung rückgängig" disabled={!canUndo} onClick={onUndo}><Undo2 size={17}/></Button><Button variant="ghost" size="icon" aria-label="Flächenlöschung wiederholen" disabled={!canRedo} onClick={onRedo}><Redo2 size={17}/></Button></div>
      <Button variant="outline" size="small" disabled={!selected.length} aria-label={`Ausgewählte Flächen löschen${selected.length ? `: ${selected.length}` : ''}`} onClick={remove}><Trash2 size={17}/><span className="area-delete-label">{compact ? 'Löschen' : `${selected.length || ''} ${selected.length === 1 ? 'Fläche' : 'Flächen'} löschen`}</span></Button>
    </div>
    <div ref={viewport} className={`area-viewport checkerboard ${tool === 'pan' || space ? 'area-pan' : ''}`} tabIndex={0} role="region" aria-label="Vektor-Arbeitsfläche" aria-describedby={hintId} onBlur={() => setSpace(false)}>
      <div className="area-paper" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
        <BasePaths groups={groups} width={width} height={height}/>
        <svg ref={overlay} className="area-overlay" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} onPointerDown={e => {
          if (e.button > 1) return; e.preventDefault(); viewport.current?.focus(); setKeyboardFrame(false);
          const start = point(e.clientX, e.clientY), el = viewport.current!;
          gesture.current = { type: tool === 'pan' || space || e.button === 1 ? 'pan' : 'select', start, screen: { x: e.clientX, y: e.clientY }, scroll: { x: el.scrollLeft, y: el.scrollTop }, add: adding || e.shiftKey || e.metaKey || e.ctrlKey, subtract: e.altKey };
          e.currentTarget.setPointerCapture(e.pointerId);
        }} onPointerMove={e => {
          const g = gesture.current; if (!g) return;
          if (g.type === 'pan') { viewport.current!.scrollLeft = g.scroll.x - (e.clientX - g.screen.x); viewport.current!.scrollTop = g.scroll.y - (e.clientY - g.screen.y); return; }
          pendingFrame.current = rectFromPoints(g.start, point(e.clientX, e.clientY));
          if (!animation.current) animation.current = requestAnimationFrame(() => { setFrame(pendingFrame.current); animation.current = 0; });
        }} onPointerUp={e => {
          const g = gesture.current; if (!g) return; gesture.current = null; cancelAnimationFrame(animation.current); animation.current = 0; setFrame(null);
          if (g.type === 'pan') return;
          const p = point(e.clientX, e.clientY);
          if (Math.hypot(e.clientX - g.screen.x, e.clientY - g.screen.y) < 4) selectPoint(p, g.add, g.subtract); else selectBox(rectFromPoints(g.start, p), g.add, g.subtract);
        }} onPointerCancel={() => { gesture.current = null; cancelAnimationFrame(animation.current); animation.current = 0; setFrame(null); }}>
          {highlights.map((h, i) => <g key={i} pointerEvents="none"><path d={h.d} fill="#da482d" fillOpacity=".25" fillRule="evenodd" stroke="#fff" strokeWidth="3" vectorEffect="non-scaling-stroke"/><path d={h.d} fill="none" fillRule="evenodd" stroke="#a12d18" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></g>)}
          {frame && <rect {...frame} className="area-selection-frame" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
        </svg>
      </div>{children}
    </div>
    <div className="area-status"><span role="status">{selected.length ? `${selected.length.toLocaleString('de-DE')} ${selected.length === 1 ? 'Fläche ausgewählt' : 'Flächen ausgewählt'}` : 'Keine Fläche ausgewählt'}</span><div className="area-zoom"><Button variant="ghost" size="icon" aria-label="Vorschau verkleinern" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .5))}><Minus size={16}/></Button><output>{Math.round(zoom * 100)} %</output><Button variant="ghost" size="icon" aria-label="Vorschau vergrößern" disabled={zoom >= 8} onClick={() => setZoom(z => Math.min(8, z + .5))}><Plus size={16}/></Button><Button variant="ghost" size="icon" aria-label="Vorschau einpassen" onClick={() => setZoom(1)}><Maximize size={16}/></Button></div></div>
    <p id={hintId} className="area-hint"><Scan size={14}/>{keyboardFrame ? 'Pfeile: Rahmen bewegen · Umschalt + Pfeile: Größe ändern · Enter: auswählen · Esc: abbrechen' : 'Klick oder Rahmen ziehen · Umschalt: hinzufügen · Alt: abziehen · Entf: löschen · Leertaste: verschieben'}{!compact && <span>Der Rahmen wählt vollständig enthaltene Flächen. Tastaturrahmen: R.</span>}</p>
  </div>;
}
