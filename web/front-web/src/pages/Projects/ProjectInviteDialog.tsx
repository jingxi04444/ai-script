import { useEffect, useRef } from 'react';
import { CopyOutlined, LinkOutlined, ShareAltOutlined } from '@ant-design/icons';
import type { Project } from '../../types/project';
import './project-invite-dialog.css';

interface ProjectInviteDialogProps {
  project: Project;
  inviteUrl: string;
  creating: boolean;
  onClose: () => void;
  onCreate: () => Promise<void>;
  onCopy: (value: string) => Promise<void>;
}

const ProjectInviteDialog = ({ project, inviteUrl, creating, onClose, onCreate, onCopy }: ProjectInviteDialogProps) => {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !creating) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [creating, onClose]);

  return (
    <div className="project-invite-dialog-mask" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !creating) onClose();
    }}>
      <section
        ref={dialogRef}
        className="project-invite-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-invite-title"
        tabIndex={-1}
      >
        <header>
          <div className="project-invite-heading">
            <span className="project-invite-icon"><ShareAltOutlined /></span>
            <div>
              <small>PROJECT INVITATION</small>
              <h2 id="project-invite-title">邀请加入项目</h2>
              <p>{project.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={creating} aria-label="关闭项目邀请弹窗">×</button>
        </header>

        <div className="project-invite-content">
          <div className="project-invite-project">
            <span className={project.avatarUrl ? 'has-image' : ''}>
              {project.avatarUrl ? <img src={project.avatarUrl} alt="" /> : project.name.slice(0, 1)}
            </span>
            <div>
              <strong>{project.name}</strong>
              <small>链接有效期为 7 天，获得链接的成员可以加入该项目。</small>
            </div>
          </div>

          {!inviteUrl ? (
            <button className="project-invite-generate" type="button" disabled={creating} onClick={() => void onCreate()}>
              <LinkOutlined />
              <span><strong>{creating ? '正在生成邀请…' : '生成邀请加入项目'}</strong><small>创建一个新的项目邀请链接</small></span>
            </button>
          ) : (
            <div className="project-invite-result">
              <label htmlFor="project-invite-url">邀请链接已生成</label>
              <div>
                <input id="project-invite-url" value={inviteUrl} readOnly />
                <button type="button" onClick={() => void onCopy(inviteUrl)}><CopyOutlined />复制链接</button>
              </div>
              <small>请只分享给需要加入项目的成员；如需撤销链接，请在“…”里的“项目团队”中管理。</small>
            </div>
          )}
        </div>

        <footer>
          <button type="button" onClick={onClose} disabled={creating}>完成</button>
        </footer>
      </section>
    </div>
  );
};

export default ProjectInviteDialog;
