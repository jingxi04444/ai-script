import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Modal, message } from 'antd';
import type { MenuProps } from 'antd';
import { CopyOutlined, DownOutlined, LinkOutlined, MoreOutlined, PlusOutlined, SearchOutlined, ShareAltOutlined, TeamOutlined } from '@ant-design/icons';
import HomeRail from '../../components/Layout/HomeRail';
import { fileApi } from '../../api/asset';
import { projectApi } from '../../api/project';
import { config } from '../../config';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { Project, ProjectCollaborationOverview } from '../../types/project';
import { formatDateTime } from '../../utils/format';
import CreateProjectDialog, { type CreateProjectValues } from './CreateProjectDialog';
import ProjectInviteDialog from './ProjectInviteDialog';
import { projectAvatarToDataUrl } from './projectAvatar';
import './projects-page.css';

const ProjectsPage = () => {
  const navigate = useNavigate();
  const {
    projects,
    total,
    fetchProjects,
    fetchMoreProjects,
    createProject,
    deleteProject,
    isLoading,
    isLoadingMore,
    hasMore,
  } = useProjectStore();
  const { setProject, reset } = useWorkspaceStore();
  const user = useAuthStore((state) => state.user);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'name'>('updatedAt');
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [teamProject, setTeamProject] = useState<Project | null>(null);
  const [teamOverview, setTeamOverview] = useState<ProjectCollaborationOverview | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteCreating, setInviteCreating] = useState(false);
  const [latestInviteUrl, setLatestInviteUrl] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteProject, setInviteProject] = useState<Project | null>(null);
  const [quickInviteUrl, setQuickInviteUrl] = useState('');
  const [quickInviteCreating, setQuickInviteCreating] = useState(false);
  const projectScrollRef = useRef<HTMLElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      projectScrollRef.current?.scrollTo({ top: 0 });
      void fetchProjects({
        page: 1,
        pageSize: 20,
        keyword: keyword.trim() || undefined,
      }).catch((error) => {
        message.error(error instanceof Error ? error.message : '项目加载失败，请稍后重试');
      });
    }, keyword.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchProjects, keyword]);

  useEffect(() => {
    const target = loadMoreRef.current;
    const root = projectScrollRef.current;
    if (!target || !root || !hasMore) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void fetchMoreProjects().catch((error) => {
          message.error(error instanceof Error ? error.message : '更多项目加载失败');
        });
      }
    }, { root, rootMargin: '320px 0px', threshold: 0.01 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchMoreProjects, hasMore]);

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
    setCreateDialogOpen(true);
  };

  const confirmCreateProject = async ({ avatarFile, name, announcement }: CreateProjectValues) => {
    try {
      const avatarUrl = avatarFile
        ? config.useMock
          ? await projectAvatarToDataUrl(avatarFile)
          : (await fileApi.upload(avatarFile, 'project-avatar')).url
        : undefined;
      const created = await createProject({
        name,
        announcement,
        avatarUrl,
        category: '产品介绍',
        status: 'active',
      });
      reset();
      setProject({ id: created.id, title: created.name });
      message.success('项目创建成功');
      navigate(`/workspace?projectId=${created.id}&step=selling-points`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '项目创建失败，请稍后重试');
    }
  };

  const handleOpen = (projectId: string, title: string) => {
    setProject({ id: projectId, title });
    navigate(`/workspace?projectId=${projectId}`);
  };

  const isProjectOwner = (project: Project) => !project.userId || project.userId === user?.id;

  const loadProjectTeam = async (project: Project) => {
    setTeamLoading(true);
    try {
      setTeamOverview(await projectApi.getCollaboration(project.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '项目团队加载失败');
    } finally {
      setTeamLoading(false);
    }
  };

  const openProjectTeam = (project: Project) => {
    setTeamProject(project);
    setLatestInviteUrl('');
    setTeamOverview(null);
    void loadProjectTeam(project);
  };

  const openProjectInvite = (project: Project) => {
    setInviteProject(project);
    setQuickInviteUrl('');
  };

  const createQuickInvite = async () => {
    if (!inviteProject) return;
    setQuickInviteCreating(true);
    try {
      const invite = await projectApi.createCollaborationLink(inviteProject.id, { expiresInHours: 168 });
      setQuickInviteUrl(new URL(invite.path, window.location.origin).toString());
      message.success('项目邀请链接已生成');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '项目邀请生成失败');
    } finally {
      setQuickInviteCreating(false);
    }
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success('邀请链接已复制');
    } catch {
      message.error('复制失败，请手动复制邀请链接');
    }
  };

  const createTeamInvite = async () => {
    if (!teamProject) return;
    setInviteCreating(true);
    try {
      const invite = await projectApi.createCollaborationLink(teamProject.id, { expiresInHours: 168 });
      const url = new URL(invite.path, window.location.origin).toString();
      setLatestInviteUrl(url);
      await copyText(url);
      await loadProjectTeam(teamProject);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '邀请链接创建失败');
    } finally {
      setInviteCreating(false);
    }
  };

  const confirmRevokeInvite = (linkId: string) => {
    if (!teamProject) return;
    Modal.confirm({
      centered: true,
      title: '撤销这个邀请链接？',
      content: '撤销后该链接不能再加入新成员，已经加入项目团队的成员不会被移出。',
      okText: '撤销链接',
      cancelText: '取消',
      onOk: async () => {
        await projectApi.revokeCollaborationLink(teamProject.id, linkId);
        message.success('邀请链接已撤销');
        await loadProjectTeam(teamProject);
      },
    });
  };

  const confirmRemoveMember = (memberUserId: string, memberName: string) => {
    if (!teamProject) return;
    Modal.confirm({
      centered: true,
      title: `移出成员“${memberName}”？`,
      content: '移出后，该成员将不能继续访问共享 Brief，也不能查看或编辑这个项目的脚本。',
      okText: '移出成员',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await projectApi.removeCollaborator(teamProject.id, memberUserId);
        message.success('成员已移出项目团队');
        await loadProjectTeam(teamProject);
      },
    });
  };

  const confirmDeleteProject = (project: Project) => {
    Modal.confirm({
      centered: true,
      className: 'project-delete-confirm-dialog',
      title: '将项目移入回收站？',
      content: `“${project.name || '未命名项目'}”会在回收站保留 7 天，期间可完整恢复项目结构和关联内容。`,
      okText: '移入回收站',
      cancelText: '\u53d6\u6d88',
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeletingProjectId(project.id);
        try {
          await deleteProject(project.id);
          if (detailProject?.id === project.id) setDetailProject(null);
          message.success('项目已移入回收站');
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
    if (info.key === 'team') {
      openProjectTeam(project);
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

      <section ref={projectScrollRef} className="my-projects-page project-gallery-page" aria-label="我的项目">
        <header className="project-gallery-toolbar">
          <strong>{typeFilter === 'all' ? `共${total}项` : `已显示${visibleProjects.length}项`}</strong>
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
                <div className={`project-gallery-preview ${item.avatarUrl ? 'has-avatar' : ''}`}>
                  {item.avatarUrl
                    ? <img src={item.avatarUrl} alt="" />
                    : <span className="project-gallery-preview-fallback">{item.name.slice(0, 1)}</span>}
                </div>
                <h3>{item.name || '未命名项目'}</h3>
                <footer>
                  <time>最后更新：{formatDateTime(item.updatedAt)}</time>
                  <div className="project-gallery-actions">
                    {isProjectOwner(item) && (
                      <button
                        type="button"
                        aria-label={`生成项目邀请：${item.name}`}
                        title="生成项目邀请"
                        onClick={() => openProjectInvite(item)}
                      >
                        <ShareAltOutlined />
                      </button>
                    )}
                    <Dropdown
                      trigger={['click']}
                      placement="topRight"
                      overlayClassName="project-card-more-dropdown"
                      menu={{
                        items: [
                          { key: 'detail', label: '\u67e5\u770b\u8be6\u60c5' },
                          ...(isProjectOwner(item) ? [
                            { key: 'team', label: '项目团队' },
                            { type: 'divider' as const },
                            {
                              key: 'delete',
                              danger: true,
                              disabled: deletingProjectId === item.id,
                              label: deletingProjectId === item.id ? '\u5220\u9664\u4e2d...' : '\u5220\u9664\u9879\u76ee',
                            },
                          ] : []),
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
        <div ref={loadMoreRef} className="project-gallery-load-more" aria-live="polite">
          {isLoadingMore ? <span>正在加载更多项目…</span> : hasMore ? <span>继续向下滑动加载更多</span> : projects.length ? <span>已加载全部项目</span> : null}
        </div>
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
              <div><span>项目公告</span><strong>{detailProject.announcement || '-'}</strong></div>
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
      {teamProject && (
        <div className="project-team-dialog-mask" role="dialog" aria-modal="true" aria-label="项目团队">
          <article className="project-team-dialog">
            <header>
              <div>
                <span>至尊版 · 企业协作能力</span>
                <h2>项目团队</h2>
                <p>{teamProject.name}</p>
              </div>
              <button type="button" onClick={() => setTeamProject(null)} aria-label="关闭">×</button>
            </header>

            <section className="project-team-permissions">
              <h3>成员加入后可以做什么</h3>
              <div className="project-team-permission-grid">
                <div><strong>共享 Brief</strong><span>查看、使用和维护当前项目的 Brief</span></div>
                <div><strong>编辑脚本</strong><span>查看脚本、继续润色并保存修改</span></div>
                <div><strong>仅限当前项目</strong><span>不会获得其他项目、会员和支付权限</span></div>
                <div><strong>管理权归创建者</strong><span>成员不能邀请他人、移出成员或删除项目</span></div>
              </div>
            </section>

            <section className="project-team-section">
              <div className="project-team-section-head">
                <div><LinkOutlined /><span><strong>邀请团队成员</strong><small>邀请链接 7 天内有效</small></span></div>
                <button className="primary" type="button" disabled={inviteCreating} onClick={() => void createTeamInvite()}>
                  {inviteCreating ? '生成中…' : '生成邀请链接'}
                </button>
              </div>
              {latestInviteUrl && (
                <div className="project-team-invite-result">
                  <input value={latestInviteUrl} readOnly aria-label="项目团队邀请链接" />
                  <button type="button" onClick={() => void copyText(latestInviteUrl)}><CopyOutlined />复制</button>
                </div>
              )}
              <div className="project-team-list">
                {teamLoading && <div className="project-team-empty">团队信息加载中…</div>}
                {!teamLoading && !teamOverview?.links.length && <div className="project-team-empty">暂无邀请链接</div>}
                {!teamLoading && teamOverview?.links.map((link) => (
                  <div className="project-team-row" key={link.id}>
                    <span><strong>{link.status === 'active' ? '有效邀请链接' : link.status === 'expired' ? '已过期' : '已撤销'}</strong><small>已加入 {link.usedCount} 人{link.expiresAt ? ` · ${formatDateTime(link.expiresAt)} 到期` : ''}</small></span>
                    {link.status === 'active' && <button type="button" onClick={() => confirmRevokeInvite(link.id)}>撤销</button>}
                  </div>
                ))}
              </div>
            </section>

            <section className="project-team-section">
              <div className="project-team-section-head">
                <div><TeamOutlined /><span><strong>已加入成员</strong><small>{teamOverview?.members.length || 0} 人</small></span></div>
              </div>
              <div className="project-team-list">
                {!teamLoading && !teamOverview?.members.length && <div className="project-team-empty">暂时还没有成员加入</div>}
                {teamOverview?.members.map((member) => (
                  <div className="project-team-row member" key={member.id}>
                    <span><strong>{member.name}</strong><small>{member.joinedAt ? `${formatDateTime(member.joinedAt)} 加入` : '项目团队成员'}</small></span>
                    <button className="danger" type="button" onClick={() => confirmRemoveMember(member.userId, member.name)}>移出</button>
                  </div>
                ))}
              </div>
            </section>
          </article>
        </div>
      )}
      {createDialogOpen && (
        <CreateProjectDialog
          onClose={() => setCreateDialogOpen(false)}
          onConfirm={confirmCreateProject}
        />
      )}
      {inviteProject && (
        <ProjectInviteDialog
          project={inviteProject}
          inviteUrl={quickInviteUrl}
          creating={quickInviteCreating}
          onClose={() => setInviteProject(null)}
          onCreate={createQuickInvite}
          onCopy={copyText}
        />
      )}
    </main>
  );
};

export default ProjectsPage;
