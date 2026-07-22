import { useEffect, useRef, useState } from 'react';
import { Image, Plus, RefreshCcw, Save, Trash2, UploadCloud } from 'lucide-react';
import { systemApi, type SiteConfig } from '../../api/system';
import { uploadApi } from '../../api/upload';
import { PageHeader, SectionCard } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './site-config-page.css';

interface OriginalScenarioPrompt {
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
  prompt: string;
}

type SiteConfigTab = 'logo' | 'analysis' | 'prompt';

const defaultOriginalScenarioPrompts: OriginalScenarioPrompt[] = [
  { id: 'main-image', title: '电商主图', subtitle: '突出首屏卖点与转化钩子', tag: '主图转化', prompt: '请生成电商主图短视频脚本，重点突出产品第一卖点、视觉冲击、使用场景和下单理由，开头3秒必须快速抓住注意力。' },
  { id: 'unboxing', title: '产品开箱', subtitle: '开箱细节、上手体验和惊喜感', tag: '开箱体验', prompt: '请生成产品开箱脚本，按照开箱期待、外观细节、核心配件、上手体验、惊喜卖点和购买建议展开。' },
  { id: 'pain-point', title: '人群痛点', subtitle: '先讲真实困扰，再给解决方案', tag: '痛点转化', prompt: '请围绕目标人群痛点生成脚本，先描述具体生活场景中的真实困扰并建立共鸣，再自然引出产品解决方案、核心卖点和转化引导。' },
  { id: 'product-overview', title: '产品介绍', subtitle: '用画面与字幕讲清产品价值', tag: '产品介绍', prompt: '请生成产品介绍短视频脚本，通过画面、字幕和场景演示依次讲清产品定位、核心功能、差异化卖点、使用方法、适用人群和购买理由。' },
  { id: 'product-intro', title: '产品介绍口播', subtitle: '自然讲清产品定位、卖点和购买理由', tag: '口播种草', prompt: '请生成产品介绍口播脚本，语言自然直接，包含产品定位、适用人群、核心卖点、使用方法和购买理由。' },
  { id: 'unboxing-oral', title: '产品开箱口播', subtitle: '第一视角表达真实开箱与即时感受', tag: '开箱口播', prompt: '请生成产品开箱口播脚本，以第一视角表达开箱过程，突出真实感、细节观察、即时体验和种草氛围。' },
  { id: 'guide', title: '选购攻略/科普', subtitle: '用避坑标准和科普逻辑建立信任', tag: '攻略科普', prompt: '请生成选购攻略或科普类脚本，先提出用户常见误区，再给出判断标准，最后带出产品优势和适合购买的人群。' },
  { id: 'review', title: '测评', subtitle: '用测试过程和优缺点提升可信度', tag: '真实测评', prompt: '请生成真实测评脚本，包含测试方法、使用前后对比、优缺点说明、适合人群和购买建议，表达要可信。' },
  { id: 'vlog', title: 'vlog', subtitle: '把产品自然融入生活方式场景', tag: '生活方式', prompt: '请生成生活方式 vlog 脚本，把产品自然融入一天中的真实场景，强调情绪、氛围、使用过程和生活改善。' },
  { id: 'desire', title: '氛围欲望激发', subtitle: '营造拥有后的理想状态和情绪价值', tag: '氛围种草', prompt: '请生成氛围感和欲望激发型脚本，重点营造画面、情绪、身份感和拥有后的理想状态，弱化硬广感。' },
];

const getDefaultOriginalScenarioPrompt = (id: string) => defaultOriginalScenarioPrompts.find((item) => item.id === id);

const parseOriginalScenarioPrompts = (value?: string): OriginalScenarioPrompt[] => {
  if (!value?.trim()) return defaultOriginalScenarioPrompts;
  try {
    const parsed = JSON.parse(value) as OriginalScenarioPrompt[];
    const list = Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.title && item?.prompt).map((item) => {
      const defaultItem = getDefaultOriginalScenarioPrompt(item.id);
      return { ...item, subtitle: item.subtitle ?? defaultItem?.subtitle ?? '', tag: item.tag ?? defaultItem?.tag ?? '' };
    }) : [];
    if (!list.length) return defaultOriginalScenarioPrompts;
    const configuredById = new Map(list.map((item) => [item.id, item]));
    const builtInScenarios = defaultOriginalScenarioPrompts.map((item) => configuredById.get(item.id) || item);
    const customScenarios = list.filter((item) => !defaultOriginalScenarioPrompts.some((defaultItem) => defaultItem.id === item.id));
    return [...builtInScenarios, ...customScenarios];
  } catch {
    return defaultOriginalScenarioPrompts;
  }
};

