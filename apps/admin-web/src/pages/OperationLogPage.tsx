import { useEffect, useState } from 'react';
import { Chip, FormControl, InputAdornment, InputLabel, MenuItem, Pagination, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Filter, Search } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { PageScaffold } from '../components/PageScaffold';
import { operationLogApi } from '../services/operationLogApi';
import type { OperationLog, PagedResult } from '../types/admin';

function statusText(status: OperationLog['status']) {
  return { success: '成功', warning: '警告', error: '错误' }[status];
}

function statusColor(status: OperationLog['status']) {
  if (status === 'success') return 'success';
  if (status === 'warning') return 'warning';
  return 'error';
}

export function OperationLogPage() {
  const [keyword, setKeyword] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PagedResult<OperationLog> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      operationLogApi.getOperationLogs({ keyword, module: moduleFilter, status: statusFilter, page, pageSize: 10 }).then((data) => {
        if (!cancelled) setResult(data);
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [keyword, moduleFilter, statusFilter, page]);

  if (!result) return <LoadingState label="加载操作日志..." />;

  return (
    <PageScaffold title="操作日志" description="记录用户关键操作行为，用于审计、追责和安全分析。">
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 4, border: '1px solid #e5e7eb' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField fullWidth size="small" placeholder="搜索用户、操作、详情..." value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }} />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>模块筛选</InputLabel>
            <Select label="模块筛选" value={moduleFilter} onChange={(event) => { setModuleFilter(event.target.value); setPage(1); }} startAdornment={<InputAdornment position="start"><Filter size={18} /></InputAdornment>}>
              <MenuItem value="all">全部模块</MenuItem>
              <MenuItem value="API管理">API管理</MenuItem>
              <MenuItem value="知识库管理">知识库管理</MenuItem>
              <MenuItem value="审核工作流">审核工作流</MenuItem>
              <MenuItem value="用户管理">用户管理</MenuItem>
              <MenuItem value="系统监控">系统监控</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>状态筛选</InputLabel>
            <Select label="状态筛选" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <MenuItem value="all">全部状态</MenuItem>
              <MenuItem value="success">成功</MenuItem>
              <MenuItem value="warning">警告</MenuItem>
              <MenuItem value="error">错误</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>操作时间</TableCell>
                <TableCell>操作人</TableCell>
                <TableCell>操作类型</TableCell>
                <TableCell>所属模块</TableCell>
                <TableCell>操作详情</TableCell>
                <TableCell>IP地址</TableCell>
                <TableCell>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.list.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{log.time}</TableCell>
                  <TableCell><Typography fontWeight={800}>{log.user}</Typography></TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell><Chip label={log.module} size="small" variant="outlined" /></TableCell>
                  <TableCell>{log.detail}</TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{log.ip}</Typography></TableCell>
                  <TableCell><Chip label={statusText(log.status)} size="small" color={statusColor(log.status)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">共 {result.total} 条</Typography>
          <Pagination count={Math.max(1, Math.ceil(result.total / result.pageSize))} page={page} color="primary" onChange={(_, nextPage) => setPage(nextPage)} />
        </Stack>
      </Paper>
    </PageScaffold>
  );
}
