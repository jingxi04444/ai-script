import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Panel } from '../components/Panel';
import { llmProviderApi } from '../services/llmProviderApi';
import type { LlmProvider } from '../types/admin';
import type { AdminModal, Toast } from '../types/ui';

const cnStatus = (status: string) => status === 'enabled' ? '启用' : '停用';

const maskKeyRef = (value: string) => {
  if (!value) return '-';
  if (value.startsWith('env:')) return value;
  if (value.includes('*')) return value;
  return '***';
};

export function LLMProviderPage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const data = await llmProviderApi.getProviders();
      setProviders([...data].sort((a, b) => a.priority - b.priority));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const enabledProviders = providers.filter((provider) => provider.status === 'enabled');
  const primaryProvider = enabledProviders[0];
  const fallbackCount = Math.max(enabledProviders.length - 1, 0);

  const createProvider = () => openModal({
    title: '新增大模型 Provider',
    description: '配置 OpenAI-compatible 接口地址、模型和密钥引用。建议使用 env:VAR_NAME，避免在数据库中保存明文密钥。',
    confirmText: '保存 Provider',
    fields: [
      { name: 'providerName', label: 'Provider 名称', placeholder: 'DeepSeek OpenAI Compatible' },
      { name: 'platform', label: '平台标识', placeholder: 'deepseek / qwen / openai / custom' },
      { name: 'endpointUrl', label: 'Endpoint URL', placeholder: 'https://api.deepseek.com/v1' },
      { name: 'model', label: '模型 ID', placeholder: 'deepseek-chat' },
      { name: 'apiKeyRef', label: '密钥引用', placeholder: 'env:DEEPSEEK_API_KEY' },
      { name: 'priority', label: '优先级', type: 'number', defaultValue: '100' },
      { name: 'timeoutMs', label: '超时毫秒', type: 'number', defaultValue: '60000' },
      { name: 'retryCount', label: '重试次数', type: 'number', defaultValue: '2' },
      { name: 'temperature', label: 'Temperature', defaultValue: '0.3' },
      { name: 'maxTokens', label: 'Max Tokens', type: 'number', defaultValue: '3000' },
    ],
    onConfirm: async (payload) => {
      const result = await llmProviderApi.createProvider(payload);
      setProviders((prev) => [result.provider, ...prev].sort((a, b) => a.priority - b.priority));
      showToast('大模型 Provider 已保存。');
    },
  });

  const disableProvider = async (provider: LlmProvider) => {
    await llmProviderApi.disableProvider(provider.id);
    setProviders((prev) => prev.map((item) => item.id === provider.id ? { ...item, status: 'disabled' } : item));
    showToast('大模型 Provider 已停用。');
  };

  return (
    <section className="page-stack">
      <section className="llm-hero">
        <div className="llm-hero-copy">
          <span>LLM ROUTING</span>
          <h2>大模型 Provider 管理</h2>
          <p>统一管理 DeepSeek、通义千问、OpenAI 等 OpenAI-compatible 模型供应商。后端按租户范围、启用状态与优先级自动选择，主供应商异常时切换到备用供应商。</p>
        </div>
        <div className="llm-overview-grid">
          <article>
            <span>主 Provider</span>
            <strong>{primaryProvider?.providerName || '未配置'}</strong>
            <small>{primaryProvider ? `${primaryProvider.model} / P${primaryProvider.priority}` : '需要至少启用 1 个供应商'}</small>
          </article>
          <article>
            <span>备用链路</span>
            <strong>{fallbackCount}</strong>
            <small>按 priority 从小到大故障切换</small>
          </article>
          <article>
            <span>密钥策略</span>
            <strong>env 引用</strong>
            <small>列表仅展示脱敏值，不回显明文 Key</small>
          </article>
        </div>
      </section>

      <Panel title="Provider 列表" action={<div className="action-pair"><button onClick={loadProviders}>{loading ? '刷新中...' : '刷新'}</button><button onClick={createProvider}>新增 Provider</button></div>}>
        {providers.length === 0 && !loading ? <p>暂无大模型 Provider，请先新增一个 OpenAI-compatible 供应商。</p> : null}
        <DataTable
          columns={['优先级', 'Provider', '模型', 'Endpoint', '密钥引用', '超时 / 重试', '状态', '操作']}
          rows={providers.map((provider) => [
            <strong className="llm-rank">P{provider.priority}</strong>,
            <div className="llm-provider-name"><strong>{provider.providerName}</strong><span>{provider.platform}</span></div>,
            <div className="llm-provider-meta"><strong>{provider.model}</strong><span>{provider.temperature ?? '-'} temp / {provider.maxTokens ?? '-'} tokens</span></div>,
            <code className="llm-endpoint">{provider.endpointUrl}</code>,
            <code className="llm-key">{maskKeyRef(provider.apiKeyRef)}</code>,
            `${provider.timeoutMs}ms / ${provider.retryCount} 次`,
            <span className={`status-pill ${provider.status === 'enabled' ? 'enabled' : 'disabled'}`}>{cnStatus(provider.status)}</span>,
            provider.status === 'enabled'
              ? <button className="inline-action danger" onClick={() => disableProvider(provider)}>停用</button>
              : <span className="llm-disabled-note">已停用</span>,
          ])}
        />
      </Panel>
    </section>
  );
}
