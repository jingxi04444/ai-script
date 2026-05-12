import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Panel } from '../components/Panel';
import { knowledgeApi } from '../services/knowledgeApi';
import type { Formula } from '../types/admin';
import type { AdminModal, Toast } from '../types/ui';

export function KnowledgeBasePage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [formulas, setFormulas] = useState<Formula[]>([]);

  useEffect(() => {
    knowledgeApi.getFormulas().then((data) => setFormulas(data));
  }, []);

  const importModal = (type: string, accept = '.csv,.xlsx') => openModal({
    title: `导入${type}`,
    description: `请选择${type}文件，当前仅模拟上传和导入结果。`,
    confirmText: '开始导入',
    file: { label: `${type}文件`, accept },
    onConfirm: async (_, file) => {
      if (!file) {
        showToast('请选择文件。', 'warning');
        return;
      }
      const result = await knowledgeApi.importKnowledgeFile({ type, fileName: file.name });
      showToast(`${type}导入成功，共 ${result.rows} 条。`);
    },
  });

  return <section className="page-stack"><Panel title="结构公式库" action={<button onClick={() => openModal({ title: '新增结构公式', description: '手动录入通用爆款结构公式。', confirmText: '保存公式', fields: [{ name: 'name', label: '公式名称', placeholder: '例如：3 秒痛点 + 产品方案 + CTA' }, { name: 'platform', label: '适用平台', defaultValue: '抖音' }], onConfirm: () => showToast('结构公式已保存到 mock 知识库。') })}>新增公式</button>}><DataTable columns={['公式', '平台', '复用次数', '风险']} rows={formulas.map((item) => [item.name, item.platform, item.usage, item.risk])} /></Panel><div className="split-grid"><Panel title="合规词库" action={<button onClick={() => importModal('合规词库')}>导入词库</button>}><p>广告法高风险词、行业敏感词、替换建议统一管理。当前 mock 包含 324 条规则。</p></Panel><Panel title="产品卖点知识库" action={<button onClick={() => importModal('产品卖点库')}>导入卖点</button>}><p>按品牌隔离保存产品卖点、导入模板和历史版本，支持前台一键复用。</p></Panel></div></section>;
}
