import { MAX_IMAGE_SVG_CHARS, type TraceResult } from './types';

/** Only generated numbers, hex colors and path commands enter this SVG. No raster is embedded. */
export function traceSvg(result: Pick<TraceResult, 'width' | 'height' | 'shapes' | 'preserveTexture'>, widthMm: number) {
  if (!Number.isFinite(widthMm) || widthMm < 1 || widthMm > 1000) throw new Error('Wähle eine Breite zwischen 1 und 1.000 mm.');
  const heightMm = widthMm * result.height / result.width;
  if (heightMm > 10000) throw new Error('Das Seitenverhältnis ergibt ein zu hohes Motiv. Verringere die Breite.');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${result.width} ${result.height}"${result.preserveTexture ? ' data-frame-mosaic="1"' : ''}>${result.shapes.map(s => `<path fill="${s.color}" fill-rule="evenodd" d="${s.d}"/>`).join('')}</svg>`;
  if (svg.length > MAX_IMAGE_SVG_CHARS) throw new Error('Die Vektorgrafik überschreitet das Detailbudget. Wähle weniger Farben oder eine kleinere Bilddatei.');
  return svg;
}
