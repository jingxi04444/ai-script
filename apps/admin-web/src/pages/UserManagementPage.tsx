import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Panel } from '../components/Panel';
import { userApi } from '../services/userApi';
import type { AdminAccount } from '../types/admin';
import type { AdminModal, Toast } from '../types/ui';

export function UserManagementPage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [users, setUsers] = useState<AdminAccount[]>([]);

  useEffect(() => {
    userApi.getAdminUsers().then((data) => setUsers(data));
  }, []);

  const createUser = () => openModal({
    title: '新增后台用户',
    description: '创建后台账号并分配角色，真实后端需写入操作日志。',
    confirmText: '创建用户',
    fields: [
      { name: 'name', label: '用户姓名', placeholder: '请输入姓名' },
      { name: 'account', label: '登录账号', placeholder: 'name@company.com' },
      { name: 'role', label: '角色', defaultValue: '审核员' },
      { name: 'tenantScope', label: '租户范围', defaultValue: '北钥宠物生活' },
    ],
    onConfirm: async (payload) => {
      await userApi.createAdminUser(payload);
      setUsers((current) => [{ id: `admin_${Date.now()}`, name: String(payload.name || '新用户'), account: String(payload.account || 'new@ai-script.local'), role: String(payload.role || '审核员'), tenantScope: String(payload.tenantScope || '未分配'), status: '启用', lastLogin: '未登录' }, ...current]);
      showToast('后台用户已创建。');
    },
  });

  return <Panel title="用户管理" action={<button onClick={createUser}>新增用户</button>}><DataTable columns={['用户', '账号', '角色', '租户范围', '状态', '最近登录', '操作']} rows={users.map((user) => [user.name, user.account, user.role, user.tenantScope, user.status, user.lastLogin, <div className="action-pair"><button className="inline-action secondary" onClick={() => showToast(`${user.name} 资料进入编辑状态。`)}>编辑</button><button className="inline-action danger" disabled={user.status === '停用'} onClick={async () => { await userApi.disableAdminUser(user.id); setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: '停用' } : item)); showToast('用户已停用。', 'warning'); }}>停用</button></div>])} /></Panel>;
}
