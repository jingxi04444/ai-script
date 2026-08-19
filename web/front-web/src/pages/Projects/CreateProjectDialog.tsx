import { useEffect, useRef, useState } from 'react';
import { DeleteOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { optimizeProjectAvatar } from './projectAvatar';
import './create-project-dialog.css';

export interface CreateProjectValues {
  avatarFile?: File;
  name: string;
  announcement: string;
}

interface CreateProjectDialogProps {
  onClose: () => void;
  onConfirm: (values: CreateProjectValues) => Promise<void>;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const CreateProjectDialog = ({ onClose, onConfirm }: CreateProjectDialogProps) => {
  const dialogRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarTaskRef = useRef(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarFileName, setAvatarFileName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarPreparing, setAvatarPreparing] = useState(false);
  const [name, setName] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [nameError, setNameError] = useState('');
  const [announcementError, setAnnouncementError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => () => {
    avatarTaskRef.current += 1;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const chooseAvatar = async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError('仅支持 JPG、PNG 或 WebP 图片');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('图片大小不能超过 5MB');
      return;
    }
    const taskId = avatarTaskRef.current + 1;
    avatarTaskRef.current = taskId;
    setAvatarFile(null);
    setAvatarFileName(file.name);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarError('');
    setAvatarPreparing(true);
    try {
      const optimizedFile = await optimizeProjectAvatar(file);
      if (avatarTaskRef.current === taskId) setAvatarFile(optimizedFile);
    } catch {
      if (avatarTaskRef.current === taskId) setAvatarFile(file);
    } finally {
      if (avatarTaskRef.current === taskId) setAvatarPreparing(false);
    }
  };

  const removeAvatar = () => {
    avatarTaskRef.current += 1;
    setAvatarFile(null);
    setAvatarFileName('');
    setAvatarPreview('');
    setAvatarPreparing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const trimmedName = name.trim();
    const trimmedAnnouncement = announcement.trim();
    const nextNameError = trimmedName ? '' : '请输入项目名称';
    const nextAnnouncementError = trimmedAnnouncement ? '' : '请输入项目公告';
    setNameError(nextNameError);
    setAnnouncementError(nextAnnouncementError);
    return !nextNameError && !nextAnnouncementError;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onConfirm({
        avatarFile: avatarFile ?? undefined,
        name: name.trim(),
        announcement: announcement.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-project-dialog-mask" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !submitting) onClose();
    }}>
      <section
        ref={dialogRef}
        className="create-project-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        tabIndex={-1}
      >
        <header>
          <div>
            <span>NEW PROJECT</span>
            <h2 id="create-project-title">创建项目</h2>
            <p>完善基础信息后，即可进入项目创建步骤。</p>
          </div>
          <button className="create-project-close" type="button" onClick={onClose} disabled={submitting} aria-label="关闭创建项目弹窗">×</button>
        </header>

        <form onSubmit={submit} noValidate>
          <div className="create-project-form-content">
            <div className="create-project-field create-project-avatar-field">
              <label>项目头像（选填）</label>
              <div className="create-project-avatar-row">
                <button
                  className={`create-project-avatar ${avatarError ? 'has-error' : ''}`}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={avatarPreview ? '更换项目头像' : '上传项目头像'}
                  aria-invalid={Boolean(avatarError)}
                  aria-busy={avatarPreparing}
                >
                  {avatarPreview ? <img src={avatarPreview} alt="项目头像预览" /> : <><PictureOutlined /><span><PlusOutlined /> 上传头像</span></>}
                </button>
                <div className="create-project-avatar-help">
                  <strong>{avatarPreview ? avatarFileName : '选择一张能代表项目的图片'}</strong>
                  <small>{avatarPreparing ? '正在优化头像，稍候即可创建' : '支持 JPG、PNG、WebP，文件不超过 5MB'}</small>
                  {avatarPreview && <button type="button" onClick={removeAvatar}><DeleteOutlined />移除图片</button>}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void chooseAvatar(event.target.files?.[0])}
                  hidden
                />
              </div>
              {avatarError && <small className="create-project-error">{avatarError}</small>}
            </div>

            <div className="create-project-field">
              <label htmlFor="project-name">项目名称 <em>*</em></label>
              <input
                id="project-name"
                className={nameError ? 'has-error' : ''}
                value={name}
                maxLength={180}
                placeholder="例如：某某品牌8月项目"
                onChange={(event) => {
                  setName(event.target.value);
                  if (event.target.value.trim()) setNameError('');
                }}
                aria-invalid={Boolean(nameError)}
              />
              <div className="create-project-field-meta">
                <small className="create-project-error">{nameError}</small>
                <small>{name.length}/180</small>
              </div>
            </div>

            <div className="create-project-field">
              <label htmlFor="project-announcement">项目公告 <em>*</em></label>
              <textarea
                id="project-announcement"
                className={announcementError ? 'has-error' : ''}
                value={announcement}
                maxLength={500}
                rows={4}
                placeholder="填写项目目标、协作说明或需要团队成员注意的事项"
                onChange={(event) => {
                  setAnnouncement(event.target.value);
                  if (event.target.value.trim()) setAnnouncementError('');
                }}
                aria-invalid={Boolean(announcementError)}
              />
              <div className="create-project-field-meta">
                <small className="create-project-error">{announcementError}</small>
                <small>{announcement.length}/500</small>
              </div>
            </div>
          </div>

          <footer>
            <button type="button" onClick={onClose} disabled={submitting}>取消</button>
            <button className="primary" type="submit" disabled={submitting || avatarPreparing}>
              {avatarPreparing ? '头像处理中…' : submitting ? '创建中…' : '确认创建'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default CreateProjectDialog;
