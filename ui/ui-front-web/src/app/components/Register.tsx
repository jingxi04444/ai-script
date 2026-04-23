import { useState } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';

interface RegisterProps {
  onRegister: () => void;
  onSwitchToLogin: () => void;
}

export default function Register({ onRegister, onSwitchToLogin }: RegisterProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('两次密码不一致');
      return;
    }
    if (!agreeToTerms) {
      alert('请同意服务条款');
      return;
    }
    onRegister();
  };

  const passwordStrength = () => {
    const password = formData.password;
    if (password.length === 0) return { label: '', color: '' };
    if (password.length < 6) return { label: '弱', color: 'text-red-500' };
    if (password.length < 10) return { label: '中等', color: 'text-yellow-500' };
    return { label: '强', color: 'text-[#00d084]' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#00d084] to-[#00a86b] rounded-2xl mb-4">
            <span className="text-3xl font-bold text-black">北</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">创建账号</h1>
          <p className="text-gray-500">开始使用北钥AI电商视频系统</p>
        </div>

        <div className="bg-[#1e1e1e] rounded-2xl p-8 border border-[#2a2a2a]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00d084] transition-all"
                placeholder="请输入用户名"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                邮箱地址
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00d084] transition-all"
                placeholder="请输入邮箱"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00d084] transition-all pr-12"
                  placeholder="请输入密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2 text-xs">
                  <span className="text-gray-500">密码强度：</span>
                  <span className={`font-medium ${strength.color}`}>{strength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                确认密码
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00d084] transition-all pr-12"
                  placeholder="请再次输入密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="mt-2 flex items-center gap-1 text-xs text-[#00d084]">
                  <Check className="w-3 h-3" />
                  <span>密码匹配</span>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-[#3a3a3a] bg-[#0a0a0a] text-[#00d084] focus:ring-[#00d084] focus:ring-offset-0"
              />
              <span className="text-sm text-gray-400">
                我已阅读并同意
                <button type="button" className="text-[#00d084] hover:text-[#00e894] mx-1">
                  服务条款
                </button>
                和
                <button type="button" className="text-[#00d084] hover:text-[#00e894] ml-1">
                  隐私政策
                </button>
              </span>
            </label>

            <button
              type="submit"
              className="w-full bg-[#00d084] text-black font-semibold py-3 rounded-lg hover:bg-[#00e894] transition-all"
            >
              注册
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-500">已有账号？</span>
            <button
              onClick={onSwitchToLogin}
              className="ml-2 text-[#00d084] hover:text-[#00e894] font-medium transition-colors"
            >
              立即登录
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          © 2026 北钥AI. 保留所有权利
        </div>
      </div>
    </div>
  );
}
