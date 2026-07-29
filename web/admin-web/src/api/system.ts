import api from './index';
import type { PageResult } from './index';

export interface Role {
  id: string;
  roleName?: string;
  roleCode?: string;
  description?: string;
  isSystem?: number;
  status?: number;
  permissionIds?: string[];
  createdAt?: string;
  updateTime?: string;
}

export interface Permission {
  id: string;
  permissionName?: string;
  permissionCode?: string;
  moduleCode?: string;
  permissionType?: string;
  path?: string;
  parentId?: string;
  icon?: string;
  sortOrder?: number;
  status?: number;
  createdAt?: string;
  updateTime?: string;
}

export interface OperationLog {
  id: string;
  tenantId?: string;
  userId?: string;
  moduleCode?: string;
  actionCode?: string;
  targetType?: string;
  targetId?: string;
  resultStatus?: string;
  ipAddress?: string;
  userAgent?: string;
  createTime?: string;
}

export interface PromptTemplate {
  id: string;
  providerId?: string;
  sceneCode?: string;
  templateName?: string;
  versionNo?: string;
  systemPrompt?: string;
  userPrompt?: string;
  responseSchema?: string;
  status?: number;
  createdAt?: string;
  updateTime?: string;
}

export interface ImportTemplate {
  id: string;
  templateType?: string;
  templateName?: string;
  downloadFileName?: string;
  templateFileKey?: string;
  templateFileUrl?: string;
  columnsJson?: string;
  sampleRowsJson?: string;
  description?: string;
  status?: number;
  createdAt?: string;
  updateTime?: string;
}

export interface ScriptFormat {
  id: string;
  name?: string;
  code?: string;
  formatRequirement?: string;
  sortOrder?: number;
  status?: number;
}

export interface HomeBanner {
  id?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageKey?: string;
  linkUrl?: string;
  sortOrder?: number;
  status?: number;
}

export interface SiteConfig {
  homeLogoUrl?: string;
  homeLogoKey?: string;
  viralSimpleAnalysisExample?: string;
  viralDeepAnalysisExample?: string;
  originalScenarioPrompts?: string;
  homeVisualConfig?: string;
  scriptVisualConfig?: string;
  [key: string]: unknown;
}

export interface ConfigDictionaryItem {
  id: string;
  parentId?: string;
  nodeType: 'group' | 'item';
  groupCode: string;
  configKey: string;
  configName: string;
  configValue?: string;
  valueType: 'string' | 'text' | 'number' | 'boolean' | 'json' | 'image';
  description?: string;
  sortOrder?: number;
  status?: number;
  children: ConfigDictionaryItem[];
}

export const systemApi = {
  getSiteConfig: (): Promise<SiteConfig> => api.get('/system/site-config'),
  updateSiteConfig: (data: Partial<SiteConfig>): Promise<SiteConfig> => api.put('/system/site-config', data),
  getConfigDictionary: (groupCode?: string): Promise<ConfigDictionaryItem[]> => api.get('/system/config-dictionary', { params: { groupCode } }),
  updateConfigDictionaryItem: (
    configKey: string,
    data: Partial<Pick<ConfigDictionaryItem, 'configKey' | 'configName' | 'configValue' | 'valueType' | 'description' | 'status'>>,
  ): Promise<ConfigDictionaryItem> => api.put(`/system/config-dictionary/${encodeURIComponent(configKey)}`, data),
  getHomeBanners: (): Promise<HomeBanner[]> => api.get('/system/home-banners'),
  createHomeBanner: (data: HomeBanner): Promise<HomeBanner> => api.post('/system/home-banners', data),
  updateHomeBanner: (id: string, data: HomeBanner): Promise<HomeBanner> => api.put(`/system/home-banners/${id}`, data),
  deleteHomeBanner: (id: string): Promise<void> => api.delete(`/system/home-banners/${id}`),

  getRoles: (params?: { page?: number; pageSize?: number; keyword?: string }): Promise<PageResult<Role>> => api.get('/system/roles', { params }),
  createRole: (data: Partial<Role>): Promise<Role> => api.post('/system/roles', data),
  updateRole: (id: string, data: Partial<Role>): Promise<Role> => api.put(`/system/roles/${id}`, data),
  deleteRole: (id: string): Promise<void> => api.delete(`/system/roles/${id}`),
  updateRolePermissions: (id: string, permissionIds: string[]): Promise<void> => api.put(`/system/roles/${id}/permissions`, { permissionIds }),

  getPermissions: (params?: { moduleCode?: string }): Promise<Permission[]> => api.get('/system/permissions', { params }),
  createPermission: (data: Partial<Permission>): Promise<Permission> => api.post('/system/permissions', data),
  updatePermission: (id: string, data: Partial<Permission>): Promise<Permission> => api.put(`/system/permissions/${id}`, data),
  deletePermission: (id: string): Promise<void> => api.delete(`/system/permissions/${id}`),

  getLogs: (params?: { page?: number; pageSize?: number; keyword?: string }): Promise<PageResult<OperationLog>> => api.get('/operation-logs', { params }),

  getPromptTemplates: (params?: { page?: number; pageSize?: number; keyword?: string; sceneCode?: string }): Promise<PageResult<PromptTemplate>> => api.get('/system/prompt-templates', { params }),
  createPromptTemplate: (data: Partial<PromptTemplate>): Promise<PromptTemplate> => api.post('/system/prompt-templates', data),
  updatePromptTemplate: (id: string, data: Partial<PromptTemplate>): Promise<PromptTemplate> => api.put(`/system/prompt-templates/${id}`, data),
  deletePromptTemplate: (id: string): Promise<void> => api.delete(`/system/prompt-templates/${id}`),

  getImportTemplates: (params?: { page?: number; pageSize?: number; keyword?: string; templateType?: string }): Promise<PageResult<ImportTemplate>> => api.get('/system/import-templates', { params }),
  createImportTemplate: (data: Partial<ImportTemplate>): Promise<ImportTemplate> => api.post('/system/import-templates', data),
  updateImportTemplate: (id: string, data: Partial<ImportTemplate>): Promise<ImportTemplate> => api.put(`/system/import-templates/${id}`, data),
  deleteImportTemplate: (id: string): Promise<void> => api.delete(`/system/import-templates/${id}`),
  uploadImportTemplateFile: (id: string, file: File): Promise<ImportTemplate> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/system/import-templates/${id}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getScriptFormats: (params?: { page?: number; pageSize?: number; keyword?: string; status?: number }): Promise<PageResult<ScriptFormat>> => api.get('/system/script-formats', { params }),
  createScriptFormat: (data: Partial<ScriptFormat>): Promise<ScriptFormat> => api.post('/system/script-formats', data),
  updateScriptFormat: (id: string, data: Partial<ScriptFormat>): Promise<ScriptFormat> => api.put(`/system/script-formats/${id}`, data),
  deleteScriptFormat: (id: string): Promise<void> => api.delete(`/system/script-formats/${id}`),
};
