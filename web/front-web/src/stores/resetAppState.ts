import { useProjectStore } from './projectStore';
import { useWorkspaceStore } from './workspaceStore';
import { useScriptPolishStore } from './scriptPolishStore';

export const resetAppState = () => {
  useScriptPolishStore.getState().reset();
  useWorkspaceStore.getState().reset();
  useProjectStore.getState().reset();
};
