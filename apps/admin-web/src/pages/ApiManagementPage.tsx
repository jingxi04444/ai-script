import { useEffect, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import { CheckCircle, Edit, Plus, Trash2, XCircle } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { PageScaffold } from '../components/PageScaffold';
import { apiManagementApi } from '../services/apiManagementApi';
import type { ApiContract, ApiProvider, CreateApiProviderRequest, PromptTemplate } from '../types/admin';

const emptyProvider: CreateApiProviderRequest = {
  providerName: '',
  providerType: 'llm',
  platform: '',
  endpointUrl: '',
  model: '',
  apiKeyRef: 'env:',
  priority: 1,
};

const providerTypeLabels: Record<ApiProvider['providerType'], string> = {
  llm: '大模型 LLM',
  image: '文生图',
  tts: 'TTS 配音',
  asr: 'ASR 转写',
  parser: '视频解析',
};

const providerTypeDescriptions: Record<ApiProvider['providerType'], string> = {
  llm: '用于 Brief 评分、版本对比、脚本生成、文案优化等文本生成任务。',
  asr: '用于视频音频转文字；文案提取接口解析到视频后，会调用启用的 ASR Provider 转写。',
  parser: '用于解析抖音、小红书等分享链接，获取标题、作者、封面、视频地址或图集。',
  image: '用于生成或改写图片素材。',
  tts: '用于把脚本文案转换成配音音频。',
};

export function ApiManagementPage() {
  const [tabValue, setTabValue] = useState(0);
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [contracts, setContracts] = useState<ApiContract[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState<CreateApiProviderRequest>(emptyProvider);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [nextProviders, nextContracts, nextPromptTemplates] = await Promise.all([
      apiManagementApi.getApiProviders(),
      apiManagementApi.getApiContracts(),
      apiManagementApi.getPromptTemplates(),
    ]);
    setProviders(nextProviders);
    setContracts(nextContracts);
    setPromptTemplates(nextPromptTemplates);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateProvider = () => {
    setEditingProviderId(null);
    setForm(emptyProvider);
    setOpenDialog(true);
  };

  const openEditProvider = (provider: ApiProvider) => {
    setEditingProviderId(provider.id);
    setForm({
      providerName: provider.providerName,
      providerType: provider.providerType,
      platform: provider.platform,
      endpointUrl: provider.endpointUrl,
      model: provider.model || '',
      apiKeyRef: provider.apiKeyRef,
      description: provider.description || providerTypeDescriptions[provider.providerType],
      priority: provider.priority,
    });
    setOpenDialog(true);
  };

  const saveProvider = async () => {
    const payload = { ...form, priority: Number(form.priority) || 1 };
    if (editingProviderId) {
      await apiManagementApi.updateApiProvider(editingProviderId, payload);
    } else {
      await apiManagementApi.createApiProvider(payload);
    }
    setOpenDialog(false);
    setEditingProviderId(null);
    setForm(emptyProvider);
    loadData();
  };

  const toggleProvider = async (provider: ApiProvider) => {
    await apiManagementApi.updateApiProviderStatus(provider.id, provider.status === 'active' ? 'inactive' : 'active');
    loadData();
  };

  const savePromptTemplate = async () => {
    if (!editingPrompt) return;
    await apiManagementApi.updatePromptTemplate(editingPrompt.id, {
      systemPrompt: editingPrompt.systemPrompt,
      userPromptTemplate: editingPrompt.userPromptTemplate,
      outputSchema: editingPrompt.outputSchema,
      status: editingPrompt.status,
    });
    setEditingPrompt(null);
    loadData();
  };

  if (loading) return <LoadingState label="加载大模型管理数据..." />;

  return (
    <PageScaffold
      title="大模型管理"
      description="统一配置 LLM、ASR、视频解析、文生图和配音 Provider；文案提取依赖视频解析 Provider + ASR Provider。"
      actions={<Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreateProvider}>添加 Provider</Button>}
    >
      <Paper elevation={0} sx={{ mb: 2.5, p: 2.5, borderRadius: 4, border: '1px solid #bfdbfe', bgcolor: '#eff6ff' }}>
        <Typography fontWeight={900} color="#1d4ed8" sx={{ mb: 0.5 }}>文案提取配置说明</Typography>
        <Typography variant="body2" color="text.secondary">分享链接解析配置为「视频解析」Provider，语音转文字配置为「ASR 转写」Provider。前台调用文案提取时，后端会优先读取这里启用的 Provider。</Typography>
      </Paper>

      <Box sx={{ mb: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' }, gap: 1.5 }}>
        {(Object.keys(providerTypeLabels) as ApiProvider['providerType'][]).map((type) => (
          <Paper key={type} variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#fff' }}>
            <Typography fontWeight={900} sx={{ mb: 0.5 }}>{providerTypeLabels[type]}</Typography>
            <Typography variant="caption" color="text.secondary">{providerTypeDescriptions[type]}</Typography>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Tabs value={tabValue} onChange={(_, nextValue) => setTabValue(nextValue)} sx={{ px: 2, borderBottom: '1px solid #e5e7eb' }}>
          <Tab label="Provider 配置" />
          <Tab label="提示词配置" />
          <Tab label="接口对接格式" />
        </Tabs>

        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>API 名称</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>配置说明</TableCell>
                  <TableCell>模型 / 平台</TableCell>
                  <TableCell>密钥引用</TableCell>
                  <TableCell>优先级</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">调用次数</TableCell>
                  <TableCell align="right">成功率</TableCell>
                  <TableCell align="right">平均响应</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {providers.map((api) => (
                  <TableRow key={api.id} hover>
                    <TableCell>
                      <Typography fontWeight={800}>{api.providerName}</Typography>
                      <Typography variant="caption" color="text.secondary">{api.endpointUrl}</Typography>
                    </TableCell>
                    <TableCell><Chip label={providerTypeLabels[api.providerType] || api.providerType} size="small" variant="outlined" /></TableCell>
                    <TableCell sx={{ maxWidth: 280 }}><Typography variant="body2" color="text.secondary">{api.description || providerTypeDescriptions[api.providerType]}</Typography></TableCell>
                    <TableCell>{api.model || api.platform}</TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{api.apiKeyRef}</Typography></TableCell>
                    <TableCell><Chip label={`P${api.priority}`} size="small" color={api.priority === 1 ? 'primary' : 'default'} /></TableCell>
                    <TableCell><Chip icon={api.status === 'active' ? <CheckCircle size={14} /> : <XCircle size={14} />} label={api.status === 'active' ? '正常' : '停用'} size="small" color={api.status === 'active' ? 'success' : 'default'} /></TableCell>
                    <TableCell align="right">{api.callCount.toLocaleString()}</TableCell>
                    <TableCell align="right"><Typography color={api.successRate >= 98 ? 'success.main' : 'warning.main'} fontWeight={800}>{api.successRate}%</Typography></TableCell>
                    <TableCell align="right">{api.avgResponseTime}ms</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openEditProvider(api)}><Edit size={16} /></IconButton>
                      <IconButton size="small" color={api.status === 'active' ? 'error' : 'success'} onClick={() => toggleProvider(api)}><Trash2 size={16} /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 1 && (
          <Box sx={{ p: 2.5, display: 'grid', gap: 2 }}>
            {promptTemplates.map((prompt) => (
              <Paper key={prompt.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                      <Typography fontWeight={900}>{prompt.name}</Typography>
                      <Chip label={prompt.version} size="small" color="primary" />
                      <Chip label={prompt.status === 'active' ? '启用' : '停用'} size="small" color={prompt.status === 'active' ? 'success' : 'default'} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>调用模型：{prompt.providerName} / {prompt.model}</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>{prompt.systemPrompt}</Typography>
                    <Typography variant="caption" color="text.secondary">更新时间：{prompt.updatedAt}</Typography>
                  </Box>
                  <Button variant="contained" startIcon={<Edit size={16} />} onClick={() => setEditingPrompt(prompt)}>编辑提示词</Button>
                </Stack>
              </Paper>
            ))}
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ p: 2.5, display: 'grid', gap: 2 }}>
            {contracts.map((contract) => (
              <Paper key={`${contract.method}-${contract.path}`} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Chip label={contract.method} size="small" color={contract.method === 'GET' ? 'primary' : 'secondary'} />
                      <Typography fontWeight={900}>{contract.module} / {contract.name}</Typography>
                    </Stack>
                    <Typography sx={{ fontFamily: 'monospace', color: 'primary.main', mb: 1 }}>{contract.path}</Typography>
                    <Typography variant="body2" color="text.secondary">{contract.description}</Typography>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: { md: 560 } }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={800}>请求参数</Typography>
                      <Box component="pre" sx={{ m: 0, mt: 0.5, p: 1.5, borderRadius: 2, bgcolor: '#0f172a', color: '#dbeafe', fontSize: 12, overflow: 'auto' }}>{JSON.stringify(contract.requestParams, null, 2)}</Box>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={800}>返回格式</Typography>
                      <Box component="pre" sx={{ m: 0, mt: 0.5, p: 1.5, borderRadius: 2, bgcolor: '#0f172a', color: '#dcfce7', fontSize: 12, overflow: 'auto' }}>{JSON.stringify(contract.responseBody, null, 2)}</Box>
                    </Box>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={() => { setOpenDialog(false); setEditingProviderId(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProviderId ? '编辑大模型/解析 Provider' : '添加大模型/解析 Provider'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="API 名称" value={form.providerName} onChange={(event) => setForm({ ...form, providerName: event.target.value })} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Provider 类型</InputLabel>
              <Select label="Provider 类型" value={form.providerType} onChange={(event) => setForm({ ...form, providerType: event.target.value as CreateApiProviderRequest['providerType'] })}>
                <MenuItem value="llm">LLM 文生文</MenuItem>
                <MenuItem value="image">文生图</MenuItem>
                <MenuItem value="tts">TTS 配音</MenuItem>
                <MenuItem value="asr">ASR 语音转文字</MenuItem>
                <MenuItem value="parser">视频解析</MenuItem>
              </Select>
            </FormControl>
            <TextField label="平台标识" value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} placeholder="deepseek / openai / siliconflow / parser" fullWidth />
            <TextField label="Endpoint URL" value={form.endpointUrl} onChange={(event) => setForm({ ...form, endpointUrl: event.target.value })} fullWidth />
            <TextField label="模型 ID" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} fullWidth />
            <TextField label="密钥引用" value={form.apiKeyRef} onChange={(event) => setForm({ ...form, apiKeyRef: event.target.value })} helperText="建议使用 env:VAR_NAME，避免明文密钥落库。" fullWidth />
            <TextField label="配置说明" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} helperText={providerTypeDescriptions[form.providerType]} multiline minRows={2} fullWidth />
            <TextField label="优先级" type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenDialog(false); setEditingProviderId(null); }}>取消</Button>
          <Button variant="contained" onClick={saveProvider} disabled={!form.providerName || !form.endpointUrl}>保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editingPrompt} onClose={() => setEditingPrompt(null)} maxWidth="md" fullWidth>
        <DialogTitle>编辑大模型调用提示词</DialogTitle>
        <DialogContent>
          {editingPrompt && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="业务场景" value={`${editingPrompt.name} / ${editingPrompt.version}`} disabled fullWidth />
              <TextField label="模型 Provider" value={`${editingPrompt.providerName} / ${editingPrompt.model}`} disabled fullWidth />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select label="状态" value={editingPrompt.status} onChange={(event) => setEditingPrompt({ ...editingPrompt, status: event.target.value as PromptTemplate['status'] })}>
                  <MenuItem value="active">启用</MenuItem>
                  <MenuItem value="inactive">停用</MenuItem>
                </Select>
              </FormControl>
              <TextField label="System Prompt" value={editingPrompt.systemPrompt} onChange={(event) => setEditingPrompt({ ...editingPrompt, systemPrompt: event.target.value })} multiline minRows={4} fullWidth />
              <TextField label="User Prompt 模板" value={editingPrompt.userPromptTemplate} onChange={(event) => setEditingPrompt({ ...editingPrompt, userPromptTemplate: event.target.value })} helperText="支持变量：{{briefName}}、{{version}}、{{brief}}、{{baselineVersion}}、{{currentVersion}}、{{baselineBrief}}、{{currentBrief}}" multiline minRows={5} fullWidth />
              <TextField label="返回 JSON Schema / 示例" value={editingPrompt.outputSchema} onChange={(event) => setEditingPrompt({ ...editingPrompt, outputSchema: event.target.value })} multiline minRows={4} fullWidth />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingPrompt(null)}>取消</Button>
          <Button variant="contained" onClick={savePromptTemplate} disabled={!editingPrompt?.systemPrompt || !editingPrompt?.userPromptTemplate}>保存提示词</Button>
        </DialogActions>
      </Dialog>
    </PageScaffold>
  );
}
