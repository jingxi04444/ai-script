import { useState } from 'react';
import {
  LinkOutlined,
  FileTextOutlined,
  ShareAltOutlined,
  CopyOutlined,
  EditOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  HighlightOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { Select, Input } from 'antd';
import type { ScriptMode } from '../../../stores/workspaceStore';

interface ScriptGeneratorPanelProps {
  mode: ScriptMode;
  onScriptModeChange: (mode: ScriptMode) => void;
}

const ScriptGeneratorPanel = ({ mode, onScriptModeChange }: ScriptGeneratorPanelProps) => {
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'deep'>('simple');
  const [linkValue, setLinkValue] = useState('');

  if (mode === 'template') {
    return <TemplateLibraryPanel />;
  }

  if (mode === 'original') {
    return <OriginalScriptPanel />;
  }

  if (mode !== 'viral') {
    return <PlaceholderPanel mode={mode} />;
  }

  return (
    <div className="replica-script-container">
      {/* Top Bar */}
      <div className="replica-topbar">
        <div className="replica-tabs">
          <button
            className={mode === 'viral' ? 'active' : ''}
            onClick={() => onScriptModeChange('viral')}
          >
            爆款复刻
          </button>
          <button
            className={mode === 'template' ? 'active' : ''}
            onClick={() => onScriptModeChange('template')}
          >
            脚本模板库
          </button>
          <button
            className={mode === 'original' ? 'active' : ''}
            onClick={() => onScriptModeChange('original')}
          >
            AI原创
          </button>
        </div>
        <button className="replica-add-btn" onClick={() => onScriptModeChange('mine')}>
          <span>+</span> 新增脚本
        </button>
      </div>

      {/* Main Content */}
      <div className="replica-content">
        {/* Section 1: Reference Link */}
        <div className="replica-section">
          <div className="section-label">参考视频链接</div>
          <div className="link-input-row">
            <div className="link-input-box">
              <LinkOutlined className="link-icon" />
              <Input
                className="link-input"
                placeholder="请粘贴参考视频的链接"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
              />
            </div>
            <button className="parse-btn">
              <CheckCircleOutlined /> 确认解析
            </button>
          </div>
          <div className="link-hint">支持抖音 / 小红书 / 视频号等链接；纯 BGM / 无字幕视频可能无法拆解。</div>
        </div>

        {/* Section 2: Analysis Mode Toggle */}
        <div className="replica-section">
          <div className="section-label">解析模式</div>
          <div className="analysis-toggle">
            <button
              className={`toggle-btn ${analysisMode === 'simple' ? 'active' : ''}`}
              onClick={() => setAnalysisMode('simple')}
            >
              <FileTextOutlined />
              <span>简易文案解析</span>
            </button>
            <button
              className={`toggle-btn ${analysisMode === 'deep' ? 'active' : ''}`}
              onClick={() => setAnalysisMode('deep')}
            >
              <ShareAltOutlined />
              <span>深度拉片拆解</span>
            </button>
          </div>
        </div>

        {/* Section 3: Script Result */}
        <div className="replica-section result-section">
          <div className="result-header">
            <span className="result-title">拆解结果·文案</span>
            <div className="result-actions">
              <button><CopyOutlined /> 复制</button>
              <button><DeleteOutlined /> 清空</button>
              <button><EditOutlined /> 校验修改</button>
              <button className="ok-btn"><CheckCircleOutlined /> 确认OK</button>
            </div>
          </div>
          <div className="result-content">
            {analysisMode === 'deep' ? (
              <p className="script-text">
                早上被闹钟叫醒，你以为是新的一天，其实只是重复的开始。
                <br />挤地铁、打卡、做表格、开会、回复消息。
                <br />我们不是不努力，只是一直在为别人的目标奔跑。
                <br />直到有一天，你开始问自己：这真的是我想要的生活吗？
                <br />真正的自由，不是躺平，而是有选择的权利。
                <br />从今天起，做一次为自己而活的选择。
              </p>
            ) : (
              <p className="script-text">
                熬夜累眼圈、毛孔粗大、胶原崩塌？别再拿美妆硬撑了！
                <br />这款水光焕亮精华，专为熬夜肌研制，核心成分烟酰胺 + 玻尿酸，一抹渗透，层层补水焕亮。
                <br />7天淡化暗沉，14天透亮发光，真实用户反馈，效果看得见！
                <br />早晚洁面后，取2-3滴轻拍全脸，坚持使用，素颜也能发光。
                <br />现在下单，限时买1送1，再送旅行装，焕亮肌肤就趁现在！
              </p>
            )}
          </div>
        </div>

        {/* Section 4: Structure Analysis */}
        <div className="replica-section analysis-section">
          <div className="analysis-header">
            <span className="analysis-title">文案结构分析</span>
            <div className="analysis-actions">
              <button><EditOutlined /> 校验修改</button>
              <button className="ok-btn"><CheckCircleOutlined /> 确认OK</button>
            </div>
          </div>

          {analysisMode === 'deep' ? (
            <div className="structure-grid deep-grid">
              <AnalysisCard
                icon={<FileTextOutlined />}
                title="封面分析"
                lines={['强对比标题，突出痛点关键词', '画面人物表情共鸣，吸引点击']}
              />
              <AnalysisCard
                icon={<FileTextOutlined />}
                title="标题分析"
                lines={['强句式引发好奇', '情绪词强化共鸣与代入感']}
              />
              <AnalysisCard
                icon={<FileTextOutlined />}
                title="造型分析"
                lines={['聚焦职场生活场景', '目标人群明确，易引发共鸣']}
              />
              <AnalysisCard
                icon={<FileTextOutlined />}
                title="文案分析"
                lines={['从焦虑到觉醒，情绪递进', '金句收尾，引导行动']}
              />
              <AnalysisCard
                icon={<FileTextOutlined />}
                title="结构分析"
                lines={['总分总结构，节奏清晰', '前钩子+中间转折+后升华']}
              />
              <AnalysisCard
                icon={<FileTextOutlined />}
                title="剪辑风格分析"
                lines={['快节奏剪辑，卡点紧凑', 'BGM 情绪匹配，增强感染力']}
              />
            </div>
          ) : (
            <ul className="simple-list">
              <li>开场吸引：抛出常见肌肤问题，制造焦虑，引发注意。</li>
              <li>痛点共鸣：强调熬夜肌的困扰，贴近用户真实场景。</li>
              <li>卖点强化：介绍核心成分与功效，突出产品优势。</li>
              <li>效果证明：用时间维度与用户反馈增强可信度。</li>
              <li>行动引导：给出使用方法与优惠信息，促成下单。</li>
            </ul>
          )}
        </div>

        {/* Section 5: Script Config */}
        <div className="replica-section config-section">
          <div className="config-header">
            <span className="config-title">脚本配置</span>
            <p className="config-desc">设置脚本输出格式、时长、产品及素材等信息，生成更贴合需求的脚本。</p>
          </div>
          <div className="config-fields">
            <div className="config-field">
              <label>脚本格式</label>
              <Select
                defaultValue="storyboard"
                suffixIcon={<span style={{ fontSize: 10 }}>▼</span>}
                options={[
                  { value: 'storyboard', label: '分镜脚本表' },
                  { value: 'oral', label: '口播脚本' },
                  { value: 'shot', label: '拍摄脚本' },
                ]}
              />
            </div>
            <div className="config-field">
              <label>脚本时长</label>
              <Select
                defaultValue="30s"
                suffixIcon={<span style={{ fontSize: 10 }}>▼</span>}
                options={[
                  { value: '15s', label: '15s' },
                  { value: '30s', label: '30s' },
                  { value: '60s', label: '60s' },
                ]}
              />
            </div>
            <div className="config-field">
              <label>产品选择</label>
              <Select
                defaultValue="brief-v12"
                suffixIcon={<span style={{ fontSize: 10 }}>▼</span>}
                options={[
                  { value: 'brief-v12', label: '加热饭盒 Brief v1.2' },
                  { value: 'brief-v11', label: '加热饭盒 Brief v1.1' },
                  { value: 'brief-new', label: '新建 Brief' },
                ]}
              />
            </div>
            <div className="config-field upload-field">
              <label>产品画面</label>
              <button type="button" className="upload-btn">
                <span className="upload-icon">+</span>
                <div className="upload-text">
                  <strong>上传产品画面</strong>
                  <small>支持 JPG / PNG，建议 16:9</small>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="generate-section">
          <button className="generate-btn">
            <HighlightOutlined />
            <span>生成脚本</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface AnalysisCardProps {
  icon: React.ReactNode;
  title: string;
  lines: string[];
}

function AnalysisCard({ icon, title, lines }: AnalysisCardProps) {
  return (
    <div className="analysis-card">
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <strong>{title}</strong>
        {lines.map((line, index) => (
          <p key={index}>· {line}</p>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPanel({ mode }: { mode: ScriptMode }) {
  const contentMap: Record<string, { title: string; desc: string }> = {
    mine: { title: '我的模板库', desc: '管理和复用你的私有脚本模板，保持团队创作风格一致。' },
    template: { title: '脚本模板库', desc: '选择平台模板或行业模板，快速生成符合结构的分镜脚本。' },
    original: { title: 'AI原创', desc: '基于产品卖点、目标人群与场景需求，直接生成原创脚本方向。' },
  };
  const item = contentMap[mode] || { title: '', desc: '' };

  return (
    <div className="placeholder-panel">
      <div className="placeholder-content">
        <div className="placeholder-icon">
          <FileTextOutlined />
        </div>
        <h2>{item.title}</h2>
        <p>{item.desc}</p>
        <button>新增脚本</button>
      </div>
    </div>
  );
}

function TemplateLibraryPanel() {
  const [category, setCategory] = useState('产品介绍');
  const categories = ['全部', '产品介绍', '创意剧情', '福利', '测评', '教程'];
  const templates = [
    { id: '01', name: '痛点解决型', actor: '女', people: '1人', popularity: '高', difficulty: '简单' },
    { id: '02', name: '功能讲解型', actor: '男', people: '1人', popularity: '高', difficulty: '简单' },
    { id: '03', name: '对比突出型', actor: '男女', people: '2人', popularity: '中', difficulty: '中等' },
  ];

  return (
    <div className="template-library">
      <div className="template-header">
        <h2>脚本模板库</h2>
        <div className="template-categories">
          {categories.map((cat) => (
            <button
              key={cat}
              className={cat === category ? 'active' : ''}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="template-grid">
        {templates.map((tpl) => (
          <button key={tpl.id} className="template-card">
            <div className="card-header">
              <span>{tpl.id}</span>
            </div>
            <h3>模板名字：{tpl.name}</h3>
            <div className="card-meta">
              <span><b>演员</b><strong>{tpl.actor}</strong></span>
              <span><b>人数</b><strong>{tpl.people}</strong></span>
              <span><b>人气</b><strong>{tpl.popularity}</strong></span>
              <span><b>难度</b><strong>{tpl.difficulty}</strong></span>
            </div>
          </button>
        ))}
      </div>
      <div className="template-footer">
        <button className="template-generate-btn">
          <DownloadOutlined />
          生成脚本
        </button>
      </div>
    </div>
  );
}

function OriginalScriptPanel() {
  return (
    <div className="original-script-container">
      <h2>AI原创</h2>
      <div className="original-demand">
        <h3>创作需求</h3>
        <textarea placeholder="请输入你的创作想法..." maxLength={500} />
        <button className="original-generate-btn">
          <HighlightOutlined />
          AI生成脚本
        </button>
      </div>
    </div>
  );
}

export default ScriptGeneratorPanel;
