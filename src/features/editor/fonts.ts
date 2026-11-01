import type { Font } from 'opentype.js';
import type { ProjectFont } from '../../core/project/model';
export const DEFAULT_FONT = 'space-grotesk-bold';
export const BUNDLED_FONTS = [
  { id: 'space-grotesk-regular', name: 'Space Grotesk · Normal', file: 'SpaceGrotesk-Regular.woff' },
  { id: DEFAULT_FONT, name: 'Space Grotesk · Fett', file: 'SpaceGrotesk-Bold.woff' },
  { id: 'dejavu-sans-regular', name: 'DejaVu Sans · Normal', file: 'DejaVuSans.ttf' },
  { id: 'dejavu-sans-bold', name: 'DejaVu Sans · Fett', file: 'DejaVuSans-Bold.ttf' },
  { id: 'dejavu-serif-regular', name: 'DejaVu Serif · Normal', file: 'DejaVuSerif.ttf' },
  { id: 'dejavu-serif-bold', name: 'DejaVu Serif · Fett', file: 'DejaVuSerif-Bold.ttf' },
  { id: 'dejavu-mono-regular', name: 'DejaVu Mono · Normal', file: 'DejaVuSansMono.ttf' },
  { id: 'dejavu-mono-bold', name: 'DejaVu Mono · Fett', file: 'DejaVuSansMono-Bold.ttf' },
];
const fonts = new Map<string, Font>(), fontData = new Map<string, string>(), pending = new Map<string, Promise<void>>();
const MAX_FONT_BYTES = 3_000_000;
export function fontFor(id = DEFAULT_FONT) { const f = fonts.get(id); if (!f) throw new Error('Die Schrift lädt noch. Bitte kurz warten.'); return f; }
export function fontLabel(id = DEFAULT_FONT, custom: ProjectFont[] = []) { return BUNDLED_FONTS.find(f => f.id === id)?.name ?? custom.find(f => f.id === id)?.name ?? 'Eigene Schrift'; }
function validateBytes(buffer: ArrayBuffer) {
  if (buffer.byteLength < 44 || buffer.byteLength > MAX_FONT_BYTES) throw new Error('Die Schriftdatei ist leer oder größer als 3 MB. Verwende eine kleinere TTF-, OTF- oder WOFF-Datei.');
  const data = new DataView(buffer), signature = data.getUint32(0);
  if (![0x00010000, 0x4f54544f, 0x74727565, 0x774f4646].includes(signature)) throw new Error('Dieses Schriftformat wird nicht unterstützt. Öffne eine TTF-, OTF- oder WOFF-Datei.');
  if (signature === 0x774f4646 && data.getUint32(16) > 16_000_000) throw new Error('Die entpackte Schriftdatei ist zu groß. Verwende eine kleinere Schrift.');
}
export async function initFont(buffer?: ArrayBuffer, id = DEFAULT_FONT) {
  if (!buffer && fonts.has(id)) return;
  const file = BUNDLED_FONTS.find(f => f.id === id)?.file;
  const bytes = buffer ?? await fetch(`/fonts/${file ?? ''}`).then(r => { if (!r.ok || !file) throw new Error('Die Schrift konnte nicht geladen werden. Lade FRAME neu und versuche es erneut.'); return r.arrayBuffer(); });
  if (!bytes) throw new Error('Die Schrift konnte nicht geladen werden.');
  validateBytes(bytes);
  const { parse } = await import('opentype.js');
  try { fonts.set(id, parse(bytes)); } catch { throw new Error('Die Schriftdatei konnte nicht gelesen werden. Verwende eine gültige TTF-, OTF- oder WOFF-Datei.'); }
}
function fromBase64(data: string) { const binary = atob(data), bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes.buffer; }
function toBase64(bytes: Uint8Array) { let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(binary); }
async function fontId(bytes: ArrayBuffer) { const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); return `custom-${[...digest].map(n => n.toString(16).padStart(2, '0')).join('').slice(0, 32)}`; }
export async function loadFont(id: string, custom: ProjectFont[] = []) {
  if (fonts.has(id) && (BUNDLED_FONTS.some(f => f.id === id) || custom.some(f => f.id === id && f.data === fontData.get(id)))) return;
  if (!pending.has(id)) pending.set(id, (async () => {
    if (BUNDLED_FONTS.some(f => f.id === id)) return initFont(undefined, id);
    const asset = custom.find(f => f.id === id);
    if (!asset) throw new Error('Diese Schrift fehlt im Projekt. Importiere sie erneut oder wähle eine andere Schrift.');
    const bytes = fromBase64(asset.data); validateBytes(bytes);
    if (await fontId(bytes) !== asset.id) throw new Error('Die gespeicherte Schriftdatei ist beschädigt. Importiere sie erneut.');
    await initFont(bytes, id); fontData.set(id, asset.data);
  })().finally(() => pending.delete(id)));
  await pending.get(id);
}
export async function importFontFile(file: File): Promise<ProjectFont> {
  if (!file.size || file.size > MAX_FONT_BYTES) throw new Error('Verwende eine Schriftdatei mit höchstens 3 MB.');
  const bytes = await file.arrayBuffer(), id = await fontId(bytes);
  await initFont(bytes, id);
  const names = fontFor(id).names as unknown as Record<string, Record<string, Record<string, string>>>;
  const family = names.windows?.fullName?.en ?? names.macintosh?.fullName?.en ?? names.unicode?.fullName?.en;
  const data = toBase64(new Uint8Array(bytes)); fontData.set(id, data);
  return { id, name: (family || file.name.replace(/\.[^.]+$/, '')).slice(0, 100), data };
}
