import { useEffect, useState } from 'react';

export const adminRoutes = {
  login: '/admin/login',
  dashboard: '/admin/dashboard',
};

export const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export function usePathname() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  return path;
}

export const isAdminRootPath = (path: string) => path === '/' || path === '/admin';
export const isAdminLoginPath = (path: string) => path.startsWith('/admin/login');
