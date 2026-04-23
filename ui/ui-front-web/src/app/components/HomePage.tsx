import { useState, useEffect, useRef } from 'react';
import { Plus, Folder, Search, MoreVertical, User, LogOut, Settings as SettingsIcon } from 'lucide-react';

interface HomePageProps {
  onCreateProject: () => void;
  onLogout: () => void;
}

export default function HomePage({ onCreateProject, onLogout }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('全部剧本');
  const [sortBy, setSortBy] = useState('最新更新');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const projects = [
    {
      id: 1,
      name: '自工宝',
      type: 'folder',
      updateTime: '2026-04-15 20:13',
      videoCount: 5,
    },
  ];

  const sidebarItems = [
    { id: 'all', label: '全部剧本', active: true },
    { id: 'shared', label: '共同剧本' },
    { id: 'roles', label: '按角色组显示' },
    { id: 'scripts', label: '分镜脚本' },
    { id: 'videos', label: '分镜视频' },
    { id: 'drafts', label: '配音对口型' },
    { id: 'trash', label: '视频预览' },
  ];

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col">
      {/* Top Navigation */}
      <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#00d084] to-[#00a86b] rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-black">北</span>
              </div>
              <h1 className="text-xl font-bold text-white">纳米视频流水线</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all flex items-center gap-2">
              <span>新增广告</span>
            </button>
            <button
              onClick={onCreateProject}
              className="px-4 py-2 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>我的项目</span>
            </button>
            <button className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all">
              我户IP
            </button>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>企业版</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg shadow-xl py-2 z-50">
                  <button className="w-full px-4 py-2 text-left text-white hover:bg-[#2a2a2a] transition-all flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4" />
                    <span>设置</span>
                  </button>
                  <div className="border-t border-[#2a2a2a] my-2" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#2a2a2a] transition-all flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] overflow-y-auto">
          <div className="p-4 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.label)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === item.label
                    ? 'bg-[#00d084] text-black'
                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-current" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all text-sm">
                  共同
                </button>
              </div>

              <div className="flex items-center gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#2a2a2a] border border-[#3a3a3a] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-[#00d084]"
                >
                  <option>全部更新区</option>
                  <option>最新更新</option>
                  <option>最早创建</option>
                </select>

                <select className="bg-[#2a2a2a] border border-[#3a3a3a] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-[#00d084]">
                  <option>更新时间倒序</option>
                  <option>更新时间顺序</option>
                </select>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索内容"
                    className="bg-[#2a2a2a] border border-[#3a3a3a] text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-[#00d084] w-64"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-4 gap-6">
              {/* Create New Project Card */}
              <button
                onClick={onCreateProject}
                className="aspect-[4/3] bg-[#1e1e1e] border-2 border-dashed border-[#3a3a3a] rounded-xl hover:border-[#00d084] transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-16 h-16 rounded-full bg-[#2a2a2a] flex items-center justify-center group-hover:bg-[#00d084] transition-all">
                  <Plus className="w-8 h-8 text-gray-500 group-hover:text-black" />
                </div>
                <span className="text-gray-500 group-hover:text-white transition-all">创建项目</span>
              </button>

              {/* Project Cards */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="aspect-[4/3] bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl hover:border-[#00d084] transition-all cursor-pointer overflow-hidden group"
                >
                  <div className="h-full flex flex-col">
                    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] relative">
                      <Folder className="w-20 h-20 text-[#00d084]" />
                      {project.videoCount && (
                        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                          {project.videoCount} 个视频
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-[#1a1a1a] border-t border-[#2a2a2a]">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate">{project.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            最后更新: {project.updateTime}
                          </p>
                        </div>
                        <button className="p-1 hover:bg-[#2a2a2a] rounded transition-all opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
