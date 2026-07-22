import { useState } from 'react';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';

const LoginPage = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { login } = useAuthStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      login();
    } else {
      if (password === confirmPassword) {
        login();
      }
    }
  };

  return (
    <main className="auth-app-shell">
      <section className="auth-brand-panel">
        <div className="auth-logo-mark"><span /><i /></div>
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

      <section className="auth-card" aria-label={mode === 'register' ? '注册' : '登录'}>
        <div className="auth-mode-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>登录</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>注册</button>
        </div>
        <header>
          <span>{mode === 'register' ? 'Create Account' : 'Welcome Back'}</span>
          <h2>{mode === 'register' ? '创建账号' : '账号登录'}</h2>
        </header>
        <form onSubmit={handleSubmit}>
          <label><span>手机号 / 邮箱</span><input placeholder="请输入手机号或邮箱" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          {mode === 'register' && (
            <label>
              <span>验证码</span>
              <div className="auth-code-field">
                <input placeholder="输入验证码" value={code} onChange={(e) => setCode(e.target.value)} />
                <button type="button">获取验证码</button>
              </div>
            </label>
          )}
          <label><span>密码</span><input type="password" placeholder={mode === 'register' ? '设置 8 位以上密码' : '请输入登录密码'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {mode === 'register' && (
            <label><span>确认密码</span><input type="password" placeholder="再次输入密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
          )}
          <button type="submit" className="auth-submit-button">{mode === 'register' ? '注册并登录' : '登录'}</button>
        </form>
        <footer>
          <span>{mode === 'register' ? '已有账号？' : '还没有账号？'}</span>
          <button onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? '去登录' : '立即注册'}</button>
        </footer>
      </section>
    </main>
  );
};

export default LoginPage;
