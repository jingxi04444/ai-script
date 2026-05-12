import { useState, type FormEvent } from 'react';
import { authApi } from '../services/authApi';
import type { AdminUser } from '../types/admin';

export function AdminLoginPage({ onDone }: { onDone: (user: AdminUser) => void }) {
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const result = await authApi.login(Object.fromEntries(new FormData(event.currentTarget)));
    setLoading(false);
    onDone(result.user);
  };

  return (
    <main className="admin-login">
      <section className="login-copy">
        <span>Admin Web / Production Console</span>
        <h1>后台管理控制台</h1>
        <p>面向超级管理员、品牌管理员、审核员和技术运维，默认走 mock.js，联调时切换真实 API。</p>
        <div className="login-feature-grid">
          <article><strong>动态菜单</strong><small>后端配置启停与排序</small></article>
          <article><strong>权限隔离</strong><small>按角色和租户渲染模块</small></article>
          <article><strong>审计可追踪</strong><small>关键操作写入日志</small></article>
        </div>
      </section>
      <form className="login-card" onSubmit={submit}>
        <div className="login-card-badge">AI Script Admin</div>
        <h2>管理员登录</h2>
        <p>使用后台账号进入管理控制台。</p>
        <label>账号<input name="account" defaultValue="admin@ai-script.local" /></label>
        <label>密码<input name="password" type="password" defaultValue="123456" /></label>
        <button disabled={loading}>{loading ? '登录中...' : '进入后台'}</button>
      </form>
    </main>
  );
}
