import { useEffect, useMemo, useState } from 'react';
import {
  CheckOutlined,
  FileWordOutlined,
  FolderOpenOutlined,
  LeftOutlined,
  LoadingOutlined,
  PlusOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { message, Modal } from 'antd';
import { useParams } from 'react-router-dom';
import { briefApi } from '../../api/brief';
import { projectApi } from '../../api/project';
import BriefContentLayout from '../../components/Brief/BriefContentLayout';
import type { Brief, BriefSharePack } from '../../types/brief';
import type { Project } from '../../types/project';
import './brief-share-pack-page.css';

const BriefSharePackPage = () => {
  const { token = '' } = useParams();
  const [sharePack, setSharePack] = useState<BriefSharePack | null>(null);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    briefApi.getSharePack(token)
      .then((pack) => {
        setSharePack(pack);
        setSelectedIds(pack.briefs.map((brief) => brief.id));
      })
      .catch(() => setError('分享包不存在或已失效'))
      .finally(() => setLoading(false));

    projectApi.getList({ page: 1, pageSize: 200 })
      .then((result) => {
        setProjects(result.list || []);
        setProjectId(result.list?.[0]?.id || '');
      })
      .catch(() => setProjects([]));
  }, [token]);

  useEffect(() => {
    if (!projectId) {
      setLinkedIds([]);
      return;
    }
    briefApi.sharePackLinkedBriefIds(token, projectId)
      .then((ids) => setLinkedIds(ids || []))
      .catch(() => setLinkedIds([]));
  }, [projectId, token]);

  const selectedLinkedIds = useMemo(
    () => selectedIds.filter((id) => linkedIds.includes(id)),
    [linkedIds, selectedIds],
  );

  const joinProject = async () => {
    if (!projectId) return message.warning('请选择自己的项目');
    if (!selectedIds.length) return message.warning('请选择要加入项目的 Brief');
    setJoining(true);
    try {
      await briefApi.linkSharePackToProject(token, projectId, selectedIds);
      setLinkedIds((current) => [...new Set([...current, ...selectedIds])]);
      message.success(`已将 ${selectedIds.length} 份 Brief 加入项目，已存在的不会重复添加`);
    } catch {
      message.error('加入项目失败，请确认登录状态和项目权限');
    } finally {
      setJoining(false);
    }
  };

  const undoProject = () => {
    if (!projectId) return message.warning('请选择自己的项目');
    if (!selectedLinkedIds.length) return message.warning('所选 Brief 尚未加入当前项目');
    Modal.confirm({
      title: '撤销加入项目',
      content: `确认从当前项目移除所选的 ${selectedLinkedIds.length} 份 Brief 关联吗？原 Brief 不会被删除。`,
      okText: '确认撤销',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setUnlinking(true);
        try {
          await briefApi.unlinkSharePackFromProject(token, projectId, selectedLinkedIds);
          setLinkedIds((current) => current.filter((id) => !selectedLinkedIds.includes(id)));
          message.success('已撤销项目关联');
        } catch {
          message.error('撤销失败，请稍后重试');
          throw new Error('unlink failed');
        } finally {
          setUnlinking(false);
        }
      },
    });
  };

  const openBrief = (briefId: string) => {
    briefApi.getSharePackBrief(token, briefId)
      .then(setSelectedBrief)
      .catch(() => setError('Brief 不存在或已被移出分享包'));
  };

  if (loading) {
    return <main className="brief-share-pack-status"><LoadingOutlined spin />正在加载 Brief 文件夹...</main>;
  }
  if (error && !sharePack) return <main className="brief-share-pack-status">{error}</main>;
  if (selectedBrief) {
    return (
      <main className="brief-share-pack-page">
        <header>
          <button type="button" onClick={() => setSelectedBrief(null)}><LeftOutlined />返回文件夹</button>
          <span><FileWordOutlined />{selectedBrief.productName || selectedBrief.name || 'Brief'}</span>
        </header>
        <BriefContentLayout brief={selectedBrief} className="brief-share-pack-document" />
      </main>
    );
  }

  const allSelected = selectedIds.length === sharePack?.briefs.length;
  return (
    <main className="brief-share-pack-page">
      <header>
        <span><FolderOpenOutlined />共享 Brief 文件夹</span>
        <small>共 {sharePack?.briefs.length || 0} 份 Brief</small>
      </header>
      <section className="brief-share-pack-join">
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">选择我的项目</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <button type="button" onClick={() => setSelectedIds(allSelected ? [] : sharePack?.briefs.map((brief) => brief.id) || [])}>
          {allSelected ? '取消全选' : '全选'}
        </button>
        <button className="primary" type="button" onClick={joinProject} disabled={joining || !projectId || !selectedIds.length}>
          <PlusOutlined />加入所选 {selectedIds.length} 份 Brief
        </button>
        <button className="undo" type="button" onClick={undoProject} disabled={unlinking || !projectId || !selectedLinkedIds.length}>
          <UndoOutlined />撤销所选 {selectedLinkedIds.length} 份
        </button>
      </section>
      {!projects.length ? <p className="brief-share-pack-hint">登录后可选择自己的项目并加入 Brief。</p> : null}
      {error ? <p className="brief-share-pack-error">{error}</p> : null}
      <section className="brief-share-pack-grid">
        {sharePack?.briefs.map((brief) => {
          const selected = selectedIds.includes(brief.id);
          const linked = linkedIds.includes(brief.id);
          return (
            <article className={selected ? 'is-selected' : ''} key={brief.id}>
              {linked ? <em className="brief-share-pack-linked">已加入当前项目</em> : null}
              <label>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => setSelectedIds((current) => current.includes(brief.id)
                    ? current.filter((id) => id !== brief.id)
                    : [...current, brief.id])}
                />
                <span>{selected ? <CheckOutlined /> : null}</span>
              </label>
              <button type="button" onClick={() => openBrief(brief.id)}>
                <FileWordOutlined />
                <strong>{brief.productName || brief.name || '未命名 Brief'}</strong>
                <small>{brief.productModel || 'Word Brief 文档'}</small>
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
};

export default BriefSharePackPage;