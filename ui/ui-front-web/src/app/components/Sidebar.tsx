import { Settings, Sparkles, TrendingUp, FileText, Users, Video, Mic, Eye, BarChart, Home } from 'lucide-react';

interface SidebarProps {
  activeStep: string;
  onStepChange: (step: string) => void;
  onBackToHome?: () => void;
}

const steps = [
  { id: 'global', label: '全局设定', icon: Settings, status: 'completed' },
  { id: 'selling-points', label: '产品卖点', icon: Sparkles, status: 'completed' },
  { id: 'viral-analysis', label: '爆款链接/原创', icon: TrendingUp, status: 'completed' },
  { id: 'storyboard', label: '分镜脚本', icon: FileText, status: 'active' },
  { id: 'scene-role', label: '场景角色道具', icon: Users, status: 'pending' },
  { id: 'video-gen', label: '分镜视频', icon: Video, status: 'pending' },
  { id: 'dubbing', label: '配音对口型', icon: Mic, status: 'pending' },
  { id: 'preview', label: '视频预览', icon: Eye, status: 'pending' },
  { id: 'analytics', label: '投放数据', icon: BarChart, status: 'pending' },
];

export default function Sidebar({ activeStep, onStepChange, onBackToHome }: SidebarProps) {
  return (
    <div className="w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <h1 className="text-xl font-bold text-white">北钥AI电商视频系统</h1>
      </div>

      {onBackToHome && (
        <div className="p-4 border-b border-[#2a2a2a]">
          <button
            onClick={onBackToHome}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-all"
          >
            <Home className="w-5 h-5" />
            <span className="text-sm font-medium">返回首页</span>
          </button>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;

          return (
            <button
              key={step.id}
              onClick={() => onStepChange(step.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-[#00d084] text-black'
                  : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {step.status === 'completed' && !isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#00d084] rounded-full" />
                )}
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d084] to-[#00a86b] flex items-center justify-center text-xs font-bold">
            北
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">AI创作助手</div>
            <div className="text-xs text-gray-500">在线</div>
          </div>
        </div>
      </div>
    </div>
  );
}
