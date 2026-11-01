import { useEffect, useMemo, useRef, useState } from 'react';
import type { Artwork, Project } from '../../core/project/model';
import { combinedBounds } from '../../core/separation/separate';
import { SeparationQueue, type GeometryReply, type GeometryJob } from './queue';
const fields = ['id', 'shapes', 'sourceWidth', 'sourceHeight', 'x', 'y', 'width', 'height', 'rotation', 'visible', 'isMosaic'] as const;
export function sameArtworkGeometry(a: Artwork[], b: Artwork[]) { return a.length === b.length && a.every((item, i) => fields.every(field => item[field] === b[i][field])); }
export function useSeparation(project: Project | null, ready: boolean) {
  const previous = useRef<{ projectId: string; artwork: Artwork[]; mapping: Project['mapping']; revision: number } | null>(null);
  const client = useRef<SeparationQueue | null>(null), serial = useRef(0);
  const [output, setOutput] = useState<{ job: GeometryJob; reply: GeometryReply } | null>(null);
  if (project && (!previous.current || previous.current.projectId !== project.id || previous.current.mapping !== project.mapping || !sameArtworkGeometry(previous.current.artwork, project.artwork))) previous.current = { projectId: project.id, artwork: project.artwork, mapping: project.mapping, revision: ++serial.current };
  const revision = previous.current?.revision ?? 0;
  const inkKey = project?.inks.map(i => `${i.id}:${+i.enabled}`).join('|');
  const job = useMemo(() => {
    if (!project || !ready) return null;
    // Source XML, font files and undo history are unnecessary in the worker.
    const clean: Project = { version: 1, id: project.id, name: '', updatedAt: '', mapping: project.mapping, inks: project.inks, print: project.print, artwork: project.artwork.map(a => ({ ...a, sourceSVG: '' })) };
    return { id: crypto.randomUUID(), revision, project: clean };
  }, [revision, inkKey, project?.print, project?.id, ready]);
  useEffect(() => {
    const queue = new SeparationQueue((completed, data) => {
      if (data instanceof Error) setOutput({ job: completed, reply: { id: completed.id, elapsedMs: 0, separation: { masks: [], bounds: null, error: data.message }, preflight: { films: [], bounds: null, errors: [data.message], warnings: [] } } });
      else setOutput({ job: completed, reply: data });
    });
    client.current = queue;
    return () => { queue.dispose(); client.current = null; };
  }, []);
  useEffect(() => { if (job) client.current?.submit(job); else client.current?.dispose(); }, [job]);
  const data = output?.job.project.id === project?.id ? output?.reply : null;
  const result = useMemo(() => {
    const masks = data?.separation.masks.flatMap(m => { const ink = project?.inks.find(i => i.id === m.ink.id); return ink ? [{ ...m, ink }] : []; }) ?? [];
    return { masks, error: data?.separation.error ?? null, bounds: combinedBounds(masks.filter(m => m.ink.enabled).map(m => m.bounds)) };
  }, [data, project?.inks]);
  const preflight = useMemo(() => data ? { ...data.preflight, films: data.preflight.films.map(f => { const ink = project?.inks.find(i => i.id === f.inkId); return { ...f, name: ink?.name ?? f.name, color: ink?.color ?? f.color }; }) } : { films: [], bounds: null, errors: [], warnings: [] }, [data, project?.inks]);
  return { result, preflight, calculating: !!job && output?.job.id !== job.id, elapsedMs: data?.elapsedMs ?? null };
}
