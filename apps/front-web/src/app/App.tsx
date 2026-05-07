import { FormEvent, useEffect, useState } from 'react';
import { mockApi } from './mock.js';

type User = {
  id: string;
  name: string;
  tenantName: string;
  role: string;
};

type Project = {
  id: string;
  title: string;
  product: string;
  status: string;
  currentStep: string;
  platform: string;
  updatedAt: string;
  progress: number;
};

type Toast = {
  tone: 'success' | 'info' | 'warning';
  message: string;
};

type ThemeKey = 'green' | 'blue' | 'orange';

type UploadModalState = {
  title: string;
  type: string;
  accept: string;
  hint: string;
} | null;

const themes: Array<{ key: ThemeKey; label: string }> = [
  { key: 'green', label: '松石绿' },
  { key: 'blue', label: '星舰蓝' },
  { key: 'orange', label: '日落橙' },
];

const steps = [
  { id: 'global', label: '全局设定', short: '01' },
  { id: 'selling-points', label: '产品卖点', short: '02' },
  { id: 'source', label: '爆款 / 原创', short: '03' },
  { id: 'storyboard', label: '分镜脚本', short: '04' },
  { id: 'visual', label: '场景角色道具', short: '05' },
  { id: 'video', label: '分镜视频', short: '06' },
  { id: 'dubbing', label: '配音对口型', short: '07' },
  { id: 'preview', label: '视频预览', short: '08' },
  { id: 'analytics', label: '投放数据', short: '09' },
];

const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

function usePathname() {
  const [path, setPath] = useState(window.location.pathname + window.location.search);

  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  return path;
}

export default function App() {
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [theme, setTheme] = useState<ThemeKey>(() => (localStorage.getItem('front-theme') as ThemeKey) || 'green');

  const showToast = (message: string, tone: Toast['tone'] = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2200);
  };

  const cycleTheme = () => {
    const currentIndex = themes.findIndex((item) => item.key === theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length].key;
    setTheme(nextTheme);
    showToast(`主题色已切换为${themes.find((item) => item.key === nextTheme)?.label || '默认主题'}`);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('front-theme', theme);
  }, [theme]);

  if (path.startsWith('/share/scripts/')) {
    return <ShareScriptPage />;
  }

  if (path.startsWith('/register')) {
    return <AuthPage mode="register" onDone={(nextUser) => { setUser(nextUser); navigate('/projects'); }} />;
  }

  if (path.startsWith('/login') || !user) {
    return <AuthPage mode="login" onDone={(nextUser) => { setUser(nextUser); navigate('/projects'); }} />;
  }

  if (path.startsWith('/projects/') && path.includes('/workspace')) {
    const id = path.split('/')[2];
    return <WorkspacePage projectId={id} user={user} showToast={showToast} toast={toast} theme={theme} onThemeToggle={cycleTheme} />;
  }

  return <ProjectHomePage user={user} showToast={showToast} toast={toast} theme={theme} onThemeToggle={cycleTheme} onLogout={() => { setUser(null); navigate('/login'); }} />;
}

function AuthPage({ mode, onDone }: { mode: 'login' | 'register'; onDone: (user: User) => void }) {
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const action = mode === 'login' ? mockApi.login : mockApi.register;
    const result = await action({
      name: form.get('name'),
      account: form.get('account'),
      password: form.get('password'),
    }) as { user: User };
    setLoading(false);
    onDone(result.user);
  };

  return (
    <main className="login-screen">
      <div className="login-wrap">
        <div className="login-head">
          <div className="login-logo">北</div>
          <h1>{mode === 'login' ? '欢迎回来' : '创建账号'}</h1>
          <p>{mode === 'login' ? '登录北钥AI电商视频系统' : '注册后进入北钥AI电商视频系统'}</p>
        </div>

        <form className="login-card" onSubmit={submit}>
          {mode === 'register' && <Field label="姓名" name="name" placeholder="请输入姓名" />}
          <Field label="邮箱地址" name="account" placeholder="请输入邮箱" />
          <Field label="密码" name="password" placeholder="请输入密码" type="password" />
          {mode === 'login' && (
            <div className="login-options">
              <label><input type="checkbox" /> 记住我</label>
              <button type="button">忘记密码？</button>
            </div>
          )}
          <button className="primary-button login-submit" disabled={loading}>{loading ? '处理中...' : mode === 'login' ? '登录' : '注册并进入'}</button>
          <div className="login-switch">
            <span>{mode === 'login' ? '还没有账号？' : '已有账号？'}</span>
            <button type="button" onClick={() => navigate(mode === 'login' ? '/register' : '/login')}>
              {mode === 'login' ? '立即注册' : '立即登录'}
            </button>
          </div>
        </form>

        <div className="login-foot">© 2026 北钥AI. 保留所有权利</div>
      </div>
    </main>
  );
}

