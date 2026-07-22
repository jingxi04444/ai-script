import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import './auth.css';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/home';
  const loginPath = `/login?redirect=${encodeURIComponent(redirect)}`;

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [isAuthenticated, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('两次密码不一致');
      return;
    }
    try {
      await register({ username, password });
      navigate(redirect, { replace: true });
    } catch (error) {
      console.error('Register failed:', error);
    }
  };

  return (
    <main className="auth-app-shell">
      <section className="auth-brand-panel">
        <div className="auth-logo-mark">
          <span />
          <i />
        </div>
        <div>
          <p>AI Script Workbench</p>
          <h1>登录后开始创作你的商业短视频项目</h1>
        </div>
        <ul>
          <li><CheckCircleOutlined />项目、Brief、脚本与视频统一保存</li>
          <li><CheckCircleOutlined />会员权益和充值余额跟随账号</li>
          <li><CheckCircleOutlined />团队后续可接入权限与审核流程</li>
        </ul>
      </section>

      <section className="auth-card" aria-label="注册">
        <div className="auth-mode-tabs">
          <button onClick={() => navigate(loginPath)}>登录</button>
          <button className="active">注册</button>
        </div>
        <header>
          <span>Create Account</span>
          <h2>创建账号</h2>
        </header>
        <form onSubmit={handleSubmit}>
          <label>
            <span>手机号 / 邮箱</span>
            <input
              placeholder="请输入手机号或邮箱"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            <span>验证码</span>
            <div className="auth-code-field">
              <input placeholder="输入验证码" />
              <button type="button">获取验证码</button>
            </div>
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              placeholder="设置 8 位以上密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            <span>确认密码</span>
            <input
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="auth-submit-button" disabled={isLoading}>
            {isLoading ? '注册中...' : '注册并登录'}
          </button>
        </form>
        <footer>
          <span>已有账号？</span>
          <button onClick={() => navigate(loginPath)}>去登录</button>
        </footer>
      </section>
    </main>
  );
};

export default RegisterPage;
