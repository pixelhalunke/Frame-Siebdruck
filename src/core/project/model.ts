import { z } from 'zod';

const finite = z.number().finite();
const positive = finite.positive().max(10000);
export const shapeSchema = z.object({ id: z.string(), d: z.string().max(16_000_000), color: z.string().regex(/^#[\da-f]{6}$/i) });
export const artworkSchema = z.object({
  id: z.string(), name: z.string().max(200), kind: z.enum(['svg', 'text', 'image']), sourceSVG: z.string().max(16_000_000),
  shapes: z.array(shapeSchema).max(2500), sourceWidth: positive, sourceHeight: positive,
  x: finite.min(-10000).max(10000), y: finite.min(-10000).max(10000), width: positive, height: positive,
  rotation: finite, visible: z.boolean(), isMosaic: z.boolean().optional(), text: z.string().optional(), fontId: z.string().max(100).optional(),
});
export const inkSchema = z.object({ id: z.string(), name: z.string().max(100), color: z.string().regex(/^#[\da-f]{6}$/i), enabled: z.boolean() });
export const projectFontSchema = z.object({ id: z.string().regex(/^custom-[a-f0-9]{32}$/), name: z.string().max(100), data: z.string().min(4).max(4_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/) });
export type ProjectFont = z.infer<typeof projectFontSchema>;
export const projectSchema = z.object({
  version: z.literal(1), id: z.string(), name: z.string().max(200), updatedAt: z.string(),
  artwork: z.array(artworkSchema).max(100), fonts: z.array(projectFontSchema).max(10).optional(), inks: z.array(inkSchema), mapping: z.record(z.string(), z.string()),
  print: z.object({ paper: z.enum(['A4', 'A3']), landscape: z.boolean(), scale: finite.min(0.1).max(4), marks: z.boolean(), mirrored: z.boolean() }),
}).refine(p => p.artwork.reduce((sum, a) => sum + a.shapes.length, 0) <= 2500, 'Höchstens 2.500 Vektorflächen pro Projekt.');
export type Shape = z.infer<typeof shapeSchema>;
export type Artwork = z.infer<typeof artworkSchema>;
export type Ink = z.infer<typeof inkSchema>;
export type Project = z.infer<typeof projectSchema>;
export type PrintSettings = Project['print'];
export function newProject(name = 'Unbenanntes Projekt'): Project {
  return { version: 1, id: crypto.randomUUID(), name, updatedAt: new Date().toISOString(), artwork: [], inks: [], mapping: {}, print: { paper: 'A4', landscape: false, scale: 1, marks: true, mirrored: false } };
}
export function pageSize(settings: PrintSettings) {
  const [w, h] = settings.paper === 'A4' ? [210, 297] : [297, 420];
  return { width: settings.landscape ? h : w, height: settings.landscape ? w : h };
}
export function inkName(color: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  if (Math.max(r, g, b) < 25 || (Math.max(r, g, b) < 65 && Math.max(r, g, b) - Math.min(r, g, b) < 15)) return 'Schwarz';
  if (Math.min(r, g, b) > 225) return 'Weiß';
  if ((Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b) < .14) return 'Grau';
  if (r > 160 && g > 130 && b < 140) return 'Gelb';
  if (r > g * 1.25 && r > b * 1.2) return g > 105 ? 'Orange' : 'Rot';
  if (g > r && g > b * 0.9) return 'Grün';
  if (b > r * 1.1) return 'Blau';
  return 'Violett';
}
export function reconcileInks(project: Project): Project {
  let inks = project.inks, mapping = project.mapping;
  const colors = [...new Set(project.artwork.flatMap(a => a.shapes.map(s => s.color)))];
  for (const color of colors) if (!inks.some(i => i.id === mapping[color])) {
    const id = `ink-${color.slice(1)}`;
    if (!inks.some(i => i.id === id)) inks = [...inks, { id, name: inkName(color), color, enabled: true }];
    mapping = { ...mapping, [color]: id };
  }
  return { ...project, inks, mapping };
}
