import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Modal, message } from 'antd';
import type { MenuProps } from 'antd';
import { DownOutlined, ExportOutlined, MoreOutlined, PlusOutlined, SearchOutlined, ShareAltOutlined } from '@ant-design/icons';
import HomeRail from '../../components/Layout/HomeRail';
import { useProjectStore } from '../../stores/projectStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { Project } from '../../types/project';
import { formatDateTime } from '../../utils/format';
import './projects-page.css';

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { projects, fetchProjects, deleteProject, isLoading } = useProjectStore();
  const { setProject, reset } = useWorkspaceStore();
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'name'>('updatedAt');
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const typeOptions = useMemo(
    () => Array.from(new Set(projects.map((item) => item.category).filter(Boolean))) as string[],
    [projects],
  );

  const visibleProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return projects
      .filter((item) => !normalizedKeyword || item.name.toLowerCase().includes(normalizedKeyword))
      .filter((item) => typeFilter === 'all' || item.category === typeFilter)
      .sort((a, b) => sortBy === 'name'
        ? a.name.localeCompare(b.name, 'zh-Hans-CN')
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [keyword, projects, sortBy, typeFilter]);

  const handleCreate = () => {
    reset();
    navigate('/workspace');
  };

  const handleOpen = (projectId: string, title: string) => {
    setProject({ id: projectId, title });
    navigate(`/workspace?projectId=${projectId}`);
  };

  const confirmDeleteProject = (project: Project) => {
    Modal.confirm({
      centered: true,
      className: 'project-delete-confirm-dialog',
      title: '\u786e\u8ba4\u5220\u9664\u9879\u76ee\uff1f',
      content: `\u5220\u9664\u201c${project.name || '\u672a\u547d\u540d\u9879\u76ee'}\u201d\u540e\u65e0\u6cd5\u6062\u590d\uff0c\u8bf7\u786e\u8ba4\u4e0d\u518d\u9700\u8981\u8be5\u9879\u76ee\u540e\u518d\u64cd\u4f5c\u3002`,
      okText: '\u5220\u9664',
      cancelText: '\u53d6\u6d88',
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeletingProjectId(project.id);
        try {
          await deleteProject(project.id);
          if (detailProject?.id === project.id) setDetailProject(null);
          message.success('\u9879\u76ee\u5df2\u5220\u9664');
        } finally {
          setDeletingProjectId(null);
        }
      },
    });
  };

  const handleProjectMenuClick = (project: Project, info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
    info.domEvent.stopPropagation();
    if (info.key === 'detail') {
      setDetailProject(project);
      return;
    }
    if (info.key === 'delete') confirmDeleteProject(project);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: '进行中',
      published: '已发布',
      review: '审核中',
      idle: '未开始',
    };
    return labels[status] || status;
  };

  return (
    <main className="prototype-home my-projects-shell">
      <HomeRail
        activeLabel="我的项目"
        onCreate={handleCreate}
        onHome={() => navigate('/home')}
      />

      <section className="my-projects-page project-gallery-page" aria-label="我的项目">
        <header className="project-gallery-toolbar">
          <strong>共{visibleProjects.length}项</strong>
          <div className="project-gallery-toolbar-actions">
            <button className="project-gallery-collection-button" type="button" onClick={handleCreate}>
              <PlusOutlined />创建项目
            </button>
            <label className="project-gallery-select">
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="项目类型">
                <option value="all">全部类型</option>
                {typeOptions.map((category) => <option value={category} key={category}>{category}</option>)}
              </select>
              <DownOutlined />
            </label>
            <label className="project-gallery-select">
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'updatedAt' | 'name')} aria-label="项目排序">
                <option value="updatedAt">更新时间倒序</option>
                <option value="name">名称排序</option>
              </select>
              <DownOutlined />
            </label>
            <label className="project-gallery-search">
              <SearchOutlined />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索项目" />
            </label>
          </div>
        </header>

        {isLoading ? (
          <div className="project-gallery-loading">项目加载中...</div>
        ) : (
          <section className="project-gallery-grid">
            <button className="project-create-card" type="button" onClick={handleCreate}>
              <span><PlusOutlined /></span>
              <strong>创建项目</strong>
            </button>

            {visibleProjects.map((item) => (
              <article className="project-gallery-card" key={item.id}>
                <button
                  className="project-gallery-card-hit"
                  type="button"
                  aria-label={`打开项目：${item.name}`}
                  onClick={() => handleOpen(item.id, item.name)}
                />
                <div className="project-gallery-preview" aria-hidden="true">
                  <ShareAltOutlined />
                </div>
                <h3>{item.name || '未命名项目'}</h3>
                <footer>
                  <time>最后更新：{formatDateTime(item.updatedAt)}</time>
                  <div className="project-gallery-actions">
                    <button
                      type="button"
                      aria-label={`进入项目：${item.name}`}
                      onClick={() => handleOpen(item.id, item.name)}
                    >
                      <ExportOutlined />
                    </button>
                    <Dropdown
                      trigger={['click']}
                      placement="topRight"
                      overlayClassName="project-card-more-dropdown"
                      menu={{
                        items: [
                          { key: 'detail', label: '\u67e5\u770b\u8be6\u60c5' },
                          { type: 'divider' },
                          {
                            key: 'delete',
                            danger: true,
                            disabled: deletingProjectId === item.id,
                            label: deletingProjectId === item.id ? '\u5220\u9664\u4e2d...' : '\u5220\u9664\u9879\u76ee',
                          },
                        ],
                        onClick: (info) => handleProjectMenuClick(item, info),
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`\u9879\u76ee\u66f4\u591a\u64cd\u4f5c\uff1a${item.name}`}
                        aria-haspopup="menu"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreOutlined />
                      </button>
                    </Dropdown>
                  </div>
                </footer>
              </article>
            ))}
          </section>
        )}
      </section>
      {detailProject && (
        <div className="project-detail-dialog-mask" role="dialog" aria-modal="true" aria-label="项目详情">
          <article className="project-detail-dialog">
            <header>
              <div>
                <span>Project Detail</span>
                <h2>{detailProject.name}</h2>
              </div>
              <button type="button" onClick={() => setDetailProject(null)} aria-label="关闭">×</button>
            </header>
            <section className="project-detail-grid">
              <div><span>项目名称</span><strong>{detailProject.name}</strong></div>
              <div><span>分类</span><strong>{detailProject.category || '-'}</strong></div>
              <div><span>状态</span><strong>{getStatusLabel(detailProject.status)}</strong></div>
              <div><span>Brief 数量</span><strong>{detailProject.briefCount}</strong></div>
              <div><span>脚本数量</span><strong>{detailProject.scriptCount}</strong></div>
              <div><span>AI 视频数量</span><strong>{detailProject.videoCount}</strong></div>
              <div><span>创建时间</span><strong>{formatDateTime(detailProject.createdAt)}</strong></div>
              <div><span>更新时间</span><strong>{formatDateTime(detailProject.updatedAt)}</strong></div>
            </section>
            <footer>
              <button type="button" onClick={() => setDetailProject(null)}>关闭</button>
              <button type="button" className="primary" onClick={() => handleOpen(detailProject.id, detailProject.name)}>继续编辑</button>
            </footer>
          </article>
        </div>
      )}
    </main>
  );
};

export default ProjectsPage;
