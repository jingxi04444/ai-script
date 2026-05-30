export type StoryboardRow = {
  id?: number;
  shot: string;
  type: string;
  scene: string;
  line: string;
  duration: string;
  point: string;
  risk: string;
};

export type ComplianceResult = {
  similarity: string;
  riskCount: number;
  suggestion: string;
};

export type DownloadResult = {
  fileName: string;
  url: string;
};

export type ShareScriptResult = {
  title: string;
  url: string;
  scope: string;
};

export type SharedScript = {
  title: string;
  status: string;
  scenes: StoryboardRow[];
};

export type ScriptFormatOption = {
  id: string;
  name: string;
};

export type ScriptTemplateCategory = {
  id: string;
  name: string;
  description: string;
};

export type ScriptTemplateSummary = {
  id: string;
  categoryId: string;
  name: string;
  summary: string;
};

export type ScriptTemplateDetail = ScriptTemplateSummary & {
  formula: string;
  points: string[];
};

export type ScriptExtractionResult = {
  transcript: string;
  sourceTitle: string;
  platform?: string;
  parseInfo?: Record<string, unknown>;
};

export type ScriptCopyAnalysisResult = {
  emotions: string[];
  keyMessages: string[];
  summary: string;
};

export type ScriptStructureResult = {
  title: string;
  hook: string;
  turningPoints: string[];
  formula: string;
  sections: Array<{ title: string; points: string[] }>;
};

export type ScriptGeneratorConfig = {
  formatId: string;
  durationSeconds: string;
  brief: string;
  productVisual: string;
};

export type GeneratedScriptResult = {
  id: string;
  title: string;
  content: string;
  sourceMode?: 'viral' | 'template' | 'original';
  rows: Array<{ shot: string; line: string; visual: string; duration: string; note: string }>;
};

export type GenerateScriptPayload = {
  mode: 'viral' | 'template' | 'original';
  config: ScriptGeneratorConfig;
  transcript?: string;
  analysis?: ScriptCopyAnalysisResult | null;
  structure?: ScriptStructureResult | null;
  templateId?: string;
  originalPrompt?: string;
};

export type ScriptLibraryCategory = 'mine' | 'product' | 'viral' | 'template' | 'original';

export type ScriptLibraryItem = {
  id: string;
  title: string;
  productName: string;
  sourceType: ScriptLibraryCategory;
  status: string;
  updatedAt: string;
  summary: string;
  content: string;
  rows: GeneratedScriptResult['rows'];
};

export type ScriptLibraryResult = {
  category: ScriptLibraryCategory;
  total: number;
  scripts: ScriptLibraryItem[];
};
