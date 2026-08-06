import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileTextOutlined,
  HighlightOutlined,
  FolderOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  PictureOutlined,
  FontSizeOutlined,
  OrderedListOutlined,
  ShareAltOutlined,
  ScissorOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  SaveOutlined,
  SearchOutlined,
  SendOutlined,
  LeftOutlined,
  RightOutlined,
  LockOutlined,
  DownOutlined,
  UploadOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  RobotOutlined,
  PlusOutlined,
  HistoryOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import { message, Modal, Popover, Select, Upload } from 'antd';
import { briefApi } from '../../../api/brief';
import { assetApi } from '../../../api/asset';
import { generationApi } from '../../../api/generation';
import { scriptApi } from '../../../api/script';
import { siteApi, type SiteConfig } from '../../../api/site';
import { sourceApi } from '../../../api/source';
import { useWorkspaceStore, type ScriptMode } from '../../../stores/workspaceStore';
import type { Brief } from '../../../types/brief';
import type { Asset } from '../../../types/asset';
import { normalizeScriptStatus, scriptStatusOptions } from '../../../types/script';
import type { Script, ScriptFormatOption, ScriptPolishMessage, ScriptStatus, ScriptTemplate, ScriptType, ScriptVersion } from '../../../types/script';
import type { AnalysisDimension } from '../../../types/source';
import './script-generator-panel.css';

interface ProductFrameUploadState {
  assetId?: string;
  url?: string;
  fileName?: string;
  objectKey?: string;
  extractedText?: string;
}

interface PolishMentionRange {
  start: number;
  end: number;
}

interface ScriptAnnotation {
  id: string;
  rowIndex: number;
  columnIndex: number;
  columnLabel: string;
  originalText: string;
  content: string;
}

type TemplateCategory = '最新热点' | '产品介绍' | '创意剧情' | '活动福利' | '选购攻略';
type TemplateFilter = '全部' | TemplateCategory;
type TemplateSort = '综合排序' | '热度最高' | '最新模板';
type TemplateCard = ScriptTemplate & { category: TemplateCategory; popularityScore: number; updatedOrder: number };
interface OriginalScenarioPrompt {
  id: string;
  title: string;
  prompt: string;
  subtitle?: string;
  tag?: string;
}

interface OriginalScenarioCategory {
  id: string;
  title: string;
  subtitle?: string;
  prompt: string;
  children: OriginalScenarioPrompt[];
}

const fallbackFormatOptions: ScriptFormatOption[] = [
  { code: 'storyboard', name: '分镜脚本表', formatRequirement: '按分镜表输出，包含镜头、画面内容、口播文案、字幕/花字、运镜、时长和备注。', sortOrder: 1, status: 1 },
  { code: 'oral', name: '口播脚本', formatRequirement: '按口播稿输出，重点保证开头钩子、口语表达、卖点展开和行动引导完整连贯。', sortOrder: 2, status: 1 },
  { code: 'shot', name: '拍摄脚本', formatRequirement: '按拍摄执行稿输出，明确场景、人物动作、镜头调度、道具、字幕和剪辑提示。', sortOrder: 3, status: 1 },
];

const durationOptions = [
  { value: '参考模版时长', label: '参考模版时长' },
  { value: '20秒内', label: '20秒内' },
  { value: '20-30秒内', label: '20-30秒内' },
  { value: '30-40秒内', label: '30-40秒内' },
  { value: '40-60秒内', label: '40-60秒内' },
  { value: '60秒以上', label: '60秒以上' },
];

const fallbackOriginalScenarioPrompts: OriginalScenarioPrompt[] = [
  {
    id: 'main-image',
    title: '电商主图',
    subtitle: '突出首屏卖点与转化钩子',
    prompt: '请生成电商主图短视频脚本，重点突出产品第一卖点、视觉冲击、使用场景和下单理由，开头3秒必须快速抓住注意力。',
    tag: '电商主图',
  },
  {
    id: 'unboxing',
    title: '产品开箱',
    subtitle: '展示开箱细节与上手体验',
    prompt: '请生成产品开箱脚本，按照开箱期待、外观细节、核心配件、上手体验、惊喜卖点和购买建议展开。',
    tag: '开箱体验',
  },
  {
    id: 'pain-point',
    title: '人群痛点',
    subtitle: '先讲真实困扰，再给解决方案',
    prompt: '请围绕目标人群痛点生成脚本，先描述具体生活场景中的真实困扰并建立共鸣，再自然引出产品解决方案、核心卖点和转化引导。',
    tag: '痛点转化',
  },
  {
    id: 'product-overview',
    title: '产品介绍',
    subtitle: '用画面与字幕讲清产品价值',
    prompt: '请生成产品介绍短视频脚本，通过画面、字幕和场景演示依次讲清产品定位、核心功能、差异化卖点、使用方法、适用人群和购买理由。',
    tag: '产品介绍',
  },
  {
    id: 'product-intro',
    title: '产品介绍口播',
    subtitle: '自然讲清产品定位、卖点和购买理由',
    prompt: '请生成产品介绍口播脚本，语言自然直接，包含产品定位、适用人群、核心卖点、使用方法和购买理由。',
    tag: '口播种草',
  },
  {
    id: 'unboxing-oral',
    title: '产品开箱口播',
    subtitle: '第一视角表达真实开箱与即时感受',
    prompt: '请生成产品开箱口播脚本，以第一视角表达开箱过程，突出真实感、细节观察、即时体验和种草氛围。',
    tag: '开箱口播',
  },
  {
    id: 'guide',
    title: '选购攻略/科普',
    subtitle: '用避坑标准和科普逻辑建立信任',
    prompt: '请生成选购攻略或科普类脚本，先提出用户常见误区，再给出判断标准，最后带出产品优势和适合购买的人群。',
    tag: '攻略科普',
  },
  {
    id: 'review',
    title: '测评',
    subtitle: '用测试过程和优缺点提升可信度',
    prompt: '请生成真实测评脚本，包含测试方法、使用前后对比、优缺点说明、适合人群和购买建议，表达要可信。',
    tag: '真实测评',
  },
  {
    id: 'vlog',
    title: 'vlog',
    subtitle: '把产品自然融入生活方式场景',
    prompt: '请生成生活方式 vlog 脚本，把产品自然融入一天中的真实场景，强调情绪、氛围、使用过程和生活改善。',
    tag: '生活方式',
  },
  {
    id: 'desire',
    title: '氛围欲望激发',
    subtitle: '营造拥有后的理想状态和情绪价值',
    prompt: '请生成氛围感和欲望激发型脚本，重点营造画面、情绪、身份感和拥有后的理想状态，弱化硬广感。',
    tag: '氛围种草',
  },
];

const fallbackOriginalScenarioCategories: OriginalScenarioCategory[] = [
  {
    id: 'ecommerce',
    title: '电商',
    subtitle: '突出首屏卖点与转化钩子',
    prompt: '请创作以电商转化为目标的短视频脚本，突出产品核心价值、视觉吸引力、使用场景和清晰的下单理由。',
    children: fallbackOriginalScenarioPrompts.filter((item) => ['main-image', 'product-overview', 'product-intro', 'guide'].includes(item.id)),
  },
  {
    id: 'unboxing-category',
    title: '产品开箱',
    subtitle: '开箱细节、上手体验和惊喜感',
    prompt: '请从真实开箱和首次体验出发创作脚本，呈现拆封过程、产品细节、上手感受和逐步揭晓的惊喜。',
    children: fallbackOriginalScenarioPrompts.filter((item) => ['unboxing', 'unboxing-oral', 'review'].includes(item.id)),
  },
  {
    id: 'pain-point-category',
    title: '人群痛点产品介绍',
    subtitle: '先讲真实困扰，再给解决方案',
    prompt: '请围绕目标人群的真实困扰创作产品介绍脚本，先建立痛点共鸣，再自然说明产品如何解决问题并带来改变。',
    children: fallbackOriginalScenarioPrompts.filter((item) => ['pain-point', 'vlog', 'desire'].includes(item.id)),
  },
];

const combineOriginalPrompts = (category?: OriginalScenarioCategory, child?: OriginalScenarioPrompt) =>
  [category?.prompt.trim(), child?.prompt.trim()].filter(Boolean).join('\n\n');

const parseOriginalScenarioPrompts = (value?: string): OriginalScenarioCategory[] => {
  if (!value?.trim()) return fallbackOriginalScenarioCategories;
  try {
    const parsed = JSON.parse(value) as Array<OriginalScenarioCategory | OriginalScenarioPrompt>;
    if (!Array.isArray(parsed) || !parsed.length) return fallbackOriginalScenarioCategories;
    if ('children' in parsed[0]) {
      const categories = (parsed as OriginalScenarioCategory[])
        .filter((item) => item?.id && item?.title && item?.prompt && Array.isArray(item.children))
        .map((item) => ({
          ...item,
          children: item.children.filter((child) => child?.id && child?.title && child?.prompt),
        }))
        .filter((item) => item.children.length);
      return categories.length ? categories : fallbackOriginalScenarioCategories;
    }

    const legacyItems = (parsed as OriginalScenarioPrompt[]).filter((item) => item?.id && item?.title && item?.prompt);
    const legacyById = new Map(legacyItems.map((item) => [item.id, item]));
    const knownIds = new Set(fallbackOriginalScenarioPrompts.map((item) => item.id));
    return fallbackOriginalScenarioCategories.map((category, index) => ({
      ...category,
      children: [
        ...category.children.map((child) => legacyById.get(child.id) || child),
        ...(index === 0 ? legacyItems.filter((item) => !knownIds.has(item.id)) : []),
      ],
    }));
  } catch {
    return fallbackOriginalScenarioCategories;
  }
};

const polishQuickPrompts = ['更口语一点', '压缩到 30 秒', '强化产品卖点', '开场更抓人', '结尾更强转化'];

const templateCategories: TemplateFilter[] = ['全部', '最新热点', '产品介绍', '创意剧情', '活动福利', '选购攻略'];
const templatePageSize = 10;
const displayTemplateMeta = (value?: string) => {
  const characters = Array.from(value ?? '');
  return characters.length > 3 ? `${characters.slice(0, 3).join('')}…` : characters.join('');
};
const defaultStructureText = '开场吸引：抛出常见肌肤问题，制造焦虑，引发注意。\n痛点共鸣：强调熬夜肌的困扰，贴近用户真实场景。\n卖点强化：介绍核心成分与功效，突出产品优势。\n效果证明：用时间维度与用户反馈增强可信度。\n行动引导：给出使用方法与优惠信息，促成下单。';
const defaultAnalysisText = '点击确认解析后，系统会自动解析文字稿，请稍等正在解析中（内容可在后台设置）';
const defaultStructureHint = '确认解析后，这里会自动生成文案结构分析，内容可在后台设置。';
const dimensionFallbackTitles = ['段落结构拆解', '需要特别指出', '完整深度拉片报告', '结构公式总结', '复刻要点', '剪辑建议'];
const dimensionsToText = (dimensions: AnalysisDimension[]) => dimensions.map((item) => `${item.title}：${item.content}`).join('\n');
const isScriptMode = (value: string | null): value is ScriptMode => value === 'viral' || value === 'template' || value === 'original' || value === 'mine' || value === 'product' || value === 'product-dimension';
const parseStructureSummary = (text: string): AnalysisDimension[] => {
  const source = text.trim();
  if (!source) return [];
  const numberedPattern = /(?:^|\n)\s*(\d+)[.、]\s*([^\n:：]+?)\s*(?:\n|[:：])\s*([\s\S]*?)(?=\n\s*\d+[.、]\s*[^\n:：]+?\s*(?:\n|[:：])|$)/g;
  const numberedItems = Array.from(source.matchAll(numberedPattern)).map((match, index) => ({
    key: `summary-${match[1] || index}`,
    title: match[2].trim(),
    content: match[3].trim(),
  })).filter((item) => item.title && item.content);
  if (numberedItems.length) return numberedItems;

  return source.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [title, ...rest] = line.split(/[:：]/);
    return {
      key: `fallback-${index}`,
      title: rest.length ? title.trim().replace(/^\d+[.、]\s*/, '') : dimensionFallbackTitles[index] || `分析 ${index + 1}`,
      content: rest.length ? rest.join('：').trim() : line.replace(/^\d+[.、]\s*/, ''),
    };
  }).filter((item) => item.title && item.content);
};

