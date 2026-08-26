import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ScriptGenerationQueue from '../GenerationQueue/ScriptGenerationQueue';

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();
  const { token, user, isAuthenticated, needsPhoneBinding, needsEmailBinding, fetchUserInfo } = useAuthStore();
  const [checking, setChecking] = useState(Boolean(token && !user));

  useEffect(() => {
    if (!token || user) {
      setChecking(false);
      return;
    }

    let active = true;
    setChecking(true);
    fetchUserInfo()
      .catch(() => undefined)
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [fetchUserInfo, token, user]);

  if (!token || (!checking && !isAuthenticated)) {
    const redirect = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace state={{ from: location }} />;
  }

  if (checking) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#667085' }}>
        正在校验登录状态...
      </div>
    );
  }

  if (needsPhoneBinding || needsEmailBinding) {
    const redirect = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace state={{ from: location }} />;
  }

  return (
    <>
      {children}
      <ScriptGenerationQueue />
    </>
  );
};

export default RequireAuth;
