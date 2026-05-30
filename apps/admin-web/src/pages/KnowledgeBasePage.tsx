import { useEffect, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import { Download, Edit, Plus, Search, Trash2, TrendingUp, Upload } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { PageScaffold } from '../components/PageScaffold';
import { knowledgeApi } from '../services/knowledgeApi';
import type { KnowledgeBaseData, OriginalTemplate, OriginalTemplateRequest } from '../types/admin';

const emptyTemplate: OriginalTemplateRequest = { name: '', structure: '', scenario: '', prompt: '', platform: '抖音', status: 'active' };

export function KnowledgeBasePage() {
  const [tabValue, setTabValue] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [data, setData] = useState<KnowledgeBaseData | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OriginalTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<OriginalTemplateRequest>(emptyTemplate);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      knowledgeApi.getKnowledgeBase({ keyword: searchText }).then((nextData) => {
        if (!cancelled) setData(nextData);
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchText]);

  if (!data) return <LoadingState label="加载知识库..." />;

  const reload = () => knowledgeApi.getKnowledgeBase({ keyword: searchText }).then(setData);
  const openTemplateDialog = (template?: OriginalTemplate) => {
    setEditingTemplate(template || null);
    setTemplateForm(template ? { name: template.name, structure: template.structure, scenario: template.scenario, prompt: template.prompt, platform: template.platform, status: template.status } : emptyTemplate);
    setTemplateDialogOpen(true);
  };
  const saveTemplate = async () => {
    if (editingTemplate) await knowledgeApi.updateOriginalTemplate(editingTemplate.id, templateForm);
    else await knowledgeApi.createOriginalTemplate(templateForm);
    setTemplateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateForm(emptyTemplate);
    reload();
  };

  return (
    <PageScaffold
      title="知识库管理"
      description="管理品牌私有知识库与公共资源库，支撑脚本生成、合规审核和素材复用。"
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Download size={18} />}>导出</Button>
          <Button variant="outlined" startIcon={<Upload size={18} />}>导入</Button>
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => openTemplateDialog()}>添加模板</Button>
        </Stack>
      }
    >
      <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Tabs value={tabValue} onChange={(_, nextValue) => setTabValue(nextValue)} sx={{ px: 2, borderBottom: '1px solid #e5e7eb' }}>
          <Tab label="结构公式库" />
          <Tab label="产品卖点知识库" />
          <Tab label="素材标签体系" />
          <Tab label="公共资源库" />
          <Tab label="灵感模板库" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="搜索公式、产品、标签..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment> }}
          />
        </Box>

        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>公式名称</TableCell>
                  <TableCell>适用平台</TableCell>
                  <TableCell>分类</TableCell>
                  <TableCell align="right">复用次数</TableCell>
                  <TableCell align="right">成功率</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.structureFormulas.map((formula) => (
                  <TableRow key={formula.id} hover>
                    <TableCell><Typography fontWeight={800}>{formula.name}</Typography></TableCell>
                    <TableCell><Chip label={formula.platform} size="small" /></TableCell>
                    <TableCell><Chip label={formula.category} size="small" variant="outlined" /></TableCell>
                    <TableCell align="right"><Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}><TrendingUp size={14} color="#16a34a" /><Typography fontWeight={800}>{formula.useCount}</Typography></Stack></TableCell>
                    <TableCell align="right"><Typography color={formula.successRate >= 90 ? 'success.main' : 'warning.main'} fontWeight={800}>{formula.successRate}%</Typography></TableCell>
                    <TableCell>{formula.createTime}</TableCell>
                    <TableCell align="center"><IconButton size="small"><Edit size={16} /></IconButton><IconButton size="small" color="error"><Trash2 size={16} /></IconButton></TableCell>
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
                  <TableCell>产品名称</TableCell>
                  <TableCell>所属品牌</TableCell>
                  <TableCell>核心卖点</TableCell>
                  <TableCell>标签</TableCell>
                  <TableCell>更新时间</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.productKnowledge.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell><Typography fontWeight={800}>{product.productName}</Typography></TableCell>
                    <TableCell>{product.brand}</TableCell>
                    <TableCell>{product.corePoints}</TableCell>
                    <TableCell><Stack direction="row" flexWrap="wrap" gap={0.5}>{product.tags.map((tag) => <Chip key={tag} label={tag} size="small" color="primary" />)}</Stack></TableCell>
                    <TableCell>{product.updateTime}</TableCell>
                    <TableCell align="center"><IconButton size="small"><Edit size={16} /></IconButton><IconButton size="small" color="error"><Trash2 size={16} /></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 2 && (
          <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
            {data.materialTags.map((tag) => (
              <Paper key={tag.id} variant="outlined" sx={{ p: 2.2, borderRadius: 3 }}>
                <Chip label={tag.category} size="small" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight={900}>{tag.name}</Typography>
                <Typography color="text.secondary" variant="body2">使用次数：{tag.count}</Typography>
              </Paper>
            ))}
          </Box>
        )}

        {tabValue === 3 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={900}>公共资源库</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>可接入公共爆款结构、合规词库与行业素材模板。</Typography>
          </Box>
        )}
        {tabValue === 4 && (
          <TableContainer>
            <Table>
              <TableHead><TableRow><TableCell>模板名称</TableCell><TableCell>模板分类</TableCell><TableCell>平台</TableCell><TableCell>结构公式</TableCell><TableCell>状态</TableCell><TableCell>更新时间</TableCell><TableCell align="center">操作</TableCell></TableRow></TableHead>
              <TableBody>
                {(data.originalTemplates || []).map((template) => (
                  <TableRow key={template.id} hover>
                    <TableCell><Typography fontWeight={900}>{template.name}</Typography><Typography variant="body2" color="text.secondary">{template.prompt}</Typography></TableCell>
                    <TableCell><Chip label={template.scenario || '默认模板库'} size="small" /></TableCell>
                    <TableCell>{template.platform}</TableCell>
                    <TableCell sx={{ maxWidth: 380 }}><Typography variant="body2">{template.structure}</Typography></TableCell>
                    <TableCell><Chip label={template.status === 'active' ? '启用' : '停用'} color={template.status === 'active' ? 'success' : 'default'} size="small" /></TableCell>
                    <TableCell>{template.updatedAt}</TableCell>
                    <TableCell align="center"><IconButton size="small" onClick={() => openTemplateDialog(template)}><Edit size={16} /></IconButton><IconButton size="small" color="error" onClick={() => knowledgeApi.deleteOriginalTemplate(template.id).then(reload)}><Trash2 size={16} /></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={templateDialogOpen} onClose={() => { setTemplateDialogOpen(false); setEditingTemplate(null); setTemplateForm(emptyTemplate); }} maxWidth="md" fullWidth>
        <DialogTitle>{editingTemplate ? '编辑灵感模板' : '新增灵感模板'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="模板名称" value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} fullWidth />
            <TextField label="模板分类/模板库名称" value={templateForm.scenario} onChange={(event) => setTemplateForm({ ...templateForm, scenario: event.target.value })} helperText="前台灵感模板库左侧分类按这个字段聚合。" fullWidth />
            <TextField label="平台" value={templateForm.platform} onChange={(event) => setTemplateForm({ ...templateForm, platform: event.target.value })} fullWidth />
            <TextField label="结构公式" value={templateForm.structure} onChange={(event) => setTemplateForm({ ...templateForm, structure: event.target.value })} multiline minRows={3} fullWidth />
            <TextField label="生成提示词/模板说明" value={templateForm.prompt} onChange={(event) => setTemplateForm({ ...templateForm, prompt: event.target.value })} multiline minRows={4} fullWidth />
            <FormControl fullWidth><InputLabel>状态</InputLabel><Select label="状态" value={templateForm.status} onChange={(event) => setTemplateForm({ ...templateForm, status: event.target.value as OriginalTemplateRequest['status'] })}><MenuItem value="active">启用</MenuItem><MenuItem value="inactive">停用</MenuItem></Select></FormControl>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => { setTemplateDialogOpen(false); setEditingTemplate(null); setTemplateForm(emptyTemplate); }}>取消</Button><Button variant="contained" onClick={saveTemplate} disabled={!templateForm.name || !templateForm.structure}>保存</Button></DialogActions>
      </Dialog>
    </PageScaffold>
  );
}
