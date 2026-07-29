import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import AdminLayout from './components/Layout/AdminLayout';

const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const FrontendPage = lazy(() => import('./pages/Frontend/FrontendPage'));
const ProjectListPage = lazy(() => import('./pages/Projects/ProjectListPage'));
const UserListPage = lazy(() => import('./pages/Users/UserListPage'));
const ModelsPage = lazy(() => import('./pages/Models/ModelsPage'));
const BillingPage = lazy(() => import('./pages/Billing/BillingPage'));
const ReviewPage = lazy(() => import('./pages/Review/ReviewPage'));
const PaymentOrdersPage = lazy(() => import('./pages/Payments/PaymentOrdersPage'));
const TemplateListPage = lazy(() => import('./pages/Templates/TemplateListPage'));
const PromptTemplatesPage = lazy(() => import('./pages/Materials/PromptTemplatesPage'));
const ImportTemplatesPage = lazy(() => import('./pages/Materials/ImportTemplatesPage'));
const RolesPage = lazy(() => import('./pages/System/RolesPage'));
const PermissionsPage = lazy(() => import('./pages/System/PermissionsPage'));
const OperationLogsPage = lazy(() => import('./pages/System/OperationLogsPage'));
const SiteConfigPage = lazy(() => import('./pages/System/SiteConfigPage'));
const HomeBannersPage = lazy(() => import('./pages/System/HomeBannersPage'));
const PageVisualPage = lazy(() => import('./pages/System/PageVisualPage'));
const ConfigDictionaryPage = lazy(() => import('./pages/System/ConfigDictionaryPage'));
const ScriptFormatsPage = lazy(() => import('./pages/System/ScriptFormatsPage'));
const ScriptGeneratorManagementPage = lazy(() => import('./pages/ScriptGenerator/ScriptGeneratorManagementPage'));

const LazyLoad = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<div>Loading...</div>}>
    {children}
  </Suspense>
);

export const router: RouteObject[] = [
  {
    path: '/login',
    element: <LazyLoad><LoginPage /></LazyLoad>,
  },
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <LazyLoad><DashboardPage /></LazyLoad>,
      },
      {
        path: 'frontend',
        element: <LazyLoad><FrontendPage /></LazyLoad>,
      },
      {
        path: 'models',
        element: <LazyLoad><ModelsPage /></LazyLoad>,
      },
      {
        path: 'billing',
        element: <LazyLoad><BillingPage /></LazyLoad>,
      },
      {
        path: 'payments/orders',
        element: <LazyLoad><PaymentOrdersPage /></LazyLoad>,
      },
      {
        path: 'review',
        element: <LazyLoad><ReviewPage /></LazyLoad>,
      },
      {
        path: 'materials',
        element: <Navigate to="/templates" replace />,
      },
      {
        path: 'users',
        element: <LazyLoad><UserListPage /></LazyLoad>,
      },
      {
        path: 'projects',
        element: <LazyLoad><ProjectListPage /></LazyLoad>,
      },
      {
        path: 'templates',
        element: <LazyLoad><TemplateListPage /></LazyLoad>,
      },
      {
        path: 'script-generator-management',
        element: <LazyLoad><ScriptGeneratorManagementPage /></LazyLoad>,
      },
      {
        path: 'ai-script-management',
        element: <LazyLoad><SiteConfigPage promptOnly /></LazyLoad>,
      },
      {
        path: 'prompt-templates',
        element: <LazyLoad><PromptTemplatesPage /></LazyLoad>,
      },
      {
        path: 'brief-management/detection-prompts',
        element: <LazyLoad><PromptTemplatesPage briefMode /></LazyLoad>,
      },
      {
        path: 'import-templates',
        element: <LazyLoad><ImportTemplatesPage /></LazyLoad>,
      },
      {
        path: 'brief-management/import-template',
        element: <LazyLoad><ImportTemplatesPage briefMode /></LazyLoad>,
      },
      {
        path: 'brief-management/script-formats',
        element: <LazyLoad><ScriptFormatsPage briefMode /></LazyLoad>,
      },
      {
        path: 'system',
        element: <Navigate to="/system/roles" replace />,
      },
      {
        path: 'system/roles',
        element: <LazyLoad><RolesPage /></LazyLoad>,
      },
      {
        path: 'system/permissions',
        element: <LazyLoad><PermissionsPage /></LazyLoad>,
      },
      {
        path: 'system/logs',
        element: <LazyLoad><OperationLogsPage /></LazyLoad>,
      },
      {
        path: 'system/home-banners',
        element: <LazyLoad><HomeBannersPage /></LazyLoad>,
      },
      {
        path: 'system/page-visual',
        element: <LazyLoad><PageVisualPage /></LazyLoad>,
      },
      {
        path: 'system/site-config',
        element: <LazyLoad><SiteConfigPage /></LazyLoad>,
      },
      {
        path: 'system/config-dictionary',
        element: <LazyLoad><ConfigDictionaryPage /></LazyLoad>,
      },
      {
        path: 'system/script-formats',
        element: <LazyLoad><ScriptFormatsPage /></LazyLoad>,
      },
      {
        path: 'settings',
        element: <Navigate to="/system/site-config" replace />,
      },
      {
        path: 'scripts',
        element: <Navigate to="/script-generator-management" replace />,
      },
    ],
  },
];
