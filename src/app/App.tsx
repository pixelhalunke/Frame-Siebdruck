import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, FileDown, Layers2, Redo2, ScanLine, Undo2, X, CircleAlert } from 'lucide-react';
import { initGeometry } from '../core/geometry/engine';
import { importImageSvg } from '../core/raster/artwork';
import { importSvg } from '../core/svg/import';
import { newProject, reconcileInks, pageSize, projectSchema, type Artwork, type Project, type ProjectFont } from '../core/project/model';
import { deleteProject, listProjects, saveProject } from '../core/project/storage';
import { useSeparation } from '../features/separation/useSeparation';
import { downloadFile, filmSvg, filmsPdf, safeFilename, type Film } from '../core/print/films';
import { isEditable, readClipboard } from '../features/import/clipboard';
import { isRasterFile } from '../features/import/raster';
import { initFont, makeText } from '../features/editor/text';
import { demoSvg } from '../features/editor/demo';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/dialog';
import { Home } from '../components/Home';
import { Logo } from '../components/Logo';
import { ArtworkCanvas } from '../components/ArtworkCanvas';
import { ArtworkPanel, InkPanel } from '../components/EditorPanels';
import { PrintView } from '../components/PrintView';
import { RasterImportDialog } from '../components/RasterImportDialog';
import { TextDialog } from '../components/TextDialog';
import { EditShapesDialog } from '../components/EditShapesDialog';

