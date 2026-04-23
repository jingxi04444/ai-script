import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

export default function Login({ onLogin, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#00d084] to-[#00a86b] rounded-2xl mb-4">
            <span className="text-3xl font-bold text-black">北</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">欢迎回来</h1>
          <p className="text-gray-500">登录北钥AI电商视频系统</p>
        </div>

        <div className="bg-[#1e1e1e] rounded-2xl p-8 border border-[#2a2a2a]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                邮箱地址
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#3a3a3a] bg-[#0a0a0a] text-[#00d084] focus:ring-[#00d084] focus:ring-offset-0"
                />
                <span className="text-sm text-gray-400">记住我</span>
              </label>
              <button type="button" className="text-sm text-[#00d084] hover:text-[#00e894] transition-colors">
                忘记密码？
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-[#00d084] text-black font-semibold py-3 rounded-lg hover:bg-[#00e894] transition-all"
            >
              登录
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-500">还没有账号？</span>
            <button
              onClick={onSwitchToRegister}
              className="ml-2 text-[#00d084] hover:text-[#00e894] font-medium transition-colors"
            >
              立即注册
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
