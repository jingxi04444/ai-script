import { useState } from 'react';
import { create } from 'zustand';
import { normalizeDirectorScene, type DirectorScene } from './directorScene';

interface DirectorEditorState {
  scene: DirectorScene;
  past: DirectorScene[];
  future: DirectorScene[];
  revision: number;
  change: (update: (scene: DirectorScene) => DirectorScene) => void;
  undo: () => void;
  redo: () => void;
}

/** Each open editor owns its history. Scene JSON is the only persisted representation. */
export function useDirectorEditor(initialScene: unknown) {
  const [useEditor] = useState(() => create<DirectorEditorState>((set) => ({
    scene: normalizeDirectorScene(initialScene), past: [], future: [], revision: 0,
    change: (update) => set(state => {
      const next = update(state.scene);
      if (next === state.scene) return state;
      return { scene: next, past: [...state.past.slice(-39), state.scene], future: [], revision: state.revision + 1 };
    }),
    undo: () => set(state => {
      const previous = state.past[state.past.length - 1];
      return previous ? { scene: previous, past: state.past.slice(0, -1), future: [state.scene, ...state.future].slice(0, 40), revision: state.revision + 1 } : state;
    }),
    redo: () => set(state => {
      const next = state.future[0];
      return next ? { scene: next, past: [...state.past, state.scene].slice(-40), future: state.future.slice(1), revision: state.revision + 1 } : state;
    }),
  })));
  return useEditor();
}
