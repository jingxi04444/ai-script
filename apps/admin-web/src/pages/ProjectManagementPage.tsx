import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, IconButton, InputAdornment, Menu, MenuItem, Paper, Stack, TablePagination, TextField, Typography } from '@mui/material';
import { Archive, FolderOpen, MoreVertical, Play, Search, Trash2 } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { PageScaffold } from '../components/PageScaffold';
import { navigate } from '../app/router';
import { projectApi } from '../services/projectApi';
import type { AdminProject, PagedResult } from '../types/admin';

function statusConfig(status: string) {
  const map = {
    draft: { label: '草稿', color: '#64748b', bg: '#f1f5f9' },
    reviewing: { label: '审核中', color: '#b45309', bg: '#fef3c7' },
    generating: { label: '生成中', color: '#0369a1', bg: '#e0f2fe' },
    completed: { label: '已完成', color: '#15803d', bg: '#dcfce7' },
    archived: { label: '已归档', color: '#475569', bg: '#e2e8f0' },
    scripting: { label: '脚本中', color: '#075985', bg: '#dbeafe' },
    pending: { label: '待处理', color: '#c2410c', bg: '#ffedd5' },
  };
  return map[status as keyof typeof map] || { label: status || '未知', color: '#475569', bg: '#f1f5f9' };
}

export function ProjectManagementPage() {
  const [searchText, setSearchText] = useState('');
  const [projectPage, setProjectPage] = useState<PagedResult<AdminProject> | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const openProjectDetail = (projectId: string) => {
    navigate(`/admin/materials/${projectId}`);
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      projectApi.getProjects({ keyword: searchText, page: page + 1, pageSize }).then((data) => {
        if (!cancelled) setProjectPage(data);
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchText, page, pageSize]);

  if (!projectPage) return <LoadingState label="加载项目列表..." />;

  const projects = projectPage.list;

  return (
    <PageScaffold title="项目管理" description="加载项目列表，点击项目可查看产品 Brief、脚本和分镜数据。">
      <TextField
        fullWidth
        size="small"
        placeholder="搜索项目名称、品牌..."
        value={searchText}
        onChange={(event) => { setSearchText(event.target.value); setPage(0); }}
        sx={{ mb: 3 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 2.5 }}>
        {projects.map((project) => {
          const config = statusConfig(project.status);
          return (
            <Card key={project.id} elevation={0} onClick={() => openProjectDetail(project.id)} sx={{ height: '100%', minHeight: 220, display: 'flex', flexDirection: 'column', borderRadius: 4, border: '1px solid #dbe3ef', overflow: 'hidden', cursor: 'pointer', background: 'linear-gradient(145deg, #ffffff 0%, #f8fbff 58%, #eef6ff 100%)', boxShadow: '0 10px 28px rgba(15,23,42,0.06)', transition: '0.2s ease', '&:hover': { transform: 'translateY(-3px)', borderColor: '#60a5fa', boxShadow: '0 18px 45px rgba(37,99,235,0.16)' } }}>
              <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} sx={{ mb: 1.5 }}>
                  <Typography variant="h6" fontWeight={950} sx={{ color: '#0f172a', lineHeight: 1.32, minHeight: 56, wordBreak: 'break-word' }}>{project.name}</Typography>
                  <IconButton size="small" onClick={(event) => { event.stopPropagation(); setSelectedProjectId(project.id); setAnchorEl(event.currentTarget); }}><MoreVertical size={18} /></IconButton>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  <Chip label={project.brand} size="small" sx={{ fontWeight: 800, color: '#1e40af', bgcolor: '#dbeafe' }} />
                  <Chip label={config.label} size="small" sx={{ fontWeight: 900, color: config.color, bgcolor: config.bg }} />
                </Stack>
                <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                  <Box sx={{ flex: 1, p: 1.25, borderRadius: 2.5, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800 }}>脚本</Typography>
                    <Typography variant="h5" sx={{ color: '#1d4ed8', fontWeight: 950, lineHeight: 1.1 }}>{project.scriptCount}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 1.25, borderRadius: 2.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800 }}>视频</Typography>
                    <Typography variant="h5" sx={{ color: '#15803d', fontWeight: 950, lineHeight: 1.1 }}>{project.videoCount}</Typography>
                  </Box>
                </Stack>
                <Box sx={{ pt: 1.5, borderTop: '1px dashed #cbd5e1' }}>
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>创建：{project.createTime}</Typography>
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }} display="block">创建者：{project.creator}</Typography>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {projects.length === 0 && (
        <Paper variant="outlined" sx={{ mt: 2.5, p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">暂无匹配项目</Typography>
        </Paper>
      )}

      <Paper elevation={0} sx={{ mt: 2.5, border: '1px solid #e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <TablePagination
          component="div"
          count={projectPage.total}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }}
          rowsPerPageOptions={[6, 12, 24, 48]}
          labelRowsPerPage="每页项目数"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 个项目`}
        />
      </Paper>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); if (selectedProjectId) openProjectDetail(selectedProjectId); }}><FolderOpen size={16} style={{ marginRight: 8 }} />查看详情</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}><Play size={16} style={{ marginRight: 8 }} />继续编辑</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}><Archive size={16} style={{ marginRight: 8 }} />归档项目</MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)} sx={{ color: 'error.main' }}><Trash2 size={16} style={{ marginRight: 8 }} />删除项目</MenuItem>
      </Menu>

    </PageScaffold>
  );
}
