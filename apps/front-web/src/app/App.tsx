import { useEffect, useState } from 'react';
import { authApi } from '../services/authApi';
import { themes } from './theme';
import { clearStoredSession, readStoredSession, saveStoredSession } from './session';
import { getWorkspaceProjectId, isAssetLibraryPath, isAuthPath, isRegisterPath, isSharePath, isWorkspacePath, navigate, usePathname } from './router';
import { AssetLibraryPage } from '../pages/AssetLibraryPage';
import { AuthLoadingPage, AuthPage } from '../pages/AuthPage';
import { ProjectHomePage } from '../pages/ProjectHomePage';
import { ShareScriptPage } from '../pages/ShareScriptPage';
import { WorkspacePage } from '../pages/WorkspacePage';
import type { AuthResult, User } from '../types/auth';
import type { ThemeKey, Toast } from '../types/ui';

export default function App() {
  const path = usePathname();
  const sharePath = isSharePath(path);
  const authPath = isAuthPath(path);
  const [user, setUser] = useState<User | null>(() => readStoredSession()?.user || null);
  const [authHydrated, setAuthHydrated] = useState(() => authPath || sharePath);
  const [toast, setToast] = useState<Toast | null>(null);
  const [theme, setTheme] = useState<ThemeKey>(() => (localStorage.getItem('front-theme') as ThemeKey) || 'green');

  const showToast = (message: string, tone: Toast['tone'] = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2200);
  };

  const cycleTheme = () => {
    const currentIndex = themes.findIndex((item) => item.key === theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length].key;
    setTheme(nextTheme);
    showToast(`主题色已切换为${themes.find((item) => item.key === nextTheme)?.label || '默认主题'}`);
  };

  const completeAuth = (result: AuthResult) => {
    saveStoredSession(result);
    setUser(result.user);
    navigate('/projects');
  };

  const logout = () => {
    clearStoredSession();
    setUser(null);
    navigate('/login');
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('front-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (sharePath || authPath) {
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
  }, [authPath, sharePath]);

  if (sharePath) {
    return <ShareScriptPage />;
  }

  if (isRegisterPath(path)) {
    return <AuthPage mode="register" onDone={completeAuth} />;
  }

  if (!authHydrated) {
    return <AuthLoadingPage />;
  }

  if (path.startsWith('/login') || !user) {
    return <AuthPage mode="login" onDone={completeAuth} />;
  }

  if (isWorkspacePath(path)) {
    return <WorkspacePage projectId={getWorkspaceProjectId(path)} user={user} showToast={showToast} toast={toast} theme={theme} onThemeToggle={cycleTheme} onLogout={logout} />;
  }

  if (isAssetLibraryPath(path)) {
    return <AssetLibraryPage user={user} showToast={showToast} toast={toast} theme={theme} onThemeToggle={cycleTheme} onLogout={logout} />;
  }

  return <ProjectHomePage user={user} showToast={showToast} toast={toast} theme={theme} onThemeToggle={cycleTheme} onLogout={logout} />;
}
