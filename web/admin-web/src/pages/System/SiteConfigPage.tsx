import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, FileText, FolderTree, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { systemApi, type SiteConfig } from '../../api/system';
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

interface OriginalScenarioCategory {
  id: string;
  title: string;
  subtitle?: string;
  prompt: string;
  children: OriginalScenarioPrompt[];
}

type SiteConfigTab = 'analysis' | 'prompt';
type PromptTreeSelection = { kind: 'category'; categoryId: string } | { kind: 'child'; categoryId: string; childId: string };

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

const defaultOriginalScenarioCategories: OriginalScenarioCategory[] = [
  {
    id: 'ecommerce',
    title: '电商',
    subtitle: '突出首屏卖点与转化钩子',
    prompt: '请创作以电商转化为目标的短视频脚本，突出产品核心价值、视觉吸引力、使用场景和清晰的下单理由。',
    children: defaultOriginalScenarioPrompts.filter((item) => ['main-image', 'product-overview', 'product-intro', 'guide'].includes(item.id)),
  },
  {
    id: 'unboxing-category',
    title: '产品开箱',
    subtitle: '开箱细节、上手体验和惊喜感',
    prompt: '请从真实开箱和首次体验出发创作脚本，呈现拆封过程、产品细节、上手感受和逐步揭晓的惊喜。',
    children: defaultOriginalScenarioPrompts.filter((item) => ['unboxing', 'unboxing-oral', 'review'].includes(item.id)),
  },
  {
    id: 'pain-point-category',
    title: '人群痛点产品介绍',
    subtitle: '先讲真实困扰，再给解决方案',
    prompt: '请围绕目标人群的真实困扰创作产品介绍脚本，先建立痛点共鸣，再自然说明产品如何解决问题并带来改变。',
    children: defaultOriginalScenarioPrompts.filter((item) => ['pain-point', 'vlog', 'desire'].includes(item.id)),
  },
];

const parseOriginalScenarioPrompts = (value?: string): OriginalScenarioCategory[] => {
  if (!value?.trim()) return defaultOriginalScenarioCategories;
  try {
    const parsed = JSON.parse(value) as Array<OriginalScenarioCategory | OriginalScenarioPrompt>;
    if (!Array.isArray(parsed) || !parsed.length) return defaultOriginalScenarioCategories;
    if ('children' in parsed[0]) {
      const categories = (parsed as OriginalScenarioCategory[])
        .map((item, categoryIndex) => ({
          id: item?.id || `category-${categoryIndex}`,
          title: item?.title ?? '',
          subtitle: item?.subtitle ?? '',
          prompt: item?.prompt ?? '',
          children: Array.isArray(item?.children)
            ? item.children.map((child, childIndex) => ({
              id: child?.id || `scenario-${categoryIndex}-${childIndex}`,
              title: child?.title ?? '',
              subtitle: child?.subtitle ?? '',
              tag: child?.tag ?? '',
              prompt: child?.prompt ?? '',
            }))
            : [],
        }));
      return categories.length ? categories : defaultOriginalScenarioCategories;
    }
    const legacyItems = (parsed as OriginalScenarioPrompt[]).filter((item) => item?.id && item?.title && item?.prompt);
    const legacyById = new Map(legacyItems.map((item) => [item.id, item]));
    const knownIds = new Set(defaultOriginalScenarioPrompts.map((item) => item.id));
    return defaultOriginalScenarioCategories.map((category, index) => ({
      ...category,
      children: [
        ...category.children.map((child) => legacyById.get(child.id) || child),
        ...(index === 0 ? legacyItems.filter((item) => !knownIds.has(item.id)) : []),
      ],
    }));
  } catch {
    return defaultOriginalScenarioCategories;
  }
};

const stringifyOriginalScenarioPrompts = (list: OriginalScenarioCategory[]) => JSON.stringify(list
  .map((category, categoryIndex) => ({
    id: category.id || `category-${Date.now()}-${categoryIndex}`,
    title: category.title,
    subtitle: category.subtitle || '',
    prompt: category.prompt,
    children: category.children
      .map((item, itemIndex) => ({
        id: item.id || `scenario-${Date.now()}-${categoryIndex}-${itemIndex}`,
        title: item.title,
        subtitle: item.subtitle || '',
        tag: item.tag || '',
        prompt: item.prompt,
      })),
  })));

interface SiteConfigPageProps {
  promptOnly?: boolean;
}

