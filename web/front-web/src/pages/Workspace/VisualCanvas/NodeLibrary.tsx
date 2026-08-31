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

interface NodeLibraryProps {
  onAddNode: (kind: WorkflowNodeKind) => void;
  onUnavailable: (label: string) => void;
}

interface CanvasMenuItem {
  label: string;
  kind?: WorkflowNodeKind;
  icon: React.ReactNode;
  badge?: string;
  badgeTone?: 'blue' | 'gold';
  submenu?: boolean;
}

const nodeGroups: Array<{ label: string; items: CanvasMenuItem[] }> = [
  {
    label: '基础节点',
    items: [
      { label: '文本', kind: 'text', icon: <BgColorsOutlined /> },
      { label: '图片', kind: 'image', icon: <PictureOutlined /> },
      { label: '视频', kind: 'video', icon: <VideoCameraOutlined /> },
      { label: '脚本', kind: 'scriptGenerator', icon: <FileTextOutlined /> },
    ],
  },
  {
    label: 'A–C · 创作输入',
    items: [
      { label: '产品素材', kind: 'product', icon: <ProductOutlined /> },
      { label: '场景设定', kind: 'scene', icon: <AppstoreOutlined /> },
      { label: '模特角色', kind: 'character', icon: <UserOutlined /> },
      { label: '营销脚本', kind: 'storyboard', icon: <FileTextOutlined /> },
    ],
  },
  {
    label: 'D · 素材生产',
    items: [
      { label: '品类场景 Skill', kind: 'categorySkill', icon: <ThunderboltOutlined />, badge: 'Skill', badgeTone: 'gold' },
      { label: '产品场景图', kind: 'image', icon: <PictureOutlined /> },
      { label: '分镜 AI 提示词', kind: 'prompt', icon: <HighlightOutlined />, badge: 'AI', badgeTone: 'blue' },
      { label: '卖点视频镜头', kind: 'video', icon: <VideoCameraOutlined /> },
      { label: '100 个品类镜头', kind: 'batchMaterial', icon: <PlaySquareOutlined />, badge: 'BATCH' },
    ],
  },
  {
    label: 'E · 合成与成片',
    items: [
      { label: '音乐模型', kind: 'music', icon: <SoundOutlined /> },
      { label: '配音模型', kind: 'voice', icon: <AudioOutlined /> },
      { label: 'AI 剪辑组装', kind: 'editor', icon: <ScissorOutlined />, badge: '10–20' },
      { label: '批量成片', kind: 'export', icon: <ExportOutlined /> },
    ],
  },
];

const resourceItems: CanvasMenuItem[] = [
  { label: '上传', kind: 'product', icon: <UploadOutlined /> },
  { label: '从生成历史选择', kind: 'result', icon: <FileImageOutlined /> },
  { label: '创作便签', kind: 'note', icon: <BgColorsOutlined /> },
];

const NodeLibrary = ({ onAddNode, onUnavailable }: NodeLibraryProps) => {
  const renderItem = (item: CanvasMenuItem) => (
    <button
      type="button"
      key={item.label}
      className={item.label === '逐帧拉片' ? 'is-featured' : ''}
      onClick={() => item.kind ? onAddNode(item.kind) : onUnavailable(item.label)}
    >
      <span className="canvas-add-menu-icon">{item.icon}</span>
      <span className="canvas-add-menu-label">{item.label}</span>
      {item.badge ? <em className={`canvas-add-menu-badge${item.badgeTone ? ` is-${item.badgeTone}` : ''}`}>{item.badge}</em> : null}
      {item.submenu ? <RightOutlined className="canvas-add-menu-arrow" /> : null}
    </button>
  );

  return (
    <aside className="canvas-add-menu" aria-label="添加节点">
      <header><RobotOutlined /> 视频生产能力</header>
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
