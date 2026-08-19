export type ScriptType = 'viral' | 'template' | 'original' | 'product' | 'product-dimension';
export type ScriptStatus = 'draft' | 'pending_review' | 'changes_requested' | 'revised_pending_review' | 'approved';

export const scriptStatusOptions: Array<{ value: ScriptStatus; label: string }> = [
  { value: 'draft', label: '草稿中' },
  { value: 'pending_review', label: '待审核' },
  { value: 'changes_requested', label: '已审需修改' },
  { value: 'revised_pending_review', label: '已改待审核' },
  { value: 'approved', label: '通过' },
];

export const normalizeScriptStatus = (status?: string): ScriptStatus => {
  if (status === 'pending') return 'pending_review';
  if (status === 'done') return 'approved';
  return scriptStatusOptions.some((item) => item.value === status) ? status as ScriptStatus : 'draft';
};

export const getScriptStatusLabel = (status?: string) => (
  scriptStatusOptions.find((item) => item.value === normalizeScriptStatus(status))?.label || '草稿中'
);

export interface Script {
  id: string;
  name: string;
  projectId: string;
  briefId?: string;
  briefName?: string;
  type: ScriptType;
  duration?: string;
  format?: string;
  formatName?: string;
  templateId?: string;
  templateName?: string;
  originalCategoryId?: string;
  originalCategoryName?: string;
  originalScenarioId?: string;
  originalScenarioName?: string;
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
  previewVideoUrl?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  auditStatus?: 'draft' | 'running' | 'approved' | 'rejected';
  publishStatus?: 'online' | 'offline';
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
  requestNo: string;
  expectedPointCost: number;
  projectId: string;
  type: ScriptType;
  templateId?: string;
  originalCategoryId?: string;
  originalCategoryName?: string;
  originalScenarioId?: string;
  originalScenarioName?: string;
  briefId?: string;
  referenceUrl?: string;
  referenceCopy?: string;
  structureAnalysis?: string;
  prompt?: string;
  duration?: string;
  format?: string;
  formatRequirement?: string;
  productFrame?: string;
  productFrameAssetId?: string;
  productImage?: string;
  productFrameFileName?: string;
  productFrameContent?: string;
}

export type ScriptPolishRole = 'user' | 'assistant';

export interface ScriptPolishMessage {
  id: string;
  replyToId?: string;
  role: ScriptPolishRole;
  status?: 'pending' | 'success' | 'failed';
  content: string;
  errorMessage?: string;
  createdAt: string;
}

export interface PolishScriptParams {
  requestNo: string;
  expectedPointCost: number;
  instruction: string;
  content: string;
  briefId?: string;
  productFrameAssetId?: string;
  productImage?: string;
  productFrameFileName?: string;
  productFrameContent?: string;
}

export interface PolishScriptResult {
  content: string;
  summary: string;
  status?: ScriptStatus;
}

export interface ScriptVersion {
  id: string;
  versionNo: number;
  title?: string;
  content: string;
  changeNote?: string;
  source?: 'generate' | 'ai_polish' | 'manual' | 'restore' | 'legacy';
  instruction?: string;
  summary?: string;
  restoredFromVersionId?: string;
  current: boolean;
  createdAt: string;
}

export interface ScriptAccess {
  canView: boolean;
  canComment: boolean;
  canEditScript: boolean;
  canUseAi: boolean;
  canViewAiMessages: boolean;
  canViewVersions: boolean;
  canSubmitReview: boolean;
  accessMode: 'internal' | 'review';
}

export interface ScriptReviewComment {
  id: string;
  parentId?: string;
  versionId?: string;
  userId: string;
  username?: string;
  userAvatar?: string;
  rowIndex?: number;
  columnKey?: string;
  content: string;
  status: 'open' | 'resolved';
  mine: boolean;
  deletable: boolean;
  createdAt: string;
}

export interface ShareLinkResult {
  id: string;
  token: string;
  path: string;
  expiresAt: string;
}

export interface ScriptReviewContext {
  script: Script;
  access: ScriptAccess;
  versions: ScriptVersion[];
  comments: ScriptReviewComment[];
}