const message = (error: unknown) => error instanceof Error ? error.message : 'Das hat nicht geklappt. Bitte versuche es erneut.';
export default function App() {
  const [ready, setReady] = useState(false), [project, setProject] = useState<Project | null>(null), [projects, setProjects] = useState<Project[]>([]);
  const [demo, setDemo] = useState<Artwork | null>(null), [mode, setMode] = useState<'design' | 'print'>('design');
  const [selectedId, setSelectedId] = useState<string | null>(null), [previewInk, setPreviewInk] = useState<string | null>(null);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [saveState, setSaveState] = useState('Lokal gespeichert');
  const [helpOpen, setHelpOpen] = useState(false), [codeOpen, setCodeOpen] = useState(false), [code, setCode] = useState('');
  const [textOpen, setTextOpen] = useState(false), [editingText, setEditingText] = useState<Artwork | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null), [dragging, setDragging] = useState(false), [exporting, setExporting] = useState(false);
  const [downloads, setDownloads] = useState<{ name: string; url: string }[]>([]);
  const [rasterFile, setRasterFile] = useState<{ file: File; key: string } | null>(null), [editingShapes, setEditingShapes] = useState<Artwork | null>(null);
  const fileInput = useRef<HTMLInputElement>(null), projectInput = useRef<HTMLInputElement>(null);
  const undoStack = useRef<Project[]>([]), redoStack = useRef<Project[]>([]), dragDepth = useRef(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([initGeometry(), initFont()]).then(async () => {
      if (!active) return;
      setDemo(importSvg(demoSvg(), 'Grow your own'));
      try {
        const saved = await listProjects(); if (!active) return;
        setProjects(saved);
        const id = localStorage.getItem('frame-active-project'), restored = saved.find(p => p.id === id);
        if (restored) { setProject(restored); setSelectedId(restored.artwork[0]?.id ?? null); }
      } catch { if (active) setError('Lokale Projekte konnten nicht geöffnet werden. Prüfe die Speichereinstellungen deines Browsers. Deine vorhandenen Daten werden nicht überschrieben.'); }
      finally { if (active) setReady(true); }
    }).catch(e => { if (active) setError(`FRAME konnte nicht starten. ${message(e)} Lade die Seite neu.`); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!project) return;
    let active = true; setSaveState('Wird gespeichert …');
    saveProject(project).then(() => { if (active) setSaveState('Lokal gespeichert'); setProjects(current => [project, ...current.filter(p => p.id !== project.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); }).catch(() => { if (active) { setSaveState('Nicht gespeichert'); setError('Der lokale Speicher ist nicht verfügbar oder voll. Sichere das Projekt über „Projektdatei speichern“ oben rechts.'); } });
    try { localStorage.setItem('frame-active-project', project.id); } catch { /* IndexedDB remains authoritative. */ }
    return () => { active = false; };
  }, [project]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => () => downloads.forEach(file => URL.revokeObjectURL(file.url)), [downloads]);
  useEffect(() => setDownloads([]), [project]);
  const change = useCallback((next: Project) => {
    if (project) { undoStack.current.push(project); if (undoStack.current.length > 60) undoStack.current.shift(); }
    redoStack.current = []; setHistoryVersion(v => v + 1);
    setProject(reconcileInks({ ...next, updatedAt: new Date().toISOString() }));
  }, [project]);
  const updateItem = useCallback((id: string, changes: Partial<Artwork>) => { if (project) change({ ...project, artwork: project.artwork.map(a => a.id === id ? { ...a, ...changes } : a) }); }, [project, change]);
  const undo = useCallback((redo = false) => {
    const from = redo ? redoStack : undoStack, to = redo ? undoStack : redoStack;
    const next = from.current.pop();
    if (next && project) { to.current.push(project); setProject({ ...next, updatedAt: new Date().toISOString() }); setHistoryVersion(v => v + 1); setPreviewInk(null); }
  }, [project]);
  const importArtwork = useCallback((item: Artwork) => {
      const p = project ?? newProject(item.name || 'Mein Siebdruck');
      if (p.artwork.length >= 100 || p.artwork.reduce((sum, a) => sum + a.shapes.length, item.shapes.length) > 2500) throw new Error('Das Projekt ist zu komplex. Verwende höchstens 100 Motive und insgesamt 2.500 Vektorflächen.');
      const page = pageSize(p.print); item.x = (page.width - item.width) / 2; item.y = (page.height - item.height) / 2;
      change({ ...p, artwork: [...p.artwork, item] }); setSelectedId(item.id); setMode('design'); setPreviewInk(null); setError(''); setCodeOpen(false); setCode(''); setRasterFile(null);
      setNotice(item.kind === 'image' ? 'Bild als Vektoren übernommen. Die Druckfarben sind getrennt.' : 'Motiv importiert. Die Druckfarben sind getrennt.');
  }, [project, change]);
  const importSource = useCallback((source: string, name?: string) => {
    try {
      if (!ready) throw new Error('Die Vektor-Engine lädt noch. Bitte kurz warten.');
      importArtwork(importSvg(source, name || 'Eingefügtes Motiv'));
    } catch (e) { setError(message(e)); }
  }, [ready, importArtwork]);
  const importFile = useCallback(async (file?: File) => {
    if (!file) return;
    if (!ready) { setError('Die Werkzeuge laden noch. Bitte kurz warten.'); return; }
    if (isRasterFile(file)) { setError(''); setRasterFile({ file, key: crypto.randomUUID() }); return; }
    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') { setError('Dieses Dateiformat wird nicht unterstützt. Öffne ein Bild wie JPEG, PNG oder WebP oder eine SVG-Datei.'); return; }
    if (file.size > 2_000_000) { setError('Die SVG ist zu groß. Bitte unter 2 MB bleiben.'); return; }
    try { importSource(await file.text(), file.name); } catch (e) { setError(message(e)); }
  }, [ready, importSource]);
  useEffect(() => {
    const paste = async (e: ClipboardEvent) => {
      if (e.defaultPrevented || document.querySelector('[role="dialog"]') || isEditable(e.target) || !e.clipboardData || helpOpen || textOpen || codeOpen || rasterFile || editingShapes || deleteTarget) return;
      e.preventDefault();
      try { const source = await readClipboard(e.clipboardData); if (typeof source === 'string') importSource(source); else if (source) void importFile(source); else setError('Kein Bild oder SVG-Code gefunden. Kopiere ein Bild oder öffne eine Bild- oder SVG-Datei.'); } catch (error) { setError(message(error)); }
    };
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('[role="dialog"]') || isEditable(e.target) || helpOpen || textOpen || codeOpen || deleteTarget || rasterFile || editingShapes) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(e.shiftKey); }
      if (e.key === 'Escape') { setSelectedId(null); setPreviewInk(null); }
      if (mode === 'design' && project && selectedId && ['Delete', 'Backspace'].includes(e.key)) { e.preventDefault(); change({ ...project, artwork: project.artwork.filter(a => a.id !== selectedId) }); setSelectedId(null); }
      if (mode === 'design' && project && selectedId && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const a = project.artwork.find(a => a.id === selectedId); if (!a) return;
        e.preventDefault(); const n = e.shiftKey ? 10 : 1;
        updateItem(a.id, { x: a.x + (e.key === 'ArrowRight' ? n : e.key === 'ArrowLeft' ? -n : 0), y: a.y + (e.key === 'ArrowDown' ? n : e.key === 'ArrowUp' ? -n : 0) });
      }
    };
    document.addEventListener('paste', paste); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('paste', paste); document.removeEventListener('keydown', key); };
  }, [importSource, importFile, undo, updateItem, change, project, selectedId, mode, helpOpen, textOpen, codeOpen, deleteTarget, rasterFile, editingShapes]);
  const { result, preflight, calculating, elapsedMs } = useSeparation(project, ready);
  const displayedInk = result.masks.some(m => m.ink.id === previewInk) ? previewInk : null;
  const openProject = (p: Project) => { setProject(p); setMode('design'); setSelectedId(p.artwork[0]?.id ?? null); setPreviewInk(null); undoStack.current = []; redoStack.current = []; setHistoryVersion(v => v + 1); setError(''); };
  async function duplicate(p: Project) { const copy = { ...p, id: crypto.randomUUID(), name: `${p.name} Kopie`, updatedAt: new Date().toISOString() }; try { await saveProject(copy); setProjects(await listProjects()); setNotice('Projekt dupliziert.'); } catch (e) { setError(message(e)); } }
  function addText(item?: Artwork) { setEditingText(item ?? null); setTextOpen(true); }
  function submitText(text: string, textColor: string, fontId: string, fonts: ProjectFont[]) {
    if (!project) return;
    try {
      const a = makeText(text, textColor, editingText?.width ?? 100, fontId);
      if (editingText) { a.id = editingText.id; a.x = editingText.x; a.y = editingText.y; a.rotation = editingText.rotation; a.visible = editingText.visible; }
      else { const page = pageSize(project.print); a.x = (page.width - a.width) / 2; a.y = (page.height - a.height) / 2; }
      change({ ...project, fonts: fonts.length ? fonts : undefined, artwork: editingText ? project.artwork.map(item => item.id === a.id ? a : item) : [...project.artwork, a] });
      setSelectedId(a.id); setTextOpen(false); setPreviewInk(null); setError('');
    } catch (e) { setError(message(e)); }
  }
  async function exportPdf(open = false) {
    if (!project || !preflight || calculating) return;
    setExporting(true); setError('');
    // Open synchronously to keep the user gesture for popup-blocking browsers.
    const printWindow = open ? window.open('about:blank', '_blank') : null;
    if (printWindow) printWindow.opener = null;
    try {
      const bytes = await filmsPdf(preflight);
      const buffer = Uint8Array.from(bytes).buffer;
      if (open && printWindow) { const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' })); printWindow.location.href = url; setTimeout(() => URL.revokeObjectURL(url), 60000); }
      else { const name = `${safeFilename(project.name)}-Belichtungsfilme.pdf`; setDownloads([{ name, url: downloadFile(buffer, name, 'application/pdf', true) }]); setNotice('PDF erstellt. Falls der Download nicht startet, nutze den Dateilink unter den Export-Buttons.'); }
    } catch (e) { printWindow?.close(); setError(message(e)); } finally { setExporting(false); }
  }
  function exportSvg(film?: Film) {
    if (!project || !preflight || calculating || preflight.errors.length) return;
    setDownloads((film ? [film] : preflight.films).map((f, i) => { const name = `${safeFilename(project.name)}-${i + 1}-${safeFilename(f.name)}.svg`; return { name, url: downloadFile(filmSvg(f), name, 'image/svg+xml', true) }; }));
    if (!film && preflight.films.length > 1) setNotice('Erlaube mehrere Downloads im Browser, damit alle SVG-Filme gespeichert werden. Alternativ jeden Film einzeln laden.');
  }
  function home() { setProject(null); setMode('design'); setPreviewInk(null); undoStack.current = []; redoStack.current = []; try { localStorage.removeItem('frame-active-project'); } catch { /* Optional preference. */ } }
  async function importProject(file?: File) {
    if (!file) return;
    try {
      if (file.size > 60_000_000) throw new Error('Die Projektdatei ist zu groß.');
      const parsed = projectSchema.parse(JSON.parse(await file.text()));
      // Rebuild canonical geometry from originals; never trust serialized paths.
      const artwork = parsed.artwork.map(a => { const rebuilt = a.kind === 'image' ? importImageSvg(a.sourceSVG, a.name) : importSvg(a.sourceSVG, a.name); return { ...a, shapes: rebuilt.shapes, isMosaic: rebuilt.isMosaic }; });
      const p = reconcileInks({ ...parsed, artwork, id: crypto.randomUUID(), updatedAt: new Date().toISOString() });
      openProject(p); setNotice('Projektdatei geöffnet.');
    } catch { setError('Diese Projektdatei ist ungültig oder enthält nicht unterstützte SVGs. Öffne eine von FRAME gespeicherte .frame.json-Datei.'); }
  }
  return <div className="app" data-geometry-ms={elapsedMs ?? undefined} data-geometry-pending={calculating} aria-busy={!ready} onDragEnter={e => { if (document.querySelector('[role="dialog"]')) return; if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); dragDepth.current++; setDragging(true); } }} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }} onDrop={e => { e.preventDefault(); dragDepth.current = 0; setDragging(false); if (document.querySelector('[role="dialog"]')) return; void importFile(e.dataTransfer.files[0]); }}>
    <a className="skip-link" href="#workspace">Zum Arbeitsbereich</a><input ref={fileInput} type="file" accept="image/*,.svg,.heic,.heif,.tif,.tiff" hidden onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }}/><input ref={projectInput} type="file" accept=".json" hidden onChange={e => { void importProject(e.target.files?.[0]); e.target.value = ''; }}/>
    {error && !codeOpen && !textOpen && !rasterFile && !editingShapes && <div className="app-alert" role="alert"><CircleAlert size={19}/><p>{error}</p><Button variant="ghost" size="icon" aria-label="Fehlermeldung schließen" onClick={() => setError('')}><X size={18}/></Button></div>}
    {notice && <div className="toast" role="status"><Check size={17}/>{notice}</div>}
    {!project ? <><Home ready={ready} demo={demo} projects={projects} dragging={dragging} onImport={() => fileInput.current?.click()} onCode={() => setCodeOpen(true)} onDemo={() => importSource(demoSvg(), 'Grow your own.svg')} onOpen={openProject} onDuplicate={p => void duplicate(p)} onDelete={setDeleteTarget} onHelp={() => setHelpOpen(true)}/><div className="project-file-open"><Button variant="ghost" disabled={!ready} onClick={() => projectInput.current?.click()}>Gesicherte Projektdatei öffnen</Button></div></> : <>
      <header className="editor-header"><div className="editor-brand"><button className="logo-home" onClick={home} aria-label="Zur Projektübersicht"><Logo/></button><span className="header-divider"/><div className="project-name-wrap"><label><span className="sr-only">Projektname</span><input className="project-name" value={project.name} maxLength={200} onChange={e => change({ ...project, name: e.target.value })}/></label><span className={`save-state ${saveState === 'Nicht gespeichert' ? 'save-error' : ''}`} role="status"><span className="status-dot"/>{saveState}</span></div></div><nav className="mode-switch" aria-label="Arbeitsmodus"><button className={mode === 'design' ? 'active' : ''} aria-current={mode === 'design' ? 'page' : undefined} onClick={() => setMode('design')}><Layers2 size={15}/>Design</button><button className={mode === 'print' ? 'active' : ''} aria-current={mode === 'print' ? 'page' : undefined} onClick={() => setMode('print')}><ScanLine size={15}/>Filme</button></nav><div className="header-actions"><Button variant="ghost" size="icon" aria-label="Projektdatei speichern" onClick={() => downloadFile(JSON.stringify(project, null, 2), `${safeFilename(project.name)}.frame.json`, 'application/json')}><FileDown size={18}/></Button><Button variant="ghost" size="icon" aria-label="Hilfe und Tastenkürzel" onClick={() => setHelpOpen(true)}><CircleHelp size={18}/></Button>{mode === 'design' && <Button onClick={() => setMode('print')}>Druckvorbereitung <ArrowRight size={17}/></Button>}</div></header>
      {mode === 'design' ? <><div className="editor-subbar"><Button variant="ghost" size="small" onClick={home}><ArrowLeft size={15}/>Projekte</Button><div className="canvas-view-switch"><button className={!displayedInk ? 'active' : ''} aria-pressed={!displayedInk} onClick={() => setPreviewInk(null)}>Gesamtes Motiv</button><span>/</span><span>{displayedInk ? result.masks.find(m => m.ink.id === displayedInk)?.ink.name : 'Farben gemeinsam ansehen'}</span></div><div className="history-actions" data-version={historyVersion}><Button variant="ghost" size="icon" aria-label="Rückgängig" disabled={!undoStack.current.length} onClick={() => undo()}><Undo2 size={17}/></Button><Button variant="ghost" size="icon" aria-label="Wiederholen" disabled={!redoStack.current.length} onClick={() => undo(true)}><Redo2 size={17}/></Button></div></div><main className="editor-workspace" id="workspace"><h1 className="sr-only">FRAME Design-Werkbank</h1><ArtworkPanel project={project} selectedId={selectedId} setSelectedId={setSelectedId} updateItem={updateItem} change={change} onImport={() => fileInput.current?.click()} onText={addText} onShapes={setEditingShapes}/><ArtworkCanvas project={project} result={result} selectedId={selectedId} setSelectedId={setSelectedId} previewInk={displayedInk} updateItem={updateItem} calculating={calculating}/><InkPanel project={project} result={result} change={change} previewInk={displayedInk} setPreviewInk={setPreviewInk}/></main>{result.error && <div role="alert" className="engine-error">{result.error}</div>}<footer className="editor-footer"><span><span className="status-dot"/>Alles bleibt auf deinem Gerät.</span><span>{calculating ? 'Filme werden im Hintergrund aktualisiert …' : preflight?.errors.length ? 'Druckvorbereitung: Einstellungen prüfen' : 'Vektoren geprüft · Filmexport verfügbar'}</span><span>MM · KNOCKOUT</span></footer></> : preflight && <div id="workspace"><PrintView project={project} preflight={preflight} change={change} onBack={() => setMode('design')} onPdf={open => void exportPdf(open)} onSvg={exportSvg} exporting={exporting} calculating={calculating} downloads={downloads}/></div>}
    </>}
    {dragging && project && <div className="drop-overlay"><FileDown size={44}/><strong>Bild oder SVG ablegen und hinzufügen</strong></div>}
    {rasterFile && <RasterImportDialog key={rasterFile.key} file={rasterFile.file} onClose={() => setRasterFile(null)} onChoose={() => fileInput.current?.click()} onImport={importArtwork}/>}
    {editingShapes && project && <EditShapesDialog key={editingShapes.id} item={editingShapes} onClose={() => setEditingShapes(null)} onSave={item => { change({ ...project, artwork: item ? project.artwork.map(a => a.id === item.id ? item : a) : project.artwork.filter(a => a.id !== editingShapes.id) }); if (!item) setSelectedId(null); setEditingShapes(null); setPreviewInk(null); }}/>}
    <Modal title="SVG-Code einfügen" description="Kopiere den SVG-Code aus deinem Zeichenprogramm. FRAME prüft die Grafik und trennt ihre Druckfarben." open={codeOpen} onOpenChange={setCodeOpen}><form onSubmit={e => { e.preventDefault(); importSource(code); }}>{error && <p className="inline-error" role="alert">{error}</p>}<label className="field"><span>SVG-Code</span><textarea autoFocus rows={9} value={code} onChange={e => setCode(e.target.value)} placeholder={'<svg viewBox="0 0 100 100">…</svg>'}/></label><Button type="submit" className="full-width" disabled={!code.trim() || !ready}>Motiv importieren <ArrowRight size={17}/></Button></form></Modal>
    {textOpen && project && <TextDialog key={editingText?.id ?? 'new'} item={editingText} fonts={project.fonts ?? []} onClose={() => setTextOpen(false)} onSave={submitText}/>}
    <Modal title="Deine Druckwerkstatt, kurz erklärt." description="Vom Bild oder der Vektorgrafik zum Belichtungsfilm in drei Schritten." open={helpOpen} onOpenChange={setHelpOpen}><ol className="help-steps"><li><strong>Bild oder SVG mitbringen</strong><p>Öffne ein JPEG, PNG oder WebP. Wähle im Bildimport wenige Druckfarben und prüfe die Vektorisierung. Bilder kannst du auch ablegen oder mit Cmd/Ctrl+V einfügen. In Figma: Rechtsklick → Copy/Paste as → Copy as SVG. In Illustrator: SVG als Zwischenablageformat aktivieren oder eine SVG-Datei exportieren. Text vorher in Pfade umwandeln.</p></li><li><strong>Motiv und Farben prüfen</strong><p>Ändere Maße in Millimetern. Schau jede schwarze Belichtungsmaske an. Obere Flächen sparen darunterliegende Farben aus. Unter „Farben zuordnen“ legst du Druckfarben zusammen.</p></li><li><strong>Filme exportieren</strong><p>Wähle Papier und Passkreuze. Drucke das PDF bei 100 % / tatsächlicher Größe auf geeignete Transparentfolie. Prüfe Maße und Deckkraft vor der Belichtung.</p></li></ol><div className="shortcut-list"><span>Bild oder SVG einfügen<kbd>⌘ / Ctrl + V</kbd></span><span>Rückgängig<kbd>⌘ / Ctrl + Z</kbd></span><span>Wiederholen<kbd>⇧ + ⌘ / Ctrl + Z</kbd></span><span>Motiv bewegen<kbd>↑ ↓ ← → · Shift = 10 mm</kbd></span><span>Auswahl aufheben<kbd>Esc</kbd></span></div><p className="help-note">Bilder werden lokal auf bis zu acht deckende Druckfarben reduziert und vektorisiert. Für Rastermotive und Sprenkel erhält der Bildstil „Raster & Sprenkel erhalten“ die vorhandenen Details. Verläufe werden auf Druckfarben reduziert. JPEG, PNG und WebP sind die empfohlenen Bildformate; weitere Formate hängen vom Browser ab. SVGs mit eingebetteten Bildern, Masken, Filtern oder externen Schriften bitte vorher vereinfachen. Unter „Flächen bearbeiten“ kannst du Teile eines Motivs entfernen. Die ursprünglichen Objekte und Schriftarten eines Pixelbilds werden nicht wiederhergestellt.</p></Modal>
    <Modal title="Projekt löschen?" description={`„${deleteTarget?.name ?? ''}“ wird aus diesem Browser entfernt. Andere Projekte bleiben erhalten.`} open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}><div className="dialog-actions"><Button variant="outline" onClick={() => setDeleteTarget(null)}>Behalten</Button><Button variant="danger" onClick={async () => { if (!deleteTarget) return; try { await deleteProject(deleteTarget.id); setProjects(await listProjects()); setDeleteTarget(null); } catch (e) { setError(message(e)); } }}>Projekt löschen</Button></div></Modal>
  </div>;
}
