import { useProjectStore } from './projectStore';
import { useWorkspaceStore } from './workspaceStore';

export const resetAppState = () => {
  useWorkspaceStore.getState().reset();
  useProjectStore.getState().reset();
};
