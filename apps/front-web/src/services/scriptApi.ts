import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { ComplianceResult, DownloadResult, GeneratedScriptResult, GenerateScriptPayload, ScriptCopyAnalysisResult, ScriptExtractionResult, ScriptFormatOption, ScriptLibraryCategory, ScriptLibraryResult, ScriptStructureResult, ScriptTemplateCategory, ScriptTemplateDetail, ScriptTemplateSummary, ShareScriptResult, SharedScript, StoryboardRow } from '../types/script';

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
  getScriptFormats() {
    return callApi<ScriptFormatOption[]>(() => mockApi.getScriptFormats() as Promise<ScriptFormatOption[]>, () => request<ScriptFormatOption[]>('/api/script-generator/formats'));
  },
  extractViralCopy(url: string) {
    return callApi<ScriptExtractionResult>(() => mockApi.extractViralCopy(url) as Promise<ScriptExtractionResult>, () => request<ScriptExtractionResult>('/api/script-generator/extract-copy', { method: 'POST', body: { url } }));
  },
  analyzeViralCopy(transcript: string) {
    return callApi<ScriptCopyAnalysisResult>(() => mockApi.analyzeViralCopy(transcript) as Promise<ScriptCopyAnalysisResult>, () => request<ScriptCopyAnalysisResult>('/api/script-generator/analyze-copy', { method: 'POST', body: { transcript } }));
  },
  breakdownViralStructure(transcript: string, analysis: ScriptCopyAnalysisResult | null) {
    return callApi<ScriptStructureResult>(() => mockApi.breakdownViralStructure(transcript, analysis) as Promise<ScriptStructureResult>, () => request<ScriptStructureResult>('/api/script-generator/breakdown-structure', { method: 'POST', body: { transcript, analysis } }));
  },
  getTemplateCategories() {
    return callApi<ScriptTemplateCategory[]>(() => mockApi.getTemplateCategories() as Promise<ScriptTemplateCategory[]>, () => request<ScriptTemplateCategory[]>('/api/script-generator/template-categories'));
  },
  getTemplates(categoryId: string) {
    return callApi<ScriptTemplateSummary[]>(() => mockApi.getTemplates(categoryId) as Promise<ScriptTemplateSummary[]>, () => request<ScriptTemplateSummary[]>(`/api/script-generator/template-categories/${categoryId}/templates`));
  },
  getTemplateDetail(templateId: string) {
    return callApi<ScriptTemplateDetail>(() => mockApi.getTemplateDetail(templateId) as Promise<ScriptTemplateDetail>, () => request<ScriptTemplateDetail>(`/api/script-generator/templates/${templateId}`));
  },
  generateScriptDraft(payload: GenerateScriptPayload) {
    return callApi<GeneratedScriptResult>(() => mockApi.generateScriptDraft(payload) as Promise<GeneratedScriptResult>, () => request<GeneratedScriptResult>('/api/script-generator/generate', { method: 'POST', body: payload }));
  },
  saveGeneratedScript(projectId: string, script: GeneratedScriptResult) {
    return callApi<{ savedAt: string }>(() => mockApi.saveGeneratedScript(projectId, script) as Promise<{ savedAt: string }>, () => request<{ savedAt: string }>('/api/script-generator/save', { method: 'POST', body: { projectId, script } }));
  },
  getScriptLibrary(category: ScriptLibraryCategory) {
    return callApi<ScriptLibraryResult>(() => mockApi.getScriptLibrary(category) as Promise<ScriptLibraryResult>, () => request<ScriptLibraryResult>(`/api/storyboard-scripts?category=${category}`));
  },
  polishScript(scriptId: string) {
    return callApi<GeneratedScriptResult>(() => mockApi.polishScript(scriptId) as Promise<GeneratedScriptResult>, () => request<GeneratedScriptResult>(`/api/storyboard-scripts/${scriptId}/polish`, { method: 'POST' }));
  },
  savePolishedScript(scriptId: string, script: GeneratedScriptResult) {
    return callApi<{ savedAt: string }>(() => mockApi.savePolishedScript(scriptId, script) as Promise<{ savedAt: string }>, () => request<{ savedAt: string }>(`/api/storyboard-scripts/${scriptId}/polished-version`, { method: 'POST', body: { script } }));
  },
};
