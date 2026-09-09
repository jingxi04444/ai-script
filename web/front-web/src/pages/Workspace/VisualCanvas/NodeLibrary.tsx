import {
  AppstoreOutlined,
  AudioOutlined,
  BgColorsOutlined,
  ExportOutlined,
  FileImageOutlined,
  FileTextOutlined,
  HighlightOutlined,
  PlaySquareOutlined,
  PictureOutlined,
  ProductOutlined,
  RightOutlined,
  RobotOutlined,
  ScissorOutlined,
  SoundOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import type { WorkflowNodeKind } from '../../../types/workflow';
import type { CreativeResourceType } from '../../../types/creativeResource';

interface NodeLibraryProps {
  onAddNode: (kind: WorkflowNodeKind) => void;
  onUnavailable: (label: string) => void;
  onOpenResourceLibrary: (type: CreativeResourceType) => void;
}

interface CanvasMenuItem {
  label: string;
  kind?: WorkflowNodeKind;
  resourceType?: CreativeResourceType;
  icon: React.ReactNode;
  badge?: string;
  badgeTone?: 'blue' | 'gold';
  submenu?: boolean;
}

const nodeGroups: Array<{ label: string; items: CanvasMenuItem[] }> = [
  {
    label: '创作节点 · 点击后展开输入框',
    items: [
      { label: '文本', kind: 'text', icon: <BgColorsOutlined /> },
      { label: '图片生成', kind: 'image', icon: <PictureOutlined /> },
      { label: '视频', kind: 'video', icon: <VideoCameraOutlined /> },
      { label: '音乐', kind: 'music', icon: <SoundOutlined /> },
      { label: '配音', kind: 'voice', icon: <AudioOutlined /> },
    ],
  },
  {
    label: '导演工具 · 独立 3D 工作台',
    items: [
      { label: '导演台', kind: 'director', icon: <VideoCameraOutlined />, badge: '3D', badgeTone: 'blue' },
    ],
  },
  {
    label: '创意资源库 · 预览后应用',
    items: [
      { label: '角色库', resourceType: 'character', icon: <UserOutlined />, submenu: true },
      { label: '风格库', resourceType: 'style', icon: <BgColorsOutlined />, submenu: true },
      { label: '特效库', resourceType: 'effect', icon: <ThunderboltOutlined />, submenu: true },
    ],
  },
  {
    label: '资源 · 选中、引用与连线',
    items: [
      { label: '产品素材', kind: 'product', icon: <ProductOutlined /> },
      { label: '场景设定', kind: 'scene', icon: <AppstoreOutlined /> },
      { label: '营销脚本', kind: 'storyboard', icon: <FileTextOutlined /> },
      { label: '图片素材 / 历史', kind: 'result', icon: <FileImageOutlined /> },
    ],
  },
  {
    label: '处理与输出',
    items: [
      { label: '品类场景 Skill', kind: 'categorySkill', icon: <ThunderboltOutlined />, badge: 'Skill', badgeTone: 'gold' },
      { label: '分镜 AI 提示词', kind: 'prompt', icon: <HighlightOutlined />, badge: 'AI', badgeTone: 'blue' },
      { label: '100 个品类镜头', kind: 'batchMaterial', icon: <PlaySquareOutlined />, badge: 'BATCH' },
      { label: 'AI 剪辑组装', kind: 'editor', icon: <ScissorOutlined />, badge: '10–20' },
      { label: '批量成片', kind: 'export', icon: <ExportOutlined /> },
    ],
  },
];

const resourceItems: CanvasMenuItem[] = [
  { label: '上传', kind: 'product', icon: <UploadOutlined /> },
  { label: '创作便签', kind: 'note', icon: <BgColorsOutlined /> },
];

const NodeLibrary = ({ onAddNode, onUnavailable, onOpenResourceLibrary }: NodeLibraryProps) => {
  const renderItem = (item: CanvasMenuItem) => (
    <button
      type="button"
      key={item.label}
      aria-label={item.resourceType ? item.label : undefined}
      className={item.label === '逐帧拉片' ? 'is-featured' : ''}
      onClick={() => item.resourceType ? onOpenResourceLibrary(item.resourceType) : item.kind ? onAddNode(item.kind) : onUnavailable(item.label)}
    >
      <span className="canvas-add-menu-icon">{item.icon}</span>
      <span className="canvas-add-menu-label">{item.label}</span>
      {item.badge ? <em className={`canvas-add-menu-badge${item.badgeTone ? ` is-${item.badgeTone}` : ''}`}>{item.badge}</em> : null}
      {item.submenu ? <RightOutlined className="canvas-add-menu-arrow" /> : null}
    </button>
  );

  return (
    <aside className="canvas-add-menu" aria-label="添加节点">
      <header><RobotOutlined /> 添加到画布</header>
      {nodeGroups.map((group) => (
        <section className="canvas-add-menu-group" key={group.label}>
          <div className="canvas-add-menu-section">{group.label}</div>
          <div className="canvas-add-menu-list">{group.items.map(renderItem)}</div>
        </section>
      ))}
      <div className="canvas-add-menu-section">添加资源</div>
      <div className="canvas-add-menu-list">{resourceItems.map(renderItem)}</div>
    </aside>
  );
};

export default NodeLibrary;
