import { useEffect, useState } from 'react';
import { AdminActionModal } from '../components/AdminActionModal';
import { ToastView } from '../components/ToastView';
import { AdminPage } from '../pages/AdminPage';
import { menuApi } from '../services/menuApi';
import type { AdminMenuItem, AdminUser } from '../types/admin';
import type { AdminModal, Toast } from '../types/ui';
import { navigate } from './router';

export function AdminLayout({ user, path, toast, showToast }: { user: AdminUser; path: string; toast: Toast | null; showToast: (message: string, tone?: Toast['tone']) => void }) {
  const [menus, setMenus] = useState<AdminMenuItem[]>([]);
  const [modal, setModal] = useState<AdminModal>(null);

  useEffect(() => {
    menuApi.getMenus().then((data) => setMenus(data));
  }, []);

  const orderedMenus = [...menus].sort((a, b) => a.order - b.order);
  const active = orderedMenus.find((item) => path.startsWith(item.path))?.id || 'dashboard';
  const visibleMenus = orderedMenus.filter((item) => item.enabled && user.permissions.includes(item.permission));
  const currentTitle = orderedMenus.find((item) => item.id === active)?.label || '数据概览';

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">AI 脚本平台</div>
        <p>模块化单体后台</p>
        <nav>
          {visibleMenus.map((item) => <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => navigate(item.path)}>{item.label}</button>)}
        </nav>
      </aside>
      <section className="admin-main">
        <header className="admin-header">
          <div>
            <span>当前模块</span>
            <h1>{currentTitle}</h1>
          </div>
          <div className="admin-user"><strong>{user.name}</strong><span>{user.role} / {user.tenantScope}</span><button onClick={() => navigate('/admin/login')}>退出</button></div>
        </header>
        {toast && <ToastView toast={toast} />}
        <AdminPage active={active} menus={orderedMenus} onMenusChange={setMenus} showToast={showToast} openModal={setModal} />
        <AdminActionModal modal={modal} onClose={() => setModal(null)} />
      </section>
    </main>
  );
}
