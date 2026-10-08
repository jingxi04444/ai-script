import { memo, useEffect, useState, type ReactNode } from 'react';
import CanvasIcon from './CanvasIcon';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { workflowApi } from '../../../api/workflow';
import { config } from '../../../config';
import { useWorkflowStore } from '../../../stores/workflowStore';
import type { WorkflowModelOption, WorkflowNode, WorkflowNodeData, WorkflowNodeKind, WorkflowNodeStatus } from '../../../types/workflow';
import { creativeResourceLabels, isCreativeResourceType } from '../../../types/creativeResource';
import './director-node.css';
import './CreativeLibrary/creative-resource-library.css';
import './template-resource-node.css';
import './character-image-node.css';
import './node-editors.css';
import NodeAdvancedSettings from './NodeAdvancedSettings';
import { useEditorPopover } from './useEditorPopover';
import { referenceSelectionPatch, type FrameRole } from '../../../utils/workflowReferences';

const nodeIcons: Record<WorkflowNodeKind, React.ReactNode> = {
  storyboard: <CanvasIcon name="FileTextOutlined" />,
  scriptGenerator: <CanvasIcon name="FileTextOutlined" />,
  text: <CanvasIcon name="FileTextOutlined" />,
  character: <CanvasIcon name="UserOutlined" />,
  style: <CanvasIcon name="BgColorsOutlined" />,
  effect: <CanvasIcon name="ThunderboltOutlined" />,
  scene: <CanvasIcon name="AppstoreOutlined" />,
  director: <CanvasIcon name="VideoCameraOutlined" />,
  product: <CanvasIcon name="ProductOutlined" />,
  categorySkill: <CanvasIcon name="ThunderboltOutlined" />,
  prompt: <CanvasIcon name="HighlightOutlined" />,
  image: <CanvasIcon name="FileImageOutlined" />,
  batchMaterial: <CanvasIcon name="PlaySquareOutlined" />,
  result: <CanvasIcon name="CheckCircleFilled" />,
  video: <CanvasIcon name="VideoCameraOutlined" />,
  music: <CanvasIcon name="SoundOutlined" />,
  voice: <CanvasIcon name="AudioOutlined" />,
  editor: <CanvasIcon name="ScissorOutlined" />,
  export: <CanvasIcon name="CloudDownloadOutlined" />,
  note: <CanvasIcon name="PushpinOutlined" />,
};

const statusCopy: Record<WorkflowNodeStatus, string> = {
  idle: '待执行',
  queued: '队列中',
  running: '执行中',
  success: '已完成',
  failed: '失败',
};

const resourceKinds = new Set<WorkflowNodeKind>([
  'storyboard',
  'scriptGenerator',
  'character',
  'style',
  'effect',
  'scene',
  'product',
  'categorySkill',
  'prompt',
  'batchMaterial',
  'result',
  'editor',
  'export',
  'note',
]);

const editorKinds = new Set<WorkflowNodeKind>(['text', 'image', 'video', 'music', 'voice']);

const outputKinds = new Set<WorkflowNodeKind>(['batchMaterial', 'result', 'editor', 'export']);

const nodeRole = (kind: WorkflowNodeKind) => {
  if (kind === 'director') return { key: 'director', label: '3D 工作台' } as const;
  if (editorKinds.has(kind)) return { key: 'creator', label: '创作' } as const;
  if (outputKinds.has(kind)) return { key: 'output', label: '输出' } as const;
  return { key: 'resource', label: '资源' } as const;
};

export const isWorkflowEditorKind = (kind: WorkflowNodeKind) => editorKinds.has(kind);

const mediaKinds = new Set<WorkflowNodeKind>(['image', 'video', 'batchMaterial', 'result']);
const visualResourceKinds = new Set<WorkflowNodeKind>(['product', 'scene', 'character']);

const numberValue = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const statusIcon = (status: WorkflowNodeStatus) => {
  if (status === 'queued' || status === 'running') return <CanvasIcon name="LoadingOutlined" spin />;
  if (status === 'success') return <CanvasIcon name="CheckCircleFilled" />;
  if (status === 'failed') return <CanvasIcon name="ExclamationCircleFilled" />;
  return <span className="workflow-status-dot" />;
};

const nodeMetric = (data: WorkflowNodeData) => {
  if (data.kind === 'categorySkill') return data.renderMode || 'AI 场景合成';
  if (data.kind === 'image') return `${data.batchSize || 1} 张图片`;
  if (data.kind === 'video') return `${data.batchSize || 1} 个视频镜头`;
  if (data.kind === 'batchMaterial') return `${data.batchSize || 100} 个品类镜头`;
  if (data.kind === 'music') return data.musicStyle || '商业音乐';
  if (data.kind === 'voice') return data.voice || '自然口播';
  if (data.kind === 'editor' || data.kind === 'export') return `${data.outputCount || 15} 条成片`;
  return data.description;
};

