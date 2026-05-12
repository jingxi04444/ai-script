import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Panel } from '../components/Panel';
import { operationLogApi } from '../services/operationLogApi';
import type { OperationLog } from '../types/admin';
import type { Toast } from '../types/ui';

export function OperationLogPage({ showToast }: { showToast: (message: string, tone?: Toast['tone']) => void }) {
  const [logs, setLogs] = useState<OperationLog[]>([]);

  useEffect(() => {
    operationLogApi.getOperationLogs().then((data) => setLogs(data));
  }, []);

  return <Panel title="操作日志" action={<button onClick={() => showToast('操作日志导出任务已创建。')}>导出日志</button>}><DataTable columns={['操作人', '模块', '操作内容', 'IP 地址', '时间', '结果']} rows={logs.map((log) => [log.operator, log.module, log.action, log.ip, log.time, log.result])} /></Panel>;
}
