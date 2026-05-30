import { useEffect, useState } from 'react';
import { Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import { CheckCircle, Clock, Eye, XCircle } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { PageScaffold } from '../components/PageScaffold';
import { auditApi } from '../services/auditApi';
import type { AuditOverview, AuditStatus, AuditTask } from '../types/admin';

function statusText(status: AuditStatus) {
  return { pending: '待审核', reviewing: '审核中', approved: '已通过', rejected: '已驳回' }[status];
}

function statusColor(status: AuditStatus) {
  if (status === 'pending') return 'warning';
  if (status === 'reviewing') return 'info';
  if (status === 'approved') return 'success';
  return 'error';
}

function priorityColor(priority: AuditTask['priority']) {
  return { high: '#dc2626', normal: '#2563eb', low: '#64748b' }[priority];
}

export function AuditWorkflowPage() {
  const [tabValue, setTabValue] = useState(0);
  const [data, setData] = useState<AuditOverview | null>(null);
  const [selectedTask, setSelectedTask] = useState<AuditTask | null>(null);
  const [comment, setComment] = useState('内容合规，通过');

  const loadData = async () => setData(await auditApi.getOverview());

  useEffect(() => {
    loadData();
  }, []);

  const reviewTask = async (result: 'approved' | 'rejected') => {
    if (!selectedTask) return;
    await auditApi.reviewTask({ taskId: selectedTask.id, result, comment });
    setSelectedTask(null);
    loadData();
  };

  if (!data) return <LoadingState label="加载审核工作流..." />;

  return (
    <PageScaffold title="审核工作流" description="管理脚本审核任务、审核记录和审核员协作流程。">
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        {data.stats.map((stat) => (
          <Paper key={stat.label} elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid #e5e7eb' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>{stat.label}</Typography>
            <Typography variant="h3" fontWeight={900} sx={{ color: stat.color }}>{stat.value}</Typography>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Tabs value={tabValue} onChange={(_, nextValue) => setTabValue(nextValue)} sx={{ px: 2, borderBottom: '1px solid #e5e7eb' }}>
          <Tab label="待审核任务" />
          <Tab label="审核记录" />
          <Tab label="审核员管理" />
        </Tabs>

        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>脚本名称</TableCell>
                  <TableCell>品牌</TableCell>
                  <TableCell>提交人</TableCell>
                  <TableCell>提交时间</TableCell>
                  <TableCell>审核阶段</TableCell>
                  <TableCell>优先级</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.tasks.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell><Typography fontWeight={800}>{task.scriptName}</Typography></TableCell>
                    <TableCell>{task.brand}</TableCell>
                    <TableCell><Stack direction="row" alignItems="center" spacing={1}><Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{task.submitter.charAt(0)}</Avatar>{task.submitter}</Stack></TableCell>
                    <TableCell>{task.submitTime}</TableCell>
                    <TableCell><Chip label={task.stage} size="small" variant="outlined" /></TableCell>
                    <TableCell><Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: priorityColor(task.priority) }} /></TableCell>
                    <TableCell><Chip label={statusText(task.status)} size="small" color={statusColor(task.status)} /></TableCell>
                    <TableCell align="center"><Button size="small" variant="outlined" startIcon={<Eye size={14} />} onClick={() => setSelectedTask(task)}>审核</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>脚本名称</TableCell>
                  <TableCell>审核员</TableCell>
                  <TableCell>审核阶段</TableCell>
                  <TableCell>审核结果</TableCell>
                  <TableCell>审核意见</TableCell>
                  <TableCell>时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.history.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell><Typography fontWeight={800}>{item.scriptName}</Typography></TableCell>
                    <TableCell>{item.auditor}</TableCell>
                    <TableCell>{item.stage}</TableCell>
                    <TableCell><Chip label={statusText(item.result)} size="small" color={statusColor(item.result)} /></TableCell>
                    <TableCell>{item.comment}</TableCell>
                    <TableCell>{item.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 2 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Clock size={42} color="#2563eb" />
            <Typography variant="h6" fontWeight={900} sx={{ mt: 1 }}>审核员排班与负载</Typography>
            <Typography color="text.secondary">后续可接入审核员工作量、SLA 和自动分配规则。</Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)} maxWidth="sm" fullWidth>
        <DialogTitle>审核脚本</DialogTitle>
        <DialogContent>
          <Typography fontWeight={900}>{selectedTask?.scriptName}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>{selectedTask?.brand} / {selectedTask?.stage}</Typography>
          <TextField fullWidth multiline rows={4} label="审核意见" value={comment} onChange={(event) => setComment(event.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTask(null)}>取消</Button>
          <Button color="error" startIcon={<XCircle size={16} />} onClick={() => reviewTask('rejected')}>驳回</Button>
          <Button variant="contained" startIcon={<CheckCircle size={16} />} onClick={() => reviewTask('approved')}>通过</Button>
        </DialogActions>
      </Dialog>
    </PageScaffold>
  );
}
