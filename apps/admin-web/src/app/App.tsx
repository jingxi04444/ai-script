import { useEffect, useMemo, useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { Alert, Snackbar } from '@mui/material';
import { AdminLayout } from './components/AdminLayout';
import { clearStoredSession, readStoredSession, saveStoredSession } from './session';
import { isLoginPath, navigate, usePathname } from './router';
import { theme } from './theme';
import { authApi } from '../services/authApi';
import { menuApi } from '../services/menuApi';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { ApiManagementPage } from '../pages/ApiManagementPage';
import { AuditWorkflowPage } from '../pages/AuditWorkflowPage';
import { DashboardPage } from '../pages/DashboardPage';
import { KnowledgeBasePage } from '../pages/KnowledgeBasePage';
import { OperationLogPage } from '../pages/OperationLogPage';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';
import { ProjectManagementPage } from '../pages/ProjectManagementPage';
import { RolePermissionPage } from '../pages/RolePermissionPage';
import { SystemManagementPage } from '../pages/SystemManagementPage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { LoadingState } from '../components/LoadingState';
import type { AdminMenuItem, AdminUser, AuthResult } from '../types/admin';

function canAccess(menu: AdminMenuItem, user: AdminUser) {
  if (!menu.enabled) return false;
  if (!menu.permission || user.permissions.includes('*')) return true;
  return user.permissions.includes(menu.permission);
}

function normalizeMenus(menus: AdminMenuItem[], user: AdminUser): AdminMenuItem[] {
  return menus
    .filter((menu) => canAccess(menu, user))
    .map((menu) => ({
      ...menu,
      children: menu.children ? normalizeMenus(menu.children, user) : undefined,
    }))
    .filter((menu) => menu.path || menu.children?.length)
    .sort((a, b) => a.order - b.order);
}

function firstMenuPath(menus: AdminMenuItem[]): string {
  for (const menu of menus) {
    if (menu.path) return menu.path;
    if (menu.children?.length) return firstMenuPath(menu.children);
  }
  return '/admin/dashboard';
}

function routeKey(path: string) {
  if (path.startsWith('/admin/materials/')) return '/project-detail';

  const aliases: Record<string, string> = {
    '/admin/dashboard': '/dashboard',
    '/admin/knowledge': '/knowledge-base',
    '/admin/audit': '/audit-workflow',
    '/admin/materials': '/project-management',
    '/admin/analytics': '/dashboard',
    '/admin/llm': '/api-management',
    '/admin/users': '/user-management',
    '/admin/roles': '/role-permission',
    '/admin/logs': '/operation-logs',
    '/admin/system': '/system-management',
  };
  return aliases[path] || path;
}

export default function App() {
  const path = usePathname();
  const [user, setUser] = useState<AdminUser | null>(() => readStoredSession()?.user || null);
  const [authHydrated, setAuthHydrated] = useState(() => isLoginPath(path));
  const [menus, setMenus] = useState<AdminMenuItem[]>([]);
  const [toast, setToast] = useState('');

  const visibleMenus = useMemo(() => (user ? normalizeMenus(menus, user) : []), [menus, user]);

  const completeAuth = (result: AuthResult) => {
    saveStoredSession(result);
    setUser(result.user);
    setAuthHydrated(true);
    navigate('/admin/dashboard');
  };

  const logout = () => {
    clearStoredSession();
    setUser(null);
    setMenus([]);
    navigate('/login');
  };

  useEffect(() => {
    if (isLoginPath(path)) {
      setAuthHydrated(true);
      return;
    }

    let cancelled = false;
    const storedSession = readStoredSession();
    if (!storedSession) {
      clearStoredSession();
      setUser(null);
      setAuthHydrated(true);
      return;
    }

    setAuthHydrated(false);
    authApi.getCurrentUser()
      .then((nextUser) => {
        if (cancelled) return;
        saveStoredSession({ token: storedSession.token, user: nextUser });
        setUser(nextUser);
        setAuthHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        clearStoredSession();
        setUser(null);
        setAuthHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    menuApi.getMenus()
      .then((nextMenus) => {
        if (!cancelled) setMenus(nextMenus);
      })
      .catch(() => setToast('菜单加载失败'));

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !visibleMenus.length) return;
    if (isLoginPath(path)) {
      navigate(firstMenuPath(visibleMenus));
    }
  }, [path, user, visibleMenus]);

  const renderPage = () => {
    const projectId = path.startsWith('/admin/materials/') ? decodeURIComponent(path.replace('/admin/materials/', '')) : '';

    switch (routeKey(path)) {
      case '/dashboard':
        return <DashboardPage />;
      case '/api-management':
        return <ApiManagementPage />;
      case '/knowledge-base':
        return <KnowledgeBasePage />;
      case '/audit-workflow':
        return <AuditWorkflowPage />;
      case '/project-management':
        return <ProjectManagementPage />;
      case '/project-detail':
        return <ProjectDetailPage projectId={projectId} />;
      case '/user-management':
        return <UserManagementPage />;
      case '/role-permission':
        return <RolePermissionPage />;
      case '/operation-logs':
        return <OperationLogPage />;
      case '/system-management':
        return <SystemManagementPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!authHydrated ? (
        <LoadingState label="校验后台登录状态..." />
      ) : !user || isLoginPath(path) ? (
        <AdminLoginPage onDone={completeAuth} />
      ) : (
        <AdminLayout menuItems={visibleMenus} currentPath={path} user={user} onNavigate={navigate} onLogout={logout}>
          {renderPage()}
        </AdminLayout>
      )}
      <Snackbar open={Boolean(toast)} autoHideDuration={2400} onClose={() => setToast('')}>
        <Alert severity="error" variant="filled" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
