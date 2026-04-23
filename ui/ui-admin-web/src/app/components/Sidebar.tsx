import { Database, FileText, CheckCircle, FolderOpen, Settings, BarChart3, Home } from 'lucide-react';

interface SidebarProps {
  activeMenu: string;
  onMenuClick: (menu: string) => void;
}

export function Sidebar({ activeMenu, onMenuClick }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: '数据概览', icon: Home },
    { id: 'parsing', label: '数据采集管理', icon: Database },
    { id: 'knowledge', label: '知识库管理', icon: FileText },
    { id: 'audit', label: '审核工作流', icon: CheckCircle },
    { id: 'materials', label: '素材管理', icon: FolderOpen },
    { id: 'analytics', label: '投放数据看板', icon: BarChart3 },
    { id: 'system', label: '系统管理', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="font-bold text-xl">AI 脚本生成平台</h1>
        <p className="text-sm text-gray-400 mt-1">后台管理系统</p>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onMenuClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="text-sm text-gray-400">
          <p>登录用户: 系统管理员</p>
          <p className="mt-1">角色: 超级管理员</p>
        </div>
      </div>
    </aside>
  );
}
