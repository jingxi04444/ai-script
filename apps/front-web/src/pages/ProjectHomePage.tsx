import React, { useEffect, useRef, useState } from 'react';
import { navigate, routes } from '../app/router';
import { ThemeButton } from '../components/ThemeButton';
import { ToastView } from '../components/ToastView';
import { projectApi, type CreateProjectParams } from '../services/projectApi';
import type { User } from '../types/auth';
import type { Project } from '../types/project';
import type { ThemeKey, Toast } from '../types/ui';

export function ProjectHomePage({ user, showToast, toast, theme, onThemeToggle, onLogout }: { user: User; showToast: (message: string, tone?: Toast['tone']) => void; toast: Toast | null; theme: ThemeKey; onThemeToggle: () => void; onLogout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('最新更新');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectAnnouncement, setProjectAnnouncement] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    projectApi.getProjects().then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  const openCreateModal = () => {
    setAvatarPreview('');
    setAvatarFile(null);
    setProjectTitle('');
    setProjectAnnouncement('');
    setShowCreateModal(true);
  };

  const handleAvatarChange = () => {
    const file = avatarInputRef.current?.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateProject = async () => {
    const title = projectTitle.trim();
    if (!title) {
      showToast('请填写项目名称。', 'warning');
      return;
    }
    setCreating(true);
    try {
      const params: CreateProjectParams = {
        title,
        announcement: projectAnnouncement.trim(),
      };
      const project = await projectApi.createProject(params);

      if (avatarFile) {
        await projectApi.uploadAvatar(project.id, avatarFile);
      }

      setShowCreateModal(false);
      showToast('项目已创建，进入 9 步工作台。');
      navigate(routes.workspace(project.id, 'global'));
    } catch {
      showToast('创建失败，请重试。', 'warning');
    } finally {
      setCreating(false);
    }
  };

  const userPoints = user.points ?? 1280;
  const filteredProjects = projects.filter((project) => project.title.includes(searchQuery) || project.product.includes(searchQuery));

  return (
    <main className="prototype-home">
      {toast && <ToastView toast={toast} />}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal-card create-project-modal" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
            <div className="modal-head">
              <div>
                <span className="eyebrow">新建项目</span>
              </div>
              <button onClick={() => setShowCreateModal(false)} aria-label="关闭">×</button>
            </div>

            <div className="create-project-form">
              <div className="form-avatar-row">
                <div
                  className="form-avatar-box"
                  onClick={() => avatarInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && avatarInputRef.current?.click()}
                  aria-label="点击上传项目头像"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="项目头像预览" className="form-avatar-img" />
                  ) : (
                    <div className="form-avatar-placeholder">
                      <span className="avatar-add-icon">+</span>
                      <span className="avatar-hint">项目头像</span>
                    </div>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
                <p className="form-avatar-tip">点击上传项目头像（可选）</p>
              </div>

              <div className="form-field">
                <label htmlFor="project-title">项目名称 <span className="required-mark">*</span></label>
                <input
                  id="project-title"
                  type="text"
                  placeholder="例如：宠鲜鲜加热饭盒 - 抖音推广"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  maxLength={60}
                  autoFocus
                />
              </div>

              <div className="form-field">
                <label htmlFor="project-announcement">项目公告</label>
                <textarea
                  id="project-announcement"
                  placeholder="描述项目目标、创作方向或注意事项..."
                  value={projectAnnouncement}
                  onChange={(e) => setProjectAnnouncement(e.target.value)}
                  rows={3}
                  maxLength={200}
                />
                <span className="form-char-count">{projectAnnouncement.length}/200</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowCreateModal(false)} disabled={creating}>取消</button>
              <button className="primary-button" onClick={handleCreateProject} disabled={creating}>
                {creating ? '创建中...' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="home-topnav">
        <div className="home-logo-group">
          <div className="home-logo">北</div>
          <h1>纳米视频流水线</h1>
        </div>
        <div className="home-top-actions">
          <button onClick={() => navigate(routes.assets)}>我的资产库</button>
          <button className="home-primary" onClick={openCreateModal}>+ 我的项目</button>
          <ThemeButton theme={theme} onClick={onThemeToggle} />
          <div className="home-user-menu">
            <button onClick={() => setShowUserMenu(!showUserMenu)}>企业版</button>
            {showUserMenu && (
              <div className="home-user-popover">
                <button>设置</button>
                <button className="danger-text" onClick={onLogout}>退出登录</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="home-body">
        <aside className="home-sidebar">
          <nav className="home-sidebar-main" aria-label="剧本筛选">
            <button className="active">
              <span />
              全部剧本
            </button>
          </nav>
          <section className="home-profile-card" aria-label="我的信息">
            <div className="home-profile-avatar">{user.name.slice(0, 1)}</div>
            <div>
              <span>我的信息</span>
              <strong>{user.name}</strong>
              <p>{user.role}</p>
            </div>
            <div className="home-points-row">
              <span>我的积分</span>
              <strong>{userPoints.toLocaleString('zh-CN')}</strong>
            </div>
          </section>
        </aside>

        <section className="home-content">
          <div className="home-toolbar">
            <button className="toolbar-button">共同</button>
            <div className="toolbar-right">
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option>全部更新区</option>
                <option>最新更新</option>
                <option>最早创建</option>
              </select>
              <select>
                <option>更新时间倒序</option>
                <option>更新时间顺序</option>
              </select>
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索内容" />
            </div>
          </div>

          <div className="home-grid">
            <button className="create-project-card" onClick={openCreateModal}>
              <div>+</div>
              <span>创建项目</span>
            </button>

            {loading ? <div className="home-empty">正在读取项目数据...</div> : filteredProjects.map((project) => (
              <article className="prototype-project-card" key={project.id} onClick={() => navigate(routes.workspace(project.id, project.currentStep))}>
                <div className="project-folder-area">
                  <div className="folder-icon">▰</div>
                  <span>{project.progress ? Math.max(1, Math.round(project.progress / 10)) : 1} 个视频</span>
                </div>
                <div className="project-info-row">
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.product} / 最后更新: {project.updatedAt}</p>
                  </div>
                  <button onClick={(event) => event.stopPropagation()}>⋮</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
