import { useEffect, useState } from 'react';
import { Home, Image, Plus, RefreshCcw, Save, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import { systemApi, type SiteConfig } from '../../api/system';
import { uploadApi } from '../../api/upload';
import { PageHeader, SectionCard } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import HomeBannersPage from './HomeBannersPage';
import './page-visual-page.css';

type VisualTab = 'home' | 'banner' | 'script';

interface VisualItem {
  key: string;
  label: string;
  description?: string;
  headerLabel?: string;
  category?: string;
  iconUrl?: string;
  iconKey?: string;
  imageUrl?: string;
  imageKey?: string;
  linkUrl?: string;
}

interface HomeVisualConfig {
  navItems: VisualItem[];
  quickActions: VisualItem[];
  worksTitle: string;
  works: VisualItem[];
}

interface ScriptVisualConfig {
  assistantTitle: string;
  assistantSubtitle: string;
  assistantIconUrl?: string;
  assistantIconKey?: string;
  modeItems: VisualItem[];
}

const defaultHomeVisual: HomeVisualConfig = {
  navItems: [
    { key: 'home', label: '首页' },
    { key: 'create', label: '创作大厅' },
    { key: 'expert', label: '专家市场' },
    { key: 'projects', label: '我的项目' },
    { key: 'assets', label: '资产管理' },
  ],
  quickActions: [
    { key: 'create', label: '开始创作', description: '电商全链路从产品brief优化到成片输出' },
    { key: 'brief', label: '产品brief', description: '优化卖点并检测分数' },
    { key: 'generator', label: '脚本生成器', description: '精准高质量的生成脚本' },
    { key: 'viral', label: '爆款链接脚本复刻', description: '输入参考链接，即可获得高质量脚本' },
    { key: 'template', label: '脚本模板库', description: '内置大量优质脚本，一键即可出脚本' },
  ],
  worksTitle: '作品',
  works: [
    { key: 'work-home', label: '智能家居生活焕新', category: '家居家电' },
    { key: 'work-chair', label: '按摩椅舒适体验', category: '家居家电' },
    { key: 'work-headset', label: '耳机沉浸式种草', category: '电商种草视频' },
    { key: 'work-unboxing', label: '新品好物开箱推荐', category: '电商种草视频' },
    { key: 'work-drink', label: '饮品主图视觉广告', category: '主图广告' },
    { key: 'work-brand', label: '品牌年度形象片', category: 'TVC 宣传片' },
  ],
};

const defaultScriptVisual: ScriptVisualConfig = {
  assistantTitle: '铼河AI脚本生成器',
  assistantSubtitle: '你可以选择不同的创作方式，我来帮你完成脚本',
  modeItems: [
    { key: 'viral', label: '爆款链接复刻', headerLabel: '爆款复刻', description: '输入链接，自动拆解结构、节奏和卖点，快速复刻爆款表达。' },
    { key: 'template', label: '脚本模板库', headerLabel: '脚本模板库', description: '从热门模板里挑选合适范式，结合产品 Brief 快速生成脚本。' },
    { key: 'original', label: 'AI智能脚本', headerLabel: 'AI原创', description: '输入创作需求，AI 将帮你搭建完整脚本结构与口播内容。' },
    { key: 'mine', label: '我的模板库', headerLabel: '我的模板库', description: '收纳你自己的模板与脚本资产，沉淀私有创作风格。' },
  ],
};

const parseConfig = <T,>(value: string | undefined, fallback: T): T => {
  if (!value?.trim()) return fallback;
  try {
    return { ...fallback, ...JSON.parse(value) } as T;
  } catch {
    return fallback;
  }
};

const PageVisualPage = () => {
  const { notify } = useAdminShell();
  const [activeTab, setActiveTab] = useState<VisualTab>('home');
  const [config, setConfig] = useState<SiteConfig>({});
  const [homeVisual, setHomeVisual] = useState<HomeVisualConfig>(defaultHomeVisual);
  const [scriptVisual, setScriptVisual] = useState<ScriptVisualConfig>(defaultScriptVisual);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const value = await systemApi.getSiteConfig();
      setConfig(value);
      setHomeVisual(parseConfig(value.homeVisualConfig, defaultHomeVisual));
      setScriptVisual(parseConfig(value.scriptVisualConfig, defaultScriptVisual));
      setDirty(false);
    } catch {
      notify('页面视觉配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const persistVisualConfig = async (
    nextConfig: SiteConfig,
    nextHomeVisual: HomeVisualConfig,
    nextScriptVisual: ScriptVisualConfig,
  ) => {
    const next = await systemApi.updateSiteConfig({
      ...nextConfig,
      homeVisualConfig: JSON.stringify(nextHomeVisual),
      scriptVisualConfig: JSON.stringify(nextScriptVisual),
    });
    setConfig(next);
    setDirty(false);
    return next;
  };

  const save = async () => {
    setSaving(true);
    try {
      await persistVisualConfig(config, homeVisual, scriptVisual);
      notify('页面视觉配置已保存');
    } catch {
      notify('页面视觉配置保存失败');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (
    key: string,
    file: File | undefined,
    applyAndSave: (url: string, objectKey: string) => Promise<void> | void,
  ) => {
    if (!file) return;
    setUploadingKey(key);
    try {
      const result = await uploadApi.uploadFile(file);
      await applyAndSave(result.url, result.objectKey);
      notify('图片上传成功，已自动保存');
    } catch {
      setDirty(true);
      notify('图片上传或自动保存失败');
    } finally {
      setUploadingKey('');
    }
  };

  const updateHomeItem = (group: 'navItems' | 'quickActions' | 'works', index: number, patch: Partial<VisualItem>) => {
    setDirty(true);
    setHomeVisual((current) => ({
      ...current,
      [group]: current[group].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const updateScriptItem = (index: number, patch: Partial<VisualItem>) => {
    setDirty(true);
    setScriptVisual((current) => ({
      ...current,
      modeItems: current.modeItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const renderImageControl = (
    uploadKey: string,
    url: string | undefined,
    onChange: (url: string, objectKey: string) => Promise<void> | void,
  ) => (
    <div className="visual-image-control">
      <div className="visual-image-preview">{url ? <img src={url} alt="" /> : <Image size={18} />}</div>
      <label className="toolbar-btn upload-btn">
        <UploadCloud size={15} />{uploadingKey === uploadKey ? '上传中' : '上传'}
        <input type="file" hidden accept="image/*" onChange={(event) => void uploadImage(uploadKey, event.target.files?.[0], onChange)} />
      </label>
      {url && <button className="table-btn danger icon-only" type="button" title="移除图片并自动保存" onClick={async () => {
        setUploadingKey(uploadKey);
        try {
          await onChange('', '');
          notify('图片已移除并自动保存');
        } catch {
          setDirty(true);
          notify('图片移除后自动保存失败');
        } finally {
          setUploadingKey('');
        }
      }}><Trash2 size={14} /></button>}
    </div>
  );

  return (
    <div className="page-stack page-visual-page">
      <PageHeader
        title="页面视觉"
        description="集中维护用户端主页、轮播、脚本生成器的图标、图片、模块名称和展示文案。"
        actions={(
          <>
            <button className="toolbar-btn" type="button" onClick={load}><RefreshCcw size={16} />{loading ? '加载中' : '刷新'}</button>
            {activeTab !== 'banner' && <button className="toolbar-btn primary" type="button" onClick={save} disabled={saving}><Save size={16} />{saving ? '保存中' : '保存视觉配置'}</button>}
          </>
        )}
      />

      <nav className="visual-tabs" aria-label="页面视觉模块">
        <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}><Home size={16} />主页视觉</button>
        <button className={activeTab === 'banner' ? 'active' : ''} onClick={() => setActiveTab('banner')}><Image size={16} />首页轮播</button>
        <button className={activeTab === 'script' ? 'active' : ''} onClick={() => setActiveTab('script')}><Sparkles size={16} />脚本生成器</button>
      </nav>

      {activeTab !== 'banner' && (
        <div className="visual-save-bar">
          <span>{dirty ? '有尚未保存的文字或配置修改' : '当前配置已保存'}</span>
          <button className="toolbar-btn primary" type="button" onClick={() => void save()} disabled={saving}>
            <Save size={16} />{saving ? '保存中' : '保存当前修改'}
          </button>
        </div>
      )}

      {activeTab === 'home' && (
        <>
          <SectionCard title="首页品牌图标" description="用户端左侧栏最上方的品牌图标。">
            <div className="visual-brand-row">
              {renderImageControl('home-logo', config.homeLogoUrl as string | undefined, async (url, objectKey) => {
                const nextConfig = { ...config, homeLogoUrl: url, homeLogoKey: objectKey };
                setConfig(nextConfig);
                await persistVisualConfig(nextConfig, homeVisual, scriptVisual);
              })}
              <label className="visual-field"><span>图片 URL</span><input value={(config.homeLogoUrl as string) || ''} onChange={(event) => {
                setDirty(true);
                setConfig({ ...config, homeLogoUrl: event.target.value });
              }} /></label>
            </div>
          </SectionCard>

          <SectionCard title="左侧栏" description="修改导航名称和每个导航项的小图标。">
            <div className="visual-list">
              {homeVisual.navItems.map((item, index) => (
                <article className="visual-row" key={item.key}>
                  {renderImageControl(`nav-${item.key}`, item.iconUrl, async (url, objectKey) => {
                    const nextHomeVisual = {
                      ...homeVisual,
                      navItems: homeVisual.navItems.map((currentItem, itemIndex) => itemIndex === index
                        ? { ...currentItem, iconUrl: url, iconKey: objectKey }
                        : currentItem),
                    };
                    setHomeVisual(nextHomeVisual);
                    await persistVisualConfig(config, nextHomeVisual, scriptVisual);
                  })}
                  <label className="visual-field"><span>模块名称</span><input value={item.label} onChange={(event) => updateHomeItem('navItems', index, { label: event.target.value })} /></label>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="首页快捷模块" description="首页轮播下方模块的名称、说明和图标。">
            <div className="visual-list">
              {homeVisual.quickActions.map((item, index) => (
                <article className="visual-row visual-row-copy" key={item.key}>
                  {renderImageControl(`quick-${item.key}`, item.iconUrl, async (url, objectKey) => {
                    const nextHomeVisual = {
                      ...homeVisual,
                      quickActions: homeVisual.quickActions.map((currentItem, itemIndex) => itemIndex === index
                        ? { ...currentItem, iconUrl: url, iconKey: objectKey }
                        : currentItem),
                    };
                    setHomeVisual(nextHomeVisual);
                    await persistVisualConfig(config, nextHomeVisual, scriptVisual);
                  })}
                  <label className="visual-field"><span>模块名称</span><input value={item.label} onChange={(event) => updateHomeItem('quickActions', index, { label: event.target.value })} /></label>
                  <label className="visual-field"><span>说明文字</span><input value={item.description || ''} onChange={(event) => updateHomeItem('quickActions', index, { description: event.target.value })} /></label>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="首页作品" description="上传和修改首页下方作品卡片。" action={<button className="toolbar-btn" type="button" onClick={() => {
            setDirty(true);
            setHomeVisual((current) => ({ ...current, works: [...current.works, { key: `work-${Date.now()}`, label: '新作品', category: '其他' }] }));
          }}><Plus size={15} />新增作品</button>}>
            <label className="visual-field visual-title-field"><span>区域标题</span><input value={homeVisual.worksTitle} onChange={(event) => {
              setDirty(true);
              setHomeVisual({ ...homeVisual, worksTitle: event.target.value });
            }} /></label>
            <div className="visual-list">
              {homeVisual.works.map((item, index) => (
                <article className="visual-row visual-row-work" key={item.key}>
                  {renderImageControl(`work-${item.key}`, item.imageUrl, async (url, objectKey) => {
                    const nextHomeVisual = {
                      ...homeVisual,
                      works: homeVisual.works.map((currentItem, itemIndex) => itemIndex === index
                        ? { ...currentItem, imageUrl: url, imageKey: objectKey }
                        : currentItem),
                    };
                    setHomeVisual(nextHomeVisual);
                    await persistVisualConfig(config, nextHomeVisual, scriptVisual);
                  })}
                  <label className="visual-field"><span>作品名称</span><input value={item.label} onChange={(event) => updateHomeItem('works', index, { label: event.target.value })} /></label>
                  <label className="visual-field"><span>分类</span><input value={item.category || ''} onChange={(event) => updateHomeItem('works', index, { category: event.target.value })} /></label>
                  <label className="visual-field"><span>跳转地址</span><input value={item.linkUrl || ''} onChange={(event) => updateHomeItem('works', index, { linkUrl: event.target.value })} placeholder="/workspace" /></label>
                  <button className="table-btn danger icon-only visual-delete" type="button" title="删除作品" onClick={() => {
                    setDirty(true);
                    setHomeVisual((current) => ({ ...current, works: current.works.filter((_, itemIndex) => itemIndex !== index) }));
                  }}><Trash2 size={15} /></button>
                </article>
              ))}
            </div>
          </SectionCard>
        </>
      )}

      {activeTab === 'banner' && <HomeBannersPage embedded />}

      {activeTab === 'script' && (
        <>
          <SectionCard title="脚本生成器品牌区" description="修改“铼”图标、主标题和说明文字。">
            <div className="visual-brand-row visual-brand-script">
              {renderImageControl('script-assistant', scriptVisual.assistantIconUrl, async (url, objectKey) => {
                const nextScriptVisual = { ...scriptVisual, assistantIconUrl: url, assistantIconKey: objectKey };
                setScriptVisual(nextScriptVisual);
                await persistVisualConfig(config, homeVisual, nextScriptVisual);
              })}
              <label className="visual-field"><span>主标题</span><input value={scriptVisual.assistantTitle} onChange={(event) => {
                setDirty(true);
                setScriptVisual({ ...scriptVisual, assistantTitle: event.target.value });
              }} /></label>
              <label className="visual-field"><span>说明文字</span><input value={scriptVisual.assistantSubtitle} onChange={(event) => {
                setDirty(true);
                setScriptVisual({ ...scriptVisual, assistantSubtitle: event.target.value });
              }} /></label>
            </div>
          </SectionCard>

          <SectionCard title="创作方式入口" description="修改每个标题旁的图标、标题和对应文字。">
            <div className="visual-list">
              {scriptVisual.modeItems.map((item, index) => (
                <article className="visual-row visual-row-script-mode" key={item.key}>
                  {renderImageControl(`script-${item.key}`, item.iconUrl, async (url, objectKey) => {
                    const nextScriptVisual = {
                      ...scriptVisual,
                      modeItems: scriptVisual.modeItems.map((currentItem, itemIndex) => itemIndex === index
                        ? { ...currentItem, iconUrl: url, iconKey: objectKey }
                        : currentItem),
                    };
                    setScriptVisual(nextScriptVisual);
                    await persistVisualConfig(config, homeVisual, nextScriptVisual);
                  })}
                  <label className="visual-field"><span>选择页入口标题</span><input value={item.label} onChange={(event) => updateScriptItem(index, { label: event.target.value })} /></label>
                  <label className="visual-field"><span>进入后左上角文字</span><input value={item.headerLabel || item.label} onChange={(event) => updateScriptItem(index, { headerLabel: event.target.value })} /></label>
                  <label className="visual-field"><span>说明文字</span><input value={item.description || ''} onChange={(event) => updateScriptItem(index, { description: event.target.value })} /></label>
                </article>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default PageVisualPage;
