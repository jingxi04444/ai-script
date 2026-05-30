export type AdminRole = '超级管理员' | '品牌管理员' | '审核员';
export type Status = 'active' | 'inactive';
export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface AdminUser {
  id: string;
  name: string;
  email?: string;
  role: AdminRole;
  brandName?: string;
  tenantScope?: string;
  permissions: string[];
}

export interface LoginRequest {
  account: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  token: string;
  user: AdminUser;
}

export interface AdminMenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  enabled: boolean;
  order: number;
  permission?: string;
  children?: AdminMenuItem[];
}

export interface DashboardStat {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  tone: string;
  bg: string;
  icon: 'file' | 'video' | 'users' | 'shield';
  meta: string;
}

export interface TrendPoint {
  name: string;
  scriptCount: number;
  videoCount: number;
  approvedCount: number;
}

export interface PlatformDistribution {
  name: string;
  count: number;
}

export interface SystemMetric {
  label: string;
  value: number;
  color: string;
  detail: string;
}

export interface DashboardOverview {
  headline: {
    totalOutput: number;
    approvalRate: string;
    description: string;
  };
  stats: DashboardStat[];
  trends: TrendPoint[];
  platformDistribution: PlatformDistribution[];
  systemMetrics: SystemMetric[];
}

export interface ApiProvider {
  id: string;
  providerName: string;
  providerType: 'llm' | 'image' | 'tts' | 'asr' | 'parser';
  platform: string;
  endpointUrl: string;
  model?: string;
  apiKeyRef: string;
  description?: string;
  status: Status;
  priority: number;
  callCount: number;
  successRate: number;
  avgResponseTime: number;
}

export interface CreateApiProviderRequest {
  providerName: string;
  providerType: ApiProvider['providerType'];
  platform: string;
  endpointUrl: string;
  model?: string;
  apiKeyRef: string;
  description?: string;
  priority: number;
}

export interface ParseProvider {
  id: string;
  platform: string;
  apiName: string;
  status: Status;
  callCount: number;
  successRate: number;
}

export interface ApiContract {
  module: string;
  name: string;
  method: ApiMethod;
  path: string;
  requestParams: Record<string, unknown>;
  responseBody: Record<string, unknown>;
  description: string;
}

export interface PromptTemplate {
  id: string;
  scene: 'brief_score' | 'brief_compare' | 'script_generate' | 'copy_analyze';
  name: string;
  version: string;
  providerId: string;
  providerName: string;
  model: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchema: string;
  status: Status;
  updatedAt: string;
}

export interface UpdatePromptTemplateRequest {
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchema: string;
  status: Status;
}

export interface KnowledgeQuery {
  keyword?: string;
  tab?: string;
}

export interface StructureFormula {
  id: string;
  name: string;
  platform: string;
  category: string;
  useCount: number;
  successRate: number;
  createTime: string;
}

export interface ProductKnowledge {
  id: string;
  productName: string;
  brand: string;
  corePoints: string;
  tags: string[];
  updateTime: string;
}

export interface MaterialTag {
  id: string;
  name: string;
  count: number;
  category: string;
}

export interface KnowledgeBaseData {
  structureFormulas: StructureFormula[];
  productKnowledge: ProductKnowledge[];
  materialTags: MaterialTag[];
  originalTemplates?: OriginalTemplate[];
}

export interface OriginalTemplate {
  id: string;
  name: string;
  structure: string;
  scenario: string;
  prompt: string;
  platform: string;
  status: Status;
  updatedAt: string;
}

export interface OriginalTemplateRequest {
  name: string;
  structure: string;
  scenario: string;
  prompt: string;
  platform: string;
  status: Status;
}

export interface AuditStat {
  label: string;
  value: number;
  color: string;
}

export type AuditStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

export interface AuditTask {
  id: string;
  scriptName: string;
  brand: string;
  submitter: string;
  submitTime: string;
  status: AuditStatus;
  stage: string;
  priority: 'high' | 'normal' | 'low';
}

export interface AuditHistory {
  id: string;
  scriptName: string;
  auditor: string;
  stage: string;
  result: AuditStatus;
  comment: string;
  time: string;
}

export interface AuditOverview {
  stats: AuditStat[];
  tasks: AuditTask[];
  history: AuditHistory[];
}

export interface ReviewTaskRequest {
  taskId: string;
  result: 'approved' | 'rejected';
  comment: string;
}

export interface AdminProject {
  id: string;
  name: string;
  brand: string;
  status: 'draft' | 'reviewing' | 'generating' | 'completed' | 'archived';
  creator: string;
  createTime: string;
  scriptCount: number;
  videoCount: number;
  thumbnail: string;
}

export interface AdminProjectDetail {
  project: AdminProject & {
    productName: string;
    platform: string;
    currentStep: string;
    progress: number;
  };
  briefs: Array<{
    id: string;
    productName: string;
    primarySellingPoint: string;
    targetGroups: string[];
    otherRequirements: string;
    briefText: string;
    status: string;
    version: number;
    updatedAt: string;
    sellingPoints: Array<{ id: string; content: string; pointType: string; order: number }>;
  }>;
  scripts: Array<{
    id: string;
    name: string;
    status: string;
    auditStatus: string;
    versionNo: number;
    versionTitle: string;
    updatedAt: string;
    content: Record<string, unknown>;
    shots: Array<{ shot: string; type: string; scene: string; line: string; duration: string; note: string; risk: string }>;
  }>;
}

export interface ProjectQuery {
  keyword?: string;
  brand?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  brand: string;
  status: Status;
  lastLogin: string;
  createTime: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  role: AdminRole;
  brand?: string;
  password: string;
}

export interface RolePermission {
  id: string;
  name: AdminRole;
  permissions: string[];
  userCount: number;
  color: 'error' | 'primary' | 'warning' | 'default';
}

export interface OperationLogQuery {
  keyword?: string;
  module?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface OperationLog {
  id: string;
  user: string;
  action: string;
  module: string;
  detail: string;
  ip: string;
  time: string;
  status: 'success' | 'warning' | 'error';
}

export interface PagedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ImportTemplateConfig {
  code: string;
  name: string;
  description: string;
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'xls';
  columns: string[];
  sampleRows: string[][];
  instructions: string;
  status: Status;
  updatedAt: string;
}
