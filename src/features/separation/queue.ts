import type { Project } from '../../core/project/model';
import type { Separation } from '../../core/separation/separate';
import type { Preflight } from '../../core/print/films';
export type GeometryJob = { id: string; revision: number; project: Project };
export type GeometryReply = { id: string; separation: Separation; preflight: Preflight; elapsedMs: number };
/** One running calculation, one replaceable successor. Obsolete work never
 * reaches the preview or export controls; the worker stays warm between jobs. */
export class SeparationQueue {
  private worker?: Worker;
  private active?: GeometryJob;
  private desired?: GeometryJob;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private receive: (job: GeometryJob, result: GeometryReply | Error) => void) {}
  submit(job: GeometryJob) { this.desired = job; if (!this.active) this.start(job); }
  private start(job: GeometryJob) {
    this.active = job;
    try {
      if (!this.worker) {
        this.worker = new Worker(new URL('./geometry.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e: MessageEvent<GeometryReply>) => { if (e.data.id === this.active?.id) this.finish(e.data); };
        this.worker.onerror = () => this.fail('Die Filmaufbereitung konnte nicht starten. Lade FRAME neu und versuche es erneut.');
      }
      this.timer = setTimeout(() => this.fail('Die Filmaufbereitung dauert zu lange. Vereinfache überlappende Motive und versuche es erneut.'), 30000);
      this.worker.postMessage(job);
    } catch { this.fail('Die Motive konnten nicht verarbeitet werden. Lade FRAME neu und versuche es erneut.'); }
  }
  private fail(message: string) { this.worker?.terminate(); this.worker = undefined; this.finish(new Error(message)); }
  private finish(result: GeometryReply | Error) {
    clearTimeout(this.timer);
    const completed = this.active; this.active = undefined;
    if (!completed) return;
    if (this.desired?.id !== completed.id) { if (this.desired) this.start(this.desired); return; }
    this.receive(completed, result);
  }
  dispose() { clearTimeout(this.timer); this.worker?.terminate(); this.worker = undefined; this.active = undefined; this.desired = undefined; }
}
