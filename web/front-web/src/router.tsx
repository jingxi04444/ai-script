import { lazy, Suspense } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import RequireAuth from './components/Auth/RequireAuth';

const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'));
const HomePage = lazy(() => import('./pages/Home/HomePage'));
const ProjectsPage = lazy(() => import('./pages/Projects/ProjectsPage'));
const AssetsPage = lazy(() => import('./pages/Assets/AssetsPage'));
const WorkspacePage = lazy(() => import('./pages/Workspace/WorkspacePage'));
const BriefSharePage = lazy(() => import('./pages/BriefShare/BriefSharePage'));
const BriefSharePackPage = lazy(() => import('./pages/BriefSharePack/BriefSharePackPage'));
const PaymentOrdersPage = lazy(() => import('./pages/PaymentOrders/PaymentOrdersPage'));
const MembershipPage = lazy(() => import('./pages/Membership/MembershipPage'));
const MembershipOrdersPage = lazy(() => import('./pages/Membership/MembershipOrdersPage'));
const MembershipPointsPage = lazy(() => import('./pages/Membership/MembershipPointsPage'));
const MembershipExchangePage = lazy(() => import('./pages/Membership/MembershipExchangePage'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));
const PaymentResultPage = lazy(() => import('./pages/PaymentResult/PaymentResultPage'));

const LazyLoad = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#888' }}>Loading...</div>}>
    {children}
  </Suspense>
);

export const router: RouteObject[] = [
  {
    path: '/login',
    element: <LazyLoad><LoginPage /></LazyLoad>,
  },
  {
    path: '/register',
    element: <LazyLoad><RegisterPage /></LazyLoad>,
  },
  {
    path: '/',
    element: <Navigate to="/home" replace />,
  },
  {
    path: '/home',
    element: <RequireAuth><LazyLoad><HomePage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/projects',
    element: <RequireAuth><LazyLoad><ProjectsPage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/assets',
    element: <RequireAuth><LazyLoad><AssetsPage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/workspace',
    element: <RequireAuth><LazyLoad><WorkspacePage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/workspace/:projectId',
    element: <RequireAuth><LazyLoad><WorkspacePage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/brief-share-pack/:token',
    element: <LazyLoad><BriefSharePackPage /></LazyLoad>,
  },
  {
    path: '/brief-share/:token',
    element: <LazyLoad><BriefSharePage /></LazyLoad>,
  },
  {
    path: '/membership',
    element: <RequireAuth><LazyLoad><MembershipPage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/membership/orders',
    element: <RequireAuth><LazyLoad><MembershipOrdersPage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/membership/points',
    element: <RequireAuth><LazyLoad><MembershipPointsPage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/membership/exchange',
    element: <RequireAuth><LazyLoad><MembershipExchangePage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/membership/auto-renew',
    element: <Navigate to="/membership" replace />,
  },
  {
    path: '/payment/orders',
    element: <RequireAuth><LazyLoad><PaymentOrdersPage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/payment/result',
    element: <RequireAuth><LazyLoad><PaymentResultPage /></LazyLoad></RequireAuth>,
  },
  {
    path: '/notifications',
    element: <RequireAuth><LazyLoad><NotificationsPage /></LazyLoad></RequireAuth>,
  },
  {
    path: '*',
    element: <Navigate to="/home" replace />,
  },
];
