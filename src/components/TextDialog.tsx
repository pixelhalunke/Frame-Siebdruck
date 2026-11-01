import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight, Upload } from 'lucide-react';
import type { Artwork, ProjectFont } from '../core/project/model';
import { BUNDLED_FONTS, DEFAULT_FONT, fontLabel, importFontFile, loadFont } from '../features/editor/fonts';
import { textPath } from '../features/editor/text';
import { Modal } from './ui/dialog';
import { Button } from './ui/button';
export function TextDialog({ item, fonts: initial, onClose, onSave }: { item: Artwork | null; fonts: ProjectFont[]; onClose: () => void; onSave: (text: string, color: string, fontId: string, fonts: ProjectFont[]) => void }) {
  const [text, setText] = useState(item?.text ?? 'MAKE SOMETHING.'), [color, setColor] = useState(item?.shapes[0]?.color ?? '#253d32');
  const [fontId, setFontId] = useState(item?.fontId ?? DEFAULT_FONT), [fonts, setFonts] = useState(initial), [busy, setBusy] = useState(true), [error, setError] = useState(''), [loaded, setLoaded] = useState('');
  const input = useRef<HTMLInputElement>(null), errorId = useId();
  useEffect(() => { let active = true; setBusy(true); setError(''); loadFont(fontId, fonts).then(() => { if (active) setLoaded(fontId); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Die Schrift konnte nicht geöffnet werden.'); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, [fontId, fonts]);
  const preview = useMemo(() => { if (loaded !== fontId || !text.trim()) return { path: null, error: '' }; try { return { path: textPath(text, 100, fontId), error: '' }; } catch (e) { return { path: null, error: e instanceof Error ? e.message : 'Dieser Text konnte nicht gesetzt werden.' }; } }, [text, loaded, fontId]);
  async function chooseFont(file?: File) {
    if (!file) return; setBusy(true); setError('');
    try { const font = await importFontFile(file); if (!fonts.some(f => f.id === font.id) && fonts.length >= 10) throw new Error('Das Projekt enthält schon zehn eigene Schriften. Wähle eine vorhandene Schrift.'); setFonts(current => current.some(f => f.id === font.id) ? current : [...current, font]); setFontId(font.id); setLoaded(font.id); }
    catch (e) { setError(e instanceof Error ? e.message : 'Die Schrift konnte nicht importiert werden.'); } finally { setBusy(false); }
  }
  return <Modal title={item ? 'Text bearbeiten' : 'Text hinzufügen'} description="Wähle eine Schrift oder importiere deine eigene. Der Film enthält immer Vektorkonturen deiner gewählten Schrift." open onOpenChange={open => { if (!open) onClose(); }} className="text-dialog">
    <form onSubmit={e => { e.preventDefault(); if (busy || !preview.path) return; try { onSave(text, color, fontId, fonts); } catch (e) { setError(e instanceof Error ? e.message : 'Der Text konnte nicht übernommen werden.'); } }}>
      {(error || preview.error) && <p id={errorId} className="inline-error" role="alert">{error || preview.error}</p>}
      <label className="field"><span>Dein Text</span><input autoFocus aria-invalid={!!preview.error} aria-describedby={preview.error ? errorId : undefined} value={text} maxLength={120} onChange={e => setText(e.target.value)}/></label>
      <label className="field"><span>Schriftart</span><select aria-describedby={error ? errorId : undefined} value={fontId} onChange={e => setFontId(e.target.value)}><optgroup label="Mitgelieferte Schriften">{BUNDLED_FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>{fonts.length > 0 && <optgroup label="Eigene Schriften">{fonts.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>}</select></label>
      <input ref={input} type="file" accept=".ttf,.otf,.woff" hidden onChange={e => { void chooseFont(e.target.files?.[0]); e.target.value = ''; }}/><Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}><Upload size={16}/>Eigene Schrift importieren</Button><p className="font-hint">TTF, OTF oder WOFF · bis 3 MB · bleibt lokal und wird in deiner Projektdatei mitgespeichert.</p>
      <label className="field"><span>Farbe</span><input type="color" value={color} onChange={e => setColor(e.target.value)}/></label>
      <div className="font-preview" aria-busy={busy}>{busy ? <span role="status">Schrift wird geladen …</span> : preview.path ? <svg viewBox={`${preview.path.x - 4} ${preview.path.y - 4} ${preview.path.width + 8} ${preview.path.height + 8}`} role="img" aria-label={`Textvorschau: ${text}, ${fontLabel(fontId, fonts)}`}><path d={preview.path.d} fill={color}/></svg> : <span>Gib einen Text für die Vorschau ein.</span>}</div>
      <Button className="full-width" disabled={busy || !preview.path}>{item ? 'Text aktualisieren' : 'Zum Motiv hinzufügen'}<ArrowRight size={16}/></Button>
    </form>
  </Modal>;
}
