import { memo, useRef, useState, type ReactNode } from 'react';
import {
  AppstoreOutlined,
  ArrowUpOutlined,
  AudioOutlined,
  CameraOutlined,
  CheckOutlined,
  CheckCircleFilled,
  CloudDownloadOutlined,
  DownOutlined,
  ExpandAltOutlined,
  ExclamationCircleFilled,
  FileImageOutlined,
  FileTextOutlined,
  HighlightOutlined,
  LoadingOutlined,
  OpenAIOutlined,
  PlusOutlined,
  PlayCircleFilled,
  PlaySquareOutlined,
  ProductOutlined,
  PushpinOutlined,
  ScissorOutlined,
  SettingOutlined,
  SoundOutlined,
  ShrinkOutlined,
  TagsOutlined,
  ThunderboltOutlined,
  TranslationOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useWorkflowStore } from '../../../stores/workflowStore';
import type { WorkflowNode, WorkflowNodeData, WorkflowNodeKind, WorkflowNodeStatus } from '../../../types/workflow';

const nodeIcons: Record<WorkflowNodeKind, React.ReactNode> = {
  storyboard: <FileTextOutlined />,
  scriptGenerator: <FileTextOutlined />,
  text: <FileTextOutlined />,
  character: <UserOutlined />,
  scene: <AppstoreOutlined />,
  product: <ProductOutlined />,
  categorySkill: <ThunderboltOutlined />,
  prompt: <HighlightOutlined />,
  image: <FileImageOutlined />,
  batchMaterial: <PlaySquareOutlined />,
  result: <CheckCircleFilled />,
  video: <VideoCameraOutlined />,
  music: <SoundOutlined />,
  voice: <AudioOutlined />,
  editor: <ScissorOutlined />,
  export: <CloudDownloadOutlined />,
  note: <PushpinOutlined />,
};

const statusCopy: Record<WorkflowNodeStatus, string> = {
  idle: '待执行',
  queued: '队列中',
  running: '执行中',
  success: '已完成',
  failed: '失败',
};

const resourceKinds = new Set<WorkflowNodeKind>([
  'storyboard', 'character', 'scene', 'product', 'result', 'note',
]);

const editorKinds = new Set<WorkflowNodeKind>([
  'text',
  'scriptGenerator',
  'image',
  'video',
  'batchMaterial',
  'music',
  'voice',
  'prompt',
  'categorySkill',
  'editor',
  'export',
]);

export const isWorkflowEditorKind = (kind: WorkflowNodeKind) => editorKinds.has(kind);

const mediaKinds = new Set<WorkflowNodeKind>(['image', 'video', 'batchMaterial', 'result']);

const numberValue = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const statusIcon = (status: WorkflowNodeStatus) => {
  if (status === 'queued' || status === 'running') return <LoadingOutlined spin />;
  if (status === 'success') return <CheckCircleFilled />;
  if (status === 'failed') return <ExclamationCircleFilled />;
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
}

const RunButton = ({ isBusy, batch, onRun }: { isBusy: boolean; batch?: boolean; onRun: () => void }) => (
  <button type="button" className="workflow-native-run nodrag" disabled={isBusy} onClick={onRun}>
    {isBusy ? <LoadingOutlined spin /> : <PlayCircleFilled />}
    {isBusy ? '处理中' : batch ? '批量生成' : '生成'}
  </button>
);

