import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LockOutlined, MailOutlined, MobileOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { authApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import AuthLayout from './AuthLayout';
import LegalDocumentDialog, { type LegalDocumentType } from './LegalDocumentDialog';
import { getAuthErrorMessage } from './authError';
import './auth.css';

const RegisterPage = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [legalType, setLegalType] = useState<LegalDocumentType | null>(null);
  const { register, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/home';
  const loginPath = `/login?redirect=${encodeURIComponent(redirect)}`;

  useEffect(() => {
    if (isAuthenticated) navigate(redirect, { replace: true });
  }, [isAuthenticated, navigate, redirect]);

  useEffect(() => {
    if (!countdown) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const sendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) return message.warning('请输入正确的 11 位手机号');
    try {
      await authApi.sendCode(phone, 'register');
      setCountdown(60);
      message.success('阿里云短信验证码已发送');
    } catch (error) {
      message.error(getAuthErrorMessage(error, 'sendCode'));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!agreed) return message.warning('请先阅读并同意用户协议和隐私政策');
    if (!/^1\d{10}$/.test(phone)) return message.warning('请输入正确手机号');
    if (!/^\d{6}$/.test(code)) return message.warning('请输入 6 位短信验证码');
    if (!/^\S+@\S+\.\S+$/.test(email)) return message.warning('请输入正确邮箱');
    if (password.length < 8) return message.warning('密码至少 8 位');
    if (password !== confirmPassword) return message.warning('两次输入的密码不一致');
    try {
      await register({ phone, code, email: email.trim().toLowerCase(), password });
      navigate(redirect, { replace: true });
    } catch (error) {
      message.error(getAuthErrorMessage(error, 'register'));
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card auth-register-card" aria-label="注册">
        <header>
          <span>CREATE ACCOUNT</span>
          <h2>创建你的 AI Script 账号</h2>
          <p>手机号验证与邮箱均为必填，注册后自动登录</p>
        </header>
        <form onSubmit={handleSubmit}>
          <label><span>手机号</span><div className="auth-input"><MobileOutlined /><b>+86</b><input inputMode="numeric" maxLength={11} placeholder="请输入手机号" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} /></div></label>
          <label><span>短信验证码</span><div className="auth-input auth-code-input"><SafetyCertificateOutlined /><input inputMode="numeric" maxLength={6} placeholder="请输入验证码" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /><button type="button" disabled={countdown > 0} onClick={() => void sendCode()}>{countdown ? `${countdown}s` : '获取验证码'}</button></div></label>
          <label><span>邮箱</span><div className="auth-input"><MailOutlined /><input type="email" placeholder="请输入常用邮箱（必填）" value={email} onChange={(e) => setEmail(e.target.value)} /></div></label>
          <div className="auth-password-grid">
            <label><span>设置密码</span><div className="auth-input"><LockOutlined /><input type="password" placeholder="至少 8 位" value={password} onChange={(e) => setPassword(e.target.value)} /></div></label>
            <label><span>确认密码</span><div className="auth-input"><LockOutlined /><input type="password" placeholder="再次输入" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div></label>
          </div>
          <label className="auth-agreement"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>我已阅读并同意 <button type="button" onClick={(event) => { event.preventDefault(); setLegalType('userAgreement'); }}>《用户协议》</button> 和 <button type="button" onClick={(event) => { event.preventDefault(); setLegalType('privacyPolicy'); }}>《隐私政策》</button></span></label>
          <button type="submit" className="auth-submit-button" disabled={isLoading}>{isLoading ? '注册中…' : '注册并登录'}</button>
        </form>
        <footer><span>已有账号？</span><button onClick={() => navigate(loginPath)}>返回登录</button></footer>
      </div>
      <LegalDocumentDialog type={legalType} onClose={() => setLegalType(null)} />
    </AuthLayout>
  );
};

export default RegisterPage;
