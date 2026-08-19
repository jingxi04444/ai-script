import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Blocks, Bot, Database, FileSearch, FileText, Heading1, ListTree, Sparkles } from 'lucide-react';
import { PageHeader, SectionCard } from '../../components/common/AdminUI';
import PromptTemplatesPage from '../Materials/PromptTemplatesPage';
import ScriptFormatsPage from '../System/ScriptFormatsPage';
import './script-generator-management-page.css';

type GeneratorTab = 'viral' | 'original' | 'template' | 'title' | 'format';

interface ViralSection {
  key: string;
  label: string;
  description: string;
  sceneCode?: string;
  icon: typeof Blocks;
}

const generatorTabs: Array<{
  key: GeneratorTab;
  label: string;
  description: string;
  icon: typeof Blocks;
}> = [
  { key: 'viral', label: '爆款复刻', description: '解析、整理、拆解和生成提示词', icon: Sparkles },
  { key: 'original', label: 'AI原创', description: 'AI 原创脚本生成提示词', icon: Bot },
  { key: 'template', label: '脚本模板', description: '模板库脚本生成提示词', icon: Database },
  { key: 'title', label: '标题提示词', description: '首次生成与润色规则', icon: Heading1 },
  { key: 'format', label: '脚本格式', description: '输出格式和格式要求', icon: ListTree },
];

const viralSections: ViralSection[] = [
  {
    key: 'plugin',
    label: '爆款脚本解析-插件',
    description: '浏览器插件采集爆款内容后，直接进入深度解析与拉片拆解链路。',
    icon: Blocks,
  },
  {
    key: 'cleanup',
    label: '爆款脚本文案整理',
    description: '校对 ASR 原始逐字稿、补充标点并按语义分段。',
    sceneCode: 'source_copy_cleanup',
    icon: FileText,
  },
  {
    key: 'simple',
    label: '简易文案解析',
    description: '对爆款文案进行快速结构拆解，提取可复刻表达。',
    sceneCode: 'source_copy_simple_analyze',
    icon: FileSearch,
  },
  {
    key: 'deep',
    label: '深度拉片解析',
    description: '深度分析镜头、节奏、情绪、转化逻辑和复刻要点。',
    sceneCode: 'source_copy_deep_analyze',
    icon: Sparkles,
  },
  {
    key: 'generate',
    label: '爆款脚本生成',
    description: '结合参考爆款、产品 Brief 和脚本配置生成复刻脚本。',
    sceneCode: 'script_generate_viral',
    icon: Sparkles,
  },
];

const ScriptGeneratorManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab: GeneratorTab = generatorTabs.some((tab) => tab.key === requestedTab) ? requestedTab as GeneratorTab : 'viral';
  const [activeTab, setActiveTab] = useState<GeneratorTab>(initialTab);
  const [activeViralSection, setActiveViralSection] = useState('plugin');
  const selectedViralSection = viralSections.find((item) => item.key === activeViralSection) || viralSections[0];

  return (
    <div className="page-stack script-generator-management-page">
      <PageHeader
        title="脚本生成器"
        description="集中管理爆款脚本采集、文案整理、简易解析、深度拉片和脚本生成。"
      />

      <div className="script-generator-tabs" role="tablist" aria-label="脚本生成器提示词分类">
        {generatorTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={`script-generator-tab${activeTab === tab.key ? ' active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearchParams(tab.key === 'viral' ? {} : { tab: tab.key }, { replace: true });
              }}
            >
              <Icon size={19} />
              <span>
                <strong>{tab.label}</strong>
                <small>{tab.description}</small>
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === 'viral' ? <div className="viral-management-layout">
          <aside className="viral-management-nav" aria-label="爆款复刻管理配置">
            <div className="viral-management-nav-title">
              <strong>爆款复刻管理</strong>
              <span>{viralSections.length} 项配置</span>
            </div>
            {viralSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  className={`viral-management-nav-item${activeViralSection === section.key ? ' active' : ''}`}
                  type="button"
                  key={section.key}
                  onClick={() => setActiveViralSection(section.key)}
                >
                  <Icon size={18} />
                  <span>
                    <strong>{section.label}</strong>
                    <small>{section.sceneCode || '深度解析插件'}</small>
                  </span>
                </button>
              );
            })}
          </aside>

          <section className="viral-management-content">
            <div className="viral-management-heading">
              <div>
                <span>爆款复刻管理</span>
                <h2>{selectedViralSection.label}</h2>
                <p>{selectedViralSection.description}</p>
              </div>
              {selectedViralSection.sceneCode ? <code>{selectedViralSection.sceneCode}</code> : null}
            </div>

            {selectedViralSection.sceneCode ? (
              <PromptTemplatesPage
                embedded
                sceneCode={selectedViralSection.sceneCode}
                pageTitle={selectedViralSection.label}
                pageDescription={selectedViralSection.description}
              />
            ) : (
              <SectionCard
                title="爆款深度解析插件链路"
                description="插件负责采集并提交爆款内容，提取文案后继续调用深度解析；深度解析提示词在左侧“深度拉片解析”中维护。"
                action={<span className="status-badge green">接口已接入</span>}
              >
                <div className="plugin-endpoint-list">
                  <div><span>插件提交并解析内容</span><code>POST /api/video/share-url/parse</code></div>
                  <div><span>提取爆款原始文案</span><code>POST /api/script-generator/extract-copy</code></div>
                  <div><span>执行深度拉片解析</span><code>POST /api/script-generator/analyze-copy · mode=deep</code></div>
                  <div><span>深度解析场景</span><code>source_copy_deep_analyze</code></div>
                </div>
              </SectionCard>
            )}
          </section>
      </div> : null}

      {activeTab === 'original' ? (
        <section className="generator-prompt-tab">
          <PromptTemplatesPage
            embedded
            sceneCode="script_generate_original"
            pageTitle="AI原创脚本生成提示词"
            pageDescription="维护 AI 原创模式生成完整脚本时使用的系统提示词、用户提示词和输出结构。"
          />
        </section>
      ) : null}

      {activeTab === 'template' ? (
        <section className="generator-prompt-tab">
          <PromptTemplatesPage
            embedded
            sceneCode="script_generate_template"
            pageTitle="脚本模板库生成提示词"
            pageDescription="维护选择模板后结合产品 Brief 和脚本配置生成模板脚本时使用的提示词。"
          />
        </section>
      ) : null}

      {activeTab === 'title' ? (
        <section className="generator-prompt-tab">
          <div className="generator-prompt-heading">
            <span>脚本标题规则</span>
            <h2>标题生成与润色提示词</h2>
            <p>首次生成规则用于新脚本标题；润色规则用于 AI 润色及“按评论修改”时决定是否保留或改写标题。</p>
          </div>
          <PromptTemplatesPage
            embedded
            sceneCode="script_title_rules"
            pageTitle="脚本标题提示词"
            pageDescription="统一管理脚本标题的首次生成与后续润色规则。"
            requireSystemPrompt
            systemPromptLabel="首次生成标题规则（systemPrompt）"
            userPromptLabel="润色/评论修改标题规则（userPrompt）"
            systemPromptPlaceholder="例如：最终输出第一行使用“标题：<创意标题>”，标题 10-30 字…"
            userPromptPlaceholder="例如：用户未要求修改标题时保留原标题；标题评论要求修改时根据评论改写…"
          />
        </section>
      ) : null}

      {activeTab === 'format' ? (
        <section className="generator-prompt-tab">
          <ScriptFormatsPage embedded />
        </section>
      ) : null}
    </div>
  );
};

export default ScriptGeneratorManagementPage;
