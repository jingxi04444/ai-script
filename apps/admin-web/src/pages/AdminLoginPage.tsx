import { useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import { Activity, Database, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { authApi } from '../services/authApi';
import type { AuthResult } from '../types/admin';

interface AdminLoginPageProps {
  onDone: (result: AuthResult) => void;
}

const systemSignals = [
  { label: '权限边界', value: 'RBAC 已启用', icon: ShieldCheck },
  { label: '数据隔离', value: '品牌租户独立', icon: Database },
  { label: '审核队列', value: '12 条待处理', icon: Activity },
];

export function AdminLoginPage({ onDone }: AdminLoginPageProps) {
  const [account, setAccount] = useState('admin@ai-script.local');
  const [password, setPassword] = useState('123456');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      onDone(await authApi.login({ account, password, rememberMe }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        overflow: 'hidden',
        position: 'relative',
        bgcolor: '#07111f',
        color: '#f8fbff',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, md: 4 },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 18% 24%, rgba(37, 99, 235, 0.4), transparent 34%), radial-gradient(circle at 82% 16%, rgba(20, 184, 166, 0.24), transparent 30%), linear-gradient(135deg, #06101d 0%, #0b1730 48%, #0e1726 100%)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          opacity: 0.2,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, black, transparent 78%)',
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1180,
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.08fr 0.92fr' },
          gap: { xs: 3, md: 5 },
          alignItems: 'stretch',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 5,
            color: '#fff',
            minHeight: { md: 620 },
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(15, 118, 110, 0.24))',
            border: '1px solid rgba(148, 163, 184, 0.24)',
            boxShadow: '0 30px 90px rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(22px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 4,
          }}
        >
          <Stack spacing={4}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #38bdf8, #2dd4bf)', boxShadow: '0 18px 36px rgba(45, 212, 191, 0.28)' }}>
                <ShieldCheck size={26} color="#06101d" />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 0.3 }}>
                  AI 短视频平台
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(226, 232, 240, 0.72)' }}>
                  Admin Command Center
                </Typography>
              </Box>
            </Stack>

            <Box>
              <Chip icon={<Sparkles size={16} />} label="品牌权限 / 内容审核 / 模型供应商统一管控" sx={{ color: '#bae6fd', bgcolor: 'rgba(14, 165, 233, 0.13)', border: '1px solid rgba(125, 211, 252, 0.28)', mb: 3 }} />
              <Typography variant="h3" sx={{ maxWidth: 560, fontWeight: 900, lineHeight: 1.06, letterSpacing: -1.4, fontSize: { xs: 38, md: 58 } }}>
                登录后台，接管全链路内容生产秩序。
              </Typography>
              <Typography sx={{ mt: 3, maxWidth: 520, color: 'rgba(226, 232, 240, 0.72)', fontSize: 17, lineHeight: 1.75 }}>
                从账号权限、知识库、项目素材到审核流，集中治理品牌短视频脚本生产过程中的安全、效率与合规风险。
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ display: 'grid', gap: 2 }}>
            {systemSignals.map((item) => {
              const Icon = item.icon;
              return (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2, borderRadius: 3, bgcolor: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(45, 212, 191, 0.12)', color: '#67e8f9' }}>
                      <Icon size={19} />
                    </Box>
                    <Typography sx={{ color: 'rgba(226, 232, 240, 0.72)' }}>{item.label}</Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 900 }}>{item.value}</Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 5, background: 'rgba(255, 255, 255, 0.96)', boxShadow: '0 30px 90px rgba(0, 0, 0, 0.32)', border: '1px solid rgba(255, 255, 255, 0.55)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900 }}>
              SECURE LOGIN
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              管理员登录
            </Typography>
            <Typography sx={{ mt: 1, color: 'text.secondary' }}>
              默认进入登录页，验证后加载后台控制台。
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="登录账号" value={account} onChange={(event) => setAccount(event.target.value)} type="email" required fullWidth autoComplete="username" />
              <TextField
                label="登录密码"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
                fullWidth
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockKeyhole size={18} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label={showPassword ? '隐藏密码' : '显示密码'} edge="end" onClick={() => setShowPassword((visible) => !visible)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <FormControlLabel control={<Checkbox checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />} label="记住登录状态" />
                <Button variant="text" size="small">忘记密码？</Button>
              </Stack>
              <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ py: 1.45, borderRadius: 2.5, background: 'linear-gradient(135deg, #0f6bdc, #14b8a6)', boxShadow: '0 16px 34px rgba(20, 184, 166, 0.28)' }}>
                {submitting ? '登录中...' : '登录后台控制台'}
              </Button>
            </Stack>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            Mock 默认账号：admin@ai-script.local / 123456。切真实后端时设置 VITE_USE_MOCK_API=false。
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
