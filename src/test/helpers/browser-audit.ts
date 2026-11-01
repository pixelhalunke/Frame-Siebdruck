// Separate local development entry at /audit.html. Not included in the app build.
import axe from 'axe-core';
const controls = document.createElement('aside');
controls.id = 'audit-controls'; controls.setAttribute('aria-label', 'Lokale Prüfwerkzeuge');
controls.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:200;background:white;color:#111;border:2px solid #111;padding:8px;max-width:90vw;max-height:60vh;overflow:auto;font:12px monospace;';
const button = document.createElement('button'); button.textContent = 'Barrierefreiheit prüfen'; button.style.cssText = 'padding:12px;background:#152512;color:white';
const output = document.createElement('pre'); output.id = 'audit-results'; output.style.whiteSpace = 'pre-wrap';
button.onclick = async () => {
  output.textContent = 'Prüfung läuft …';
  const result = await axe.run({ exclude: [['#audit-controls']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
  output.textContent = JSON.stringify({ violations: result.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, failure: n.failureSummary })) })), passed: result.passes.length, incomplete: result.incomplete.map(v => v.id) }, null, 2);
};
controls.append(button, output); document.body.append(controls);
// Keep the development-only control inside Radix's active focus/pointer scope.
// Otherwise an open modal correctly prevents interacting with this tool.
const positionControls = () => {
  const parent = Array.from(document.querySelectorAll('.dialog')).at(-1) ?? document.body;
  if (controls.parentElement !== parent) parent.append(controls);
  controls.removeAttribute('aria-hidden');
};
new MutationObserver(positionControls).observe(document.body, { childList: true, subtree: true });
positionControls();