const SiteConfigPage = ({ promptOnly = false }: SiteConfigPageProps) => {
  const { notify } = useAdminShell();
  const [config, setConfig] = useState<SiteConfig>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SiteConfigTab>(promptOnly ? 'prompt' : 'analysis');
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>(defaultOriginalScenarioCategories.map((item) => item.id));
  const [selectedPromptNode, setSelectedPromptNode] = useState<PromptTreeSelection>({ kind: 'category', categoryId: defaultOriginalScenarioCategories[0].id });
  const [originalScenarioCategories, setOriginalScenarioCategories] = useState<OriginalScenarioCategory[]>(defaultOriginalScenarioCategories);
  const selectedOriginalCategory = originalScenarioCategories.find((item) => item.id === selectedPromptNode.categoryId)
    || originalScenarioCategories[0];
  const selectedOriginalCategoryIndex = originalScenarioCategories.findIndex((item) => item.id === selectedOriginalCategory?.id);
  const selectedOriginalChild = selectedPromptNode.kind === 'child'
    ? selectedOriginalCategory?.children.find((item) => item.id === selectedPromptNode.childId)
    : undefined;
  const selectedOriginalChildIndex = selectedOriginalChild
    ? selectedOriginalCategory.children.findIndex((item) => item.id === selectedOriginalChild.id)
    : -1;

  const load = async () => {
    setLoading(true);
    try {
      const loadedConfig = await systemApi.getSiteConfig();
      const loadedCategories = parseOriginalScenarioPrompts(loadedConfig.originalScenarioPrompts);
      setConfig(loadedConfig);
      setOriginalScenarioCategories(loadedCategories);
      setExpandedCategoryIds(loadedCategories.map((item) => item.id));
      if (loadedCategories[0]) {
        setSelectedPromptNode({ kind: 'category', categoryId: loadedCategories[0].id });
      }
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
      const configToSave = {
        ...nextConfig,
        originalScenarioPrompts: stringifyOriginalScenarioPrompts(originalScenarioCategories),
      };
      const updated = await systemApi.updateSiteConfig(configToSave);
      setConfig(updated || configToSave);
      if (updated?.originalScenarioPrompts) {
        setOriginalScenarioCategories(parseOriginalScenarioPrompts(updated.originalScenarioPrompts));
      }
      notify('站点配置已保存');
    } catch {
      notify('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const syncOriginalScenarioCategories = (nextList: OriginalScenarioCategory[]) => {
    setOriginalScenarioCategories(nextList);
    setConfig((currentConfig) => ({
      ...currentConfig,
      originalScenarioPrompts: stringifyOriginalScenarioPrompts(nextList),
    }));
  };

  const updateOriginalCategory = (categoryIndex: number, patch: Partial<OriginalScenarioCategory>) => {
    const nextList = originalScenarioCategories.map((category, index) => (index === categoryIndex ? { ...category, ...patch } : category));
    syncOriginalScenarioCategories(nextList);
  };

  const updateOriginalScenarioPrompt = (categoryIndex: number, itemIndex: number, patch: Partial<OriginalScenarioPrompt>) => {
    const nextList = originalScenarioCategories.map((category, index) => index === categoryIndex ? {
      ...category,
      children: category.children.map((item, childIndex) => childIndex === itemIndex ? { ...item, ...patch } : item),
    } : category);
    syncOriginalScenarioCategories(nextList);
  };

  const moveOriginalScenarioPrompt = (categoryIndex: number, itemIndex: number, offset: -1 | 1) => {
    const category = originalScenarioCategories[categoryIndex];
    const targetIndex = itemIndex + offset;
    if (!category || targetIndex < 0 || targetIndex >= category.children.length) return;

    const nextChildren = [...category.children];
    const [movedItem] = nextChildren.splice(itemIndex, 1);
    nextChildren.splice(targetIndex, 0, movedItem);
    const nextList = originalScenarioCategories.map((item, index) => index === categoryIndex
      ? { ...item, children: nextChildren }
      : item);
    syncOriginalScenarioCategories(nextList);
    setSelectedPromptNode({
      kind: 'child',
      categoryId: category.id,
      childId: movedItem.id,
    });
  };

  const addOriginalScenarioPrompt = (categoryIndex: number) => {
    const childId = `scenario-${Date.now()}`;
    const category = originalScenarioCategories[categoryIndex];
    const nextList = originalScenarioCategories.map((item, index) => index === categoryIndex ? {
      ...item,
      children: [...item.children, { id: childId, title: '新子类', subtitle: '填写子类说明', tag: '原创场景', prompt: '请填写这个子类对应的通用提示词。' }],
    } : item);
    syncOriginalScenarioCategories(nextList);
    if (category) {
      setExpandedCategoryIds((current) => current.includes(category.id) ? current : [...current, category.id]);
      setSelectedPromptNode({ kind: 'child', categoryId: category.id, childId });
    }
  };

  const removeOriginalScenarioPrompt = (categoryIndex: number, itemIndex: number) => {
    const category = originalScenarioCategories[categoryIndex];
    const nextList = originalScenarioCategories.map((item, index) => index === categoryIndex ? {
      ...item,
      children: item.children.filter((_, childIndex) => childIndex !== itemIndex),
    } : item);
    syncOriginalScenarioCategories(nextList);
    if (category) setSelectedPromptNode({ kind: 'category', categoryId: category.id });
  };

  const resetOriginalScenarioPrompts = () => {
    syncOriginalScenarioCategories(defaultOriginalScenarioCategories);
    setExpandedCategoryIds(defaultOriginalScenarioCategories.map((item) => item.id));
    setSelectedPromptNode({ kind: 'category', categoryId: defaultOriginalScenarioCategories[0].id });
  };

  const toggleOriginalCategory = (categoryId: string) => {
    setExpandedCategoryIds((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId]);
  };

  return (
    <div className="page-stack site-config-page">
      {!promptOnly ? <PageHeader
        title="业务配置"
        description="维护爆款解析案例和 AI 智能脚本分类提示词。页面图标、图片和展示文案统一在“页面视觉”中维护。"
        actions={<button className="toolbar-btn" type="button" onClick={load}><RefreshCcw size={16} />{loading ? '加载中' : '刷新'}</button>}
      /> : null}

      {!promptOnly ? <div className="site-config-tabs" role="tablist" aria-label="业务配置导航">
        <button type="button" role="tab" aria-selected={activeTab === 'analysis'} className={`site-config-tab ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>爆款解析案例</button>
        <button type="button" role="tab" aria-selected={activeTab === 'prompt'} className={`site-config-tab ${activeTab === 'prompt' ? 'active' : ''}`} onClick={() => setActiveTab('prompt')}>AI智能脚本管理</button>
      </div> : null}

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
      <SectionCard title="AI智能脚本管理" description="管理 AI 智能脚本的大类、子类及两级通用提示词，生成时会自动合并使用。" action={<span className="status-badge green">AI Script</span>}>
        <div className="original-prompt-tree-layout">
          <aside className="original-prompt-tree" aria-label="AI智能脚本分类树">
            <div className="original-prompt-tree-title">
              <FolderTree size={17} />
              <strong>分类结构</strong>
              <span>{originalScenarioCategories.length} 个大类</span>
            </div>
            {originalScenarioCategories.map((category, categoryIndex) => {
              const expanded = expandedCategoryIds.includes(category.id);
              const categorySelected = selectedPromptNode.kind === 'category' && selectedOriginalCategory?.id === category.id;
              return (
                <div className="original-prompt-tree-branch" key={category.id}>
                  <button
                    className={`original-prompt-tree-node category ${categorySelected ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setSelectedPromptNode({ kind: 'category', categoryId: category.id });
                      toggleOriginalCategory(category.id);
                    }}
                  >
                    <span className={`original-prompt-tree-chevron ${expanded ? 'expanded' : ''}`}>
                      <ChevronRight size={15} />
                    </span>
                    <FolderTree size={17} />
                    <span className="original-prompt-tree-copy">
                      <strong>{category.title || '未命名大类'}</strong>
                      <small>{category.children.length} 个子类</small>
                    </span>
                  </button>
                  {expanded ? (
                    <div className="original-prompt-tree-children">
                      {category.children.map((item) => (
                        <button
                          className={`original-prompt-tree-node child ${selectedPromptNode.kind === 'child' && selectedPromptNode.childId === item.id ? 'active' : ''}`}
                          type="button"
                          key={item.id}
                          onClick={() => setSelectedPromptNode({ kind: 'child', categoryId: category.id, childId: item.id })}
                        >
                          <FileText size={15} />
                          <span className="original-prompt-tree-copy">
                            <strong>{item.title || '未命名子类'}</strong>
                            <small>{item.tag || '未设置标签'}</small>
                          </span>
                        </button>
                      ))}
                      <button className="original-prompt-tree-add" type="button" onClick={() => addOriginalScenarioPrompt(categoryIndex)}>
                        <Plus size={14} />新增子类
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </aside>

          <section className="original-prompt-editor">
            {selectedOriginalCategory && selectedPromptNode.kind === 'category' ? (
              <>
                <header className="original-prompt-editor-head">
                  <div>
                    <span>大类配置</span>
                    <h3>{selectedOriginalCategory.title || '未命名大类'}</h3>
                  </div>
                  <span className="status-badge green">{selectedOriginalCategory.children.length} 个子类</span>
                </header>
                <div className="original-prompt-editor-fields">
                  <label className="form-field">
                    <span>大类名称（顶部卡片）</span>
                    <input value={selectedOriginalCategory.title} onChange={(event) => updateOriginalCategory(selectedOriginalCategoryIndex, { title: event.target.value })} placeholder="例如：电商" />
                  </label>
                  <label className="form-field">
                    <span>大类前台描述</span>
                    <textarea value={selectedOriginalCategory.subtitle || ''} onChange={(event) => updateOriginalCategory(selectedOriginalCategoryIndex, { subtitle: event.target.value })} placeholder="显示在顶部卡片中" />
                  </label>
                  <label className="form-field original-prompt-editor-wide">
                    <span>大类通用提示词</span>
                    <textarea value={selectedOriginalCategory.prompt} onChange={(event) => updateOriginalCategory(selectedOriginalCategoryIndex, { prompt: event.target.value })} placeholder="选择该大类后始终加入内容框的提示词" />
                  </label>
                </div>
                <button className="toolbar-btn original-category-add-child" type="button" onClick={() => addOriginalScenarioPrompt(selectedOriginalCategoryIndex)}><Plus size={16} />新增子类</button>
              </>
            ) : null}

            {selectedOriginalCategory && selectedOriginalChild && selectedPromptNode.kind === 'child' ? (
              <>
                <header className="original-prompt-editor-head">
                  <div>
                    <span>{selectedOriginalCategory.title || '未命名大类'} / 子类配置</span>
                    <h3>{selectedOriginalChild.title || '未命名子类'}</h3>
                  </div>
                  <div className="original-prompt-editor-actions">
                    <button className="toolbar-btn icon-only" type="button" title={'\u4e0a\u79fb'} aria-label={'\u4e0a\u79fb\u5b50\u7c7b'} disabled={selectedOriginalChildIndex <= 0} onClick={() => moveOriginalScenarioPrompt(selectedOriginalCategoryIndex, selectedOriginalChildIndex, -1)}><ArrowUp size={16} /></button>
                    <button className="toolbar-btn icon-only" type="button" title={'\u4e0b\u79fb'} aria-label={'\u4e0b\u79fb\u5b50\u7c7b'} disabled={selectedOriginalChildIndex >= selectedOriginalCategory.children.length - 1} onClick={() => moveOriginalScenarioPrompt(selectedOriginalCategoryIndex, selectedOriginalChildIndex, 1)}><ArrowDown size={16} /></button>
                  <button
                    className="toolbar-btn danger"
                    type="button"
                    disabled={selectedOriginalCategory.children.length <= 1}
                    onClick={() => removeOriginalScenarioPrompt(selectedOriginalCategoryIndex, selectedOriginalChildIndex)}
                  >
                    <Trash2 size={16} />删除子类
                  </button>
                  </div>
                </header>
                <div className="original-prompt-editor-fields">
                  <label className="form-field">
                    <span>子类名称（下拉框）</span>
                    <input value={selectedOriginalChild.title} onChange={(event) => updateOriginalScenarioPrompt(selectedOriginalCategoryIndex, selectedOriginalChildIndex, { title: event.target.value })} placeholder="例如：电商主图" />
                  </label>
                  <label className="form-field">
                    <span>子类标签</span>
                    <input value={selectedOriginalChild.tag || ''} onChange={(event) => updateOriginalScenarioPrompt(selectedOriginalCategoryIndex, selectedOriginalChildIndex, { tag: event.target.value })} placeholder="例如：主图转化" />
                  </label>
                  <label className="form-field original-prompt-editor-wide">
                    <span>子类说明</span>
                    <textarea value={selectedOriginalChild.subtitle || ''} onChange={(event) => updateOriginalScenarioPrompt(selectedOriginalCategoryIndex, selectedOriginalChildIndex, { subtitle: event.target.value })} placeholder="子类用途说明" />
                  </label>
                  <label className="form-field original-prompt-editor-wide">
                    <span>子类通用提示词</span>
                    <textarea value={selectedOriginalChild.prompt} onChange={(event) => updateOriginalScenarioPrompt(selectedOriginalCategoryIndex, selectedOriginalChildIndex, { prompt: event.target.value })} placeholder="与大类提示词合并后显示在内容框" />
                  </label>
                </div>
                <div className="original-prompt-combined-preview">
                  <span>前台组合预览</span>
                  <p>{selectedOriginalCategory.prompt}</p>
                  <p>{selectedOriginalChild.prompt}</p>
                </div>
              </>
            ) : null}
          </section>
        </div>
        <div className="site-config-actions site-config-actions-inline site-analysis-actions">
          <button className="toolbar-btn" type="button" onClick={resetOriginalScenarioPrompts}>恢复默认</button>
          <button className="toolbar-btn" type="button" onClick={() => save()} disabled={saving}><Save size={16} />{saving ? '保存中' : '保存分类提示词'}</button>
        </div>
      </SectionCard>
      ) : null}

    </div>
  );
};

export default SiteConfigPage;
