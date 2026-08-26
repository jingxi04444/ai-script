import { useEffect, useMemo, useState } from 'react';
import { CheckOutlined, CloseOutlined, LockOutlined, SearchOutlined } from '@ant-design/icons';
import { Input, InputNumber, Modal } from 'antd';
import type { ScriptTemplate } from '../../../types/script';
import './batch-generation-modal.css';

interface TemplateBatchGenerationModalProps {
  open: boolean;
  templates: ScriptTemplate[];
  initialTemplateId?: string;
  currentBriefLabel: string;
  pointCost: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (templateIds: string[], copiesPerTemplate: number) => Promise<boolean>;
}

const MAX_TASKS = 50;

const TemplateBatchGenerationModal = ({
  open,
  templates,
  initialTemplateId,
  currentBriefLabel,
  pointCost,
  submitting,
  onClose,
  onSubmit,
}: TemplateBatchGenerationModalProps) => {
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [copiesPerTemplate, setCopiesPerTemplate] = useState(1);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!open) return;
    const initialTemplate = templates.find((template) => template.id === initialTemplateId && !template.locked);
    setSelectedTemplateIds(initialTemplate ? [initialTemplate.id] : []);
    setCopiesPerTemplate(1);
    setKeyword('');
  }, [initialTemplateId, open, templates]);

  const filteredTemplates = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) => [
      template.name,
      template.category,
      template.actor,
      template.difficulty,
      template.firstFiveSecondsHook,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }, [keyword, templates]);

  const selectedCount = selectedTemplateIds.length;
  const maxCopies = Math.max(1, Math.floor(MAX_TASKS / Math.max(selectedCount, 1)));
  const totalTasks = selectedCount * copiesPerTemplate;
  const totalPointCost = Number.isFinite(pointCost) ? totalTasks * pointCost : 0;

  const toggleTemplate = (template: ScriptTemplate) => {
    if (template.locked) return;
    setSelectedTemplateIds((current) => {
      const next = current.includes(template.id)
        ? current.filter((id) => id !== template.id)
        : [...current, template.id];
      const nextMaxCopies = Math.max(1, Math.floor(MAX_TASKS / Math.max(next.length, 1)));
      setCopiesPerTemplate((value) => Math.min(value, nextMaxCopies));
      return next;
    });
  };

  const selectAllVisible = () => {
    const visibleIds = filteredTemplates.filter((template) => !template.locked).map((template) => template.id);
    setSelectedTemplateIds((current) => {
      const next = Array.from(new Set([...current, ...visibleIds])).slice(0, MAX_TASKS);
      setCopiesPerTemplate((value) => Math.min(value, Math.max(1, Math.floor(MAX_TASKS / Math.max(next.length, 1)))));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedCount || !totalTasks || totalTasks > MAX_TASKS) return;
    const completed = await onSubmit(selectedTemplateIds, copiesPerTemplate);
    if (completed) onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={submitting ? undefined : onClose}
      footer={null}
      closable={false}
      width={760}
      centered
      destroyOnHidden
      className="batch-generation-modal"
    >
      <header className="batch-generation-header">
        <div>
          <span className="batch-generation-eyebrow">MULTI-TEMPLATE GENERATION</span>
          <h2>选择多个模板批量生成</h2>
          <p>同一个产品 Brief，分别套用不同模板生成多条脚本。</p>
        </div>
        <button type="button" className="batch-generation-close" onClick={onClose} disabled={submitting} aria-label="关闭批量生成">
          <CloseOutlined />
        </button>
      </header>

      <section className="batch-generation-context" aria-label="当前批量生成产品 Brief">
        <span>当前产品 Brief</span>
        <strong>{currentBriefLabel || '尚未选择 Brief'}</strong>
        <small>以下模板将共用当前脚本格式、时长和产品画面配置。</small>
      </section>

      <section className="batch-generation-toolbar" aria-label="模板筛选与批量选择">
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder="搜索模板名称、分类、演员或标签"
          allowClear
        />
        <button type="button" onClick={selectAllVisible} disabled={!filteredTemplates.some((template) => !template.locked) || submitting}>全选可用模板</button>
        <button type="button" onClick={() => setSelectedTemplateIds([])} disabled={!selectedCount || submitting}>清空</button>
      </section>

      <section className="batch-generation-list" aria-label="选择需要批量生成的模板">
        {filteredTemplates.map((template) => {
          const selected = selectedTemplateIds.includes(template.id);
          return (
            <button
              type="button"
              key={template.id}
              className={`batch-generation-template ${selected ? 'is-selected' : ''} ${template.locked ? 'is-locked' : ''}`}
              onClick={() => toggleTemplate(template)}
              role="checkbox"
              aria-checked={selected}
              aria-disabled={template.locked}
              disabled={submitting || template.locked}
            >
              <span className="batch-generation-check">{template.locked ? <LockOutlined /> : selected ? <CheckOutlined /> : null}</span>
              <span className="batch-generation-template-copy">
                <strong>{template.name}</strong>
                <small>{[template.actor, template.people, template.difficulty].filter(Boolean).join(' · ') || '使用当前 Brief 和脚本配置生成'}</small>
              </span>
              <span className="batch-generation-template-category">{template.category || '通用模板'}</span>
            </button>
          );
        })}
        {!filteredTemplates.length ? <div className="batch-generation-empty">没有匹配的模板</div> : null}
      </section>

      <section className="batch-generation-settings">
        <div>
          <strong>每个模板生成份数</strong>
          <small>通常设置 1 份即可；需要同模板多版本时可增加份数。</small>
        </div>
        <InputNumber
          min={1}
          max={maxCopies}
          value={copiesPerTemplate}
          onChange={(value) => setCopiesPerTemplate(Math.max(1, Math.min(Number(value) || 1, maxCopies)))}
          disabled={submitting}
        />
      </section>

      <footer className="batch-generation-footer">
        <div className="batch-generation-summary">
          <strong>{selectedCount} 个模板 · {totalTasks} 个任务</strong>
          <span>预计消耗 {totalPointCost} 水滴，最多一次提交 {MAX_TASKS} 个任务</span>
        </div>
        <div className="batch-generation-actions">
          <button type="button" onClick={onClose} disabled={submitting}>取消</button>
          <button
            type="button"
            className="primary"
            onClick={() => void handleSubmit()}
            disabled={!selectedCount || submitting || totalTasks > MAX_TASKS || !currentBriefLabel}
          >
            {submitting ? '正在加入队列…' : `用 ${selectedCount} 个模板生成`}
          </button>
        </div>
      </footer>
    </Modal>
  );
};

export default TemplateBatchGenerationModal;
