import { useEffect, useState } from 'react';
import { Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Key, Plus, Shield } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { PageScaffold } from '../components/PageScaffold';
import { userApi } from '../services/userApi';
import type { AdminRole, CreateUserRequest, ManagedUser, RolePermission } from '../types/admin';

const emptyUser: CreateUserRequest = {
  name: '',
  email: '',
  phone: '',
  role: '品牌管理员',
  brand: '',
  password: '123456',
};

function roleColor(role: AdminRole) {
  if (role === '超级管理员') return 'error';
  if (role === '品牌管理员') return 'primary';
  return 'warning';
}

export function UserManagementPage() {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [form, setForm] = useState<CreateUserRequest>(emptyUser);

  const loadData = async () => {
    const [nextUsers, nextRoles] = await Promise.all([userApi.getUsers(), userApi.getRoles()]);
    setUsers(nextUsers);
    setRoles(nextRoles);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createUser = async () => {
    await userApi.createUser(form);
    setOpenUserDialog(false);
    setForm(emptyUser);
    loadData();
  };

  const toggleUser = async (user: ManagedUser) => {
    await userApi.updateUserStatus(user.id, user.status === 'active' ? 'inactive' : 'active');
    loadData();
  };

  if (!users) return <LoadingState label="加载用户数据..." />;

  return (
    <PageScaffold title="用户管理" description="管理系统用户账号、租户品牌归属与登录状态。" actions={<Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setOpenUserDialog(true)}>添加用户</Button>}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2, mb: 3 }}>
        {roles.map((role) => (
          <Paper key={role.id} elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid #e5e7eb' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Box>
                <Chip label={role.name} color={role.color} sx={{ mb: 1 }} />
                <Typography variant="h5" fontWeight={900}>{role.userCount} 人</Typography>
              </Box>
              <Shield size={20} color="#2563eb" />
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>{role.permissions.map((permission) => <Chip key={permission} label={permission} size="small" variant="outlined" />)}</Stack>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={900}>用户列表</Typography>
          <Button variant="outlined" size="small" startIcon={<Shield size={16} />}>角色管理</Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>用户</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>所属品牌</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>最后登录</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell><Stack direction="row" alignItems="center" spacing={1.5}><Avatar sx={{ width: 32, height: 32 }}>{user.name.charAt(0)}</Avatar><Typography fontWeight={800}>{user.name}</Typography></Stack></TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell><Chip label={user.role} size="small" color={roleColor(user.role)} /></TableCell>
                  <TableCell>{user.brand}</TableCell>
                  <TableCell><Switch checked={user.status === 'active'} size="small" onChange={() => toggleUser(user)} /></TableCell>
                  <TableCell>{user.lastLogin}</TableCell>
                  <TableCell>{user.createTime}</TableCell>
                  <TableCell align="center"><Button size="small" startIcon={<Key size={14} />}>重置密码</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加用户</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="用户名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <TextField fullWidth label="邮箱" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <TextField fullWidth label="手机号" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <FormControl fullWidth>
              <InputLabel>角色</InputLabel>
              <Select label="角色" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AdminRole })}>
                <MenuItem value="超级管理员">超级管理员</MenuItem>
                <MenuItem value="品牌管理员">品牌管理员</MenuItem>
                <MenuItem value="审核员">审核员</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="所属品牌" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} />
            <TextField fullWidth label="初始密码" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>取消</Button>
          <Button variant="contained" onClick={createUser} disabled={!form.name || !form.email}>创建</Button>
        </DialogActions>
      </Dialog>
    </PageScaffold>
  );
}
