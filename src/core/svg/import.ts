import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import { canonical, kit, path, transformPath, boundsOf, operation } from '../geometry/engine';
import type { Artwork, Shape } from '../project/model';
extend([namesPlugin]);

const PX_MM = 25.4 / 96;
const allowedTags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'title', 'desc', 'metadata', 'defs']);
const props = new Set(['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'fill-rule', 'fill-opacity', 'stroke-opacity', 'opacity', 'display', 'visibility', 'color', 'overflow']);
const attributes = new Set(['id', 'class', 'version', 'xmlns', 'xmlns:xlink', 'viewBox', 'width', 'height', 'preserveAspectRatio', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'x2', 'y1', 'y2', 'd', 'points', 'transform', 'style', 'role', ...props]);
const defaultStyle: Record<string, string> = { fill: '#000000', stroke: 'none', 'stroke-width': '1', 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter', 'stroke-miterlimit': '4', 'fill-rule': 'nonzero', 'fill-opacity': '1', 'stroke-opacity': '1', color: '#000000', visibility: 'visible' };
const hint = 'Wandle Text und Effekte im Zeichenprogramm in einfache, deckende Pfade um und exportiere erneut als SVG.';

function fail(message: string): never { throw new Error(`${message} ${hint}`); }
function length(value: string | null, fallback = 0): number {
  if (value === null || value.trim() === '') return fallback;
  const m = value.trim().match(/^([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)(px|mm|cm|in|pt|pc)?$/i);
  if (!m) fail(`Die Längenangabe „${value}“ wird noch nicht unterstützt.`);
  const n = Number(m[1]) * ({ px: 1, mm: 96 / 25.4, cm: 960 / 25.4, in: 96, pt: 96 / 72, pc: 16 }[m[2]?.toLowerCase() || 'px'] ?? 1);
  if (!Number.isFinite(n) || Math.abs(n) > 100000) fail('Die Grafik enthält zu große oder ungültige Koordinaten.');
  return n;
}
function numericList(s: string) {
  if (/[^\d\s,.eE+-]/.test(s)) fail('Ungültige Vektorkoordinaten.');
  const tokens = s.trim().match(/[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?/gi) ?? [];
  const numbers = tokens.map(Number);
  if (numbers.some(n => !Number.isFinite(n) || Math.abs(n) > 100000)) fail('Zu große Vektorkoordinaten.');
  return numbers;
}
function checkedTransform(value: string | null) {
  if (!value) return '';
  const functions = [...value.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)];
  if (value.replace(/(matrix|translate|scale|rotate|skewX|skewY)\s*\([^)]*\)/g, '').replace(/[\s,]/g, '')) fail('Diese Transformation wird nicht unterstützt.');
  for (const [, name, args] of functions) {
    const count = numericList(args).length;
    const valid = name === 'matrix' ? count === 6 : name === 'rotate' ? count === 1 || count === 3 : name.startsWith('skew') ? count === 1 : count === 1 || count === 2;
    if (!valid) fail('Eine SVG-Transformation ist unvollständig.');
  }
  return value;
}
function styleFor(el: Element, parent: Record<string, string>) {
  const style = { ...parent };
  delete style.opacity; delete style.display; delete style.overflow;
  for (const name of props) if (el.hasAttribute(name)) style[name] = el.getAttribute(name)!;
  for (const declaration of (el.getAttribute('style') ?? '').split(';')) {
    if (!declaration.trim()) continue;
    const split = declaration.indexOf(':');
    const key = declaration.slice(0, split).trim(), value = declaration.slice(split + 1).trim();
    if (!props.has(key) || !value || value.includes('!')) fail(`Die SVG-Stileigenschaft „${key}“ wird noch nicht unterstützt.`);
    style[key] = value;
  }
  for (const key of Object.keys(style)) if (style[key] === 'inherit') style[key] = parent[key] ?? defaultStyle[key] ?? '1';
  return style;
}
function paint(value: string, style: Record<string, string>): string | null {
  if (value === 'none') return null;
  const color = colord(value === 'currentColor' ? style.color : value);
  if (!color.isValid() || color.alpha() !== 1) fail('Nur deckende, einfarbige Füllungen und Konturen werden unterstützt.');
  return color.toHex();
}
function shapePath(el: Element): string {
  const n = (key: string, fallback = 0) => length(el.getAttribute(key), fallback);
  const tag = el.localName;
  if (tag === 'path') return el.getAttribute('d') ?? '';
  if (tag === 'line') return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
  if (tag === 'polygon' || tag === 'polyline') {
    const points = numericList(el.getAttribute('points') ?? '');
    if (points.length % 2) fail('Die Punktliste ist unvollständig.');
    return points.length < 4 ? '' : `M${points[0]} ${points[1]}${points.slice(2).map((v, i) => `${i % 2 ? ' ' : 'L'}${v}`).join('')}${tag === 'polygon' ? 'Z' : ''}`;
  }
  if (tag === 'circle' || tag === 'ellipse') {
    const cx = n('cx'), cy = n('cy'), rx = tag === 'circle' ? n('r') : n('rx'), ry = tag === 'circle' ? rx : n('ry');
    if (rx < 0 || ry < 0) fail('Negative Radien sind ungültig.');
    if (!rx || !ry) return '';
    return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
  }
  const x = n('x'), y = n('y'), w = n('width'), h = n('height');
  if (w < 0 || h < 0) fail('Negative Abmessungen sind ungültig.');
  if (!w || !h) return '';
  const rx = Math.min(w / 2, n('rx', n('ry'))), ry = Math.min(h / 2, n('ry', rx));
  if (rx < 0 || ry < 0) fail('Negative Radien sind ungültig.');
  return rx && ry ? `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z` : `M${x} ${y}h${w}v${h}h${-w}Z`;
}

/** Original XML is stored but never inserted in the DOM. Only canonical paths are rendered. */
export function importSvg(source: string, name = 'SVG-Motiv', maxCharacters = 2_000_000): Artwork {
  if (source.length > maxCharacters) throw new Error('Die SVG ist zu groß. Bitte unter dem Detailbudget bleiben.');
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(source)) throw new Error('Externe XML-Definitionen sind nicht erlaubt. Exportiere eine SVG ohne DTD.');
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.localName !== 'svg') throw new Error('Keine gültige SVG gefunden. Füge SVG-Code ein oder öffne eine .svg-Datei.');
  const elements = [...root.querySelectorAll('*')];
  if (elements.length > 2500) throw new Error('Die Grafik enthält zu viele Elemente. Bitte unter 2.500 Formen bleiben.');
  for (const el of [root, ...elements]) {
    if (el.closest('metadata') && el.localName !== 'metadata') continue;
    if (!allowedTags.has(el.localName)) fail(`„${el.localName}“ wird in dieser Version nicht unterstützt.`);
    if (el.localName === 'svg' && el !== root) fail('Verschachtelte SVG-Zeichenflächen werden noch nicht unterstützt.');
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('xmlns:') || attr.name.startsWith('aria-') || attr.name.startsWith('data-')) continue;
      if (!attributes.has(attr.name)) fail(`Das SVG-Attribut „${attr.name}“ wird nicht unterstützt.`);
      if (/url\s*\(|javascript:|https?:\/\//i.test(attr.value) && !attr.name.startsWith('xmlns')) fail('Externe Ressourcen und SVG-Effekte werden nicht geladen.');
    }
  }
  const vb = root.hasAttribute('viewBox') ? numericList(root.getAttribute('viewBox')!) : [0, 0, length(root.getAttribute('width')), length(root.getAttribute('height'))];
  if (vb.length !== 4 || vb[2] <= 0 || vb[3] <= 0) throw new Error('Die SVG braucht eine gültige viewBox oder feste Breite und Höhe.');
  const viewportW = length(root.getAttribute('width'), vb[2]);
  const viewportH = length(root.getAttribute('height'), vb[3]);
  if (viewportW <= 0 || viewportH <= 0) throw new Error('Breite und Höhe müssen größer als null sein.');
  const width = viewportW * PX_MM, height = viewportH * PX_MM;
  if (width > 10000 || height > 10000) fail('Die SVG-Zeichenfläche ist zu groß.');
  const aspect = root.getAttribute('preserveAspectRatio')?.trim() || 'xMidYMid meet';
  if (!['none', 'xMidYMid', 'xMidYMid meet'].includes(aspect)) fail('Diese viewBox-Ausrichtung wird noch nicht unterstützt. Nutze xMidYMid meet oder none.');
  const sx = width / vb[2], sy = height / vb[3], fit = Math.min(sx, sy);
  const rootTransform = aspect === 'none' ? `scale(${sx} ${sy}) translate(${-vb[0]} ${-vb[1]})` : `translate(${(width - vb[2] * fit) / 2} ${(height - vb[3] * fit) / 2}) scale(${fit}) translate(${-vb[0]} ${-vb[1]})`;
  const shapes: Shape[] = [];
  const viewport = path(`M0 0H${width}V${height}H0Z`);
  const rootStyle = styleFor(root, defaultStyle);
  function walk(el: Element, parent: Record<string, string>, transform: string) {
    if (['defs', 'metadata', 'title', 'desc'].includes(el.localName)) return;
    const style = styleFor(el, parent);
    if (style.display === 'none' || Number(style.opacity ?? 1) === 0) return;
    if (style.display && !['inline', 'block'].includes(style.display)) fail('Diese Sichtbarkeitseinstellung wird nicht unterstützt.');
    for (const key of ['opacity', 'fill-opacity', 'stroke-opacity']) if (style[key] !== undefined && ![0, 1].includes(Number(style[key]))) fail('Transparente oder halbtransparente Farben werden noch nicht unterstützt.');
    if (!['nonzero', 'evenodd'].includes(style['fill-rule'])) fail('Diese Füllregel wird nicht unterstützt.');
    const tx = `${transform} ${checkedTransform(el.getAttribute('transform'))}`;
    if (el.localName === 'g' || el.localName === 'svg') { for (const child of [...el.children]) walk(child, style, tx); return; }
    if (['hidden', 'collapse'].includes(style.visibility)) return;
    if (style.visibility !== 'visible') fail('Diese Sichtbarkeitseinstellung wird nicht unterstützt.');
    const d = shapePath(el);
    if (!d) return;
    for (const kind of ['fill', 'stroke'] as const) {
      if (Number(style[`${kind}-opacity`]) === 0) continue;
      const color = paint(style[kind], style);
      if (!color) continue;
      const p = path(d, style['fill-rule']);
      try {
        if (kind === 'stroke') {
          const width = length(style['stroke-width']);
          if (width < 0) fail('Negative Konturstärken sind ungültig.');
          if (width === 0) continue;
          const cap = kit().StrokeCap[style['stroke-linecap'].toUpperCase() as 'BUTT'];
          const join = kit().StrokeJoin[style['stroke-linejoin'].toUpperCase() as 'MITER'];
          const miter = Number(style['stroke-miterlimit']);
          if (cap === undefined || join === undefined || !Number.isFinite(miter) || miter < 1) fail('Diese Kontureinstellung wird nicht unterstützt.');
          if (!p.stroke({ width, cap, join, miter_limit: miter })) fail('Die Kontur konnte nicht in eine Fläche umgewandelt werden.');
        }
        const normalized = canonical(p);
        if (!normalized) continue;
        const transformed = path(transformPath(normalized, tx), 'evenodd');
        try {
          const bounds = boundsOf(transformed.toSVGString());
          if (Object.values(bounds).some(v => !Number.isFinite(v) || Math.abs(v) > 100000)) fail('Die transformierte Grafik ist zu groß.');
          if (rootStyle.overflow !== 'visible') operation(transformed, viewport, 'INTERSECT');
          const final = canonical(transformed);
          if (final) shapes.push({ id: `shape-${shapes.length}`, d: final, color });
        } finally { transformed.delete(); }
      } finally { p.delete(); }
    }
  }
  try { walk(root, defaultStyle, rootTransform); } finally { viewport.delete(); }
  if (!shapes.length) throw new Error('Die SVG enthält keine sichtbaren, druckbaren Flächen.');
  return { id: crypto.randomUUID(), name: name.replace(/\.svg$/i, ''), kind: 'svg', sourceSVG: source, shapes, sourceWidth: width, sourceHeight: height, x: (210 - width) / 2, y: (297 - height) / 2, width, height, rotation: 0, visible: true };
}
