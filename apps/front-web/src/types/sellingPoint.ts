export type SellingAsset = {
  id: string;
  name: string;
  tag: string;
  main: string;
  count: number;
};

export type SellingAssetDetail = SellingAsset & {
  targetGroups: string[];
  status: string;
  updatedAt: string;
  items: Array<{
    id: string;
    content: string;
    pointType: string;
    metadata?: Record<string, unknown>;
  }>;
};

export type ProductBriefInput = {
  productName: string;
  brief: string;
  sellingPoints: string[];
  primarySellingPoint: string;
  auxiliarySellingPoints: string[];
  targetGroups: string[];
  otherRequirements: string;

  // 产品卖点 Brief 页面字段
  productVersion?: string;
  productPrice?: string;
  productSlogan?: string;
  specialSellingPoint?: string;
  mainSellingPoint?: string;
  auxiliarySellingPoint?: string;
  suitableCrowd?: string;
  suitableScene?: string;
  briefScore?: number;
};

export type BriefVersion = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  data: ProductBriefInput;
  score?: number;
};

export type BriefItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activeVersionId: string;
  versions: BriefVersion[];
};

export type ProjectBriefStore = {
  projectId: string;
  activeBriefId: string;
  briefs: BriefItem[];
};

export type ActiveBriefVersionResult = {
  projectId: string;
  briefId: string;
  activeBriefId: string;
  activeVersionId: string;
  brief: BriefItem | null;
  version: BriefVersion;
};

export type OptimizeBriefResult = ProductBriefInput & {
  summary: string;
};

export type BriefChange = {
  field: string;
  before: string;
  after: string;
  impact?: string;
};

export type CompareBriefResult = ProductBriefInput & {
  summary: string;
  score: number;
  baselineScore: number;
  changes: BriefChange[];
  modelProvider?: string;
  modelName?: string;
  promptName?: string;
  promptVersion?: string;
  conclusion?: string;
  suggestions?: string[];
  risks?: string[];
  rawPreview?: string;
};

export type BriefScoreDimension = {
  name: string;
  score: number;
  comment: string;
};

export type BriefScoreResult = {
  score: number;
  summary: string;
  dimensions: BriefScoreDimension[];
  suggestions: string[];
  risks: string[];
  modelProvider?: string;
  modelName?: string;
  promptName?: string;
  promptVersion?: string;
  rawPreview?: string;
};
