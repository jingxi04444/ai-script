import { useState } from 'react';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';

const RegisterPage = () => {
  const { login } = useAuthStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
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
      <section className="auth-card">
        <div className="auth-mode-tabs">
          <button>登录</button>
          <button className="active">注册</button>
        </div>
        <header>
          <span>Create Account</span>
          <h2>创建账号</h2>
        </header>
        <form onSubmit={handleSubmit}>
          <label><span>手机号 / 邮箱</span><input placeholder="请输入手机号或邮箱" /></label>
          <label><span>验证码</span><div className="auth-code-field"><input placeholder="输入验证码" /><button type="button">获取验证码</button></div></label>
          <label><span>密码</span><input type="password" placeholder="设置 8 位以上密码" /></label>
          <label><span>确认密码</span><input type="password" placeholder="再次输入密码" /></label>
          <button type="submit" className="auth-submit-button">注册并登录</button>
        </form>
        <footer>
          <span>已有账号？</span>
          <button>去登录</button>
        </footer>
      </section>
    </main>
  );
};

export default RegisterPage;
