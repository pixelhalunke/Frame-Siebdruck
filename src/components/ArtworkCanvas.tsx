import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Hand, MousePointer2, Minus, Plus, Maximize } from 'lucide-react';
import { Button } from './ui/button';
import { pageSize, type Artwork, type Project } from '../core/project/model';
import { itemTransform, type Separation } from '../core/separation/separate';
import { isEditable } from '../features/import/clipboard';

const SourcePaths = memo(function SourcePaths({ item, paints }: { item: Artwork; paints: Record<string, string> }) {
  return <>{item.shapes.map(s => <path key={s.id} d={s.d} fill={paints[s.color] ?? s.color} fillRule="evenodd"/>)}</>;
});
type Drag = { type: 'move' | 'scale'; startX: number; startY: number; item: Artwork };
export function ArtworkCanvas({ project, result, selectedId, setSelectedId, previewInk, updateItem, calculating = false }: { project: Project; result: Separation; selectedId: string | null; setSelectedId: (id: string | null) => void; previewInk: string | null; updateItem: (id: string, changes: Partial<Artwork>) => void; calculating?: boolean }) {
  const page = pageSize(project.print), stage = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null);
  const [fit, setFit] = useState(1.5), [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 });
  const [hand, setHand] = useState(false), [draft, setDraft] = useState<Artwork | null>(null);
  const drag = useRef<Drag | null>(null), panDrag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const selected = draft ?? project.artwork.find(a => a.id === selectedId);
  const latestDraft = useRef<Artwork | null>(null), animation = useRef(0);
  const paints = useMemo(() => Object.fromEntries(Object.entries(project.mapping).map(([color, id]) => { const ink = project.inks.find(i => i.id === id); return [color, ink?.enabled ? ink.color : '#ffffff']; })), [project.mapping, project.inks]);
  useEffect(() => () => cancelAnimationFrame(animation.current), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (isEditable(e.target) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('[role="dialog"]')) return;
      if (e.key === 'Escape' && drag.current) { e.preventDefault(); cancelAnimationFrame(animation.current); animation.current = 0; drag.current = null; latestDraft.current = null; setDraft(null); return; }
      if (e.key === '0') { e.preventDefault(); setZoom(1); setPan({ x: 0, y: 0 }); }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(z => Math.min(4, z + .25)); }
      if (e.key === '-') { e.preventDefault(); setZoom(z => Math.max(.25, z - .25)); }
    };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setFit(Math.max(.3, Math.min((entry.contentRect.width - 116) / page.width, (entry.contentRect.height - 96) / page.height))));
    observer.observe(el); return () => observer.disconnect();
  }, [page.width, page.height]);
  function point(e: React.PointerEvent) {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
  }
  function start(e: React.PointerEvent, item: Artwork, type: 'move' | 'scale') {
    if (hand || e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    setSelectedId(item.id); const p = point(e);
    drag.current = { type, startX: p.x, startY: p.y, item }; latestDraft.current = item;
    svg.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (panDrag.current) { const p = panDrag.current; setPan({ x: p.ox + e.clientX - p.x, y: p.oy + e.clientY - p.y }); return; }
    if (!drag.current) return;
    const d = drag.current, p = point(e), dx = p.x - d.startX, dy = p.y - d.startY;
    if (d.type === 'move') latestDraft.current = { ...d.item, x: d.item.x + dx, y: d.item.y + dy };
    else {
      const rad = d.item.rotation * Math.PI / 180;
      const delta = (dx * Math.cos(rad) + dy * Math.sin(rad)) / d.item.width;
      const scale = Math.max(.02, 1 + delta);
      const w = Math.min(10000, d.item.width * scale), h = Math.min(10000, d.item.height * scale);
      latestDraft.current = { ...d.item, width: w, height: h, x: d.item.x + (d.item.width - w) / 2, y: d.item.y + (d.item.height - h) / 2 };
    }
    if (!animation.current) animation.current = requestAnimationFrame(() => { setDraft(latestDraft.current); animation.current = 0; });
  }
  function finish(e: React.PointerEvent) {
    if (drag.current) move(e);
    cancelAnimationFrame(animation.current); animation.current = 0;
    const value = latestDraft.current, original = drag.current?.item;
    if (value && original && ['x', 'y', 'width', 'height'].some(key => value[key as keyof Artwork] !== original[key as keyof Artwork])) updateItem(value.id, { x: value.x, y: value.y, width: value.width, height: value.height });
    setDraft(null); latestDraft.current = null; drag.current = null; panDrag.current = null;
  }
  return <div className="canvas-workbench"><div className="canvas-meta"><span><span className="status-dot"/>{previewInk ? 'BELICHTUNGSMASKE' : 'MOTIVVORSCHAU'}</span><span>{project.print.paper} · {page.width} × {page.height} mm</span></div>
    <div ref={stage} className={`canvas-stage ${hand ? 'hand-mode' : ''}`} onPointerDown={e => { if (hand || e.button === 1) { e.preventDefault(); panDrag.current = { x: e.clientX, y: e.clientY, ox: pan.x, oy: pan.y }; e.currentTarget.setPointerCapture(e.pointerId); } else if (e.target === e.currentTarget) setSelectedId(null); }} onPointerMove={move} onPointerUp={finish} onPointerCancel={() => { cancelAnimationFrame(animation.current); animation.current = 0; setDraft(null); latestDraft.current = null; drag.current = null; panDrag.current = null; }}>
      <div className="sheet-shell" style={{ width: page.width * fit, height: page.height * fit, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <span className="sheet-dimension horizontal">{page.width} mm</span><span className="sheet-dimension vertical">{page.height} mm</span>
        <svg ref={svg} className="artwork-sheet" viewBox={`0 0 ${page.width} ${page.height}`} role="img" aria-label={previewInk ? 'Schwarze Belichtungsmaske der ausgewählten Druckfarbe' : 'Motiv auf dem Druckbogen'} onPointerDown={e => { if (e.target === e.currentTarget) setSelectedId(null); }}>
          <rect className="print-margin" x="5" y="5" width={page.width - 10} height={page.height - 10}/>
          {previewInk ? result.masks.filter(m => m.ink.id === previewInk).map(m => <path key={m.ink.id} d={m.d} fill="#000" fillRule="evenodd" pointerEvents="none"/>) : project.artwork.filter(a => a.visible).map(a => {
            const item = draft?.id === a.id ? draft : a;
            return <g key={a.id} data-artwork-id={a.id} transform={itemTransform(item)} onPointerDown={e => start(e, a, 'move')} className="artwork-hit" pointerEvents={hand ? 'none' : 'visiblePainted'}>
              {a.id === selectedId && <rect x="0" y="0" width={a.sourceWidth} height={a.sourceHeight} fill="transparent" pointerEvents={hand ? 'none' : 'all'}/>}
              <SourcePaths item={a} paints={paints}/>
            </g>;
          })}
          {!previewInk && selected?.visible && <g transform={`rotate(${selected.rotation} ${selected.x + selected.width / 2} ${selected.y + selected.height / 2})`}><rect x={selected.x} y={selected.y} width={selected.width} height={selected.height} className="selection-box" pointerEvents="none"/>{[[selected.x, selected.y], [selected.x + selected.width, selected.y], [selected.x, selected.y + selected.height], [selected.x + selected.width, selected.y + selected.height]].map(([x, y], i) => <rect key={i} x={x - 1.5} y={y - 1.5} width="3" height="3" className="selection-handle" pointerEvents="none"/>)}<rect x={selected.x + selected.width - 5} y={selected.y + selected.height - 5} width="10" height="10" fill="transparent" style={{ cursor: 'nwse-resize' }} onPointerDown={e => start(e, selected, 'scale')}/></g>}
        </svg>
        {result.bounds && <span className="artwork-dimension">Motiv {result.bounds.width.toFixed(1)} × {result.bounds.height.toFixed(1)} mm</span>}
      </div>
    </div>
    <div className="canvas-bottom"><div className="tool-group"><Button variant={!hand ? 'secondary' : 'ghost'} size="icon" aria-label="Motiv auswählen und bewegen" aria-pressed={!hand} onClick={() => setHand(false)}><MousePointer2 size={17}/></Button><Button variant={hand ? 'secondary' : 'ghost'} size="icon" aria-label="Ansicht verschieben" aria-pressed={hand} onClick={() => setHand(true)}><Hand size={17}/></Button></div><span className="canvas-hint" role="status">{calculating ? 'Filme werden im Hintergrund aktualisiert …' : previewInk ? 'Schwarz = Farbe auf dem Belichtungsfilm' : 'Ziehen zum Bewegen · Ecke zum Skalieren'}</span><div className="tool-group"><Button variant="ghost" size="icon" aria-label="Verkleinern" onClick={() => setZoom(z => Math.max(.25, z - .25))}><Minus size={16}/></Button><span className="zoom-label">{Math.round(zoom * 100)} %</span><Button variant="ghost" size="icon" aria-label="Vergrößern" onClick={() => setZoom(z => Math.min(4, z + .25))}><Plus size={16}/></Button><Button variant="ghost" size="icon" aria-label="Ansicht einpassen" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Maximize size={16}/></Button></div></div>
  </div>;
}
