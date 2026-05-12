import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { ComplianceResult, DownloadResult, ShareScriptResult, SharedScript, StoryboardRow } from '../types/script';

export const scriptApi = {
  generateStoryboard() {
    return callApi<StoryboardRow[]>(() => mockApi.generateStoryboard() as Promise<StoryboardRow[]>, () => request<StoryboardRow[]>('/api/scripts/generate', { method: 'POST' }));
  },
  runCompliance() {
    return callApi<ComplianceResult>(() => mockApi.runCompliance() as Promise<ComplianceResult>, () => request<ComplianceResult>('/api/scripts/compliance-check', { method: 'POST' }));
  },
  submitAudit() {
    return callApi<{ status: string; message: string }>(() => mockApi.submitAudit() as Promise<{ status: string; message: string }>, () => request<{ status: string; message: string }>('/api/scripts/submit-audit', { method: 'POST' }));
  },
  downloadScript(scriptName: string) {
    return callApi<DownloadResult>(() => mockApi.downloadScript(scriptName) as Promise<DownloadResult>, () => request<DownloadResult>('/api/scripts/download', { method: 'POST', body: { scriptName } }));
  },
  shareScript(scriptName: string) {
    return callApi<ShareScriptResult>(() => mockApi.shareScript(scriptName) as Promise<ShareScriptResult>, () => request<ShareScriptResult>('/api/scripts/share', { method: 'POST', body: { scriptName } }));
  },
  getShareScript() {
    return callApi<SharedScript>(() => mockApi.getShareScript() as Promise<SharedScript>, () => request<SharedScript>('/api/share/scripts/current'));
  },
};
