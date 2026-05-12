import { useEffect, useState } from 'react';
import { navigate, routes } from '../app/router';
import { ThemeButton } from '../components/ThemeButton';
import { ToastView } from '../components/ToastView';
import { projectApi } from '../services/projectApi';
import type { User } from '../types/auth';
import type { Project } from '../types/project';
import type { ThemeKey, Toast } from '../types/ui';

export function ProjectHomePage({ user, showToast, toast, theme, onThemeToggle, onLogout }: { user: User; showToast: (message: string, tone?: Toast['tone']) => void; toast: Toast | null; theme: ThemeKey; onThemeToggle: () => void; onLogout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('最新更新');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    projectApi.getProjects().then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  const createProject = async () => {
    const project = await projectApi.createProject();
    showToast('项目已创建，进入 9 步工作台。');
    navigate(routes.workspace(project.id, 'global'));
  };

  const userPoints = user.points ?? 1280;
  const filteredProjects = projects.filter((project) => project.title.includes(searchQuery) || project.product.includes(searchQuery));

  return (
    <main className="prototype-home">
      {toast && <ToastView toast={toast} />}
      <header className="home-topnav">
        <div className="home-logo-group">
          <div className="home-logo">北</div>
          <h1>纳米视频流水线</h1>
        </div>
        <div className="home-top-actions">
          <button onClick={() => navigate(routes.assets)}>我的资产库</button>
          <button className="home-primary" onClick={createProject}>+ 我的项目</button>
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
            <button className="create-project-card" onClick={createProject}>
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
