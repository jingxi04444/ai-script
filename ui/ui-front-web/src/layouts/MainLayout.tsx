import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';

const MainLayout = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register') {
      navigate('/login');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className="home-app-shell">
      <Outlet />
    </div>
  );
};

export default MainLayout;
