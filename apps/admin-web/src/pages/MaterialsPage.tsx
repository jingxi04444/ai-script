import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Panel } from '../components/Panel';
import { materialApi } from '../services/materialApi';
import type { Material } from '../types/admin';
import type { AdminModal, Toast } from '../types/ui';

export function MaterialsPage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    materialApi.getMaterials().then((data) => setMaterials(data));
  }, []);

  return <Panel title="视频素材与项目库" action={<button onClick={() => openModal({ title: '上传素材', description: '上传视频片段、配音、场景图或参考素材。', confirmText: '上传素材', file: { label: '素材文件', accept: '.mp4,.png,.jpg,.mp3,.wav' }, onConfirm: async (_, file) => { if (!file) { showToast('请选择素材文件。', 'warning'); return; } showToast(`${file.name} 已上传到素材库。`); } })}>上传素材</button>}><DataTable columns={['素材', '类型', '品牌', '关联项目', '复用次数', '大小', '操作']} rows={materials.map((item) => [item.name, item.type, item.brand, item.project, item.usage, item.size, <div className="action-pair"><button className="inline-action" onClick={() => showToast(`正在预览 ${item.name}`)}>预览</button><button className="inline-action" onClick={async () => { await materialApi.downloadMaterial(item.id); showToast(`${item.name} 已创建下载任务。`); }}>下载</button><button className="inline-action danger" onClick={() => openModal({ title: '删除素材', description: `确认删除「${item.name}」？mock 会保留操作日志。`, confirmText: '确认删除', onConfirm: async () => { await materialApi.deleteMaterial(item.id); setMaterials((prev) => prev.filter((material) => material.id !== item.id)); showToast('素材已删除。', 'warning'); } })}>删除</button></div>])} /></Panel>;
}
