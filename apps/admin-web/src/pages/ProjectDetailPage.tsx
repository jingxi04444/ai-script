import { useEffect, useState } from 'react';
import { Box, Button, Chip, Divider, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { PageScaffold } from '../components/PageScaffold';
import { navigate } from '../app/router';
import { projectApi } from '../services/projectApi';
import type { AdminProjectDetail } from '../types/admin';

interface ProjectDetailPageProps {
  projectId: string;
}

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const [detail, setDetail] = useState<AdminProjectDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    projectApi.getProjectDetail(projectId).then((data) => {
      if (!cancelled) setDetail(data);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!detail) return <LoadingState label="加载项目详情..." />;

  return (
    <PageScaffold
      title={detail.project.name}
      description="查看该项目关联的产品 Brief、卖点、脚本版本和分镜数据。"
      action={<Button startIcon={<ArrowLeft size={16} />} onClick={() => navigate('/admin/materials')}>返回列表</Button>}
    >
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
            <Chip label={`品牌：${detail.project.brand}`} />
            <Chip label={`产品：${detail.project.productName}`} />
            <Chip label={`平台：${detail.project.platform}`} />
            <Chip label={`进度：${detail.project.progress}%`} color="primary" />
          </Stack>
          <Typography variant="body2" color="text.secondary">创建者：{detail.project.creator} / 当前步骤：{detail.project.currentStep} / 创建时间：{detail.project.createTime}</Typography>
        </Paper>

        <Box>
          <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>产品 Brief</Typography>
          {detail.briefs.length ? detail.briefs.map((brief) => (
            <Paper key={brief.id} variant="outlined" sx={{ p: 2.5, mb: 1.5, borderRadius: 3 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                <Chip label={`版本 v${brief.version}`} size="small" color="primary" />
                <Chip label={brief.status} size="small" />
                <Chip label={brief.updatedAt} size="small" />
              </Stack>
              <Typography fontWeight={900}>{brief.productName}</Typography>
              <Typography sx={{ mt: 1 }} color="text.secondary">主卖点：{brief.primarySellingPoint || '-'}</Typography>
              <Typography sx={{ mt: 1 }} color="text.secondary">目标人群：{brief.targetGroups.join('、') || '-'}</Typography>
              <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{brief.briefText || '-'}</Typography>
              {!!brief.sellingPoints.length && <Divider sx={{ my: 1.5 }} />}
              {brief.sellingPoints.map((point) => <Chip key={point.id} label={`${point.pointType}: ${point.content}`} size="small" sx={{ mr: 1, mb: 1 }} />)}
            </Paper>
          )) : <Typography color="text.secondary">暂无 Brief 数据。</Typography>}
        </Box>

        <Box>
          <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>脚本数据</Typography>
          {detail.scripts.length ? detail.scripts.map((script) => (
            <Paper key={script.id} variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography fontWeight={900}>{script.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{script.versionTitle} / {script.updatedAt}</Typography>
                </Box>
                <Stack direction="row" spacing={1}><Chip label={script.status} size="small" /><Chip label={script.auditStatus} size="small" color="warning" /></Stack>
              </Stack>
              {script.shots.length ? (
                <Table size="small">
                  <TableHead><TableRow><TableCell>镜头</TableCell><TableCell>画面</TableCell><TableCell>台词</TableCell><TableCell>时长</TableCell><TableCell>备注</TableCell></TableRow></TableHead>
                  <TableBody>{script.shots.map((shot) => <TableRow key={`${script.id}-${shot.shot}`}><TableCell>{shot.shot}</TableCell><TableCell>{shot.scene}</TableCell><TableCell>{shot.line}</TableCell><TableCell>{shot.duration}</TableCell><TableCell>{shot.note}</TableCell></TableRow>)}</TableBody>
                </Table>
              ) : <Typography color="text.secondary">暂无分镜数据。</Typography>}
            </Paper>
          )) : <Typography color="text.secondary">暂无脚本数据。</Typography>}
        </Box>
      </Stack>
    </PageScaffold>
  );
}
