import { useReducer } from 'react';
export type AreaHistory = { removed: Set<string>; undo: string[][]; redo: string[][] };
type Action = { type: 'remove'; ids: string[] } | { type: 'undo' | 'redo' | 'reset' };
export const emptyAreaHistory = (): AreaHistory => ({ removed: new Set(), undo: [], redo: [] });
export function areaHistory(state: AreaHistory, action: Action): AreaHistory {
  if (action.type === 'reset') return emptyAreaHistory();
  const removed = new Set(state.removed);
  if (action.type === 'remove') { const ids = [...new Set(action.ids)].filter(id => !removed.has(id)); if (!ids.length) return state; ids.forEach(id => removed.add(id)); return { removed, undo: [...state.undo, ids].slice(-50), redo: [] }; }
  const source = action.type === 'undo' ? state.undo : state.redo, ids = source.at(-1); if (!ids) return state;
  ids.forEach(id => { if (action.type === 'undo') removed.delete(id); else removed.add(id); });
  return action.type === 'undo' ? { removed, undo: state.undo.slice(0, -1), redo: [...state.redo, ids] } : { removed, undo: [...state.undo, ids], redo: state.redo.slice(0, -1) };
}
export function useAreaHistory() {
  const [state, dispatch] = useReducer(areaHistory, undefined, emptyAreaHistory);
  return { removed: state.removed, canUndo: !!state.undo.length, canRedo: !!state.redo.length, remove: (ids: string[]) => dispatch({ type: 'remove', ids }), undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }), reset: () => dispatch({ type: 'reset' }) };
}
