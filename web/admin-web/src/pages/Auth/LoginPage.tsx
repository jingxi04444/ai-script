import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Database, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { authApi } from '../../api/auth';
import { takeAdminAuthNotice } from '../../api';

const LoginPage = () => {
  const [username, setUsername] = useState('admin@ai-script.local');
  const [password, setPassword] = useState('admin123');
  const [captcha, setCaptcha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginReason = searchParams.get('reason');

  useEffect(() => {
    const authNotice = takeAdminAuthNotice()
      || (loginReason === 'expired' ? '登录已过期，请重新登录' : '');
    if (authNotice) setError(authNotice);
    if (localStorage.getItem('admin_token')) {
      navigate('/dashboard', { replace: true });
    }
  }, [loginReason, navigate]);

  const requestCaptcha = () => {
    setCaptcha('4829');
    setHint('验证码已生成：4829');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { token } = await authApi.login({ username, password });
      localStorage.setItem('admin_token', token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-shell">
      <section className="login-brand">
        <div className="login-brand-mark"><Sparkles size={36} /></div>
        <strong>AI Script Admin</strong>
        <h1>后台管理平台</h1>
        <p>管理前台创作流程、用户会员、充值支付、内容审核、项目和系统配置。</p>
        <div className="login-feature">
          <span><ShieldCheck size={18} />权限隔离</span>
          <span><Database size={18} />配置中心</span>
          <span><ClipboardCheck size={18} />审核闭环</span>
        </div>
      </section>

      <section className="login-card">
        <div>
          <div className="eyebrow">Admin Login</div>
          <h2>管理员登录</h2>
        </div>

        <form onSubmit={handleSubmit} className="page-stack">
          {error ? <div className="help-card" style={{ borderColor: 'rgba(255,107,112,0.4)', color: '#ffb5b7' }}>{error}</div> : null}
          <label>
            <span>账号</span>
            <input
              type="text"
              placeholder="admin@ai-script.local"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            <span>验证码</span>
            <div className="login-code-row">
              <input
                type="text"
                placeholder="输入验证码"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
              />
              <button type="button" onClick={requestCaptcha}>获取</button>
            </div>
          </label>
          {hint ? <p className="login-hint">{hint}</p> : null}
          <div className="login-actions">
            <button type="submit" className="login-btn" disabled={isLoading}>
              <Lock size={18} />
              {isLoading ? '登录中...' : '登录后台'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default LoginPage;
