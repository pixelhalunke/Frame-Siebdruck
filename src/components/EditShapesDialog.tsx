import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { imageRegions } from '../core/raster/artwork';
import type { Artwork } from '../core/project/model';
import { replaceShapes } from '../features/editor/shapes';
import { editableRegions, type EditableRegion } from '../features/editor/regions';
import { useAreaHistory } from '../features/editor/area-history';
import { Modal } from './ui/dialog';
import { Button } from './ui/button';
import { VectorShapeEditor } from './VectorShapeEditor';

export function AreaEditorDialog({ name, width, height, shapes: original, onClose, onSave, allowEmpty = false, disjoint = false }: { name: string; width: number; height: number; shapes: EditableRegion[]; onClose: () => void; onSave: (shapes: EditableRegion[]) => void; allowEmpty?: boolean; disjoint?: boolean }) {
  const edits = useAreaHistory(), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const shapes = useMemo(() => original.filter(s => !edits.removed.has(s.id)), [original, edits.removed]);
  return <Modal className="shape-dialog" title="Flächen bearbeiten" description={`${name} · Ziehe einen Auswahlrahmen oder klicke Flächen an. Mit Umschalt erweiterst du die Auswahl.`} open onOpenChange={open => { if (!open) onClose(); }}>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <VectorShapeEditor label={`Flächen von ${name}`} width={width} height={height} shapes={shapes} onRemove={edits.remove} onUndo={edits.undo} onRedo={edits.redo} canUndo={edits.canUndo} canRedo={edits.canRedo} disjoint={disjoint}/>
    <div className="area-dialog-footer"><div><span role="status">{edits.removed.size ? `${edits.removed.size.toLocaleString('de-DE')} Flächen entfernt` : 'Änderungen werden erst beim Übernehmen gespeichert.'}</span>{!shapes.length && <small>{allowEmpty ? 'Das ganze Motiv wird beim Übernehmen gelöscht.' : 'Behalte mindestens eine Fläche.'}</small>}</div><Button size="small" variant="ghost" disabled={!edits.removed.size || saving} onClick={edits.reset}><RotateCcw size={15}/>Alles wiederherstellen</Button><div className="area-dialog-actions"><Button variant="outline" onClick={onClose}>Abbrechen</Button><Button disabled={!edits.removed.size || (!shapes.length && !allowEmpty) || saving} onClick={() => { setSaving(true); setError(''); requestAnimationFrame(() => { try { onSave(shapes); } catch (e) { setError(e instanceof Error ? e.message : 'Die Flächen konnten nicht gespeichert werden.'); setSaving(false); } }); }}>{saving ? 'Wird übernommen …' : 'Änderungen übernehmen'}</Button></div></div>
  </Modal>;
}
export function EditShapesDialog({ item, onClose, onSave }: { item: Artwork; onClose: () => void; onSave: (item: Artwork | null) => void }) {
  const regions = useMemo(() => item.kind === 'image' ? imageRegions(item) : { shapes: editableRegions(item.shapes), width: item.sourceWidth, height: item.sourceHeight }, [item]);
  return <AreaEditorDialog name={item.name} width={regions.width} height={regions.height} shapes={regions.shapes} onClose={onClose} onSave={shapes => onSave(shapes.length ? replaceShapes(item, shapes) : null)} disjoint={!!item.isMosaic} allowEmpty/>;
}
