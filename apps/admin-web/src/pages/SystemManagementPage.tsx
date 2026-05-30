import { useEffect, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Edit, Upload } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { PageScaffold } from '../components/PageScaffold';
import { systemApi } from '../services/systemApi';
import type { ImportTemplateConfig } from '../types/admin';

function parseCsv(text: string) {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '').replaceAll('""', '"')))
    .filter((row) => row.some(Boolean));
}

export function SystemManagementPage() {
  const [templates, setTemplates] = useState<ImportTemplateConfig[] | null>(null);
  const [editing, setEditing] = useState<ImportTemplateConfig | null>(null);

  const loadData = () => systemApi.getImportTemplates().then(setTemplates);

  useEffect(() => {
    loadData();
  }, []);

  const saveTemplate = async () => {
    if (!editing) return;
    await systemApi.updateImportTemplate(editing.code, editing);
    setEditing(null);
    loadData();
  };

  const uploadTemplateFile = async (file: File | null) => {
    if (!file || !editing) return;
    const fileType = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') ? 'xlsx' : 'csv';
    if (fileType === 'xlsx') {
      setEditing({ ...editing, fileName: file.name, fileType });
      return;
    }
    const rows = parseCsv(await file.text());
    if (!rows.length) return;
    setEditing({
      ...editing,
      fileName: file.name,
      fileType,
      columns: rows[0],
      sampleRows: rows.slice(1, 6),
    });
  };

  if (!templates) return <LoadingState label="加载系统字典..." />;

  return (
    <PageScaffold title="系统字典" description="维护前台导入模板、字段说明和示例数据，前台下载模板时实时读取这里的配置。">
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #e5e7eb' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>模板名称</TableCell>
              <TableCell>模板编码</TableCell>
              <TableCell>模板文件</TableCell>
              <TableCell>字段数</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>更新时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.code} hover>
                <TableCell>
                  <Typography fontWeight={900}>{template.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{template.description}</Typography>
                </TableCell>
                <TableCell><Chip label={template.code} size="small" /></TableCell>
                <TableCell><Typography fontWeight={800}>{template.fileName}</Typography><Typography variant="caption" color="text.secondary">{template.fileType.toUpperCase()}</Typography></TableCell>
                <TableCell>{template.columns.length}</TableCell>
                <TableCell><Chip label={template.status === 'active' ? '启用' : '停用'} size="small" color={template.status === 'active' ? 'success' : 'default'} /></TableCell>
                <TableCell>{template.updatedAt}</TableCell>
                <TableCell align="right"><Button variant="contained" startIcon={<Edit size={16} />} onClick={() => setEditing(template)}>编辑/上传模板</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="md" fullWidth>
        <DialogTitle>编辑导入模板</DialogTitle>
        <DialogContent>
          {editing && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
                  <Box>
                    <Typography fontWeight={900}>上传模板文件</Typography>
                    <Typography variant="body2" color="text.secondary">支持上传 CSV / Excel 模板文件。CSV 会自动读取第一行作为字段表头，并取后续行作为示例数据；Excel 文件会记录文件名和类型。</Typography>
                  </Box>
                  <Button component="label" variant="outlined" startIcon={<Upload size={16} />}>
                    选择模板文件
                    <input hidden type="file" accept=".csv,.xlsx,.xls" onChange={(event) => uploadTemplateFile(event.target.files?.[0] || null)} />
                  </Button>
                </Stack>
              </Paper>
              <TextField label="模板名称" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} fullWidth />
              <TextField label="模板说明" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} multiline minRows={2} fullWidth />
              <TextField label="下载文件名" value={editing.fileName} onChange={(event) => setEditing({ ...editing, fileName: event.target.value })} fullWidth />
              <TextField label="字段列（逗号分隔）" value={editing.columns.join(',')} onChange={(event) => setEditing({ ...editing, columns: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} helperText="前台会按这些字段生成 CSV 表头。" fullWidth />
              <TextField label="示例行（每行一条，字段用逗号分隔）" value={editing.sampleRows.map((row) => row.join(',')).join('\n')} onChange={(event) => setEditing({ ...editing, sampleRows: event.target.value.split('\n').map((line) => line.split(',').map((item) => item.trim())) })} multiline minRows={4} fullWidth />
              <TextField label="导入说明" value={editing.instructions} onChange={(event) => setEditing({ ...editing, instructions: event.target.value })} multiline minRows={2} fullWidth />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>取消</Button>
          <Button variant="contained" onClick={saveTemplate} disabled={!editing?.name || !editing?.columns.length}>保存</Button>
        </DialogActions>
      </Dialog>
    </PageScaffold>
  );
}
