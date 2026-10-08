import type { WorkflowNodeData, WorkflowNodeKind } from '../types/workflow';

export type FrameRole = 'firstFrame' | 'lastFrame';
const visuals: WorkflowNodeKind[] = ['character', 'style', 'scene', 'product', 'director', 'image', 'result'];
const audioInputs: WorkflowNodeKind[] = ['text', 'storyboard', 'scriptGenerator', 'prompt', 'music', 'voice'];
const allInputs: WorkflowNodeKind[] = [...visuals, ...audioInputs, 'effect', 'categorySkill', 'batchMaterial', 'video', 'editor', 'export'];

export function referenceKinds(kind: WorkflowNodeKind | undefined, mode: 'reference' | 'mark', role?: FrameRole) {
  return new Set<WorkflowNodeKind>(mode === 'mark' ? ['character', 'scene', 'product', 'image', 'result'] : role ? visuals : kind === 'music' || kind === 'voice' ? audioInputs : allInputs);
}

/** Keep labels in selection order, not graph order; preserve the opposite video frame role. */
export function referenceSelectionPatch(data: WorkflowNodeData, ids: string[], titleFor: (id: string) => string, role?: FrameRole): Partial<WorkflowNodeData> {
  if (!role) {
    const next = Array.from(new Set(ids));
    return { referenceNodeIds: next, referenceLabels: next.map(titleFor),
      ...(!data.firstFrameNodeId || next.includes(data.firstFrameNodeId) ? {} : { firstFrameNodeId: undefined, firstFrameLabel: undefined }),
      ...(!data.lastFrameNodeId || next.includes(data.lastFrameNodeId) ? {} : { lastFrameNodeId: undefined, lastFrameLabel: undefined }),
    };
  }
  const old = role === 'firstFrame' ? data.firstFrameNodeId : data.lastFrameNodeId;
  const other = role === 'firstFrame' ? data.lastFrameNodeId : data.firstFrameNodeId;
  const id = ids[0];
  const next = Array.from(new Set([...(data.referenceNodeIds || []).filter(item => item !== old || item === other), ...(id ? [id] : [])]));
  return { referenceNodeIds: next, referenceLabels: next.map(titleFor),
    ...(role === 'firstFrame' ? { firstFrameNodeId: id, firstFrameLabel: id ? titleFor(id) : undefined } : { lastFrameNodeId: id, lastFrameLabel: id ? titleFor(id) : undefined }),
  };
}
