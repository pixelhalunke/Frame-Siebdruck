import { initGeometry } from '../../core/geometry/engine';
import { combinedBounds, separateArtwork, type Separation } from '../../core/separation/separate';
import { prepareFilms } from '../../core/print/films';
import type { GeometryJob, GeometryReply } from './queue';
let cachedRevision = -1, cached: Separation | undefined;
self.onmessage = async (e: MessageEvent<GeometryJob>) => {
  const { id, revision, project } = e.data, start = performance.now();
  try {
    await initGeometry();
    if (!cached || cachedRevision !== revision) { cached = separateArtwork(project); cachedRevision = revision; }
    const masks = cached.masks.flatMap(m => { const ink = project.inks.find(i => i.id === m.ink.id); return ink ? [{ ...m, ink }] : []; });
    const separation = { ...cached, masks, bounds: combinedBounds(masks.filter(m => m.ink.enabled).map(m => m.bounds)) };
    const reply: GeometryReply = { id, separation, preflight: prepareFilms(project, separation), elapsedMs: performance.now() - start };
    self.postMessage(reply);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Die Druckfarben konnten nicht berechnet werden.';
    self.postMessage({ id, separation: { masks: [], bounds: null, error: message }, preflight: { films: [], bounds: null, errors: [message], warnings: [] }, elapsedMs: performance.now() - start } satisfies GeometryReply);
  }
};
