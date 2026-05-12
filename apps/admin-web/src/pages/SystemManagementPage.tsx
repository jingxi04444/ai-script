import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Panel } from '../components/Panel';
import { menuApi } from '../services/menuApi';
import { tenantApi } from '../services/tenantApi';
import type { AdminMenuItem, Tenant } from '../types/admin';
import type { AdminModal, Toast } from '../types/ui';

export function SystemManagementPage({ menus, onMenusChange, showToast, openModal }: { menus: AdminMenuItem[]; onMenusChange: (menus: AdminMenuItem[]) => void; showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    tenantApi.getTenants().then((data) => setTenants(data));
  }, []);

  const sortedMenus = [...menus].sort((a, b) => a.order - b.order);

  const persistMenus = async (nextMenus: AdminMenuItem[], message = '菜单配置已保存。') => {
    const normalized = nextMenus.map((item, index) => ({ ...item, order: (index + 1) * 10 }));
    const result = await menuApi.updateMenus({ menus: normalized });
    onMenusChange(result.menus);
    showToast(message);
  };

  const toggleMenu = async (menu: AdminMenuItem) => {
    if (menu.id === 'system') {
      showToast('系统权限菜单不能停用，避免无法恢复菜单配置。', 'warning');
      return;
    }
    await persistMenus(sortedMenus.map((item) => item.id === menu.id ? { ...item, enabled: !item.enabled } : item), menu.enabled ? '菜单已停用。' : '菜单已启用。');
  };

  const moveMenu = async (menu: AdminMenuItem, direction: 'up' | 'down') => {
    const currentIndex = sortedMenus.findIndex((item) => item.id === menu.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedMenus.length) return;
    const nextMenus = [...sortedMenus];
    [nextMenus[currentIndex], nextMenus[targetIndex]] = [nextMenus[targetIndex], nextMenus[currentIndex]];
    await persistMenus(nextMenus, '菜单排序已更新。');
  };

  const renameMenu = (menu: AdminMenuItem) => openModal({
    title: '编辑菜单',
    description: '菜单名称、路径和权限标识由后台返回，前端根据该配置动态渲染侧栏。',
    confirmText: '保存菜单',
    fields: [
      { name: 'label', label: '菜单名称', defaultValue: menu.label },
      { name: 'path', label: '菜单路径', defaultValue: menu.path },
      { name: 'permission', label: '权限标识', defaultValue: menu.permission },
    ],
    onConfirm: async (payload) => {
      const nextMenus = sortedMenus.map((item) => item.id === menu.id ? {
        ...item,
        label: String(payload.label || item.label),
        path: String(payload.path || item.path),
        permission: String(payload.permission || item.permission),
      } : item);
      await persistMenus(nextMenus);
    },
  });

  return <section className="page-stack"><Panel title="多租户管理" action={<button onClick={() => openModal({ title: '新增品牌租户', description: '模拟创建品牌租户，并写入系统操作日志。', confirmText: '创建租户', fields: [{ name: 'name', label: '品牌名称', placeholder: '请输入品牌名称' }, { name: 'contact', label: '联系人', placeholder: '请输入联系人' }], onConfirm: async (payload) => { await tenantApi.createTenant(payload); setTenants((prev) => [{ id: `tenant_${Date.now()}`, name: String(payload.name || '新品牌'), users: 1, storage: '0GB', status: '启用' }, ...prev]); showToast('品牌租户已创建。'); } })}>新增租户</button>}><DataTable columns={['品牌租户', '用户数', '存储占用', '状态']} rows={tenants.map((tenant) => [tenant.name, tenant.users, tenant.storage, tenant.status])} /></Panel><Panel title="动态菜单配置" action={<button onClick={() => persistMenus(sortedMenus)}>保存当前菜单</button>}><DataTable columns={['菜单名称', '路径', '权限标识', '状态', '排序', '操作']} rows={sortedMenus.map((menu, index) => [menu.label, menu.path, menu.permission, menu.enabled ? '启用' : '停用', menu.order, <div className="action-pair"><button className="inline-action secondary" onClick={() => renameMenu(menu)}>编辑</button><button className="inline-action secondary" onClick={() => moveMenu(menu, 'up')} disabled={index === 0}>上移</button><button className="inline-action secondary" onClick={() => moveMenu(menu, 'down')} disabled={index === sortedMenus.length - 1}>下移</button><button className={menu.enabled ? 'inline-action danger' : 'inline-action'} onClick={() => toggleMenu(menu)}>{menu.enabled ? '停用' : '启用'}</button></div>])} /></Panel></section>;
}
