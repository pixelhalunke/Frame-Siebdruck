import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowRight, Check, ImagePlus, LoaderCircle, RotateCcw } from 'lucide-react';
import { DEFAULT_TRACE, type TraceOptions, type TraceResult } from '../core/raster/types';
import { traceSvg } from '../core/raster/svg';
import { importImageSvg } from '../core/raster/artwork';
import { inkName, type Artwork } from '../core/project/model';
import { decodeRaster, runTrace, type RasterSource } from '../features/import/raster';
import { Modal } from './ui/dialog';
import { Button } from './ui/button';
import { NumberField } from './NumberField';
import { AreaEditorDialog } from './EditShapesDialog';
import { useAreaHistory } from '../features/editor/area-history';
import { VectorShapeEditor } from './VectorShapeEditor';

export function RasterImportDialog({ file, onClose, onChoose, onImport }: { file: File; onClose: () => void; onChoose: () => void; onImport: (item: Artwork) => void }) {
  const [source, setSource] = useState<RasterSource | null>(null), [options, setOptions] = useState<TraceOptions>(DEFAULT_TRACE);
  const [result, setResult] = useState<TraceResult | null>(null), [busy, setBusy] = useState(true), [error, setError] = useState('');
  const [widthMm, setWidthMm] = useState(150), [omitted, setOmitted] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false), [areaOpen, setAreaOpen] = useState(false);
  const edits = useAreaHistory(), removed = edits.removed;
  const toleranceId = useId();
  useEffect(() => {
    let active = true, loaded: RasterSource | undefined;
    decodeRaster(file).then(s => {
      loaded = s; if (!active) { URL.revokeObjectURL(s.url); return; }
      setSource(s); setOptions({ ...DEFAULT_TRACE, background: s.suggestRemoval ? 'remove' : 'keep', backgroundColor: s.background, ...(s.suggestTexture ? { preserveTexture: true, colors: 2, minArea: 0 } : {}) });
      setWidthMm(Math.max(1, Math.min(150, 200 * s.pixels.width / s.pixels.height)));
    }).catch(e => { if (active) { setError(e instanceof Error ? e.message : 'Das Bild konnte nicht geöffnet werden.'); setBusy(false); } });
    return () => { active = false; if (loaded) URL.revokeObjectURL(loaded.url); };
  }, [file]);
  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    setBusy(true); setError(''); setResult(null); edits.reset(); setOmitted(new Set());
    const timer = setTimeout(() => {
      runTrace(source.pixels, options, controller.signal).then(value => { if (!controller.signal.aborted) setResult(value); }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Die Vektorisierung ist fehlgeschlagen.'); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [source, options]);
  const shapes = useMemo(() => result?.shapes.filter(s => !removed.has(s.id) && !omitted.has(s.color)) ?? [], [result, removed, omitted]);
  const palette = [...new Set(shapes.map(s => s.color))];
  function settings(patch: Partial<TraceOptions>) { setBusy(true); setResult(null); setOptions(current => ({ ...current, ...patch })); }
  function commit() {
    if (!result || !source || busy || !shapes.length) return;
    setImporting(true); setError('');
    try {
      const item = importImageSvg(traceSvg({ ...result, shapes }, widthMm), source.name.replace(/\.[^.]+$/, '').slice(0, 200));
      onImport(item);
    } catch (e) { setError(e instanceof Error ? e.message : 'Das Bild konnte nicht übernommen werden.'); setImporting(false); }
  }
  return <Modal className="raster-dialog" title="Bild in Druckfarben umwandeln" description="Vergleiche das Original mit den Vektoren. Wähle deine Druckfarben und entferne Flächen, die du nicht drucken möchtest." open onOpenChange={open => { if (!open) onClose(); }}>
    <div className="raster-file"><ImagePlus size={17}/><strong>{file.name}</strong>{source && <span>{source.originalWidth.toLocaleString('de-DE')} × {source.originalHeight.toLocaleString('de-DE')} px</span>}<Button variant="ghost" size="small" onClick={onChoose}>Anderes Bild</Button></div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="raster-layout"><div className="raster-comparison"><div className="raster-previews"><section><h3>Original <span>Pixelbild</span></h3><div className="trace-artboard checkerboard">{source ? <img src={source.url} alt={`Originalmotiv aus ${source.name}`}/> : <span className="trace-placeholder">Bild wird geöffnet …</span>}</div></section><section><h3>Druckvorschau <span>{busy ? 'Wird berechnet' : `${palette.length} ${palette.length === 1 ? 'Farbe' : 'Farben'}`}</span></h3><VectorShapeEditor width={result?.width ?? 100} height={result?.height ?? 100} shapes={shapes} onRemove={edits.remove} onUndo={edits.undo} onRedo={edits.redo} canUndo={edits.canUndo} canRedo={edits.canRedo} disjoint={!!result?.preserveTexture} compact>{busy && <div className="trace-loading" role="status"><LoaderCircle size={26} className="spin"/><span>Konturen werden berechnet …</span></div>}{!busy && !shapes.length && <div className="trace-loading">Keine Fläche ausgewählt.</div>}</VectorShapeEditor><Button variant="outline" className="area-open-full" disabled={busy || !shapes.length} onClick={() => setAreaOpen(true)}>Flächen groß bearbeiten</Button></section></div>
      <div className="trace-palette"><div className="trace-palette-heading"><h3>Druckfarben</h3><span>Zum Weglassen anklicken</span></div><div className="trace-color-list">{result?.palette.map(({ color }, i) => <button key={color} className={`trace-color ${omitted.has(color) ? 'omitted' : ''}`} aria-label={`${inkName(color)} ${color} drucken`} aria-pressed={!omitted.has(color)} disabled={busy} onClick={() => setOmitted(current => { const next = new Set(current); if (next.has(color)) next.delete(color); else next.add(color); return next; })}><i style={{ background: color }}>{!omitted.has(color) && <Check size={13}/>}</i><span>{String(i + 1).padStart(2, '0')} · {inkName(color)}<small>{color.toUpperCase()}</small></span></button>)}</div></div>
      <div className="trace-summary" role="status">{!busy && result && <span>{shapes.length} Vektorflächen · {palette.length} {palette.length === 1 ? 'Sieb' : 'Siebe'}{result.removedSpeckles > 0 && ` · ${result.removedSpeckles} Flecken bereinigt`}</span>}<Button variant="ghost" size="small" disabled={!removed.size && !omitted.size} onClick={() => { edits.reset(); setOmitted(new Set()); }}><RotateCcw size={14}/>Auswahl zurücksetzen</Button></div>
      <p className="trace-note">Flächen und Farben bleiben bearbeitbar. Das Originalbild wird nicht in den Film eingebettet.{source?.reduced && ` Für die Konturen auf ${source.pixels.width} × ${source.pixels.height} px verkleinert.`}</p>
    </div><aside className="trace-settings" aria-label="Einstellungen für den Bildimport"><label className="field"><span>Bildstil</span><select value={options.preserveTexture ? 'texture' : 'smooth'} onChange={e => settings({ preserveTexture: e.target.value === 'texture', minArea: e.target.value === 'texture' ? 0 : 12 })}><option value="texture">Raster &amp; Sprenkel erhalten</option><option value="smooth">Illustration glätten</option></select><small>{options.preserveTexture ? 'Erhält vorhandene Rasterpunkte, Löcher und raue Kanten als Vektoren.' : 'Glättet Konturen für einfache Illustrationen.'}</small></label><label className="field"><span>Maximale Druckfarben</span><select value={options.colors} onChange={e => settings({ colors: Number(e.target.value) })}>{Array.from({ length: 8 }, (_, i) => <option key={i} value={i + 1}>{i + 1} {i ? 'Farben' : 'Farbe'}</option>)}</select><small>Weniger Farben brauchen weniger Siebe.</small></label>
      {!options.preserveTexture && <fieldset className="trace-detail"><legend>Konturen</legend><div>{([['fine', 'Fein'], ['balanced', 'Normal'], ['smooth', 'Glatt']] as const).map(([value, name]) => <Button key={value} variant={options.detail === value ? 'secondary' : 'ghost'} size="small" aria-pressed={options.detail === value} onClick={() => settings({ detail: value })}>{name}</Button>)}</div></fieldset>}
      <label className="field"><span>Kleine Flecken entfernen</span><select value={options.minArea} onChange={e => settings({ minArea: Number(e.target.value) })}><option value="0">Aus · alle Details behalten</option><option value="4">Leicht</option><option value="12">Normal</option><option value="40">Stark</option></select></label>
      <div className="trace-background"><label className="trace-checkbox"><input type="checkbox" checked={options.background === 'remove'} onChange={e => settings({ background: e.target.checked ? 'remove' : 'keep' })}/><span>Hintergrundfarbe entfernen</span></label>{options.background === 'remove' && <><label className="trace-background-color"><span>Hintergrundfarbe</span><input type="color" value={options.backgroundColor} onChange={e => settings({ backgroundColor: e.target.value })}/></label><label className="field trace-range" htmlFor={toleranceId}><span>Toleranz <output aria-hidden="true">{options.backgroundTolerance} %</output></span><input id={toleranceId} type="range" min="0" max="40" value={options.backgroundTolerance} onChange={e => settings({ backgroundTolerance: Number(e.target.value) })}/></label><p>Entfernt ähnliche Farben im ganzen Bild, auch innerhalb des Motivs.</p></>}</div>
      <NumberField label="Motivbreite" value={widthMm} min={1} max={1000} onChange={setWidthMm}/><p className="trace-size-note">{source ? `Höhe ${(widthMm * source.pixels.height / source.pixels.width).toFixed(1)} mm · proportional` : 'Die Höhe bleibt proportional.'}<br/>Die Breite enthält auch freigestellte Ränder.</p>
      <p className="trace-note">Neue Einstellungen berechnen die Vorschau neu und setzen entfernte Flächen zurück. Halbtransparente Pixel werden zu deckenden Flächen oder transparent.</p>
    </aside></div><div className="raster-footer"><span>Alles bleibt auf deinem Gerät.</span><div><Button variant="outline" onClick={onClose}>Abbrechen</Button><Button onClick={commit} disabled={busy || importing || !shapes.length}>{importing ? 'Wird übernommen …' : 'Als Vektoren übernehmen'}<ArrowRight size={17}/></Button></div></div>
    {areaOpen && result && <AreaEditorDialog name={file.name} width={result.width} height={result.height} shapes={shapes} disjoint={!!result.preserveTexture} onClose={() => setAreaOpen(false)} onSave={kept => { const ids = new Set(kept.map(s => s.id)); edits.remove(shapes.filter(s => !ids.has(s.id)).map(s => s.id)); setAreaOpen(false); }}/>}
  </Modal>;
}
