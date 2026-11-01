import type { Path } from 'opentype.js';
import { importSvg } from '../../core/svg/import';
import type { Artwork } from '../../core/project/model';
import { DEFAULT_FONT, fontFor } from './fonts';
export { initFont } from './fonts';
export function textPath(text: string, size = 100, fontId = DEFAULT_FONT) {
  const font = fontFor(fontId); text = text.normalize('NFC');
  if (!text.trim()) throw new Error('Gib einen Text ein.');
  if (text.length > 120) throw new Error('Bitte höchstens 120 Zeichen pro Textelement verwenden.');
  if ([...text].some(c => !font!.charToGlyphIndex(c))) throw new Error('Ein Zeichen fehlt in dieser Schrift. Wähle eine andere Schrift oder ändere das Zeichen.');
  const renderOptions = { kerning: true, drawSVG: false, drawLayers: false };
  let path: Path;
  try { path = font.getPath(text, 0, 0, size, renderOptions); }
  catch {
    // Some fonts contain a contextual GSUB format unsupported by OpenType.js.
    // Latin text can still use its exact glyph contours and pair kerning.
    // Complex scripts must not silently fall back to isolated glyphs.
    if (!/^[\p{Script=Latin}\p{Number}\p{Punctuation}\p{Separator}\p{Symbol}]+$/u.test(text)) throw new Error('Diese Schrift kann den Text nicht korrekt setzen. Wähle eine andere Schrift.');
    path = font.getPath('', 0, 0, size, renderOptions);
    const glyphs = [...text].map(c => font.charToGlyph(c)), scale = size / font.unitsPerEm;
    let x = 0;
    glyphs.forEach((glyph, i) => {
      path.extend(glyph.getPath(x, 0, size, renderOptions, font));
      x += (glyph.advanceWidth ?? 0) * scale;
      if (i + 1 < glyphs.length) x += font.getKerningValue(glyph, glyphs[i + 1]) * scale;
    });
  }
  const box = path.getBoundingBox();
  if (box.x2 <= box.x1 || box.y2 <= box.y1) throw new Error('Der Text enthält keine druckbaren Zeichen.');
  // Serialize finite outline coordinates ourselves. The bundled OpenType release's
  // optimized toPathData formatter can emit NaN for e.g. 109.00000000000001.
  const n = (value: number) => { if (!Number.isFinite(value)) throw new Error('Die Schriftkontur enthält ungültige Koordinaten.'); return String(+value.toFixed(5)); };
  const d = path.commands.map(command => {
    switch (command.type) {
      case 'M': case 'L': return `${command.type}${n(command.x)} ${n(command.y)}`;
      case 'Q': return `Q${n(command.x1)} ${n(command.y1)} ${n(command.x)} ${n(command.y)}`;
      case 'C': return `C${n(command.x1)} ${n(command.y1)} ${n(command.x2)} ${n(command.y2)} ${n(command.x)} ${n(command.y)}`;
      case 'Z': return 'Z';
    }
  }).join('');
  return { d, x: box.x1, y: box.y1, width: box.x2 - box.x1, height: box.y2 - box.y1 };
}
export function makeText(text: string, color: string, width = 100, fontId = DEFAULT_FONT): Artwork {
  const p = textPath(text, 100, fontId);
  const height = width * p.height / p.width;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="${p.x} ${p.y} ${p.width} ${p.height}"><path fill="${color}" d="${p.d}"/></svg>`;
  return { ...importSvg(svg, text), kind: 'text', text, fontId };
}
