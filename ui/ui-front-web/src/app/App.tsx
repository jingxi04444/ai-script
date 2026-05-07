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

const stepOrder = [
  'global',
  'selling-points',
  'viral-analysis',
  'storyboard',
  'scene-role',
  'video-gen',
  'dubbing',
  'preview',
  'analytics',
];

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

  const goToStep = (step: string) => {
    setActiveStep(step);
  };

  const goNext = () => {
    const currentIndex = stepOrder.indexOf(activeStep);
    const nextStep = stepOrder[currentIndex + 1];

    if (nextStep) {
      setActiveStep(nextStep);
    }
  };

  const goBack = () => {
    const currentIndex = stepOrder.indexOf(activeStep);
    const previousStep = stepOrder[currentIndex - 1];

    if (previousStep) {
      setActiveStep(previousStep);
    }
  };

  const renderContent = () => {
    switch (activeStep) {
      case 'global':
        return <GlobalSettings onNext={goNext} />;
      case 'selling-points':
        return <SellingPoints onNext={goNext} onBack={goBack} />;
      case 'viral-analysis':
        return <ViralAnalysis onNext={goNext} onBack={goBack} />;
      case 'storyboard':
        return <Storyboard onNext={goNext} onBack={goBack} />;
      case 'scene-role':
        return <SceneRole onNext={goNext} onBack={goBack} />;
      case 'video-gen':
        return (
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="text-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-10 max-w-lg">
              <div className="w-16 h-16 bg-[#00d084] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎬</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">分镜视频生成</h3>
              <p className="text-gray-500 mb-6">AI 正在为您生成精彩的视频片段，生成完成后进入配音与对口型。</p>
              <div className="flex justify-center gap-3">
                <button onClick={goBack} className="px-5 py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all">
                  返回配置
                </button>
                <button onClick={goNext} className="px-5 py-3 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all">
                  全部生成完成
                </button>
              </div>
            </div>
          </div>
        );
      case 'dubbing':
        return <Dubbing onNext={goNext} onBack={goBack} />;
      case 'preview':
        return <VideoPreview onNext={goNext} onBack={goBack} />;
      case 'analytics':
        return (
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="text-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-10 max-w-lg">
              <div className="w-16 h-16 bg-[#00d084] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">投放数据分析</h3>
              <p className="text-gray-500 mb-6">项目流程已完成。后续可接入发布后的播放、点赞、收藏、分享和转化数据。</p>
              <div className="flex justify-center gap-3">
                <button onClick={goBack} className="px-5 py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all">
                  返回预览
                </button>
                <button onClick={() => setCurrentView('home')} className="px-5 py-3 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all">
                  完成并回首页
                </button>
              </div>
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
        onStepChange={goToStep}
        onBackToHome={() => setCurrentView('home')}
      />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">{renderContent()}</div>
      </main>
    </div>
  );
}
