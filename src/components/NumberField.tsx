import { useEffect, useState } from 'react';
export function NumberField({ label, value, onChange, min = -10000, max = 10000, unit = 'mm', step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; unit?: string; step?: number }) {
  const [draft, setDraft] = useState(String(+value.toFixed(2)));
  useEffect(() => setDraft(String(+value.toFixed(2))), [value]);
  const commit = () => { const n = Number(draft); if (draft.trim() && Number.isFinite(n) && n >= min && n <= max) onChange(n); else setDraft(String(+value.toFixed(2))); };
  return <label className="field"><span>{label}</span><span className="number-input"><input type="number" value={draft} min={min} max={max} step={step} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/><span>{unit}</span></span></label>;
}
