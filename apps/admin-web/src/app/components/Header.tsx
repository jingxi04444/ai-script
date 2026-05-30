import { useState } from 'react';
import { AppBar, Avatar, Badge, Box, Chip, IconButton, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import { API_BASE_URL, USE_MOCK_API } from '../../services/apiClient';
import type { AdminUser } from '../../types/admin';

interface HeaderProps {
  user: AdminUser;
  onLogout: () => void;
}

function roleColor(role: AdminUser['role']) {
  if (role === '超级管理员') return 'error';
  if (role === '品牌管理员') return 'primary';
  return 'warning';
}

export function Header({ user, onLogout }: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
        bgcolor: 'rgba(255, 255, 255, 0.92)',
        borderBottom: '1px solid #e2e8f0',
        color: 'text.primary',
        backdropFilter: 'blur(18px)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" fontWeight={900}>
            控制台
          </Typography>
          <Typography variant="caption" color="text.secondary">
            内容生产、审核、权限与 API Provider 管理
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={USE_MOCK_API ? 'Mock 数据' : `后端接口：${API_BASE_URL || '同源'}`}
            size="small"
            color={USE_MOCK_API ? 'warning' : 'success'}
            variant="outlined"
            sx={{ display: { xs: 'none', md: 'inline-flex' }, fontWeight: 800 }}
          />
          <IconButton>
            <Badge badgeContent={3} color="error">
              <Bell size={20} />
            </Badge>
          </IconButton>

          <Box
            onClick={(event) => setAnchorEl(event.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              px: 1.2,
              py: 0.7,
              borderRadius: 3,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontWeight: 900 }}>
              {user.name.charAt(0)}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={800}>
                {user.name}
              </Typography>
              <Chip label={user.role} size="small" color={roleColor(user.role)} sx={{ height: 18, fontSize: 11 }} />
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => setAnchorEl(null)}>
              <User size={16} style={{ marginRight: 8 }} />
              个人信息
            </MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>
              <Settings size={16} style={{ marginRight: 8 }} />
              账号设置
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                onLogout();
              }}
            >
              <LogOut size={16} style={{ marginRight: 8 }} />
              退出登录
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
