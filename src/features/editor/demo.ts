import { textPath } from './text';
export function demoSvg() {
  const line = (text: string, y: number, width: number, color = '#253d32') => {
    const p = textPath(text);
    return `<path fill="${color}" transform="translate(${(130 - width) / 2} ${y}) scale(${width / p.width}) translate(${-p.x} ${-p.y})" d="${p.d}"/>`;
  };
  const petals = Array.from({ length: 12 }, (_, i) => `<ellipse cx="65" cy="24" rx="8" ry="17" transform="rotate(${i * 30} 65 49)" fill="#f05b36"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="130mm" height="163mm" viewBox="0 0 130 163">${petals}<circle cx="65" cy="49" r="20" fill="#edb83b"/><path d="M56 43a2.5 2.5 0 1 0 0 .01M74 43a2.5 2.5 0 1 0 0 .01" fill="none" stroke="#253d32" stroke-width="3" stroke-linecap="round"/><path d="M54 55Q65 66 76 55" fill="none" stroke="#253d32" stroke-width="3.5" stroke-linecap="round"/>${line('GROW', 90, 115)}${line('YOUR OWN', 123, 115)}${line('GOOD THINGS TAKE INK.', 153, 88)}</svg>`;
}
