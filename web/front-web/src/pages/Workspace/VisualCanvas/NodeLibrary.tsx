import CanvasIcon from './CanvasIcon';
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
    label: '添加节点',
    items: [
      { label: '文本', kind: 'text', icon: <CanvasIcon name="BgColorsOutlined" /> },
      { label: '图片生成', kind: 'image', icon: <CanvasIcon name="PictureOutlined" /> },
      { label: '视频', kind: 'video', icon: <CanvasIcon name="VideoCameraOutlined" /> },
      { label: '音乐', kind: 'music', icon: <CanvasIcon name="SoundOutlined" /> },
      { label: '配音', kind: 'voice', icon: <CanvasIcon name="AudioOutlined" /> },
    ],
  },
  {
    label: '导演工具',
    items: [
      { label: '导演台', kind: 'director', icon: <CanvasIcon name="VideoCameraOutlined" />, badge: '3D', badgeTone: 'blue' },
    ],
  },
  {
    label: '创意资源库',
    items: [
      { label: '角色库', resourceType: 'character', icon: <CanvasIcon name="UserOutlined" />, submenu: true },
      { label: '风格库', resourceType: 'style', icon: <CanvasIcon name="BgColorsOutlined" />, submenu: true },
      { label: '特效库', resourceType: 'effect', icon: <CanvasIcon name="ThunderboltOutlined" />, submenu: true },
    ],
  },
  {
    label: '添加资源',
    items: [
      { label: '产品素材', kind: 'product', icon: <CanvasIcon name="ProductOutlined" /> },
      { label: '场景设定', kind: 'scene', icon: <CanvasIcon name="AppstoreOutlined" /> },
      { label: '营销脚本', kind: 'storyboard', icon: <CanvasIcon name="FileTextOutlined" /> },
      { label: '图片素材 / 历史', kind: 'result', icon: <CanvasIcon name="FileImageOutlined" /> },
    ],
  },
  {
    label: '处理与输出',
    items: [
      { label: '品类场景 Skill', kind: 'categorySkill', icon: <CanvasIcon name="ThunderboltOutlined" />, badge: 'Skill', badgeTone: 'gold' },
      { label: '分镜 AI 提示词', kind: 'prompt', icon: <CanvasIcon name="HighlightOutlined" />, badge: 'AI', badgeTone: 'blue' },
      { label: '100 个品类镜头', kind: 'batchMaterial', icon: <CanvasIcon name="PlaySquareOutlined" />, badge: 'BATCH' },
      { label: 'AI 剪辑组装', kind: 'editor', icon: <CanvasIcon name="ScissorOutlined" />, badge: '10–20' },
      { label: '批量成片', kind: 'export', icon: <CanvasIcon name="ExportOutlined" /> },
    ],
  },
];

const resourceItems: CanvasMenuItem[] = [
  { label: '上传', kind: 'product', icon: <CanvasIcon name="UploadOutlined" /> },
  { label: '创作便签', kind: 'note', icon: <CanvasIcon name="BgColorsOutlined" /> },
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
      {item.submenu ? <CanvasIcon name="RightOutlined" className="canvas-add-menu-arrow" /> : null}
    </button>
  );

  return (
    <aside className="canvas-add-menu" aria-label="添加节点">
      <header><CanvasIcon name="RobotOutlined" /> 添加到画布</header>
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
