import { useEffect, useState } from 'react';

export function navigate(path: string) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePathname() {
  const [path, setPath] = useState(window.location.pathname || '/admin/dashboard');

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname || '/admin/dashboard');
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);

  return path;
}

export function isLoginPath(path: string) {
  return path === '/login' || path === '/';
}
