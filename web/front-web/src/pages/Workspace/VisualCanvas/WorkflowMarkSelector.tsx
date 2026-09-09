import { CheckOutlined, CloseOutlined, FileImageOutlined, TagsOutlined } from '@ant-design/icons';
import type { WorkflowNode } from '../../../types/workflow';
import './workflow-mark-selector.css';

interface WorkflowMarkSelectorProps {
  node: WorkflowNode;
  selectedParts: string[];
  onTogglePart: (part: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const markParts = [
  { key: '产品主体', className: 'is-product' },
  { key: '包装文字', className: 'is-copy' },
  { key: '背景区域', className: 'is-background' },
];

const WorkflowMarkSelector = ({ node, selectedParts, onTogglePart, onCancel, onConfirm }: WorkflowMarkSelectorProps) => {
  const previewUrl = node.data.outputUrl || node.data.assetUrl;

  return (
    <div className="workflow-mark-backdrop" role="dialog" aria-modal="true" aria-label="标记图片局部元素">
      <section className="workflow-mark-selector">
        <header>
          <div>
            <span><TagsOutlined /></span>
            <p><strong>标记图片元素</strong><small>选择生成时需要重点保持或修改的区域</small></p>
          </div>
          <button type="button" aria-label="关闭标记面板" onClick={onCancel}><CloseOutlined /></button>
        </header>

        <div className="workflow-mark-canvas">
          {previewUrl ? <img src={previewUrl} alt={node.data.title} /> : (
            <div className="workflow-mark-placeholder">
              <FileImageOutlined />
              <strong>{node.data.title}</strong>
              <small>Demo 图片预览</small>
            </div>
          )}
          {markParts.map((part) => {
            const selected = selectedParts.includes(part.key);
            return (
              <button
                type="button"
                key={part.key}
                className={`workflow-mark-region ${part.className}${selected ? ' selected' : ''}`}
                aria-pressed={selected}
                onClick={() => onTogglePart(part.key)}
              >
                <span>{selected ? <CheckOutlined /> : null}{part.key}</span>
              </button>
            );
          })}
        </div>

        <footer>
          <p><b>{selectedParts.length}</b> 个区域已选择<span>再次点击可取消</span></p>
          <div>
            <button type="button" onClick={onCancel}>取消</button>
            <button type="button" className="primary" disabled={!selectedParts.length} onClick={onConfirm}>
              <TagsOutlined />完成标记
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default WorkflowMarkSelector;
