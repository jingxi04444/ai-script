export type AdminUser = {
  id: string;
  name: string;
  role: string;
  tenantScope: string;
  permissions: string[];
};

export type AuthPayload = Record<string, FormDataEntryValue>;

export type AuthResult = {
  token: string;
  user: AdminUser;
  payload?: AuthPayload;
};

export type AdminMenuItem = {
  id: string;
  label: string;
  path: string;
  permission: string;
  enabled: boolean;
  order: number;
};

export type UpdateMenusPayload = {
  menus: AdminMenuItem[];
};

export type UpdateMenusResult = {
  menus: AdminMenuItem[];
  updatedAt: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  delta: string;
};

export type QueueStatus = {
  name: string;
  running: number;
  failed: number;
  successRate: string;
};

export type DashboardData = {
  metrics: DashboardMetric[];
  queues: QueueStatus[];
};

export type ParsingLog = {
  id: string;
  brand: string;
  platform: string;
  url: string;
  status: string;
  cost: string;
  time: string;
};

export type ProviderConfigPayload = Record<string, FormDataEntryValue>;

export type ProviderConfigResult = {
  id: string;
  status: string;
  payload: ProviderConfigPayload;
};

export type LlmProvider = {
  id: string;
  providerName: string;
  platform: string;
  endpointUrl: string;
  model: string;
  priority: number;
  timeoutMs: number;
  retryCount: number;
  status: string;
  apiKeyRef: string;
  temperature?: number;
  maxTokens?: number;
};

export type CreateLlmProviderPayload = Record<string, FormDataEntryValue>;

export type CreateLlmProviderResult = {
  id: string;
  status: string;
  provider: LlmProvider;
};

export type Formula = {
  id: string;
  name: string;
  platform: string;
  usage: number;
  risk: string;
};

export type KnowledgeImportPayload = {
  type: string;
  fileName: string;
};

export type KnowledgeImportResult = {
  id: string;
  type: string;
  fileName: string;
  rows: number;
  status: string;
};

export type AuditTask = {
  id: string;
  script: string;
  brand: string;
  owner: string;
  status: string;
  risk: string;
  submittedAt: string;
};

export type AuditActionResult = {
  id: string;
  status: string;
  message: string;
};

export type Material = {
  id: string;
  name: string;
  type: string;
  brand: string;
  project: string;
  usage: number;
  size: string;
};

export type MaterialDownloadResult = {
  id: string;
  fileName: string;
  url: string;
};

export type Tenant = {
  id: string;
  name: string;
  users: number;
  storage: string;
  status: string;
};

export type CreateTenantPayload = Record<string, FormDataEntryValue>;

export type CreateTenantResult = {
  id: string;
  status: string;
  payload: CreateTenantPayload;
};

export type AdminAccount = {
  id: string;
  name: string;
  account: string;
  role: string;
  tenantScope: string;
  status: string;
  lastLogin: string;
};

export type CreateAdminUserPayload = Record<string, FormDataEntryValue>;

export type CreateAdminUserResult = {
  id: string;
  status: string;
  payload: CreateAdminUserPayload;
};

export type RolePermission = {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  status: string;
};

export type CreateRolePayload = Record<string, FormDataEntryValue>;

export type CreateRoleResult = {
  id: string;
  status: string;
  payload: CreateRolePayload;
};

export type OperationLog = {
  id: string;
  operator: string;
  module: string;
  action: string;
  ip: string;
  time: string;
  result: string;
};

export type AnalyticsData = {
  plays: string;
  interactionRate: string;
  orders: string;
  roi: string;
};
