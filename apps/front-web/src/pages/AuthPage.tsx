import { FormEvent, useState } from 'react';
import { navigate } from '../app/router';
import { authApi } from '../services/authApi';
import type { AuthResult } from '../types/auth';

export function AuthLoadingPage() {
  return <main className="login-screen"><div className="login-wrap"><div className="login-card"><h2>正在恢复登录态</h2><p>刷新当前业务路径时，会通过真实接口校验当前用户并保持在原页面。</p></div></div></main>;
}

export function AuthPage({ mode, onDone }: { mode: 'login' | 'register'; onDone: (result: AuthResult) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError('');
    try {
      const action = mode === 'login' ? authApi.login : authApi.register;
      const result = await action({
        name: form.get('name'),
        account: form.get('account'),
        password: form.get('password'),
      });
      onDone(result);
    } catch {
      setError(mode === 'login' ? '登录失败，请检查账号和密码。' : '注册失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <div className="login-wrap">
        <div className="login-head">
          <div className="login-logo">北</div>
          <h1>{mode === 'login' ? '欢迎回来' : '创建账号'}</h1>
          <p>{mode === 'login' ? '登录北钥AI电商视频系统' : '注册后进入北钥AI电商视频系统'}</p>
        </div>

        <form className="login-card" onSubmit={submit}>
          {mode === 'register' && <Field label="姓名" name="name" placeholder="请输入姓名" />}
          <Field label="邮箱地址" name="account" placeholder="请输入邮箱" />
          <Field label="密码" name="password" placeholder="请输入密码" type="password" />
          {mode === 'login' && (
            <div className="login-options">
              <label><input type="checkbox" /> 记住我</label>
              <button type="button">忘记密码？</button>
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button login-submit" disabled={loading}>{loading ? '处理中...' : mode === 'login' ? '登录' : '注册并进入'}</button>
          <div className="login-switch">
            <span>{mode === 'login' ? '还没有账号？' : '已有账号？'}</span>
            <button type="button" onClick={() => navigate(mode === 'login' ? '/register' : '/login')}>
              {mode === 'login' ? '立即注册' : '立即登录'}
            </button>
          </div>
        </form>

        <div className="login-foot">© 2026 北钥AI. 保留所有权利</div>
      </div>
    </main>
  );
}

function Field({ label, name, placeholder, type = 'text' }: { label: string; name: string; placeholder: string; type?: string }) {
  return <label className="field"><span>{label}</span><input name={name} placeholder={placeholder} type={type} required /></label>;
}
