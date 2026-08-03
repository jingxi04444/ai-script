import { useEffect, useState } from 'react';
import { LoadingOutlined, UserOutlined } from '@ant-design/icons';
import { authApi } from '../../api/auth';
import { membershipApi } from '../../api/membership';
import type { UserInfo } from '../../types/user';
import type { PointAccount, UserMembership } from '../../types/membership';
import './modal-dialogs.css';

interface ProfileDialogProps {
  onClose: () => void;
}

const ProfileDialog = ({ onClose }: ProfileDialogProps) => {
  const [profile, setProfile] = useState<UserInfo | null>(null);
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [points, setPoints] = useState<PointAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([
      authApi.getUserInfo(),
      membershipApi.current().catch(() => null),
      membershipApi.points().catch(() => null),
    ])
      .then(([userInfo, currentMembership, pointAccount]) => {
        setProfile(userInfo);
        setMembership(currentMembership);
        setPoints(pointAccount);
      })
      .catch(() => setLoadError('个人信息加载失败，请稍后重试'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="modal-backdrop profile-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="profile-dialog-card">
        <header>
          <div><span>Profile</span><h2 id="profile-dialog-title">我的信息</h2></div>
          <button type="button" aria-label="关闭个人信息" onClick={onClose}>×</button>
        </header>
        {loading ? (
          <div className="profile-dialog-state"><LoadingOutlined spin /><span>正在加载个人信息…</span></div>
        ) : loadError ? (
          <div className="profile-dialog-state error">{loadError}</div>
        ) : profile ? (
          <div className="profile-dialog-content">
            <div className="profile-dialog-avatar">
              {profile.avatar ? <img src={profile.avatar} alt="用户头像" /> : <UserOutlined />}
              <div><strong>{profile.username || '未设置用户名'}</strong><span>ID：{profile.id}</span></div>
            </div>
            <dl>
              <div><dt>当前套餐</dt><dd>{membership?.planName || '未开通会员'}</dd></div>
              <div><dt>积分余额</dt><dd>{Math.floor(points?.availablePoints ?? 0)} 积分</dd></div>
              <div><dt>手机号码</dt><dd>{profile.phone || '未绑定'}</dd></div>
              <div><dt>电子邮箱</dt><dd>{profile.email || '未绑定'}</dd></div>
            </dl>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default ProfileDialog;
