import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import HomePage from './components/HomePage';
import Sidebar from './components/Sidebar';
import GlobalSettings from './components/GlobalSettings';
import SellingPoints from './components/SellingPoints';
import ViralAnalysis from './components/ViralAnalysis';
import Storyboard from './components/Storyboard';
import SceneRole from './components/SceneRole';
import Dubbing from './components/Dubbing';
import VideoPreview from './components/VideoPreview';

type AppView = 'login' | 'register' | 'home' | 'workspace';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [activeStep, setActiveStep] = useState('global');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentView('home');
  };

  const handleRegister = () => {
    setIsAuthenticated(true);
    setCurrentView('home');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('login');
  };

  const handleCreateProject = () => {
    setActiveStep('global');
    setCurrentView('workspace');
  };

  const renderContent = () => {
    switch (activeStep) {
      case 'global':
        return <GlobalSettings />;
      case 'selling-points':
        return <SellingPoints />;
      case 'viral-analysis':
        return <ViralAnalysis />;
      case 'storyboard':
        return <Storyboard />;
      case 'scene-role':
        return <SceneRole />;
      case 'video-gen':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#00d084] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎬</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">分镜视频生成</h3>
              <p className="text-gray-500">AI 正在为您生成精彩的视频片段...</p>
            </div>
          </div>
        );
      case 'dubbing':
        return <Dubbing />;
      case 'preview':
        return <VideoPreview />;
      case 'analytics':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#00d084] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">投放数据分析</h3>
              <p className="text-gray-500">数据分析功能即将上线</p>
            </div>
          </div>
        );
      default:
        return <GlobalSettings />;
    }
  };

  if (currentView === 'login') {
    return (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setCurrentView('register')}
      />
    );
  }

  if (currentView === 'register') {
    return (
      <Register
        onRegister={handleRegister}
        onSwitchToLogin={() => setCurrentView('login')}
      />
    );
  }

  if (currentView === 'home') {
    return (
      <HomePage
        onCreateProject={handleCreateProject}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="size-full flex bg-[#0a0a0a]">
      <Sidebar
        activeStep={activeStep}
        onStepChange={setActiveStep}
        onBackToHome={() => setCurrentView('home')}
      />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">{renderContent()}</div>
      </main>
    </div>
  );
}
