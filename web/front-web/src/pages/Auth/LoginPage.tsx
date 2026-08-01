import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LockOutlined, MailOutlined, MobileOutlined, ReloadOutlined, SafetyCertificateOutlined, WechatOutlined } from '@ant-design/icons';
import { message, Modal, QRCode } from 'antd';
import { authApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import type { SmsScene } from '../../types/user';
import AuthLayout from './AuthLayout';
import LegalDocumentDialog, { type LegalDocumentType } from './LegalDocumentDialog';
import './auth.css';

type LoginMode = 'sms' | 'password' | 'wechat';

const LoginPage = () => {
  const [mode, setMode] = useState<LoginMode>('sms');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [wechatUrl, setWechatUrl] = useState('');
  const [wechatStatus, setWechatStatus] = useState('打开微信扫一扫，首次扫码将自动创建账号');
  const [bindPhone, setBindPhone] = useState('');
  const [bindCode, setBindCode] = useState('');
  const [legalType, setLegalType] = useState<LegalDocumentType | null>(null);
  const pollTimer = useRef<number>();
  const { login, smsLogin, bindPhone: submitBindPhone, acceptAuth, isAuthenticated, isLoading, needsPhoneBinding } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || (location.state as { from?: Location } | null)?.from?.pathname || '/home';
  const registerPath = `/register?redirect=${encodeURIComponent(redirect)}`;

  useEffect(() => {
    if (isAuthenticated && !needsPhoneBinding) navigate(redirect, { replace: true });
  }, [isAuthenticated, navigate, needsPhoneBinding, redirect]);

  useEffect(() => {
    if (!countdown) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
  }, []);

  const validatePhone = (value: string) => /^1\d{10}$/.test(value);

  const sendCode = async (target: string, scene: SmsScene) => {
    if (!validatePhone(target)) return message.warning('请输入正确的 11 位手机号');
    try {
      await authApi.sendCode(target, scene);
      setCountdown(60);
      message.success('阿里云短信验证码已发送');
    } catch (error) {
      message.error((error as Error).message || '验证码发送失败');
    }
  };

  const ensureAgreement = () => {
    if (agreed) return true;
    message.warning('请先阅读并同意用户协议和隐私政策');
    return false;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ensureAgreement()) return;
    try {
      if (mode === 'sms') await smsLogin(phone, code);
      if (mode === 'password') await login(email.trim().toLowerCase(), password);
    } catch (error) {
      message.error((error as Error).message || '登录失败，请检查输入');
    }
  };

  const startWechatLogin = async () => {
    if (!ensureAgreement()) return;
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    setWechatStatus('正在生成微信登录二维码…');
    try {
      const session = await authApi.startWechatLogin();
      setWechatUrl(session.authorizationUrl);
      setWechatStatus('打开微信扫一扫，扫码后请在手机上确认登录');
      pollTimer.current = window.setInterval(async () => {
        try {
          const status = await authApi.getWechatLoginStatus(session.state);
          if (status.status === 'complete' && status.login) {
            if (pollTimer.current) window.clearInterval(pollTimer.current);
            acceptAuth(status.login);
            setWechatStatus(status.login.needsPhoneBinding ? '登录成功，请绑定手机号' : '登录成功，正在进入工作台');
          } else if (status.status === 'expired') {
            if (pollTimer.current) window.clearInterval(pollTimer.current);
            setWechatStatus('二维码已过期，请刷新后重试');
          }
        } catch {
          if (pollTimer.current) window.clearInterval(pollTimer.current);
          setWechatStatus('登录状态查询失败，请刷新二维码');
        }
      }, 1800);
    } catch (error) {
      setWechatStatus((error as Error).message || '微信登录暂不可用，请检查开放平台配置');
    }
  };

  const switchMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    if (nextMode === 'wechat' && !wechatUrl && agreed) void startWechatLogin();
  };

  const handleBindPhone = async () => {
    try {
      await submitBindPhone(bindPhone, bindCode);
      message.success('手机号绑定成功');
      navigate(redirect, { replace: true });
    } catch (error) {
      message.error((error as Error).message || '手机号绑定失败');
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card" aria-label="登录">
        <header>
          <span>WELCOME BACK</span>
          <h2>欢迎登录 AI Script</h2>
          <p>未注册手机号验证后将自动创建账号</p>
        </header>

        <div className="auth-mode-tabs" role="tablist" aria-label="登录方式">
          <button className={mode === 'sms' ? 'active' : ''} onClick={() => switchMode('sms')}>短信登录</button>
          <button className={mode === 'password' ? 'active' : ''} onClick={() => switchMode('password')}>邮箱密码</button>
          <button className={mode === 'wechat' ? 'active' : ''} onClick={() => switchMode('wechat')}>微信扫码</button>
        </div>

        {mode !== 'wechat' ? (
          <form onSubmit={handleSubmit}>
            {mode === 'sms' ? (
              <>
                <label><span>手机号</span><div className="auth-input"><MobileOutlined /><b>+86</b><input inputMode="numeric" maxLength={11} placeholder="请输入手机号" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} /></div></label>
                <label><span>短信验证码</span><div className="auth-input auth-code-input"><SafetyCertificateOutlined /><input inputMode="numeric" maxLength={6} placeholder="请输入 6 位验证码" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /><button type="button" disabled={countdown > 0} onClick={() => void sendCode(phone, 'login')}>{countdown ? `${countdown}s` : '获取验证码'}</button></div></label>
              </>
            ) : (
              <>
                <label><span>邮箱</span><div className="auth-input"><MailOutlined /><input type="email" placeholder="请输入注册邮箱" value={email} onChange={(e) => setEmail(e.target.value)} /></div></label>
                <label><span>密码</span><div className="auth-input"><LockOutlined /><input type="password" placeholder="请输入登录密码" value={password} onChange={(e) => setPassword(e.target.value)} /></div></label>
              </>
            )}
            <button type="submit" className="auth-submit-button" disabled={isLoading}>{isLoading ? '登录中…' : '登录'}</button>
          </form>
        ) : (
          <div className="auth-wechat-panel">
            <div className="auth-qr-wrap">
              {wechatUrl ? <QRCode value={wechatUrl} size={188} bordered={false} /> : <WechatOutlined />}
            </div>
            <strong><WechatOutlined /> 微信扫码登录</strong>
            <p>{wechatStatus}</p>
            <button className="auth-refresh-button" onClick={() => void startWechatLogin()}><ReloadOutlined /> {wechatUrl ? '刷新二维码' : '生成二维码'}</button>
          </div>
        )}

        <label className="auth-agreement"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>我已阅读并同意 <button type="button" onClick={(event) => { event.preventDefault(); setLegalType('userAgreement'); }}>《用户协议》</button> 和 <button type="button" onClick={(event) => { event.preventDefault(); setLegalType('privacyPolicy'); }}>《隐私政策》</button></span></label>
        <footer><span>还没有完整账号？</span><button onClick={() => navigate(registerPath)}>手机号注册</button></footer>
      </div>

      <Modal open={isAuthenticated && needsPhoneBinding} closable={false} footer={null} centered width={430} className="auth-bind-modal" maskClosable={false}>
        <div className="auth-bind-content">
          <span className="auth-bind-icon"><WechatOutlined /></span>
          <h3>微信登录成功</h3>
          <p>绑定手机号后即可进入工作台；如果手机号已经注册，会自动绑定到原账号。</p>
          <label><span>手机号</span><div className="auth-input"><MobileOutlined /><b>+86</b><input inputMode="numeric" maxLength={11} placeholder="请输入手机号" value={bindPhone} onChange={(e) => setBindPhone(e.target.value.replace(/\D/g, ''))} /></div></label>
          <label><span>验证码</span><div className="auth-input auth-code-input"><SafetyCertificateOutlined /><input inputMode="numeric" maxLength={6} placeholder="短信验证码" value={bindCode} onChange={(e) => setBindCode(e.target.value.replace(/\D/g, ''))} /><button type="button" disabled={countdown > 0} onClick={() => void sendCode(bindPhone, 'bind')}>{countdown ? `${countdown}s` : '获取验证码'}</button></div></label>
          <button className="auth-submit-button" disabled={isLoading} onClick={() => void handleBindPhone()}>{isLoading ? '绑定中…' : '绑定并进入工作台'}</button>
        </div>
      </Modal>
      <LegalDocumentDialog type={legalType} onClose={() => setLegalType(null)} />
    </AuthLayout>
  );
};

export default LoginPage;
