export type ScriptType = 'viral' | 'template' | 'original' | 'product' | 'product-dimension';
export type ScriptStatus = 'draft' | 'pending' | 'done';

export interface Script {
  id: string;
  name: string;
  projectId: string;
  type: ScriptType;
  status: ScriptStatus;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  category?: string;
  actor: string;
  people: string;
  popularity: string;
  difficulty: string;
  paragraphStructure?: string;
  emotionTurningPoints?: string;
  firstFiveSecondsHook?: string;
  structureFormula?: string;
  modelFormula?: string;
  scriptTemplateLibrary?: string;
  referenceUrl?: string;
  referenceDesc?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  locked: boolean;
}

export interface ScriptFormatOption {
  code: string;
  name: string;
  formatRequirement?: string;
  sortOrder?: number;
  status?: number;
}

export interface GenerateScriptParams {
  projectId: string;
  type: ScriptType;
  templateId?: string;
  briefId?: string;
  referenceUrl?: string;
  referenceCopy?: string;
  structureAnalysis?: string;
  prompt?: string;
  duration?: string;
  format?: string;
  formatRequirement?: string;
  productFrame?: string;
  productImage?: string;
  productFrameFileName?: string;
}

export type ScriptPolishRole = 'user' | 'assistant';

export interface ScriptPolishMessage {
  id: string;
  role: ScriptPolishRole;
  content: string;
  createdAt: string;
}

export interface PolishScriptParams {
  instruction: string;
  content: string;
}

export interface PolishScriptResult {
  content: string;
  summary: string;
}
