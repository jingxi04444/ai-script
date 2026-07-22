import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import './auth.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || (location.state as { from?: Location } | null)?.from?.pathname || '/home';
  const registerPath = `/register?redirect=${encodeURIComponent(redirect)}`;

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [isAuthenticated, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate(redirect, { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
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

      <section className="auth-card" aria-label="登录">
        <div className="auth-mode-tabs">
          <button className="active">登录</button>
          <button onClick={() => navigate(registerPath)}>注册</button>
        </div>
        <header>
          <span>Welcome Back</span>
          <h2>账号登录</h2>
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
            <span>密码</span>
            <input
              type="password"
              placeholder="请输入登录密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="auth-submit-button" disabled={isLoading}>
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>
        <footer>
          <span>还没有账号？</span>
          <button onClick={() => navigate(registerPath)}>立即注册</button>
        </footer>
      </section>
    </main>
  );
};

export default LoginPage;
