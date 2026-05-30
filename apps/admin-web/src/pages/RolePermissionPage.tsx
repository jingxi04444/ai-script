import { useEffect, useState } from 'react';
import { Chip, Paper, Stack, Typography } from '@mui/material';
import { PageScaffold } from '../components/PageScaffold';
import { LoadingState } from '../components/LoadingState';
import { userApi } from '../services/userApi';
import type { RolePermission } from '../types/admin';

export function RolePermissionPage() {
  const [roles, setRoles] = useState<RolePermission[] | null>(null);

  useEffect(() => {
    userApi.getRoles().then(setRoles);
  }, []);

  if (!roles) return <LoadingState label="加载角色权限..." />;

  return (
    <PageScaffold title="角色权限" description="独立管理角色、权限包和用户数量，不与系统设置混在一起。">
      <Stack spacing={2}>
        {roles.map((role) => (
          <Paper key={role.id} elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
              <Stack spacing={1}>
                <Chip label={role.name} color={role.color} sx={{ alignSelf: 'flex-start' }} />
                <Typography variant="h5" fontWeight={900}>{role.userCount} 个账号正在使用</Typography>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ maxWidth: 680 }}>
                {role.permissions.map((permission) => <Chip key={permission} label={permission} variant="outlined" />)}
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </PageScaffold>
  );
}