const formatParsedCopy = (text: string) => {
  const source = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  if (!source) return '';
  const sentenceLines = source
    .replace(/([。！？!?；;])\s*/g, '$1\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (sentenceLines.length > 1) return sentenceLines.join('\n');
  return source.replace(/(.{24,42}?[，,、])\s*/g, '$1\n').trim();
};

const templateCards: TemplateCard[] = [
  { id: '01', name: '纠正型带货', actor: '男/女', people: '1人', popularity: '高', difficulty: '宝妈', paragraphStructure: '误区/纠正/方案/证明/引导五段式拆解。', firstFiveSecondsHook: '先指出用户常见错误，快速制造认知反差。', structureFormula: '误区指出 → 正确方案 → 产品介入 → 效果证明 → 行动引导', locked: false, category: '产品介绍', popularityScore: 98, updatedOrder: 24 },
  { id: '02', name: '痛点解决型', actor: '女', people: '1人', popularity: '高', difficulty: '上班族', paragraphStructure: '痛点/场景/解决/效果/行动五段式拆解。', firstFiveSecondsHook: '开场抓住具体痛点并贴近生活场景。', structureFormula: '痛点开场 → 场景放大 → 产品解决 → 效果展示 → 行动引导', locked: false, category: '产品介绍', popularityScore: 96, updatedOrder: 23 },
  { id: '03', name: '功能讲解型', actor: '男/女', people: '1人', popularity: '高', difficulty: '通用', paragraphStructure: '功能/演示/细节/收益/引导五段式拆解。', firstFiveSecondsHook: '用一个明确使用场景引出核心功能。', structureFormula: '功能引入 → 使用演示 → 细节证明 → 用户收益 → 行动引导', locked: false, category: '产品介绍', popularityScore: 92, updatedOrder: 22 },
  { id: '04', name: '场景种草型', actor: '女', people: '1人', popularity: '中', difficulty: '宝妈', locked: true, category: '产品介绍', popularityScore: 86, updatedOrder: 21 },
  { id: '05', name: '对比突出型', actor: '男/女', people: '2人', popularity: '高', difficulty: '通用', locked: true, category: '产品介绍', popularityScore: 90, updatedOrder: 20 },
  { id: '06', name: '反转剧情型', actor: '男/女', people: '2人', popularity: '高', difficulty: '年轻人', locked: true, category: '创意剧情', popularityScore: 91, updatedOrder: 19 },
  { id: '07', name: '办公室短剧', actor: '男/女', people: '3人', popularity: '中', difficulty: '上班族', locked: true, category: '创意剧情', popularityScore: 84, updatedOrder: 18 },
  { id: '08', name: '家庭场景型', actor: '女', people: '2人', popularity: '中', difficulty: '宝妈', locked: true, category: '创意剧情', popularityScore: 82, updatedOrder: 17 },
  { id: '09', name: '限时优惠型', actor: '男/女', people: '1人', popularity: '高', difficulty: '通用', locked: true, category: '活动福利', popularityScore: 89, updatedOrder: 16 },
  { id: '10', name: '买赠福利型', actor: '女', people: '1人', popularity: '中', difficulty: '宝妈', locked: true, category: '活动福利', popularityScore: 80, updatedOrder: 15 },
  { id: '11', name: '节日促销型', actor: '男/女', people: '2人', popularity: '高', difficulty: '通用', locked: false, category: '活动福利', popularityScore: 88, updatedOrder: 14 },
  { id: '12', name: '真实测评型', actor: '男', people: '1人', popularity: '高', difficulty: '测评党', locked: false, category: '选购攻略', popularityScore: 94, updatedOrder: 13 },
  { id: '13', name: '开箱体验型', actor: '女', people: '1人', popularity: '中', difficulty: '通用', locked: true, category: '选购攻略', popularityScore: 81, updatedOrder: 12 },
  { id: '14', name: '横向测评型', actor: '男/女', people: '1人', popularity: '高', difficulty: '测评党', locked: true, category: '选购攻略', popularityScore: 87, updatedOrder: 11 },
  { id: '15', name: '三步教程型', actor: '男/女', people: '1人', popularity: '高', difficulty: '通用', locked: true, category: '选购攻略', popularityScore: 85, updatedOrder: 10 },
  { id: '16', name: '新手教学型', actor: '女', people: '1人', popularity: '中', difficulty: '新手', locked: true, category: '选购攻略', popularityScore: 76, updatedOrder: 9 },
  { id: '17', name: '避坑指南型', actor: '男', people: '1人', popularity: '高', difficulty: '通用', locked: false, category: '选购攻略', popularityScore: 90, updatedOrder: 8 },
  { id: '18', name: '用户证言型', actor: '女', people: '1人', popularity: '中', difficulty: '宝妈', locked: true, category: '产品介绍', popularityScore: 79, updatedOrder: 7 },
  { id: '19', name: '权威背书型', actor: '男', people: '1人', popularity: '中', difficulty: '通用', locked: true, category: '产品介绍', popularityScore: 78, updatedOrder: 6 },
  { id: '20', name: '清单推荐型', actor: '男/女', people: '1人', popularity: '高', difficulty: '上班族', locked: true, category: '产品介绍', popularityScore: 83, updatedOrder: 5 },
  { id: '21', name: '轻喜剧带货', actor: '男/女', people: '3人', popularity: '高', difficulty: '年轻人', locked: true, category: '创意剧情', popularityScore: 86, updatedOrder: 4 },
  { id: '22', name: '直播福利切片', actor: '女', people: '1人', popularity: '高', difficulty: '通用', locked: true, category: '活动福利', popularityScore: 82, updatedOrder: 3 },
  { id: '23', name: '实测对比型', actor: '男', people: '1人', popularity: '中', difficulty: '测评党', locked: true, category: '选购攻略', popularityScore: 77, updatedOrder: 2 },
  { id: '24', name: '保养教程型', actor: '女', people: '1人', popularity: '中', difficulty: '新手', locked: true, category: '选购攻略', popularityScore: 75, updatedOrder: 1 },
];

interface ScriptEntryCard {
  mode: ScriptMode;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  icon: ReactNode;
  iconUrl?: string;
}

interface ScriptVisualConfig {
  assistantTitle?: string;
  assistantSubtitle?: string;
  assistantIconUrl?: string;
  modeItems?: Array<{ key: string; label?: string; description?: string; iconUrl?: string }>;
}

const modeEntryCards: ScriptEntryCard[] = [
  {
    mode: 'viral',
    title: '爆款链接复刻',
    subtitle: '拆解参考视频',
    description: '输入链接，自动拆解结构、节奏和卖点，快速复刻爆款表达。',
    accent: 'gold',
    icon: <LinkOutlined />,
  },
  {
    mode: 'template',
    title: '脚本模板库',
    subtitle: '直接套用模板',
    description: '从热门模板里挑选合适范式，结合产品 Brief 快速生成脚本。',
    accent: 'green',
    icon: <FileTextOutlined />,
  },
  {
    mode: 'original',
    title: 'AI智能脚本',
    subtitle: '从 0 开始创作',
    description: '输入创作需求，AI 将帮你搭建完整脚本结构与口播内容。',
    accent: 'violet',
    icon: <HighlightOutlined />,
  },
  {
    mode: 'mine',
    title: '我的模板库',
    subtitle: '个人模板管理',
    description: '收纳你自己的模板与脚本资产，后续可在此沉淀私有创作风格。',
    accent: 'cyan',
    icon: <FolderOutlined />,
  },
];

const parseScriptVisualConfig = (value?: string): ScriptVisualConfig => {
  if (!value?.trim()) return {};
  try {
    return JSON.parse(value) as ScriptVisualConfig;
  } catch {
    return {};
  }
};

interface TemplateSpecFields {
  firstFiveSecondsHook: string;
  modelFormula: string;
}

const getTemplateSpecFields = (card: TemplateCard): TemplateSpecFields => {
  return {
    firstFiveSecondsHook: card.firstFiveSecondsHook?.trim() || '',
    modelFormula: card.structureFormula?.trim() || card.modelFormula?.trim() || '',
  };
};

interface ScriptGeneratorPanelProps {
  projectId: string | null;
  ensureProjectId: () => Promise<string>;
  dialogOnly?: boolean;
}

const ScriptGeneratorPanel = ({ projectId, ensureProjectId, dialogOnly = false }: ScriptGeneratorPanelProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setActiveStep, setScriptMode } = useWorkspaceStore();
  const activeModeParam = searchParams.get('scriptMode');
  const activeMode = isScriptMode(activeModeParam) ? activeModeParam : null;
  const editScriptId = searchParams.get('editScriptId');
  const briefIdParam = searchParams.get('briefId');
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'deep'>('simple');
  const [selectedTemplate, setSelectedTemplate] = useState(templateCards[0].id);
  const [category, setCategory] = useState<TemplateFilter>('全部');
  const [templateSort, setTemplateSort] = useState<TemplateSort>('综合排序');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templatePage, setTemplatePage] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [selectedOriginalCategory, setSelectedOriginalCategory] = useState<string>(fallbackOriginalScenarioCategories[0].id);
  const [selectedOriginalScenario, setSelectedOriginalScenario] = useState<string>(fallbackOriginalScenarioCategories[0].children[0].id);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzingCopy, setIsAnalyzingCopy] = useState(false);
  const [copyAnalyzed, setCopyAnalyzed] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [structureText, setStructureText] = useState('');
  const [structureDimensions, setStructureDimensions] = useState<AnalysisDimension[]>([]);
  const [isAnalysisEditing, setIsAnalysisEditing] = useState(false);
  const [isStructureEditing, setIsStructureEditing] = useState(false);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [isEditingScriptName, setIsEditingScriptName] = useState(false);
  const [scriptNameDraft, setScriptNameDraft] = useState('');
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [originalScriptContent, setOriginalScriptContent] = useState('');
  const [polishInput, setPolishInput] = useState('');
  const [polishBriefId, setPolishBriefId] = useState<string>();
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [polishMentionOpen, setPolishMentionOpen] = useState(false);
  const [polishMentionQuery, setPolishMentionQuery] = useState('');
  const [polishMentionRange, setPolishMentionRange] = useState<PolishMentionRange | null>(null);
  const [polishMessages, setPolishMessages] = useState<ScriptPolishMessage[]>([]);
  const [scriptVersions, setScriptVersions] = useState<ScriptVersion[]>([]);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string>();
  const [annotationMode, setAnnotationMode] = useState(false);
  const [scriptAnnotations, setScriptAnnotations] = useState<ScriptAnnotation[]>([]);
  const [annotationsLoadedFor, setAnnotationsLoadedFor] = useState<string>();
  const [annotationTarget, setAnnotationTarget] = useState<Omit<ScriptAnnotation, 'id' | 'content'> | null>(null);
  const [annotationDraft, setAnnotationDraft] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [generatingType, setGeneratingType] = useState<ScriptType | null>(null);
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const [templates, setTemplates] = useState<TemplateCard[]>(templateCards);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [briefsLoading, setBriefsLoading] = useState(true);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({});
  const [scriptFormats, setScriptFormats] = useState<ScriptFormatOption[]>(fallbackFormatOptions);
  const [selectedBriefId, setSelectedBriefId] = useState<string>();
  const [scriptFormat, setScriptFormat] = useState('storyboard');
  const [scriptDuration, setScriptDuration] = useState('30-40秒内');
  const [productFrame, setProductFrame] = useState<ProductFrameUploadState | null>(null);
  const [isProductFrameUploading, setIsProductFrameUploading] = useState(false);
  const [frameLibraryOpen, setFrameLibraryOpen] = useState(false);
  const [frameLibraryLoading, setFrameLibraryLoading] = useState(false);
  const [frameLibraryLoaded, setFrameLibraryLoaded] = useState(false);
  const [frameLibraryAssets, setFrameLibraryAssets] = useState<Asset[]>([]);
  const polishInputRef = useRef<HTMLTextAreaElement | null>(null);
  const isDeepMode = analysisMode === 'deep';
  const scriptVisualConfig = parseScriptVisualConfig(siteConfig.scriptVisualConfig);
  const visualModeItems = new Map((scriptVisualConfig.modeItems || []).map((item) => [item.key, item]));
  const visibleModeEntryCards = modeEntryCards.map((card) => {
    const visual = visualModeItems.get(card.mode);
    return {
      ...card,
      title: visual?.label?.trim() || card.title,
      description: visual?.description?.trim() || card.description,
      iconUrl: visual?.iconUrl,
    };
  });
  const assistantTitle = scriptVisualConfig.assistantTitle?.trim() || '铼河AI脚本生成器';
  const assistantSubtitle = scriptVisualConfig.assistantSubtitle?.trim() || '你可以选择不同的创作方式，我来帮你完成脚本';

  const clearEditScriptParam = () => {
    if (!searchParams.has('editScriptId')) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('editScriptId');
    setSearchParams(nextParams, { replace: true });
  };

  const closeResultDialog = () => {
    setResultDialogOpen(false);
    setIsManualEditing(false);
    setPolishMentionOpen(false);
    if (searchParams.get('returnStep') === 'storyboard') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('step', 'storyboard');
      nextParams.delete('scriptMode');
      nextParams.delete('editScriptId');
      nextParams.delete('returnStep');
      setSearchParams(nextParams, { replace: true });
      setActiveStep('storyboard');
      return;
    }
    clearEditScriptParam();
  };

  const createPolishMessage = (role: ScriptPolishMessage['role'], content: string): ScriptPolishMessage => ({
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  });

  const defaultPolishMessage = () => createPolishMessage(
    'assistant',
    '我已读取原脚本。你可以直接告诉我“哪里不行、想怎么改”，也可以点击“批注修改”在具体单元格添加意见。我会保留每次修改记录，并返回完整修改稿。',
  );

  const loadScriptVersions = async (scriptId: string, fallbackContent = '') => {
    const versions = await scriptApi.getVersions(scriptId);
    setScriptVersions(versions);
    setOriginalScriptContent(versions[0]?.content || fallbackContent);
    return versions;
  };

  const loadPolishMessages = async (scriptId: string) => {
    const messages = await scriptApi.getPolishMessages(scriptId);
    setPolishMessages(messages.length ? messages : [defaultPolishMessage()]);
    return messages;
  };

  useEffect(() => {
    scriptApi.getTemplates().then((list) => {
      if (!list.length) return;
      const nextTemplates = list.map((item, index): TemplateCard => ({
        ...item,
        category: (item.category === '测评' || item.category === '教程'
          ? '选购攻略'
          : templateCategories.includes(item.category as TemplateFilter)
            ? item.category
            : '产品介绍') as TemplateCategory,
        popularityScore: item.popularity === '高' ? 95 : item.popularity === '中' ? 82 : 70,
        updatedOrder: Date.parse(item.updatedAt || item.createdAt || '') || list.length - index,
      }));
      setTemplates(nextTemplates);
      setSelectedTemplate(nextTemplates[0].id);
    }).catch(() => message.warning('模板库加载失败，已使用本地兜底模板'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSiteConfig = () => {
      siteApi.getConfig().then((config) => {
        if (!cancelled) setSiteConfig(config);
      }).catch(() => undefined);
    };

    loadSiteConfig();
    window.addEventListener('focus', loadSiteConfig);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', loadSiteConfig);
    };
  }, [activeMode]);

  useEffect(() => {
    if (!generatingType) {
      setGenerationElapsed(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setGenerationElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [generatingType]);

  useEffect(() => {
    scriptApi.getFormats().then((list) => {
      const enabledFormats = (list || [])
        .filter((item) => item.status !== 0)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      if (!enabledFormats.length) return;
      setScriptFormats(enabledFormats);
      if (!enabledFormats.some((item) => item.code === scriptFormat)) {
        setScriptFormat(enabledFormats[0].code);
      }
    }).catch(() => setScriptFormats(fallbackFormatOptions));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBriefsLoading(true);
    setBriefs([]);
    setSelectedBriefId(undefined);
    if (!projectId) {
      setBriefsLoading(false);
      return () => { cancelled = true; };
    }
    briefApi.getList(projectId).then((list) => {
      if (cancelled) return;
      setBriefs(list);
      setSelectedBriefId((current) => {
        if (briefIdParam && list.some((brief) => brief.id === briefIdParam)) return briefIdParam;
        return current && list.some((brief) => brief.id === current) ? current : list[0]?.id;
      });
    }).catch(() => {
      if (!cancelled) message.warning('当前项目 Brief 列表加载失败');
    }).finally(() => {
      if (!cancelled) setBriefsLoading(false);
    });
    return () => { cancelled = true; };
  }, [briefIdParam, projectId]);

  useEffect(() => {
    if (!editScriptId) return;
    scriptApi.getById(editScriptId).then((script) => {
      setCurrentScript({ ...script, status: normalizeScriptStatus(script.status) });
      if (script.briefId) setSelectedBriefId(script.briefId);
      setIsManualEditing(false);
      setPolishInput('');
      setPolishBriefId(undefined);
      Promise.all([
        loadScriptVersions(script.id, script.content || ''),
        loadPolishMessages(script.id),
      ]).catch(() => {
        setOriginalScriptContent(script.content || '');
        setPolishMessages([defaultPolishMessage()]);
      });
      setResultDialogOpen(true);
      clearEditScriptParam();
    }).catch(() => message.warning('脚本内容加载失败'));
  }, [editScriptId]);

  useEffect(() => {
    if (!currentScript?.id) {
      setScriptAnnotations([]);
      setAnnotationsLoadedFor(undefined);
      return;
    }
    const stored = window.localStorage.getItem(`ai-script:annotations:${currentScript.id}`);
    if (!stored) {
      setScriptAnnotations([]);
      setAnnotationsLoadedFor(currentScript.id);
      return;
    }
    try {
      setScriptAnnotations(JSON.parse(stored) as ScriptAnnotation[]);
    } catch {
      setScriptAnnotations([]);
    }
    setAnnotationsLoadedFor(currentScript.id);
  }, [currentScript?.id]);

  useEffect(() => {
    if (!currentScript?.id || annotationsLoadedFor !== currentScript.id) return;
    const key = `ai-script:annotations:${currentScript.id}`;
    if (scriptAnnotations.length) {
      window.localStorage.setItem(key, JSON.stringify(scriptAnnotations));
    } else {
      window.localStorage.removeItem(key);
    }
  }, [annotationsLoadedFor, currentScript?.id, scriptAnnotations]);

  useEffect(() => {
    if (!currentScript?.briefId || !briefs.some((brief) => brief.id === currentScript.briefId)) return;
    setSelectedBriefId(currentScript.briefId);
  }, [briefs, currentScript?.briefId, currentScript?.id]);

  useEffect(() => {
    if (activeMode !== 'original') return;
    const category = originalScenarioCategories.find((item) => item.id === selectedOriginalCategory)
      || originalScenarioCategories[0];
    if (!category) return;
    const scenario = category.children.find((item) => item.id === selectedOriginalScenario)
      || category.children[0];
    if (!scenario) return;
    if (category.id !== selectedOriginalCategory) setSelectedOriginalCategory(category.id);
    if (scenario.id !== selectedOriginalScenario) setSelectedOriginalScenario(scenario.id);
    setPrompt(combineOriginalPrompts(category, scenario));
  }, [activeMode, siteConfig.originalScenarioPrompts]);

  const handleModeSelect = (nextMode: ScriptMode) => {
    setResultDialogOpen(false);
    setScriptMode(nextMode);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('step', 'script-generator');
    nextParams.set('scriptMode', nextMode);
    if (projectId) nextParams.set('projectId', projectId);
    setSearchParams(nextParams, { replace: true });
  };

  const currentTemplate = templates.find((item) => item.id === selectedTemplate) || templates[0] || templateCards[0];
  const normalizedTemplateSearch = templateSearch.trim().toLowerCase();
  const filteredTemplateCards = templates.filter((item) => {
    const matchesCategory = category === '全部' || item.category === category;
    const matchesSearch = !normalizedTemplateSearch || [item.id, item.name, item.actor, item.people, item.popularity, item.difficulty, item.category]
      .some((value) => value.toLowerCase().includes(normalizedTemplateSearch));

    return matchesCategory && matchesSearch;
  });
  const sortedTemplateCards = [...filteredTemplateCards].sort((a, b) => {
    if (templateSort === '热度最高') return b.popularityScore - a.popularityScore;
    if (templateSort === '最新模板') return b.updatedOrder - a.updatedOrder;
    const aSortOrder = a.sortOrder && a.sortOrder > 0 ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bSortOrder = b.sortOrder && b.sortOrder > 0 ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    return aSortOrder - bSortOrder || b.updatedOrder - a.updatedOrder || Number(a.id) - Number(b.id);
  });
  const templatePageCount = Math.max(1, Math.ceil(sortedTemplateCards.length / templatePageSize));
  const visibleTemplatePage = Math.min(templatePage, templatePageCount);
  const visibleTemplateCards = sortedTemplateCards.slice(
    (visibleTemplatePage - 1) * templatePageSize,
    visibleTemplatePage * templatePageSize,
  );
  const displayTemplateName = (name: string) => (name.length > 7 ? `${name.slice(0, 7)}...` : name);
  const canGoPrevTemplatePage = visibleTemplatePage > 1;
  const canGoNextTemplatePage = visibleTemplatePage < templatePageCount;
  const visibleAnalysisText = analysisText;
  const structureLines = structureText.split('\n').map((line) => line.trim()).filter(Boolean);
  const parsedSummaryDimensions = parseStructureSummary(structureText);
  const visibleStructureDimensions = isDeepMode
    ? (structureDimensions.length ? structureDimensions : parsedSummaryDimensions)
    : (parsedSummaryDimensions.length ? parsedSummaryDimensions : structureDimensions);
  const briefOptions = briefs.map((brief) => ({
    value: brief.id,
    label: `${brief.productName || brief.name}${brief.versions?.[0]?.label ? ` ${brief.versions[0].label}` : ''}`,
    searchText: [
      brief.productName,
      brief.name,
      brief.productModel,
      brief.versions?.[0]?.label,
    ].filter(Boolean).join(' ').toLowerCase(),
  }));
  const filterBriefOption = (input: string, option?: (typeof briefOptions)[number]) => (
    (option?.searchText || String(option?.label || '').toLowerCase()).includes(input.trim().toLowerCase())
  );
  const normalizedPolishMentionQuery = polishMentionQuery.trim().toLowerCase();
  const polishMentionBriefs = briefOptions.filter((option) =>
    !normalizedPolishMentionQuery || option.searchText.includes(normalizedPolishMentionQuery)
  );
  const formatOptions = scriptFormats.map((item) => ({ value: item.code, label: item.name }));
  const originalScenarioCategories = parseOriginalScenarioPrompts(siteConfig.originalScenarioPrompts);
  const visibleOriginalScenarioCards = originalScenarioCategories.slice(0, 3);
  const currentOriginalCategory = originalScenarioCategories.find((item) => item.id === selectedOriginalCategory)
    || originalScenarioCategories[0];
  const originalScenarioSelectOptions = (currentOriginalCategory?.children || [])
    .map((item) => ({ value: item.id, label: item.title }));
  const generationStage = generationElapsed < 10
    ? '正在整理产品 Brief、模板和创作要求'
    : generationElapsed < 30
      ? '正在生成脚本结构、镜头和口播文案'
      : '正在完善脚本细节并整理输出格式';
  const selectedScriptFormat = scriptFormats.find((item) => item.code === scriptFormat);
  const scriptOutputText = currentScript?.content?.trim() || '暂无脚本内容';
  const scriptOutputParagraphs = scriptOutputText
    .split(/\n+|(?<=[。！？!?])\s*/)
    .map((line) => line.replace(/^[-·\d.、\s]+/, '').trim())
    .filter(Boolean);
  const markdownTableLines = scriptOutputText.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('|') && line.endsWith('|'));
  const storyboardTableLines = markdownTableLines.length >= 3 && /镜头|画面|口播|字幕|运镜/.test(markdownTableLines[0]) ? markdownTableLines : [];
  const storyboardHeaders = storyboardTableLines.length
    ? storyboardTableLines[0].split('|').slice(1, -1).map((cell) => cell.trim())
    : ['镜头', '画面内容', '口播文案', '字幕/花字', '备注'];
  const rawStoryboardRows = storyboardTableLines.length
    ? storyboardTableLines.slice(2).map((line, index) => ({
      key: `storyboard-${index}`,
      cells: line.split('|').slice(1, -1).map((cell) => cell.trim()),
    })).filter((row) => row.cells.length > 1)
    : [];
  const storyboardDurationColumnIndex = storyboardHeaders.findIndex((header) => /时长/.test(header));
  const storyboardRows = rawStoryboardRows.map((row) => {
    if (!row.cells.some((cell) => /总计|总时长|总时间/.test(cell))) return row;
    const cells = Array.from({ length: storyboardHeaders.length }, () => '');
    cells[0] = row.cells.find((cell) => /总计|总时长|总时间/.test(cell)) || '总计';
    if (storyboardDurationColumnIndex >= 0) {
      const durationCell = row.cells[storyboardDurationColumnIndex]
        || row.cells.find((cell) => /\d+(?:\.\d+)?\s*(?:s|秒)?/i.test(cell))
        || '';
      cells[storyboardDurationColumnIndex] = durationCell;
    }
    const noteIndex = storyboardHeaders.findIndex((header) => /备注/.test(header));
    if (noteIndex >= 0) {
      cells[noteIndex] = row.cells.find((cell) =>
        cell && !/总计|总时长|总时间/.test(cell) && !/\d+(?:\.\d+)?\s*(?:s|秒)/i.test(cell) && cell !== '-'
      ) || '-';
    }
    return { ...row, cells };
  });
  const visibleStoryboardHeaders = storyboardRows.length ? storyboardHeaders : ['镜头', '画面内容', '口播/摘要', '作用'];
  const storyboardColumnClass = (header: string) => {
    if (/镜号|镜头编号|^镜头$/.test(header)) return 'storyboard-column-shot';
    if (/景别/.test(header)) return 'storyboard-column-scene';
    if (/运镜/.test(header)) return 'storyboard-column-camera';
    if (/画面|场景描述/.test(header)) return 'storyboard-column-visual';
    if (/字幕|花字/.test(header)) return 'storyboard-column-subtitle';
    if (/台词|旁白|口播|文案/.test(header)) return 'storyboard-column-dialogue';
    if (/时长/.test(header)) return 'storyboard-column-duration';
    if (/卖点/.test(header)) return 'storyboard-column-selling-point';
    if (/备注/.test(header)) return 'storyboard-column-note';
    return '';
  };
  const storyboardCellText = (cell: string | undefined, index: number) => {
    const normalized = (cell || '-')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\s*(?:<br\s*\/?\s*>|&lt;br\s*\/?\s*&gt;)\s*/gi, ' ')
      .replace(/(?:\\[rn]|[\r\n\u2028\u2029])+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/([\u3400-\u9fff，。！？；：、“”‘’（）])\s+(?=[\u3400-\u9fff，。！？；：、“”‘’（）])/g, '$1')
      .trim();
    return index === storyboardDurationColumnIndex ? normalized.replace(/\s*(?:s|秒)\s*$/i, '').trim() : normalized;
  };
  const storyboardCellEditorText = (cell: string | undefined, index: number) => {
    const normalized = (cell ?? '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\s*(?:<br\s*\/?\s*>|&lt;br\s*\/?\s*&gt;)\s*/gi, ' ')
      .replace(/(?:\\[rn]|[\r\n\u2028\u2029])+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return index === storyboardDurationColumnIndex ? normalized.replace(/\s*(?:s|秒)\s*$/i, '').trim() : normalized;
  };
  const scriptSegmentSources = structureLines.length ? structureLines : scriptOutputParagraphs;
  const scriptSegmentRows = storyboardRows.length ? storyboardRows.map((row, index) => ({
    key: row.key,
    segment: row.cells[0] || `镜头 ${index + 1}`,
    position: `${index + 1}/${storyboardRows.length}`,
    summary: row.cells[1] || row.cells[2] || '按模板生成的分镜内容。',
    role: index === 0 ? '抓注意力' : index === storyboardRows.length - 1 ? '促行动' : '推进转化',
  })) : scriptSegmentSources.slice(0, 6).map((line, index) => {
    const [rawName, ...rest] = line.split(/[:：]/);
    const hasLabel = rest.length > 0;
    const fallbackNames = ['开场钩子', '痛点共鸣', '卖点展开', '信任证明', '行动引导', '收束强化'];
    const summary = hasLabel ? rest.join('：').trim() : rawName.trim();

    return {
      key: `${index}-${line}`,
      segment: hasLabel ? rawName.trim() : fallbackNames[index] || `段落 ${index + 1}`,
      position: `${index + 1}/${Math.max(scriptSegmentSources.length, 1)}`,
      summary: summary || scriptOutputParagraphs[index] || '承接上一段，补充脚本信息。',
      role: index === 0 ? '抓注意力' : index === scriptSegmentSources.length - 1 ? '促行动' : '推进转化',
    };
  });
  const analysisItems = [
    { icon: <PictureOutlined />, title: '封面分析', lines: ['强对比标题，突出痛点关键词', '画面人物表情共鸣，吸引点击'] },
    { icon: <FontSizeOutlined />, title: '标题分析', lines: ['强句式引发好奇', '情绪词强化共鸣与代入感'] },
    { icon: <OrderedListOutlined />, title: '造型分析', lines: ['聚焦职场生活场景', '目标人群明确，易引发共鸣'] },
    { icon: <FileTextOutlined />, title: '文案分析', lines: ['从焦虑到觉醒，情绪递进', '金句收尾，引导行动'] },
    { icon: <ShareAltOutlined />, title: '结构分析', lines: ['总分总结构，节奏清晰', '前钩子+中间转折+后升华'] },
    { icon: <ScissorOutlined />, title: '剪辑风格分析', lines: ['快节奏剪辑，卡点紧凑', 'BGM 情绪匹配，增强感染力'] },
  ];
  const deepAnalysisItems = visibleStructureDimensions.map((dimension, index) => {
    return {
      index,
      icon: analysisItems[index]?.icon || <ShareAltOutlined />,
      title: dimension.title || dimensionFallbackTitles[index] || `分析 ${index + 1}`,
      content: dimension.content,
    };
  });

  const updateDeepAnalysisItem = (index: number, title: string, content: string) => {
    const nextDimensions = visibleStructureDimensions.map((item, itemIndex) => (
      itemIndex === index ? { ...item, title, content } : item
    ));
    setStructureDimensions(nextDimensions);
    setStructureText(dimensionsToText(nextDimensions));
    setCopyAnalyzed(false);
  };
  const visibleDeepAnalysisItems = deepAnalysisItems.slice(0, 6);

  const templateSpecContent = (card: TemplateCard) => {
    const spec = getTemplateSpecFields(card);
    const hasTemplateSpec = Boolean(spec.firstFiveSecondsHook || spec.modelFormula);
    return (
      <div className="template-spec-popover">
        <strong>{card.name} 模板说明</strong>
        {card.referenceUrl ? <p><b>参考链接：</b><a href={card.referenceUrl} target="_blank" rel="noreferrer">{card.referenceUrl}</a></p> : null}
        {spec.firstFiveSecondsHook ? <p className="template-spec-line"><b>前5秒钩子</b><span>：{spec.firstFiveSecondsHook}</span></p> : null}
        {spec.modelFormula ? <p className="template-spec-line"><b>模型公式</b><span>：{spec.modelFormula}</span></p> : null}
        {!card.referenceUrl && !hasTemplateSpec ? <p>后台暂未维护参考链接、前5秒钩子或模型公式</p> : null}
      </div>
    );
  };

  const renderProductFrameUpload = (className: string, label: string, allowTable = true) => (
    <div className={`${className} product-frame-field`}>
      <span className="product-frame-label">{label}</span>
      <div className="product-frame-control">
        <button
          type="button"
          className="product-frame-picker-trigger"
          onClick={openFrameLibrary}
          disabled={isProductFrameUploading}
          data-allow-table={allowTable}
        >
          <FolderOutlined />
          <span>
            <strong title={productFrame?.fileName || undefined}>
              {isProductFrameUploading
                ? '上传并入库中…'
                : productFrame?.fileName || '上传/选择画面'}
            </strong>
            <small>{allowTable ? 'JPG / PNG / XLS / XLSX / CSV' : 'JPG / PNG'}</small>
          </span>
          <RightOutlined />
        </button>
        {productFrame && (
          <button
            type="button"
            className="product-frame-current-remove"
            aria-label="移除当前产品画面"
            title="移除当前引用，文件库原文件仍会保留"
            onClick={() => {
              setProductFrame(null);
              message.success('已移除当前产品画面引用');
            }}
          >
            <DeleteOutlined />
          </button>
        )}
      </div>
    </div>
  );

  const loadFrameLibrary = async () => {
    setFrameLibraryLoading(true);
    try {
      const page = await assetApi.list({ page: 1, pageSize: 200 });
      setFrameLibraryAssets((page.list || []).filter((asset) => asset.category === 'product-frame-library'));
      setFrameLibraryLoaded(true);
    } catch {
      setFrameLibraryAssets([]);
      message.error('文件库加载失败');
    } finally {
      setFrameLibraryLoading(false);
    }
  };

  const openFrameLibrary = () => {
    setFrameLibraryOpen(true);
    if (!frameLibraryLoaded) loadFrameLibrary();
  };

  const selectFrameAsset = (asset: Asset) => {
    let extractedText = '';
    if (asset.metadataJson) {
      try {
        extractedText = String((JSON.parse(asset.metadataJson) as { extractedText?: string }).extractedText || '');
      } catch {
        extractedText = '';
      }
    }
    setProductFrame({
      assetId: asset.id,
      url: asset.previewUrl,
      fileName: asset.name,
      objectKey: asset.storageKey,
      extractedText: asset.extractedText || extractedText,
    });
    setFrameLibraryOpen(false);
    message.success(`已选择文件：${asset.name}`);
  };

  const updatePolishMention = (value: string, cursorPosition: number) => {
    const contentBeforeCursor = value.slice(0, cursorPosition);
    const match = contentBeforeCursor.match(/@([^@\n]*)$/);
    if (!match) {
      setPolishMentionOpen(false);
      setPolishMentionRange(null);
      return;
    }
    setPolishMentionQuery(match[1]);
    setPolishMentionRange({ start: cursorPosition - match[0].length, end: cursorPosition });
    setPolishMentionOpen(true);
  };

  const insertPolishMention = (label: string, briefId: string) => {
    const range = polishMentionRange || {
      start: polishInput.length,
      end: polishInput.length,
    };
    const mentionText = `@${label} `;
    const nextValue = `${polishInput.slice(0, range.start)}${mentionText}${polishInput.slice(range.end)}`;
    const nextCursor = range.start + mentionText.length;
    setPolishInput(nextValue);
    setPolishBriefId(briefId);
    message.success(`已调用产品 Brief：${label}`);
    setPolishMentionOpen(false);
    setPolishMentionRange(null);
    window.setTimeout(() => {
      polishInputRef.current?.focus();
      polishInputRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const selectFirstPolishMention = () => {
    const firstBrief = polishMentionBriefs[0];
    if (firstBrief) {
      insertPolishMention(String(firstBrief.label), firstBrief.value);
      return true;
    }
    return false;
  };

  const handleProductFrameUpload = async (file: File, allowTable = false) => {
    const isImage = file.type.startsWith('image/');
    const isTable = /\.(xls|xlsx|csv)$/i.test(file.name);
    if (!isImage && !(allowTable && isTable)) {
      message.warning(allowTable ? '请上传 JPG、PNG、XLS、XLSX 或 CSV 文件' : '请上传 JPG / PNG 等图片文件');
      return Upload.LIST_IGNORE;
    }
    setIsProductFrameUploading(true);
    try {
      const currentProjectId = await ensureProjectId();
      const result = await assetApi.uploadProductFrame(file, currentProjectId);
      setProductFrame({
        assetId: result.id,
        url: result.previewUrl,
        fileName: result.name || file.name,
        objectKey: result.storageKey,
        extractedText: result.extractedText,
      });
      setFrameLibraryLoaded(false);
      setFrameLibraryOpen(false);
      message.success(
        result.updatedExisting
          ? '检测到同名文件，已重新解析并更新产品画面库'
          : isTable
            ? '画面表格已解析并存入产品画面库'
            : result.extractedText
              ? '产品画面文字已识别并存入产品画面库'
              : '产品画面已上传，未识别到文字',
      );
    } catch (error) {
      setProductFrame({ fileName: file.name });
      message.error(error instanceof Error ? error.message : '产品画面上传失败，已保留文件名');
    } finally {
      setIsProductFrameUploading(false);
    }
    return false;
  };

  const parseReference = async () => {
    if (!referenceUrl.trim()) return message.warning('请先输入参考视频链接');
    setIsParsing(true);
    try {
      const currentProjectId = await ensureProjectId();
      const result = await sourceApi.createParseTask({ projectId: currentProjectId, url: referenceUrl, mode: analysisMode });
      setAnalysisText(formatParsedCopy(result.editableCopy || result.title || '解析完成，但暂无可编辑文案。'));
      setStructureText('');
      setStructureDimensions([]);
      setCopyAnalyzed(false);
      setIsAnalysisEditing(false);
      message.success('链接解析完成，请选择分析方式后确认分析');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '参考视频解析失败');
    } finally {
      setIsParsing(false);
    }
  };

  const copyText = async (text: string) => {
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const updateStoryboardCell = (rowIndex: number, columnIndex: number, value: string) => {
    if (!currentScript?.content || !storyboardTableLines.length) return;
    const contentLines = currentScript.content.split('\n');
    const tableLineIndexes = contentLines
      .map((line, index) => ({ line: line.trim(), index }))
      .filter((item) => item.line.startsWith('|') && item.line.endsWith('|'))
      .map((item) => item.index);
    const targetLineIndex = tableLineIndexes[rowIndex + 2];
    if (targetLineIndex === undefined) return;
    const nextCells = [...(storyboardRows[rowIndex]?.cells || [])];
    nextCells[columnIndex] = value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
    contentLines[targetLineIndex] = `| ${nextCells.join(' | ')} |`;
    setCurrentScript((script) => script ? {
      ...script,
      content: contentLines.join('\n'),
      updatedAt: new Date().toISOString(),
    } : script);
  };

  const renumberStoryboardShotLines = (contentLines: string[]) => {
    const shotColumnIndex = storyboardHeaders.findIndex((header) => /镜号|镜头编号|^镜头$/.test(header));
    if (shotColumnIndex < 0) return contentLines;
    const nextLines = [...contentLines];
    const tableLineIndexes = nextLines
      .map((line, index) => ({ line: line.trim(), index }))
      .filter((item) => item.line.startsWith('|') && item.line.endsWith('|'))
      .map((item) => item.index);
    let nextShotNo = 1;
    tableLineIndexes.slice(2).forEach((lineIndex) => {
      const cells = nextLines[lineIndex].split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells.some((cell) => /总计|总时长|总时间/.test(cell))) return;
      cells[shotColumnIndex] = String(nextShotNo++);
      nextLines[lineIndex] = `| ${cells.join(' | ')} |`;
    });
    return nextLines;
  };

  const insertStoryboardRow = (rowIndex?: number, placement: 'before' | 'after' = 'after') => {
    if (!currentScript?.content || !storyboardTableLines.length) {
      message.warning('当前内容不是分镜表格，暂时无法新增镜头行');
      return;
    }
    const contentLines = currentScript.content.split('\n');
    const tableLineIndexes = contentLines
      .map((line, index) => ({ line: line.trim(), index }))
      .filter((item) => item.line.startsWith('|') && item.line.endsWith('|'))
      .map((item) => item.index);
    const summaryRowIndex = storyboardRows.findIndex((row) =>
      row.cells.some((cell) => /总计|总时长|总时间/.test(cell))
    );
    const lastRegularRowIndex = summaryRowIndex >= 0 ? summaryRowIndex - 1 : storyboardRows.length - 1;
    const targetRowIndex = rowIndex === undefined ? lastRegularRowIndex : rowIndex;
    const targetDataIndex = rowIndex === undefined
      ? lastRegularRowIndex + 1
      : targetRowIndex + (placement === 'after' ? 1 : 0);
    const insertionDataIndex = Math.max(0, Math.min(targetDataIndex, summaryRowIndex >= 0 ? summaryRowIndex : storyboardRows.length));
    const insertionIndex = insertionDataIndex < storyboardRows.length
      ? tableLineIndexes[insertionDataIndex + 2]
      : (tableLineIndexes[tableLineIndexes.length - 1] ?? contentLines.length - 1) + 1;
    const nextCells = Array.from({ length: storyboardHeaders.length }, () => '');
    contentLines.splice(insertionIndex, 0, `| ${nextCells.join(' | ')} |`);
    setCurrentScript((script) => script ? {
      ...script,
      content: renumberStoryboardShotLines(contentLines).join('\n'),
      updatedAt: new Date().toISOString(),
    } : script);
    message.success(rowIndex === undefined
      ? '已在末尾新增镜头行，请填写内容'
      : `已在第 ${rowIndex + 1} 行${placement === 'before' ? '上方' : '下方'}插入镜头`);
  };

  const deleteStoryboardRow = (rowIndex: number) => {
    if (!currentScript?.content || !storyboardTableLines.length) return;
    const regularRowCount = storyboardRows.filter((row) =>
      !row.cells.some((cell) => /总计|总时长|总时间/.test(cell))
    ).length;
    if (regularRowCount <= 1) {
      message.warning('脚本表格至少需要保留一条镜头');
      return;
    }
    const contentLines = currentScript.content.split('\n');
    const tableLineIndexes = contentLines
      .map((line, index) => ({ line: line.trim(), index }))
      .filter((item) => item.line.startsWith('|') && item.line.endsWith('|'))
      .map((item) => item.index);
    const targetLineIndex = tableLineIndexes[rowIndex + 2];
    if (targetLineIndex === undefined) return;
    contentLines.splice(targetLineIndex, 1);
    setCurrentScript((script) => script ? {
      ...script,
      content: renumberStoryboardShotLines(contentLines).join('\n'),
      updatedAt: new Date().toISOString(),
    } : script);
    message.success(`已删除第 ${rowIndex + 1} 行，可点击“恢复原稿”撤销`);
  };

  const openCellAnnotation = (rowIndex: number, columnIndex: number, columnLabel: string, originalText: string) => {
    const existing = scriptAnnotations.find((item) => item.rowIndex === rowIndex && item.columnIndex === columnIndex);
    setAnnotationTarget({ rowIndex, columnIndex, columnLabel, originalText });
    setAnnotationDraft(existing?.content || '');
  };

  const saveCellAnnotation = () => {
    if (!annotationTarget || !annotationDraft.trim()) {
      message.warning('请输入具体的修改建议');
      return;
    }
    setScriptAnnotations((annotations) => {
      const nextAnnotation: ScriptAnnotation = {
        id: annotations.find((item) => item.rowIndex === annotationTarget.rowIndex && item.columnIndex === annotationTarget.columnIndex)?.id
          || `annotation-${Date.now()}`,
        ...annotationTarget,
        content: annotationDraft.trim(),
      };
      return [
        ...annotations.filter((item) => item.rowIndex !== annotationTarget.rowIndex || item.columnIndex !== annotationTarget.columnIndex),
        nextAnnotation,
      ];
    });
    setAnnotationTarget(null);
    setAnnotationDraft('');
    message.success('批注已添加，可继续标注其他单元格或直接发送给 AI');
  };

  const removeCellAnnotation = () => {
    if (!annotationTarget) return;
    setScriptAnnotations((annotations) => annotations.filter(
      (item) => item.rowIndex !== annotationTarget.rowIndex || item.columnIndex !== annotationTarget.columnIndex,
    ));
    setAnnotationTarget(null);
    setAnnotationDraft('');
  };

  const polishCurrentScript = async (quickInstruction?: string) => {
    if (!currentScript) return message.warning('请先选择脚本');
    const inputInstruction = (quickInstruction || polishInput).trim();
    const annotationInstruction = scriptAnnotations.length
      ? `【逐格批注修改】\n${[...scriptAnnotations]
          .sort((a, b) => a.rowIndex - b.rowIndex || a.columnIndex - b.columnIndex)
          .map((item) => `${item.rowIndex + 1}. 第 ${item.rowIndex + 1} 行「${item.columnLabel}」：原内容“${item.originalText}”；修改建议“${item.content}”`)
          .join('\n')}`
      : '';
    const instruction = [inputInstruction, annotationInstruction].filter(Boolean).join('\n\n');
    if (!instruction) return message.warning('请先输入要修改的地方');
    const recalledBriefId = quickInstruction ? undefined : polishBriefId;
    const userMessage = createPolishMessage('user', instruction);
    setPolishMessages((messages) => [...messages, userMessage]);
    setPolishInput('');
    setPolishBriefId(undefined);
    setIsPolishing(true);
    try {
      const result = await scriptApi.polish(currentScript.id, {
        instruction,
        content: currentScript.content || originalScriptContent || '',
        briefId: recalledBriefId,
        productFrameAssetId: productFrame?.assetId,
        productImage: productFrame?.url,
        productFrameFileName: productFrame?.fileName,
        productFrameContent: productFrame?.extractedText,
      });
      setCurrentScript((script) => script ? { ...script, content: result.content, updatedAt: new Date().toISOString() } : script);
      setIsManualEditing(false);
      setScriptAnnotations([]);
      setAnnotationMode(false);
      await Promise.all([
        loadScriptVersions(currentScript.id, originalScriptContent),
        loadPolishMessages(currentScript.id),
      ]);
      message.success('AI 已返回修改版，右侧已重新显示');
    } catch (error) {
      await loadPolishMessages(currentScript.id).catch(() => {
        setPolishMessages((messages) => [...messages, createPolishMessage('assistant', '这次润色没有成功，请稍后重试或换一种说法。')]);
      });
      message.error(error instanceof Error ? error.message : '脚本润色失败');
    } finally {
      setIsPolishing(false);
    }
  };

  const restoreScriptVersion = async (version: ScriptVersion) => {
    if (!currentScript || version.current) return;
    setRestoringVersionId(version.id);
    try {
      const restored = await scriptApi.restoreVersion(currentScript.id, version.id);
      setCurrentScript({ ...restored, status: normalizeScriptStatus(restored.status) });
      await loadScriptVersions(currentScript.id, restored.content || '');
      setIsManualEditing(false);
      setVersionHistoryOpen(false);
      message.success(`已恢复到 V${version.versionNo}，恢复前内容仍保留在历史版本中`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '历史版本恢复失败');
    } finally {
      setRestoringVersionId(undefined);
    }
  };

  const restoreOriginalScript = async () => {
    const originalVersion = scriptVersions[0];
    if (!currentScript || !originalVersion) return;
    await restoreScriptVersion(originalVersion);
  };

  const analyzeReferenceCopy = async (): Promise<string | null> => {
    const copy = analysisText.trim();
    if (!copy) {
      message.warning('请先解析链接并确认文案');
      return null;
    }
    setIsAnalyzingCopy(true);
    try {
      const currentProjectId = await ensureProjectId();
      const result = await sourceApi.analyzeCopy({ projectId: currentProjectId, copy, mode: analysisMode });
      const dimensions = (result.dimensions || []).filter((item) => item.title && item.content);
      const nextStructureText = analysisMode === 'deep'
        ? (dimensions.length ? dimensionsToText(dimensions) : (result.structureSummary || defaultStructureText))
        : (result.structureSummary || defaultStructureText);
      setStructureDimensions(analysisMode === 'deep' ? dimensions : []);
      setStructureText(nextStructureText);
      setCopyAnalyzed(true);
      setIsStructureEditing(false);
      message.success(analysisMode === 'deep' ? '深度拉片拆解完成' : '简易文案分析完成');
      return nextStructureText;
    } catch (error) {
      message.error(error instanceof Error ? error.message : '文案结构分析失败');
      return null;
    } finally {
      setIsAnalyzingCopy(false);
    }
  };

  const confirmAnalyzeReferenceCopy = () => {
    if (!analysisText.trim()) {
      message.warning('请先解析或填写文案内容');
      return;
    }
    const modeLabel = analysisMode === 'deep' ? '深度拉片拆解' : '简易文案解析';
    Modal.confirm({
      title: `确认生成${modeLabel}？`,
      content: '将使用左侧当前文案调用大模型，生成右侧文案结构分析。',
      okText: '确认生成',
      cancelText: '取消',
      centered: true,
      onOk: () => analyzeReferenceCopy(),
    });
  };

  const generateScript = async (type: ScriptType) => {
    let resolvedStructureText = structureText.trim();
    if (type === 'viral') {
      if (!analysisText.trim()) {
        return message.warning('请先解析链接，获取文案逐字稿');
      }
      if (!copyAnalyzed || !resolvedStructureText) {
        const analyzedStructure = await analyzeReferenceCopy();
        if (!analyzedStructure) return;
        resolvedStructureText = analyzedStructure.trim();
      }
    }
    setGeneratingType(type);
    try {
      const currentProjectId = await ensureProjectId();
      const script = await scriptApi.generate({
        projectId: currentProjectId,
        type,
        templateId: type === 'template' ? selectedTemplate : undefined,
        briefId: selectedBriefId,
        referenceUrl: type === 'viral' ? referenceUrl : undefined,
        duration: scriptDuration,
        format: scriptFormat,
        formatRequirement: selectedScriptFormat?.formatRequirement,
        productFrame: productFrame?.url || productFrame?.fileName,
        productFrameAssetId: productFrame?.assetId,
        productImage: productFrame?.url,
        productFrameFileName: productFrame?.fileName,
        productFrameContent: productFrame?.extractedText,
        referenceCopy: type === 'viral' ? analysisText.trim() : undefined,
        structureAnalysis: type === 'viral' ? resolvedStructureText : undefined,
        prompt,
      });
      setCurrentScript(script);
      setOriginalScriptContent(script.content || '');
      setScriptVersions([]);
      setPolishMessages([defaultPolishMessage()]);
      loadScriptVersions(script.id, script.content || '').catch(() => undefined);
      setPolishBriefId(undefined);
      setIsManualEditing(false);
      setResultDialogOpen(true);
      message.success('脚本生成成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '脚本生成失败';
      message.error(errorMessage || '脚本生成失败');
    } finally {
      setGeneratingType(null);
    }
  };

  const saveCurrentScript = async () => {
    if (!currentScript) return message.warning('请先生成脚本');
    try {
      const saved = await scriptApi.update(currentScript.id, currentScript);
      setCurrentScript({ ...saved, status: normalizeScriptStatus(saved.status) });
      await loadScriptVersions(saved.id, saved.content || '');
      setIsManualEditing(false);
      message.success('脚本已保存，并已生成可恢复的历史版本');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '脚本保存失败');
    }
  };

  const changeScriptStatus = async (status: ScriptStatus) => {
    if (!currentScript || status === currentScript.status) return;
    const previousStatus = currentScript.status;
    setCurrentScript({ ...currentScript, status });
    setIsStatusSaving(true);
    try {
      const saved = await scriptApi.update(currentScript.id, { status });
      setCurrentScript((script) => script ? { ...script, status: normalizeScriptStatus(saved.status) } : script);
      message.success(`脚本状态已标记为“${scriptStatusOptions.find((item) => item.value === status)?.label}”`);
    } catch (error) {
      setCurrentScript((script) => script ? { ...script, status: previousStatus } : script);
      message.error(error instanceof Error ? error.message : '脚本状态修改失败');
    } finally {
      setIsStatusSaving(false);
    }
  };

  const startEditingScriptName = () => {
    if (!currentScript) return;
    setScriptNameDraft(currentScript.name);
    setIsEditingScriptName(true);
  };

  const saveScriptName = async () => {
    if (!currentScript || !isEditingScriptName) return;
    const nextName = scriptNameDraft.trim();
    if (!nextName) {
      message.warning('脚本名称不能为空');
      return;
    }
    setIsEditingScriptName(false);
    if (nextName === currentScript.name) return;
    const previousName = currentScript.name;
    setCurrentScript({ ...currentScript, name: nextName });
    try {
      await scriptApi.update(currentScript.id, { name: nextName });
      message.success('脚本名称已修改');
    } catch (error) {
      setCurrentScript({ ...currentScript, name: previousName });
      message.error(error instanceof Error ? error.message : '脚本名称修改失败');
    }
  };

  const createScriptExport = async () => {
    if (!currentScript) return message.warning('请先生成脚本');
    try {
      const currentProjectId = await ensureProjectId();
      const job = await generationApi.createExport({
        projectId: currentProjectId,
        exportType: 'script',
        fileName: `${currentScript.name || 'script'}.txt`,
      });
      message.success(`脚本导出任务已创建：${job.id}`);
    } catch {
      message.error('脚本导出任务创建失败');
    }
  };

  const copyCurrentScriptLink = async () => {
    if (!currentScript) return message.warning('请先生成脚本');
    const url = new URL(`/workspace?projectId=${currentScript.projectId}&step=storyboard`, window.location.origin).toString();
    if (navigator.clipboard) await navigator.clipboard.writeText(url);
    message.success('脚本工作台链接已复制');
  };

  const renderBriefSelect = () => (
    <Select
      value={selectedBriefId}
      placeholder={briefsLoading ? 'Brief 加载中…' : briefOptions.length ? '选择产品 Brief' : '当前项目暂无 Brief'}
      loading={briefsLoading}
      disabled={briefsLoading || !projectId}
      showSearch
      listHeight={360}
      virtual={false}
      popupClassName="brief-select-dropdown"
      filterOption={filterBriefOption}
      autoClearSearchValue
      suffixIcon={<DownOutlined />}
      options={briefOptions}
      onChange={setSelectedBriefId}
      notFoundContent={briefsLoading ? <LoadingOutlined spin /> : '当前项目暂无 Brief，请先在产品卖点步骤新增'}
    />
  );

  const applyOriginalCategory = (categoryId: string) => {
    const category = originalScenarioCategories.find((item) => item.id === categoryId)
      || fallbackOriginalScenarioCategories[0];
    const scenario = category?.children[0];
    if (!category || !scenario) return;
    setSelectedOriginalCategory(category.id);
    setSelectedOriginalScenario(scenario.id);
    setPrompt(combineOriginalPrompts(category, scenario));
  };

  const applyPromptPreset = (scenarioId: string) => {
    const category = currentOriginalCategory || fallbackOriginalScenarioCategories[0];
    const scenario = category?.children.find((item) => item.id === scenarioId) || category?.children[0];
    if (!category || !scenario) return;
    setSelectedOriginalScenario(scenario.id);
    setPrompt(combineOriginalPrompts(category, scenario));
  };

  const renderAnalysisExample = (content: string | undefined, title: string) => (
    <Popover
      trigger={['hover', 'focus']}
      placement="top"
      overlayClassName="viral-analysis-example-popover-shell"
      content={(
        <div className="viral-analysis-example-popover">
          <strong>{title}</strong>
          <p>{content?.trim() || '后台暂未维护解析案例，请联系管理员在“站点配置”中补充。'}</p>
        </div>
      )}
    >
      <button type="button" className="analysis-example-trigger">可查看解析案例</button>
    </Popover>
  );

  if (!activeMode) {
    if (dialogOnly) return null;
    return (
      <section className="script-generator-page script-generator-entry-page">
        <header className="script-entry-hero">
          <div className={`script-entry-avatar ${scriptVisualConfig.assistantIconUrl ? 'has-image' : ''}`} aria-hidden="true">
            {scriptVisualConfig.assistantIconUrl ? <img src={scriptVisualConfig.assistantIconUrl} alt="" /> : '铼'}
          </div>
          <div className="script-entry-copy">
            <h2>{assistantTitle}</h2>
            <p>{assistantSubtitle}</p>
          </div>
        </header>

        <section className="script-entry-grid" aria-label="脚本生成器入口">
          {visibleModeEntryCards.map((card) => (
            <button key={card.mode} type="button" className={`script-entry-card ${card.accent}`} onClick={() => handleModeSelect(card.mode)}>
              <span className="script-entry-card-head">
                <span className={`script-entry-card-icon ${card.iconUrl ? 'has-image' : ''}`} aria-hidden="true">
                  {card.iconUrl ? <img src={card.iconUrl} alt="" /> : card.icon}
                </span>
                <strong>{card.title}</strong>
              </span>
              <p>{card.description}</p>
            </button>
          ))}
        </section>
      </section>
    );
  }

  return (
    <section className={`script-generator-page replica-script-page script-generator-workspace ${dialogOnly ? 'is-dialog-only' : ''} ${activeMode === 'template' ? 'script-template-workspace' : ''} script-mode-${activeMode}`}>
      {/* 爆款复刻模式 */}
      {activeMode === 'viral' && (
        <>
          {isParsing && (
            <div className="viral-parse-wait" role="status" aria-live="polite">
              <section>
                <LoadingOutlined spin />
                <h3>爆款链接解析中</h3>
                <p>请稍等正在解析中。</p>
                <small>注意解析完成后，关键文案要进行校验修改，效果会更好。</small>
              </section>
            </div>
          )}
          <section className="reference-link-row">
            <label className="reference-link-input">
              <LinkOutlined />
              <input value={referenceUrl} onChange={(e) => { setReferenceUrl(e.target.value); setCopyAnalyzed(false); setStructureDimensions([]); }} placeholder="请输入参考视频链接" />
              <small>支持抖音 / 小红书 / 视频号等链接；纯 BGM / 无字幕视频可能无法拆解。</small>
            </label>
            <button onClick={parseReference} disabled={isParsing}>{isParsing ? <LoadingOutlined spin /> : <CheckCircleOutlined />}{isParsing ? '解析中' : '确认解析'}</button>
          </section>

          <section className="analysis-mode-row">
            <div className="analysis-mode-groups">
              <div className="analysis-mode-option simple">
                {renderAnalysisExample(siteConfig.viralSimpleAnalysisExample, '简易文案解析案例')}
                <button className={analysisMode === 'simple' ? 'analysis-mode-card active' : 'analysis-mode-card'} onClick={() => { setAnalysisMode('simple'); setCopyAnalyzed(false); setStructureText(''); setStructureDimensions([]); }}>
                  <FileTextOutlined /><span>简易文案解析</span>
                </button>
              </div>
              <div className="analysis-mode-option deep">
                <button className={analysisMode === 'deep' ? 'analysis-mode-card active' : 'analysis-mode-card'} onClick={() => { setAnalysisMode('deep'); setCopyAnalyzed(false); setStructureText(''); setStructureDimensions([]); }}>
                  <ShareAltOutlined /><span>深度拉片拆解</span>
                </button>
                {renderAnalysisExample(siteConfig.viralDeepAnalysisExample, '深度拉片解析案例')}
              </div>
            </div>
          </section>

          <section className="viral-analysis-columns">
            <section className="script-result-panel">
              <h3 className="analysis-panel-title">文案逐字稿</h3>
              <div className="analysis-content-frame">
                <header>
                  <div>
                    <button onClick={() => copyText(visibleAnalysisText)}><CopyOutlined />复制</button>
                    <button onClick={() => { setAnalysisText(''); setStructureText(''); setStructureDimensions([]); setCopyAnalyzed(false); setIsAnalysisEditing(false); message.info('已清空拆解文案'); }}><DeleteOutlined />清空</button>
                    <button onClick={() => setIsAnalysisEditing(true)}><EditOutlined />校验修改</button>
                    <button className="ok" onClick={() => {
                      if (!analysisText.trim()) return message.warning('请先解析或填写文案内容');
                      setIsAnalysisEditing(false);
                      message.success('文案已确认，请点击中间箭头生成结构分析');
                    }}><CheckCircleOutlined />确认OK</button>
                  </div>
                </header>
                {isAnalysisEditing ? (
                  <textarea
                    className="editable-analysis-area"
                    value={visibleAnalysisText}
                    onChange={(event) => { setAnalysisText(event.target.value); setCopyAnalyzed(false); setStructureText(''); setStructureDimensions([]); }}
                    autoFocus
                  />
                ) : (
                  <p className={!visibleAnalysisText.trim() ? 'empty' : undefined}>{visibleAnalysisText.trim() || defaultAnalysisText}</p>
                )}
              </div>
            </section>

            <button
              type="button"
              className="analysis-flow-arrow"
              onClick={confirmAnalyzeReferenceCopy}
              disabled={!analysisText.trim() || isAnalyzingCopy}
              aria-label={isAnalyzingCopy ? '正在生成文案结构分析' : '生成文案结构分析'}
              title={analysisText.trim() ? '生成文案结构分析' : '请先解析或填写文案'}
            >
              <span>{isAnalyzingCopy ? <LoadingOutlined spin /> : <RightOutlined />}</span>
            </button>

            {isDeepMode ? (
              <section className="structure-analysis-panel deep-analysis-panel">
                <h3 className="analysis-panel-title">文案结构分析</h3>
                <div className="analysis-content-frame">
                  <header>
                    <div>
                      <button onClick={() => setIsStructureEditing(true)}><EditOutlined />校验修改</button>
                      <button className="ok" onClick={() => { setIsStructureEditing(false); setCopyAnalyzed(Boolean(structureText.trim())); message.success('结构分析已确认'); }}><CheckCircleOutlined />确认OK</button>
                    </div>
                  </header>
                  <div className="structure-card-grid">
                    {visibleDeepAnalysisItems.length ? (
                      visibleDeepAnalysisItems.map((item) => (
                        <article key={`${item.index}-${item.title}`}>
                          <span className="analysis-icon">{item.icon}</span>
                          <div>
                            <strong>{item.title}</strong>
                            <p>· {item.content}</p>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="analysis-empty-state">{defaultStructureHint}</div>
                    )}
                  </div>
                  <footer>
                    <button onClick={createScriptExport}><DownloadOutlined />下载分镜表</button>
                    <button onClick={copyCurrentScriptLink}><ShareAltOutlined />分享分析报告</button>
                  </footer>
                </div>
              </section>
            ) : (
              <section className="structure-analysis-panel simple-analysis-panel">
                <h3 className="analysis-panel-title">文案结构分析</h3>
                <div className="analysis-content-frame">
                  <header>
                    <div>
                      <button onClick={() => setIsStructureEditing(true)}><EditOutlined />校验修改</button>
                      <button className="ok" onClick={() => { setIsStructureEditing(false); setCopyAnalyzed(Boolean(structureText.trim())); message.success('结构分析已确认'); }}><CheckCircleOutlined />确认OK</button>
                    </div>
                  </header>
                  <ul>
                    {visibleStructureDimensions.length ? visibleStructureDimensions.map((item) => <li key={`${item.key}-${item.title}`}><strong>{item.title}：</strong>{item.content}</li>) : <li className="empty">{defaultStructureHint}</li>}
                  </ul>
                </div>
              </section>
            )}
          </section>

          {isStructureEditing && (
            <div className="structure-editor-backdrop" role="dialog" aria-modal="true" aria-labelledby="structure-editor-title">
              <section className="structure-editor-modal">
                <header>
                  <div>
                    <span>Structure Review</span>
                    <h3 id="structure-editor-title">校验修改文案结构分析</h3>
                  </div>
                  <button type="button" aria-label="关闭结构编辑" onClick={() => setIsStructureEditing(false)}>×</button>
                </header>
                {isDeepMode ? (
                  <div className="deep-structure-editor-list modal-list">
                    {visibleDeepAnalysisItems.map((item) => (
                      <article key={`${item.index}-${item.title}`} className="deep-structure-editor-item">
                        <span className="analysis-icon">{item.icon}</span>
                        <div className="deep-structure-editor-body">
                          <strong>{item.title}</strong>
                          <textarea
                            value={item.content}
                            onChange={(event) => updateDeepAnalysisItem(item.index, item.title, event.target.value)}
                            placeholder="填写该维度的拆解内容"
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="structure-editor-textarea"
                    value={structureText}
                    onChange={(event) => { setStructureText(event.target.value); setStructureDimensions([]); setCopyAnalyzed(false); }}
                    autoFocus
                  />
                )}
                <footer>
                  <button type="button" onClick={() => setIsStructureEditing(false)}>取消</button>
                  <button type="button" className="primary" onClick={() => { setIsStructureEditing(false); setCopyAnalyzed(Boolean(structureText.trim())); message.success('结构分析已确认'); }}><CheckCircleOutlined />确认OK</button>
                </footer>
              </section>
            </div>
          )}

          <section className="script-config-panel">
            <header>
              <h3>脚本配置</h3>
              <p>设置脚本输出格式、时长、产品及素材等信息，生成更贴合需求的脚本。</p>
            </header>
            <div className="script-config-fields">
              <label><span>脚本格式</span><Select value={scriptFormat} onChange={setScriptFormat} suffixIcon={<DownOutlined />} options={formatOptions} /></label>
              <label><span>脚本时长</span><Select value={scriptDuration} onChange={setScriptDuration} suffixIcon={<DownOutlined />} options={durationOptions} /></label>
              <label><span>产品选择</span>{renderBriefSelect()}</label>
              {renderProductFrameUpload('product-frame-upload', '产品画面（非必填）', true)}
            </div>
          </section>

          <button className="generate-script-button" onClick={() => generateScript('viral')} disabled={generatingType === 'viral'}><HighlightOutlined />{generatingType === 'viral' ? '生成中' : '生成脚本'}</button>
        </>
      )}

      {/* 脚本模板库模式 */}
      {activeMode === 'template' && (
        <section className="script-template-page">
          <nav className="template-category-tabs" aria-label="模板类型">
            {templateCategories.map((item) => (
              <button
                key={item}
                className={item === category ? 'active' : ''}
                onClick={() => {
                  setCategory(item);
                  setTemplatePage(1);
                }}
              >
                {item === '最新热点' ? <>🔥 {item}</> : item}
              </button>
            ))}
          </nav>

          <section className="template-toolbar-panel">
            <div className="template-count-label"><span>共 {sortedTemplateCards.length}</span><span>模板</span></div>
            <div className="template-filter-actions">
              <span className="template-page-status">{visibleTemplatePage} / {templatePageCount}</span>
              <Select
                value={templateSort}
                suffixIcon={<DownOutlined />}
                onChange={(value) => {
                  setTemplateSort(value as TemplateSort);
                  setTemplatePage(1);
                }}
                options={[{ value: '综合排序', label: '综合排序' }, { value: '热度最高', label: '热度最高' }, { value: '最新模板', label: '最新模板' }]}
              />
              <label className="template-search"><input value={templateSearch} placeholder="搜索模板名称" onChange={(event) => { setTemplateSearch(event.target.value); setTemplatePage(1); }} /><SearchOutlined /></label>
            </div>
          </section>

          <section className="template-gallery-panel">
            <button
              className="template-page-arrow left"
              disabled={!canGoPrevTemplatePage}
              onClick={() => setTemplatePage(Math.max(1, visibleTemplatePage - 1))}
            >
              <LeftOutlined />
            </button>
            <div className="template-card-grid">
              {visibleTemplateCards.length > 0 ? visibleTemplateCards.map((card, cardIndex) => (
                <article
                  key={card.id}
                  role="button"
                  tabIndex={card.locked ? -1 : 0}
                  aria-disabled={card.locked}
                  title={card.locked ? '该模板暂未解锁' : card.name}
                  className={`${card.id === selectedTemplate ? 'template-card active' : 'template-card'}${card.locked ? ' locked' : ''}`}
                  onClick={() => !card.locked && setSelectedTemplate(card.id)}
                  onKeyDown={(event) => {
                    if (card.locked) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedTemplate(card.id);
                    }
                  }}
                >
                  <div className="template-card-head">
                    <span>模板{(visibleTemplatePage - 1) * templatePageSize + cardIndex + 1}</span>
                    {card.locked ? <LockOutlined className="template-state-icon" /> : card.id === selectedTemplate ? <CheckCircleOutlined className="template-state-icon" /> : null}
                  </div>
                  <div className="template-title-row">
                    <h3 title={card.name}>{displayTemplateName(card.name)}</h3>
                    <Popover
                      content={templateSpecContent(card)}
                      trigger={['hover', 'click']}
                      placement="top"
                      overlayClassName="template-spec-popover-shell"
                    >
                      <span
                        className="template-info-trigger"
                        role="button"
                        tabIndex={0}
                        aria-label={`${card.name}写作规范`}
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
                        }}
                      >
                        <InfoCircleOutlined className="template-info-icon" title="模板说明" />
                      </span>
                    </Popover>
                  </div>
                  <div className="template-meta">
                    <span title={`演员：${card.actor}`}><b>演员：</b><strong>{displayTemplateMeta(card.actor)}</strong></span>
                    <span title={`难度：${card.popularity}`}><b>难度：</b><strong>{displayTemplateMeta(card.popularity)}</strong></span>
                    <span title={`人数：${card.people}`}><b>人数：</b><strong>{displayTemplateMeta(card.people)}</strong></span>
                    <span title={`标签：${card.difficulty}`}><b>标签：</b><strong>{displayTemplateMeta(card.difficulty)}</strong></span>
                  </div>
                </article>
              )) : <div className="template-empty-state">暂无匹配模板</div>}
            </div>
            <button
              className="template-page-arrow right"
              disabled={!canGoNextTemplatePage}
              onClick={() => setTemplatePage(Math.min(templatePageCount, visibleTemplatePage + 1))}
            >
              <RightOutlined />
            </button>
          </section>

          <section className="selected-template-strip">
            <strong>已选模版</strong>
            <span>{currentTemplate.name}</span>
          </section>

          <section className="template-config-panel">
            <div className="template-config-grid">
              <label><span>脚本格式</span><Select value={scriptFormat} onChange={setScriptFormat} suffixIcon={<DownOutlined />} options={formatOptions} /></label>
              <label><span>脚本时长</span><Select value={scriptDuration} onChange={setScriptDuration} suffixIcon={<DownOutlined />} options={durationOptions} /></label>
              <label><span>产品选择</span>{renderBriefSelect()}</label>
              {renderProductFrameUpload('template-upload-field', '产品画面', true)}
            </div>
          </section>

          <section className="template-generate-panel">
            <button className="template-generate-button" onClick={() => generateScript('template')} disabled={generatingType === 'template'}><HighlightOutlined />{generatingType === 'template' ? '生成中' : '生成脚本'}</button>
          </section>
        </section>
      )}

      {/* AI原创模式 */}
      {activeMode === 'original' && (
        <section className="original-script-page">
          <section className="original-hero-card">
            <div className={`original-hero-avatar ${scriptVisualConfig.assistantIconUrl ? 'has-image' : ''}`} aria-hidden="true">
              {scriptVisualConfig.assistantIconUrl && <img src={scriptVisualConfig.assistantIconUrl} alt="" />}
            </div>
            <div className="original-hero-copy">
              <h3>{assistantTitle}</h3>
              <p>{assistantSubtitle}</p>
            </div>
          </section>

          <section className="original-main-card">
            <div className="original-scenario-grid">
              {visibleOriginalScenarioCards.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`original-scenario-item ${selectedOriginalCategory === item.id ? 'active' : ''}`}
                  onClick={() => applyOriginalCategory(item.id)}
                >
                  <div className="original-scenario-copy">
                    <strong>{item.title}</strong>
                    <p>{item.subtitle || '按后台维护提示词生成脚本'}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="original-prompt-box">
              <textarea
                value={prompt}
                maxLength={500}
                aria-label="AI 原创提示词"
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="以宝妈人设，去写一篇电商种草的脚本。文风要轻松有趣。卖点选择必须包含什么什么。"
              />
              <div className="original-prompt-meta">
                <div className="original-scenario-select" aria-label="脚本类型选择">
                  <Select
                    value={selectedOriginalScenario}
                    suffixIcon={<DownOutlined />}
                    options={originalScenarioSelectOptions}
                    onChange={applyPromptPreset}
                  />
                </div>
                <div className="original-prompt-actions">
                  <button type="button" className="original-inspiration-button" onClick={() => applyPromptPreset(selectedOriginalScenario)}>
                    <HighlightOutlined />灵感助手
                  </button>
                  <span>{prompt.length} / 500</span>
                </div>
              </div>
            </div>

            <section className="original-config-section">
              <h3>脚本配置</h3>
              <div className="original-config-grid">
                <label><span>脚本格式</span><Select value={scriptFormat} onChange={setScriptFormat} suffixIcon={<DownOutlined />} options={formatOptions} /></label>
                <label><span>脚本时长</span><Select value={scriptDuration} onChange={setScriptDuration} suffixIcon={<DownOutlined />} options={durationOptions} /></label>
                <label><span>选择产品</span>{renderBriefSelect()}</label>
                {renderProductFrameUpload('original-upload-field', '上传通用画面', true)}
              </div>
            </section>

            <div className="original-generate-actions">
              <button className="original-generate-button" disabled={!prompt.trim() || generatingType === 'original'} onClick={() => generateScript('original')}>
                <HighlightOutlined />{generatingType === 'original' ? '生成中' : '生成脚本'}
              </button>
            </div>
          </section>
        </section>
      )}

      {/* 我的模板库模式 */}
      {activeMode === 'mine' && (
        <section className="script-mode-placeholder script-mode-mine-placeholder">
          <div>
            <FolderOutlined />
            <h2>我的模板库</h2>
            <p>这里将承载你的私有模板、常用脚本和团队沉淀的固定表达。目前先以模板模式承接，后续可直接扩展为专属模板库。</p>
            <div className="script-mode-placeholder-actions">
              <button onClick={() => handleModeSelect('template')}>先去脚本模板库</button>
              <button onClick={() => handleModeSelect('original')} className="secondary">返回 AI智能脚本</button>
            </div>
          </div>
        </section>
      )}
      {generatingType && (
        <div className="script-generation-wait" role="status" aria-live="polite" aria-label="AI 正在生成脚本">
          <section>
            <div className="script-generation-spinner"><LoadingOutlined spin /></div>
            <span className="script-generation-eyebrow">AI SCRIPT GENERATION</span>
            <h2>正在生成脚本，请耐心等待</h2>
            <p>{generationStage}</p>
            <div className="script-generation-timeline" aria-hidden="true">
              <i className="active" /><i className={generationElapsed >= 10 ? 'active' : ''} /><i className={generationElapsed >= 30 ? 'active' : ''} />
            </div>
            <div className="script-generation-meta">
              <span>已等待 <strong>{generationElapsed}</strong> 秒</span>
              <span>{generationElapsed < 90 ? '通常需要 30–90 秒' : '内容较复杂，生成时间可能稍长'}</span>
            </div>
            <small>生成期间请勿关闭页面或重复提交，完成后会自动展示结果。</small>
          </section>
        </div>
      )}
      <Modal
        open={frameLibraryOpen}
        title="选择产品画面"
        footer={null}
        width={760}
        centered
        onCancel={() => setFrameLibraryOpen(false)}
      >
        <div className="product-frame-library-modal">
          <section className="product-frame-source-section">
            <div>
              <strong>从设备上传</strong>
              <p>上传后会自动存入“我的资产库 / 文件库”，原始文件不可修改或删除。</p>
            </div>
            <Upload
              accept="image/*,.xls,.xlsx,.csv"
              beforeUpload={(file) => handleProductFrameUpload(file, true)}
              showUploadList={false}
              disabled={isProductFrameUploading}
            >
              <button type="button" className="product-frame-device-upload" disabled={isProductFrameUploading}>
                {isProductFrameUploading ? <LoadingOutlined spin /> : <UploadOutlined />}
                {isProductFrameUploading ? '上传并入库中…' : '选择设备文件'}
              </button>
            </Upload>
          </section>
          <div className="product-frame-library-heading">
            <div>
              <strong>从文件库选择</strong>
              <p>选择已上传的文件只会建立引用，不会修改原文件。</p>
            </div>
            {productFrame?.fileName && (
              <span><LockOutlined />当前：{productFrame.fileName}</span>
            )}
          </div>
          <div className="product-frame-library-grid">
            {frameLibraryAssets.map((asset) => (
              <button type="button" key={asset.id} onClick={() => selectFrameAsset(asset)}>
                <span>{asset.type === 'image' ? <PictureOutlined /> : <FileTextOutlined />}</span>
                <strong>{asset.name}</strong>
                <small>{asset.mimeType || (asset.type === 'image' ? '图片文件' : '表格/文档')}</small>
              </button>
            ))}
            {!frameLibraryAssets.length && (
              <div className="product-frame-library-empty">
                {frameLibraryLoading ? <LoadingOutlined spin /> : <FolderOutlined />}
                <span>{frameLibraryLoading ? '正在加载文件库…' : '文件库暂无可用文件，请先从设备上传'}</span>
              </div>
            )}
          </div>
        </div>
      </Modal>
      {resultDialogOpen && currentScript && (
        <div className="script-output-backdrop" role="dialog" aria-modal="true" aria-labelledby="script-output-title">
          <section className="script-output-modal">
            <header className="script-output-head">
              <div className="script-output-heading">
                <span>{currentScript.type === 'viral' ? '爆款复刻' : currentScript.type === 'template' ? '模板脚本' : '原创脚本'}</span>
                <div className="script-output-title-control">
                  {isEditingScriptName ? (
                    <input
                      autoFocus
                      value={scriptNameDraft}
                      maxLength={100}
                      aria-label="修改脚本名称"
                      onChange={(event) => setScriptNameDraft(event.target.value)}
                      onBlur={saveScriptName}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                        if (event.key === 'Escape') {
                          setIsEditingScriptName(false);
                          setScriptNameDraft(currentScript.name);
                        }
                      }}
                    />
                  ) : (
                    <>
                      <h2 id="script-output-title">{currentScript.name}</h2>
                      <button type="button" className="script-output-title-edit" aria-label="修改脚本名称" onClick={startEditingScriptName}><EditOutlined /></button>
                    </>
                  )}
                </div>
                <div className="script-output-meta">
                  <Select
                    className={`script-status-select is-${currentScript.status}`}
                    aria-label="脚本状态"
                    value={normalizeScriptStatus(currentScript.status)}
                    disabled={isStatusSaving}
                    loading={isStatusSaving}
                    onChange={changeScriptStatus}
                    options={scriptStatusOptions}
                    suffixIcon={<DownOutlined />}
                  />
                  <em>{currentScript.duration || scriptDuration}</em>
                  <em>{currentScript.formatName || scriptFormats.find((item) => item.code === currentScript.format)?.name || selectedScriptFormat?.name || '分镜脚本表'}</em>
                  <em>{scriptSegmentRows.length || storyboardRows.length || 1} 个镜头</em>
                </div>
              </div>
              <button type="button" aria-label="关闭生成结果" onClick={closeResultDialog}>×</button>
            </header>
            <article className="script-output-content script-output-layout polish-workbench-layout">
              <section className="polish-preview-panel">
                <header>
                  <div>
                    <span>{isManualEditing ? '人工编辑中' : '脚本预览'}</span>
                    <strong>{isManualEditing ? '全部字段均可修改，也可以新增镜头行' : '默认完整展示，AI 返回后自动刷新'}</strong>
                  </div>
                  <div className="polish-preview-actions">
                    {isManualEditing && (
                      <button type="button" disabled={isPolishing} onClick={() => insertStoryboardRow()}>
                        <PlusOutlined />新增一行
                      </button>
                    )}
                    <button
                      type="button"
                      className={isManualEditing ? 'active' : ''}
                      disabled={isPolishing}
                      onClick={() => setIsManualEditing((editing) => !editing)}
                    >
                      <EditOutlined />{isManualEditing ? '完成编辑' : '人工编辑'}
                    </button>
                    <button
                      type="button"
                      className={annotationMode ? 'active' : ''}
                      disabled={isPolishing || isManualEditing}
                      onClick={() => setAnnotationMode((enabled) => !enabled)}
                    >
                      <CommentOutlined />批注修改{scriptAnnotations.length ? `（${scriptAnnotations.length}）` : ''}
                    </button>
                    <button type="button" disabled={!scriptVersions.length || isPolishing} onClick={() => setVersionHistoryOpen(true)}>
                      <HistoryOutlined />历史版本{scriptVersions.length ? `（${scriptVersions.length}）` : ''}
                    </button>
                    <button type="button" disabled={!originalScriptContent || isPolishing} onClick={restoreOriginalScript}>恢复原稿</button>
                  </div>
                </header>
                <div className={`polish-preview-scroll ${isManualEditing ? 'is-manual-editing' : ''}`}>
                  <section className="script-output-block script-storyboard-block">
                    <div className="script-storyboard-table-wrap">
                      <table className={`script-storyboard-table ${visibleStoryboardHeaders.length === 4 ? 'is-four-column' : ''} ${visibleStoryboardHeaders.length === 5 ? 'is-five-column' : ''}`}>
                        <colgroup>
                          {visibleStoryboardHeaders.map((header) => <col key={header} className={storyboardColumnClass(header)} />)}
                        </colgroup>
                        <thead>
                          <tr>
                            {visibleStoryboardHeaders.map((header, index) => (
                              <th key={header} className={storyboardColumnClass(header)}>
                                {index === storyboardDurationColumnIndex ? '时长(s)' : header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {storyboardRows.length ? storyboardRows.map((row, rowIndex) => (
                            <tr key={row.key}>
                              {storyboardHeaders.map((header, index) => (
                                <td key={`${row.key}-${header}`} className={storyboardColumnClass(header)}>
                                  {isManualEditing ? (
                                    <textarea
                                      className="storyboard-cell-editor"
                                      aria-label={`编辑第 ${rowIndex + 1} 行${header}`}
                                      value={storyboardCellEditorText(row.cells[index], index)}
                                      onChange={(event) => updateStoryboardCell(rowIndex, index, event.target.value)}
                                    />
                                  ) : (
                                    <div className={`storyboard-cell-display ${annotationMode ? 'is-annotating' : ''}`}>
                                      <span className="storyboard-cell-content">{storyboardCellText(row.cells[index], index)}</span>
                                      {scriptAnnotations.find((item) => item.rowIndex === rowIndex && item.columnIndex === index) ? (
                                        <button
                                          type="button"
                                          className="storyboard-cell-annotation"
                                          aria-label={`编辑第 ${rowIndex + 1} 行${header}批注`}
                                          title={scriptAnnotations.find((item) => item.rowIndex === rowIndex && item.columnIndex === index)?.content}
                                          onClick={() => openCellAnnotation(rowIndex, index, header, storyboardCellText(row.cells[index], index))}
                                        >
                                          <CommentOutlined />
                                        </button>
                                      ) : annotationMode ? (
                                        <button
                                          type="button"
                                          className="storyboard-cell-comment-trigger"
                                          aria-label={`添加第 ${rowIndex + 1} 行${header}批注`}
                                          title={`批注第 ${rowIndex + 1} 行${header}`}
                                          onClick={() => openCellAnnotation(rowIndex, index, header, storyboardCellText(row.cells[index], index))}
                                        ><CommentOutlined /></button>
                                      ) : null}
                                    </div>
                                  )}
                                  {isManualEditing
                                    && index === 0
                                    && !row.cells.some((cell) => /总计|总时长|总时间/.test(cell))
                                    && (
                                      <>
                                        {rowIndex === 0 && (
                                          <button
                                            type="button"
                                            className="storyboard-row-edge-insert is-before"
                                            title="在第一行上方插入"
                                            aria-label="在第一行上方插入"
                                            onClick={() => insertStoryboardRow(rowIndex, 'before')}
                                          ><PlusOutlined /></button>
                                        )}
                                        <button
                                          type="button"
                                          className="storyboard-row-edge-insert is-after"
                                          title={`在第 ${rowIndex + 1} 行下方插入`}
                                          aria-label={`在第 ${rowIndex + 1} 行下方插入`}
                                          onClick={() => insertStoryboardRow(rowIndex, 'after')}
                                        ><PlusOutlined /></button>
                                        <button
                                          type="button"
                                          className="storyboard-row-delete-trigger"
                                          title={`删除第 ${rowIndex + 1} 行`}
                                          aria-label={`删除第 ${rowIndex + 1} 行`}
                                          onClick={() => deleteStoryboardRow(rowIndex)}
                                        ><DeleteOutlined /></button>
                                      </>
                                    )}
                                </td>
                              ))}
                            </tr>
                          )) : scriptSegmentRows.map((row) => (
                            <tr key={row.key}>
                              <td>{row.segment}</td>
                              <td>{row.position}</td>
                              <td><span className="storyboard-cell-content">{row.summary}</span></td>
                              <td><span className="storyboard-cell-content">{row.role}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </section>

              <section className="polish-chat-panel">
                <div className="polish-chat-title">
                  <div><MessageOutlined /><strong>AI 继续润色</strong></div>
                  <span>{isPolishing ? '润色中' : '可继续提修改意见'}</span>
                </div>
                <div className="polish-chat-messages">
                  {polishMessages.map((item) => (
                    <div key={item.id} className={`polish-message ${item.role} ${item.status === 'failed' ? 'failed' : ''}`}>
                      <span>{item.role === 'assistant' ? <RobotOutlined /> : '我'}</span>
                      <p>{item.content}{item.status === 'failed' && <small>失败记录</small>}</p>
                    </div>
                  ))}
                  {isPolishing && (
                    <div className="polish-message assistant thinking">
                      <span><RobotOutlined /></span>
                      <p><LoadingOutlined spin /> 正在理解修改要求并重写脚本...</p>
                    </div>
                  )}
                </div>
                <div className="polish-quick-prompts">
                  {polishQuickPrompts.map((item) => (
                    <button key={item} type="button" disabled={isPolishing} onClick={() => polishCurrentScript(item)}>{item}</button>
                  ))}
                </div>
                <div className="polish-input-box">
                  {scriptAnnotations.length > 0 && (
                    <div className="polish-annotation-summary">
                      <span><CommentOutlined />已添加 {scriptAnnotations.length} 条逐格批注，将随本次修改要求发送</span>
                      <button type="button" disabled={isPolishing} onClick={() => setScriptAnnotations([])}>清空批注</button>
                    </div>
                  )}
                  {polishMentionOpen && (
                    <div className="polish-mention-menu">
                      <header>
                        <strong>调用产品 Brief</strong>
                        <span>{polishMentionQuery ? `搜索“${polishMentionQuery}”` : '选择后会随本次修改要求发送给 AI'}</span>
                      </header>
                      <div className="polish-mention-scroll">
                        <section>
                          <h4><FileTextOutlined />当前项目 Brief（{briefOptions.length}）</h4>
                          {polishMentionBriefs.map((option) => (
                            <button
                              type="button"
                              key={`brief-${option.value}`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => insertPolishMention(String(option.label), option.value)}
                            >
                              <FileTextOutlined />
                              <span><strong>{option.label}</strong><small>产品 Brief</small></span>
                            </button>
                          ))}
                          {!polishMentionBriefs.length && <p>{briefsLoading ? 'Brief 加载中…' : '当前项目没有匹配的产品 Brief'}</p>}
                        </section>
                      </div>
                    </div>
                  )}
                  <div className="polish-frame-reference">
                    <button
                      type="button"
                      className={productFrame ? 'has-file' : ''}
                      disabled={isPolishing || isProductFrameUploading}
                      onClick={openFrameLibrary}
                    >
                      {isProductFrameUploading ? <LoadingOutlined spin /> : <FolderOutlined />}
                      <span>
                        <strong title={productFrame?.fileName || undefined}>
                          {isProductFrameUploading
                            ? '上传并入库中…'
                            : productFrame?.fileName || '上传 / 选择产品画面'}
                        </strong>
                        <small>{productFrame ? '已引用该文件用于本次润色' : 'JPG / PNG / XLS / XLSX / CSV'}</small>
                      </span>
                    </button>
                    {productFrame && (
                      <button
                        type="button"
                        className="polish-frame-reference-remove"
                        aria-label="移除当前产品画面"
                        title="移除当前引用，文件库原文件仍会保留"
                        disabled={isPolishing}
                        onClick={() => {
                          setProductFrame(null);
                          message.success('已移除当前产品画面引用');
                        }}
                      >
                        <DeleteOutlined />
                      </button>
                    )}
                  </div>
                  <textarea
                    ref={polishInputRef}
                    value={polishInput}
                    disabled={isPolishing}
                    onBlur={() => {
                      window.setTimeout(() => {
                        if (!document.activeElement?.closest('.polish-mention-menu')) {
                          setPolishMentionOpen(false);
                        }
                      }, 100);
                    }}
                    onChange={(event) => {
                      const { value, selectionStart } = event.target;
                      setPolishInput(value);
                      if (!value.includes('@')) setPolishBriefId(undefined);
                      updatePolishMention(value, selectionStart);
                    }}
                    onKeyDown={(event) => {
                      if (polishMentionOpen && event.key === 'Escape') {
                        event.preventDefault();
                        setPolishMentionOpen(false);
                        return;
                      }
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        if (polishMentionOpen && selectFirstPolishMention()) return;
                        polishCurrentScript();
                      }
                    }}
                    placeholder="输入修改要求；键入 @ 可调用产品 Brief，例如：@九号平衡车 只选两个特色卖点重写第 2、3 个镜头。"
                  />
                  <button type="button" disabled={isPolishing || (!polishInput.trim() && !scriptAnnotations.length)} onClick={() => polishCurrentScript()}><SendOutlined />发送修改要求</button>
                </div>
              </section>
            </article>
            <footer className="script-output-actions">
              <button type="button" onClick={() => copyText(currentScript.content || '')}><CopyOutlined />复制</button>
              <button type="button" onClick={createScriptExport}><DownloadOutlined />下载</button>
              <button type="button" onClick={copyCurrentScriptLink}><ShareAltOutlined />分享</button>
              <button type="button" onClick={saveCurrentScript}><SaveOutlined />保存脚本</button>
              <button type="button" className="primary" onClick={closeResultDialog}><CheckCircleOutlined />确认OK</button>
            </footer>
          </section>
        </div>
      )}
      <Modal
        open={Boolean(annotationTarget)}
        title={annotationTarget ? `批注第 ${annotationTarget.rowIndex + 1} 行 · ${annotationTarget.columnLabel}` : '添加批注'}
        className="script-annotation-modal"
        centered
        okText="保存批注"
        cancelText="取消"
        onOk={saveCellAnnotation}
        onCancel={() => {
          setAnnotationTarget(null);
          setAnnotationDraft('');
        }}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            {annotationTarget && scriptAnnotations.some((item) => item.rowIndex === annotationTarget.rowIndex && item.columnIndex === annotationTarget.columnIndex) && (
              <button type="button" className="script-annotation-delete" onClick={removeCellAnnotation}><DeleteOutlined />删除批注</button>
            )}
            <CancelBtn />
            <OkBtn />
          </>
        )}
      >
        <div className="script-annotation-target">
          <span>当前内容</span>
          <p>{annotationTarget?.originalText || '—'}</p>
        </div>
        <label className="script-annotation-editor">
          <span>修改建议</span>
          <textarea
            autoFocus
            value={annotationDraft}
            maxLength={500}
            placeholder="例如：这句太书面，改成更自然的口语；保留卖点但缩短到 12 个字。"
            onChange={(event) => setAnnotationDraft(event.target.value)}
          />
        </label>
      </Modal>
      <Modal
        open={versionHistoryOpen}
        title="脚本历史版本"
        className="script-version-modal"
        centered
        width={720}
        footer={null}
        onCancel={() => setVersionHistoryOpen(false)}
      >
        <p className="script-version-tip">每次 AI 润色、人工保存和历史恢复都会生成一个版本，可恢复到任意中间稿；恢复操作本身也会留痕。</p>
        <div className="script-version-list">
          {[...scriptVersions].reverse().map((version) => (
            <article key={version.id} className={version.current ? 'is-current' : ''}>
              <div className="script-version-index">V{version.versionNo}</div>
              <div className="script-version-detail">
                <header>
                  <strong>{version.changeNote || version.title || `版本 V${version.versionNo}`}</strong>
                  {version.current && <em>当前版本</em>}
                </header>
                <time>{version.createdAt || '时间未记录'}</time>
                {version.instruction && <p><span>修改要求：</span>{version.instruction}</p>}
                <small>{version.content.slice(0, 100) || '该版本暂无内容'}{version.content.length > 100 ? '…' : ''}</small>
              </div>
              <button
                type="button"
                disabled={version.current || Boolean(restoringVersionId)}
                onClick={() => restoreScriptVersion(version)}
              >
                {restoringVersionId === version.id ? <LoadingOutlined spin /> : <HistoryOutlined />}
                {version.current ? '当前使用' : '恢复此版本'}
              </button>
            </article>
          ))}
          {!scriptVersions.length && <div className="script-version-empty">暂无历史版本</div>}
        </div>
      </Modal>
    </section>
  );
};

export default ScriptGeneratorPanel;
