import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Panel } from '../components/Panel';
import { parsingApi } from '../services/parsingApi';
import type { ParsingLog } from '../types/admin';
import type { AdminModal, Toast } from '../types/ui';

export function ParsingPage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [logs, setLogs] = useState<ParsingLog[]>([]);

  useEffect(() => {
    parsingApi.getParsingLogs().then((data) => setLogs(data));
  }, []);

  return <Panel title="数据采集与解析管理" action={<div className="action-pair"><button onClick={() => openModal({ title: '解析 API 配置', description: '模拟配置第三方解析服务商、超时时间和重试次数。', confirmText: '保存配置', fields: [{ name: 'provider', label: '服务商', defaultValue: '主解析 API' }, { name: 'timeout', label: '超时时间', defaultValue: '8s' }, { name: 'retry', label: '重试次数', defaultValue: '2' }], onConfirm: async (payload) => { await parsingApi.saveProviderConfig(payload); showToast('解析 API 配置已保存。'); } })}>配置 API</button><button onClick={() => showToast('已测试主解析 API，状态可用。')}>测试连通性</button></div>}><DataTable columns={['品牌', '平台', '链接', '状态', '耗时', '时间', '操作']} rows={logs.map((log) => [log.brand, log.platform, log.url, log.status, log.cost, log.time, <button className="inline-action" onClick={async () => { await parsingApi.retryParsingLog(log.id); showToast('解析任务已重新入队。'); }}>重试</button>])} /></Panel>;
}
