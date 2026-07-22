export interface ComplianceRisk {
  word: string;
  category?: string;
  riskLevel?: string;
  suggestion?: string;
}

export interface OriginalityMatch {
  sourceType?: string;
  sourceId?: string;
  title?: string;
  similarityPercent?: string;
}

export interface ComplianceCheckResult {
  id: string;
  scriptVersionId?: string;
  riskCount: number;
  risks: ComplianceRisk[];
  suggestion?: string;
  similarityPercent?: string;
  matchedSources?: OriginalityMatch[];
}

export interface ComplianceCheckParams {
  scriptVersionId?: string;
  content: string;
}
