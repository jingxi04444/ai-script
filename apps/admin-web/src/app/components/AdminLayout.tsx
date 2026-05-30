import { Box, Toolbar } from '@mui/material';
import { Header } from './Header';
import { Sidebar, drawerWidth } from './Sidebar';
import type { AdminMenuItem, AdminUser } from '../../types/admin';

interface AdminLayoutProps {
  children: React.ReactNode;
  menuItems: AdminMenuItem[];
  currentPath: string;
  user: AdminUser;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function AdminLayout({ children, menuItems, currentPath, user, onNavigate, onLogout }: AdminLayoutProps) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header user={user} onLogout={onLogout} />
      <Sidebar menuItems={menuItems} currentPath={currentPath} onNavigate={onNavigate} />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: `calc(100% - ${drawerWidth}px)`, p: { xs: 2, md: 3 } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
