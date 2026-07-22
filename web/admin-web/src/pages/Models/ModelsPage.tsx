import { useEffect, useMemo, useState } from 'react';
import { Bot, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { providerApi, type Provider } from '../../api/provider';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';

type ThinkingMode = 'default' | 'enabled' | 'disabled';
type ReasoningEffort = 'default' | 'high' | 'max';
type ProviderForm = Partial<Provider> & {
  thinkingMode?: ThinkingMode;
  reasoningEffort?: ReasoningEffort;
};

const emptyForm: ProviderForm = {
  providerName: '',
  providerType: '',
  platform: '',
  endpointUrl: '',
  priority: 1,
  timeoutMs: 30000,
  retryCount: 1,
  configJson: '',
  thinkingMode: 'default',
  reasoningEffort: 'default',
  apiKey: '',
  status: 1,
};

const parseProviderConfig = (configJson?: string) => {
  if (!configJson?.trim()) return {} as Record<string, unknown>;
  const parsed = JSON.parse(configJson) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('扩展配置必须是 JSON 对象');
  return parsed as Record<string, unknown>;
};

const thinkingSettingsFromConfig = (config: Record<string, unknown>): Pick<ProviderForm, 'thinkingMode' | 'reasoningEffort'> => {
  const thinking = config.thinking;
  const thinkingType = thinking && typeof thinking === 'object' && !Array.isArray(thinking)
    ? (thinking as { type?: unknown }).type
    : thinking;
  const thinkingMode = thinkingType === 'enabled' || thinkingType === 'disabled' ? thinkingType : 'default';
  const effort = config.reasoning_effort;
  const reasoningEffort = effort === 'high' || effort === 'max' ? effort : 'default';
  return { thinkingMode, reasoningEffort };
};

const readThinkingSettings = (configJson?: string) => {
  try {
    return thinkingSettingsFromConfig(parseProviderConfig(configJson));
  } catch {
    return { thinkingMode: 'default' as ThinkingMode, reasoningEffort: 'default' as ReasoningEffort };
  }
};

const normalizeDeepSeekEndpoint = (platform?: string, endpointUrl?: string) => {
  const normalized = endpointUrl?.trim() || '';
  if (platform?.trim().toLowerCase() === 'deepseek' && /\/chat\/completion\/?$/i.test(normalized)) {
    return normalized.replace(/\/chat\/completion\/?$/i, '/chat/completions');
  }
  return normalized;
};

const ModelsPage = () => {
  const { notify } = useAdminShell();
  const [keyword, setKeyword] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderForm>(emptyForm);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const load = async () => {
    setLoading(true);
    try {
      const data = await providerApi.getList({ page, pageSize, keyword: keyword || undefined });
      setProviders(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setProviders([]);
      setTotal(0);
      notify('Provider 列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (provider: Provider) => {
    setEditing(provider);
    setForm({ ...provider, ...readThinkingSettings(provider.configJson), apiKey: '' });
    setEditorOpen(true);
  };

  const save = async () => {
    if (!form.providerName?.trim()) {
      notify('请填写 Provider 名称');
      return;
    }
    try {
      const { thinkingMode = 'default', reasoningEffort = 'default', ...payload } = form;
      let config: Record<string, unknown>;
      try {
        config = parseProviderConfig(payload.configJson);
      } catch {
        notify('扩展配置 JSON 格式不正确');
        return;
      }
      if (thinkingMode === 'default') delete config.thinking;
      else config.thinking = { type: thinkingMode };
      if (reasoningEffort === 'default') delete config.reasoning_effort;
      else config.reasoning_effort = reasoningEffort;
      payload.configJson = JSON.stringify(config, null, 2);
      payload.endpointUrl = normalizeDeepSeekEndpoint(payload.platform, payload.endpointUrl);
      if (editing && !payload.apiKey?.trim()) {
        delete payload.apiKey;
      }
      if (editing) {
        await providerApi.update(editing.id, payload);
        notify('Provider 已更新');
      } else {
        await providerApi.create(payload);
        notify('Provider 已创建');
      }
      setEditorOpen(false);
      load();
    } catch {
      notify('保存失败');
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      await providerApi.delete(deleteId);
      notify('Provider 已删除');
      setDeleteId(null);
      load();
    } catch {
      notify('删除失败');
    }
  };

  const rows = useMemo(() => providers, [providers]);

  return (
    <div className="page-stack">
      <PageHeader
        title="大模型管理"
        description="管理 Provider、模型路由和基础接入信息。"
        actions={
          <div className="toolbar-group">
            <input className="toolbar-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索 Provider / 模型 / 域名" />
            <button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button>
            <button className="toolbar-btn primary" type="button" onClick={openCreate}><Plus size={16} />新增 Provider</button>
          </div>
        }
      />

      <SectionCard title="Provider 列表" description="对接 /api/admin/providers。">
        {rows.length ? (
          <>
          <div className="admin-table">
            <div className="table-head" style={{ gridTemplateColumns: '1fr 0.8fr 0.8fr 1fr 0.7fr 0.8fr 0.8fr' }}>
              <span>名称</span><span>平台</span><span>类型</span><span>地址</span><span>Key</span><span>状态</span><span>操作</span>
            </div>
            {rows.map((provider) => (
              <div className="table-row" style={{ gridTemplateColumns: '1fr 0.8fr 0.8fr 1fr 0.7fr 0.8fr 0.8fr' }} key={provider.id}>
                <strong>{provider.providerName || '-'}</strong>
                <span>{provider.platform || '-'}</span>
                <span>{provider.providerType || '-'}</span>
                <span>{provider.endpointUrl || '-'}</span>
                <StatusBadge tone={provider.apiKeyConfigured ? 'blue' : 'gray'}>{provider.apiKeyConfigured ? '已配置' : '未配置'}</StatusBadge>
                <StatusBadge tone={String(provider.status) === '0' ? 'gray' : 'green'}>{String(provider.status) === '0' ? '禁用' : '启用'}</StatusBadge>
                <div className="table-actions">
                  <button className="table-btn" type="button" onClick={() => openEdit(provider)}>编辑</button>
                  <button className="table-btn danger" type="button" onClick={() => setDeleteId(provider.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </>
        ) : (
          <EmptyState title={loading ? '加载中...' : '暂无 Provider'} description="支持新增、编辑和删除，后端返回空时会显示空态。" icon={<Bot size={22} />} />
        )}
      </SectionCard>

      <Modal
        open={editorOpen}
        title={editing ? '编辑 Provider' : '新增 Provider'}
        description="请尽量填写完整，便于后续模型路由和监控。"
        onClose={() => setEditorOpen(false)}
        footer={<><button className="modal-btn" type="button" onClick={() => setEditorOpen(false)}>取消</button><button className="modal-btn primary" type="button" onClick={save}>保存</button></>}
      >
        <div className="field-grid">
          <label className="field"><span>名称</span><input value={form.providerName || ''} onChange={(e) => setForm({ ...form, providerName: e.target.value })} /></label>
          <label className="field"><span>平台</span><input value={form.platform || ''} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="openai / qwen / deepseek" /></label>
          <label className="field"><span>类型</span><input value={form.providerType || ''} onChange={(e) => setForm({ ...form, providerType: e.target.value })} placeholder="llm / vision / tts" /></label>
          <label className="field"><span>接口地址</span><input value={form.endpointUrl || ''} onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })} /></label>
          <label className="field"><span>API Key</span><input type="password" value={form.apiKey || ''} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={editing?.apiKeyConfigured ? '留空则不更新现有 Key' : '请输入 Provider API Key'} /></label>
          <label className="field"><span>优先级</span><input type="number" value={form.priority ?? 1} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></label>
          <label className="field"><span>状态</span><input type="number" value={form.status ?? 1} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })} placeholder="1 / 0" /></label>
          <label className="field"><span>思考模式</span><select value={form.thinkingMode || 'default'} onChange={(e) => setForm({ ...form, thinkingMode: e.target.value as ThinkingMode })}><option value="default">跟随模型默认</option><option value="enabled">开启深度思考</option><option value="disabled">关闭深度思考</option></select></label>
          <label className="field"><span>思考强度</span><select value={form.reasoningEffort || 'default'} onChange={(e) => setForm({ ...form, reasoningEffort: e.target.value as ReasoningEffort })}><option value="default">默认</option><option value="high">High</option><option value="max">Max</option></select></label>
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>扩展配置 JSON</span>
          <textarea value={form.configJson || ''} onChange={(e) => {
            const configJson = e.target.value;
            try {
              setForm({ ...form, configJson, ...thinkingSettingsFromConfig(parseProviderConfig(configJson)) });
            } catch {
              setForm({ ...form, configJson });
            }
          }} />
        </label>
      </Modal>

      <Modal
        open={Boolean(deleteId)}
        title="删除 Provider"
        description="确认删除该 Provider？"
        onClose={() => setDeleteId(null)}
        footer={<><button className="modal-btn" type="button" onClick={() => setDeleteId(null)}>取消</button><button className="modal-btn danger" type="button" onClick={remove}>删除</button></>}
      >
        <EmptyState title="危险操作" description="删除后模型路由可能失效，请确认已切换到备用 Provider。" icon={<Trash2 size={22} />} />
      </Modal>
    </div>
  );
};

export default ModelsPage;
