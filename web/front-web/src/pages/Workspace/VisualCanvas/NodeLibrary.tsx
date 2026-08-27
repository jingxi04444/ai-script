import { useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  BulbOutlined,
  FileImageOutlined,
  FileTextOutlined,
  ProductOutlined,
  PushpinOutlined,
  SearchOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { workflowNodeDefinitions, type WorkflowNodeKind } from '../../../types/workflow';

interface NodeLibraryProps {
  onAddNode: (kind: WorkflowNodeKind) => void;
}

const icons: Record<WorkflowNodeKind, React.ReactNode> = {
  storyboard: <FileTextOutlined />,
  character: <UserOutlined />,
  scene: <AppstoreOutlined />,
  product: <ProductOutlined />,
  prompt: <BulbOutlined />,
  image: <FileImageOutlined />,
  result: <FileImageOutlined />,
  video: <VideoCameraOutlined />,
  note: <PushpinOutlined />,
};

const groups = [
  { id: 'source', label: '创作输入' },
  { id: 'creative', label: '智能处理' },
  { id: 'generation', label: '生成与输出' },
  { id: 'utility', label: '辅助工具' },
] as const;

const NodeLibrary = ({ onAddNode }: NodeLibraryProps) => {
  const [keyword, setKeyword] = useState('');
  const filtered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return workflowNodeDefinitions;
    return workflowNodeDefinitions.filter((item) => `${item.title}${item.description}${item.kind}`.toLowerCase().includes(normalized));
  }, [keyword]);

  return (
    <aside className="workflow-node-library">
      <header>
        <div>
          <span className="workflow-eyebrow">NODE LIBRARY</span>
          <h2>创作能力</h2>
        </div>
        <span className="workflow-node-count">{workflowNodeDefinitions.length}</span>
      </header>
      <label className="workflow-node-search">
        <SearchOutlined />
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索节点" />
      </label>

      <div className="workflow-node-groups">
        {groups.map((group) => {
          const entries = filtered.filter((item) => item.group === group.id);
          if (!entries.length) return null;
          return (
            <section key={group.id}>
              <h3>{group.label}</h3>
              <div>
                {entries.map((item) => (
                  <button
                    key={item.kind}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/ai-script-node', item.kind);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => onAddNode(item.kind)}
                  >
                    <span className={`workflow-library-icon kind-${item.kind}`}>{icons[item.kind]}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                    <i>＋</i>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <footer>
        <span>拖入画布或单击添加</span>
        <kbd>⌘ K</kbd>
      </footer>
    </aside>
  );
};

export default NodeLibrary;

