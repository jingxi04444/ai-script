import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Panel } from '../components/Panel';
import { auditApi } from '../services/auditApi';
import type { AuditTask } from '../types/admin';
import type { AdminModal, Toast } from '../types/ui';

export function AuditWorkflowPage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [tasks, setTasks] = useState<AuditTask[]>([]);

  useEffect(() => {
    auditApi.getAuditTasks().then((data) => setTasks(data));
  }, []);

  return <Panel title="审核工作流" action={<button onClick={() => showToast('待审核任务已按工作负载自动分配。')}>自动分配</button>}><DataTable columns={['脚本', '品牌', '提交人', '状态', '风险', '提交时间', '操作']} rows={tasks.map((task) => [task.script, task.brand, task.owner, task.status, task.risk, task.submittedAt, <div className="action-pair"><button className="inline-action" onClick={() => openModal({ title: '确认审核通过', description: `确认通过「${task.script}」？该操作会写入审核记录。`, confirmText: '确认通过', onConfirm: async () => { await auditApi.approveAuditTask(task.id); showToast('审核已通过。'); } })}>通过</button><button className="inline-action danger" onClick={() => openModal({ title: '驳回脚本', description: `请填写「${task.script}」的驳回原因，提交后会通知提交人。`, confirmText: '确认驳回', fields: [{ name: 'reason', label: '驳回原因', placeholder: '请输入原因' }], onConfirm: async (payload) => { await auditApi.rejectAuditTask(task.id, String(payload.reason || '')); showToast('审核已驳回。', 'warning'); } })}>驳回</button></div>])} /></Panel>;
}