const stringifyOriginalScenarioPrompts = (list: OriginalScenarioPrompt[]) => JSON.stringify(list.filter((item) => item.title.trim() && item.prompt.trim()).map((item, index) => ({
  id: item.id || `scenario-${Date.now()}-${index}`,
  title: item.title.trim(),
  subtitle: item.subtitle?.trim() || '',
  tag: item.tag?.trim() || '',
  prompt: item.prompt.trim(),
})));

const SiteConfigPage = () => {
  const { notify } = useAdminShell();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [config, setConfig] = useState<SiteConfig>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<SiteConfigTab>('logo');
  const originalScenarioPrompts = parseOriginalScenarioPrompts(config.originalScenarioPrompts);

  const load = async () => {
    setLoading(true);
    try {
      setConfig(await systemApi.getSiteConfig());
    } catch {
      notify('站点配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (nextConfig = config) => {
    setSaving(true);
    try {
      const updated = await systemApi.updateSiteConfig(nextConfig);
      setConfig(updated || nextConfig);
      notify('站点配置已保存');
    } catch {
      notify('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadApi.uploadFile(file);
      const nextConfig = { ...config, homeLogoUrl: result.url, homeLogoKey: result.objectKey };
      setConfig(nextConfig);
      await save(nextConfig);
    } catch {
      notify('图片上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearLogo = async () => {
    const nextConfig = { ...config, homeLogoUrl: '', homeLogoKey: '' };
    setConfig(nextConfig);
    await save(nextConfig);
  };

  const updateOriginalScenarioPrompt = (index: number, patch: Partial<OriginalScenarioPrompt>) => {
    const nextList = originalScenarioPrompts.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    setConfig({ ...config, originalScenarioPrompts: stringifyOriginalScenarioPrompts(nextList) });
  };

  const addOriginalScenarioPrompt = () => {
    const nextList = [...originalScenarioPrompts, { id: `scenario-${Date.now()}`, title: '新场景', subtitle: '填写前台给用户看的场景说明', tag: '原创场景', prompt: '请填写这个场景对应的 AI 提示词。' }];
    setConfig({ ...config, originalScenarioPrompts: stringifyOriginalScenarioPrompts(nextList) });
  };

  const removeOriginalScenarioPrompt = (index: number) => {
    const nextList = originalScenarioPrompts.filter((_, itemIndex) => itemIndex !== index);
    setConfig({ ...config, originalScenarioPrompts: stringifyOriginalScenarioPrompts(nextList.length ? nextList : defaultOriginalScenarioPrompts) });
  };

  const resetOriginalScenarioPrompts = () => {
    setConfig({ ...config, originalScenarioPrompts: stringifyOriginalScenarioPrompts(defaultOriginalScenarioPrompts) });
  };

  return (
    <div className="page-stack site-config-page">
      <PageHeader
        title="站点配置"
        description="配置用户端首页品牌图标和前台展示文案。"
        actions={<button className="toolbar-btn" type="button" onClick={load}><RefreshCcw size={16} />{loading ? '加载中' : '刷新'}</button>}
      />

      <div className="site-config-tabs" role="tablist" aria-label="站点配置导航">
        <button type="button" role="tab" aria-selected={activeTab === 'logo'} className={`site-config-tab ${activeTab === 'logo' ? 'active' : ''}`} onClick={() => setActiveTab('logo')}>首页图标</button>
        <button type="button" role="tab" aria-selected={activeTab === 'analysis'} className={`site-config-tab ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>爆款解析案例</button>
        <button type="button" role="tab" aria-selected={activeTab === 'prompt'} className={`site-config-tab ${activeTab === 'prompt' ? 'active' : ''}`} onClick={() => setActiveTab('prompt')}>AI原创提示词</button>
      </div>

      {activeTab === 'logo' ? (
      <SectionCard title="首页图标" description="上传图片后会自动保存 homeLogoUrl / homeLogoKey。" action={<span className="status-badge blue">Site Config</span>}>
        <div className="site-config-grid">
          <div className="site-logo-preview">
            {config.homeLogoUrl ? (
              <img src={config.homeLogoUrl} alt="首页左侧顶部图标预览" />
            ) : (
              <div className="site-logo-empty">
                <div className="site-logo-empty-icon"><Image size={22} /></div>
                <strong>暂无图标</strong>
                <span>上传图片或手动填写 URL 后保存。</span>
              </div>
            )}
          </div>

          <div className="site-config-form">
            <label className="form-field">
              <span>图标 URL</span>
              <input value={config.homeLogoUrl || ''} onChange={(event) => setConfig({ ...config, homeLogoUrl: event.target.value })} placeholder="https://..." />
            </label>
            <label className="form-field">
              <span>文件 Object Key</span>
              <input value={config.homeLogoKey || ''} onChange={(event) => setConfig({ ...config, homeLogoKey: event.target.value })} placeholder="上传后自动填充" />
            </label>

            <div className="site-config-actions site-config-actions-inline">
              <label className="toolbar-btn upload-btn">
                <UploadCloud size={16} />{uploading ? '上传中' : '上传图片'}
                <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={(event) => upload(event.target.files?.[0])} />
              </label>
              <button className="toolbar-btn" type="button" onClick={() => save()} disabled={saving}><Save size={16} />{saving ? '保存中' : '保存'}</button>
              <button className="toolbar-btn danger" type="button" onClick={clearLogo}><Trash2 size={16} />清空</button>
            </div>
          </div>
        </div>
      </SectionCard>
      ) : null}

      {activeTab === 'analysis' ? (
      <SectionCard title="爆款复刻解析案例" description="维护用户端步骤2爆款复刻页面中“可查看解析案例”的悬停展示内容。" action={<span className="status-badge green">Viral Analysis</span>}>
        <div className="site-analysis-example-grid">
          <label className="form-field">
            <span>简易文案解析案例</span>
            <textarea
              value={config.viralSimpleAnalysisExample || ''}
              onChange={(event) => setConfig({ ...config, viralSimpleAnalysisExample: event.target.value })}
              placeholder="填写鼠标悬停“可查看解析案例”时展示的简易文案解析示例"
            />
          </label>
          <label className="form-field">
            <span>深度拉片解析案例</span>
            <textarea
              value={config.viralDeepAnalysisExample || ''}
              onChange={(event) => setConfig({ ...config, viralDeepAnalysisExample: event.target.value })}
              placeholder="填写鼠标悬停“可查看解析案例”时展示的深度拉片解析示例"
            />
          </label>
        </div>
        <div className="site-config-actions site-config-actions-inline site-analysis-actions">
          <button className="toolbar-btn" type="button" onClick={() => save()} disabled={saving}><Save size={16} />{saving ? '保存中' : '保存解析案例'}</button>
        </div>
      </SectionCard>
      ) : null}

      {activeTab === 'prompt' ? (
      <SectionCard title="AI原创脚本场景提示词" description="维护用户端 AI原创页场景卡片的前台展示文案，以及每个选项给大模型使用的后台提示词。" action={<span className="status-badge green">Original Prompts</span>}>
        <div className="original-scenario-admin-list">
          {originalScenarioPrompts.map((item, index) => (
            <div className="original-scenario-admin-item" key={`${item.id}-${index}`}>
              <label className="form-field original-scenario-title-field">
                <span>类型名称 title</span>
                <input value={item.title} onChange={(event) => updateOriginalScenarioPrompt(index, { title: event.target.value })} placeholder="例如：电商主图" />
              </label>
              <label className="form-field original-scenario-tag-field">
                <span>类型标签 tag</span>
                <input value={item.tag || ''} onChange={(event) => updateOriginalScenarioPrompt(index, { tag: event.target.value })} placeholder="例如：主图转化" />
              </label>
              <label className="form-field original-scenario-subtitle-field">
                <span>前台显示描述 subtitle（给用户看）</span>
                <textarea value={item.subtitle || ''} onChange={(event) => updateOriginalScenarioPrompt(index, { subtitle: event.target.value })} placeholder="展示在前台卡片/内容框里的说明，面向用户阅读" />
              </label>
              <label className="form-field original-scenario-prompt-field">
                <span>大模型提示词 prompt（给生成脚本的大模型用）</span>
                <textarea value={item.prompt} onChange={(event) => updateOriginalScenarioPrompt(index, { prompt: event.target.value })} placeholder="选择该场景后用于生成脚本的大模型提示词" />
              </label>
              <button className="toolbar-btn danger original-scenario-remove" type="button" onClick={() => removeOriginalScenarioPrompt(index)}><Trash2 size={16} />删除</button>
            </div>
          ))}
        </div>
        <div className="site-config-actions site-config-actions-inline site-analysis-actions">
          <button className="toolbar-btn" type="button" onClick={addOriginalScenarioPrompt}><Plus size={16} />新增选项</button>
          <button className="toolbar-btn" type="button" onClick={resetOriginalScenarioPrompts}>恢复默认</button>
          <button className="toolbar-btn" type="button" onClick={() => save()} disabled={saving}><Save size={16} />{saving ? '保存中' : '保存场景提示词'}</button>
        </div>
      </SectionCard>
      ) : null}

    </div>
  );
};

export default SiteConfigPage;
