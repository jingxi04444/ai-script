import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ParsingManagement } from './components/ParsingManagement';
import { KnowledgeBase } from './components/KnowledgeBase';
import { AuditWorkflow } from './components/AuditWorkflow';
import { MaterialsManagement } from './components/MaterialsManagement';
import { Analytics } from './components/Analytics';
import { SystemManagement } from './components/SystemManagement';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const menuTitles: Record<string, string> = {
    dashboard: '数据概览',
    parsing: '数据采集与解析管理',
    knowledge: '知识库管理',
    audit: '审核工作流管理',
    materials: '视频素材与项目库',
    analytics: '投放数据看板',
    system: '系统与权限管理',
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'parsing':
        return <ParsingManagement />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'audit':
        return <AuditWorkflow />;
      case 'materials':
        return <MaterialsManagement />;
      case 'analytics':
        return <Analytics />;
      case 'system':
        return <SystemManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      <Sidebar activeMenu={activeMenu} onMenuClick={setActiveMenu} />

      <div className="flex-1 flex flex-col">
        <Header
          title={menuTitles[activeMenu]}
          isDark={isDark}
          onToggleTheme={() => setIsDark((prev) => !prev)}
        />

        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}