function ProjectHomePage({ user, showToast, toast, theme, onThemeToggle, onLogout }: { user: User; showToast: (message: string, tone?: Toast['tone']) => void; toast: Toast | null; theme: ThemeKey; onThemeToggle: () => void; onLogout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('全部剧本');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('最新更新');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    mockApi.getProjects().then((data: Project[]) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  const createProject = async () => {
    const project = await mockApi.createProject() as Project;
    showToast('项目已创建，进入 9 步工作台。');
    navigate(`/projects/${project.id}/workspace?step=global`);
  };

  const sidebarItems = ['全部剧本', '共同剧本', '按角色组显示', '分镜脚本', '分镜视频', '配音对口型', '视频预览'];
  const filteredProjects = projects.filter((project) => project.title.includes(searchQuery) || project.product.includes(searchQuery));

  return (
    <main className="prototype-home">
      {toast && <ToastView toast={toast} />}
      <header className="home-topnav">
        <div className="home-logo-group">
          <div className="home-logo">北</div>
          <h1>纳米视频流水线</h1>
        </div>
        <div className="home-top-actions">
          <button>新增广告</button>
          <button className="home-primary" onClick={createProject}>+ 我的项目</button>
          <button>我户IP</button>
          <ThemeButton theme={theme} onClick={onThemeToggle} />
          <div className="home-user-menu">
            <button onClick={() => setShowUserMenu(!showUserMenu)}>企业版</button>
            {showUserMenu && (
              <div className="home-user-popover">
                <button>设置</button>
                <button className="danger-text" onClick={onLogout}>退出登录</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="home-body">
        <aside className="home-sidebar">
          {sidebarItems.map((item) => (
            <button key={item} className={activeTab === item ? 'active' : ''} onClick={() => setActiveTab(item)}>
              <span />
              {item}
            </button>
          ))}
        </aside>

        <section className="home-content">
          <div className="home-toolbar">
            <button className="toolbar-button">共同</button>
            <div className="toolbar-right">
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option>全部更新区</option>
                <option>最新更新</option>
                <option>最早创建</option>
              </select>
              <select>
                <option>更新时间倒序</option>
                <option>更新时间顺序</option>
              </select>
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索内容" />
            </div>
          </div>

          <div className="home-grid">
            <button className="create-project-card" onClick={createProject}>
              <div>+</div>
              <span>创建项目</span>
            </button>

            {loading ? <div className="home-empty">正在读取 mock 数据...</div> : filteredProjects.map((project) => (
              <article className="prototype-project-card" key={project.id} onClick={() => navigate(`/projects/${project.id}/workspace?step=${project.currentStep}`)}>
                <div className="project-folder-area">
                  <div className="folder-icon">▰</div>
                  <span>{project.progress ? Math.max(1, Math.round(project.progress / 10)) : 1} 个视频</span>
                </div>
                <div className="project-info-row">
                  <div>
                    <h3>{project.product || project.title}</h3>
                    <p>最后更新: {project.updatedAt}</p>
                  </div>
                  <button onClick={(event) => event.stopPropagation()}>⋮</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function WorkspacePage({ projectId, user, showToast, toast, theme, onThemeToggle }: { projectId: string; user: User; showToast: (message: string, tone?: Toast['tone']) => void; toast: Toast | null; theme: ThemeKey; onThemeToggle: () => void }) {
  const queryStep = new URLSearchParams(window.location.search).get('step') || 'global';
  const [activeStep, setActiveStep] = useState(queryStep);
  const [project, setProject] = useState<Project | null>(null);
  const activeIndex = Math.max(steps.findIndex((step) => step.id === activeStep), 0);

  useEffect(() => {
    mockApi.getProject(projectId).then((data: Project) => setProject(data));
  }, [projectId]);

  const setStep = (step: string) => {
    setActiveStep(step);
    window.history.replaceState({}, '', `/projects/${projectId}/workspace?step=${step}`);
  };

  const next = () => {
    const nextStep = steps[activeIndex + 1];
    if (nextStep) setStep(nextStep.id);
  };

  return (
    <main className="workspace-shell">
      <aside className="workspace-sidebar">
        <button className="back-button" onClick={() => navigate('/projects')}>← 返回项目</button>
        <div className="workspace-brand">北钥 AI 工作台</div>
        <nav>
          {steps.map((step, index) => (
            <button key={step.id} className={step.id === activeStep ? 'active' : index < activeIndex ? 'done' : ''} onClick={() => setStep(step.id)}>
              <span>{step.short}</span>
              {step.label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="workspace-main">
        <Topbar user={user} compact theme={theme} onThemeToggle={onThemeToggle} />
        {toast && <ToastView toast={toast} />}
        <div className="workspace-title panel">
          <div>
            <span className="eyebrow">{project?.id || projectId}</span>
            <h1>{project?.title || '加载项目中...'}</h1>
          </div>
          <div className="status-pill">以后端项目状态恢复步骤</div>
        </div>
        <StepContent step={activeStep} projectId={projectId} onNext={next} showToast={showToast} />
      </section>
    </main>
  );
}

function StepContent({ step, projectId, onNext, showToast }: { step: string; projectId: string; onNext: () => void; showToast: (message: string, tone?: Toast['tone']) => void }) {
  const [videoRatio, setVideoRatio] = useState('9:16');
  const [videoType, setVideoType] = useState('剧情口播');
  const [platform, setPlatform] = useState('抖音');
  const [productName, setProductName] = useState('宠鲜鲜智能加热饭盒');
  const [brief, setBrief] = useState('宠鲜鲜智能加热饭盒，主打 20 分钟快速加热、分层不串味、通勤便携。');
  const [sourceMode, setSourceMode] = useState<'viral' | 'original'>('viral');
  const [scriptName, setScriptName] = useState('宠鲜鲜加热饭盒_职场加班版_v3');
  const [assets, setAssets] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [storyboard, setStoryboard] = useState<any[]>([]);
  const [task, setTask] = useState<any>(null);
  const [uploadModal, setUploadModal] = useState<UploadModalState>(null);

  useEffect(() => {
    mockApi.getSellingAssets().then((data: any[]) => setAssets(data));
  }, []);

  const saveAndNext = async (stepName: string, data = {}) => {
    await mockApi.saveStep({ projectId, step: stepName, data });
    showToast('当前步骤已保存。');
    onNext();
  };

  const openUpload = (modal: NonNullable<UploadModalState>) => setUploadModal(modal);

  const completeUpload = async (file: File | null) => {
    if (!file || !uploadModal) {
      showToast('请选择文件后再上传。', 'warning');
      return;
    }
    const result = await mockApi.uploadFile({ type: uploadModal.type, fileName: file.name }) as { fileName: string };
    showToast(`${result.fileName} 已上传到 ${uploadModal.title}。`);
    setUploadModal(null);
  };

  const panel = (content: React.ReactNode) => <>{content}<FileUploadModal modal={uploadModal} onClose={() => setUploadModal(null)} onSubmit={completeUpload} /></>;

  if (step === 'global') {
    return panel(<StepPanel title="步骤 1：全局设定" intro="确定视频比例、内容类型和投放平台，为后续生成提供方向。" actions={<button className="primary-button" onClick={() => saveAndNext('global')}>保存并进入产品卖点</button>}>
      <OptionSection title="视频比例" subtitle="影响分镜画面布局和导出尺寸">
        <div className="choice-grid three">
          {[
            ['9:16', '抖音竖版，默认推荐'],
            ['16:9', '横版内容，适合教程类'],
            ['1:1', '图文混合，适配多场景'],
          ].map(([label, note]) => <button className={videoRatio === label ? 'choice active' : 'choice'} key={label} onClick={() => setVideoRatio(label)}><strong>{label}</strong><span>{note}</span></button>)}
        </div>
      </OptionSection>
      <OptionSection title="视频类型" subtitle="决定脚本文风和镜头节奏">
        <div className="choice-grid five">
          {['剧情口播', '产品展示', '教程干货', '情感共鸣', '其他'].map((item) => <button className={videoType === item ? 'choice active' : 'choice'} key={item} onClick={() => setVideoType(item)}>{item}</button>)}
        </div>
      </OptionSection>
      <OptionSection title="投放平台" subtitle="适配平台节奏、合规和内容表达">
        <div className="choice-grid four">
          {[
            ['抖音', '重节奏、强前 3 秒吸引'],
            ['小红书', '重场景、重种草表达'],
            ['视频号', '重信任感与转化链路'],
            ['快手', '重真实感与生活化表达'],
          ].map(([label, note]) => <button className={platform === label ? 'choice active' : 'choice'} key={label} onClick={() => setPlatform(label)}><strong>{label}</strong><span>{note}</span></button>)}
        </div>
      </OptionSection>
      <div className="summary-grid">
        <Metric label="视频比例" value={videoRatio} />
        <Metric label="视频类型" value={videoType} />
        <Metric label="投放平台" value={platform} />
      </div>
    </StepPanel>);
  }

  if (step === 'selling-points') {
    return panel(<StepPanel title="步骤 2：产品卖点" intro="支持模板上传、卖点资产库复用和 AI 优化 Brief。" actions={<><button className="secondary-button" onClick={() => showToast('草稿已保存到 mock 项目。')}>保存草稿</button><button className="secondary-button" onClick={async () => { const result = await mockApi.optimizeBrief({ brief }) as any; setBrief(result.summary); showToast('AI Brief 已优化。'); }}>AI 优化 Brief</button><button className="primary-button" onClick={() => saveAndNext('selling-points', { brief })}>保存并进入内容来源</button></>}>
      <div className="two-column">
        <OptionSection title="模板上传" subtitle="支持 xlsx / csv 标准产品卖点模板">
          <button className="upload-zone" onClick={() => openUpload({ title: '产品卖点模板', type: 'selling-point-template', accept: '.xlsx,.xls,.csv', hint: '请选择包含产品名称、卖点、人群、补充要求的 xlsx/csv 文件。' })}>选择文件上传产品卖点模板</button>
        </OptionSection>
        <OptionSection title="产品名称" subtitle="用于脚本标题、下载文件名和素材归档">
          <input value={productName} onChange={(event) => setProductName(event.target.value)} />
        </OptionSection>
      </div>
      <OptionSection title="产品特色卖点" subtitle="可区分主卖点和辅助卖点">
        <textarea value={brief} onChange={(event) => setBrief(event.target.value)} />
        <div className="choice-grid three compact-grid">
          {['20 分钟快速加热', '分层防串味设计', '通勤包可轻松放下'].map((item, index) => <button className={index === 0 ? 'choice active' : 'choice'} key={item}><strong>{index === 0 ? '主卖点' : '辅助卖点'}</strong><span>{item}</span></button>)}
        </div>
      </OptionSection>
      <OptionSection title="目标用户人群" subtitle="可多选，用于内容场景和话术定位">
        <div className="choice-grid six compact-grid">
          {['25-35岁女性', '职场白领', '通勤上班族', '精致妈妈', '学生党', '晚归加班人群'].map((item, index) => <button className={index < 2 ? 'choice active' : 'choice'} key={item}>{item}</button>)}
        </div>
      </OptionSection>
      <OptionSection title="产品卖点资产库" subtitle="从历史已审核卖点和行业场景包中复用">
      <div className="asset-row">
        {assets.map((asset) => <button key={asset.id} onClick={() => { setBrief(asset.main); showToast(`已复用「${asset.name}」。`); }}><strong>{asset.name}</strong><span>{asset.tag} / {asset.count} 条</span></button>)}
      </div>
      </OptionSection>
    </StepPanel>);
  }

  if (step === 'source') {
    return panel(<StepPanel title="步骤 3：爆款链接 / 原创" intro="爆款链接解析结果可手动修订，原创模式可选择模板库脚本。" actions={<><button className="secondary-button" onClick={() => showToast('内容来源草稿已保存。')}>保存草稿</button><button className="primary-button" onClick={() => saveAndNext('source', analysis)}>确认分析结果</button></>}>
      <div className="mode-tabs">
        <button className={sourceMode === 'viral' ? 'active' : ''} onClick={() => setSourceMode('viral')}>爆款复刻（推荐）</button>
        <button className={sourceMode === 'original' ? 'active' : ''} onClick={() => setSourceMode('original')}>原创模式</button>
      </div>
      {sourceMode === 'viral' ? <>
        <OptionSection title="输入爆款链接" subtitle="支持抖音、小红书视频链接，可解析文案、互动数据和结构公式">
          <div className="inline-form"><input placeholder="粘贴抖音 / 小红书链接" defaultValue="https://www.douyin.com/video/7423456789" /><button onClick={async () => { const data = await mockApi.parseSourceLink('mock-url') as any; setAnalysis(data); showToast('链接解析完成。'); }}>开始解析</button></div>
        </OptionSection>
        <OptionSection title="爆款分析手动修订" subtitle="解析结果可人工修改后再确认，避免数据缺失或结构判断偏差">
          <textarea defaultValue="3 秒强痛点开头 + 场景化放大 + 产品方案 + 效果展示 + 限时优惠；第 2 镜需强化 20 分钟快速加热。" />
          <div className="choice-grid three compact-grid">{['完整文案', '结构公式', '分镜报告'].map((item) => <button className="choice" key={item} onClick={() => showToast(`${item}已进入可编辑状态。`)}>修改{item}</button>)}</div>
        </OptionSection>
        {analysis && <div className="analysis-card"><h3>{analysis.title}</h3><p>{analysis.metrics}</p><strong>{analysis.structure}</strong>{analysis.report.map((line: string) => <span key={line}>{line}</span>)}</div>}
      </> : <>
        <OptionSection title="自定义结构公式" subtitle="适合已有成功脚本框架或品牌固定表达">
          <textarea defaultValue="3秒强痛点开头 + 场景化问题放大 + 产品方案 + 使用效果 + 评论区引导" />
          <button className="secondary-button" onClick={() => openUpload({ title: '原创参考文案', type: 'original-reference', accept: '.txt,.doc,.docx,.pdf', hint: '请选择已有脚本、参考文案或品牌内容说明。' })}>上传参考文案</button>
        </OptionSection>
        <OptionSection title="原创爆款模板库脚本" subtitle="选择结构模板后继续编辑，避免直接套用">
          <TemplateStrip />
        </OptionSection>
      </>}
    </StepPanel>);
  }

  if (step === 'storyboard') {
    return panel(<StepPanel title="步骤 4：分镜脚本生成与审核" intro="支持脚本命名、在线编辑、合规检测、原创度、下载与分享。" actions={<><button className="secondary-button" onClick={async () => { const data = await mockApi.runCompliance() as any; showToast(`${data.suggestion} 原创度 ${data.similarity}`, 'warning'); }}>运行合规检查</button><button className="primary-button" onClick={async () => { await mockApi.submitAudit(); showToast('脚本已提交审核。'); onNext(); }}>提交审核</button></>}>
      <div className="inline-form"><input value={scriptName} onChange={(event) => setScriptName(event.target.value)} /><button onClick={async () => { const data = await mockApi.generateStoryboard() as any[]; setStoryboard(data); showToast('分镜脚本已生成。'); }}>生成脚本</button></div>
      <div className="status-grid">
        <Metric label="脚本状态" value="待审核" />
        <Metric label="合规检查" value="1 处风险" />
        <Metric label="原创度" value="38%" />
      </div>
      <StoryboardTable rows={storyboard} />
      <div className="button-strip"><button className="secondary-button" onClick={() => showToast('脚本草稿已保存。')}>保存草稿</button><button className="secondary-button" onClick={async () => { const result = await mockApi.downloadScript(scriptName) as { fileName: string }; showToast(`${result.fileName} 已生成下载任务。`); }}>下载脚本</button><button className="secondary-button" onClick={async () => { const result = await mockApi.shareScript(scriptName) as { url: string }; showToast(`分享链接已生成：${result.url}`); }}>分享脚本</button><button className="secondary-button" onClick={async () => { const data = await mockApi.generateStoryboard() as any[]; setStoryboard(data); showToast('已按当前修改意见重新生成脚本。'); }}>重新生成</button></div>
    </StepPanel>);
  }

  if (step === 'visual') {
    return panel(<StepPanel title="步骤 5：场景、角色、道具" intro="为每个分镜绑定场景、角色、道具和风格参考图。" actions={<><button className="secondary-button" onClick={() => openUpload({ title: '风格参考图', type: 'style-reference', accept: '.png,.jpg,.jpeg,.webp', hint: '请选择场景风格图、人物参考图或产品参考图。' })}>上传素材</button><button className="secondary-button" onClick={() => showToast('AI 已生成候选场景图。')}>AI 生成场景</button><button className="primary-button" onClick={() => saveAndNext('visual')}>完成配置</button></>}>
      <div className="choice-grid four compact-grid">{['全部', '场景', '角色', '道具'].map((item, index) => <button className={index === 0 ? 'choice active' : 'choice'} key={item}>{item}</button>)}</div>
      <div className="config-grid">
        <ConfigBox title="场景" value="办公室 / 厨房 / 户外 / 文本描述" />
        <ConfigBox title="角色" value="角色库预设 / 新建角色 / 数字人形象" />
        <ConfigBox title="道具" value="产品本身 / 辅助展示道具 / 自定义上传" />
        <ConfigBox title="风格参考图" value="上传图片，为 AI 生图/生视频提供指引" />
      </div>
      <AssetBoard />
    </StepPanel>);
  }

  if (step === 'video') {
    return panel(<StepPanel title="步骤 6：分镜视频生成" intro="按分镜生成视频片段，展示任务进度和失败重试状态。" actions={<><button className="secondary-button" onClick={async () => { setTask({ status: 'running', progress: 12, label: '视频生成任务已入队' }); showToast('视频生成任务已提交。'); }}>开始生成</button><button className="primary-button" onClick={onNext}>全部生成完成</button></>}>
      <div className="choice-grid three compact-grid">{['按全部分镜生成', '仅生成选中镜头', '失败镜头重试'].map((item, index) => <button className={index === 0 ? 'choice active' : 'choice'} key={item}>{item}</button>)}</div>
      <div className="choice-grid four compact-grid">{['可用', '产品特写好', '情绪到位', '需重制'].map((item) => <button className="choice" key={item}>标签：{item}</button>)}</div>
      <button className="secondary-button" onClick={async () => setTask(await mockApi.getTaskProgress())}>刷新任务进度</button>
      <TaskCard task={task || { status: 'pending', progress: 0, label: '等待开始生成' }} />
    </StepPanel>);
  }

  if (step === 'dubbing') {
    return panel(<StepPanel title="步骤 7：配音与对口型" intro="选择音色、上传音频或生成 TTS，并配置口型同步。" actions={<><button className="secondary-button" onClick={() => openUpload({ title: '自定义音频', type: 'custom-audio', accept: '.mp3,.wav,.m4a', hint: '请选择旁白音频或角色台词音频。' })}>上传音频</button><button className="secondary-button" onClick={() => showToast('AI 配音已生成并应用到所有分镜。')}>AI 生成配音</button><button className="primary-button" onClick={onNext}>音频配置完成</button></>}>
      <div className="mode-tabs"><button className="active">TTS 旁白模式</button><button>对口型模式</button></div>
      <div className="choice-grid four">{['甜美女声', '专业男声', '活力女声', '磁性男声'].map((voice, index) => <button className={index === 0 ? 'choice active' : 'choice'} key={voice}>{voice}</button>)}</div>
      <div className="config-grid"><ConfigBox title="语速" value="标准 / 慢速 / 快速" /><ConfigBox title="语调" value="自然 / 温柔 / 活力" /><ConfigBox title="音量" value="80%" /><ConfigBox title="自定义音频" value="上传替换当前旁白" /></div>
      <div className="config-grid"><ConfigBox title="模特面部视频" value="上传视频或选择数字人" /><ConfigBox title="口型同步精度" value="高精度（推荐）" /></div>
    </StepPanel>);
  }

  if (step === 'preview') {
    return panel(<StepPanel title="步骤 8：视频预览与素材管理" intro="时间轴预览、导出视频、分享成片。" actions={<><button className="secondary-button" onClick={() => showToast('视频分享链接已生成。')}>分享</button><button className="primary-button" onClick={async () => { const file = await mockApi.exportVideo() as any; showToast(`${file.fileName} 已导出。`); onNext(); }}>导出 / 发布完成</button></>}>
      <div className="preview-stage"><button>▶</button><span>00:03 / 00:14</span></div>
      <div className="timeline-strip">{['镜号01 3s', '镜号02 4s', '镜号03 3s', '镜号04 4s'].map((item, index) => <button className={index === 0 ? 'active' : ''} key={item}>{item}</button>)}</div>
      <div className="config-grid"><ConfigBox title="时间轴编辑" value="调整顺序 / 裁剪时长 / 添加转场" /><ConfigBox title="背景音乐" value="版权音乐库 / 上传自定义音乐" /><ConfigBox title="素材库" value="按标签、镜号、卖点检索" /><ConfigBox title="导出设置" value="1080P / 720P / 480P，MP4" /></div>
    </StepPanel>);
  }

  return panel(<StepPanel title="步骤 9：投放数据" intro="MVP 阶段先展示占位数据，后续接入平台回传和 A/B 测试。" actions={<><button className="secondary-button" onClick={() => showToast('分析报告导出任务已创建。')}>导出报告</button><button className="primary-button" onClick={() => navigate('/projects')}>完成并返回首页</button></>}>
    <div className="metric-grid"><Metric label="播放量" value="12.6 万" /><Metric label="互动率" value="8.4%" /><Metric label="转化订单" value="328" /></div>
    <div className="config-grid"><ConfigBox title="监测链接" value="可植入优惠码 / 购物车参数链接" /><ConfigBox title="数据回传" value="播放、点赞、评论、收藏、分享、订单" /><ConfigBox title="A/B 测试" value="同一卖点生成 3-5 个脚本版本" /><ConfigBox title="报表导出" value="单视频 / 多视频效果趋势" /></div>
  </StepPanel>);
}

function StepPanel({ title, intro, children, actions }: { title: string; intro: string; children: React.ReactNode; actions: React.ReactNode }) {
  return <section className="step-panel panel"><div className="step-header"><div><span className="eyebrow">Workspace Step</span><h2>{title}</h2><p>{intro}</p></div><div className="step-actions">{actions}</div></div>{children}</section>;
}

function OptionSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="option-section"><div className="option-section-head"><h3>{title}</h3><p>{subtitle}</p></div>{children}</section>;
}

function ConfigBox({ title, value }: { title: string; value: string }) {
  return <article className="config-box"><span>{title}</span><strong>{value}</strong></article>;
}

function FileUploadModal({ modal, onClose, onSubmit }: { modal: UploadModalState; onClose: () => void; onSubmit: (file: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setFile(null);
  }, [modal?.title]);

  if (!modal) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <span className="eyebrow">Mock Upload</span>
            <h3>{modal.title}</h3>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <p>{modal.hint}</p>
        <label className="file-picker">
          <input type="file" accept={modal.accept} onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <strong>{file ? file.name : '点击选择文件'}</strong>
          <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `支持格式：${modal.accept}`}</span>
        </label>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>取消</button>
          <button className="primary-button" onClick={() => onSubmit(file)}>确认上传</button>
        </div>
      </div>
    </div>
  );
}

function TemplateStrip() {
  const [templates, setTemplates] = useState<any[]>([]);
  useEffect(() => { mockApi.getOriginalTemplates().then((data: any[]) => setTemplates(data)); }, []);
  return <div className="template-strip">{templates.map((template) => <button key={template.id}><strong>{template.name}</strong><span>{template.structure}</span></button>)}</div>;
}

function StoryboardTable({ rows }: { rows: any[] }) {
  const visibleRows = rows.length ? rows : [{ shot: '待生成', type: '-', scene: '点击生成脚本后展示分镜表', line: '-', duration: '-', point: '-', risk: '-' }];
  return <div className="table-wrap"><table><thead><tr><th>镜号</th><th>景别</th><th>画面描述</th><th>台词</th><th>时长</th><th>卖点</th><th>风险</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.shot}><td>{row.shot}</td><td>{row.type}</td><td>{row.scene}</td><td>{row.line}</td><td>{row.duration}</td><td>{row.point}</td><td>{row.risk}</td></tr>)}</tbody></table></div>;
}

function AssetBoard() {
  const [assets, setAssets] = useState<any[]>([]);
  useEffect(() => { mockApi.getAssets().then((data: any[]) => setAssets(data)); }, []);
  return <div className="asset-board">{assets.map((asset) => <article key={asset.id}><span>{asset.type}</span><h3>{asset.name}</h3><p>{asset.tag}</p><strong>{asset.status}</strong></article>)}</div>;
}

function TaskCard({ task }: { task: any }) {
  return <div className="task-card"><div><span>{task.status}</span><strong>{task.label}</strong></div><div className="progress-track"><div style={{ width: `${task.progress}%` }} /></div><b>{task.progress}%</b></div>;
}

function ShareScriptPage() {
  const [script, setScript] = useState<any>(null);
  useEffect(() => { mockApi.getShareScript().then((data: any) => setScript(data)); }, []);
  return <main className="share-page panel"><span className="eyebrow">Readonly Share</span><h1>{script?.title || '加载分享脚本...'}</h1><p>状态：{script?.status || '-'}</p><StoryboardTable rows={script?.scenes || []} /></main>;
}

function ThemeButton({ theme, onClick }: { theme: ThemeKey; onClick: () => void }) {
  return <button className="theme-toggle" onClick={onClick}>主题：{themes.find((item) => item.key === theme)?.label}</button>;
}

function Topbar({ user, compact = false, theme, onThemeToggle }: { user: User; compact?: boolean; theme?: ThemeKey; onThemeToggle?: () => void }) {
  return <header className={compact ? 'topbar compact' : 'topbar'}><div><strong>{user.tenantName}</strong><span>{user.role}</span></div><div className="topbar-actions">{theme && onThemeToggle && <ThemeButton theme={theme} onClick={onThemeToggle} />}<button onClick={() => navigate('/login')}>{user.name} / 退出</button></div></header>;
}

function Field({ label, name, placeholder, type = 'text' }: { label: string; name: string; placeholder: string; type?: string }) {
  return <label className="field"><span>{label}</span><input name={name} placeholder={placeholder} type={type} required /></label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function ToastView({ toast }: { toast: Toast }) {
  return <div className={`toast ${toast.tone}`}>{toast.message}</div>;
}
