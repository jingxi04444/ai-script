import { AnalyticsPage } from './AnalyticsPage';
import { AuditWorkflowPage } from './AuditWorkflowPage';
import { DashboardPage } from './DashboardPage';
import { KnowledgeBasePage } from './KnowledgeBasePage';
import { LLMProviderPage } from './LLMProviderPage';
import { MaterialsPage } from './MaterialsPage';
import { OperationLogPage } from './OperationLogPage';
import { ParsingPage } from './ParsingPage';
import { RolePermissionPage } from './RolePermissionPage';
import { SystemManagementPage } from './SystemManagementPage';
import { UserManagementPage } from './UserManagementPage';
import type { AdminMenuItem } from '../types/admin';
import type { AdminModal, Toast } from '../types/ui';

export function AdminPage({ active, menus, onMenusChange, showToast, openModal }: { active: string; menus: AdminMenuItem[]; onMenusChange: (menus: AdminMenuItem[]) => void; showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  if (active === 'dashboard') return <DashboardPage />;
  if (active === 'parsing') return <ParsingPage showToast={showToast} openModal={openModal} />;
  if (active === 'knowledge') return <KnowledgeBasePage showToast={showToast} openModal={openModal} />;
  if (active === 'audit') return <AuditWorkflowPage showToast={showToast} openModal={openModal} />;
  if (active === 'materials') return <MaterialsPage showToast={showToast} openModal={openModal} />;
  if (active === 'analytics') return <AnalyticsPage />;
  if (active === 'llm') return <LLMProviderPage showToast={showToast} openModal={openModal} />;
  if (active === 'users') return <UserManagementPage showToast={showToast} openModal={openModal} />;
  if (active === 'roles') return <RolePermissionPage showToast={showToast} openModal={openModal} />;
  if (active === 'logs') return <OperationLogPage showToast={showToast} />;
  return <SystemManagementPage menus={menus} onMenusChange={onMenusChange} showToast={showToast} openModal={openModal} />;
}
