import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import HomePage from './pages/Home/HomePage';
import ProjectsPage from './pages/Projects/ProjectsPage';
import WorkspacePage from './pages/Workspace/WorkspacePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'home', element: <HomePage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'workspace', element: <WorkspacePage /> },
      { path: '*', element: <Navigate to="/home" replace /> },
    ],
  },
]);
