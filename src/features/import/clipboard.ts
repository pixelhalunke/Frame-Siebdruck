export function isEditable(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('input, textarea, select, [contenteditable="true"]');
}
export async function readClipboard(data: DataTransfer): Promise<string | File | null> {
  const direct = data.getData('image/svg+xml');
  if (direct.trim()) return direct;
  const svgFile = [...data.files].find(f => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'));
  if (svgFile) return svgFile.text();
  for (const mime of ['text/plain', 'text/html']) {
    const value = data.getData(mime);
    if (/<svg[\s>]/i.test(value)) {
      if (mime === 'text/plain') return value;
      const match = value.match(/<svg[\s\S]*?<\/svg\s*>/i);
      if (match) return match[0];
    }
  }
  const image = [...data.files].find(f => f.type.startsWith('image/'));
  if (image) return image;
  for (const item of [...data.items]) if (item.type.startsWith('image/')) { const file = item.getAsFile(); if (file) return file; }
  return null;
}