const ReferenceStrip = ({ data, video = false, onChange }: { data: WorkflowNodeData; video?: boolean; onChange: (patch: Partial<WorkflowNodeData>) => void }) => {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [marked, setMarked] = useState(false);

  const selectReference = () => uploadRef.current?.click();

  return (
    <div className={`workflow-reference-strip${data.assetUrl ? ' has-asset' : ''}`}>
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        aria-label="上传参考素材"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onChange({ assetUrl: URL.createObjectURL(file) });
          event.target.value = '';
        }}
      />
      <div className="workflow-reference-actions">
        <button type="button" onClick={selectReference}><PlusOutlined />{video ? '首帧参考' : '参考'}</button>
        {video ? <button type="button" onClick={selectReference}><PlusOutlined />尾帧参考</button> : null}
        <button type="button" className={marked ? 'selected' : ''} aria-pressed={marked} onClick={() => setMarked((value) => !value)}>
          <TagsOutlined />{video ? '动作参考' : '标记'}
        </button>
      </div>
      {data.assetUrl ? (
        <div className="workflow-reference-assets">
          <button type="button" className="workflow-reference-preview" onClick={selectReference} title="替换参考素材">
            <img src={data.assetUrl} alt="参考素材" />
            <span><ProductOutlined /></span>
            <em>{video ? '首帧' : '风格'}</em>
          </button>
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

interface ModelSelectorProps {
  ariaLabel: string;
  icon: ReactNode;
  value: string;
  options: ModelOption[];
  onChange: (value: string) => void;
}

const ModelSelector = ({ ariaLabel, icon, value, options, onChange }: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`workflow-model-control${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="workflow-model-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
      >
        {icon}<span>{value}</span><DownOutlined />
      </button>
      {open ? (
        <div className="workflow-model-menu" role="listbox" aria-label={ariaLabel}>
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
              {option.name === value ? <CheckOutlined /> : null}
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

const ParameterSelector = ({ ariaLabel, summary, groups }: { ariaLabel: string; summary: string; groups: ParameterGroup[] }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`workflow-parameter-control${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="workflow-parameter-trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
      >
        <ExpandAltOutlined />
        <span>{summary}</span>
        <DownOutlined />
      </button>
      {open ? (
        <div className="workflow-parameter-menu" role="dialog" aria-label={ariaLabel}>
          {groups.map((group) => (
            <section key={group.label}>
              <strong>{group.label}</strong>
              <div>
                {group.options.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={option.value === group.value ? 'selected' : ''}
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
    {expanded ? <ShrinkOutlined /> : <ExpandAltOutlined />}
  </button>
);

const imageModels: ModelOption[] = [
  { name: 'Lib Image', latency: '20s', description: '高质量通用图片生成与编辑' },
  { name: '高一致性商业生图模型', latency: '25s', description: '保持产品、人物和包装细节一致' },
  { name: '商品 3D 渲染模型', latency: '35s', description: '棚拍级商品渲染与材质表现' },
  { name: '高质感广告模型', latency: '30s', description: '商业广告视觉与高级光影' },
];

const videoModels: ModelOption[] = [
  { name: '高质量图生视频模型', latency: '90s', description: '画面稳定、主体一致的图生视频' },
  { name: '通用品类视频模型', latency: '70s', description: '适合批量生成电商品类镜头' },
  { name: '产品运镜模型', latency: '85s', description: '突出商品细节与广告镜头运动' },
  { name: '高速视频模型', latency: '45s', description: '快速预览动作与镜头节奏' },
];

const scriptModels: ModelOption[] = [
  { name: '商业短视频脚本模型', latency: '20s', description: '卖点、节奏与转化结构兼顾' },
  { name: '电商卖点脚本模型', latency: '15s', description: '强化前三秒钩子与购买理由' },
  { name: '品牌故事脚本模型', latency: '25s', description: '适合品牌叙事与情绪表达' },
];

const textModels = [
  { name: 'GVLM 3.1', latency: '20s', description: '多模态文本模型 Pro' },
  { name: 'CVLM 5.5', latency: '10s', description: '超智能大语言模型' },
  { name: 'GVLM 3.1 Flash', latency: '15s', description: '多模态文本模型 Lite' },
  { name: 'Qwen 3 VL Flash', latency: '10s', description: '视觉语言快速模型' },
];

const TextModelSelector = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`workflow-text-model-control${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="workflow-text-model-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
      >
        <OpenAIOutlined />
        <span>{value}</span>
        <DownOutlined />
      </button>
      {open ? (
        <div className="workflow-text-model-menu" role="listbox" aria-label="文本模型">
          {textModels.map((model) => (
            <button
              type="button"
              key={model.name}
              role="option"
              aria-selected={model.name === value}
              className={model.name === value ? 'selected' : ''}
              onClick={() => { onChange(model.name); setOpen(false); }}
            >
              <span className="workflow-text-model-mark"><OpenAIOutlined /></span>
              <span className="workflow-text-model-copy">
                <strong>{model.name}<small>{model.latency}</small></strong>
                <em>{model.description}</em>
              </span>
              {model.name === value ? <CheckOutlined /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const TextEditorBody = ({ data, isBusy, onChange, onRun }: EditorBodyProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`workflow-native-editor workflow-text-editor nodrag nowheel${expanded ? ' is-expanded' : ''}`}>
      <button
        type="button"
        className="workflow-text-expand"
        aria-label={expanded ? '收起文本编辑器' : '展开文本编辑器'}
        title={expanded ? '收起' : '展开'}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? <ShrinkOutlined /> : <ExpandAltOutlined />}
      </button>
      <ReferenceStrip data={data} onChange={onChange} />
      <textarea
        aria-label="文本内容"
        value={data.prompt || ''}
        placeholder="写下你想讲的故事、场景或角色设定。例如：一个来自未来的机器人，在城市屋顶看星星。"
        onChange={(event) => onChange({ prompt: event.target.value })}
      />
      <footer className="workflow-native-toolbar">
        <TextModelSelector value={data.model || 'GVLM 3.1'} onChange={(model) => onChange({ model })} />
        <span className="workflow-toolbar-spacer" />
        <button type="button" className="workflow-toolbar-icon" title="翻译与语言处理" aria-label="翻译与语言处理">
          <TranslationOutlined />
        </button>
        <span className="workflow-text-credit" title="预计消耗 6 点">
          <ThunderboltOutlined /> 6
        </span>
        <button
          type="button"
          className="workflow-text-run"
          title="生成文本"
          aria-label="生成文本"
          disabled={isBusy || !(data.prompt || '').trim()}
          onClick={onRun}
        >
          {isBusy ? <LoadingOutlined spin /> : <ArrowUpOutlined />}
        </button>
      </footer>
    </div>
  );
};

const ScriptEditorBody = ({ data, isBusy, onChange, onRun }: EditorBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const duration = String(data.durationSeconds || 30);

  return (
    <div className={`workflow-native-editor workflow-script-editor nodrag nowheel${expanded ? ' is-expanded' : ''}`}>
      <EditorExpandButton expanded={expanded} onClick={() => setExpanded((value) => !value)} />
      <div className="workflow-editor-suggestion">
        <span>尝试：</span>
        <button type="button" onClick={() => onChange({ prompt: '围绕产品核心卖点，生成一条节奏紧凑、前三秒抓人的短视频脚本。' })}>产品卖点脚本</button>
        <button type="button" onClick={() => onChange({ prompt: '生成自然可信的真人口播脚本，包含痛点、体验、卖点和行动指令。' })}>口播脚本</button>
        <button type="button" onClick={() => onChange({ prompt: '将上游产品、场景与人物素材拆解为可执行的分镜脚本。' })}>分镜脚本</button>
      </div>
      <textarea
        aria-label="脚本生成要求"
        value={data.prompt || ''}
        placeholder="描述脚本主题、受众、产品卖点与表达风格…"
        onChange={(event) => onChange({ prompt: event.target.value })}
      />
      <footer className="workflow-native-toolbar">
        <ModelSelector
          ariaLabel="脚本模型"
          icon={<FileTextOutlined />}
          value={data.model || '商业短视频脚本模型'}
          options={scriptModels}
          onChange={(model) => onChange({ model })}
        />
        <i />
        <ParameterSelector
          ariaLabel="脚本参数"
          summary={`${duration}秒 · 营销脚本`}
          groups={[
            {
              label: '脚本时长', value: duration,
              options: ['15', '30', '60', '90'].map((value) => ({ value, label: `${value} 秒` })),
              onChange: (value) => onChange({ durationSeconds: numberValue(value, 30) }),
            },
          ]}
        />
        <span className="workflow-toolbar-spacer" />
        <button type="button" className="workflow-toolbar-icon" title="翻译与语言处理" aria-label="翻译与语言处理"><TranslationOutlined /></button>
        <span className="workflow-editor-credit"><ThunderboltOutlined /> 12</span>
        <button type="button" className="workflow-editor-run" aria-label="生成脚本" disabled={isBusy || !(data.prompt || '').trim()} onClick={onRun}>
          {isBusy ? <LoadingOutlined spin /> : <ArrowUpOutlined />}
        </button>
      </footer>
    </div>
  );
};

const ImageEditorBody = ({ data, isBusy, onChange, onRun }: EditorBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const aspectRatio = data.aspectRatio || '16:9';
  const quality = data.quality || '高画质';
  const resolution = data.resolution || '4K';
  const batchSize = String(data.batchSize || 1);

  return (
    <div className={`workflow-native-editor workflow-image-editor nodrag nowheel${expanded ? ' is-expanded' : ''}`}>
      <EditorExpandButton expanded={expanded} onClick={() => setExpanded((value) => !value)} />
      <ReferenceStrip data={data} onChange={onChange} />
      <textarea
        aria-label="图片生成指令"
        value={data.prompt || ''}
        placeholder="可直接文字生图，或上传图片输入文字指令进行编辑，例如：将背景改为雪夜"
        onChange={(event) => onChange({ prompt: event.target.value })}
      />
      <footer className="workflow-native-toolbar">
        <ModelSelector
          ariaLabel="图片模型"
          icon={<FileImageOutlined />}
          value={data.model || 'Lib Image'}
          options={imageModels}
          onChange={(model) => onChange({ model })}
        />
        <i />
        <ParameterSelector
          ariaLabel="图片参数"
          summary={`${aspectRatio} · ${quality} · ${resolution} · ${batchSize}张`}
          groups={[
            { label: '画面比例', value: aspectRatio, options: ['16:9', '9:16', '1:1', '4:3'].map((value) => ({ value, label: value })), onChange: (value) => onChange({ aspectRatio: value }) },
            { label: '图片质量', value: quality, options: ['标准', '高画质', '超清细节'].map((value) => ({ value, label: value })), onChange: (value) => onChange({ quality: value }) },
            { label: '分辨率', value: resolution, options: ['1K', '2K', '4K'].map((value) => ({ value, label: value })), onChange: (value) => onChange({ resolution: value }) },
            { label: '生成张数', value: batchSize, options: ['1', '4', '8', '12'].map((value) => ({ value, label: `${value} 张` })), onChange: (value) => onChange({ batchSize: numberValue(value, 1) }) },
          ]}
        />
        <button type="button" className="workflow-toolbar-icon has-indicator" title="智能引用" aria-label="智能引用"><AppstoreOutlined /></button>
        <button type="button" className="workflow-toolbar-icon" title="参考预览" aria-label="参考预览"><CameraOutlined /></button>
        <span className="workflow-toolbar-spacer" />
        <button type="button" className="workflow-toolbar-icon" title="翻译与语言处理" aria-label="翻译与语言处理"><TranslationOutlined /></button>
        <button type="button" className="workflow-toolbar-icon" title="高级设置" aria-label="高级设置"><SettingOutlined /></button>
        <span className="workflow-editor-credit"><ThunderboltOutlined /> 120</span>
        <button type="button" className="workflow-editor-run" aria-label="生成图片" disabled={isBusy || !(data.prompt || '').trim()} onClick={onRun}>
          {isBusy ? <LoadingOutlined spin /> : <ArrowUpOutlined />}
        </button>
      </footer>
    </div>
  );
};

const VideoEditorBody = ({ data, isBusy, onChange, onRun }: EditorBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const aspectRatio = data.aspectRatio || '9:16';
  const duration = String(data.durationSeconds || 5);
  const batchSize = String(data.batchSize || 1);

  return (
    <div className={`workflow-native-editor workflow-video-editor nodrag nowheel${expanded ? ' is-expanded' : ''}`}>
      <EditorExpandButton expanded={expanded} onClick={() => setExpanded((value) => !value)} />
      <ReferenceStrip data={data} video onChange={onChange} />
      <textarea
        aria-label="视频生成指令"
        value={data.prompt || ''}
        placeholder="描述主体动作、镜头运动、节奏和光线…"
        onChange={(event) => onChange({ prompt: event.target.value })}
      />
      <footer className="workflow-native-toolbar">
        <ModelSelector
          ariaLabel="视频模型"
          icon={<VideoCameraOutlined />}
          value={data.model || '高质量图生视频模型'}
          options={videoModels}
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
        <button type="button" className="workflow-toolbar-icon has-indicator" title="智能引用" aria-label="智能引用"><AppstoreOutlined /></button>
        <button type="button" className="workflow-toolbar-icon" title="参考预览" aria-label="参考预览"><CameraOutlined /></button>
        <span className="workflow-toolbar-spacer" />
        <button type="button" className="workflow-toolbar-icon" title="翻译与语言处理" aria-label="翻译与语言处理"><TranslationOutlined /></button>
        <button type="button" className="workflow-toolbar-icon" title="高级设置" aria-label="高级设置"><SettingOutlined /></button>
        <span className="workflow-editor-credit"><ThunderboltOutlined /> {Math.max(1, Number(batchSize)) * 30}</span>
        <button type="button" className="workflow-editor-run" aria-label="生成视频" disabled={isBusy || !(data.prompt || '').trim()} onClick={onRun}>
          {isBusy ? <LoadingOutlined spin /> : <ArrowUpOutlined />}
        </button>
      </footer>
    </div>
  );
};

const AudioEditorBody = ({ data, isBusy, onChange, onRun }: EditorBodyProps) => (
  <div className="workflow-native-editor workflow-audio-editor nodrag nowheel">
    <div className="workflow-editor-suggestion">
      <span>尝试：</span><button type="button">广告口播</button><button type="button">节奏音乐</button>
    </div>
    <ReferenceStrip data={data} onChange={onChange} />
    <textarea
      aria-label="音频生成指令"
      value={data.prompt || ''}
      placeholder="描述你想要的音频效果，可引用上游脚本或音频…"
      onChange={(event) => onChange({ prompt: event.target.value })}
    />
    <footer className="workflow-native-toolbar">
      <select className="workflow-model-select" value={data.model || '自然口播配音模型'} onChange={(event) => onChange({ model: event.target.value })}>
        <option>自然口播配音模型</option><option>商业音乐生成模型</option><option>情绪广告配音模型</option>
      </select>
      <i />
      <select value={data.voice || '年轻女声·清透'} onChange={(event) => onChange({ voice: event.target.value })}>
        <option>年轻女声·清透</option><option>专业女声·高级</option><option>年轻男声·活力</option>
      </select>
      <span className="workflow-toolbar-spacer" />
      <button type="button" className="workflow-toolbar-icon" title="高级设置"><SettingOutlined /></button>
      <RunButton isBusy={isBusy} onRun={onRun} />
    </footer>
  </div>
);

const OperatorEditorBody = ({ data, isBusy, onChange, onRun }: EditorBodyProps) => (
  <div className="workflow-native-editor workflow-operator-editor nodrag nowheel">
    {data.kind !== 'export' ? (
      <textarea
        aria-label="执行说明"
        value={data.prompt || ''}
        placeholder="输入这个节点的执行要求…"
        onChange={(event) => onChange({ prompt: event.target.value })}
      />
    ) : null}
    <footer className="workflow-native-toolbar">
      {data.kind === 'categorySkill' ? (
        <>
          <select value={data.category || '美妆个护'} onChange={(event) => onChange({ category: event.target.value })}>
            <option>美妆个护</option><option>食品饮料</option><option>服装配饰</option><option>3C 数码</option><option>家居家电</option>
          </select>
          <select value={data.renderMode || 'AI 场景合成'} onChange={(event) => onChange({ renderMode: event.target.value })}>
            <option>AI 场景合成</option><option>3D 渲染插件</option><option>实拍素材匹配</option><option>混合生成</option>
          </select>
        </>
      ) : null}
      {data.kind === 'prompt' ? (
        <select className="workflow-model-select" value={data.model || '商业分镜提示词模型'} onChange={(event) => onChange({ model: event.target.value })}>
          <option>商业分镜提示词模型</option><option>电商卖点导演模型</option><option>短视频节奏模型</option>
        </select>
      ) : null}
      {data.kind === 'editor' ? (
        <select className="workflow-model-select" value={data.model || 'AI 智能剪辑引擎'} onChange={(event) => onChange({ model: event.target.value })}>
          <option>AI 智能剪辑引擎</option><option>强节奏带货剪辑</option><option>高级品牌广告剪辑</option>
        </select>
      ) : null}
      {data.kind === 'editor' || data.kind === 'export' ? (
        <>
          <label className="workflow-count-control"><span>成片</span><input type="number" min={1} max={50} value={data.outputCount || 15} onChange={(event) => onChange({ outputCount: numberValue(event.target.value, 15) })} /></label>
          <select value={data.resolution || '1080P'} onChange={(event) => onChange({ resolution: event.target.value })}><option>1080P</option><option>2K</option><option>4K</option></select>
        </>
      ) : null}
      <span className="workflow-toolbar-spacer" />
      <button type="button" className="workflow-toolbar-icon" title="高级设置"><SettingOutlined /></button>
      <RunButton isBusy={isBusy} batch={data.executionMode === 'batch'} onRun={onRun} />
    </footer>
  </div>
);

const CompactNodePreview = ({ data }: { data: WorkflowNodeData }) => {
  const previewUrl = data.outputUrl || data.assetUrl;

  if (mediaKinds.has(data.kind)) {
    const isVideo = data.kind === 'video' || data.kind === 'batchMaterial';
    return (
      <div className={`workflow-compact-media${isVideo ? ' is-video' : ''}`}>
        {previewUrl ? (
          isVideo ? <video src={previewUrl} muted /> : <img src={previewUrl} alt={data.title} />
        ) : (
          <span>{isVideo ? <VideoCameraOutlined /> : <FileImageOutlined />}</span>
        )}
      </div>
    );
  }

  if (data.kind === 'text' || data.kind === 'scriptGenerator' || data.kind === 'prompt' || data.kind === 'storyboard' || data.kind === 'note') {
    return (
      <div className={`workflow-compact-text${data.kind === 'storyboard' ? ' is-resource' : ''}`}>
        <p>{data.prompt || (data.kind === 'storyboard' ? '暂无脚本内容' : '点击节点输入内容')}</p>
      </div>
    );
  }

  if (data.kind === 'music' || data.kind === 'voice') {
    return (
      <div className="workflow-compact-audio">
        {data.kind === 'music' ? <SoundOutlined /> : <AudioOutlined />}
        <span>{nodeMetric(data)}</span>
        <small>{data.model || '点击配置音频'}</small>
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
  if (kind === 'scriptGenerator') return <ScriptEditorBody {...props} />;
  if (kind === 'image') return <ImageEditorBody {...props} />;
  if (kind === 'video' || kind === 'batchMaterial') return <VideoEditorBody {...props} />;
  if (kind === 'music' || kind === 'voice') return <AudioEditorBody {...props} />;
  return <OperatorEditorBody {...props} />;
};

interface WorkflowNodeSelectionEditorProps {
  id: string;
  data: WorkflowNodeData;
}

export const WorkflowNodeSelectionEditor = memo(({ id, data }: WorkflowNodeSelectionEditorProps) => {
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
      />
    </div>
  );
});

WorkflowNodeSelectionEditor.displayName = 'WorkflowNodeSelectionEditor';

const WorkflowNodeCard = memo(({ data, selected }: NodeProps<WorkflowNode>) => {
  const isBusy = data.status === 'queued' || data.status === 'running';
  const progress = data.status === 'success' ? 100 : data.progress || 0;
  const canOpenEditor = isWorkflowEditorKind(data.kind);

  return (
    <article className={`workflow-node workflow-node-${data.kind}${resourceKinds.has(data.kind) ? ' workflow-resource-node' : ''}${selected ? ' selected' : ''}`}>
      <div className="workflow-node-card-shell">
        <Handle id="left" className="workflow-handle workflow-handle-target" type="target" position={Position.Left} isConnectableStart isConnectableEnd />
        <header className="workflow-node-label">
          {data.stage ? <span className={`workflow-stage-tag stage-${data.stage.toLowerCase()}`}>{data.stage}</span> : null}
          <span className="workflow-node-icon" aria-hidden="true">{nodeIcons[data.kind]}</span>
          <strong>{data.title}</strong>
          {canOpenEditor ? <span className="workflow-node-editable-dot" title="点击配置" /> : null}
          {data.status !== 'idle' ? (
            <span className={`workflow-node-status ${data.status}`} title={statusCopy[data.status]}>
              {statusIcon(data.status)}{statusCopy[data.status]}
            </span>
          ) : null}
        </header>
        <div className="workflow-node-body">
          <CompactNodePreview data={data} />
          {data.executionMode === 'batch' ? <span className="workflow-compact-badge">BATCH</span> : null}
          {isBusy || data.status === 'success' ? (
            <div className="workflow-node-progress" aria-label={`执行进度 ${progress}%`}>
              <i style={{ width: `${progress}%` }} /><span>{progress}%</span>
            </div>
          ) : null}
        </div>
        <Handle id="right" className="workflow-handle workflow-handle-source" type="source" position={Position.Right} isConnectableStart isConnectableEnd />
      </div>
    </article>
  );
});

WorkflowNodeCard.displayName = 'WorkflowNodeCard';

export default WorkflowNodeCard;
