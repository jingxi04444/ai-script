export interface BriefVersion {
  id: string;
  label: string;
  content?: string;
  createdAt: string;
}

export interface Brief {
  id: string;
  name: string;
  projectId: string;
  versions: BriefVersion[];
  updatedAt: string;
  productName?: string;
  productModel?: string;
  price?: string;
  slogan?: string;
  primarySellingPoint?: string;
  targetAudience?: string;
  targetScene?: string;
  otherRequirements?: string;
  briefContent?: string;
  richContent?: string;
  isShared?: number;
  shareEnabled?: number;
  shareToken?: string;
  shareUrl?: string;
  sharePermission?: BriefSharePermission;
  accessPermission?: BriefSharePermission;
  forceNewVersion?: boolean;
}

export type BriefSharePermission = 'read' | 'edit' | 'manage';

export interface BriefAiResult {
  id: string;
  briefId: string;
  resultType: string;
  resultJson?: string;
  rawResponse?: string;
  createdAt?: string;
}

export type BriefDetectionTone = 'success' | 'warning' | 'danger';

export interface BriefDetectionMetric {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  tone: BriefDetectionTone;
}

export interface BriefDetectionSuggestion {
  title: string;
  detail: string;
}

export interface BriefDetectionReport {
  id: string;
  briefId: string;
  briefName: string;
  totalScore: number;
  maxScore: number;
  grade: string;
  summary: string;
  evaluatedAt: string;
  metrics: BriefDetectionMetric[];
  seriousRisks: string[];
  suggestions: BriefDetectionSuggestion[];
  reconstructedExample: string;
}

export interface BriefShareResult {
  briefId: string;
  shareToken: string;
  shareUrl: string;
  permission: BriefSharePermission;
}

export interface BriefEditRequest {
  id: string;
  briefId: string;
  requesterId: string;
  ownerId: string;
  requestMessage?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  approveTime?: string;
}
