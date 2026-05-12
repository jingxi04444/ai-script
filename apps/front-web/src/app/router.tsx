import { useEffect, useState } from 'react';

export const routes = {
  login: '/login',
  register: '/register',
  projects: '/projects',
  assets: '/assets',
  workspace: (projectId: string, step = 'global') => `/projects/${projectId}/workspace?step=${step}`,
  shareScript: (shareToken: string) => `/share/scripts/${shareToken}`,
};

export const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export function usePathname() {
  const [path, setPath] = useState(window.location.pathname + window.location.search);

  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  return path;
}

export const isSharePath = (path: string) => path.startsWith('/share/scripts/');
export const isRegisterPath = (path: string) => path.startsWith('/register');
export const isLoginPath = (path: string) => path.startsWith('/login');
export const isAuthPath = (path: string) => isLoginPath(path) || isRegisterPath(path);
export const isWorkspacePath = (path: string) => path.startsWith('/projects/') && path.includes('/workspace');
export const isAssetLibraryPath = (path: string) => path.startsWith('/assets');

export const getWorkspaceProjectId = (path: string) => path.split('/')[2];
