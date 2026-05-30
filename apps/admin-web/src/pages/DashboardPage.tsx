import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowDownRight, ArrowUpRight, FileText, Gauge, ShieldCheck, Users, Video } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { dashboardApi } from '../services/dashboardApi';
import type { DashboardOverview, DashboardStat } from '../types/admin';

const iconMap: Record<DashboardStat['icon'], ReactNode> = {
  file: <FileText size={22} />,
  video: <Video size={22} />,
  users: <Users size={22} />,
  shield: <ShieldCheck size={22} />,
};

function StatCard({ stat }: { stat: DashboardStat }) {
  const TrendIcon = stat.trend === 'down' ? ArrowDownRight : ArrowUpRight;

  return (
    <Card elevation={0} sx={{ height: '100%', borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.06)', overflow: 'hidden', position: 'relative', '&::before': { content: '""', position: 'absolute', inset: '0 0 auto 0', height: 4, background: stat.tone } }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>{stat.title}</Typography>
            <Typography sx={{ mt: 1, fontSize: 44, lineHeight: 1, fontWeight: 900, letterSpacing: -1.5 }}>{stat.value}</Typography>
          </Box>
          <Box sx={{ width: 54, height: 54, borderRadius: 3, bgcolor: stat.bg, color: stat.tone, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            {iconMap[stat.icon]}
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 3 }}>
          <Chip size="small" icon={<TrendIcon size={15} />} label={stat.change} sx={{ bgcolor: stat.bg, color: stat.tone, fontWeight: 900, '& .MuiChip-icon': { color: stat.tone } }} />
          <Typography variant="caption" color="text.secondary">{stat.meta}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    dashboardApi.getOverview().then((data) => {
      if (!cancelled) setOverview(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!overview?.headline) return <LoadingState label="加载数据概览..." />;

  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={0} sx={{ mb: 3, p: { xs: 3, md: 4 }, borderRadius: 5, color: '#fff', overflow: 'hidden', position: 'relative', background: 'radial-gradient(circle at 82% 12%, rgba(45, 212, 191, 0.35), transparent 32%), linear-gradient(135deg, #0f172a 0%, #12346a 54%, #0f766e 100%)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={3}>
          <Box>
            <Chip icon={<Gauge size={16} />} label="实时运营驾驶舱" sx={{ mb: 2, color: '#bae6fd', bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }} />
            <Typography sx={{ fontSize: { xs: 36, md: 52 }, lineHeight: 1, fontWeight: 900, letterSpacing: -1.6 }}>数据概览</Typography>
            <Typography sx={{ mt: 1.5, maxWidth: 620, color: 'rgba(226, 232, 240, 0.78)', fontSize: 17 }}>{overview.headline.description}</Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="flex-end">
            <Box sx={{ minWidth: 138, p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.75)' }}>今日总产出</Typography>
              <Typography sx={{ fontSize: 30, fontWeight: 900 }}>{overview.headline.totalOutput}</Typography>
            </Box>
            <Box sx={{ minWidth: 138, p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.75)' }}>审核通过率</Typography>
              <Typography sx={{ fontSize: 30, fontWeight: 900 }}>{overview.headline.approvalRate}</Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 2.5, mb: 2.5 }}>
        {overview.stats.map((stat) => <StatCard key={stat.title} stat={stat} />)}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.8fr) minmax(360px, 0.9fr)' }, gap: 2.5, alignItems: 'stretch' }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.06)' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={900}>近7天产能趋势</Typography>
              <Typography variant="body2" color="text.secondary">脚本、视频和审核通过量的连续表现</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip size="small" label="脚本生成" sx={{ color: '#2563eb', bgcolor: '#eff6ff', fontWeight: 800 }} />
              <Chip size="small" label="视频生成" sx={{ color: '#16a34a', bgcolor: '#f0fdf4', fontWeight: 800 }} />
              <Chip size="small" label="审核通过" sx={{ color: '#7c3aed', bgcolor: '#f5f3ff', fontWeight: 800 }} />
            </Stack>
          </Stack>
          <Box sx={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.trends} margin={{ top: 18, right: 18, left: -18, bottom: 8 }}>
                <defs>
                  <linearGradient id="scriptGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="videoGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} /><stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 16px 36px rgba(15,23,42,0.12)' }} />
                <Area type="monotone" dataKey="scriptCount" name="脚本生成" stroke="#2563eb" strokeWidth={3} fill="url(#scriptGradient)" />
                <Area type="monotone" dataKey="videoCount" name="视频生成" stroke="#16a34a" strokeWidth={3} fill="url(#videoGradient)" />
                <Area type="monotone" dataKey="approvedCount" name="审核通过" stroke="#7c3aed" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Stack spacing={2.5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.06)' }}>
            <Typography variant="h6" fontWeight={900}>平台分布</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>本周内容投放渠道占比</Typography>
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.platformDistribution} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 8" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={64} tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 14 }} />
                  <Bar dataKey="count" name="数量" fill="#2563eb" radius={[0, 10, 10, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.06)' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Activity size={20} color="#0f766e" />
              <Typography variant="h6" fontWeight={900}>系统状态</Typography>
            </Stack>
            <Stack spacing={2.2}>
              {overview.systemMetrics.map((metric) => (
                <Box key={metric.label}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.8 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{metric.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{metric.detail}</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 900, color: metric.color }}>{metric.value}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={metric.value} sx={{ height: 9, borderRadius: 99, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: metric.color } }} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
