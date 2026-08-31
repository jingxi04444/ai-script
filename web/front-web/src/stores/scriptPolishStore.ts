import { create } from 'zustand';
import { message } from 'antd';
import { scriptApi } from '../api/script';
import { normalizeScriptStatus, type PolishScriptParams, type Script, type ScriptPolishMessage } from '../types/script';
import { getApiErrorMessage } from '../utils/apiError';
import { createOperationRequestNo, isAmbiguousOperationError, notifyPointBalanceChanged, requestOperationCostRefresh } from '../utils/operationRequest';

export interface PolishEditorDraft {
  script: Script;
  input: string;
  briefId?: string;
  productFrame: {
    assetId?: string;
    url?: string;
    fileName?: string;
    objectKey?: string;
    extractedText?: string;
  } | null;
  manualEditing: boolean;
  messages: ScriptPolishMessage[];
}

export interface PolishSession {
  draft: PolishEditorDraft;
  status: 'idle' | 'running' | 'stopping' | 'success' | 'failed' | 'canceled';
  minimized: boolean;
  requestNo?: string;
  fingerprint?: string;
  error?: string;
}

interface ScriptPolishState {
  sessions: Record<string, PolishSession>;
  minimize: (draft: PolishEditorDraft) => void;
  restore: (scriptId: string) => void;
  start: (draft: PolishEditorDraft, payload: Omit<PolishScriptParams, 'requestNo'>) => Promise<void>;
  stop: (scriptId: string) => Promise<void>;
  dismiss: (scriptId: string) => void;
  reset: () => void;
}

const controllers = new Map<string, AbortController>();
export const isPolishWorking = (session?: PolishSession) => session?.status === 'running' || session?.status === 'stopping';

// Requests live outside the editor, so minimizing or changing routes never cancels them.
export const useScriptPolishStore = create<ScriptPolishState>((set, get) => {
  const update = (id: string, patch: Partial<PolishSession>) => set((state) => ({
    sessions: state.sessions[id]
      ? { ...state.sessions, [id]: { ...state.sessions[id], ...patch } }
      : state.sessions,
  }));

  return {
    sessions: {},
    minimize: (draft) => set((state) => {
      const session = state.sessions[draft.script.id];
      // A completion may arrive immediately before the editor unmounts.
      const savedDraft = session?.status === 'success' && session.draft.script.updatedAt > draft.script.updatedAt
        ? { ...draft, script: session.draft.script, messages: session.draft.messages, input: '', manualEditing: false }
        : draft;
      return { sessions: {
        ...state.sessions,
        [draft.script.id]: { ...session, status: session?.status || 'idle', draft: savedDraft, minimized: true },
      } };
    }),
    restore: (id) => update(id, { minimized: false }),
    dismiss: (id) => {
      if (isPolishWorking(get().sessions[id])) return;
      set((state) => {
        const sessions = { ...state.sessions };
        delete sessions[id];
        return { sessions };
      });
    },
    start: async (draft, payload) => {
      const id = draft.script.id;
      const previous = get().sessions[id];
      if (isPolishWorking(previous)) return;
      const fingerprint = JSON.stringify(payload);
      const requestNo = previous?.fingerprint === fingerprint && previous.requestNo
        ? previous.requestNo : createOperationRequestNo('script_polish');
      const controller = new AbortController();
      controllers.set(id, controller);
      const isCurrent = () => controllers.get(id) === controller && get().sessions[id]?.requestNo === requestNo;
      set((state) => ({ sessions: {
        ...state.sessions,
        [id]: { draft: { ...draft, input: '' }, status: 'running', minimized: false, requestNo, fingerprint },
      } }));
      try {
        const result = await scriptApi.polish(id, { ...payload, requestNo }, controller.signal);
        if (!isCurrent() || controller.signal.aborted) return;
        const session = get().sessions[id];
        const script = {
          ...session.draft.script,
          content: result.content,
          status: normalizeScriptStatus(result.status || draft.script.status),
          updatedAt: new Date().toISOString(),
        };
        update(id, {
          status: 'success', fingerprint: undefined,
          draft: { ...session.draft, script, input: '', manualEditing: false, messages: [
            ...session.draft.messages,
            { id: `${requestNo}:result`, role: 'assistant', content: result.summary, createdAt: script.updatedAt },
          ] },
        });
        try {
          localStorage.removeItem(`ai-script:annotations:${id}`);
        } catch {
          // The completed result remains available even when browser storage is disabled.
        }
        window.dispatchEvent(new CustomEvent('scripts:changed', { detail: { scriptId: id, projectId: script.projectId, status: script.status } }));
        notifyPointBalanceChanged();
        message.success(`「${script.name}」润色完成，可在任务中心 → AI 润色查看`);
      } catch (error) {
        if (!isCurrent() || controller.signal.aborted) return;
        const errorText = getApiErrorMessage(error, '脚本润色失败');
        update(id, {
          status: 'failed', error: errorText,
          // Preserve the idempotency key after timeouts to avoid charging a retry twice.
          fingerprint: isAmbiguousOperationError(error) ? fingerprint : undefined,
          draft: { ...get().sessions[id].draft, input: draft.input, briefId: draft.briefId, productFrame: draft.productFrame },
        });
        requestOperationCostRefresh();
        message.error(`「${draft.script.name}」${errorText}`);
      } finally {
        if (controllers.get(id) === controller) controllers.delete(id);
      }
    },
    stop: async (id) => {
      const session = get().sessions[id];
      if (!isPolishWorking(session) || !session.requestNo) return;
      if (session.status === 'stopping') return;
      update(id, { status: 'stopping' });
      try {
        // Only report stopped after the server accepts cancellation.
        await scriptApi.cancelPolish(id, session.requestNo);
        const latest = get().sessions[id];
        if (latest?.requestNo !== session.requestNo || latest.status === 'success') return;
        controllers.get(id)?.abort();
        controllers.delete(id);
        update(id, { status: 'canceled', fingerprint: undefined, error: undefined });
        requestOperationCostRefresh();
      } catch (error) {
        if (get().sessions[id]?.requestNo === session.requestNo && get().sessions[id]?.status === 'stopping') {
          update(id, { status: 'running' });
        }
        throw error;
      }
    },
    reset: () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
      set({ sessions: {} });
    },
  };
});
