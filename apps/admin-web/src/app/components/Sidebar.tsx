import { useState } from 'react';
import { Box, Collapse, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { BarChart3, BookOpen, ChevronDown, ChevronRight, Cpu, Database, FileCheck, FileText, Folder, KeyRound, Link, ListChecks, Settings, Shield, TrendingUp, Users, Video } from 'lucide-react';
import type { AdminMenuItem } from '../../types/admin';

const drawerWidth = 268;

const iconMap: Record<string, typeof Database> = {
  barChart3: BarChart3,
  database: Database,
  bookOpen: BookOpen,
  fileCheck: FileCheck,
  video: Video,
  settings: Settings,
  users: Users,
  shield: Shield,
  fileText: FileText,
  dashboard: BarChart3,
  link: Link,
  book: BookOpen,
  folder: Folder,
  chart: TrendingUp,
  cpu: Cpu,
  key: KeyRound,
  list: ListChecks,
};

interface SidebarProps {
  menuItems: AdminMenuItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ menuItems, currentPath, onNavigate }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(() => menuItems.filter((item) => item.children?.some((child) => child.path === currentPath)).map((item) => item.id));

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const renderMenuItem = (item: AdminMenuItem, level = 0) => {
    const Icon = iconMap[item.icon] || Database;
    const hasChildren = Boolean(item.children?.length);
    const isExpanded = expandedItems.includes(item.id);
    const isActive = currentPath === item.path;

    return (
      <Box key={item.id}>
        <ListItemButton
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
              return;
            }
            if (item.path) onNavigate(item.path);
          }}
          sx={{
            mx: 1.4,
            mb: 0.4,
            pl: 1.4 + level * 2,
            borderRadius: 2.4,
            color: isActive ? '#0f172a' : '#64748b',
            bgcolor: isActive ? '#dbeafe' : 'transparent',
            '&:hover': { bgcolor: isActive ? '#dbeafe' : '#f1f5f9' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: isActive ? 'primary.main' : '#64748b' }}>
            <Icon size={19} />
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{ fontSize: 14, fontWeight: isActive ? 900 : 700 }}
          />
          {hasChildren && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </ListItemButton>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
        },
      }}
    >
      <Box sx={{ p: 2.5, pt: 2.2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.6,
              display: 'grid',
              placeItems: 'center',
              color: '#06101d',
              bgcolor: 'linear-gradient(135deg, #38bdf8, #2dd4bf)',
              background: 'linear-gradient(135deg, #38bdf8, #2dd4bf)',
              fontWeight: 900,
            }}
          >
            AI
          </Box>
          <Box>
            <Typography variant="h6" color="primary" fontWeight={900} lineHeight={1.1}>
              AI短视频平台
            </Typography>
            <Typography variant="caption" color="text.secondary">
              后台管理系统
            </Typography>
          </Box>
        </Box>
      </Box>
      <Divider />
      <List sx={{ pt: 1.2 }}>{menuItems.map((item) => renderMenuItem(item))}</List>
    </Drawer>
  );
}

export { drawerWidth };