interface EditorBodyProps {
  data: WorkflowNodeData;
  isBusy: boolean;
  onChange: (patch: Partial<WorkflowNodeData>) => void;
  onRun: () => void;
  onStartCanvasSelection: (mode: 'reference' | 'mark', role?: 'firstFrame' | 'lastFrame') => void;
}

const ReferenceStrip = ({
  data,
  video = false,
  audio = false,
  onChange,
  onStartCanvasSelection,
}: {
  data: WorkflowNodeData;
  video?: boolean;
  audio?: boolean;
  onChange: (patch: Partial<WorkflowNodeData>) => void;
  onStartCanvasSelection: EditorBodyProps['onStartCanvasSelection'];
}) => {
  const referenceLabels = data.referenceLabels || [];
  const referenceMarks = data.referenceMarks || [];
  const frameEntries: Array<{ label: string; index: number; role?: FrameRole }> = video ? [
    ...(data.firstFrameNodeId ? [{ label: data.firstFrameLabel || '首帧', index: (data.referenceNodeIds || []).indexOf(data.firstFrameNodeId), role: 'firstFrame' as const }] : []),
    ...(data.lastFrameNodeId ? [{ label: data.lastFrameLabel || '尾帧', index: (data.referenceNodeIds || []).indexOf(data.lastFrameNodeId), role: 'lastFrame' as const }] : []),
  ] : [];
  const referenceEntries = [...frameEntries, ...referenceLabels.map((label, index) => ({ label, index, role: undefined })).filter(item => !video || ![data.firstFrameNodeId, data.lastFrameNodeId].includes(data.referenceNodeIds?.[item.index]))];
  const hasReferences = Boolean(data.assetUrl || referenceLabels.length || referenceMarks.length);

  const removeReference = (index: number) => {
    onChange({
      referenceNodeIds: (data.referenceNodeIds || []).filter((_, itemIndex) => itemIndex !== index),
      referenceLabels: referenceLabels.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const removeMark = (index: number) => {
    onChange({
      referenceMarks: referenceMarks.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  return (
    <div className={`workflow-reference-strip${hasReferences ? ' has-asset' : ''}`}>
      <div className="workflow-reference-actions">
        <button type="button" className={referenceLabels.length ? 'selected' : ''} onClick={() => onStartCanvasSelection('reference', video ? 'firstFrame' : undefined)}>
          <CanvasIcon name="PlusOutlined" />{video ? '首帧参考' : '参考'}
        </button>
        {video ? <button type="button" onClick={() => onStartCanvasSelection('reference', 'lastFrame')}><CanvasIcon name="PlusOutlined" />尾帧参考</button> : null}
        {!audio ? <button type="button" className={referenceMarks.length ? 'selected' : ''} onClick={() => onStartCanvasSelection('mark')}>
          <CanvasIcon name="TagsOutlined" />{video ? '动作参考' : '标记'}
        </button> : null}
      </div>
      {hasReferences ? (
        <div className="workflow-reference-assets">
          {data.assetUrl ? (
            <div className="workflow-reference-item">
              <button type="button" className="workflow-reference-preview" onClick={() => onStartCanvasSelection('reference')} title="替换参考素材">
                <img src={data.assetUrl} alt="参考素材" />
                <span><CanvasIcon name="ProductOutlined" /></span>
                <em>{video ? '首帧' : '风格'}</em>
              </button>
              <button
                type="button"
                className="workflow-reference-remove"
                aria-label="移除参考素材"
                title="移除参考素材"
                onClick={() => onChange({ assetUrl: undefined })}
              >
                <CanvasIcon name="CloseOutlined" />
              </button>
            </div>
          ) : null}
          {referenceEntries.map(({ label, index, role }) => (
            <div className="workflow-reference-item" key={`${role || 'reference'}-${label}-${data.referenceNodeIds?.[index] || index}`}>
              <button type="button" className="workflow-reference-node-chip" onClick={() => onStartCanvasSelection('reference', role)}>
                <CanvasIcon name={audio ? 'SoundOutlined' : 'FileImageOutlined'} /><span>{label}</span><em>{role === 'firstFrame' ? '首帧参考' : role === 'lastFrame' ? '尾帧参考' : '画布参考'}</em>
              </button>
              <button
                type="button"
                className="workflow-reference-remove"
                aria-label={`移除${role === 'firstFrame' ? '首帧参考' : role === 'lastFrame' ? '尾帧参考' : '参考'}：${label}`}
                title="移除参考"
                onClick={() => {
                  if (role) {
                    onChange(referenceSelectionPatch(data, [], id => data.referenceLabels?.[(data.referenceNodeIds || []).indexOf(id)] || '参考素材', role));
                    return;
                  }
                  removeReference(index);
                  const removedId = data.referenceNodeIds?.[index];
                  if (removedId === data.firstFrameNodeId) onChange({ firstFrameNodeId: undefined, firstFrameLabel: undefined });
                  if (removedId === data.lastFrameNodeId) onChange({ lastFrameNodeId: undefined, lastFrameLabel: undefined });
                }}
              >
                <CanvasIcon name="CloseOutlined" />
              </button>
            </div>
          ))}
          {referenceMarks.map((mark, index) => (
            <div className="workflow-reference-item" key={`${mark.nodeId}-${mark.parts.join('-')}`}>
              <button type="button" className="workflow-reference-node-chip is-mark" onClick={() => onStartCanvasSelection('mark')}>
                <CanvasIcon name="TagsOutlined" /><span>{mark.nodeTitle}</span><em>{mark.parts.join(' · ')}</em>
              </button>
              <button
                type="button"
                className="workflow-reference-remove"
                aria-label={`移除标记：${mark.nodeTitle}`}
                title="移除标记"
                onClick={() => removeMark(index)}
              >
                <CanvasIcon name="CloseOutlined" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

interface ModelOption {
  name: string;
  description: string;
  latency?: string;
}

let modelCatalogRequest: Promise<WorkflowModelOption[]> | null = null;

const loadModelCatalog = () => {
  // 独立前端预览使用内置模型选项，避免将 Mock Token 发送到真实服务。
  if (config.useMock) return Promise.resolve([] as WorkflowModelOption[]);
  if (!modelCatalogRequest) {
    modelCatalogRequest = workflowApi.getModels().catch((error) => {
      modelCatalogRequest = null;
      throw error;
    });
  }
  return modelCatalogRequest;
};

const useProviderModelOptions = (providerTypes: string[], fallback: ModelOption[]) => {
  const [options, setOptions] = useState<ModelOption[]>(config.useMock ? fallback : []);
  const providerTypeKey = providerTypes.join(',');

  useEffect(() => {
    let active = true;
    loadModelCatalog().then((catalog) => {
      if (!active) return;
      const allowedTypes = new Set(providerTypeKey.split(','));
      const configured = catalog
        .filter((item) => allowedTypes.has(item.providerType))
        .map((item) => ({
          name: item.model,
          description: [item.providerName, item.platform].filter(Boolean).join(' · ') || '数据库 Provider 配置',
        }));
      setOptions(configured);
    }).catch(() => {
      setOptions([]);
    });
    return () => { active = false; };
  }, [providerTypeKey]);

  return options;
};

interface ModelSelectorProps {
  ariaLabel: string;
  icon: ReactNode;
  value: string;
  options: ModelOption[];
  onChange: (value: string) => void;
}

const ModelSelector = ({ ariaLabel, icon, value, options, onChange }: ModelSelectorProps) => {
  const { open, setOpen, ref, menuStyle } = useEditorPopover();

  return (
    <div ref={ref} className={`workflow-model-control${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="workflow-model-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
      >
        {icon}<span>{options.length ? (options.some(option => option.name === value) ? value : '请选择已配置模型') : '暂无可用模型'}</span><CanvasIcon name="DownOutlined" />
      </button>
      {open ? (
        <div className="workflow-model-menu" style={menuStyle} role="listbox" aria-label={ariaLabel}>
          {!options.length && <div className="workflow-model-empty">请先在后台启用对应类型的模型</div>}
          {options.map((option) => (
            <button
              type="button"
              key={option.name}
              role="option"
              aria-selected={option.name === value}
              className={option.name === value ? 'selected' : ''}
              onClick={() => { onChange(option.name); setOpen(false); }}
            >
              <span className="workflow-model-mark">{icon}</span>
              <span className="workflow-model-copy">
                <strong>{option.name}{option.latency ? <small>{option.latency}</small> : null}</strong>
                <em>{option.description}</em>
              </span>
              {option.name === value ? <CanvasIcon name="CheckOutlined" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

interface ParameterGroup {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}

const ParameterSelector = ({ ariaLabel, summary, groups, language = false }: { ariaLabel: string; summary: string; groups: ParameterGroup[]; language?: boolean }) => {
  const { open, setOpen, ref, menuStyle } = useEditorPopover();

  return (
    <div ref={ref} className={`workflow-parameter-control${language ? ' is-language' : ''}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="workflow-parameter-trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
      >
        <CanvasIcon name={language ? 'TranslationOutlined' : 'AspectRatio'} />
        {!language ? <><span>{summary}</span><CanvasIcon name="DownOutlined" /></> : null}
      </button>
      {open ? (
        <div className="workflow-parameter-menu" style={menuStyle} role="dialog" aria-label={ariaLabel}>
          {groups.map((group) => (
            <section key={group.label}>
              <strong>{group.label}</strong>
              <div>
                {group.options.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={option.value === group.value ? 'selected' : ''}
                    aria-pressed={option.value === group.value}
                    onClick={() => group.onChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
          <button type="button" className="workflow-parameter-done" onClick={() => setOpen(false)}>完成</button>
        </div>
      ) : null}
    </div>
  );
};

const EditorExpandButton = ({ expanded, onClick }: { expanded: boolean; onClick: () => void }) => (
  <button
    type="button"
    className="workflow-editor-expand"
    aria-label={expanded ? '收起编辑器' : '展开编辑器'}
    title={expanded ? '收起' : '展开'}
    onClick={onClick}
  >
    {expanded ? <CanvasIcon name="ShrinkOutlined" /> : <CanvasIcon name="ExpandAltOutlined" />}
  </button>
);

const videoModels: ModelOption[] = [
  { name: '高质量图生视频模型', latency: '90s', description: '画面稳定、主体一致的图生视频' },
  { name: '通用品类视频模型', latency: '70s', description: '适合批量生成电商品类镜头' },
  { name: '产品运镜模型', latency: '85s', description: '突出商品细节与广告镜头运动' },
  { name: '高速视频模型', latency: '45s', description: '快速预览动作与镜头节奏' },
];

const imageModels: ModelOption[] = [
  { name: 'Lib Image', latency: '25s', description: '商品主体稳定，适合电商场景图' },
  { name: '高质感商品摄影', latency: '35s', description: '强化材质、光线与商业摄影质感' },
  { name: '人物场景一致性', latency: '45s', description: '适合模特、产品与场景联合生成' },
  { name: '快速预览模型', latency: '12s', description: '快速验证构图、比例与创意方向' },
];

const textModels = [
  { name: 'GVLM 3.1', latency: '20s', description: '多模态文本模型 Pro' },
  { name: 'CVLM 5.5', latency: '10s', description: '超智能大语言模型' },
  { name: 'GVLM 3.1 Flash', latency: '15s', description: '多模态文本模型 Lite' },
  { name: 'Qwen 3 VL Flash', latency: '10s', description: '视觉语言快速模型' },
];

const musicModels: ModelOption[] = [
  { name: '商业音乐生成模型', description: '适合广告节奏与品牌氛围' },
];

const voiceModels: ModelOption[] = [
  { name: '自然口播配音模型', description: '自然中文口播与旁白' },
  { name: '情绪广告配音模型', description: '强调节奏和卖点情绪' },
];

const TextModelSelector = ({ value, options, onChange }: { value: string; options: ModelOption[]; onChange: (value: string) => void }) => {
  const { open, setOpen, ref, menuStyle } = useEditorPopover();

  return (
    <div ref={ref} className={`workflow-text-model-control${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="workflow-text-model-trigger"
        aria-label="文本模型"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
      >
        <CanvasIcon name="OpenAIOutlined" />
        <span>{value}</span>
        <CanvasIcon name="DownOutlined" />
      </button>
      {open ? (
        <div className="workflow-text-model-menu" style={menuStyle} role="listbox" aria-label="文本模型">
          {options.map((model) => (
            <button
              type="button"
              key={model.name}
              role="option"
              aria-selected={model.name === value}
              className={model.name === value ? 'selected' : ''}
              onClick={() => { onChange(model.name); setOpen(false); }}
            >
              <span className="workflow-text-model-mark"><CanvasIcon name="OpenAIOutlined" /></span>
              <span className="workflow-text-model-copy">
                <strong>{model.name}<small>{model.latency}</small></strong>
                <em>{model.description}</em>
              </span>
              {model.name === value ? <CanvasIcon name="CheckOutlined" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const TextEditorBody = ({ data, isBusy, onChange, onRun, onStartCanvasSelection }: EditorBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const modelOptions = useProviderModelOptions(['llm'], textModels);

  return (
    <div className={`workflow-native-editor workflow-text-editor nodrag nowheel${expanded ? ' is-expanded' : ''}`}>
      <button
        type="button"
        className="workflow-text-expand"
        aria-label={expanded ? '收起文本编辑器' : '展开文本编辑器'}
        title={expanded ? '收起' : '展开'}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? <CanvasIcon name="ShrinkOutlined" /> : <CanvasIcon name="ExpandAltOutlined" />}
      </button>
      {referencesOpen || data.referenceLabels?.length || data.referenceMarks?.length || data.assetUrl ? <ReferenceStrip data={data} onChange={onChange} onStartCanvasSelection={onStartCanvasSelection} /> : null}
      <textarea
        aria-label="文本内容"
        value={data.prompt || ''}
        placeholder="写下你想讲的故事、场景或角色设定。例如：一个来自未来的机器人，在城市屋顶看星星。"
        onChange={(event) => onChange({ prompt: event.target.value })}
      />
      <footer className="workflow-native-toolbar">
        <TextModelSelector value={data.model || modelOptions[0]?.name || 'GVLM 3.1'} options={modelOptions} onChange={(model) => onChange({ model })} />
        <span className="workflow-toolbar-spacer" />
        <div className="workflow-text-toolbar-actions">
          <button type="button" className="workflow-toolbar-icon" title="参考和标记" aria-label="参考和标记" aria-pressed={referencesOpen} onClick={() => setReferencesOpen(value => !value)}><CanvasIcon name="PlusOutlined" /></button>
          <ParameterSelector language ariaLabel="文本输出语言" summary="语言" groups={[{ label: '输出语言', value: data.language || '中文', options: ['中文', 'English', '自动'].map(value => ({ value, label: value })), onChange: language => onChange({ language }) }]} />
          <span className="workflow-text-credit" title="预计消耗 6 点">
            <CanvasIcon name="ThunderboltOutlined" /> 6
          </span>
          <button
            type="button"
            className="workflow-text-run"
            title="生成文本"
            aria-label="生成文本"
            disabled={isBusy || !(data.prompt || '').trim()}
            onClick={onRun}
          >
            {isBusy ? <CanvasIcon name="LoadingOutlined" spin /> : <CanvasIcon name="ArrowUpOutlined" />}
          </button>
        </div>
      </footer>
    </div>
  );
};

const ImageEditorBody = ({ data, isBusy, onChange, onRun, onStartCanvasSelection }: EditorBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const modelOptions = useProviderModelOptions(['image', 'vision'], imageModels);
  const aspectRatio = data.aspectRatio || '16:9';
  const quality = data.quality || '高画质';
  const resolution = data.resolution || '4K';
  const batchSize = String(data.batchSize || 1);

  return (
    <div className={`workflow-native-editor workflow-image-editor nodrag nowheel${expanded ? ' is-expanded' : ''}`}>
      <EditorExpandButton expanded={expanded} onClick={() => setExpanded((value) => !value)} />
      <ReferenceStrip data={data} onChange={onChange} onStartCanvasSelection={onStartCanvasSelection} />
      <textarea
        aria-label="图片生成指令"
        value={data.prompt || ''}
        placeholder="描述产品、场景、构图、材质和光线，也可以引用画布中的商品或人物…"
        onChange={(event) => onChange({ prompt: event.target.value })}
      />
      <footer className="workflow-native-toolbar">
        <ModelSelector
          ariaLabel="图片模型"
          icon={<CanvasIcon name="FileImageOutlined" />}
          value={data.model || modelOptions[0]?.name || 'Lib Image'}
          options={modelOptions}
          onChange={(model) => onChange({ model })}
        />
        <i />
        <ParameterSelector
          ariaLabel="图片参数"
          summary={`${aspectRatio} · ${quality} · ${resolution} · ${batchSize}张`}
          groups={[
            { label: '画面比例', value: aspectRatio, options: ['1:1', '1:2', '2:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9', '9:21'].map((value) => ({ value, label: value })), onChange: (value) => onChange({ aspectRatio: value }) },
            { label: '画面质量', value: quality, options: ['低画质', '标准画质', '高画质'].map((value) => ({ value, label: value })), onChange: (value) => onChange({ quality: value }) },
            { label: '分辨率', value: resolution, options: ['1K', '2K', '4K'].map((value) => ({ value, label: value })), onChange: (value) => onChange({ resolution: value }) },
            { label: '生成数量', value: batchSize, options: ['1', '2', '4', '8'].map((value) => ({ value, label: `${value} 张` })), onChange: (value) => onChange({ batchSize: numberValue(value, 1) }) },
          ]}
        />
        <button type="button" className={`workflow-toolbar-icon${data.autoLink !== false ? ' has-indicator' : ''}`} title="自动引用上游节点" aria-label="自动引用上游节点" aria-pressed={data.autoLink !== false} onClick={() => onChange({ autoLink: data.autoLink === false })}><CanvasIcon name="AppstoreOutlined" /></button>
        <button type="button" className="workflow-toolbar-icon" title="选择画布参考" aria-label="选择画布参考" onClick={() => onStartCanvasSelection('reference')}><CanvasIcon name="CameraOutlined" /></button>
        <span className="workflow-toolbar-spacer" />
        <ParameterSelector language ariaLabel="图片提示词语言" summary="语言" groups={[{ label: '提示词语言', value: data.language || '中文', options: ['中文', 'English'].map(value => ({ value, label: value })), onChange: language => onChange({ language }) }]} />
        <NodeAdvancedSettings data={data} onChange={onChange} />
        <span className="workflow-editor-credit"><CanvasIcon name="ThunderboltOutlined" /> {Math.max(1, Number(batchSize)) * 30}</span>
        <button type="button" className="workflow-editor-run" aria-label="生成图片" disabled={isBusy || !(data.prompt || '').trim()} onClick={onRun}>
          {isBusy ? <CanvasIcon name="LoadingOutlined" spin /> : <CanvasIcon name="ArrowUpOutlined" />}
        </button>
      </footer>
    </div>
  );
};

const VideoEditorBody = ({ data, isBusy, onChange, onRun, onStartCanvasSelection }: EditorBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const modelOptions = useProviderModelOptions(['video'], videoModels);
  const aspectRatio = data.aspectRatio || '9:16';
  const duration = String(data.durationSeconds || 5);
  const batchSize = String(data.batchSize || 1);

  return (
    <div className={`workflow-native-editor workflow-video-editor nodrag nowheel${expanded ? ' is-expanded' : ''}`}>
      <EditorExpandButton expanded={expanded} onClick={() => setExpanded((value) => !value)} />
      <ReferenceStrip data={data} video onChange={onChange} onStartCanvasSelection={onStartCanvasSelection} />
      <textarea
        aria-label="视频生成指令"
        value={data.prompt || ''}
        placeholder="描述主体动作、镜头运动、节奏和光线…"
        onChange={(event) => onChange({ prompt: event.target.value })}
      />
      <footer className="workflow-native-toolbar">
        <ModelSelector
          ariaLabel="视频模型"
          icon={<CanvasIcon name="VideoCameraOutlined" />}
          value={data.model || modelOptions[0]?.name || '高质量图生视频模型'}
          options={modelOptions}
          onChange={(model) => onChange({ model })}
        />
        <i />
        <ParameterSelector
          ariaLabel="视频参数"
          summary={`${aspectRatio} · ${duration}秒 · ${batchSize}镜头`}
          groups={[
            { label: '画面比例', value: aspectRatio, options: ['9:16', '16:9', '1:1'].map((value) => ({ value, label: value })), onChange: (value) => onChange({ aspectRatio: value }) },
            { label: '单镜头时长', value: duration, options: ['3', '5', '8', '10'].map((value) => ({ value, label: `${value} 秒` })), onChange: (value) => onChange({ durationSeconds: numberValue(value, 5) }) },
            { label: '生成镜头', value: batchSize, options: ['1', '4', '16', '100'].map((value) => ({ value, label: `${value} 个` })), onChange: (value) => onChange({ batchSize: numberValue(value, 1) }) },
          ]}
        />
        <button type="button" className={`workflow-toolbar-icon${data.autoLink !== false ? ' has-indicator' : ''}`} title="自动引用上游节点" aria-label="自动引用上游节点" aria-pressed={data.autoLink !== false} onClick={() => onChange({ autoLink: data.autoLink === false })}><CanvasIcon name="AppstoreOutlined" /></button>
        <button type="button" className="workflow-toolbar-icon" title="选择画布参考" aria-label="选择画布参考" onClick={() => onStartCanvasSelection('reference')}><CanvasIcon name="CameraOutlined" /></button>
        <span className="workflow-toolbar-spacer" />
        <ParameterSelector language ariaLabel="视频提示词语言" summary="语言" groups={[{ label: '提示词语言', value: data.language || '中文', options: ['中文', 'English'].map(value => ({ value, label: value })), onChange: language => onChange({ language }) }]} />
        <NodeAdvancedSettings data={data} onChange={onChange} />
        <span className="workflow-editor-credit"><CanvasIcon name="ThunderboltOutlined" /> {Math.max(1, Number(batchSize)) * 30}</span>
        <button type="button" className="workflow-editor-run" aria-label="生成视频" disabled={isBusy || !(data.prompt || '').trim()} onClick={onRun}>
          {isBusy ? <CanvasIcon name="LoadingOutlined" spin /> : <CanvasIcon name="ArrowUpOutlined" />}
        </button>
      </footer>
    </div>
  );
};

const AudioEditorBody = ({ data, isBusy, onChange, onRun, onStartCanvasSelection }: EditorBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const modelOptions = useProviderModelOptions(
    data.kind === 'music' ? ['music'] : ['tts'],
    data.kind === 'music' ? musicModels : voiceModels,
  );
  const defaultModel = data.kind === 'music' ? '商业音乐生成模型' : '自然口播配音模型';

  return <div className={`workflow-native-editor workflow-audio-editor nodrag nowheel${expanded ? ' is-expanded' : ''}`}>
    <EditorExpandButton expanded={expanded} onClick={() => setExpanded(value => !value)} />
    <ReferenceStrip data={data} audio onChange={onChange} onStartCanvasSelection={onStartCanvasSelection} />
    <textarea
      aria-label="音频生成指令"
      value={data.prompt || ''}
      maxLength={2000}
      placeholder="描述你想要的音频效果，可引用上游脚本或音频…"
      onChange={(event) => onChange({ prompt: event.target.value })}
    />
    <footer className="workflow-native-toolbar">
      <ModelSelector ariaLabel="音频模型" icon={<CanvasIcon name="SoundOutlined" />} value={data.model || modelOptions[0]?.name || defaultModel} options={modelOptions} onChange={model => onChange({ model })} />
      <i />
      <ParameterSelector ariaLabel="音频参数" summary={`${data.language || '中文'} · ${data.audioSampleRate || '24k'} · ${data.audioFormat || 'wav'}`} groups={[
        { label: '语言', value: data.language || '中文', options: ['中文', 'English'].map(value => ({ value, label: value })), onChange: language => onChange({ language }) },
        { label: '采样率', value: data.audioSampleRate || '24k', options: ['24k', '44.1k', '48k'].map(value => ({ value, label: value })), onChange: audioSampleRate => onChange({ audioSampleRate }) },
        { label: '输出格式', value: data.audioFormat || 'wav', options: ['wav', 'mp3'].map(value => ({ value, label: value })), onChange: audioFormat => onChange({ audioFormat }) },
      ]} />
      <span className="workflow-toolbar-spacer" />
      <NodeAdvancedSettings data={data} onChange={onChange} />
      <span className="workflow-character-count">{(data.prompt || '').length}/2000</span>
      <span className="workflow-editor-credit" title="演示估算"><CanvasIcon name="ThunderboltOutlined" />1</span>
      <button type="button" className="workflow-editor-run" aria-label="生成音频" disabled={isBusy || !(data.prompt || '').trim()} onClick={onRun}>{isBusy ? <CanvasIcon name="LoadingOutlined" spin /> : <CanvasIcon name="ArrowUpOutlined" />}</button>
    </footer>
  </div>;
};

const CompactNodePreview = ({ data }: { data: WorkflowNodeData }) => {
  const previewUrl = data.outputUrl || data.assetUrl;

  if (data.assetUrl && visualResourceKinds.has(data.kind)) {
    return (
      <div className="workflow-compact-media is-resource-image">
        <img src={data.assetUrl} alt={data.title} />
      </div>
    );
  }

  if (mediaKinds.has(data.kind)) {
    const isVideo = data.kind === 'video' || data.kind === 'batchMaterial';
    return (
      <div className={`workflow-compact-media${isVideo ? ' is-video' : ''}`}>
        {previewUrl ? (
          isVideo ? <video className="nodrag nowheel" aria-label={`${data.title}预览`} src={previewUrl} poster={data.assetUrl} controls playsInline preload="metadata" /> : <img src={previewUrl} alt={data.title} />
        ) : (
          <span>{isVideo ? <CanvasIcon name="VideoCameraOutlined" /> : <CanvasIcon name="FileImageOutlined" />}</span>
        )}
      </div>
    );
  }

  if (data.kind === 'text') {
    return (
      <div className={`workflow-compact-text is-output${data.outputText ? ' has-output' : ' is-empty'}`}>
        {data.outputText ? (
          <p>{data.outputText}</p>
        ) : (
          <span className="workflow-text-output-empty">
            <CanvasIcon name="FileTextOutlined" />
            <small>生成结果将在这里显示</small>
          </span>
        )}
      </div>
    );
  }

  if (data.kind === 'scriptGenerator' || data.kind === 'prompt' || data.kind === 'storyboard' || data.kind === 'note') {
    return (
      <div className={`workflow-compact-text${data.kind === 'storyboard' ? ' is-resource' : ''}`}>
        <p>{data.prompt || (data.kind === 'storyboard' ? '暂无脚本内容' : '点击节点输入内容')}</p>
      </div>
    );
  }

  if (data.kind === 'music' || data.kind === 'voice') {
    return (
      <div className="workflow-compact-audio">
        {data.kind === 'music' ? <CanvasIcon name="SoundOutlined" /> : <CanvasIcon name="AudioOutlined" />}
        {previewUrl ? <audio className="nodrag nowheel" aria-label={`${data.title}试听`} src={previewUrl} controls preload="metadata" /> : <small>生成音频后可在这里试听</small>}
      </div>
    );
  }

  return (
    <div className={`workflow-node-overview${resourceKinds.has(data.kind) ? ' is-resource' : ''}`}>
      <span className={`workflow-node-hero kind-${data.kind}`}>{nodeIcons[data.kind]}</span>
      <div>
        <strong>{nodeMetric(data)}</strong>
        <small>{data.model || data.skillCode || data.description}</small>
      </div>
    </div>
  );
};

const SelectionEditor = (props: EditorBodyProps) => {
  const { kind } = props.data;
  if (kind === 'text') return <TextEditorBody {...props} />;
  if (kind === 'image') return <ImageEditorBody {...props} />;
  if (kind === 'video') return <VideoEditorBody {...props} />;
  if (kind === 'music' || kind === 'voice') return <AudioEditorBody {...props} />;
  return null;
};

interface WorkflowNodeSelectionEditorProps {
  id: string;
  data: WorkflowNodeData;
  onStartCanvasSelection: EditorBodyProps['onStartCanvasSelection'];
}

export const WorkflowNodeSelectionEditor = memo(({ id, data, onStartCanvasSelection }: WorkflowNodeSelectionEditorProps) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const requestRun = useWorkflowStore((state) => state.requestRun);
  const isBusy = data.status === 'queued' || data.status === 'running';

  return (
    <div className="workflow-selection-editor">
      <SelectionEditor
        data={data}
        isBusy={isBusy}
        onChange={(patch) => updateNodeData(id, patch)}
        onRun={() => requestRun(id)}
        onStartCanvasSelection={onStartCanvasSelection}
      />
    </div>
  );
});

WorkflowNodeSelectionEditor.displayName = 'WorkflowNodeSelectionEditor';

const WorkflowNodeCard = memo(({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const openDirector = useWorkflowStore((state) => state.openDirector);
  const openCreativeLibrary = useWorkflowStore((state) => state.openCreativeLibrary);
  const isBusy = data.status === 'queued' || data.status === 'running';
  const progress = data.status === 'success' ? 100 : data.progress || 0;
  const canOpenEditor = isWorkflowEditorKind(data.kind);
  const role = nodeRole(data.kind);
  const isCharacterImage = data.kind === 'character' && Boolean(data.resourceViewLabel);

  return (
    <article aria-label={data.title} className={`workflow-node workflow-node-${data.kind} workflow-${role.key}-node${resourceKinds.has(data.kind) ? ' workflow-resource-node' : ''}${isCharacterImage ? ' workflow-character-image-node' : ''}${selected ? ' selected' : ''}${data.canvasPickState ? ` canvas-pick-${data.canvasPickState}` : ''}`}>
      <div className="workflow-node-card-shell">
        <Handle id="left" className="workflow-handle workflow-handle-target" type="target" position={Position.Left} isConnectableStart isConnectableEnd><CanvasIcon name="PlusOutlined" /></Handle>
        <header className="workflow-node-label">
          {data.stage ? <span className={`workflow-stage-tag stage-${data.stage.toLowerCase()}`}>{data.stage}</span> : null}
          <span className="workflow-node-icon" aria-hidden="true">{nodeIcons[data.kind]}</span>
          <strong>{data.title}</strong>
          <span className={`workflow-node-role is-${role.key}`}>{role.label}</span>
          {canOpenEditor ? <span className="workflow-node-edit-hint">点击编辑</span> : null}
          {isCharacterImage ? <button type="button" className="workflow-character-image-remove nodrag nopan" aria-label={`从画布移除：${data.title}`} title="仅移除此图，角色库原素材保留；可撤销" disabled={Boolean(data.canvasPickState)} onClick={event => {
            event.stopPropagation();
            useWorkflowStore.getState().onNodesChange([{ type: 'remove', id }]);
          }}><CanvasIcon name="CloseOutlined" aria-hidden /></button> : null}
          {data.status !== 'idle' ? (
            <span className={`workflow-node-status ${data.status}`} title={statusCopy[data.status]}>
              {statusIcon(data.status)}{statusCopy[data.status]}
            </span>
          ) : null}
        </header>
        <div className="workflow-node-body">
          {data.kind === 'director' ? (
            <div className="workflow-director-preview">
              {data.outputUrl || data.assetUrl ? (
                <img src={data.outputUrl || data.assetUrl} alt={`${data.title}机位截图`} />
              ) : (
                <div className="workflow-director-placeholder" aria-hidden="true">
                  <span className="workflow-director-frame"><CanvasIcon name="VideoCameraOutlined" /></span>
                  <strong>让创意先有一个机位</strong>
                  <small>布置场景 · 摆放角色 · 预演镜头</small>
                </div>
              )}
              <button
                type="button"
                className="workflow-director-open nodrag nopan"
                aria-label={`打开导演台：${data.title}`}
                aria-disabled={Boolean(data.canvasPickState)}
                onClick={(event) => {
                  if (data.canvasPickState) return;
                  event.stopPropagation();
                  openDirector(id);
                }}
              >
                <CanvasIcon name="VideoCameraOutlined" />{data.directorScene ? '进入导演台' : '开始布景'}<CanvasIcon name="ExpandAltOutlined" />
              </button>
            </div>
          ) : isCreativeResourceType(data.kind) ? (
            <div className="workflow-creative-resource-preview">
              {data.resourceCoverUrl || data.assetUrl ? <img src={data.resourceCoverUrl || data.assetUrl} alt={data.title} draggable={false} /> : <span>{nodeIcons[data.kind]}</span>}
              <button type="button" className="workflow-creative-resource-open nodrag nopan" disabled={Boolean(data.canvasPickState)} onClick={event => {
                event.stopPropagation();
                if (isCreativeResourceType(data.kind)) openCreativeLibrary(data.kind, { nodeId: id });
              }}><CanvasIcon name="AppstoreOutlined" />{isCharacterImage ? '更换此图' : data.creativeResourceId ? `更换${creativeResourceLabels[data.kind]}` : `打开${creativeResourceLabels[data.kind]}库`}</button>
            </div>
          ) : <CompactNodePreview data={data} />}
          {data.canvasPickState === 'selected' ? (
            <span className="workflow-node-pick-overlay"><CanvasIcon name="CheckOutlined" />取消选择</span>
          ) : data.canvasPickState === 'eligible' ? (
            <span className="workflow-node-pick-hint">{data.canvasPickMode === 'mark' ? '点击选择图片' : '点击添加参考'}</span>
          ) : null}
          {data.executionMode === 'batch' ? <span className="workflow-compact-badge">BATCH</span> : null}
          {isBusy || data.status === 'success' ? (
            <div className="workflow-node-progress" aria-label={`执行进度 ${progress}%`}>
              <i style={{ width: `${progress}%` }} /><span>{progress}%</span>
            </div>
          ) : null}
        </div>
        <Handle id="right" className="workflow-handle workflow-handle-source" type="source" position={Position.Right} isConnectableStart isConnectableEnd><CanvasIcon name="PlusOutlined" /></Handle>
      </div>
    </article>
  );
});

WorkflowNodeCard.displayName = 'WorkflowNodeCard';

export default WorkflowNodeCard;
