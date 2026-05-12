import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Panel } from '../components/Panel';
import { roleApi } from '../services/roleApi';
import type { RolePermission } from '../types/admin';
import type { AdminModal, Toast } from '../types/ui';

export function RolePermissionPage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [roles, setRoles] = useState<RolePermission[]>([]);

  useEffect(() => {
    roleApi.getRoles().then((data) => setRoles(data));
  }, []);

  const createRole = () => openModal({
    title: '新增角色',
    description: '创建角色并配置模块权限，权限标识需和动态菜单 permission 保持一致。',
    confirmText: '创建角色',
    fields: [
      { name: 'name', label: '角色名称', placeholder: '例如：内容审核主管' },
      { name: 'description', label: '角色说明', placeholder: '请输入角色职责' },
      { name: 'permissions', label: '权限标识', defaultValue: 'audit,materials' },
    ],
    onConfirm: async (payload) => {
      await roleApi.createRole(payload);
      const permissions = String(payload.permissions || '').split(',').map((item) => item.trim()).filter(Boolean);
      setRoles((current) => [{ id: `role_${Date.now()}`, name: String(payload.name || '新角色'), description: String(payload.description || '自定义角色'), userCount: 0, permissions, status: '启用' }, ...current]);
      showToast('角色已创建。');
    },
  });

  return <Panel title="角色权限" action={<button onClick={createRole}>新增角色</button>}><DataTable columns={['角色', '说明', '用户数', '权限标识', '状态', '操作']} rows={roles.map((role) => [role.name, role.description, role.userCount, <div className="permission-tags">{role.permissions.map((permission) => <span key={permission}>{permission}</span>)}</div>, role.status, <div className="action-pair"><button className="inline-action secondary" onClick={() => showToast(`${role.name} 权限进入编辑状态。`)}>编辑</button><button className="inline-action" onClick={() => showToast(`${role.name} 权限已同步到动态菜单。`)}>同步菜单</button></div>])} /></Panel>;
}
