import { useEffect, useState } from 'react';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { authApi } from '../services/authApi';
import type { AdminUser } from '../types/admin';
import type { Toast } from '../types/ui';
import { AdminLayout } from './AdminLayout';
import { adminRoutes, isAdminLoginPath, isAdminRootPath, navigate, usePathname } from './router';

export default function App() {
  const path = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, tone: Toast['tone'] = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    authApi.getCurrentUser().then((data) => setUser(data));
  }, []);

  if (isAdminRootPath(path)) {
    navigate(adminRoutes.dashboard);
    return null;
  }

  if (isAdminLoginPath(path) || !user) {
    return <AdminLoginPage onDone={(nextUser) => { setUser(nextUser); navigate(adminRoutes.dashboard); }} />;
  }

  return <AdminLayout user={user} path={path} toast={toast} showToast={showToast} />;
}
