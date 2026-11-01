import type { Artwork } from '../../core/project/model';
import { imageRegions, importImageSvg } from '../../core/raster/artwork';
import { traceSvg } from '../../core/raster/svg';
import type { EditableRegion } from './regions';
import { importSvg } from '../../core/svg/import';

/** Persist edits in the canonical source too: project-file reload rebuilds geometry from it. */
export function replaceShapes(item: Artwork, shapes: EditableRegion[]): Artwork {
  if (!shapes.length) throw new Error('Behalte mindestens eine Fläche. Ein ganzes Motiv kannst du im Editor löschen.');
  if (item.kind === 'image') {
    const regions = imageRegions(item);
    const rebuilt = importImageSvg(traceSvg({ ...regions, shapes }, item.sourceWidth), item.name);
    return { ...item, sourceSVG: rebuilt.sourceSVG, shapes: rebuilt.shapes, isMosaic: rebuilt.isMosaic };
  }
  const groups: { id: string; color: string; paths: string[] }[] = [];
  for (const s of shapes) {
    const id = s.sourceId ?? s.id;
    if (groups.at(-1)?.id !== id) groups.push({ id, color: s.color, paths: [] });
    groups.at(-1)!.paths.push(s.d);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${item.sourceWidth}mm" height="${item.sourceHeight}mm" viewBox="0 0 ${item.sourceWidth} ${item.sourceHeight}">${groups.map(s => `<path fill="${s.color}" fill-rule="evenodd" d="${s.paths.join('')}"/>`).join('')}</svg>`;
  const rebuilt = importSvg(svg, item.name);
  return { ...item, sourceSVG: svg, shapes: rebuilt.shapes, ...(item.kind === 'text' ? { kind: 'svg', text: undefined } : {}) };
}
