import { memo, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, Box, Check, Layers3, RotateCcw, Move } from 'lucide-react';
import type { Film } from '../core/print/films';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import './LayerStackDialog.css';

const INITIAL_VIEW = { tilt: 52, turn: -28 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Keep the complex SVGs mounted and unchanged while only their containing planes move.
const FilmPlanes = memo(function FilmPlanes({ films, built, colored }: { films: Film[]; built: number; colored: boolean }) {
  return <>
    <div className="layer-plane layer-paper" style={{ '--plane-index': 0 } as CSSProperties}>
      <span className="layer-plane-title">PAPIER</span>
    </div>
    {films.map((film, index) => <div key={film.inkId} className={`layer-plane layer-film ${index < built ? '' : 'layer-unbuilt'}`} style={{ '--plane-index': index + 1, '--plane-color': film.color } as CSSProperties}>
      <svg viewBox={`0 0 ${film.width} ${film.height}`}><path d={film.d} fill={colored ? film.color : '#000000'} fillRule="evenodd"/>{film.marks && <path d={film.marks} fill={colored ? '#394835' : '#000000'}/>}</svg>
      <span className="layer-plane-title"><i/>{String(index + 1).padStart(2, '0')} · {film.name}</span>
    </div>)}
  </>;
});

function LayerExplorer({ films }: { films: Film[] }) {
  const [built, setBuilt] = useState(films.length), [spread, setSpread] = useState(76), [colored, setColored] = useState(true);
  const [view, setView] = useState(INITIAL_VIEW), [size, setSize] = useState({ width: 600, height: 500 });
  const stage = useRef<HTMLDivElement>(null), gesture = useRef<{ x: number; y: number; tilt: number; turn: number } | null>(null);
  const nextView = useRef(view), frame = useRef(0), helpId = useId(), sceneId = useId();
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const box = entries[0].contentRect;
      setSize({ width: box.width, height: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const count = Math.min(built, films.length), film = films[0];
  // A fixed fitting envelope leaves room for the page diagonal and the exploded depth.
  // Camera movement never retraces, reparses, or recomputes the film geometry.
  const longSide = Math.max(60, Math.min(size.width * .72, size.height * .76));
  const ratio = film.width / film.height;
  const width = ratio > 1 ? longSide : longSide * ratio, height = ratio > 1 ? longSide / ratio : longSide;
  const depth = Math.min(longSide * .5, 170) * spread / 100;
  const cameraStyle = {
    width, height,
    '--layer-step': `${depth / films.length}px`,
    '--stack-center': `${-depth / 2}px`,
    '--tilt': `${view.tilt}deg`, '--turn': `${view.turn}deg`,
  } as CSSProperties;
  const current = count ? films[count - 1] : null;
  const buildLabel = count ? `${count} von ${films.length} Druckfarben · zuletzt ${current!.name}` : 'Nur Papier';
  function camera(tilt: number, turn: number) {
    const value = { tilt: clamp(tilt, 0, 65), turn: clamp(turn, -65, 65) };
    nextView.current = value; setView(value);
  }
  function reset() { setSpread(76); camera(INITIAL_VIEW.tilt, INITIAL_VIEW.turn); setBuilt(films.length); setColored(true); }
  function finishGesture(element: HTMLElement, pointerId: number) {
    if (!gesture.current) return;
    gesture.current = null; cancelAnimationFrame(frame.current); frame.current = 0; setView(nextView.current);
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
  }
  return <div className="layer-explorer">
    <section className="layer-visual" aria-label="Räumliche Vorschau">
      <div className="layer-viewbar">
        <div className="layer-presets" role="group" aria-label="Perspektive">
          <Button size="small" variant={spread > 0 && view.tilt > 0 ? 'secondary' : 'ghost'} aria-pressed={spread > 0 && view.tilt > 0} onClick={() => { setSpread(76); camera(INITIAL_VIEW.tilt, INITIAL_VIEW.turn); }}><Box size={16}/>Räumlich</Button>
          <Button size="small" variant={spread === 0 && view.tilt === 0 && view.turn === 0 ? 'secondary' : 'ghost'} aria-pressed={spread === 0 && view.tilt === 0 && view.turn === 0} onClick={() => { setSpread(0); camera(0, 0); }}><Layers3 size={16}/>Zusammengelegt</Button>
        </div>
        <Button size="icon" variant="ghost" aria-label="3D-Ansicht zurücksetzen" onClick={reset}><RotateCcw size={17}/></Button>
      </div>
      <div ref={stage} className="layer-stage" tabIndex={0} role="group" aria-label="3D-Layer drehen" aria-describedby={helpId}
        onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) event.preventDefault();
          if (event.key === 'ArrowLeft') camera(view.tilt, view.turn - 5);
          if (event.key === 'ArrowRight') camera(view.tilt, view.turn + 5);
          if (event.key === 'ArrowUp') camera(view.tilt + 5, view.turn);
          if (event.key === 'ArrowDown') camera(view.tilt - 5, view.turn);
          if (event.key === 'Home') { setSpread(76); camera(INITIAL_VIEW.tilt, INITIAL_VIEW.turn); }
        }}
        onPointerDown={event => {
          if (event.button !== 0 || gesture.current) return;
          gesture.current = { x: event.clientX, y: event.clientY, ...view };
          nextView.current = view; event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const start = gesture.current; if (!start) return;
          nextView.current = { tilt: clamp(Math.round(start.tilt - (event.clientY - start.y) * .22), 0, 65), turn: clamp(Math.round(start.turn + (event.clientX - start.x) * .22), -65, 65) };
          if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; setView(nextView.current); });
        }}
        onPointerUp={event => finishGesture(event.currentTarget, event.pointerId)}
        onPointerCancel={event => finishGesture(event.currentTarget, event.pointerId)}
        onLostPointerCapture={event => finishGesture(event.currentTarget, event.pointerId)}>
        <div className="layer-floor" aria-hidden="true"/>
        <div className={`layer-camera ${spread === 0 ? 'layer-closed' : ''}`} aria-hidden="true" style={cameraStyle}>
          <FilmPlanes films={films} built={count} colored={colored}/>
        </div>
        <span className="layer-stage-caption" aria-hidden="true">{film.width} × {film.height} mm <span>·</span> {count} {count === 1 ? 'Farbe' : 'Farben'} auf Papier</span>
      </div>
      <p id={helpId} className="layer-drag-hint"><Move size={14}/>Ziehen oder Pfeiltasten: Ansicht drehen. Alternativ die Regler verwenden.</p>
      <div className="layer-build-control">
        <div className="layer-build-heading"><label htmlFor={`${sceneId}-build`}>Aufbau</label><output htmlFor={`${sceneId}-build`} role="status">{count === 0 ? 'Nur Papier' : `${count} von ${films.length} Druckfarben`}</output></div>
        <div className="layer-build-buttons"><Button variant="outline" size="icon" disabled={count === 0} aria-label="Eine Druckfarbe zurück" onClick={() => setBuilt(n => Math.max(0, n - 1))}><ArrowLeft size={18}/></Button><input id={`${sceneId}-build`} type="range" min={0} max={films.length} step={1} value={count} aria-valuetext={buildLabel} onChange={e => setBuilt(Number(e.target.value))}/><Button variant="outline" size="icon" disabled={count === films.length} aria-label="Nächste Druckfarbe aufbauen" onClick={() => setBuilt(n => Math.min(films.length, n + 1))}><ArrowRight size={18}/></Button></div>
      </div>
    </section>
    <aside className="layer-inspector" aria-label="Ebenen und Ansicht einstellen">
      <div className="layer-order-heading"><div><span className="eyebrow">DER AUFBAU</span><h3>Farbe für Farbe.</h3></div><Layers3 size={23}/></div>
      <p className="layer-order-note"><ArrowDown size={14}/>Von unten nach oben</p>
      <ol className="layer-order">
        <li><button className={count === 0 ? 'current' : ''} aria-pressed={count === 0} onClick={() => setBuilt(0)}><span className="layer-order-number">00</span><i className="layer-paper-swatch"/><span><strong>Papier</strong><small>Die gemeinsame Basis</small></span><Check size={16}/></button></li>
        {films.map((item, index) => <li key={item.inkId}><button className={`${count === index + 1 ? 'current' : ''} ${index < count ? 'is-built' : 'is-waiting'}`} aria-pressed={count === index + 1} aria-label={`Aufbau bis Farbe ${index + 1}: ${item.name}`} onClick={() => setBuilt(index + 1)}><span className="layer-order-number">{String(index + 1).padStart(2, '0')}</span><i style={{ background: item.color }}/><span><strong>{item.name}</strong><small>{index < count ? 'Aufgebaut' : 'Noch nicht aufgebaut'}</small></span>{index < count && <Check size={16}/>}</button></li>)}
      </ol>
      <fieldset className="layer-display"><legend>Darstellung</legend><div role="group" aria-label="Darstellung der Farbebenen"><Button size="small" variant={colored ? 'secondary' : 'outline'} aria-pressed={colored} onClick={() => setColored(true)}>Druckfarben</Button><Button size="small" variant={!colored ? 'secondary' : 'outline'} aria-pressed={!colored} onClick={() => setColored(false)}>Schwarze Filme</Button></div><p>{colored ? 'Die Farben zeigen das zusammengesetzte Motiv. Die Belichtungsfilme bleiben schwarz.' : 'Jede Farbe als schwarzer Belichtungsfilm, auf einer transparenten Ebene.'}</p></fieldset>
      <div className="layer-view-controls">
        <label htmlFor={`${sceneId}-spread`}><span>Ebenenabstand<span className="layer-range-value" aria-hidden="true">{spread === 0 ? 'Geschlossen' : `${spread} %`}</span></span><input id={`${sceneId}-spread`} type="range" min={0} max={100} value={spread} aria-valuetext={spread === 0 ? 'Ebenen zusammengelegt' : `${spread} Prozent auseinandergezogen`} onChange={e => setSpread(Number(e.target.value))}/></label>
        <label htmlFor={`${sceneId}-tilt`}><span>Neigung<span className="layer-range-value" aria-hidden="true">{view.tilt}°</span></span><input id={`${sceneId}-tilt`} type="range" min={0} max={65} value={view.tilt} aria-valuetext={`${view.tilt} Grad`} onChange={e => camera(Number(e.target.value), view.turn)}/></label>
        <label htmlFor={`${sceneId}-turn`}><span>Drehung<span className="layer-range-value" aria-hidden="true">{view.turn}°</span></span><input id={`${sceneId}-turn`} type="range" min={-65} max={65} value={view.turn} aria-valuetext={`${view.turn} Grad`} onChange={e => camera(view.tilt, Number(e.target.value))}/></label>
      </div>
      <p className="layer-view-note">Diese Ansicht ändert weder dein Motiv noch die Filme. Die Reihenfolge folgt der Farbliste im Projekt.</p>
    </aside>
  </div>;
}

export function LayerStackDialog({ films, open, onOpenChange, returnFocusRef }: { films: Film[]; open: boolean; onOpenChange: (open: boolean) => void; returnFocusRef?: RefObject<HTMLElement | null> }) {
  return <Modal title="Dein Motiv. Schicht für Schicht." description="Entdecke, wie sich deine Druckfarben aufbauen. Ziehe die Ebenen auseinander oder lege sie zu einem Motiv zusammen." open={open} onOpenChange={onOpenChange} className="layer-dialog" returnFocusRef={returnFocusRef}>
    {open && (films.length ? <LayerExplorer films={films}/> : <p className="layer-empty">Aktiviere mindestens eine Druckfarbe, um den Aufbau zu sehen.</p>)}
  </Modal>;
}
