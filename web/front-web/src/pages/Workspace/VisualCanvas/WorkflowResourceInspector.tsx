import { memo, useMemo } from 'react';
import {
  AppstoreOutlined,
  BgColorsOutlined,
  AudioOutlined,
  CheckCircleFilled,
  CloseOutlined,
  CloudDownloadOutlined,
  FileImageOutlined,
  FileTextOutlined,
  LoadingOutlined,
  PlayCircleFilled,
  ProductOutlined,
  ScissorOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { WorkflowNode, WorkflowNodeData, WorkflowNodeKind } from '../../../types/workflow';
import { creativeResourceLabels, isCreativeResourceType } from '../../../types/creativeResource';
import { useWorkflowStore } from '../../../stores/workflowStore';
import './workflow-resource-inspector.css';

interface ResourceOption {
  id: string;
  name: string;
  meta: string;
  tone: 'sand' | 'ice' | 'rose' | 'ink' | 'mint' | 'amber';
}

const resourceOptions: Partial<Record<WorkflowNodeKind, ResourceOption[]>> = {
  product: [
    { id: 'serum-main', name: '鎏金修护精华', meta: '主图 · 透明底 · 已抠图', tone: 'amber' },
    { id: 'serum-detail', name: '精华滴管细节', meta: '细节图 · 4K', tone: 'sand' },
    { id: 'serum-pack', name: '包装组合图', meta: '正侧背 · 3 张', tone: 'ink' },
  ],
  scene: [
    { id: 'scene-morning', name: '晨光梳妆台', meta: '柔光 · 暖白 · 居家', tone: 'sand' },
    { id: 'scene-studio', name: '纯净实验室', meta: '冷白 · 高级 · 专业', tone: 'ice' },
    { id: 'scene-night', name: '夜间修护氛围', meta: '深色 · 微光 · 情绪', tone: 'ink' },
  ],
  storyboard: [
    { id: 'script-pain', name: '痛点转化脚本', meta: '30 秒 · 9 镜头', tone: 'rose' },
    { id: 'script-proof', name: '成分实证脚本', meta: '25 秒 · 8 镜头', tone: 'ice' },
    { id: 'script-story', name: '品牌故事脚本', meta: '45 秒 · 12 镜头', tone: 'amber' },
  ],
  image: [
    { id: 'image-bathroom', name: '浴室晨光场景图', meta: '9:16 · 4K · 已审核', tone: 'sand' },
    { id: 'image-water', name: '水感微距场景图', meta: '9:16 · 4K · 已审核', tone: 'ice' },
    { id: 'image-night', name: '夜间修护场景图', meta: '9:16 · 4K · 已审核', tone: 'ink' },
  ],
  result: [
    { id: 'history-01', name: '场景图生成 #042', meta: '今天 14:32 · 4 张', tone: 'sand' },
    { id: 'history-02', name: '视频素材 #018', meta: '昨天 19:08 · 16 段', tone: 'mint' },
    { id: 'history-03', name: '产品主图 #071', meta: '9 月 3 日 · 6 张', tone: 'rose' },
  ],
};

const kindIcons: Partial<Record<WorkflowNodeKind, React.ReactNode>> = {
  product: <ProductOutlined />, scene: <AppstoreOutlined />, character: <UserOutlined />,
  style: <BgColorsOutlined />, effect: <ThunderboltOutlined />,
  storyboard: <FileTextOutlined />, scriptGenerator: <FileTextOutlined />, image: <FileImageOutlined />,
  result: <FileImageOutlined />, categorySkill: <ThunderboltOutlined />, prompt: <ThunderboltOutlined />,
  batchMaterial: <PlayCircleFilled />, editor: <ScissorOutlined />, export: <CloudDownloadOutlined />,
  note: <FileTextOutlined />,
};

const parameterRows = (data: WorkflowNodeData) => {
  if (isCreativeResourceType(data.kind)) return [
    ['类型', `${creativeResourceLabels[data.kind]}资源`], ['分类', data.resourceMeta || '尚未选择'],
    ['引用', data.creativeResourceId ? '已应用 · 可连接下游' : '请先选择资源'],
  ];
  switch (data.kind) {
    case 'categorySkill': return [['品类', data.category || '美妆个护'], ['能力', data.renderMode || 'AI 场景合成'], ['Skill', data.skillCode || 'category-scene-v1']];
    case 'prompt': return [['模型', data.model || '商业分镜提示词模型'], ['输入', '脚本 + 场景 + 产品'], ['输出', '结构化镜头提示词']];
    case 'batchMaterial': return [['模型', data.model || '通用品类视频模型'], ['镜头数', `${data.batchSize || 100} 个`], ['比例', data.aspectRatio || '9:16']];
    case 'editor': return [['引擎', data.model || 'AI 智能剪辑引擎'], ['成片', `${data.outputCount || 15} 条`], ['规格', `${data.aspectRatio || '9:16'} · ${data.resolution || '1080P'}`]];
    case 'export': return [['成片', `${data.outputCount || 15} 条`], ['规格', `${data.aspectRatio || '9:16'} · ${data.resolution || '1080P'}`], ['状态', data.status === 'success' ? '可导出' : '等待合成']];
    default: return [['类型', '画布资源'], ['状态', data.resourceName ? '已引用' : '待选择'], ['连接', '支持左右双向连线']];
  }
};

interface WorkflowResourceInspectorProps {
  node: WorkflowNode;
  onClose: () => void;
  onChange: (patch: Partial<WorkflowNodeData>) => void;
  onRun: () => void;
  onPreview: () => void;
}

const WorkflowResourceInspector = memo(({ node, onClose, onChange, onRun, onPreview }: WorkflowResourceInspectorProps) => {
  const openCreativeLibrary = useWorkflowStore(state => state.openCreativeLibrary);
  const { data } = node;
  const options = resourceOptions[data.kind] || [];
  const parameters = useMemo(() => parameterRows(data), [data]);
  const isBusy = data.status === 'running' || data.status === 'queued';
  const isOutput = data.kind === 'editor' || data.kind === 'export' || data.kind === 'batchMaterial';
  const creativeType = isCreativeResourceType(data.kind) ? data.kind : null;
  const handleRun = () => {
    if (options.length && !data.resourceId) {
      const option = options[0];
      onChange({ resourceId: option.id, resourceName: option.name, resourceMeta: option.meta, description: option.meta });
    }
    onRun();
  };

  return (
    <aside className="workflow-resource-inspector" aria-label={`${data.title}资源面板`}>
      <header>
        <span className={`workflow-inspector-kind kind-${data.kind}`}>{kindIcons[data.kind] || <AudioOutlined />}</span>
        <div><small>{isOutput ? '处理与输出' : '资源引用'}</small><strong>{data.title}</strong></div>
        <button type="button" onClick={onClose} aria-label="关闭资源面板"><CloseOutlined /></button>
      </header>

      {creativeType ? <section className={`workflow-creative-inspector-preview${creativeType === 'character' ? ' is-character' : ''}`}>
        {data.resourceCoverUrl || data.assetUrl ? <img src={data.resourceCoverUrl || data.assetUrl} alt={data.title} /> : null}
        <p>{data.description}</p>
        <button type="button" onClick={() => openCreativeLibrary(creativeType, { nodeId: node.id })}><AppstoreOutlined /> {data.resourceViewLabel ? '更换此图' : `${data.creativeResourceId ? '更换' : '选择'}${creativeResourceLabels[creativeType]}资源`}</button>
      </section> : null}

      {options.length ? (
        <section className="workflow-inspector-section">
          <div className="workflow-inspector-section-title"><strong>选择资源</strong><span>{options.length} 项可用</span></div>
          <div className="workflow-resource-options">
            {options.map((option, index) => {
              const selected = data.resourceId === option.id || (!data.resourceId && index === 0);
              return (
                <button
                  type="button"
                  key={option.id}
                  className={selected ? 'selected' : ''}
                  onClick={() => onChange({ resourceId: option.id, resourceName: option.name, resourceMeta: option.meta, description: option.meta })}
                >
                  <span className={`workflow-resource-thumb tone-${option.tone}`}>{kindIcons[data.kind]}</span>
                  <span><strong>{option.name}</strong><small>{option.meta}</small></span>
                  {selected ? <CheckCircleFilled /> : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="workflow-inspector-section is-parameters">
        <div className="workflow-inspector-section-title"><strong>{isOutput ? '执行配置' : '节点信息'}</strong><span>只读</span></div>
        <dl>
          {parameters.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>

      {data.status === 'success' ? (
        <div className="workflow-inspector-success"><CheckCircleFilled /><span><strong>节点已完成</strong><small>结果已写回画布，可继续连接下游节点</small></span></div>
      ) : null}

      {!creativeType ? <footer>
        {data.kind === 'export' ? <button type="button" className="workflow-inspector-secondary" onClick={onPreview}>预览成片</button> : null}
        <button type="button" className="workflow-inspector-primary" disabled={isBusy} onClick={handleRun}>
          {isBusy ? <LoadingOutlined spin /> : <PlayCircleFilled />}{isBusy ? '执行中' : isOutput ? '运行此节点' : '确认引用'}
        </button>
      </footer> : null}
    </aside>
  );
});

WorkflowResourceInspector.displayName = 'WorkflowResourceInspector';

export default WorkflowResourceInspector;
